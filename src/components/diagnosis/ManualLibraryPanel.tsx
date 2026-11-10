'use client';

function fmtDate(iso: string): string { try { return new Date(iso).toISOString().replace('T',' ').slice(0,16) + ' UTC'; } catch { return iso; } }


import { useEffect, useRef, useState } from 'react';
import type { ManualDocument } from '@/types';

const MAX_PDF_MB = 15;

type UploadState =
  | { status: 'idle' }
  | { status: 'processing'; message: string; phase?: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; ocrRequired?: boolean; ocrFailed?: boolean; manualIrrelevant?: boolean };

function phaseLabel(phase?: string, event?: Record<string, unknown>): string {
  switch (phase) {
    case 'extracting_text': return 'Extracting PDF text';
    case 'scanned_detected': return 'Scanned pages detected';
    case 'ocr_page': {
      const page = event?.pageNumber as number | undefined;
      const cur = event?.current as number | undefined;
      const total = event?.total as number | undefined;
      if (page && cur && total) return `OCR processing page ${page} (${cur} of ${total})`;
      if (page) return `OCR processing page ${page}`;
      return 'OCR processing';
    }
    case 'ocr_complete': return 'OCR completed';
    case 'ocr_partial': return 'OCR partially completed';
    case 'ocr_unavailable': return 'OCR unavailable';
    case 'ocr_failed': return 'OCR failed';
    default: return 'Processing PDF';
  }
}

function isGroundingEligible(m: ManualDocument): boolean {
  // Fail closed: server/store requires explicit eligibility; legacy/unverified docs are not eligible.
  return m.groundingEligible === true && m.status === 'ready';
}

