import { z } from 'zod';

export const supportedLanguageSchema = z.enum(['en', 'hi', 'kn']);

const inspectionStepSchema = z.object({
  order: z.number().int().positive(),
  instruction: z.string().min(1).max(500),
  caution: z.string().max(400).optional(),
});

const manualCitationSchema = z.object({
  manualTitle: z.string().min(1).max(200),
  pageNumber: z.number().int().positive(),
  supportingPassage: z.string().min(1).max(2000),
});

const manualSupportedClaimSchema = z.object({
  claim: z.string().min(1).max(600),
  citations: z.array(manualCitationSchema).min(1).max(4),
});

const manualGroundingSchema = z.object({
  visualObservationsFromImage: z.array(z.string().min(1).max(400)).max(12),
  manualSupportedClaims: z.array(manualSupportedClaimSchema).max(12),
  aiSuggestionsNotSupportedByManual: z.array(z.string().min(1).max(500)).max(12),
  manualGroundingStatus: z.enum(['grounded', 'not_grounded', 'no_manuals']),
  groundingDisclosure: z.string().min(1).max(700),
});

// Phase 4: optional model-suggested image annotations (advisory). Server validates and may discard invalid/fabricated data.
const visualAnnotationSchema = z.object({
  id: z.string().max(80).optional(),
  type: z.enum(['bounding_box', 'point', 'arrow', 'label', 'inspection_region']),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  label: z.string().min(1).max(120),
  explanation: z.string().max(240).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['visual_ai_observation', 'manual_supported_reference', 'advisory']).optional(),
  safetyDisclaimer: z.string().max(240).optional(),
});

export const diagnosisResultSchema = z.object({
  observedMachineComponent: z.string().min(1).max(500),
  possibleIssue: z.string().min(1).max(800),
  supportingVisualObservations: z.array(z.string().min(1).max(400)).min(1).max(12),
  uncertainObservations: z.array(z.string().min(1).max(400)).max(12),
  stepByStepInspectionGuidance: z.array(inspectionStepSchema).min(1).max(12),
  requiredToolsOrPpe: z.array(z.string().min(1).max(200)).min(1).max(15),
  safetyWarnings: z.array(z.string().min(1).max(500)).min(1).max(15),
  confidenceLevel: z.enum(['low', 'medium', 'high']),
  confidenceRationale: z.string().min(1).max(700),
  requiresExpertAssistance: z.boolean(),
  expertAssistanceReason: z.string().max(500).optional(),
  demoEquipmentNotice: z.string().min(1).max(500),
  imageLimitationsNotice: z.string().min(1).max(700),
  responseLanguage: supportedLanguageSchema,
  manualGrounding: manualGroundingSchema.optional(),
  visualAnnotations: z.array(visualAnnotationSchema).max(12).optional(),
  annotationAvailability: z.enum(['available', 'unavailable']).optional(),
  annotationExplanation: z.string().max(500).optional(),
});

export type DiagnosisResultParsed = z.infer<typeof diagnosisResultSchema>;

export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
