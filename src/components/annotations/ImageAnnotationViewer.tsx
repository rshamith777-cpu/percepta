'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AnnotationSet, AnnotationSource, VisualAnnotation } from '@/modules/annotations/types';
import { computeObjectContainRect } from '@/modules/annotations/overlayLayout';

import { classifyCameraError, type CameraPermissionState } from '@/modules/camera/cameraPermissions';

function sourceLabel(source: AnnotationSource): string {
  if (source === 'visual_ai_observation') return 'Visual AI observation';
  if (source === 'manual_supported_reference') return 'Manual-supported reference';
  return 'Advisory annotation';
}

function sourceStroke(source: AnnotationSource): string {
  if (source === 'visual_ai_observation') return '#2563eb';
  if (source === 'manual_supported_reference') return '#7c3aed';
  return '#d97706';
}

function sourceFill(source: AnnotationSource): string {
  if (source === 'visual_ai_observation') return 'rgba(37,99,235,0.10)';
  if (source === 'manual_supported_reference') return 'rgba(124,58,237,0.10)';
  return 'rgba(217,119,6,0.10)';
}



export function ImageAnnotationViewer({
  imageUrl,
  annotationSet,
}: {
  imageUrl: string | null;
  annotationSet?: AnnotationSet | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [drawRect, setDrawRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Live camera overlay (2D advisory fallback) — not spatial AR tracking.
  const liveContainerRef = useRef<HTMLDivElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const [liveRect, setLiveRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [liveMode, setLiveMode] = useState(false);
  const [cameraState, setCameraState] = useState<CameraPermissionState>('idle');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [webxrArSupported, setWebxrArSupported] = useState<boolean | null>(null);

  const annotations = useMemo(() => annotationSet?.annotations ?? [], [annotationSet]);
  const selected = useMemo(() => annotations.find((a) => a.id === selectedId) ?? null, [annotations, selectedId]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;
    const c = container.getBoundingClientRect();
    setDrawRect(computeObjectContainRect(c.width, c.height, img.naturalWidth, img.naturalHeight));
  }, []);

  const measureLive = useCallback(() => {
    const container = liveContainerRef.current;
    const video = liveVideoRef.current;
    if (!container || !video || !video.videoWidth || !video.videoHeight) return;
    const c = container.getBoundingClientRect();
    setLiveRect(computeObjectContainRect(c.width, c.height, video.videoWidth, video.videoHeight));
  }, []);

  useEffect(() => {
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (containerRef.current) ro?.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, imageUrl]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const xr = (navigator as Navigator & { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
        if (xr?.isSessionSupported) {
          const supported = await xr.isSessionSupported('immersive-ar');
          if (active) setWebxrArSupported(Boolean(supported));
        } else if (active) setWebxrArSupported(false);
      } catch { if (active) setWebxrArSupported(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!liveMode) return;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureLive()) : null;
    if (liveContainerRef.current) ro?.observe(liveContainerRef.current);
    window.addEventListener('resize', measureLive);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measureLive); };
  }, [liveMode, measureLive]);

  useEffect(() => () => {
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
  }, []);

  const activeSelectedId = selected?.id ?? null;
  // Hydration-safe: server snapshot false; client detects browser API (stable per load).
  const cameraSupported = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );

  function stopLiveOverlay(clearState = true) {
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    setLiveMode(false);
    if (clearState) {
      setCameraState((s) => (s === 'granted' ? 'idle' : s));
      setCameraMessage(null);
    }
  }

  async function startLiveOverlay() {
    setCameraMessage(null);
    if (!cameraSupported) {
      setCameraState('unsupported');
      setCameraMessage('Live camera access is not supported in this browser. The uploaded image/static annotation fallback remains available.');
      setLiveMode(false);
      return;
    }
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      liveStreamRef.current?.getTracks().forEach((t) => t.stop());
      liveStreamRef.current = stream;
      setLiveMode(true);
      setCameraState('granted');
      setCameraMessage(null);
      setTimeout(() => {
        const video = liveVideoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => {
            setCameraState('error');
            setCameraMessage('Camera stream started but video playback failed. The uploaded image/static fallback remains available.');
          });
          video.onloadedmetadata = () => measureLive();
        }
      }, 0);
    } catch (e) {
      const classified = classifyCameraError(e);
      setCameraState(classified.state);
      setCameraMessage(classified.message);
      setLiveMode(false);
    }
  }

  const renderShape = (a: VisualAnnotation) => {
    const common = {
      stroke: sourceStroke(a.source),
      fill: sourceFill(a.source),
      strokeWidth: activeSelectedId === a.id ? 3 : 2,
      vectorEffect: 'non-scaling-stroke' as const,
      style: { cursor: 'pointer' as const },
      onClick: () => setSelectedId((id) => (id === a.id ? null : a.id)),
    };
    if (a.type === 'bounding_box' || a.type === 'inspection_region') {
      return <rect key={a.id} x={a.x * 100} y={a.y * 100} width={a.width * 100} height={a.height * 100} rx={0.8} {...common} />;
    }
    if (a.type === 'point' || a.type === 'label') {
      return (
        <g key={a.id} onClick={() => setSelectedId((id) => (id === a.id ? null : a.id))} style={{ cursor: 'pointer' }}>
          <circle cx={a.x * 100} cy={a.y * 100} r={activeSelectedId === a.id ? 2.2 : 1.6} stroke={sourceStroke(a.source)} fill={sourceFill(a.source)} strokeWidth={activeSelectedId === a.id ? 0.7 : 0.5} />
        </g>
      );
    }
    if (a.type === 'arrow') {
      return (
        <g key={a.id} onClick={() => setSelectedId((id) => (id === a.id ? null : a.id))} style={{ cursor: 'pointer' }}>
          <line x1={a.x1 * 100} y1={a.y1 * 100} x2={a.x2 * 100} y2={a.y2 * 100} stroke={sourceStroke(a.source)} strokeWidth={activeSelectedId === a.id ? 0.9 : 0.6} markerEnd="url(#kriya-arrow)" />
        </g>
      );
    }
    return null;
  };

  const overlaySvg = (rect: { x: number; y: number; width: number; height: number }) => showOverlays && annotations.length > 0 && rect.width > 0 ? (
    <svg className="pointer-events-auto absolute" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Advisory annotation overlay">
      <defs>
        <marker id="kriya-arrow" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#d97706" />
        </marker>
      </defs>
      {annotations.map(renderShape)}
    </svg>
  ) : null;

  if (!imageUrl) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm text-foreground/70">
        No image is available for annotation overlay. Upload/capture an image before diagnosis.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/65">Visual annotation / AR fallback (advisory)</h3>
          <p className="mt-1 text-sm leading-6 text-foreground/75">
            The default static image overlay is the reliable fallback. A live camera overlay is provided as a <strong>2D advisory view only</strong> (no spatial AR tracking, no depth, no measurements, no object tracking). Locations may be approximate and are <strong>not pixel-perfect or guaranteed accurate</strong>. This feature does <strong>not</strong> identify electrically safe areas and must not be used to decide whether equipment is safe to touch or open.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowOverlays((v) => !v)} className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium">
            {showOverlays ? 'Hide annotations' : 'Show annotations'}
          </button>
          {!liveMode ? (
            <button type="button" onClick={startLiveOverlay} disabled={cameraState === 'requesting'} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-60">
              {cameraState === 'requesting' ? 'Requesting camera…' : 'Start 2D camera overlay'}
            </button>
          ) : (
            <button type="button" onClick={() => stopLiveOverlay(true)} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium">Stop camera overlay</button>
          )}
          {!liveMode && ['denied', 'dismissed', 'unavailable', 'unsupported', 'error'].includes(cameraState) ? (
            <button type="button" onClick={startLiveOverlay} className="rounded-full border border-brand/40 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand-strong">Retry camera</button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 text-xs text-foreground/65">
        <p>Capability status: camera API {cameraSupported ? 'available' : 'unsupported/unavailable'}; WebXR immersive AR {webxrArSupported == null ? 'checking…' : webxrArSupported ? 'reported supported by browser (not used for tracked overlays in this fallback)' : 'not supported / unavailable'}.</p>
        <p className="mt-1">Camera permission state: <strong>{cameraState}</strong>{cameraState === 'granted' && liveMode ? ' (live 2D overlay active)' : ''}. Uploaded image/static annotation fallback remains available.</p>
        {liveMode ? <p className="mt-1 font-medium text-amber-900">Live view is a 2D camera overlay, not real-time AR tracking. Annotation coordinates are static normalized values and are not spatially tracked to moving equipment.</p> : null}
        {cameraMessage ? <p className={`mt-1 ${cameraState === 'granted' ? 'text-foreground/70' : 'text-amber-900'}`}>{cameraMessage}</p> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-900"><span className="h-2.5 w-2.5 rounded-sm border-2 border-blue-600" />Visual AI observation</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-900"><span className="h-2.5 w-2.5 rounded-sm border-2 border-violet-600" />Manual-supported reference</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-950"><span className="h-2.5 w-2.5 rounded-sm border-2 border-amber-600" />Advisory annotation</span>
      </div>

      {!liveMode ? (
        <div ref={containerRef} className="relative mt-3 w-full overflow-hidden rounded-xl border border-border bg-surface-muted" style={{ minHeight: 180 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={imageUrl} alt="Original uploaded equipment image with optional advisory annotations" className="block max-h-[min(70vh,520px)] w-full object-contain" onLoad={measure} />
          {overlaySvg(drawRect)}
        </div>
      ) : (
        <div ref={liveContainerRef} className="relative mt-3 w-full overflow-hidden rounded-xl border border-amber-300 bg-black" style={{ minHeight: 220 }}>
          <video ref={liveVideoRef} muted playsInline autoPlay className="block max-h-[min(70vh,520px)] w-full object-contain" onLoadedMetadata={measureLive} />
          {overlaySvg(liveRect)}
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-amber-100/90 px-2 py-1 text-[11px] font-medium text-amber-950">2D camera overlay — not spatial AR tracking</div>
        </div>
      )}

      {annotationSet ? (
        <p className="mt-3 text-sm leading-6 text-foreground/80">
          <strong>Availability:</strong> {annotationSet.availability === 'available' ? 'Advisory annotations available (validated)' : 'No annotations shown'} — {annotationSet.explanation}
        </p>
      ) : (
        <p className="mt-3 text-sm text-foreground/70">Run diagnosis to check for advisory, image-grounded annotations. If reliable locations are unavailable, no annotations are fabricated.</p>
      )}

      {annotations.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {annotations.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelectedId((id) => (id === a.id ? null : a.id))} className={`rounded-xl border p-3 text-left text-sm ${activeSelectedId === a.id ? 'border-foreground/30 bg-surface-muted' : 'border-border bg-surface'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{sourceLabel(a.source)}</span>
                {typeof a.confidence === 'number' ? <span className="text-[11px] text-foreground/65">Confidence: {(a.confidence * 100).toFixed(0)}%</span> : null}
              </div>
              <p className="mt-1 text-foreground/75">{a.explanation ?? 'Advisory highlight only; not a measurement or safety indicator.'}</p>
              <p className="mt-1 text-xs text-foreground/60">{a.safetyDisclaimer}</p>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="mt-3 rounded-xl border border-border bg-surface-muted p-3 text-sm">
          <p className="font-semibold">Selected annotation</p>
          <p className="mt-1"><strong>{selected.label}</strong> — {sourceLabel(selected.source)}</p>
          <p className="mt-1 text-foreground/80">{selected.explanation ?? 'No additional explanation provided.'}</p>
          <p className="mt-1 text-xs text-foreground/65">{selected.safetyDisclaimer}</p>
        </div>
      ) : null}

      <p className="mt-3 rounded-xl border border-red-100 bg-red-50/60 p-3 text-xs leading-5 text-red-950">
        <strong>Safety:</strong> Synthetic or confirmed de-energized demo equipment only. Annotations never override safety warnings or manual citations. No annotation indicates an electrically safe area, safe-to-touch/open condition, or verified isolation. Live camera overlay is not spatial AR tracking and provides no measurement or safety verification.
      </p>
    </section>
  );
}
