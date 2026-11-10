/**
 * Safety-preserving client-side maintenance draft queue foundation.
 *
 * IMPORTANT SAFETY RULES:
 * - Stores local draft notes/snapshots only. It never stores or mutates safety gate decisions.
 * - Never marks repairs `verified_resolved`, never bypasses deterministic safety checks,
 *   and never creates server-side verification state automatically.
 * - Sync is intended to be explicit/user-controlled and must only target non-safety-critical
 *   draft text via existing guarded APIs. Automatic background sync is intentionally not
 *   implemented here.
 * - This module has no network side effects.
 *
 * Reliability notes (best-effort on top of localStorage):
 * - Parse/storage errors are surfaced; corrupted payloads are not blindly overwritten on normal writes.
 * - Queue capacity prefers keeping unsynced drafts; enqueue fails explicitly if no safe space exists.
 * - Cross-tab writes can still race (localStorage last-write-wins); callers should refresh from storage events.
 */

export type DraftSyncState = 'pending' | 'sync_failed' | 'conflict' | 'synced';

export interface MaintenanceDraftNote {
  kind: 'maintenance_draft_note';
  localId: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  syncState: DraftSyncState;
  /** Optional target maintenance record (ordinary notes sync only). */
  recordId?: string;
  /** Record updatedAt used for conflict detection; never authoritative safety state. */
  baseRecordUpdatedAt?: string;
  /** Local context only; never authoritative safety state. */
  payload: {
    maintenanceRecordId?: string;
    problemDescription?: string;
    technicianNotesDraft?: string;
    repairStepDraft?: string;
    evidenceNoteDraft?: string;
    /** Explicit label for UI/docs; not a server status. */
    draftLabel: 'local_unsynced_draft';
  };
  lastError?: string;
  lastAttemptAt?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export class MaintenanceDraftQueueError extends Error {
  readonly code: 'STORAGE_CORRUPT' | 'STORAGE_WRITE_FAILED' | 'QUEUE_FULL';
  constructor(code: MaintenanceDraftQueueError['code'], message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.name = 'MaintenanceDraftQueueError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export const MAINTENANCE_DRAFT_QUEUE_KEY = 'kriyaos.maintenanceDraftQueue.v1';
export const MAX_DRAFTS = 100;

function nowIso() {
  return new Date().toISOString();
}

function isValidDraft(x: unknown): x is MaintenanceDraftNote {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<MaintenanceDraftNote>;
  return o.kind === 'maintenance_draft_note' && typeof o.localId === 'string' && typeof o.idempotencyKey === 'string';
}

function sortDrafts(drafts: MaintenanceDraftNote[]): MaintenanceDraftNote[] {
  return [...drafts].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function safeParseQueue(raw: string | null): { drafts: MaintenanceDraftNote[]; corrupt: boolean } {
  if (!raw) return { drafts: [], corrupt: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { drafts: [], corrupt: true };
    const drafts = parsed.filter(isValidDraft);
    // If array had elements but none valid, treat as corrupt to avoid silent data loss.
    return { drafts, corrupt: parsed.length > 0 && drafts.length === 0 };
  } catch {
    return { drafts: [], corrupt: true };
  }
}

function readQueueRaw(storage: StorageLike): string | null {
  return storage.getItem(MAINTENANCE_DRAFT_QUEUE_KEY);
}

export function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: StorageLike }).localStorage) {
    return (globalThis as { localStorage: StorageLike }).localStorage;
  }
  return null;
}

/** Best-effort list. Corrupted storage returns [] and records a console warning; it does not overwrite storage. */
export function listMaintenanceDrafts(storage?: StorageLike): MaintenanceDraftNote[] {
  const s = getStorage(storage);
  if (!s) return [];
  const { drafts, corrupt } = safeParseQueue(readQueueRaw(s));
  if (corrupt && typeof console !== 'undefined') console.warn('maintenanceDraftQueue: stored queue appears corrupted; preserving raw storage until repaired.');
  return sortDrafts(drafts);
}

export function getMaintenanceDraftsReadStatus(storage?: StorageLike): { drafts: MaintenanceDraftNote[]; corrupt: boolean } {
  const s = getStorage(storage);
  if (!s) return { drafts: [], corrupt: false };
  const { drafts, corrupt } = safeParseQueue(readQueueRaw(s));
  return { drafts: sortDrafts(drafts), corrupt };
}

function trimToCapacity(drafts: MaintenanceDraftNote[]): MaintenanceDraftNote[] {
  if (drafts.length <= MAX_DRAFTS) return drafts;
  const sorted = sortDrafts(drafts);
  const unsynced = sorted.filter((d) => d.syncState !== 'synced');
  const synced = sorted.filter((d) => d.syncState === 'synced');
  if (unsynced.length >= MAX_DRAFTS) return unsynced.slice(0, MAX_DRAFTS);
  return [...unsynced, ...synced].slice(0, MAX_DRAFTS);
}

/**
 * Save drafts. Throws on corrupt storage or write failure.
 * IMPORTANT: writes the provided list as the authoritative state for this operation
 * (after capacity trimming). A cross-tab merge that resurrects explicit removals would
 * lose user intent; cross-tab last-write-wins races remain possible at the storage layer.
 */
