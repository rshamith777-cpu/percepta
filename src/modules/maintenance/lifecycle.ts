import type { MaintenanceStatus, VerificationOutcome, VerificationRecord } from './types';
import type { SafetyDecision } from '@/types';

const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, ReadonlySet<MaintenanceStatus>> = {
  diagnosis_recorded: new Set(['repair_attempt_recorded', 'awaiting_verification', 'escalated_requires_qualified_technician']),
  repair_attempt_recorded: new Set(['awaiting_verification', 'verification_failed', 'verified_resolved', 'escalated_requires_qualified_technician']),
  awaiting_verification: new Set(['verification_failed', 'verified_resolved', 'escalated_requires_qualified_technician', 'repair_attempt_recorded']),
  verified_resolved: new Set(['escalated_requires_qualified_technician']), // reopening resolved status requires explicit escalation/change flow; keep conservative
  verification_failed: new Set(['repair_attempt_recorded', 'awaiting_verification', 'escalated_requires_qualified_technician', 'verified_resolved']),
  escalated_requires_qualified_technician: new Set([]), // terminal for this record; create new follow-up if needed
};

export function canTransition(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].has(to);
}

export function statusFromVerificationOutcome(outcome: VerificationOutcome): MaintenanceStatus {
  if (outcome === 'issue_resolved') return 'verified_resolved';
  if (outcome === 'issue_persists') return 'verification_failed';
  if (outcome === 'escalated') return 'escalated_requires_qualified_technician';
  return 'awaiting_verification'; // unable_to_verify
}

export function isSafetyBlockedForResolution(safetyDecisionAtDiagnosis: SafetyDecision | null, diagnosisBlocked: boolean): boolean {
  if (diagnosisBlocked) return true;
  if (!safetyDecisionAtDiagnosis) return false;
  return safetyDecisionAtDiagnosis.decision === 'block';
}

export function validateSuccessfulVerification(input: {
  record: VerificationRecord;
  safetyDecisionAtDiagnosis: SafetyDecision | null;
  diagnosisBlocked: boolean;
}): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const { record } = input;

  if (isSafetyBlockedForResolution(input.safetyDecisionAtDiagnosis, input.diagnosisBlocked)) {
    errors.push('A blocked or dangerous diagnosis cannot be recorded as successfully repaired. Escalate to a qualified technician.');
  }
  if (record.outcome !== 'issue_resolved') {
    errors.push('Verification outcome must be "issue_resolved" to mark the repair as verified resolved.');
  }
  if (!record.technicianConfirmation) {
    errors.push('Explicit technician confirmation is required before recording "Issue resolved".');
  }
  if (!record.evidence || record.evidence.trim().length < 10) {
    errors.push('Technician-entered verification evidence is required (at least a short description of what was observed/tested on de-energized/synthetic demo equipment).');
  }
  const requiredChecklist = record.checklist.filter((c) => c.required);
  if (requiredChecklist.length > 0 && requiredChecklist.some((c) => !c.checked)) {
    errors.push('All required verification checklist items must be completed before recording "Issue resolved".');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

export function defaultVerificationChecklist(): Array<{ id: string; label: string; checked: boolean; required: boolean }> {
  return [
    { id: 'demo_scope', label: 'Verification performed on synthetic or confirmed de-energized demo equipment only.', checked: false, required: true },
    { id: 'no_live_work', label: 'No live electrical work, no opening energized equipment, and no touching live components occurred.', checked: false, required: true },
    { id: 'visual_evidence', label: 'Technician recorded observable verification evidence (display/status/indicator/visual condition) in notes.', checked: false, required: true },
    { id: 'qualified_review', label: 'Qualified technician review/escalation path is available if the issue persists or is unclear.', checked: false, required: false },
  ];
}
