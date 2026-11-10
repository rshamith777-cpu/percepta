'use client';

import { useEffect, useRef, useState } from 'react';
import { SUPPORTED_LANGUAGES, type DiagnosisApiResponse, type DiagnosisResult } from '@/types/diagnosis';
import type { EquipmentStatusInput, ManualDocument, RetrievedManualPassage, SafetyChecklistItem, SafetyDecision, SupportedLanguage } from '@/types';
import { DiagnosisResultView } from './DiagnosisResultView';
import { ManualLibraryPanel } from './ManualLibraryPanel';
import { SafetyDecisionPanel } from './SafetyDecisionPanel';
import { VoiceInputControls } from './VoiceInputControls';
import { VoiceOutputControls } from './VoiceOutputControls';
import { WatchdogStatusCard } from './WatchdogStatusCard';
import { AmbientAudioCard } from './AmbientAudioCard';
import { IntegrationStatusPanel } from '@/components/integrations/IntegrationStatusPanel';
import { ConnectivityBanner } from '@/components/system/ConnectivityBanner';
import { RoboticsDataPanel } from '@/components/robotics/RoboticsDataPanel';
import { MaintenancePanel } from '@/components/maintenance/MaintenancePanel';

interface FormState {
  language: SupportedLanguage;
  problemDescription: string;
  equipmentStatus: EquipmentStatusInput;
}

function toErrorMessage(payload: DiagnosisApiResponse | null, fallback: string): string {
  if (payload && !payload.ok) return payload.error.message;
  return fallback;
}

function createClientChecklist(status: EquipmentStatusInput): SafetyChecklistItem[] {
  const demoContextOk = status === 'synthetic_demo' || status === 'de_energized_confirmed';
  return [
    {
      id: 'demo_scope_synthetic_or_deenergized',
      label: 'Equipment is synthetic demo hardware or confirmed de-energized for training/demo',
      safetyCritical: true,
      checked: demoContextOk,
      guidance: 'Prototype supports synthetic or de-energized solar inverter demos only. Do not use for live troubleshooting.',
    },
    {
      id: 'no_live_work',
      label: 'No live electrical work, no opening energized equipment, no touching live components',
      safetyCritical: true,
      checked: demoContextOk,
      guidance: 'Never open energized equipment, touch live components, bypass protective devices, or perform dangerous electrical work.',
    },
    {
      id: 'qualified_escalation',
      label: 'Qualified electrician/inverter technician escalation path is available',
      safetyCritical: true,
      checked: true,
      guidance: 'If status is unclear, damage is present, or electrical risk is possible, stop and escalate.',
    },
    {
      id: 'ppe_visual_inspection',
      label: 'Appropriate PPE and safe visual inspection boundaries are understood',
      safetyCritical: false,
      checked: true,
      guidance: 'Limit actions to safe external visual inspection and documentation.',
    },
    {
      id: 'manufacturer_docs',
      label: 'Manufacturer documentation/procedures will be followed by qualified personnel when required',
      safetyCritical: false,
      checked: true,
      guidance: 'AI guidance is advisory only; qualified personnel must follow official procedures.',
    },
  ];
}

