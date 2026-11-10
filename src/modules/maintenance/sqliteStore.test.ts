import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { closeSqliteDb, getSqliteDb } from '@/lib/sqlite';
import {
  createMaintenanceSession,
  getMaintenanceRecord,
  listMaintenanceRecords,
  makeAuditEvent,
  updateRecord,
} from './index';
import type { SafetyDecision } from '@/types';

let tempDir = '';
const savedStore = process.env.KRIYAOS_MAINTENANCE_STORE;
const savedDatabaseUrl = process.env.DATABASE_URL;

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
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'kriyaos-sqlite-'));
  process.env.KRIYAOS_MAINTENANCE_STORE = 'sqlite';
  process.env.DATABASE_URL = `file:${path.join(tempDir, 'maintenance.db')}`;
});

afterEach(async () => {
  closeSqliteDb();
  if (savedStore === undefined) delete process.env.KRIYAOS_MAINTENANCE_STORE;
  else process.env.KRIYAOS_MAINTENANCE_STORE = savedStore;
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

describe('SQLite maintenance persistence', () => {
  it('persists and retrieves a maintenance record with audit rows', async () => {
    const { record, created } = await createMaintenanceSession({
      problemDescription: 'Inverter display showed E01 on de-energized demo unit.',
      diagnosisSummary: 'Possible DC undervoltage indication; advisory diagnosis.',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
    });

    expect(created).toBe(true);
    const loaded = await getMaintenanceRecord(record.id);
    expect(loaded?.id).toBe(record.id);
    expect(loaded?.auditEvents.some((event) => event.type === 'session_created')).toBe(true);

    const list = await listMaintenanceRecords();
    expect(list.find((entry) => entry.id === record.id)).toMatchObject({
      id: record.id,
      status: 'diagnosis_recorded',
      diagnosisBlocked: false,
    });

    const db = getSqliteDb();
    const recordCount = db.prepare('SELECT COUNT(*) AS count FROM maintenance_records').get() as { count: number };
    const auditCount = db
      .prepare('SELECT COUNT(*) AS count FROM maintenance_audit WHERE record_id = ?')
      .get(record.id) as { count: number };
    expect(Number(recordCount.count)).toBe(1);
    expect(Number(auditCount.count)).toBe(record.auditEvents.length);
  });

  it('prevents duplicate records for the same idempotency key', async () => {
    const key = 'sqlite-idem-123';
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
    expect(list.filter((entry) => entry.idempotencyKey === key)).toHaveLength(1);
  });

  it('persists updates and appends audit events', async () => {
    const { record } = await createMaintenanceSession({
      problemDescription: 'Update persistence test',
      diagnosisSummary: 'Summary',
      diagnosisBlocked: false,
      safetyDecisionAtDiagnosis: allowSafety,
    });

    const updated = await updateRecord(record.id, (current) => {
      current.technicianNotes = 'Verified against de-energized demo unit.';
      return {
        record: current,
        audit: [
          makeAuditEvent({
            type: 'notes_updated',
            toStatus: current.status,
            summary: 'Technician notes updated.',
          }),
        ],
      };
    });

    expect(updated.record?.technicianNotes).toBe('Verified against de-energized demo unit.');
    const loaded = await getMaintenanceRecord(record.id);
    expect(loaded?.technicianNotes).toBe('Verified against de-energized demo unit.');
    expect(loaded?.auditEvents.some((event) => event.type === 'notes_updated')).toBe(true);

    const db = getSqliteDb();
    const auditCount = db
      .prepare('SELECT COUNT(*) AS count FROM maintenance_audit WHERE record_id = ?')
      .get(record.id) as { count: number };
    expect(Number(auditCount.count)).toBe(loaded?.auditEvents.length);
  });
});
