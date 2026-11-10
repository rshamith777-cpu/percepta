'use client';

function fmtDate(iso: string): string { try { return new Date(iso).toISOString().replace('T',' ').slice(0,16) + ' UTC'; } catch { return iso; } }


import { useEffect, useState } from 'react';
import type { DiagnosisResult } from '@/types/diagnosis';
import type { SafetyDecision } from '@/types';
import { defaultVerificationChecklist } from '@/modules/maintenance/lifecycle';
import type { MaintenanceRecord, VerificationOutcome } from '@/modules/maintenance/types';
import { MaintenanceDraftSyncPanel } from './MaintenanceDraftSyncPanel';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error: { message: string; details?: string[] } };

function statusLabel(s: MaintenanceRecord['status']): string {
  return s.replaceAll('_', ' ');
}

function isTerminal(s: MaintenanceRecord['status']): boolean {
  return s === 'escalated_requires_qualified_technician';
}

export function MaintenancePanel({
  diagnosisContext,
}: {
  diagnosisContext: {
    problemDescription: string;
    diagnosis: DiagnosisResult | null;
    model?: string;
    safetyDecision: SafetyDecision | null;
    blockedEscalation: string | null;
  } | null;
}) {
  const [records, setRecords] = useState<Array<{ id: string; status: string; updatedAt: string; problemDescription: string; diagnosisBlocked: boolean }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  // repair attempt form
  const [repairActionsText, setRepairActionsText] = useState('');
  const [partsText, setPartsText] = useState('');
  const [notes, setNotes] = useState('');
  const [moveToAwaiting, setMoveToAwaiting] = useState(true);

  // verification form
  const [outcome, setOutcome] = useState<VerificationOutcome>('issue_persists');
  const [checklist, setChecklist] = useState(defaultVerificationChecklist());
  const [evidence, setEvidence] = useState('');
  const [confirmResolved, setConfirmResolved] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  async function refreshList(selectId?: string | null) {
    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' });
      const payload = (await res.json()) as ApiOk<{ records: Array<{ id: string; status: string; updatedAt: string; problemDescription: string; diagnosisBlocked: boolean }> }> | ApiErr;
      if (!res.ok || !payload.ok) return;
      setRecords(payload.records);
      if (selectId) setSelectedId(selectId);
    } catch { /* keep UI usable */ }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        const payload = (await res.json()) as ApiOk<{ records: Array<{ id: string; status: string; updatedAt: string; problemDescription: string; diagnosisBlocked: boolean }> }> | ApiErr;
        if (active && res.ok && payload.ok) setRecords(payload.records);
      } catch { /* keep UI usable */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    (async () => {
      setLoading(true); setError(null); setErrorDetails([]);
      try {
        const res = await fetch(`/api/maintenance/${selectedId}`, { cache: 'no-store' });
        const payload = (await res.json()) as ApiOk<{ record: MaintenanceRecord }> | ApiErr;
        if (!active) return;
        if (!res.ok || !payload.ok) { setError(payload.ok ? 'Failed to load record.' : payload.error.message); return; }
        setRecord(payload.record);
        setNotes(payload.record.technicianNotes ?? '');
        setPartsText((payload.record.partsReplaced ?? []).join('\n'));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load record.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedId]);

  async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
    setLoading(true); setError(null); setErrorDetails([]);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = (await res.json()) as (ApiOk<{ record: MaintenanceRecord }> & T) | ApiErr;
      if (!res.ok || !payload.ok) {
        setError(payload.ok ? 'Request failed.' : payload.error.message);
        setErrorDetails(payload.ok ? [] : (payload.error.details ?? []));
        return null;
      }
      if ('record' in payload && payload.record) {
        setRecord(payload.record);
        setNotes(payload.record.technicianNotes ?? '');
        setPartsText((payload.record.partsReplaced ?? []).join('\n'));
        await refreshList(payload.record.id);
      }
      return payload as unknown as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
      return null;
    } finally { setLoading(false); }
  }

  async function createSession() {
    if (!diagnosisContext) return;
    const d = diagnosisContext.diagnosis;
    const manualRefs = d?.manualGrounding?.manualSupportedClaims?.flatMap((c) => c.citations.map((cit) => ({
      manualTitle: cit.manualTitle,
      pageNumber: cit.pageNumber,
      supportingPassage: cit.supportingPassage?.slice(0, 500),
    }))) ?? [];
    const summary = diagnosisContext.blockedEscalation
      ? 'Diagnosis blocked by deterministic safety gate; repair guidance not provided.'
      : d ? `${d.possibleIssue} (confidence: ${d.confidenceLevel}). ${d.observedMachineComponent}` : 'Diagnosis summary unavailable.';
    // Idempotency key for this explicit UI action to avoid accidental duplicates on retry/rerender issues.
    const idempotencyKey = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = await apiPost<ApiOk<{ created: boolean }>>('/api/maintenance', {
      idempotencyKey,
      problemDescription: diagnosisContext.problemDescription,
      diagnosisSummary: summary,
      observedMachineComponent: d?.observedMachineComponent,
      possibleIssue: d?.possibleIssue,
      model: diagnosisContext.model,
      responseLanguage: d?.responseLanguage,
      manualReferences: manualRefs.slice(0, 20),
      safetyDecisionAtDiagnosis: diagnosisContext.safetyDecision,
      diagnosisBlocked: !!diagnosisContext.blockedEscalation || diagnosisContext.safetyDecision?.decision === 'block',
    });
    if (payload && 'record' in (payload as Record<string, unknown>)) {
      const r = (payload as Record<string, unknown>).record as MaintenanceRecord;
      setSelectedId(r.id);
    }
  }

  async function submitRepairAttempt() {
    if (!record) return;
    const actions = repairActionsText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (actions.length === 0) { setError('Enter at least one repair action (one per line).'); return; }
    const parts = partsText.split('\n').map((s) => s.trim()).filter(Boolean);
    await apiPost(`/api/maintenance/${record.id}/repair`, {
      repairActions: actions,
      partsReplaced: parts,
      technicianNotes: notes,
      moveToAwaitingVerification: moveToAwaiting,
    });
    setRepairActionsText('');
  }

  async function submitVerification() {
    if (!record) return;
    await apiPost(`/api/maintenance/${record.id}/verification`, {
      outcome,
      checklist,
      evidence,
      technicianConfirmation: confirmResolved,
      followUpRecommendations: followUp || undefined,
      escalationReason: outcome === 'escalated' ? escalationReason : undefined,
    });
  }

  async function submitEscalation() {
    if (!record) return;
    const reason = escalationReason.trim() || 'Escalated to qualified technician.';
    await apiPost(`/api/maintenance/${record.id}/escalate`, { reason, technicianNotes: notes });
  }

  const canCreate = !!diagnosisContext && (!!diagnosisContext.diagnosis || !!diagnosisContext.blockedEscalation || !!diagnosisContext.safetyDecision);
  const isBlockedDiagnosis = !!record?.diagnosisBlocked || record?.safetyDecisionAtDiagnosis?.decision === 'block';

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Phase 6</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Repair verification &amp; maintenance records</h2>
      <p className="mt-2 text-sm leading-6 text-foreground/75">
        Technician-entered documentation for synthetic or confirmed de-energized demo equipment only. <strong>Verification is not an AI/camera safety certification.</strong> AI/camera cannot verify electrical isolation, physical safety, or repair success.
      </p>
      <div className="mt-3 rounded-xl border border-red-200 bg-danger-surface p-3 text-sm text-red-950">
        <strong>Safety:</strong> Blocked/dangerous diagnoses cannot be recorded as successfully repaired. Uncertain/live equipment status must escalate. The deterministic safety gate remains authoritative.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={createSession} disabled={!canCreate || loading} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          Create maintenance session from current diagnosis
        </button>
        <button type="button" onClick={() => refreshList()} disabled={loading} className="rounded-full border border-border px-4 py-2 text-sm font-medium">
          Refresh history
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">
          <p className="font-medium">{error}</p>
          {errorDetails.length ? <ul className="mt-1 list-disc pl-5 text-xs">{errorDetails.map((d, i) => <li key={i}>{d}</li>)}</ul> : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <h3 className="text-sm font-semibold">Maintenance history / records</h3>
          {records.length === 0 ? <p className="mt-2 text-sm text-foreground/65">No records yet.</p> : (
            <ul className="mt-2 space-y-2">
              {records.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === r.id ? 'border-brand bg-white' : 'border-border bg-white/70'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground/60">{r.id.slice(0, 8)}</span>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium">{statusLabel(r.status as MaintenanceRecord['status'])}</span>
                      {r.diagnosisBlocked ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-900">Blocked diagnosis</span> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-foreground/80">{r.problemDescription}</p>
                    <p className="mt-1 text-xs text-foreground/55">Updated: {fmtDate(r.updatedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {!record ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-foreground/65">Select a record or create a maintenance session from the current diagnosis.</div>
          ) : (
            <>
              <div className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">Current repair session</h3>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-strong">Status: {statusLabel(record.status)}</span>
                  {record.status === 'repair_attempt_recorded' ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-950">Repair attempted — not yet verified</span> : null}
                  {record.status === 'awaiting_verification' ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-950">Awaiting verification — not yet verified</span> : null}
                  {record.status === 'verified_resolved' ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-950">Repair verified (technician evidence/confirmation)</span> : null}
                </div>
                <p className="mt-2 text-sm"><strong>Diagnosis summary:</strong> {record.diagnosisSummary}</p>
                <p className="mt-1 text-sm text-foreground/80"><strong>Problem:</strong> {record.problemDescription}</p>
                {record.observedMachineComponent ? <p className="mt-1 text-sm"><strong>Component:</strong> {record.observedMachineComponent}</p> : null}
                {record.manualReferences?.length ? (
                  <div className="mt-2 text-sm">
                    <strong>Manual references/citations:</strong>
                    <ul className="mt-1 list-disc pl-5">{record.manualReferences.map((m, i) => <li key={i}>{m.manualTitle} — page {m.pageNumber}</li>)}</ul>
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-foreground/60">Created {fmtDate(record.createdAt)} · Updated {fmtDate(record.updatedAt)} · System-generated timestamps/statuses.</p>
                {isBlockedDiagnosis ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-950"><strong>Blocked diagnosis:</strong> cannot be recorded as successfully repaired.</p> : null}
              </div>

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">Repair actions / notes / parts (technician-entered)</h3>
                <label className="mt-2 block text-sm">Repair actions attempted (one per line)</label>
                <textarea value={repairActionsText} onChange={(e) => setRepairActionsText(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Describe actions attempted on synthetic/de-energized demo equipment only." />
                <label className="mt-2 block text-sm">Parts/components replaced (optional, one per line)</label>
                <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
                <label className="mt-2 block text-sm">Technician notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={moveToAwaiting} onChange={(e) => setMoveToAwaiting(e.target.checked)} /> Move to awaiting verification after recording attempt</label>
                <button type="button" onClick={submitRepairAttempt} disabled={loading || isTerminal(record.status)} className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Record repair attempt</button>
                {record.repairActions.length ? (
                  <div className="mt-3 text-sm">
                    <strong>Recorded repair attempts (audit-preserved):</strong>
                    <ul className="mt-1 list-disc pl-5">{record.repairActions.map((a, i) => <li key={i}>{a.description} <span className="text-xs text-foreground/55">({fmtDate(a.recordedAt)})</span></li>)}</ul>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">Verification (technician-entered evidence; not AI safety certification)</h3>
                <p className="mt-1 text-xs text-foreground/70">Recording an attempt does not mark resolved. “Issue resolved” requires explicit evidence, completed required checklist items, and technician confirmation. AI/camera cannot verify electrical isolation or physical safety.</p>
                <label className="mt-3 block text-sm font-medium">Verification outcome</label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value as VerificationOutcome)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm">
                  <option value="issue_resolved">Issue resolved</option>
                  <option value="issue_persists">Issue persists</option>
                  <option value="unable_to_verify">Unable to verify</option>
                  <option value="escalated">Escalated</option>
                </select>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Verification checklist</p>
                  {checklist.map((item) => (
                    <label key={item.id} className="flex items-start gap-2 rounded-xl border border-border p-2 text-sm">
                      <input type="checkbox" checked={item.checked} onChange={(e) => setChecklist((cs) => cs.map((c) => c.id === item.id ? { ...c, checked: e.target.checked } : c))} className="mt-1" />
                      <span>{item.label}{item.required ? <span className="ml-1 text-xs text-red-700">(required for resolved)</span> : null}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-3 block text-sm font-medium">Technician-entered verification evidence</label>
                <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="What did you observe/test on synthetic or confirmed de-energized demo equipment? Do not invent measurements." />
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={confirmResolved} onChange={(e) => setConfirmResolved(e.target.checked)} className="mt-1" />
                  <span>I explicitly confirm this verification is based on my own observation/evidence and (if marking resolved) the issue appears resolved on synthetic or confirmed de-energized demo equipment. This is not an AI/camera safety certification.</span>
                </label>
                <label className="mt-2 block text-sm">Follow-up recommendations (optional)</label>
                <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
                {outcome === 'escalated' ? (
                  <>
                    <label className="mt-2 block text-sm">Escalation reason</label>
                    <input value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm" />
                  </>
                ) : null}
                <button type="button" onClick={submitVerification} disabled={loading || isTerminal(record.status)} className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Record verification</button>
                {record.currentVerification ? (
                  <div className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
                    <p><strong>Current verification (latest):</strong> {statusLabel(record.currentVerification.outcome === 'issue_resolved' ? 'verified_resolved' : record.currentVerification.outcome === 'issue_persists' ? 'verification_failed' : record.currentVerification.outcome === 'escalated' ? 'escalated_requires_qualified_technician' : 'awaiting_verification')} — outcome {record.currentVerification.outcome}</p>
                    <p className="mt-1"><strong>Technician evidence:</strong> {record.currentVerification.evidence || '—'}</p>
                    <p className="mt-1 text-xs text-foreground/60">Recorded {fmtDate(record.currentVerification.recordedAt)} by technician. History entries: {record.verificationHistory.length} (previous evidence preserved).</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">Escalation</h3>
                <p className="mt-1 text-sm text-foreground/75">Use when uncertain/live equipment risk exists, verification is impossible, or qualified technician review is required.</p>
                <input value={escalationReason} onChange={(e) => setEscalationReason(e.target.value)} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Reason for escalation" />
                <button type="button" onClick={submitEscalation} disabled={loading || isTerminal(record.status)} className="mt-2 rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-950 disabled:opacity-60">Record escalation</button>
                {record.escalationReason ? <p className="mt-2 text-sm"><strong>Escalation reason:</strong> {record.escalationReason}</p> : null}
              </div>

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">ERP/CMMS integration &amp; export (foundation)</h3>
                <p className="mt-1 text-xs text-foreground/65">Local simulator / configurable adapter interface. Demo mode uses clearly labeled synthetic data only and never contacts a real ERP/CMMS or creates external orders/actions. Exports are local maintenance records.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={async () => {
                    try {
                      const res = await fetch('/api/integrations/cmms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordId: record.id }) });
                      const data = (await res.json()) as { ok?: boolean; result?: { message?: string }; error?: string };
                      alert(data.result?.message ?? data.error ?? 'CMMS sync completed.');
                      const detail = await fetch(`/api/maintenance/${record.id}`, { cache: 'no-store' });
                      const payload = (await detail.json()) as { ok?: boolean; record?: MaintenanceRecord };
                      if (payload.ok && payload.record) setRecord(payload.record);
                    } catch (e) { alert(e instanceof Error ? e.message : 'CMMS sync failed.'); }
                  }} className="rounded-xl border border-border px-3 py-2 text-sm">Sync to CMMS (demo/configured)</button>
{ }
                  <a href={`/api/maintenance/export?id=${encodeURIComponent(record.id)}&format=json`} className="rounded-xl border border-border px-3 py-2 text-sm">Export record (JSON)</a>
{ }
                  <a href={`/api/maintenance/export?id=${encodeURIComponent(record.id)}&format=csv`} className="rounded-xl border border-border px-3 py-2 text-sm">Export record (CSV)</a>
{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API download endpoint, not a page route */}
                  <a href="/api/maintenance/export?format=csv" className="rounded-xl border border-border px-3 py-2 text-sm">Export all (CSV)</a>
                </div>
              </div>

              <MaintenanceDraftSyncPanel
                record={record}
                onSynced={async (id) => {
                  if (id !== record.id) return;
                  try {
                    const res = await fetch(`/api/maintenance/${id}`, { cache: 'no-store' });
                    const payload = (await res.json()) as ApiOk<{ record: MaintenanceRecord }> | ApiErr;
                    if (res.ok && payload.ok) {
                      setRecord(payload.record);
                      setNotes(payload.record.technicianNotes ?? '');
                      setPartsText((payload.record.partsReplaced ?? []).join('\n'));
                      await refreshList(payload.record.id);
                    }
                  } catch {
                    /* keep UI usable */
                  }
                }}
              />

              <div className="rounded-2xl border border-border p-4">
                <h3 className="text-sm font-semibold">Audit event history</h3>
                <p className="mt-1 text-xs text-foreground/65">Original diagnosis/safety decision preserved in record. Verification changes create new audit events; previous evidence is retained in verification history.</p>
                <ol className="mt-2 space-y-2">
                  {record.auditEvents.map((e) => (
                    <li key={e.id} className="rounded-xl bg-surface-muted p-3 text-sm">
                      <div className="flex flex-wrap gap-2 text-xs text-foreground/60">
                        <span>{fmtDate(e.at)}</span>
                        <span className="font-mono">{e.type}</span>
                        {e.fromStatus || e.toStatus ? <span>{e.fromStatus ?? '—'} → {e.toStatus ?? '—'}</span> : null}
                      </div>
                      <p className="mt-1">{e.summary}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
