import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DemoCmmsAdapter } from './demoAdapter';
import { exportMaintenanceRecordJson, exportMaintenanceRecordsCsv } from './export';
import { getCmmsConfig } from './config';
import { syncRecordToCmms } from './index';
import type { MaintenanceRecord } from '@/modules/maintenance/types';

function sampleRecord(): MaintenanceRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'diagnosis_recorded',
    problemDescription: 'Inverter fan noise',
    diagnosisSummary: 'Possible fan wear',
    possibleIssue: 'Fan wear',
    safetyDecisionAtDiagnosis: null,
    diagnosisBlocked: false,
    repairActions: [],
    partsReplaced: [],
    technicianNotes: '',
    currentVerification: null,
    verificationHistory: [],
    auditEvents: [],
  };
}

describe('CMMS demo adapter and exports', () => {
  const env = { ...process.env };
  beforeEach(() => { process.env = { ...env }; delete process.env.CMMS_ENABLED; delete process.env.CMMS_PROVIDER; });
  afterEach(() => { process.env = { ...env }; });

  it('reports disabled when not configured', () => {
    expect(getCmmsConfig().mode).toBe('disabled');
  });

  it('demo adapter returns clearly labeled synthetic result', async () => {
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'demo';
    const res = await new DemoCmmsAdapter().syncMaintenanceRecord(sampleRecord());
    expect(res.ok).toBe(true);
    expect(res.syntheticDemo).toBe(true);
    expect(res.message).toMatch(/synthetic/i);
    expect(res.message).toMatch(/No real ERP/i);
    expect(res.externalId).toMatch(/^DEMO-CMMS-/);
  });

  it('sync refuses to claim real connection when unconfigured', async () => {
    const res = await syncRecordToCmms(sampleRecord());
    expect(res.ok).toBe(false);
    expect(res.syntheticDemo).toBe(false);
    expect(res.message).toMatch(/No real ERP\/CMMS/i);
  });

  it('exports JSON and CSV with synthetic demo labeling option', () => {
    const json = exportMaintenanceRecordJson(sampleRecord(), true);
    expect(json.contentType).toContain('application/json');
    expect(json.body).toMatch(/syntheticDemo/);
    expect(json.body).toMatch(/synthetic demo/i);
    const csv = exportMaintenanceRecordsCsv([sampleRecord()], true);
    expect(csv.contentType).toContain('text/csv');
    expect(csv.body).toContain('record_id');
    expect(csv.body).toContain('synthetic_demo_context');
  });
});
