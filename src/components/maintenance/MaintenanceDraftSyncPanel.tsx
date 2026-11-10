'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  enqueueMaintenanceDraft,
  getMaintenanceDraftsReadStatus,
  listMaintenanceDrafts,
  removeMaintenanceDraft,
  updateDraftSyncState,
  updateMaintenanceDraftContent,
  type MaintenanceDraftNote,
} from '@/lib/offline/maintenanceDraftQueue';
import type { MaintenanceRecord } from '@/modules/maintenance/types';

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function summaryFromDrafts(drafts: MaintenanceDraftNote[]) {
  return {
    total: drafts.length,
    pending: drafts.filter((d) => d.syncState === 'pending').length,
    failed: drafts.filter((d) => d.syncState === 'sync_failed').length,
    conflict: drafts.filter((d) => d.syncState === 'conflict').length,
    synced: drafts.filter((d) => d.syncState === 'synced').length,
  };
}

export function MaintenanceDraftSyncPanel({ record, onSynced }: { record: MaintenanceRecord | null; onSynced?: (recordId: string) => void | Promise<void> }) {
  const [drafts, setDrafts] = useState<MaintenanceDraftNote[]>(() => (typeof window === 'undefined' ? [] : listMaintenanceDrafts()));
  const [storageCorrupt, setStorageCorrupt] = useState(false);
  const [text, setText] = useState('');
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(isOnline());

  const refresh = useCallback(() => {
    const status = getMaintenanceDraftsReadStatus();
    setDrafts(status.drafts);
    setStorageCorrupt(status.corrupt);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onStorage = () => refresh();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('storage', onStorage);
    // Refresh once on mount (client-side authoritative); initial state is best-effort for hydration.
    queueMicrotask(refresh);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  const relevant = useMemo(
    () => drafts.filter((d) => !record || !d.recordId || d.recordId === record.id),
    [drafts, record],
  );
  const summary = useMemo(() => summaryFromDrafts(drafts), [drafts]);

  function saveLocalDraft() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!record) {
      setMessage('Select/create a maintenance record before saving a syncable draft note.');
      return;
    }
    try {
      if (editingLocalId) {
        updateMaintenanceDraftContent(editingLocalId, trimmed);
        setText('');
        setEditingLocalId(null);
        setMessage('Local draft updated (pending explicit sync). Local identity retained; text was preserved until save completed. No server safety/verification state modified.');
      } else {
        enqueueMaintenanceDraft({
          recordId: record.id,
          baseRecordUpdatedAt: record.updatedAt,
          payload: {
            maintenanceRecordId: record.id,
            technicianNotesDraft: trimmed,
            draftLabel: 'local_unsynced_draft',
          },
        });
        setText('');
        setMessage('Draft saved locally (not synced). Safety/verification state is not modified. Your text was preserved until save completed.');
      }
    } catch (e) {
      // Preserve textarea content on storage/quota/corruption errors.
      setMessage(e instanceof Error ? `Local save failed: ${e.message} Your draft text is still in the editor.` : 'Local save failed. Your draft text is still in the editor.');
    }
    refresh();
  }

  async function syncDraft(draft: MaintenanceDraftNote) {
    if (!draft.recordId || !draft.payload.technicianNotesDraft?.trim()) {
      try { updateDraftSyncState(draft.localId, { syncState: 'sync_failed', lastError: 'Draft has no target record or note text.' }); } catch { /* keep state best-effort */ }
      refresh();
      return;
    }
    const offlineNow = (typeof navigator !== 'undefined' && navigator.onLine === false) || !online;
    if (offlineNow) {
      try { updateDraftSyncState(draft.localId, { syncState: 'sync_failed', lastError: 'Offline: cannot sync now. Draft kept locally; retry when reconnected.' }); } catch { /* ignore */ }
      setMessage('Offline: draft was not sent. It remains saved locally; sync explicitly after reconnecting.');
      refresh();
      return;
    }
    setBusy(draft.localId);
    setMessage(null);
    try { updateDraftSyncState(draft.localId, { lastAttemptAt: new Date().toISOString() }); } catch { /* non-fatal */ }
    try {
      const res = await fetch(`/api/maintenance/${encodeURIComponent(draft.recordId)}/draft-notes/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: draft.idempotencyKey,
          draftText: draft.payload.technicianNotesDraft,
          baseRecordUpdatedAt: draft.baseRecordUpdatedAt,
          mode: 'replace',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: { code?: string; message?: string; serverUpdatedAt?: string } };
      if (res.status === 401 || data.error?.code === 'AUTH_REQUIRED') {
        updateDraftSyncState(draft.localId, { syncState: 'sync_failed', lastError: 'Authentication required. Sign in and retry sync (draft kept locally).' });
        setMessage('Authentication required. Draft kept locally; no server safety/verification state changed.');
      } else if (res.status === 409 || data.error?.code === 'DRAFT_CONFLICT') {
        updateDraftSyncState(draft.localId, { syncState: 'conflict', lastError: `Conflict: server updated${data.error?.serverUpdatedAt ? ` at ${data.error.serverUpdatedAt}` : ''}. Resolve explicitly.` });
        setMessage('Conflict detected. Your local text is preserved below. Review differences, then keep local+update base and sync, keep server (remove local), or edit locally.');
      } else if (!res.ok || !data.ok) {
        updateDraftSyncState(draft.localId, { syncState: 'sync_failed', lastError: data.error?.message || `Sync failed (${res.status}).` });
        setMessage(data.error?.message || 'Sync failed. Draft kept locally.');
      } else {
        updateDraftSyncState(draft.localId, { syncState: 'synced', lastError: undefined });
        setMessage('Draft synced as ordinary technician notes (explicit user action). No safety/verification state modified. Refreshing confirmed server state…');
        try {
          if (onSynced && draft.recordId) {
            await onSynced(draft.recordId);
          }
          setMessage('Draft synced as ordinary technician notes (explicit user action). UI refreshed from confirmed server state. No safety/verification state modified.');
        } catch {
          setMessage('Draft synced on server (confirmed). Local UI could not fully refresh; use Refresh to load confirmed server state. No safety/verification state modified.');
        }
      }
    } catch (e) {
      const offlineErr = (typeof navigator !== 'undefined' && navigator.onLine === false) || !online;
      try { updateDraftSyncState(draft.localId, { syncState: 'sync_failed', lastError: offlineErr ? 'Offline/network error. Draft kept locally; retry after reconnecting.' : (e instanceof Error ? e.message : 'Network/sync error.') }); } catch { /* preserve in-memory best-effort */ }
      setMessage(offlineErr ? 'Offline/network error. Draft kept locally; retry after reconnecting.' : 'Sync error. Draft kept locally; retry when ready.');
    } finally {
      setBusy(null);
      refresh();
    }
  }

  function keepLocalUpdateBase(draft: MaintenanceDraftNote) {
    if (!record) return;
    try {
      updateDraftSyncState(draft.localId, { syncState: 'pending', baseRecordUpdatedAt: record.updatedAt, lastError: undefined });
      setMessage('Draft base updated to current server record version. Review text before syncing explicitly.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not update draft state.');
    }
    refresh();
  }

  function keepServerRemoveLocal(draft: MaintenanceDraftNote) {
    try {
      removeMaintenanceDraft(draft.localId);
      if (editingLocalId === draft.localId) {
        setEditingLocalId(null);
        setText('');
      }
      setMessage('Local draft removed. Server notes kept unchanged. No safety/verification state modified.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not remove local draft.');
    }
    refresh();
  }

  function editDraftLocally(draft: MaintenanceDraftNote) {
    setText(draft.payload.technicianNotesDraft || '');
    setEditingLocalId(draft.localId);
    setMessage('Editing existing local draft. Saving will update this draft in place (pending explicit sync).');
  }

  function cancelEdit() {
    setEditingLocalId(null);
    setText('');
    setMessage('Edit cancelled. Existing local draft unchanged.');
  }

  return (
    <section className="rounded-2xl border border-border p-4" aria-labelledby="draft-sync-heading">
      <h3 id="draft-sync-heading" className="text-sm font-semibold">Offline draft notes &amp; explicit sync (non-safety)</h3>
      <p className="mt-1 text-xs text-foreground/65">
        Local draft notes only. <strong>Never</strong> syncs/modifies safety gate decisions, isolation/safe-to-touch status, <code>verified_resolved</code>, authorization, or safety-critical actions. Sync is explicit/user-triggered and updates only ordinary technician notes on an existing record.
      </p>
      <p className="mt-1 text-[11px] text-foreground/60">
        Network: <strong>{online ? 'online' : 'offline'}</strong> · Queue: {summary.total} total ({summary.pending} pending, {summary.failed} failed, {summary.conflict} conflict, {summary.synced} synced)
      </p>
      {storageCorrupt ? <p className="mt-1 text-[11px] text-red-800">Local draft storage appears corrupted. Existing raw storage is not overwritten automatically; export/repair storage carefully to avoid losing drafts.</p> : null}
      {record ? (
        <div className="mt-2 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ordinary technician note draft (saved locally; not a safety decision)" className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" rows={3} maxLength={4000} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveLocalDraft} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium">{editingLocalId ? 'Save changes to local draft' : 'Save local draft'}</button>
            {editingLocalId ? <button type="button" onClick={cancelEdit} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium">Cancel edit</button> : null}
            <button type="button" onClick={refresh} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium">Refresh queue</button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-foreground/65">Select a maintenance record to save/sync record-targeted note drafts.</p>
      )}
      {message ? <p className="mt-2 text-xs text-foreground/80">{message}</p> : null}
      <ul className="mt-3 space-y-2">
        {relevant.slice(0, 20).map((d) => (
          <li key={d.localId} className="rounded-xl border border-border bg-surface-muted p-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{d.syncState}</span>
              <span className="text-foreground/55">{d.recordId ? `record ${d.recordId.slice(0, 8)}…` : 'no record'}</span>
              {busy === d.localId ? <span className="text-foreground/70">syncing…</span> : null}
              {d.lastError ? <span className="text-red-800">{d.lastError}</span> : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{(d.payload.technicianNotesDraft || '').slice(0, 240) || '(no note text)'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={busy === d.localId || !d.recordId} onClick={() => syncDraft(d)} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] disabled:opacity-60">{busy === d.localId ? 'Syncing…' : 'Sync now (explicit)'}</button>
              {d.syncState === 'conflict' && record ? <button type="button" onClick={() => keepLocalUpdateBase(d)} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px]">Keep local, update base</button> : null}
              {d.syncState === 'conflict' ? <button type="button" onClick={() => keepServerRemoveLocal(d)} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px]">Keep server, remove local</button> : null}
              <button type="button" onClick={() => editDraftLocally(d)} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px]">Edit locally</button>
              <button type="button" onClick={() => { try { removeMaintenanceDraft(d.localId); if (editingLocalId === d.localId) cancelEdit(); } catch { /* ignore */ } refresh(); }} className="rounded-full border border-border bg-surface px-3 py-1 text-[11px]">Remove local draft</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
