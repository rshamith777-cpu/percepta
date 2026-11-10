import { getSqliteDb } from '@/lib/sqlite';
import type { MaintenanceRecord, MaintenanceStatus } from './types';

export interface MaintenanceIndexEntry {
  id: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  status: MaintenanceStatus;
  problemDescription: string;
  diagnosisBlocked: boolean;
}

interface RecordRow {
  payload_json: string;
}

interface IndexRow {
  id: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  problem_description: string;
  diagnosis_blocked: number;
}

function toIndexEntry(row: IndexRow): MaintenanceIndexEntry {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as MaintenanceStatus,
    problemDescription: row.problem_description,
    diagnosisBlocked: Number(row.diagnosis_blocked) === 1,
  };
}

export function isSqliteMaintenanceStoreEnabled(): boolean {
  return (process.env.KRIYAOS_MAINTENANCE_STORE ?? '').trim().toLowerCase() === 'sqlite';
}

export function getMaintenanceRecordFromSqlite(id: string): MaintenanceRecord | null {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid record id.');
  const row = getSqliteDb()
    .prepare('SELECT payload_json FROM maintenance_records WHERE id = ?')
    .get(id) as RecordRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload_json) as MaintenanceRecord;
  } catch {
    return null;
  }
}

export function findMaintenanceRecordByKeyFromSqlite(idempotencyKey: string): MaintenanceRecord | null {
  const row = getSqliteDb()
    .prepare('SELECT payload_json FROM maintenance_records WHERE idempotency_key = ?')
    .get(idempotencyKey) as RecordRow | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload_json) as MaintenanceRecord;
  } catch {
    return null;
  }
}

export function listMaintenanceRecordsFromSqlite(): MaintenanceIndexEntry[] {
  const rows = getSqliteDb()
    .prepare(
      'SELECT id, idempotency_key, created_at, updated_at, status, problem_description, diagnosis_blocked FROM maintenance_records ORDER BY updated_at DESC',
    )
    .all() as IndexRow[];
  return rows.map(toIndexEntry);
}

export function saveMaintenanceRecordToSqlite(record: MaintenanceRecord): MaintenanceRecord {
  const db = getSqliteDb();
  record.updatedAt = new Date().toISOString();
  const payload = JSON.stringify(record);

  db.exec('BEGIN');
  try {
    db.prepare(
      `INSERT INTO maintenance_records
        (id, idempotency_key, created_at, updated_at, status, diagnosis_blocked, problem_description, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         idempotency_key = excluded.idempotency_key,
         updated_at = excluded.updated_at,
         status = excluded.status,
         diagnosis_blocked = excluded.diagnosis_blocked,
         problem_description = excluded.problem_description,
         payload_json = excluded.payload_json`,
    ).run(
      record.id,
      record.idempotencyKey ?? null,
      record.createdAt,
      record.updatedAt,
      record.status,
      record.diagnosisBlocked ? 1 : 0,
      record.problemDescription.slice(0, 180),
      payload,
    );

    db.prepare('DELETE FROM maintenance_audit WHERE record_id = ?').run(record.id);
    const insertAudit = db.prepare(
      'INSERT INTO maintenance_audit (id, record_id, at, event_json) VALUES (?, ?, ?, ?)',
    );
    for (const event of record.auditEvents) {
      insertAudit.run(event.id, record.id, event.at, JSON.stringify(event));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return record;
}
