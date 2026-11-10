import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SafetyDecision } from '@/types';
import type { CreateRoboticsTrajectoryInput, UpdateRoboticsTrajectoryInput } from './schemas';
import type { MaintenanceHistoryEntry, RoboticsTelemetry, RoboticsTrajectoryIndexEntry, RoboticsTrajectoryRecord } from './types';

function asSafetyDecisionSummary(sd: CreateRoboticsTrajectoryInput['safetyDecision'] | UpdateRoboticsTrajectoryInput['safetyDecision']): RoboticsTrajectoryRecord['safetyDecision'] {
  if (!sd) return null;
  const decision = sd.decision;
  if (decision !== 'allow' && decision !== 'caution' && decision !== 'block') return null;
  return {
    decision,
    reason: sd.reason ?? '',
    safeNextAction: sd.safeNextAction ?? '',
    safetyCritical: Boolean(sd.safetyCritical),
  } satisfies Pick<SafetyDecision, 'decision' | 'reason' | 'safeNextAction' | 'safetyCritical'>;
}

export const ROBOTICS_PRIVACY_NOTICE_VERSION = 'synthetic-local-v1';

function getDataDir(): string {
  return process.env.KRIYAOS_ROBOTICS_DATA_DIR ?? path.join(process.cwd(), 'data', 'robotics');
}
function indexPath(): string { return path.join(getDataDir(), 'index.json'); }
function recordsDir(): string { return path.join(getDataDir(), 'records'); }

async function ensureDirs(): Promise<void> {
  await fs.mkdir(recordsDir(), { recursive: true });
}
async function readIndex(): Promise<RoboticsTrajectoryIndexEntry[]> {
  try {
    const raw = await fs.readFile(indexPath(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RoboticsTrajectoryIndexEntry[]) : [];
  } catch { return []; }
}
async function writeIndex(entries: RoboticsTrajectoryIndexEntry[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(indexPath(), JSON.stringify(entries, null, 2), 'utf8');
}
function recordPath(id: string): string {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid record id.');
  return path.join(recordsDir(), `${id}.json`);
}

function normalizeTelemetry(t: unknown): RoboticsTelemetry {
  if (!t || typeof t !== 'object') return { status: 'missing', reason: 'No telemetry provided.', source: 'synthetic_demo' };
  const obj = t as Record<string, unknown>;
  const status = obj.status;
  if (status !== 'available' && status !== 'missing' && status !== 'stale' && status !== 'invalid') {
    return { status: 'invalid', reason: 'Telemetry status malformed or unsupported.', source: typeof obj.source === 'string' ? obj.source : 'unknown' };
  }
  const observedAt = typeof obj.observedAt === 'string' ? obj.observedAt : null;
  let values: RoboticsTelemetry['values'] = null;
  if (obj.values && typeof obj.values === 'object' && !Array.isArray(obj.values)) {
    values = obj.values as Record<string, number | string | boolean | null>;
  } else if (obj.values != null) {
    return { status: 'invalid', reason: 'Telemetry values malformed.', source: typeof obj.source === 'string' ? obj.source : 'unknown', observedAt };
  }
  return {
    status,
    source: typeof obj.source === 'string' ? obj.source : null,
    observedAt,
    reason: typeof obj.reason === 'string' ? obj.reason : null,
    values,
  };
}

function normalizeHistory(h: unknown, fallback: MaintenanceHistoryEntry): MaintenanceHistoryEntry[] {
  if (!Array.isArray(h)) return [fallback];
  const out: MaintenanceHistoryEntry[] = [];
  for (const item of h) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.summary !== 'string' || typeof o.verificationOutcome !== 'string') continue;
    out.push({
      at: o.at,
      summary: o.summary,
      verificationOutcome: o.verificationOutcome,
      notes: typeof o.notes === 'string' ? o.notes : null,
      safetyDecision: asSafetyDecisionSummary(o.safetyDecision as CreateRoboticsTrajectoryInput['safetyDecision']),
      source: typeof o.source === 'string' ? o.source : null,
    });
  }
  return out.length ? out : [fallback];
}

function normalizeRecord(r: RoboticsTrajectoryRecord): RoboticsTrajectoryRecord {
  const telemetry = normalizeTelemetry((r as unknown as Record<string, unknown>).telemetry);
  const createdAt = r.createdAt || new Date().toISOString();
  const fallback: MaintenanceHistoryEntry = {
    at: createdAt,
    summary: r.technicianActionMetadata?.summary ?? 'Initial record created.',
    verificationOutcome: r.verificationOutcome ?? 'pending',
    notes: r.notes ?? null,
    safetyDecision: r.safetyDecision ?? null,
    source: 'synthetic_demo',
  };
  return {
    ...r,
    updatedAt: r.updatedAt || r.createdAt || createdAt,
    operatingStatus: r.operatingStatus ?? 'synthetic/demo (simulated, not connected)',
    telemetry,
    maintenanceHistory: normalizeHistory((r as unknown as Record<string, unknown>).maintenanceHistory, fallback),
  };
}

function toIndexEntry(r: RoboticsTrajectoryRecord): RoboticsTrajectoryIndexEntry {
  const n = normalizeRecord(r);
  return { id: n.id, createdAt: n.createdAt, updatedAt: n.updatedAt, sessionId: n.sessionId ?? null, dataLabel: n.dataLabel ?? 'synthetic_demo', equipmentIdentifier: n.equipmentIdentifier, operatingStatus: n.operatingStatus ?? null, verificationOutcome: n.verificationOutcome, telemetryStatus: n.telemetry?.status, syntheticDemo: n.syntheticDemo !== false };
}

