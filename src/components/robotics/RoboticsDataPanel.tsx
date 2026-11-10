'use client';

import { useEffect, useMemo, useState } from 'react';

interface IndexEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sessionId?: string | null;
  dataLabel?: 'synthetic_demo' | 'real_consented';
  equipmentIdentifier: string;
  operatingStatus?: string | null;
  verificationOutcome: string;
  telemetryStatus?: string;
  syntheticDemo: boolean;
}

interface RoboticsTelemetry {
  status: 'available' | 'missing' | 'stale' | 'invalid';
  source?: string | null;
  observedAt?: string | null;
  reason?: string | null;
  values?: Record<string, number | string | boolean | null> | null;
}

interface MaintenanceHistoryEntry {
  at: string;
  summary: string;
  verificationOutcome: string;
  notes?: string | null;
  source?: string | null;
  safetyDecision?: { decision: string; reason?: string; safeNextAction?: string; safetyCritical?: boolean } | null;
}

interface RoboticsRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sessionId?: string | null;
  eventType?: string | null;
  dataLabel: 'synthetic_demo' | 'real_consented';
  syntheticDemo: boolean;
  consentAcknowledged: boolean;
  privacyNoticeVersion: string;
  equipmentIdentifier: string;
  operatingStatus?: string | null;
  telemetry?: RoboticsTelemetry;
  maintenanceHistory?: MaintenanceHistoryEntry[];
  beforeImageReference: string | null;
  diagnosisReference: string | null;
  technicianActionMetadata: { actionTypes: string[]; summary: string; performedByRole: string };
  verificationOutcome: string;
  afterImageReference: string | null;
  safetyDecision: { decision: string; reason: string; safeNextAction?: string; safetyCritical?: boolean } | null;
  notes?: string;
}

function telemetryMessage(t?: RoboticsTelemetry | null): string {
  if (!t) return 'Telemetry missing: no telemetry data available.';
  if (t.status === 'available') return 'Telemetry available (simulated/local).';
  if (t.status === 'stale') return `Telemetry stale${t.observedAt ? ` (observed ${t.observedAt})` : ''}: ${t.reason || 'data may be outdated.'}`;
  if (t.status === 'invalid') return `Telemetry malformed/invalid: ${t.reason || 'could not interpret telemetry payload.'}`;
  return `Telemetry missing: ${t.reason || 'no telemetry data available.'}`;
}

