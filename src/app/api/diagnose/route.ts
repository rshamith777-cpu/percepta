import { NextResponse } from 'next/server';
import { getGoogleAiApiKey } from '@/lib/env';
import { DiagnosisServiceError, diagnoseSolarInverterImage } from '@/modules/ai/geminiDiagnosis';
import { supportedLanguageSchema } from '@/modules/ai/diagnosisSchema';
import {
  buildBlockedEscalation,
  evaluateAiOutputSafety,
  evaluateInputSafety,
  mergeChecklist,
  createDefaultSafetyChecklist,
  type EquipmentStatusInput,
  type SafetyChecklistItem,
} from '@/modules/safety';
import {
  getAllManualChunks,
  getManualChunks,
  getManualDocument,
  isGroundingEligible,
  listGroundingEligibleManualDocuments,
  listManualDocuments,
} from '@/modules/manuals/store';
import { retrieveRelevantPassages } from '@/modules/manuals/retrieval';
import { validateManualGrounding } from '@/modules/manuals/grounding';
import type { DiagnosisApiError, DiagnosisApiResponse } from '@/types/diagnosis';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROBLEM_LENGTH = 2000;
const EQUIPMENT_STATUS_VALUES = new Set<EquipmentStatusInput>([
  'synthetic_demo',
  'de_energized_confirmed',
  'uncertain',
  'potentially_live',
]);

function errorResponse(
  status: number,
  code: DiagnosisApiError['error']['code'],
  message: string,
  retryable: boolean,
  details?: string[],
  safetyDecision?: DiagnosisApiResponse extends infer R ? (R extends { safetyDecision?: infer S } ? S : never) : never,
  manualContext?: DiagnosisApiResponse extends infer R ? (R extends { manualContext?: infer M } ? M : never) : never,
): NextResponse<DiagnosisApiResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, retryable, details },
      ...(safetyDecision ? { safetyDecision } : {}),
      ...(manualContext ? { manualContext } : {}),
    },
    { status },
  );
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString('base64');
}

function parseEquipmentStatus(raw: FormDataEntryValue | null): EquipmentStatusInput {
  if (typeof raw === 'string' && EQUIPMENT_STATUS_VALUES.has(raw as EquipmentStatusInput)) {
    return raw as EquipmentStatusInput;
  }
  return 'de_energized_confirmed';
}

function parseChecklist(raw: FormDataEntryValue | null, status: EquipmentStatusInput): SafetyChecklistItem[] {
  const defaults = createDefaultSafetyChecklist(status);
  if (typeof raw !== 'string' || !raw.trim()) return defaults;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaults;
    return mergeChecklist(defaults, parsed as Partial<SafetyChecklistItem>[]);
  } catch {
    return defaults;
  }
}

