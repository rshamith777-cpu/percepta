import type { SupportedLanguage } from './contracts';
import type { SafetyDecision } from './safety';
import type { AnnotationSet } from '@/modules/annotations/types';
import type {
  ManualDocument,
  ManualGroundingCitation,
  ManualGroundingResult,
  ManualSupportedClaim,
  RetrievedManualPassage,
} from './manuals';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface DiagnosisInspectionStep {
  order: number;
  instruction: string;
  /** Advisory caution for this step; must not instruct opening energized equipment or touching live components. */
  caution?: string;
}

export interface DiagnosisResult {
  observedMachineComponent: string;
  possibleIssue: string;
  /** Visual observations with uncertainty clearly labeled when applicable. */
  supportingVisualObservations: string[];
  uncertainObservations: string[];
  stepByStepInspectionGuidance: DiagnosisInspectionStep[];
  requiredToolsOrPpe: string[];
  safetyWarnings: string[];
  confidenceLevel: ConfidenceLevel;
  confidenceRationale: string;
  requiresExpertAssistance: boolean;
  expertAssistanceReason?: string;
  demoEquipmentNotice: string;
  imageLimitationsNotice: string;
  responseLanguage: SupportedLanguage;
  /** Phase 3: separates image observations, manual-supported claims, and unsupported AI suggestions. */
  manualGrounding?: ManualGroundingResult;
  /** Phase 4: advisory visual annotations with validated normalized coordinates; absent/fabricated locations are never returned. */
  annotationSet?: AnnotationSet;
}

export interface DiagnosisApiSuccess {
  ok: true;
  /** Present when deterministic safety gate allowed/cautioned diagnosis guidance. */
  diagnosis?: DiagnosisResult;
  /** Present when deterministic safety gate blocked repair guidance. */
  blockedEscalation?: string;
  safetyDecision: SafetyDecision;
  model?: string;
  generatedAt: string;
  manualContext?: {
    manualsAvailable: ManualDocument[];
    selectedManualId?: string | null;
    retrievedPassages: RetrievedManualPassage[];
    retrievalMessage: string;
    /** Explicit retrieval/grounding state (Bug 2): candidate retrieval != grounded diagnosis. */
    retrievalSummary?: {
      groundingEligibleManualCount: number;
      candidatePassagesPassedThreshold: number;
      selectedManualIneligible?: boolean;
      selectedManualIneligibleReason?: string;
      groundedStatusNote?: string;
      validatedClaimCount?: number;
      diagnosisGrounded?: boolean;
    };
  };
}

export interface DiagnosisApiError {
  ok: false;
  error: {
    code:
      | 'MISSING_API_KEY'
      | 'INVALID_REQUEST'
      | 'INVALID_IMAGE'
      | 'RATE_LIMITED'
      | 'UPSTREAM_ERROR'
      | 'MALFORMED_MODEL_RESPONSE'
      | 'INTERNAL_ERROR';
    message: string;
    retryable: boolean;
    details?: string[];
  };
  safetyDecision?: SafetyDecision;
  manualContext?: DiagnosisApiSuccess['manualContext'];
}

export type DiagnosisApiResponse = DiagnosisApiSuccess | DiagnosisApiError;

export const SUPPORTED_LANGUAGES: Array<{ value: SupportedLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
];

export type { ManualDocument, ManualGroundingCitation, ManualGroundingResult, ManualSupportedClaim, RetrievedManualPassage };
