'use client';

import { useEffect, useState } from 'react';

type LyriaStatus = { available: boolean; notice: string; speechGuidance: string; limitations?: string[] };

export function AmbientAudioCard() {
  const [status, setStatus] = useState<LyriaStatus | null>(null);
  const [prompt, setPrompt] = useState('Calm, neutral ambient maintenance background');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/audio/lyria/status', { cache: 'no-store' });
        const data = (await res.json()) as { lyria?: LyriaStatus };
        if (active && data.lyria) setStatus(data.lyria);
      } catch { if (active) setStatus({ available: false, notice: 'Could not load Lyria status.', speechGuidance: 'Browser speech synthesis remains available for guidance.' }); }
    })();
    return () => { active = false; };
  }, []);

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/audio/lyria/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, userRequested: true }) });
      const data = (await res.json()) as { ok?: boolean; error?: string; notice?: string; result?: unknown; unavailable?: boolean };
      if (!res.ok || !data.ok) { setError(data.error ?? 'Audio generation unavailable.'); return; }
      setResult(`${data.notice ?? ''}\nResponse: ${JSON.stringify(data.result).slice(0, 500)}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Audio generation failed.'); }
    finally { setLoading(false); }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Optional audio (Lyria integration hook)</p>
      <h3 className="mt-1 text-base font-semibold">Ambient audio (non-safety)</h3>
      <p className="mt-2 text-sm text-foreground/75">{status?.notice ?? 'Loading audio integration status…'}</p>
      <p className="mt-1 text-xs text-foreground/65">{status?.speechGuidance ?? 'Browser speech synthesis remains the supported spoken technician guidance path.'}</p>
      <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">Generated audio is optional, user-requested ambient media only. It is <strong>not</strong> a safety alarm, not a critical warning, and not a replacement for speech guidance or safety procedures.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" placeholder="Ambient prompt" aria-label="Ambient audio prompt" />
        <button type="button" onClick={generate} disabled={loading || !status?.available} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Generating…' : 'Generate ambient audio'}
        </button>
      </div>
      {!status?.available ? <p className="mt-2 text-xs text-foreground/65">Disabled/unavailable until explicitly configured on the server. No audio is generated automatically.</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {result ? <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-surface-muted p-2 text-xs text-foreground/75">{result}</pre> : null}
    </section>
  );
}