export async function POST(request: Request): Promise<NextResponse<DiagnosisApiResponse>> {
  let preSafety: ReturnType<typeof evaluateInputSafety> | undefined;
  let manualContext:
    | {
        manualsAvailable: Awaited<ReturnType<typeof listManualDocuments>>;
        selectedManualId: string | null;
        retrievedPassages: ReturnType<typeof retrieveRelevantPassages>;
        retrievalMessage: string;
        retrievalSummary?: {
          groundingEligibleManualCount: number;
          candidatePassagesPassedThreshold: number;
          selectedManualIneligible?: boolean;
          selectedManualIneligibleReason?: string;
          groundedStatusNote?: string;
          validatedClaimCount?: number;
          diagnosisGrounded?: boolean;
        };
      }
    | undefined;
  try {
    const form = await request.formData();
    const image = form.get('image');
    const languageRaw = form.get('language');
    const problemDescriptionRaw = form.get('problemDescription');
    const equipmentStatus = parseEquipmentStatus(form.get('equipmentStatus'));
    const checklist = parseChecklist(form.get('safetyChecklist'), equipmentStatus);

    if (!(image instanceof File)) {
      return errorResponse(400, 'INVALID_IMAGE', 'Please provide an equipment image file.', false);
    }
    if (!ALLOWED_MIME_TYPES.has(image.type)) {
      return errorResponse(
        400,
        'INVALID_IMAGE',
        'Unsupported image type. Please upload a JPEG, PNG, or WebP image.',
        false,
      );
    }
    if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
      return errorResponse(
        400,
        'INVALID_IMAGE',
        'Image must be between 1 byte and 8 MB.',
        false,
      );
    }

    const languageParsed = supportedLanguageSchema.safeParse(languageRaw);
    if (!languageParsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'Please select a supported language: English, Hindi, or Kannada.', false);
    }

    const problemDescription =
      typeof problemDescriptionRaw === 'string'
        ? problemDescriptionRaw.trim().slice(0, MAX_PROBLEM_LENGTH)
        : '';
    if (problemDescription.length < 3) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Please describe the observed problem in at least a few characters.',
        false,
      );
    }

    // Deterministic pre-gate: runs before any AI call.
    preSafety = evaluateInputSafety({ problemDescription, equipmentStatus, checklist });
    if (preSafety.decision === 'block') {
      return NextResponse.json({
        ok: true,
        blockedEscalation: buildBlockedEscalation(preSafety),
        safetyDecision: preSafety,
        generatedAt: new Date().toISOString(),
      });
    }

    // Manual retrieval (local, no vector DB). Manual content is reference data only. Never fabricate citations.
    // Ineligible/irrelevant manuals are excluded from grounding.
    const selectedManualIdRaw = form.get('manualId');
    const selectedManualId = typeof selectedManualIdRaw === 'string' && selectedManualIdRaw.trim() ? selectedManualIdRaw.trim() : null;
    let manualsAvailableDocs: Awaited<ReturnType<typeof listGroundingEligibleManualDocuments>> = [];
    let retrievedPassages: ReturnType<typeof retrieveRelevantPassages> = [];
    let retrievalMessage = 'No grounding-eligible uploaded manuals are available. This diagnosis is not grounded in manufacturer-manual passages.';
    let selectedManualIneligibleReason: string | null = null;
    try {
      manualsAvailableDocs = await listGroundingEligibleManualDocuments();
      let chunks: Awaited<ReturnType<typeof getAllManualChunks>> = [];
      if (selectedManualId) {
        const selectedDoc = await getManualDocument(selectedManualId);
        if (selectedDoc && !isGroundingEligible(selectedDoc)) {
          selectedManualIneligibleReason = selectedDoc.relevanceReason || selectedDoc.error || 'The selected manual is not suitable for inverter diagnosis grounding.';
          chunks = [];
        } else {
          chunks = await getManualChunks(selectedManualId);
        }
      } else {
        chunks = await getAllManualChunks();
      }
      // retrieveRelevantPassages returns only passages passing lexical relevance thresholds.
      retrievedPassages = retrieveRelevantPassages(chunks, { problemDescription });
      if (selectedManualIneligibleReason) {
        retrievalMessage = `Selected manual cannot be used for grounding: ${selectedManualIneligibleReason} Diagnosis is not grounded in that document.`;
      } else if (manualsAvailableDocs.length === 0) {
        retrievalMessage = 'No grounding-eligible uploaded manuals are available. This diagnosis is not grounded in manufacturer-manual passages.';
      } else if (retrievedPassages.length === 0) {
        retrievalMessage = 'No candidate manual passages passed relevance thresholds for this problem description. Diagnosis is not grounded in the uploaded manual(s).';
      } else {
        retrievalMessage = `${retrievedPassages.length} candidate passage(s) passed lexical relevance thresholds from grounding-eligible manual(s). Candidate retrieval alone does not make the diagnosis grounded; only claims with validated citations to these exact retrieved passages (correct manual title and page) may be marked manual-supported.`;
      }
    } catch (err) {
      manualsAvailableDocs = [];
      retrievedPassages = [];
      retrievalMessage = `Manual retrieval failed: ${err instanceof Error ? err.message : String(err)}. Diagnosis will proceed without manual grounding.`;
    }

    manualContext = {
      manualsAvailable: manualsAvailableDocs,
      selectedManualId,
      retrievedPassages,
      retrievalMessage,
      retrievalSummary: {
        groundingEligibleManualCount: manualsAvailableDocs.length,
        candidatePassagesPassedThreshold: retrievedPassages.length,
        selectedManualIneligible: Boolean(selectedManualIneligibleReason),
        selectedManualIneligibleReason: selectedManualIneligibleReason ?? undefined,
        groundedStatusNote: 'Diagnosis grounding is determined after claim/citation validation, not by candidate retrieval alone.',
      },
    };

    const apiKey = getGoogleAiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'MISSING_API_KEY',
            message:
              'GOOGLE_AI_API_KEY is not configured on the server. Add it to .env.local and restart the server.',
            retryable: false,
          },
          safetyDecision: preSafety,
          manualContext,
        },
        { status: 503 },
      );
    }

    const imageBase64 = await fileToBase64(image);
    const result = await diagnoseSolarInverterImage({
      apiKey,
      imageBase64,
      mimeType: image.type,
      problemDescription,
      language: languageParsed.data,
      retrievedPassages,
      manualsAvailable: manualsAvailableDocs.length > 0,
    });

    // Validate/normalize grounding against retrieved passages; never fabricate citations.
    result.diagnosis.manualGrounding = validateManualGrounding(
      result.diagnosis.manualGrounding,
      retrievedPassages,
      manualsAvailableDocs.length > 0,
    );

    // Deterministic post-gate: block or replace unsafe/misleading AI guidance (including grounding text).
    const postSafety = evaluateAiOutputSafety(JSON.stringify(result.diagnosis), preSafety.checklist);
    if (postSafety.decision === 'block') {
      return NextResponse.json({
        ok: true,
        blockedEscalation: buildBlockedEscalation(postSafety),
        safetyDecision: {
          ...postSafety,
          triggeredRules: [...preSafety.triggeredRules, ...postSafety.triggeredRules],
        },
        model: result.model,
        generatedAt: new Date().toISOString(),
        manualContext,
      });
    }

    return NextResponse.json({
      ok: true,
      diagnosis: result.diagnosis,
      safetyDecision: {
        ...postSafety,
        decision: 'caution',
        reason:
          'Deterministic safety gate completed pre- and post-checks. Diagnosis guidance is advisory for synthetic/de-energized demo equipment only. Manual grounding, when present, is based only on retrieved passages and validated citations.',
        triggeredRules: [
          ...preSafety.triggeredRules,
          ...postSafety.triggeredRules.filter((r) => r.ruleId !== 'ai_output_postcheck_passed'),
          ...postSafety.triggeredRules.filter((r) => r.ruleId === 'ai_output_postcheck_passed'),
        ],
      },
      model: result.model,
      generatedAt: new Date().toISOString(),
      manualContext,
    });
  } catch (error) {    if (error instanceof DiagnosisServiceError) {
      console.error('[diagnose] Gemini diagnosis error (sanitized)', {
        code: error.code,
        retryable: error.retryable,
        status: error.details?.[0],
        reason: error.details?.[1],
      });
      const status =
        error.code === 'MISSING_API_KEY'
          ? 503
          : error.code === 'INVALID_IMAGE' || error.code === 'MALFORMED_MODEL_RESPONSE'
            ? error.code === 'INVALID_IMAGE'
              ? 400
              : 502
            : error.code === 'RATE_LIMITED'
              ? 429
              : 502;
      // Preserve independent deterministic safety gate results when Gemini/AI is unavailable.
      return errorResponse(
        status,
        error.code,
        error.message,
        error.retryable,
        error.details,
        preSafety,
        manualContext,
      );
    }
    console.error('[diagnose] Unexpected error (sanitized)', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'An unexpected server error occurred while analyzing the image.',
      true,
      [error instanceof Error ? error.message : String(error)],
      preSafety,
      manualContext,
    );
  }
}