async function upsertIndexEntry(record: RoboticsTrajectoryRecord): Promise<void> {
  const index = await readIndex();
  const entry = toIndexEntry(record);
  const i = index.findIndex((e) => e.id === record.id);
  if (i >= 0) index[i] = entry; else index.push(entry);
  await writeIndex(index);
}

export async function createRoboticsTrajectoryRecord(input: CreateRoboticsTrajectoryInput): Promise<RoboticsTrajectoryRecord> {
  await ensureDirs();
  const now = new Date().toISOString();
  const dataLabel = input.dataLabel ?? 'synthetic_demo';
  const initialHistory: MaintenanceHistoryEntry = {
    at: now,
    summary: input.technicianActionMetadata.summary,
    verificationOutcome: input.verificationOutcome ?? 'pending',
    notes: input.notes ?? null,
    safetyDecision: asSafetyDecisionSummary(input.safetyDecision),
    source: 'synthetic_demo',
  };
  const record: RoboticsTrajectoryRecord = normalizeRecord({
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    sessionId: input.sessionId?.trim() || null,
    eventType: input.eventType?.trim() || null,
    dataLabel,
    syntheticDemo: dataLabel === 'synthetic_demo',
    consentAcknowledged: true,
    privacyNoticeVersion: ROBOTICS_PRIVACY_NOTICE_VERSION,
    equipmentIdentifier: input.equipmentIdentifier.trim(),
    operatingStatus: input.operatingStatus?.trim() || 'synthetic/demo (simulated, not connected)',
    telemetry: normalizeTelemetry(input.telemetry ?? { status: 'missing', reason: 'No telemetry provided.', source: 'synthetic_demo' }),
    maintenanceHistory: input.maintenanceHistory?.length ? (input.maintenanceHistory as MaintenanceHistoryEntry[]) : [initialHistory],
    beforeImageReference: input.beforeImageReference?.trim() || null,
    diagnosisReference: input.diagnosisReference?.trim() || null,
    technicianActionMetadata: {
      actionTypes: input.technicianActionMetadata.actionTypes ?? [],
      summary: input.technicianActionMetadata.summary.trim(),
      performedByRole: input.technicianActionMetadata.performedByRole ?? 'technician_demo',
    },
    verificationOutcome: input.verificationOutcome ?? 'pending',
    afterImageReference: input.afterImageReference?.trim() || null,
    safetyDecision: asSafetyDecisionSummary(input.safetyDecision),
    notes: input.notes?.trim() || undefined,
  } as RoboticsTrajectoryRecord);
  await fs.writeFile(recordPath(record.id), JSON.stringify(record, null, 2), 'utf8');
  await upsertIndexEntry(record);
  return record;
}

export async function listRoboticsTrajectoryRecords(): Promise<RoboticsTrajectoryIndexEntry[]> {
  const index = await readIndex();
  return index.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
}

export async function getRoboticsTrajectoryRecord(id: string): Promise<RoboticsTrajectoryRecord | null> {
  try {
    const raw = await fs.readFile(recordPath(id), 'utf8');
    return normalizeRecord(JSON.parse(raw) as RoboticsTrajectoryRecord);
  } catch { return null; }
}

export async function updateRoboticsTrajectoryRecord(id: string, input: UpdateRoboticsTrajectoryInput): Promise<RoboticsTrajectoryRecord | null> {
  const existing = await getRoboticsTrajectoryRecord(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const next: RoboticsTrajectoryRecord = { ...existing, updatedAt: now };
  if (input.verificationOutcome !== undefined) next.verificationOutcome = input.verificationOutcome;
  if (input.notes !== undefined) next.notes = input.notes?.trim() || undefined;
  if (input.afterImageReference !== undefined) next.afterImageReference = input.afterImageReference?.trim() || null;
  if (input.safetyDecision !== undefined) next.safetyDecision = asSafetyDecisionSummary(input.safetyDecision);
  if (input.operatingStatus !== undefined) next.operatingStatus = input.operatingStatus?.trim() || existing.operatingStatus || null;
  if (input.telemetry !== undefined) next.telemetry = normalizeTelemetry(input.telemetry);
  const history = Array.isArray(next.maintenanceHistory) ? [...next.maintenanceHistory] : [];
  if (input.maintenanceAction) {
    history.push({
      at: now,
      summary: input.maintenanceAction.summary,
      verificationOutcome: input.maintenanceAction.verificationOutcome,
      notes: input.maintenanceAction.notes ?? null,
      safetyDecision: asSafetyDecisionSummary(input.maintenanceAction.safetyDecision),
      source: 'maintenance_update',
    });
    next.verificationOutcome = input.maintenanceAction.verificationOutcome;
    if (input.maintenanceAction.notes !== undefined) next.notes = input.maintenanceAction.notes?.trim() || next.notes;
  }
  next.maintenanceHistory = history;
  const normalized = normalizeRecord(next);
  await ensureDirs();
  await fs.writeFile(recordPath(id), JSON.stringify(normalized, null, 2), 'utf8');
  await upsertIndexEntry(normalized);
  return normalized;
}

export async function listFullRoboticsTrajectoryRecords(): Promise<RoboticsTrajectoryRecord[]> {
  const index = await listRoboticsTrajectoryRecords();
  const out: RoboticsTrajectoryRecord[] = [];
  for (const e of index) {
    const r = await getRoboticsTrajectoryRecord(e.id);
    if (r) out.push(r);
  }
  return out;
}