export function RoboticsDataPanel({ diagnosisReference, safetyDecisionSummary }: { diagnosisReference?: string | null; safetyDecisionSummary?: { decision: string; reason: string; safeNextAction?: string; safetyCritical?: boolean } | null }) {
  const [records, setRecords] = useState<IndexEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoboticsRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipmentIdentifier, setEquipmentIdentifier] = useState('SYNTH-DEMO-INVERTER-001');
  const [sessionId, setSessionId] = useState('');
  const [actionSummary, setActionSummary] = useState('Documented visual inspection on synthetic/de-energized demo equipment.');
  const [verificationOutcome, setVerificationOutcome] = useState<'pending' | 'issue_resolved' | 'issue_persists' | 'escalated' | 'unable_to_verify' | 'not_applicable'>('pending');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [updateSummary, setUpdateSummary] = useState('');
  const [updateOutcome, setUpdateOutcome] = useState<'pending' | 'issue_resolved' | 'issue_persists' | 'escalated' | 'unable_to_verify' | 'not_applicable'>('pending');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/robotics/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; record?: RoboticsRecord; error?: { message?: string } };
      if (!res.ok || !data.ok || !data.record) throw new Error(data.error?.message ?? `Failed to load record (${res.status})`);
      setDetail(data.record);
      setUpdateOutcome((data.record.verificationOutcome as typeof updateOutcome) || 'pending');
      setUpdateNotes(data.record.notes ?? '');
      setUpdateSummary('');
      setUpdateMessage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load record detail.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function refresh(selectId?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/robotics', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; records?: IndexEntry[]; error?: { message?: string } };
      if (!res.ok || !data.ok) throw new Error(data.error?.message ?? `Failed (${res.status})`);
      const next = Array.isArray(data.records) ? data.records : [];
      setRecords(next);
      const target = selectId ?? selectedId;
      if (target && next.some((r) => r.id === target)) {
        setSelectedId(target);
        await loadDetail(target);
      } else if (selectedId && !next.some((r) => r.id === selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refresh();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createRecord() {
    setError(null);
    try {
      const res = await fetch('/api/robotics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId.trim() || null,
          eventType: 'maintenance_record',
          dataLabel: 'synthetic_demo',
          equipmentIdentifier: equipmentIdentifier.trim(),
          operatingStatus: 'synthetic/demo (simulated, not connected)',
          telemetry: { status: 'missing', reason: 'No live telemetry attached (synthetic/demo).', source: 'synthetic_demo' },
          beforeImageReference: 'local-demo://before-image-ref',
          diagnosisReference: diagnosisReference ?? null,
          technicianActionMetadata: { actionTypes: ['visual_inspection', 'documentation'], summary: actionSummary, performedByRole: 'technician_demo' },
          verificationOutcome,
          afterImageReference: null,
          safetyDecision: safetyDecisionSummary ?? null,
          notes: notes.trim() || undefined,
          consentAcknowledged: consent,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; record?: RoboticsRecord; error?: { message?: string; details?: string[] } };
      if (!res.ok || !data.ok || !data.record) throw new Error(data.error?.message ?? `Failed (${res.status})${data.error?.details?.length ? `: ${data.error.details.join('; ')}` : ''}`);
      setNotes('');
      setConsent(false);
      await refresh(data.record.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create record.');
    }
  }

  async function applyUpdate() {
    if (!detail) return;
    if (!updateSummary.trim()) { setUpdateMessage('Maintenance summary is required for a supported update.'); return; }
    setUpdateBusy(true);
    setUpdateMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/robotics/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceAction: {
            summary: updateSummary.trim(),
            verificationOutcome: updateOutcome,
            notes: updateNotes.trim() || null,
            safetyDecision: safetyDecisionSummary ?? detail.safetyDecision ?? null,
          },
          afterImageReference: detail.afterImageReference ?? null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; record?: RoboticsRecord; error?: { message?: string; details?: string[] } };
      if (!res.ok || !data.ok || !data.record) throw new Error(data.error?.message ?? `Update failed (${res.status})${data.error?.details?.length ? `: ${data.error.details.join('; ')}` : ''}`);
      setDetail(data.record);
      setUpdateSummary('');
      setUpdateMessage('Maintenance update saved and confirmed from server state.');
      await refresh(detail.id);
    } catch (e) {
      setUpdateMessage(e instanceof Error ? e.message : 'Failed to apply maintenance update.');
    } finally {
      setUpdateBusy(false);
    }
  }

  const selectedIndex = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6" aria-labelledby="robotics-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Robotics maintenance workflow</p>
      <h2 id="robotics-heading" className="mt-1 text-xl font-semibold tracking-tight">Robot detail, telemetry, maintenance history (simulated/local)</h2>
      <p className="mt-2 text-sm leading-6 text-foreground/75">
        <strong>Simulated, not connected to physical hardware.</strong> This advisory prototype stores synthetic/local records only. <strong>No real robot movement, motors, actuators, or electrical-control commands</strong> are sent. Robotics recommendations do not override the deterministic safety gate.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Equipment identifier
          <input value={equipmentIdentifier} onChange={(e) => setEquipmentIdentifier(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">Session ID (optional)
          <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="text-sm sm:col-span-2">Action summary
          <input value={actionSummary} onChange={(e) => setActionSummary(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">Verification outcome
          <select value={verificationOutcome} onChange={(e) => setVerificationOutcome(e.target.value as typeof verificationOutcome)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <option value="pending">pending</option>
            <option value="issue_resolved">issue_resolved</option>
            <option value="issue_persists">issue_persists</option>
            <option value="unable_to_verify">unable_to_verify</option>
            <option value="escalated">escalated</option>
            <option value="not_applicable">not_applicable</option>
          </select>
        </label>
        <label className="text-sm">Notes (optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>I acknowledge this is synthetic/local demo data and no physical robot commands are sent.</span>
      </label>
      {error ? <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-950">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={createRecord} disabled={!consent || loading} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Create synthetic record</button>
        <button type="button" onClick={() => refresh()} disabled={loading} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">{loading ? 'Loading…' : 'Refresh list'}</button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <h3 className="text-sm font-semibold">Robotics records</h3>
          {loading && records.length === 0 ? <p className="mt-2 text-sm">Loading records…</p> : null}
          {!loading && records.length === 0 ? <p className="mt-2 text-sm text-foreground/65">No robotics records yet. Create a synthetic record or refresh to load persisted records.</p> : null}
          {records.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {records.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => { setSelectedId(r.id); void loadDetail(r.id); }} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === r.id ? 'border-brand bg-white' : 'border-border bg-white/70'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground/60">{r.id.slice(0, 8)}</span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px]">{r.telemetryStatus ?? 'unknown'}</span>
                    </div>
                    <p className="mt-1 font-medium">{r.equipmentIdentifier}</p>
                    <p className="text-xs text-foreground/70">Status: {r.operatingStatus || 'synthetic/demo'} · Outcome: {r.verificationOutcome}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold">Selected robot detail</h3>
          {!selectedIndex && !detail ? <p className="mt-2 text-sm text-foreground/65">Select a robot/equipment record to view detail, telemetry, and maintenance history.</p> : null}
          {detailLoading ? <p className="mt-2 text-sm">Loading detail…</p> : null}
          {detail ? (
            <div className="mt-2 space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><strong>Record ID:</strong> <span className="font-mono text-xs">{detail.id}</span></p>
                <p><strong>Equipment:</strong> {detail.equipmentIdentifier}</p>
                <p><strong>Operating status:</strong> {detail.operatingStatus || 'synthetic/demo (simulated, not connected)'}</p>
                <p><strong>Verification:</strong> {detail.verificationOutcome}</p>
                <p><strong>Updated:</strong> {detail.updatedAt || detail.createdAt}</p>
                <p><strong>Data label:</strong> {detail.dataLabel} (simulated/not connected)</p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">Telemetry (advisory)</p>
                <p className="mt-1">{telemetryMessage(detail.telemetry)}</p>
                <p className="mt-1 text-xs text-foreground/70">Source: {detail.telemetry?.source || 'unknown'}{detail.telemetry?.observedAt ? ` · Observed: ${detail.telemetry.observedAt}` : ''}</p>
                {detail.telemetry?.status === 'available' && detail.telemetry.values ? (
                  <pre className="mt-2 overflow-auto rounded bg-white p-2 text-xs">{JSON.stringify(detail.telemetry.values, null, 2)}</pre>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">Maintenance history (persisted)</p>
                {Array.isArray(detail.maintenanceHistory) && detail.maintenanceHistory.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {detail.maintenanceHistory.map((h, i) => (
                      <li key={`${h.at}-${i}`} className="rounded border border-border bg-white p-2">
                        <p><strong>{h.verificationOutcome}</strong> · {h.at}</p>
                        <p>{h.summary}</p>
                        {h.notes ? <p className="text-xs text-foreground/70">Notes: {h.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1">No maintenance history entries.</p>}
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/60">Supported maintenance update</p>
                <p className="mt-1 text-xs text-foreground/70">Updates are validated and persisted via API. No physical robot commands are sent.</p>
                <label className="mt-2 block text-sm">Maintenance summary
                  <input value={updateSummary} onChange={(e) => setUpdateSummary(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Describe maintenance action (advisory/log only)" />
                </label>
                <label className="mt-2 block text-sm">Outcome
                  <select value={updateOutcome} onChange={(e) => setUpdateOutcome(e.target.value as typeof updateOutcome)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                    <option value="pending">pending</option>
                    <option value="issue_resolved">issue_resolved</option>
                    <option value="issue_persists">issue_persists</option>
                    <option value="unable_to_verify">unable_to_verify</option>
                    <option value="escalated">escalated</option>
                    <option value="not_applicable">not_applicable</option>
                  </select>
                </label>
                <label className="mt-2 block text-sm">Update notes
                  <textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" />
                </label>
                {updateMessage ? <p className="mt-2 text-sm">{updateMessage}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={applyUpdate} disabled={updateBusy} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{updateBusy ? 'Saving…' : 'Apply maintenance update'}</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { window.location.href = `/api/robotics/export?format=json&id=${encodeURIComponent(detail.id)}`; }} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">Export this record (JSON)</button>
                <button type="button" onClick={() => { window.location.href = `/api/robotics/export?format=csv&id=${encodeURIComponent(detail.id)}`; }} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">Export this record (CSV)</button>
                <button type="button" onClick={() => { window.location.href = `/api/robotics/export?format=json&equipmentIdentifier=${encodeURIComponent(detail.equipmentIdentifier)}`; }} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">Export equipment records (JSON)</button>
                <button type="button" onClick={() => { window.location.href = `/api/robotics/export?format=csv&equipmentIdentifier=${encodeURIComponent(detail.equipmentIdentifier)}`; }} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">Export equipment records (CSV)</button>
              </div>

              <p className="text-xs text-foreground/60">Safety: robotics recommendations do not override the deterministic safety gate. Hardware is simulated/not connected; no physical commands are sent.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
