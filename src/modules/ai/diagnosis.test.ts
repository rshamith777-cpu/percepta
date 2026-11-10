import { describe, expect, it } from 'vitest';
import { diagnosisResultSchema, extractJsonText } from './diagnosisSchema';
import {
  DiagnosisServiceError,
  assertRequiredLimitationsNotice,
  hasRequiredImageLimitationLabeling,
  mapUpstreamError,
} from './geminiDiagnosis';
import { evaluateInputSafety } from '@/modules/safety/safetyGate';
import { createDefaultSafetyChecklist } from '@/modules/safety/checklist';

function validDiagnosis(overrides: Record<string, unknown> = {}) {
  return {
    observedMachineComponent: 'Synthetic demo inverter display (uncertain from image)',
    possibleIssue: 'Warning indicator visible; exact fault cannot be confirmed from image alone.',
    supportingVisualObservations: ['A warning icon appears on the display (uncertain visual observation).'],
    uncertainObservations: ['Image clarity and equipment state cannot be confirmed from the photo.'],
    stepByStepInspectionGuidance: [
      { order: 1, instruction: 'On confirmed de-energized synthetic demo equipment, visually record the warning icon and label.', caution: 'Do not open or touch internal components.' },
    ],
    requiredToolsOrPpe: ['Camera or notebook for documentation', 'Appropriate PPE for the work area'],
    safetyWarnings: [
      'Image analysis/AI cannot confirm electrical isolation, energized/de-energized state, or that equipment is safe to touch.',
      'Do not open energized equipment or touch live components.',
    ],
    confidenceLevel: 'low',
    confidenceRationale: 'Only limited visual information is available from the image.',
    requiresExpertAssistance: true,
    expertAssistanceReason: 'A qualified person must verify status and diagnose electrical issues.',
    demoEquipmentNotice: 'Guidance is limited to synthetic or confirmed de-energized demo equipment only.',
    imageLimitationsNotice:
      'Image analysis has limitations and cannot confirm electrical isolation, cannot confirm whether equipment is energized or de-energized, and cannot confirm it is safe to touch. Live electrical hazards cannot be reliably detected from images.',
    responseLanguage: 'en',
    manualGrounding: {
      visualObservationsFromImage: ['Warning icon visible (uncertain).'],
      manualSupportedClaims: [],
      aiSuggestionsNotSupportedByManual: ['Visual inspection steps are general and not manual-grounded.'],
      manualGroundingStatus: 'no_manuals',
      groundingDisclosure: 'No uploaded manuals are available.',
    },
    visualAnnotations: [],
    annotationAvailability: 'unavailable',
    annotationExplanation: 'Reliable image-grounded locations are unavailable for this image.',
    ...overrides,
  };
}

describe('diagnosis response validation (regression)', () => {
  it('accepts a valid response with required image limitation/safety labeling', () => {
    const parsed = diagnosisResultSchema.safeParse(validDiagnosis());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(() => assertRequiredLimitationsNotice(parsed.data)).not.toThrow();
    }
  });

  it('accepts semantically equivalent image limitation labeling (cannot confirm/verify isolation/energized/safe-to-touch)', () => {
    expect(
      hasRequiredImageLimitationLabeling(
        'From this photo the AI cannot confirm electrical isolation, cannot verify if the inverter is energized or de-energized, and cannot determine that it is safe to touch.',
      ),
    ).toBe(true);
  });

  it('rejects missing image limitation notice (required image limitation/safety labeling)', () => {
    const payload = validDiagnosis();
    delete (payload as Record<string, unknown>).imageLimitationsNotice;
    const parsed = diagnosisResultSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join('.') === 'imageLimitationsNotice')).toBe(true);
    }
  });

  it('rejects missing safety label (safetyWarnings required)', () => {
    const payload = validDiagnosis();
    delete (payload as Record<string, unknown>).safetyWarnings;
    const parsed = diagnosisResultSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join('.') === 'safetyWarnings')).toBe(true);
    }
  });

  it('rejects an imageLimitationsNotice that lacks required safety meaning', () => {
    expect(() => assertRequiredLimitationsNotice({ imageLimitationsNotice: 'Image quality is low.' })).toThrow(
      DiagnosisServiceError,
    );
    try {
      assertRequiredLimitationsNotice({ imageLimitationsNotice: 'Image quality is low.' });
    } catch (e) {
      expect(e).toBeInstanceOf(DiagnosisServiceError);
      expect((e as DiagnosisServiceError).message).toMatch(/required image limitation\/safety labeling/i);
      expect((e as DiagnosisServiceError).details).toContain('missing_or_insufficient_image_limitations_notice');
    }
  });

  it('handles malformed Gemini response text safely (no fabrication)', () => {
    expect(() => JSON.parse(extractJsonText('not json at all'))).toThrow();
    // Fenced JSON is extractable.
    const extracted = extractJsonText('```json\n{"a":1}\n```');
    expect(JSON.parse(extracted)).toEqual({ a: 1 });
  });

  it('preserves safety-gate BLOCK as authoritative (regression)', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'The inverter may still be live and I am not sure.',
      equipmentStatus: 'uncertain',
      checklist: createDefaultSafetyChecklist('uncertain'),
    });
    expect(decision.decision).toBe('block');
    expect(decision.safeNextAction).toMatch(/Stop repair guidance/i);
  });
});

describe('Gemini upstream error classification (sanitized)', () => {
  it('classifies 503 UNAVAILABLE/high demand as transient upstream service error', () => {
    const err = new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
    );
    (err as Error & { status?: number }).status = 503;
    (err as Error & { name: string }).name = 'ApiError';
    const mapped = mapUpstreamError(err);
    expect(mapped.code).toBe('UPSTREAM_ERROR');
    expect(mapped.retryable).toBe(true);
    expect(mapped.message).toMatch(/temporarily unavailable|high demand/i);
    expect(mapped.details?.[0]).toContain('status=503');
  });

  it('classifies quota/rate limit distinctly', () => {
    const err = new Error('quota exceeded');
    (err as Error & { status?: number }).status = 429;
    const mapped = mapUpstreamError(err);
    expect(mapped.code).toBe('RATE_LIMITED');
    expect(mapped.retryable).toBe(true);
  });

  it('classifies auth/permission as non-retryable without exposing secrets', () => {
    const err = new Error('API key not valid');
    (err as Error & { status?: number }).status = 401;
    const mapped = mapUpstreamError(err);
    expect(mapped.code).toBe('UPSTREAM_ERROR');
    expect(mapped.retryable).toBe(false);
    expect(mapped.message).toMatch(/authentication or access failed/i);
  });

  it('classifies unsupported/missing model as non-retryable', () => {
    const err = new Error('model not found');
    (err as Error & { status?: number }).status = 404;
    const mapped = mapUpstreamError(err);
    expect(mapped.retryable).toBe(false);
    expect(mapped.message).toMatch(/model is unavailable|not found/i);
  });

  it('classifies local network/DNS/timeout failures distinctly', () => {
    const err = new Error('fetch failed');
    const mapped = mapUpstreamError(err);
    expect(mapped.code).toBe('UPSTREAM_ERROR');
    expect(mapped.retryable).toBe(true);
    expect(mapped.message).toMatch(/network, DNS, or timeout/i);
  });
});