export function ManualLibraryPanel(props: {
  manuals: ManualDocument[];
  selectedManualId: string | null;
  onSelectedManualIdChange: (id: string | null) => void;
  onManualsChanged: () => void;
}) {
  const { manuals, selectedManualId, onSelectedManualIdChange, onManualsChanged } = props;
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [title, setTitle] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (uploadState.status === 'success') {
      const t = setTimeout(() => setUploadState({ status: 'idle' }), 7000);
      return () => clearTimeout(t);
    }
  }, [uploadState]);

  // Keep selection valid: if selected manual is no longer grounding-eligible, clear it.
  useEffect(() => {
    if (!selectedManualId) return;
    const selected = manuals.find((m) => m.id === selectedManualId);
    if (!selected || !isGroundingEligible(selected)) onSelectedManualIdChange(null);
  }, [manuals, selectedManualId, onSelectedManualIdChange]);

  async function consumeNdjson(res: Response): Promise<{ ok: boolean; payload: Record<string, unknown> }> {
    if (!res.body) {
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok && payload.ok !== false, payload };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalPayload: Record<string, unknown> | null = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed) as Record<string, unknown>;
          if (event.type === 'progress') {
            setUploadState({ status: 'processing', phase: String(event.phase ?? ''), message: String(event.message ?? phaseLabel(String(event.phase ?? ''), event)) });
          } else if (event.type === 'complete' || event.type === 'error') {
            finalPayload = event;
          }
        } catch {
          // ignore malformed progress line
        }
      }
    }
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as Record<string, unknown>;
        if (event.type === 'complete' || event.type === 'error') finalPayload = event;
      } catch { /* ignore */ }
    }
    return { ok: finalPayload?.ok === true, payload: finalPayload ?? { ok: false, error: 'Upload ended without a final result.' } };
  }

  async function uploadManual(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadState({ status: 'error', message: 'Please select a PDF file.' });
      return;
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadState({ status: 'error', message: 'Invalid file type. Please upload a PDF document.' });
      return;
    }
    if (file.size <= 0 || file.size > MAX_PDF_MB * 1024 * 1024) {
      setUploadState({ status: 'error', message: `PDF must be between 1 byte and ${MAX_PDF_MB} MB.` });
      return;
    }

    setUploadState({ status: 'processing', phase: 'extracting_text', message: 'Extracting PDF text…' });
    try {
      const fd = new FormData();
      fd.append('manual', file);
      if (title.trim()) fd.append('title', title.trim());
      const res = await fetch('/api/manuals/upload?stream=1', {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/x-ndjson' },
      });
      const contentType = res.headers.get('content-type') ?? '';
      let payload: Record<string, unknown>;
      let ok: boolean;
      if (contentType.includes('application/x-ndjson') && res.body) {
        ({ ok, payload } = await consumeNdjson(res));
      } else {
        payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        ok = res.ok && payload.ok !== false;
      }
      if (!ok) {
        // If the document was saved as irrelevant/not grounding-eligible, refresh so user can see/remove it.
        if (payload.manual || payload.manualIrrelevant || payload.code === 'MANUAL_IRRELEVANT') {
          onManualsChanged();
        }
        setUploadState({
          status: 'error',
          message: String(payload.error ?? payload.message ?? `Upload failed (${res.status}).`),
          ocrRequired: Boolean(payload.ocrRequired),
          ocrFailed: Boolean(payload.ocrFailed),
          manualIrrelevant: Boolean(payload.manualIrrelevant || payload.code === 'MANUAL_IRRELEVANT'),
        });
        return;
      }
      setUploadState({ status: 'success', message: String(payload.message ?? 'Manual processed successfully.') });
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      onManualsChanged();
    } catch (err) {
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  async function removeManual(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/manuals/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok || payload.ok === false) {
        setUploadState({ status: 'error', message: payload.error ?? `Failed to remove manual (${res.status}).` });
        return;
      }
      if (selectedManualId === id) onSelectedManualIdChange(null);
      onManualsChanged();
    } catch (err) {
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to remove manual.' });
    } finally {
      setRemovingId(null);
    }
  }

  const groundingManuals = manuals.filter(isGroundingEligible);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Phase 3</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">Manufacturer manual grounding (RAG)</h3>
          <p className="mt-2 text-sm leading-6 text-foreground/75">
            Upload a PDF manual for local retrieval. Retrieved passages are <strong>reference data only</strong> (never system instructions) and must not override safety rules. Documents that are clearly unrelated to inverter/electrical service grounding are marked not suitable and cannot ground diagnosis.
          </p>
        </div>
      </div>

      <form onSubmit={uploadManual} className="mt-4 space-y-3 rounded-2xl border border-border bg-surface-muted p-4">
        <div>
          <label htmlFor="manual-title" className="block text-sm font-medium">Manual title (optional)</label>
          <input
            id="manual-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Solar Inverter Service Manual"
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand/30 focus:ring"
          />
        </div>
        <div>
          <label htmlFor="manual-file" className="block text-sm font-medium">Upload PDF</label>
          <input
            id="manual-file"
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full text-sm text-foreground/75 file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-foreground/65">PDF only, max {MAX_PDF_MB} MB. Scanned/image-only PDFs require a configured OCR engine (e.g., local Tesseract). Uploaded documents are assessed for relevance to inverter/electrical service grounding; unrelated documents (e.g., HR/offer/administrative content) are rejected for grounding. No text/citations are fabricated.</p>
        </div>
        <button
          type="submit"
          disabled={uploadState.status === 'processing'}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {uploadState.status === 'processing' ? 'Processing PDF…' : 'Upload & process manual'}
        </button>

        {uploadState.status === 'processing' ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
            <p className="font-medium">{phaseLabel(uploadState.phase)}</p>
            <p className="mt-1">{uploadState.message}</p>
          </div>
        ) : null}
        {uploadState.status === 'success' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">{uploadState.message}</div>
        ) : null}
        {uploadState.status === 'error' ? (
          <div className={`rounded-xl border p-3 text-sm ${uploadState.manualIrrelevant ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-red-200 bg-red-50 text-red-950'}`}>
            <p className="font-medium">
              {uploadState.manualIrrelevant ? 'Manual not suitable for inverter grounding' : `Manual processing error${uploadState.ocrFailed ? ' (OCR failed)' : uploadState.ocrRequired ? ' (OCR required/unavailable)' : ''}`}
            </p>
            <p className="mt-1">{uploadState.message}</p>
            {uploadState.manualIrrelevant ? <p className="mt-2">The document may remain listed for visibility; remove it and upload a relevant inverter/service manual or electrical safety document.</p> : null}
            {uploadState.ocrRequired ? <p className="mt-2 font-medium">Scanned/image-only content needs OCR. Install/configure OCR or upload a text-based PDF.</p> : null}
          </div>
        ) : null}
      </form>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Manual library</p>
          <button type="button" onClick={onManualsChanged} className="text-sm font-medium text-brand-strong underline decoration-brand/30">Refresh</button>
        </div>
        <div className="mt-2">
          <label htmlFor="manual-select" className="block text-xs text-foreground/65">Use for diagnosis grounding (eligible manuals only)</label>
          <select
            id="manual-select"
            value={selectedManualId ?? ''}
            onChange={(e) => onSelectedManualIdChange(e.target.value || null)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">All grounding-eligible manuals (default retrieval)</option>
            {groundingManuals.map((m) => (
              <option key={m.id} value={m.id}>{m.title} ({m.pageCount} pages){m.relevanceCategory === 'generic_electrical_safety' ? ' — generic safety reference' : ''}</option>
            ))}
          </select>
        </div>
        {manuals.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-sm text-foreground/65">No manuals uploaded. Diagnosis will run without manual grounding and will disclose that status.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {manuals.map((m) => {
              const eligible = isGroundingEligible(m);
              return (
                <li key={m.id} className={`rounded-xl border p-3 text-sm ${eligible ? 'border-border bg-surface-muted' : 'border-amber-300 bg-amber-50/60'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{m.title}</p>
                      <p className="text-xs text-foreground/65 break-all">{m.filename}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.status === 'ready' && eligible ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : m.status === 'irrelevant' || !eligible ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' : m.status === 'error' ? 'bg-red-50 text-red-800 ring-1 ring-red-200' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'}`}>
                        {m.status === 'irrelevant' ? 'not suitable for grounding' : m.status}{m.ocrRequired ? ' (OCR required)' : ''}
                      </span>
                      <button type="button" onClick={() => void removeManual(m.id)} disabled={removingId === m.id} className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-800 disabled:opacity-60">
                        {removingId === m.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-foreground/70">{m.pageCount} page(s), {m.chunkCount} chunk(s). Uploaded {fmtDate(m.uploadedAt)}.</p>
                  {m.relevanceReason ? <p className={`mt-1 text-xs ${eligible ? 'text-foreground/70' : 'text-amber-950'}`}><strong>{eligible ? 'Relevance note:' : 'Why not used for grounding:'}</strong> {m.relevanceReason}</p> : null}
                  {m.error && !m.relevanceReason ? <p className="mt-1 text-xs text-red-800">{m.error}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