export function DiagnosisWorkbench() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>({
    language: 'en',
    problemDescription: '',
    equipmentStatus: 'de_energized_confirmed',
  });
  const [checklist, setChecklist] = useState<SafetyChecklistItem[]>(() => createClientChecklist('de_energized_confirmed'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [retryable, setRetryable] = useState(false);
  const [safetyDecision, setSafetyDecision] = useState<SafetyDecision | null>(null);
  const [blockedEscalation, setBlockedEscalation] = useState<string | null>(null);
  const [result, setResult] = useState<{ diagnosis: DiagnosisResult; model?: string } | null>(null);
  const [manuals, setManuals] = useState<ManualDocument[]>([]);
  const [selectedManualId, setSelectedManualId] = useState<string | null>(null);
  const [manualContext, setManualContext] = useState<{
    retrievalMessage: string;
    retrievedPassages: RetrievedManualPassage[];
    retrievalSummary?: {
      groundingEligibleManualCount: number;
      candidatePassagesPassedThreshold: number;
      selectedManualIneligible?: boolean;
      selectedManualIneligibleReason?: string;
      groundedStatusNote?: string;
      validatedClaimCount?: number;
      diagnosisGrounded?: boolean;
    };
  } | null>(null);

  async function loadManuals() {
    try {
      const res = await fetch('/api/manuals', { cache: 'no-store' });
      const payload = (await res.json()) as { ok?: boolean; manuals?: ManualDocument[] };
      if (payload?.ok && Array.isArray(payload.manuals)) setManuals(payload.manuals);
    } catch {
      // keep current list; manual library will show refresh option
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/manuals', { cache: 'no-store' });
        const payload = (await res.json()) as { ok?: boolean; manuals?: ManualDocument[] };
        if (active && payload?.ok && Array.isArray(payload.manuals)) setManuals(payload.manuals);
      } catch {
        // keep current list; manual library will show refresh option
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [previewUrl]);

  function updateEquipmentStatus(status: EquipmentStatusInput) {
    setForm((f) => ({ ...f, equipmentStatus: status }));
    setChecklist(createClientChecklist(status));
    setSafetyDecision(null);
    setBlockedEscalation(null);
  }

  function setChecklistChecked(id: string, checked: boolean) {
    setChecklist((items) => items.map((i) => (i.id === id ? { ...i, checked } : i)));
  }

  function setImageFile(file: File | null) {
    setError(null);
    setErrorDetails([]);
    setResult(null);
    setSafetyDecision(null);
    setBlockedEscalation(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) setImageFile(file);
  }

  async function startCamera() {
    setCameraError(null);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Please upload an image instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera.';
      setCameraError(`Camera unavailable: ${msg}. You can still upload an image.`);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraActive) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Could not capture image from camera.');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setCameraError('Could not create an image from the camera frame.');
      return;
    }
    const file = new File([blob], `kriyaos-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setImageFile(file);
    stopCamera();
  }

  async function submitDiagnosis() {
    setError(null);
    setErrorCode(null);
    setErrorDetails([]);
    setRetryable(false);
    setResult(null);
    setSafetyDecision(null);
    setBlockedEscalation(null);
    setManualContext(null);

    if (!selectedFile) {
      setError('Please upload an image or capture a photo of the equipment.');
      setErrorCode('INVALID_IMAGE');
      return;
    }
    if (form.problemDescription.trim().length < 3) {
      setError('Please describe the observed problem.');
      setErrorCode('INVALID_REQUEST');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      fd.append('language', form.language);
      fd.append('problemDescription', form.problemDescription.trim());
      fd.append('equipmentStatus', form.equipmentStatus);
      fd.append('safetyChecklist', JSON.stringify(checklist));
      if (selectedManualId) fd.append('manualId', selectedManualId);

      const res = await fetch('/api/diagnose', { method: 'POST', body: fd });
      let payload: DiagnosisApiResponse | null = null;
      try {
        payload = (await res.json()) as DiagnosisApiResponse;
      } catch {
        payload = null;
      }

      if (!res.ok || !payload) {
        if (payload && !payload.ok && payload.safetyDecision) setSafetyDecision(payload.safetyDecision);
        if (payload?.manualContext) {
          setManualContext({
            retrievalMessage: payload.manualContext.retrievalMessage,
            retrievedPassages: payload.manualContext.retrievedPassages,
            retrievalSummary: payload.manualContext.retrievalSummary,
          });
        }
        setError(toErrorMessage(payload, `Request failed (${res.status}).`));
        setErrorCode(payload && !payload.ok ? payload.error.code : 'INTERNAL_ERROR');
        setRetryable(res.status >= 429 || res.status >= 500);
        return;
      }
      if (!payload.ok) {
        setSafetyDecision(payload.safetyDecision ?? null);
        if (payload.manualContext) {
          setManualContext({
            retrievalMessage: payload.manualContext.retrievalMessage,
            retrievedPassages: payload.manualContext.retrievedPassages,
            retrievalSummary: payload.manualContext.retrievalSummary,
          });
        }
        setError(payload.error.message);
        setErrorCode(payload.error.code);
        setErrorDetails(payload.error.details ?? []);
        setRetryable(payload.error.retryable);
        return;
      }
      if (payload.manualContext) {
        setManualContext({
          retrievalMessage: payload.manualContext.retrievalMessage,
          retrievedPassages: payload.manualContext.retrievedPassages,
          retrievalSummary: payload.manualContext.retrievalSummary,
        });
      }
      setSafetyDecision(payload.safetyDecision);
      if (payload.blockedEscalation || !payload.diagnosis || payload.safetyDecision.decision === 'block') {
        setBlockedEscalation(payload.blockedEscalation ?? 'Repair guidance was blocked by the deterministic safety gate.');
        return;
      }
      setResult({ diagnosis: payload.diagnosis, model: payload.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while contacting the diagnosis service.');
      setRetryable(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <ConnectivityBanner />
      <ManualLibraryPanel
        manuals={manuals}
        selectedManualId={selectedManualId}
        onSelectedManualIdChange={setSelectedManualId}
        onManualsChanged={loadManuals}
      />

      <section id="diagnose" className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Phases 1–6</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Diagnosis, grounding, annotations, voice, safety, and maintenance records</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/75">
              Upload or capture an image and describe the issue by text or voice. The server performs deterministic safety pre/post checks, retrieves relevant manufacturer-manual passages (reference data only), and uses Gemini for advisory diagnosis with optional validated visual annotations.
              No mock AI responses are used. Voice uses browser speech recognition/synthesis when supported; text input remains available.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand-strong ring-1 ring-brand/20">
            Voice + grounding + annotations + safety
          </span>
        </div>

        <div id="safety" className="mt-4 rounded-2xl border border-red-200 bg-danger-surface p-4 text-sm leading-6 text-red-950 scroll-mt-24">
          <p className="font-semibold text-danger">Before you start</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use <strong>synthetic or confirmed de-energized equipment only</strong>.</li>
            <li><strong>Do not open energized electrical equipment or touch live components.</strong></li>
            <li><strong>A camera or AI model cannot verify whether equipment is electrically de-energized.</strong></li>
            <li>Potentially live or uncertain status triggers <strong>safe escalation</strong>, not repair guidance.</li>
          </ul>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="language" className="block text-sm font-medium">Language</label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as SupportedLanguage }))}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand/30 focus:ring"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="equipmentStatus" className="block text-sm font-medium">Equipment status (demo)</label>
                <select
                  id="equipmentStatus"
                  value={form.equipmentStatus}
                  onChange={(e) => updateEquipmentStatus(e.target.value as EquipmentStatusInput)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand/30 focus:ring"
                >
                  <option value="de_energized_confirmed">Confirmed de-energized (qualified verification outside this app)</option>
                  <option value="synthetic_demo">Synthetic demo hardware (no live power)</option>
                  <option value="uncertain">Uncertain / not confirmed</option>
                  <option value="potentially_live">Potentially live / energized</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="text-sm font-medium">Safety checklist (deterministic gate input)</p>
              <p className="mt-1 text-xs leading-5 text-foreground/70">
                Safety-critical items are evaluated by server-side deterministic rules. AI suggestions are advisory only.
              </p>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border bg-surface p-3">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => setChecklistChecked(item.id, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span>
                        <span className="font-medium">{item.label}</span>
                        {item.safetyCritical ? <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-900">Safety-critical</span> : null}
                        <span className="mt-1 block text-foreground/70">{item.guidance}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="problem" className="block text-sm font-medium">Observed problem</label>
              <VoiceInputControls
                language={form.language}
                disabled={loading}
                onTranscript={(text) => setForm((f) => ({ ...f, problemDescription: f.problemDescription ? `${f.problemDescription} ${text}` : text }))}
              />
              <textarea
                id="problem"
                value={form.problemDescription}
                onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))}
                rows={4}
                maxLength={2000}
                placeholder="Describe what you see (error code, LEDs, external damage, context). You can use voice input above and then review/edit this text. Do not request live electrical work."
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-6 outline-none ring-brand/30 focus:ring"
              />
              <p className="mt-1 text-xs text-foreground/65">Review and edit voice transcription before diagnosis. Diagnosis is submitted only when you press the analyze button.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-surface-muted p-3">
              <p className="text-sm font-medium">Equipment image</p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={onFileChange}
                  className="block w-full text-sm text-foreground/75 file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                {!cameraActive ? (
                  <button type="button" onClick={startCamera} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-brand/40">
                    Start camera
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={capturePhoto} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong">
                      Capture photo
                    </button>
                    <button type="button" onClick={stopCamera} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">
                      Stop camera
                    </button>
                  </>
                )}
                {selectedFile ? (
                  <button type="button" onClick={() => { setImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">
                    Clear image
                  </button>
                ) : null}
              </div>
              {cameraError ? <p className="text-sm text-amber-900">{cameraError}</p> : null}
              {cameraActive ? (
                <video ref={videoRef} playsInline muted className="mt-2 max-h-72 w-full rounded-xl border border-border bg-black object-contain" />
              ) : null}
            </div>

            <button
              type="button"
              onClick={submitDiagnosis}
              disabled={loading}
              className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Running safety gate and Gemini analysis…' : 'Run safety gate & analyze'}
            </button>

            {error ? (() => {
              const aiUnavailable =
                safetyDecision &&
                errorCode &&
                ['MISSING_API_KEY', 'RATE_LIMITED', 'UPSTREAM_ERROR', 'MALFORMED_MODEL_RESPONSE', 'INTERNAL_ERROR'].includes(errorCode);
              return (
                <div className={`rounded-2xl border p-4 text-sm ${aiUnavailable ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-red-200 bg-red-50 text-red-950'}`}>
                  <p className="font-semibold">
                    {aiUnavailable ? 'AI diagnosis temporarily unavailable; safety gate results are independent.' : 'Diagnosis unavailable'}
                  </p>
                  <p className="mt-1">{error}</p>
                  {aiUnavailable ? (
                    <p className="mt-2 text-amber-900/90">
                      No diagnosis was fabricated. The deterministic safety gate ran independently; review the safety decision below. You may retry AI analysis when the service is available.
                    </p>
                  ) : null}
                  {errorDetails.length > 0 ? (
                    <ul className={`mt-2 list-disc space-y-1 pl-5 ${aiUnavailable ? 'text-amber-900/90' : 'text-red-900/90'}`}>
                      {errorDetails.map((d, i) => <li key={i} className="break-words font-mono text-xs">{d}</li>)}
                    </ul>
                  ) : null}
                  {retryable ? (
                    <button type="button" onClick={submitDiagnosis} disabled={loading} className={`mt-3 rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${aiUnavailable ? 'bg-amber-700' : 'bg-red-700'}`}>
                      Retry
                    </button>
                  ) : null}
                </div>
              );
            })() : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Selected image preview</p>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Selected equipment preview" className="max-h-[420px] w-full rounded-2xl border border-border bg-surface-muted object-contain" />
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center text-sm text-foreground/65">
                No image selected. Upload a JPEG/PNG/WebP image or capture a photo of synthetic/de-energized equipment.
              </div>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Running deterministic safety checks and Gemini analysis</p>
              <p className="text-sm text-foreground/70">Safety-critical decisions are made by server-side deterministic rules; AI output is advisory and post-checked.</p>
            </div>
          </div>
        </section>
      ) : null}

      {safetyDecision ? <SafetyDecisionPanel decision={safetyDecision} /> : null}

      {manualContext ? (() => {
        const s = manualContext.retrievalSummary;
        const candidates = s?.candidatePassagesPassedThreshold ?? manualContext.retrievedPassages.length;
        const eligibleCount = s?.groundingEligibleManualCount;
        return (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/65">Manual retrieval (reference data only)</h3>
            <p className="mt-2 text-sm leading-6 text-foreground">{manualContext.retrievalMessage}</p>
            {s ? (
              <div className="mt-2 rounded-xl border border-border bg-surface-muted p-3 text-xs leading-5 text-foreground/80">
                <p><strong>Grounding-eligible manuals:</strong> {eligibleCount ?? 'unknown'}. <strong>Candidate passages passing lexical relevance thresholds:</strong> {candidates}.</p>
                <p className="mt-1"><strong>Important:</strong> Candidate retrieval is not the same as grounded diagnosis. Grounding requires validated claim citations to exact retrieved passages (correct manual title and page). {s.groundedStatusNote ?? ''}</p>
                {s.selectedManualIneligible ? <p className="mt-1 text-amber-900"><strong>Selected manual not used for grounding:</strong> {s.selectedManualIneligibleReason ?? 'Not grounding-eligible.'}</p> : null}
              </div>
            ) : null}
            {manualContext.retrievedPassages.length > 0 ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm font-medium">Candidate retrieved passages (passed threshold; not automatically claim-supporting)</p>
                {manualContext.retrievedPassages.map((p) => (
                  <article key={p.chunkId} className="rounded-xl border border-border bg-surface-muted p-3 text-sm">
                    <p className="font-medium">{p.manualTitle} — Page {p.pageNumber}</p>
                    <p className="mt-1 whitespace-pre-wrap leading-6 text-foreground/80">{p.passage}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                No candidate manual passages passed relevance thresholds for this query. Diagnosis, if available, is not grounded in uploaded manual passages.
              </p>
            )}
          </section>
        );
      })() : null}

      {blockedEscalation ? (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-4 shadow-sm">
          <h3 className="text-base font-semibold text-red-950">Repair guidance blocked — safe escalation required</h3>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-sm leading-6 text-red-950 font-sans">{blockedEscalation}</pre>
          <VoiceOutputControls language={form.language} diagnosis={null} safetyDecision={safetyDecision} blockedEscalation={blockedEscalation} />
        </section>
      ) : null}

      {result && !blockedEscalation ? <DiagnosisResultView diagnosis={result.diagnosis} model={result.model} language={form.language} safetyDecision={safetyDecision} imageUrl={previewUrl} /> : null}

      <IntegrationStatusPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <WatchdogStatusCard problemDescription={form.problemDescription} deterministicDecision={safetyDecision?.decision} />
        <AmbientAudioCard />
      </div>

      <MaintenancePanel
        diagnosisContext={
          form.problemDescription.trim() && (result || blockedEscalation || safetyDecision)
            ? {
                problemDescription: form.problemDescription.trim(),
                diagnosis: result?.diagnosis ?? null,
                model: result?.model,
                safetyDecision,
                blockedEscalation,
              }
            : null
        }
      />

      <RoboticsDataPanel
        diagnosisReference={result?.diagnosis ? `diagnosis:${form.problemDescription.trim().slice(0, 60)}` : null}
        safetyDecisionSummary={safetyDecision ? { decision: safetyDecision.decision, reason: safetyDecision.reason, safeNextAction: safetyDecision.safeNextAction, safetyCritical: safetyDecision.safetyCritical } : null}
      />
    </div>
  );
}
