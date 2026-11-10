import type {
  AnnotationSet,
  AnnotationSource,
  AnnotationType,
  ArrowAnnotation,
  BoundingBoxAnnotation,
  PointAnnotation,
  VisualAnnotation,
} from './types';

const DEFAULT_SAFETY_DISCLAIMER =
  'Advisory visual aid only for synthetic or confirmed de-energized demo equipment. Not a safe-to-touch/open indicator. Camera/AI cannot verify electrical isolation or safety.';

const UNSAFE_ACTION_PATTERNS = [
  /\bopen\b.{0,40}\b(energized|live|panel|cover|enclosure)\b/i,
  /\btouch\b.{0,30}\b(live|energized|component|conductor|terminal)\b/i,
  /\b(remove|bypass|disconnect|repair|replace|rewire)\b.{0,40}\b(live|energized)\b/i,
  /\bwork\b.{0,20}\b(live|energized)\b/i,
  /\bsafe\s+to\s+(touch|open|handle|access)\b/i,
  /\belectrically\s+(isolated|de-?energized|safe)\b/i, // must not claim verification/safety from annotation
];

function isFinite01(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function asNonEmptyString(v: unknown, max = 240): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function isSafeAnnotationText(text: string): boolean {
  return !UNSAFE_ACTION_PATTERNS.some((p) => p.test(text));
}

function normalizeSource(v: unknown): AnnotationSource {
  if (v === 'manual_supported_reference' || v === 'visual_ai_observation' || v === 'advisory') return v;
  return 'advisory';
}

function normalizeType(v: unknown): AnnotationType | null {
  const allowed: AnnotationType[] = ['bounding_box', 'point', 'arrow', 'label', 'inspection_region'];
  return typeof v === 'string' && (allowed as string[]).includes(v) ? (v as AnnotationType) : null;
}

function normalizeConfidence(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  if (v < 0 || v > 1) return undefined;
  return Math.round(v * 100) / 100;
}

export function validateAnnotation(raw: unknown, index: number): VisualAnnotation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = normalizeType(r.type);
  const label = asNonEmptyString(r.label, 120);
  const explanation = asNonEmptyString(r.explanation, 240) ?? undefined;
  if (!type || !label) return null;
  const combinedText = `${label} ${explanation ?? ''}`;
  if (!isSafeAnnotationText(combinedText)) return null; // reject unsafe/actionable or false safety claims

  const idRaw = asNonEmptyString(r.id, 80);
  const id = idRaw && /^[a-zA-Z0-9_-]+$/.test(idRaw) ? idRaw : `ann-${index + 1}`;
  const base = {
    id,
    type,
    label,
    explanation,
    confidence: normalizeConfidence(r.confidence),
    source: normalizeSource(r.source),
    safetyDisclaimer: asNonEmptyString(r.safetyDisclaimer, 240) ?? DEFAULT_SAFETY_DISCLAIMER,
  };

  if (type === 'bounding_box' || type === 'inspection_region') {
    if (![r.x, r.y, r.width, r.height].every(isFinite01)) return null;
    const x = clamp01(r.x as number);
    const y = clamp01(r.y as number);
    let width = clamp01(r.width as number);
    let height = clamp01(r.height as number);
    if (width < 0.005 || height < 0.005) return null;
    if (x + width > 1) width = Math.max(0.005, 1 - x);
    if (y + height > 1) height = Math.max(0.005, 1 - y);
    const ann: BoundingBoxAnnotation = { ...base, type, x, y, width, height };
    return ann;
  }
  if (type === 'point' || type === 'label') {
    if (!isFinite01(r.x) || !isFinite01(r.y)) return null;
    const ann: PointAnnotation = { ...base, type, x: clamp01(r.x), y: clamp01(r.y) };
    return ann;
  }
  if (type === 'arrow') {
    if (![r.x1, r.y1, r.x2, r.y2].every(isFinite01)) return null;
    const ann: ArrowAnnotation = {
      ...base,
      type,
      x1: clamp01(r.x1 as number),
      y1: clamp01(r.y1 as number),
      x2: clamp01(r.x2 as number),
      y2: clamp01(r.y2 as number),
    };
    return ann;
  }
  return null;
}

export function normalizeAnnotationSet(input: {
  annotations: unknown;
  annotationAvailability?: unknown;
  annotationExplanation?: unknown;
  diagnosisBlocked?: boolean;
}): AnnotationSet {
  if (input.diagnosisBlocked) {
    return {
      annotations: [],
      availability: 'unavailable',
      explanation: 'Actionable or advisory visual annotations are not shown because diagnosis guidance was blocked by the deterministic safety gate.',
    };
  }

  const rawList = Array.isArray(input.annotations) ? input.annotations : [];
  const validated: VisualAnnotation[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawList.length && validated.length < 12; i += 1) {
    const ann = validateAnnotation(rawList[i], i);
    if (!ann) continue;
    if (seen.has(ann.id)) ann.id = `${ann.id}-${validated.length + 1}`;
    seen.add(ann.id);
    validated.push(ann);
  }

  if (validated.length === 0) {
    const explicit = typeof input.annotationExplanation === 'string' && input.annotationExplanation.trim()
      ? input.annotationExplanation.trim().slice(0, 400)
      : null;
    return {
      annotations: [],
      availability: 'unavailable',
      explanation:
        explicit ??
        'No reliable image-grounded component locations were available from the analysis. Annotations are not fabricated; use the original image and advisory diagnosis text.',
    };
  }

  return {
    annotations: validated,
    availability: 'available',
    explanation:
      typeof input.annotationExplanation === 'string' && input.annotationExplanation.trim()
        ? input.annotationExplanation.trim().slice(0, 400)
        : 'Annotations are advisory visual highlights based on the model analysis. Locations may be approximate and are not verified measurements.',
  };
}

export function getDefaultAnnotationSafetyDisclaimer(): string {
  return DEFAULT_SAFETY_DISCLAIMER;
}
