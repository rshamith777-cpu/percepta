import type { SafetyDecision } from '@/types';

export type MaintenanceStatus =
  | 'diagnosis_recorded'
  | 'repair_attempt_recorded'
  | 'awaiting_verification'
  | 'verified_resolved'
  | 'verification_failed'
  | 'escalated_requires_qualified_technician';

export type VerificationOutcome = 'issue_resolved' | 'issue_persists' | 'unable_to_verify' | 'escalated';

export interface AuditEvent {
  id: string;
  at: string; // ISO timestamp
  type:
    | 'session_created'
    | 'repair_attempt_recorded'
    | 'status_changed'
    | 'verification_recorded'
    | 'verification_changed'
    | 'escalation_recorded'
    | 'notes_updated';
  fromStatus?: MaintenanceStatus;
  toStatus?: MaintenanceStatus;
  summary: string;
  details?: Record<string, unknown>;
}

export interface RepairActionEntry {
  description: string;
  recordedAt: string;
  recordedBy?: 'technician';
}

export interface VerificationChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required?: boolean;
}

export interface VerificationRecord {
  recordedAt: string;
  outcome: VerificationOutcome;
  checklist: VerificationChecklistItem[];
  evidence: string; // technician-entered evidence
  technicianConfirmation: boolean;
  followUpRecommendations?: string;
  recordedBy: 'technician';
}

export interface MaintenanceRecord {
  id: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  status: MaintenanceStatus;
  // Associated diagnosis context (no unnecessary uploaded image data)
  problemDescription: string;
  diagnosisSummary: string;
  observedMachineComponent?: string;
  machineEquipmentIdentifier?: string;
  possibleIssue?: string;
  model?: string;
  responseLanguage?: string;
  manualReferences?: Array<{ manualTitle: string; pageNumber: number; supportingPassage?: string }>;
  safetyDecisionAtDiagnosis: SafetyDecision | null;
  diagnosisBlocked: boolean;
  // Repair data
  repairActions: RepairActionEntry[];
  partsReplaced: string[];
  technicianNotes: string;
  // Verification
  currentVerification: VerificationRecord | null;
  verificationHistory: VerificationRecord[]; // append-only; never silently overwrite
  escalationReason?: string;
  // Audit
  auditEvents: AuditEvent[];
}
