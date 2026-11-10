import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditEvent, MaintenanceRecord, MaintenanceStatus, RepairActionEntry, VerificationRecord } from './types';
import {
  findMaintenanceRecordByKeyFromSqlite,
  getMaintenanceRecordFromSqlite,
  isSqliteMaintenanceStoreEnabled,
  listMaintenanceRecordsFromSqlite,
  saveMaintenanceRecordToSqlite,
} from './sqliteStore';

function getDataDir(): string {
  return process.env.KRIYAOS_MAINTENANCE_DATA_DIR ?? path.join(process.cwd(), 'data', 'maintenance');
}
function indexPath(): string { return path.join(getDataDir(), 'index.json'); }
function recordsDir(): string { return path.join(getDataDir(), 'records'); }

interface IndexEntry {
  id: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  status: MaintenanceStatus;
  problemDescription: string;
  diagnosisBlocked: boolean;
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(recordsDir(), { recursive: true });
}

async function readIndex(): Promise<IndexEntry[]> {
  try {
    const raw = await fs.readFile(indexPath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries: IndexEntry[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(indexPath(), JSON.stringify(entries, null, 2), 'utf8');
}

function toIndexEntry(r: MaintenanceRecord): IndexEntry {
  return {
    id: r.id,
    idempotencyKey: r.idempotencyKey,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    status: r.status,
    problemDescription: r.problemDescription.slice(0, 180),
    diagnosisBlocked: r.diagnosisBlocked,
  };
}

function recordPath(id: string): string {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid record id.');
  return path.join(recordsDir(), `${id}.json`);
}

export async function getMaintenanceRecord(id: string): Promise<MaintenanceRecord | null> {
  if (isSqliteMaintenanceStoreEnabled()) return getMaintenanceRecordFromSqlite(id);
  try {
    const raw = await fs.readFile(recordPath(id), 'utf8');
    return JSON.parse(raw) as MaintenanceRecord;
  } catch {
    return null;
  }
}

export async function listMaintenanceRecords(): Promise<IndexEntry[]> {
  if (isSqliteMaintenanceStoreEnabled()) return listMaintenanceRecordsFromSqlite();
  const index = await readIndex();
  return index.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function findRecordByIdempotencyKey(idempotencyKey: string): Promise<MaintenanceRecord | null> {
  if (isSqliteMaintenanceStoreEnabled()) return findMaintenanceRecordByKeyFromSqlite(idempotencyKey);
  const index = await readIndex();
  const existing = index.find((entry) => entry.idempotencyKey === idempotencyKey);
  if (!existing) return null;
  return getMaintenanceRecord(existing.id);
}

async function saveRecord(record: MaintenanceRecord): Promise<MaintenanceRecord> {
  if (isSqliteMaintenanceStoreEnabled()) return saveMaintenanceRecordToSqlite(record);
  await ensureDirs();
  record.updatedAt = new Date().toISOString();
  await fs.writeFile(recordPath(record.id), JSON.stringify(record, null, 2), 'utf8');
  const index = await readIndex();
  const next = index.filter((e) => e.id !== record.id);
  next.push(toIndexEntry(record));
  await writeIndex(next);
  return record;
}

export function makeAuditEvent(input: Omit<AuditEvent, 'id' | 'at'> & { at?: string }): AuditEvent {
  return { id: randomUUID(), at: input.at ?? new Date().toISOString(), ...input };
}

export async function createMaintenanceSession(input: {
  idempotencyKey?: string;
  problemDescription: string;
  diagnosisSummary: string;
  observedMachineComponent?: string;
  machineEquipmentIdentifier?: string;
  possibleIssue?: string;
  model?: string;
  responseLanguage?: string;
  manualReferences?: MaintenanceRecord['manualReferences'];
  safetyDecisionAtDiagnosis: MaintenanceRecord['safetyDecisionAtDiagnosis'];
  diagnosisBlocked: boolean;
}): Promise<{ record: MaintenanceRecord; created: boolean }> {
  if (!isSqliteMaintenanceStoreEnabled()) await ensureDirs();
  if (input.idempotencyKey) {
    const existing = await findRecordByIdempotencyKey(input.idempotencyKey);
    if (existing) return { record: existing, created: false };
  }

  const now = new Date().toISOString();
  const record: MaintenanceRecord = {
    id: randomUUID(),
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    status: 'diagnosis_recorded',
    problemDescription: input.problemDescription,
    diagnosisSummary: input.diagnosisSummary,
    observedMachineComponent: input.observedMachineComponent,
    machineEquipmentIdentifier: input.machineEquipmentIdentifier,
    possibleIssue: input.possibleIssue,
    model: input.model,
    responseLanguage: input.responseLanguage,
    manualReferences: input.manualReferences ?? [],
    safetyDecisionAtDiagnosis: input.safetyDecisionAtDiagnosis ?? null,
    diagnosisBlocked: input.diagnosisBlocked,
    repairActions: [],
    partsReplaced: [],
    technicianNotes: '',
    currentVerification: null,
    verificationHistory: [],
    auditEvents: [],
  };
  record.auditEvents.push(makeAuditEvent({
    type: 'session_created',
    toStatus: 'diagnosis_recorded',
    summary: input.diagnosisBlocked
      ? 'Maintenance session created from a blocked diagnosis (repair cannot be marked verified resolved).'
      : 'Maintenance session created from diagnosis record.',
    details: { diagnosisBlocked: input.diagnosisBlocked },
  }));
  await saveRecord(record);
  return { record, created: true };
}

export async function updateRecord(
  id: string,
  mutate: (record: MaintenanceRecord) => { record: MaintenanceRecord; audit?: AuditEvent[] } | { error: string; status?: number },
): Promise<{ record?: MaintenanceRecord; error?: string; status?: number }> {
  const record = await getMaintenanceRecord(id);
  if (!record) return { error: 'Maintenance record not found.', status: 404 };
  const result = mutate(structuredClone(record));
  if ('error' in result) return result;
  if (result.audit?.length) result.record.auditEvents.push(...result.audit);
  const saved = await saveRecord(result.record);
  return { record: saved };
}

export function appendRepairAction(actions: string[], at = new Date().toISOString()): RepairActionEntry[] {
  return actions.map((description) => ({ description, recordedAt: at, recordedBy: 'technician' as const }));
}

export function appendVerification(record: MaintenanceRecord, verification: VerificationRecord, changed: boolean): AuditEvent {
  // Never silently overwrite: push to history; keep current as latest.
  record.verificationHistory.push(verification);
  record.currentVerification = verification;
  return makeAuditEvent({
    type: changed ? 'verification_changed' : 'verification_recorded',
    fromStatus: undefined,
    toStatus: record.status,
    summary: changed
      ? `Verification result changed/recorded as ${verification.outcome}. Previous verification evidence preserved in history.`
      : `Verification recorded as ${verification.outcome}.`,
    details: { outcome: verification.outcome, technicianConfirmation: verification.technicianConfirmation },
  });
}
