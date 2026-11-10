/**
 * SAFETY CONTRACT TEST (route-level intent; labeled).
 * Verifies draft-notes sync endpoint is scoped to ordinary technician notes only.
 * Uses a temporary local maintenance data directory; no external services.
 * NOTE: Not executed in this constrained environment if vitest times out — report honestly.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMaintenanceSession, getMaintenanceRecord } from '@/modules/maintenance/store';
import { POST as draftSync } from './[id]/draft-notes/sync/route';

const savedDir = process.env.KRIYAOS_MAINTENANCE_DATA_DIR;
let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'kriyaos-draftsync-'));
  process.env.KRIYAOS_MAINTENANCE_DATA_DIR = tmp;
});

afterEach(async () => {
  process.env.KRIYAOS_MAINTENANCE_DATA_DIR = savedDir;
  await rm(tmp, { recursive: true, force: true });
});

describe('draft-notes sync safety contract (ordinary notes only)', () => {
  it('updates only technician notes, preserves safety/verification/blocked state, is idempotent and detects conflict', async () => {
    const { record } = await createMaintenanceSession({
      problemDescription: 'synthetic demo issue',
      diagnosisSummary: 'demo summary',
      diagnosisBlocked: true,
      safetyDecisionAtDiagnosis: { decision: 'block', reasons: ['demo'] } as unknown as never,
    });
    const before = await getMaintenanceRecord(record.id);
    expect(before?.diagnosisBlocked).toBe(true);
    expect(before?.status).toBe('diagnosis_recorded');

    const req = (body: unknown) => new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const res1 = await draftSync(req({ idempotencyKey: 'k1', draftText: 'note A', baseRecordUpdatedAt: before!.updatedAt, mode: 'replace' }), { params: Promise.resolve({ id: record.id }) });
    expect(res1.status).toBe(200);
    const after1 = await getMaintenanceRecord(record.id);
    expect(after1?.technicianNotes).toBe('note A');
    expect(after1?.diagnosisBlocked).toBe(true);
    expect(after1?.status).toBe('diagnosis_recorded');
    expect(after1?.currentVerification).toBeNull();
    expect(after1?.safetyDecisionAtDiagnosis).toMatchObject({ decision: 'block' });

    // idempotent duplicate
    const res2 = await draftSync(req({ idempotencyKey: 'k1', draftText: 'note B', baseRecordUpdatedAt: before!.updatedAt, mode: 'replace' }), { params: Promise.resolve({ id: record.id }) });
    expect((await res2.json()).alreadyApplied).toBe(true);
    expect((await getMaintenanceRecord(record.id))?.technicianNotes).toBe('note A');

    // conflict
    const res3 = await draftSync(req({ idempotencyKey: 'k2', draftText: 'note C', baseRecordUpdatedAt: '2000-01-01T00:00:00.000Z' }), { params: Promise.resolve({ id: record.id }) });
    expect(res3.status).toBe(409);
    const c = await res3.json();
    expect(c.error.code).toBe('DRAFT_CONFLICT');
  });
});