export function saveMaintenanceDrafts(drafts: MaintenanceDraftNote[], storage?: StorageLike): void {
  const s = getStorage(storage);
  if (!s) return;
  const raw = readQueueRaw(s);
  const parsed = safeParseQueue(raw);
  if (parsed.corrupt) {
    throw new MaintenanceDraftQueueError('STORAGE_CORRUPT', 'Local draft storage is corrupted; refusing to overwrite it automatically. Export/clear corrupted storage manually if needed.');
  }
  try {
    s.setItem(MAINTENANCE_DRAFT_QUEUE_KEY, JSON.stringify(trimToCapacity(sortDrafts(drafts.filter(isValidDraft)))));
  } catch (e) {
    throw new MaintenanceDraftQueueError('STORAGE_WRITE_FAILED', 'Failed to save local drafts (storage may be full or unavailable). Draft was not safely persisted.', e);
  }
}

export function enqueueMaintenanceDraft(
  input: Omit<MaintenanceDraftNote, 'kind' | 'localId' | 'idempotencyKey' | 'createdAt' | 'updatedAt' | 'syncState'> & {
    localId?: string;
    idempotencyKey?: string;
    payload: MaintenanceDraftNote['payload'];
  },
  storage?: StorageLike,
): MaintenanceDraftNote {
  const drafts = listMaintenanceDrafts(storage);
  const ts = nowIso();
  const localId = input.localId ?? `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const idempotencyKey = input.idempotencyKey ?? `draft-idem-${localId}`;
  const existing = drafts.find((d) => d.idempotencyKey === idempotencyKey);
  if (existing) {
    const updated: MaintenanceDraftNote = {
      ...existing,
      ...input,
      recordId: input.recordId ?? input.payload.maintenanceRecordId ?? existing.recordId,
      baseRecordUpdatedAt: input.baseRecordUpdatedAt ?? existing.baseRecordUpdatedAt,
      kind: 'maintenance_draft_note',
      localId: existing.localId,
      idempotencyKey: existing.idempotencyKey,
      updatedAt: ts,
      syncState: existing.syncState === 'synced' ? 'pending' : existing.syncState === 'conflict' ? 'conflict' : 'pending',
      lastError: undefined,
      payload: { ...input.payload, draftLabel: 'local_unsynced_draft' },
    };
    saveMaintenanceDrafts([updated, ...drafts.filter((d) => d.localId !== existing.localId)], storage);
    return updated;
  }
  const unsyncedCount = drafts.filter((d) => d.syncState !== 'synced').length;
  if (drafts.length >= MAX_DRAFTS && unsyncedCount >= MAX_DRAFTS) {
    throw new MaintenanceDraftQueueError('QUEUE_FULL', 'Local draft queue is full of unsynced drafts. Sync or remove drafts before adding more.');
  }
  const draft: MaintenanceDraftNote = {
    kind: 'maintenance_draft_note',
    localId,
    idempotencyKey,
    createdAt: ts,
    updatedAt: ts,
    syncState: 'pending',
    recordId: input.recordId ?? input.payload.maintenanceRecordId,
    baseRecordUpdatedAt: input.baseRecordUpdatedAt,
    payload: { ...input.payload, draftLabel: 'local_unsynced_draft' },
  };
  saveMaintenanceDrafts([draft, ...drafts], storage);
  return draft;
}

export function updateDraftSyncState(
  localId: string,
  patch: Partial<Pick<MaintenanceDraftNote, 'syncState' | 'lastError' | 'lastAttemptAt' | 'updatedAt' | 'baseRecordUpdatedAt' | 'recordId'>>,
  storage?: StorageLike,
): MaintenanceDraftNote | null {
  const drafts = listMaintenanceDrafts(storage);
  const idx = drafts.findIndex((d) => d.localId === localId);
  if (idx < 0) return null;
  const updated: MaintenanceDraftNote = { ...drafts[idx], ...patch, updatedAt: patch.updatedAt ?? nowIso() };
  drafts[idx] = updated;
  saveMaintenanceDrafts(drafts, storage);
  return updated;
}

export function updateMaintenanceDraftContent(
  localId: string,
  text: string,
  storage?: StorageLike,
): MaintenanceDraftNote | null {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Draft note text is required.');
  }
  const drafts = listMaintenanceDrafts(storage);
  const idx = drafts.findIndex((d) => d.localId === localId);
  if (idx < 0) return null;
  const prev = drafts[idx];
  const shouldResetState = prev.syncState === 'sync_failed' || prev.syncState === 'conflict' || prev.syncState === 'synced';
  const updated: MaintenanceDraftNote = {
    ...prev,
    payload: { ...prev.payload, technicianNotesDraft: trimmed, draftLabel: 'local_unsynced_draft' },
    syncState: shouldResetState ? 'pending' : prev.syncState,
    lastError: undefined,
    updatedAt: nowIso(),
  };
  drafts[idx] = updated;
  saveMaintenanceDrafts(drafts, storage);
  return updated;
}

export function removeMaintenanceDraft(localId: string, storage?: StorageLike): void {
  saveMaintenanceDrafts(listMaintenanceDrafts(storage).filter((d) => d.localId !== localId), storage);
}

export function queueSummary(storage?: StorageLike): { total: number; pending: number; failed: number; conflict: number; synced: number } {
  const drafts = listMaintenanceDrafts(storage);
  return {
    total: drafts.length,
    pending: drafts.filter((d) => d.syncState === 'pending').length,
    failed: drafts.filter((d) => d.syncState === 'sync_failed').length,
    conflict: drafts.filter((d) => d.syncState === 'conflict').length,
    synced: drafts.filter((d) => d.syncState === 'synced').length,
  };
}
