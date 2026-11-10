'use client';

import { useEffect, useState } from 'react';

type IntegrationStatus =
  | 'implemented_verified'
  | 'implemented_requires_credentials'
  | 'configured_but_unverified'
  | 'partially_implemented'
  | 'blocked_by_credentials'
  | 'not_integrated'
  | 'planned'
  | 'failed';

interface Capability {
  id: string;
  name: string;
  status: IntegrationStatus | string;
  summary: string;
  details: string[];
  configHints?: string[];
}

interface Payload {
  ok?: boolean;
  notice?: string;
  capabilities?: Capability[];
  error?: string;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    implemented_verified: 'Implemented & verified',
    implemented_requires_credentials: 'Implemented, requires credentials',
    configured_but_unverified: 'Configured, not verified',
    partially_implemented: 'Partially implemented',
    blocked_by_credentials: 'Blocked by credentials/access',
    not_integrated: 'Not integrated',
    planned: 'Planned',
    failed: 'Failed',
  };
  return map[s] ?? s;
}

function statusClass(s: string): string {
  if (s === 'implemented_verified') return 'bg-emerald-100 text-emerald-900';
  if (s === 'implemented_requires_credentials' || s === 'configured_but_unverified') return 'bg-amber-100 text-amber-950';
  if (s === 'partially_implemented') return 'bg-sky-100 text-sky-950';
  if (s === 'blocked_by_credentials' || s === 'not_integrated' || s === 'planned') return 'bg-surface-muted text-foreground/75';
  if (s === 'failed') return 'bg-red-100 text-red-950';
  return 'bg-surface-muted text-foreground/75';
}

export function IntegrationStatusPanel() {
  const [caps, setCaps] = useState<Capability[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/status', { cache: 'no-store' });
      const data = (await res.json()) as Payload;
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Failed to load status (${res.status}).`);
        return;
      }
      setCaps(Array.isArray(data.capabilities) ? data.capabilities : []);
      setNotice(data.notice ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load integration status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/integrations/status', { cache: 'no-store' });
        const data = (await res.json()) as Payload;
        if (!active) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Failed to load status (${res.status}).`);
          return;
        }
        setCaps(Array.isArray(data.capabilities) ? data.capabilities : []);
        setNotice(data.notice ?? '');
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load integration status.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6" aria-labelledby="integration-status-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Integrations</p>
          <h2 id="integration-status-heading" className="mt-1 text-xl font-semibold tracking-tight">Application &amp; AI service status</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/75">
            Truthful capability labels for this build. Configuration/credentials do not imply verified external connectivity. Deterministic safety rules remain authoritative.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium disabled:opacity-60">
          {loading ? 'Refreshing…' : 'Refresh status'}
        </button>
      </div>
      {notice ? <p className="mt-3 text-xs leading-5 text-foreground/65">{notice}</p> : null}
      {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">{error}</p> : null}
      {!loading && !error && caps.length === 0 ? <p className="mt-3 text-sm text-foreground/65">No capability status available.</p> : null}
      <ul className="mt-4 space-y-3">
        {caps.map((c) => (
          <li key={c.id} className="rounded-xl border border-border bg-surface-muted p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{c.name}</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass(String(c.status))}`}>{statusLabel(String(c.status))}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/85">{c.summary}</p>
            {c.details?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-foreground/75">
                {c.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            ) : null}
            {c.configHints?.length ? (
              <p className="mt-2 text-[11px] text-foreground/60"><strong>Config:</strong> {c.configHints.join(', ')}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
