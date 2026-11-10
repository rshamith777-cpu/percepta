import { describe, expect, it } from 'vitest';
import {
  enqueueMaintenanceDraft,
  getMaintenanceDraftsReadStatus,
  listMaintenanceDrafts,
  queueSummary,
  removeMaintenanceDraft,
  updateDraftSyncState,
  updateMaintenanceDraftContent,
  MAINTENANCE_DRAFT_QUEUE_KEY,
  MAX_DRAFTS,
  MaintenanceDraftQueueError,
  type StorageLike,
} from './maintenanceDraftQueue';

function memoryStorage(initial?: Record<string, string>): StorageLike {
  const m = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function throwingStorage(error: Error): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: () => { throw error; },
    removeItem: (k) => void m.delete(k),
  };
}

describe('maintenanceDraftQueue (safety-preserving local drafts)', () => {
  it('enqueues drafts with explicit local_unsynced_draft label and pending state', () => {
    const s = memoryStorage();
    const d = enqueueMaintenanceDraft({ payload: { technicianNotesDraft: 'Checked terminals', draftLabel: 'local_unsynced_draft' } }, s);
    expect(d.kind).toBe('maintenance_draft_note');
    expect(d.syncState).toBe('pending');
    expect(d.payload.draftLabel).toBe('local_unsynced_draft');
    expect(listMaintenanceDrafts(s)).toHaveLength(1);
  });

  it('deduplicates by idempotency key without creating server/safety state', () => {
    const s = memoryStorage();
    const a = enqueueMaintenanceDraft({ idempotencyKey: 'idem-1', payload: { repairStepDraft: 'step1', draftLabel: 'local_unsynced_draft' } }, s);
    const b = enqueueMaintenanceDraft({ idempotencyKey: 'idem-1', payload: { repairStepDraft: 'step1 updated', draftLabel: 'local_unsynced_draft' } }, s);
    expect(b.localId).toBe(a.localId);
    expect(b.payload.repairStepDraft).toBe('step1 updated');
    expect(listMaintenanceDrafts(s)).toHaveLength(1);
  });

  it('tracks failed/conflict states and summary counts', () => {
    const s = memoryStorage();
    const d = enqueueMaintenanceDraft({ payload: { evidenceNoteDraft: 'photo ref', draftLabel: 'local_unsynced_draft' } }, s);
    updateDraftSyncState(d.localId, { syncState: 'sync_failed', lastError: 'offline' }, s);
    expect(queueSummary(s)).toMatchObject({ total: 1, failed: 1, pending: 0 });
    updateDraftSyncState(d.localId, { syncState: 'conflict', lastError: 'server conflict' }, s);
    expect(queueSummary(s).conflict).toBe(1);
    removeMaintenanceDraft(d.localId, s);
    expect(queueSummary(s).total).toBe(0);
  });

  it('detects corrupted storage and refuses to overwrite it on save', () => {
    const s = memoryStorage({ [MAINTENANCE_DRAFT_QUEUE_KEY]: '{not json' });
    const status = getMaintenanceDraftsReadStatus(s);
    expect(status.corrupt).toBe(true);
    expect(status.drafts).toHaveLength(0);
    expect(() => enqueueMaintenanceDraft({ payload: { technicianNotesDraft: 'x', draftLabel: 'local_unsynced_draft' } }, s)).toThrow(MaintenanceDraftQueueError);
  });

  it('surfaces storage write/quota failures without claiming success', () => {
    const s = throwingStorage(new Error('QuotaExceededError'));
    expect(() => enqueueMaintenanceDraft({ payload: { technicianNotesDraft: 'x', draftLabel: 'local_unsynced_draft' } }, s)).toThrow(/not safely persisted|Failed to save/i);
  });

  it('does not silently discard unsynced drafts when queue is full of unsynced work', () => {
    const drafts = Array.from({ length: MAX_DRAFTS }, (_, i) => ({
      kind: 'maintenance_draft_note' as const,
      localId: `d${i}`,
      idempotencyKey: `k${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date(Date.now() + i).toISOString(),
      syncState: 'pending' as const,
      payload: { draftLabel: 'local_unsynced_draft' as const, technicianNotesDraft: `n${i}` },
    }));
    const s = memoryStorage({ [MAINTENANCE_DRAFT_QUEUE_KEY]: JSON.stringify(drafts) });
    expect(() => enqueueMaintenanceDraft({ idempotencyKey: 'new', payload: { technicianNotesDraft: 'new', draftLabel: 'local_unsynced_draft' } }, s)).toThrow(/full of unsynced drafts/i);
    expect(listMaintenanceDrafts(s)).toHaveLength(MAX_DRAFTS);
  });

  it('successful/explicit state changes affect only the matching draft', () => {
    const s = memoryStorage();
    const a = enqueueMaintenanceDraft({ idempotencyKey: 'a', payload: { technicianNotesDraft: 'A', draftLabel: 'local_unsynced_draft' } }, s);
    const b = enqueueMaintenanceDraft({ idempotencyKey: 'b', payload: { technicianNotesDraft: 'B', draftLabel: 'local_unsynced_draft' } }, s);
    updateDraftSyncState(a.localId, { syncState: 'synced' }, s);
    const list = listMaintenanceDrafts(s);
    expect(list.find((d) => d.localId === a.localId)?.syncState).toBe('synced');
    expect(list.find((d) => d.localId === b.localId)?.syncState).toBe('pending');
  });

  it('save trims by preferring unsynced drafts (best effort capacity)', () => {
    const synced = Array.from({ length: MAX_DRAFTS - 1 }, (_, i) => ({
      kind: 'maintenance_draft_note' as const, localId: `s${i}`, idempotencyKey: `sk${i}`, createdAt: '', updatedAt: new Date(Date.now() + i).toISOString(), syncState: 'synced' as const,
      payload: { draftLabel: 'local_unsynced_draft' as const, technicianNotesDraft: `s${i}` },
    }));
    const pending = [{ kind: 'maintenance_draft_note' as const, localId: 'p1', idempotencyKey: 'pk1', createdAt: '', updatedAt: new Date().toISOString(), syncState: 'pending' as const, payload: { draftLabel: 'local_unsynced_draft' as const, technicianNotesDraft: 'p1' } }];
    const s = memoryStorage({ [MAINTENANCE_DRAFT_QUEUE_KEY]: JSON.stringify([...pending, ...synced]) });
    enqueueMaintenanceDraft({ idempotencyKey: 'p2', payload: { technicianNotesDraft: 'p2', draftLabel: 'local_unsynced_draft' } }, s);
    const after = listMaintenanceDrafts(s);
    expect(after.some((d) => d.idempotencyKey === 'pk1')).toBe(true);
    expect(after.some((d) => d.idempotencyKey === 'p2')).toBe(true);
  });


  it('updates draft content in place and resets failed/conflict state to pending for explicit retry', () => {
    const s = memoryStorage();
    const d = enqueueMaintenanceDraft({ idempotencyKey: 'idem-edit', payload: { technicianNotesDraft: 'v1', draftLabel: 'local_unsynced_draft' } }, s);
    updateDraftSyncState(d.localId, { syncState: 'sync_failed', lastError: 'network' }, s);
    const edited = updateMaintenanceDraftContent(d.localId, 'v2 edited', s);
    expect(edited?.localId).toBe(d.localId);
    expect(edited?.idempotencyKey).toBe('idem-edit');
    expect(edited?.payload.technicianNotesDraft).toBe('v2 edited');
    expect(edited?.syncState).toBe('pending');
    expect(edited?.lastError).toBeUndefined();
    expect(listMaintenanceDrafts(s)).toHaveLength(1);
  });

});
