import type { MaintenanceRecord } from '@/modules/maintenance/types';
import type { MaintenanceExportBundle } from './types';

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportMaintenanceRecordJson(record: MaintenanceRecord, syntheticDemo = false): MaintenanceExportBundle {
  const payload = {
    exportType: 'kriyaos-maintenance-record',
    syntheticDemo,
    demoNotice: syntheticDemo
      ? 'This export contains or is associated with clearly labeled synthetic demo integration data. It is not a real ERP/CMMS work order.'
      : undefined,
    exportedAt: new Date().toISOString(),
    record,
  };
  return {
    format: 'json',
    filename: `maintenance-${record.id}.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload, null, 2),
    syntheticDemo,
  };
}

export function exportMaintenanceRecordsCsv(records: MaintenanceRecord[], syntheticDemo = false): MaintenanceExportBundle {
  const headers = [
    'record_id',
    'created_at',
    'updated_at',
    'status',
    'diagnosis_blocked',
    'problem_description',
    'possible_issue',
    'observed_component',
    'current_verification_outcome',
    'repair_actions_count',
    'parts_replaced_count',
    'audit_events_count',
    'synthetic_demo_context',
  ];
  const rows = records.map((r) => [
    r.id,
    r.createdAt,
    r.updatedAt,
    r.status,
    r.diagnosisBlocked ? 'true' : 'false',
    r.problemDescription,
    r.possibleIssue ?? '',
    r.observedMachineComponent ?? '',
    r.currentVerification?.outcome ?? '',
    r.repairActions.length,
    r.partsReplaced.length,
    r.auditEvents.length,
    syntheticDemo ? 'true' : 'false',
  ]);
  const body = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
  return {
    format: 'csv',
    filename: `maintenance-export-${new Date().toISOString().slice(0, 10)}.csv`,
    contentType: 'text/csv; charset=utf-8',
    body,
    syntheticDemo,
  };
}
