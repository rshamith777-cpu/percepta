'use client';

import { useEffect, useState } from 'react';

type Watchdog = { availability: string; mode: string; model?: string; offlineCapable?: boolean; rationale?: string; error?: string; advisoryLabel?: string; failedSafely?: boolean; deterministicDecisionContext?: string };

export function WatchdogStatusCard(props: { problemDescription?: string; deterministicDecision?: 'allow' | 'caution' | 'block' }) {
  const [status, setStatus] = useState<Watchdog | null>(null);
  const [result, setResult] = useState<Watchdog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try { const res = await fetch('/api/safety/watchdog', { cache: 'no-store' }); const data = (await res.json()) as { watchdog?: Watchdog }; if (active) setStatus(data.watchdog ?? null); } catch { if (active) setStatus({ availability: 'error', mode: 'unknown', rationale: 'Could not load watchdog status.' }); }
    })();
    return () => { active = false; };
  }, []);

  async function runCheck() {
    if (!props.problemDescription?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/safety/watchdog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ problemDescription: props.problemDescription, deterministicDecision: props.deterministicDecision }) });
      const data = (await res.json()) as { watchdog?: Watchdog };
      setResult(data.watchdog ?? null);
    } catch (e) { setResult({ availability: 'error', mode: 'local-runtime', error: e instanceof Error ? e.message : 'Watchdog check failed.', failedSafely: true }); }
    finally { setLoading(false); }
  }

  const w = result ?? status;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Local safety watchdog (advisory)</p>
      <h3 className="mt-1 text-base font-semibold">Watchdog status</h3>
      <p className="mt-2 text-sm text-foreground/75">Advisory local-runtime integration only. It <strong>never</strong> overrides the deterministic safety gate, especially BLOCK decisions, and cannot verify electrical isolation/energized/safe-to-touch conditions.</p>
      <div className="mt-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
        <p><span className="font-medium">Availability:</span> {w?.availability ?? 'loading'} {w?.mode ? `(${w.mode})` : ''}{w?.model ? ` · model: ${w.model}` : ''}</p>
        <p className="mt-1 text-xs text-foreground/70">Offline/local capable when pointed at a local runtime: {w?.offlineCapable ? 'configured as local runtime' : 'not confirmed / disabled'}.</p>
        {w?.advisoryLabel ? <p className="mt-1"><span className="font-medium">Advisory:</span> {w.advisoryLabel}</p> : null}
        {w?.rationale ? <p className="mt-1 text-xs text-foreground/75">{w.rationale}</p> : null}
        {w?.error ? <p className="mt-1 text-xs text-amber-900">Safe fallback: {w.error}</p> : null}
      </div>
      <button type="button" onClick={runCheck} disabled={loading || !props.problemDescription?.trim()} className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium disabled:opacity-60">
        {loading ? 'Checking watchdog…' : 'Run advisory watchdog check (text)'}
      </button>
    </section>
  );
}
