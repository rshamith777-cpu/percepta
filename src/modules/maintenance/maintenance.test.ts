import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  canTransition,
  createMaintenanceSession,
  defaultVerificationChecklist,
  getMaintenanceRecord,
  listMaintenanceRecords,
  statusFromVerificationOutcome,
  updateRecord,
  validateSuccessfulVerification,
  appendVerification,
  makeAuditEvent,
} from './index';
import type { SafetyDecision } from '@/types';

let tempDir = '';
const blockedSafety: SafetyDecision = {
  decision: 'block',
  reason: 'Blocked',
  triggeredRules: [],
  safeNextAction: 'Escalate',
  checklist: [],
  safetyCritical: true,
  verificationDisclaimer: 'Camera/AI cannot verify isolation.',
};
const allowSafety: SafetyDecision = {
  decision: 'caution',
  reason: 'Caution',
  triggeredRules: [],
  safeNextAction: 'Proceed on de-energized demo only',
  checklist: [],
  safetyCritical: false,
  verificationDisclaimer: 'Camera/AI cannot verify isolation.',
};

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'kriyaos-maint-'));
  process.env.KRIYAOS_MAINTENANCE_DATA_DIR = tempDir;
});

afterEach(async () => {
  delete process.env.KRIYAOS_MAINTENANCE_DATA_DIR;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe('maintenance lifecycle transitions (Phase 6)', () => {
  it('allows valid transitions and rejects invalid transitions', () => {
    expect(canTransition('diagnosis_recorded', 'repair_attempt_recorded')).toBe(true);
    expect(canTransition('repair_attempt_recorded', 'awaiting_verification')).toBe(true);
    expect(canTransition('awaiting_verification', 'verified_resolved')).toBe(true);
    expect(canTransition('diagnosis_recorded', 'verified_resolved')).toBe(false);
    expect(canTransition('escalated_requires_qualified_technician', 'verified_resolved')).toBe(false);
  });

  it('maps verification outcomes to statuses deterministically', () => {
    expect(statusFromVerificationOutcome('issue_resolved')).toBe('verified_resolved');
    expect(statusFromVerificationOutcome('issue_persists')).toBe('verification_failed');
    expect(statusFromVerificationOutcome('unable_to_verify')).toBe('awaiting_verification');
    expect(statusFromVerificationOutcome('escalated')).toBe('escalated_requires_qualified_technician');
  });
});

describe('successful verification requirements and safety integration', () => {
  it('requires explicit evidence and technician confirmation for issue_resolved', () => {
    const checklist = defaultVerificationChecklist().map((c) => ({ ...c, checked: c.required }));
    const result = validateSuccessfulVerification({
      record: {
        recordedAt: new Date().toISOString(),
        outcome: 'issue_resolved',
        checklist,
        evidence: 'too short',
        technicianConfirmation: false,
        recordedBy: 'technician',
      },
      safetyDecisionAtDiagnosis: allowSafety,
      diagnosisBlocked: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /confirmation/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /evidence/i.test(e))).toBe(true);
    }
  });

  it('rejects verified resolved when diagnosis was blocked or safety-blocked', () => {
    const checklist = defaultVerificationChecklist().map((c) => ({ ...c, checked: true }));
    const base = {
      recordedAt: new Date().toISOString(),
      outcome: 'issue_resolved' as const,
      checklist,
      evidence: 'Technician observed display returned to normal status on confirmed de-energized demo equipment.',
      technicianConfirmation: true,
      recordedBy: 'technician' as const,
    };
    expect(
      validateSuccessfulVerification({ record: base, safetyDecisionAtDiagnosis: blockedSafety, diagnosisBlocked: false }).ok,
    ).toBe(false);
    expect(
      validateSuccessfulVerification({ record: base, safetyDecisionAtDiagnosis: allowSafety, diagnosisBlocked: true }).ok,
    ).toBe(false);
  });

  it('accepts issue_resolved only with evidence, confirmation, checklist, and non-blocked safety', () => {
    const checklist = defaultVerificationChecklist().map((c) => ({ ...c, checked: true }));
    const result = validateSuccessfulVerification({
      record: {
        recordedAt: new Date().toISOString(),
        outcome: 'issue_resolved',
        checklist,
        evidence: 'Technician observed normal status indicator and recorded readings on confirmed de-energized demo equipment.',
        technicianConfirmation: true,
        recordedBy: 'technician',
      },
      safetyDecisionAtDiagnosis: allowSafety,
      diagnosisBlocked: false,
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('persistence, retrieval, audit, and duplicate handling', () => {
  it('creates, persists, lists, and retrieves a repair session', async () => {
    const { record, created } = await createMaintenanceSession({
      problemDescription: 'Inverter display showed E01 on de-energized demo unit.',
      diagnosisSummary: 'Possible DC undervoltage indication; advisory diagnosis.',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
      manualReferences: [{ manualTitle: 'Service Manual', pageNumber: 12 }],
    });
    expect(created).toBe(true);
    expect(record.status).toBe('diagnosis_recorded');
    expect(record.auditEvents.some((e) => e.type === 'session_created')).toBe(true);

    const loaded = await getMaintenanceRecord(record.id);
    expect(loaded?.id).toBe(record.id);
    const list = await listMaintenanceRecords();
    expect(list.some((e) => e.id === record.id)).toBe(true);
  });

  it('does not create duplicate records for the same idempotency key', async () => {
    const key = 'idem-123';
    const first = await createMaintenanceSession({
      idempotencyKey: key,
      problemDescription: 'Same diagnosis request',
      diagnosisSummary: 'Summary',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
    });
    const second = await createMaintenanceSession({
      idempotencyKey: key,
      problemDescription: 'Same diagnosis request',
      diagnosisSummary: 'Summary',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.record.id).toBe(first.record.id);
    const list = await listMaintenanceRecords();
    expect(list.filter((e) => e.idempotencyKey === key)).toHaveLength(1);
  });

  it('preserves verification history when verification is changed (no silent overwrite)', async () => {
    const { record } = await createMaintenanceSession({
      problemDescription: 'Issue persists test',
      diagnosisSummary: 'Summary',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
    });
    const checklist = defaultVerificationChecklist().map((c) => ({ ...c, checked: true }));
    const v1 = {
      recordedAt: new Date().toISOString(),
      outcome: 'issue_persists' as const,
      checklist,
      evidence: 'Technician observed issue still present on de-energized demo equipment during recheck.',
      technicianConfirmation: true,
      recordedBy: 'technician' as const,
    };
    const v2 = { ...v1, outcome: 'issue_resolved' as const, recordedAt: new Date().toISOString() };

    const updated = await updateRecord(record.id, (r) => {
      r.status = 'repair_attempt_recorded';
      const audit1 = appendVerification(r, v1, false);
      const audit2 = appendVerification(r, v2, true);
      return { record: r, audit: [audit1, audit2] };
    });
    expect(updated.record?.verificationHistory).toHaveLength(2);
    expect(updated.record?.currentVerification?.outcome).toBe('issue_resolved');
    expect(updated.record?.auditEvents.some((e) => e.type === 'verification_changed')).toBe(true);
  });

  it('creates audit events via helper', () => {
    const e = makeAuditEvent({ type: 'status_changed', fromStatus: 'diagnosis_recorded', toStatus: 'repair_attempt_recorded', summary: 'test' });
    expect(e.id).toBeTruthy();
    expect(e.at).toBeTruthy();
    expect(e.summary).toBe('test');
  });
});
