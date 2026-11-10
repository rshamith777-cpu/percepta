/**
 * KriyaOS core domain contracts (Phase 0).
 *
 * These types define the shared data model for the web prototype and are designed
 * to remain compatible with a future Android client (JSON-serializable shapes).
 *
 * Safety note: Camera-based electrical hazard detection is NOT reliable. Any
 * electrical hazard assessment must be treated as advisory and paired with
 * deterministic safety rules, technician confirmation, and escalation guidance.
 */

export type SupportedLanguage = 'en' | 'hi' | 'kn';

export type SessionStatus =
  | 'draft'
  | 'diagnosing'
  | 'guided_repair'
  | 'awaiting_verification'
  | 'completed'
  | 'escalated'
  | 'cancelled';

export type SafetySeverity = 'info' | 'caution' | 'warning' | 'critical';

export type SafetyGateOutcome = 'allow' | 'acknowledgement_required' | 'stop_and_escalate';

export type VerificationOutcome = 'resolved' | 'not_resolved' | 'uncertain' | 'escalated';

/** Context about the machine being serviced (solar inverter demo scenario). */
export interface MachineContext {
  machineType: 'solar_inverter';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  siteName?: string;
  /** Demo must use synthetic or de-energized equipment only. */
  equipmentState: 'synthetic_demo' | 'de_energized' | 'unknown';
  knownSymptoms?: string[];
  notes?: string;
}

/** A chunk of an ingested technical manual used for basic RAG retrieval. */
export interface ManualChunk {
  id: string;
  manualId: string;
  manualTitle: string;
  machineModel?: string;
  /** 1-based page number when available from extraction. */
  pageNumber?: number;
  sectionTitle?: string;
  language: SupportedLanguage | 'unknown';
  content: string;
  /** Optional embedding vector reference/metadata; storage backend decides format. */
  embeddingRef?: string;
  createdAt: string; // ISO 8601
}

/** Citation pointing to a manual/source passage used in an AI-assisted response. */
export interface ManualCitation {
  manualId: string;
  manualTitle: string;
  chunkId?: string;
  pageNumber?: number;
  sectionTitle?: string;
  excerpt: string;
}

/** Visual overlay instruction rendered over a captured frame/camera view. */
export interface OverlayInstruction {
  id: string;
  stepId?: string;
  type: 'label' | 'arrow' | 'box' | 'polygon' | 'highlight' | 'text';
  /** Normalized coordinates (0..1) relative to image dimensions when applicable. */
  coordinates?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    points?: Array<{ x: number; y: number }>;
  };
  label: string;
  instruction?: string;
  safetySeverity?: SafetySeverity;
  /** 0..1; conservative UI should be used when confidence is low. */
  confidence?: number;
  colorHint?: 'neutral' | 'caution' | 'warning' | 'danger';
}

/** A single guided repair step within a session. */
export interface RepairStep {
  id: string;
  sessionId: string;
  order: number;
  title: string;
  description: string;
  language: SupportedLanguage;
  safetyWarnings: string[];
  requiresAcknowledgement: boolean;
  expectedOutcome?: string;
  overlayInstructions: OverlayInstruction[];
  citations: ManualCitation[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';
  completedAt?: string; // ISO 8601
}

/** Safety event captured for auditability and UI gating. */
export interface SafetyEvent {
  id: string;
  sessionId: string;
  stepId?: string;
  timestamp: string; // ISO 8601
  severity: SafetySeverity;
  gateOutcome: SafetyGateOutcome;
  /** Human-readable warning shown to the technician. */
  message: string;
  /** Deterministic rule/check identifier when applicable (e.g., lockout_tagout). */
  ruleId?: string;
  triggeredBy: 'deterministic_rule' | 'ai_advisory' | 'technician_report' | 'system';
  acknowledged: boolean;
  acknowledgedAt?: string; // ISO 8601
  acknowledgementNote?: string;
  escalated: boolean;
}

/** Evidence and outcome for post-repair verification. */
export interface VerificationRecord {
  id: string;
  sessionId: string;
  stepId?: string;
  timestamp: string; // ISO 8601
  outcome: VerificationOutcome;
  /** Technician-observed result summary. */
  technicianObservation: string;
  /** Advisory AI assessment; never the sole authority for electrical safety. */
  aiAssessment?: string;
  aiConfidence?: number; // 0..1
  evidenceRefs: Array<{
    kind: 'image' | 'video_frame' | 'audio' | 'note';
    ref: string;
    label?: string;
  }>;
  citations: ManualCitation[];
  followUpActions: string[];
}

/** Top-level repair session / maintenance record. */
export interface RepairSession {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  status: SessionStatus;
  language: SupportedLanguage;
  machine: MachineContext;
  /** Demo/operator identifier; authentication can be added later. */
  technicianId?: string;
  symptomSummary: string;
  steps: RepairStep[];
  safetyEvents: SafetyEvent[];
  verificationRecords: VerificationRecord[];
  /** Linked manual IDs considered in this session. */
  manualIds: string[];
  resolutionSummary?: string;
}
