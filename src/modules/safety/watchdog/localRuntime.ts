import { getWatchdogConfig } from './config';
import type { WatchdogAdvisory } from './types';
import type { SafetyDecision } from '@/types';

function nowIso() { return new Date().toISOString(); }

function safeUnavailable(reason: string, availability: WatchdogAdvisory['availability'], deterministicDecision?: SafetyDecision['decision']): WatchdogAdvisory {
  const cfg = getWatchdogConfig();
  return {
    available: false,
    availability,
    mode: cfg.mode,
    model: cfg.model,
    engine: 'local-runtime-watchdog',
    offlineCapable: cfg.mode === 'local-runtime' && Boolean(cfg.url),
    failedSafely: true,
    error: reason,
    checkedAt: nowIso(),
    deterministicDecisionContext: deterministicDecision,
  };
}

const BLOCK_PATTERNS = [/energized|live|mains|bypass interlock|touch .*component|open .*panel while/i, /unsure|uncertain|unknown|not sure|not isolated/i];

const CAPABILITY_NOTE =
  'Local Gemma/runtime inference is advisory only and never overrides the deterministic safety gate. It requires a user-installed local runtime (e.g., Ollama-compatible endpoint on localhost) and a model installed locally. No automatic model download is performed.';

export function classifyWatchdogText(text: string): NonNullable<WatchdogAdvisory['advisoryLabel']> {
  const t = text.toLowerCase();
  if (BLOCK_PATTERNS.some((p) => p.test(t))) return 'caution';
  if (/smell|smoke|burn|spark|shock|fire|damage/i.test(t)) return 'review';
  return 'uncertain';
}

export async function runLocalRuntimeWatchdog(input: {
  problemDescription: string;
  deterministicDecision?: SafetyDecision['decision'];
}): Promise<WatchdogAdvisory> {
  const cfg = getWatchdogConfig();
  if (cfg.mode === 'off') {
    return { ...safeUnavailable('Local safety watchdog/Gemma local inference is disabled (WATCHDOG_MODE=off). Deterministic safety gate remains active.', 'disabled', input.deterministicDecision), capabilityNote: CAPABILITY_NOTE };
  }
  if (!cfg.url) {
    return { ...safeUnavailable('WATCHDOG_URL is not configured for local runtime inference. No local model was contacted.', 'not_configured', input.deterministicDecision), capabilityNote: CAPABILITY_NOTE };
  }

  // Deterministic BLOCK is authoritative. The watchdog may add advisory context but never override/blocking authority is preserved by callers.
  if (input.deterministicDecision === 'block') {
    return {
      available: true,
      availability: 'available',
      mode: cfg.mode,
      model: cfg.model,
      engine: 'deterministic-gate-precedence',
      offlineCapable: true,
      advisoryLabel: 'caution',
      rationale: 'Deterministic safety gate is BLOCK. Local watchdog advisory cannot override a BLOCK decision.',
      failedSafely: true,
      checkedAt: nowIso(),
      deterministicDecisionContext: 'block',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const started = Date.now();
  const prompt = `You are a local safety/Gemma advisory classifier for solar inverter maintenance demos. Do NOT verify electrical isolation, energized state, or safe-to-touch conditions. Classify the technician report as one of: caution, review, uncertain, clear. Return JSON {"label":"...","rationale":"short reason"}.\nTechnician report: ${input.problemDescription.slice(0, 1500)}`;
  try {
    // Conservative local-runtime request shape (Ollama-compatible). User configures a local endpoint; no cloud service is required.
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model ?? 'gemma', prompt, stream: false, format: 'json' }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ...safeUnavailable(`Local runtime returned ${res.status}: ${text.slice(0, 200)}`, 'unavailable', input.deterministicDecision), measurement: { latencyMs, promptChars: prompt.length, runtimeReachable: true }, capabilityNote: CAPABILITY_NOTE };
    }
    const data = (await res.json()) as { response?: string; message?: { content?: string }; label?: string; rationale?: string; model?: string };
    const raw = typeof data.response === 'string' ? data.response : typeof data.message?.content === 'string' ? data.message.content : JSON.stringify(data);
    let label: WatchdogAdvisory['advisoryLabel'];
    let rationale = 'Local model advisory returned.';
    try {
      const parsed = JSON.parse(raw) as { label?: string; rationale?: string };
      if (parsed.label === 'caution' || parsed.label === 'review' || parsed.label === 'uncertain' || parsed.label === 'clear') label = parsed.label;
      if (typeof parsed.rationale === 'string') rationale = parsed.rationale.slice(0, 300);
    } catch {
      label = classifyWatchdogText(raw || input.problemDescription);
      rationale = 'Local model response was not strict JSON; applied safe heuristic classification to advisory output.';
    }
    label ??= classifyWatchdogText(input.problemDescription);
    return {
      available: true,
      availability: 'available',
      mode: cfg.mode,
      model: cfg.model,
      runtimeModel: typeof data.model === 'string' ? data.model : undefined,
      engine: 'local-runtime-watchdog',
      offlineCapable: true,
      advisoryLabel: label,
      rationale: `${rationale} Advisory only; deterministic safety gate remains authoritative and can block regardless of watchdog/local Gemma output.`,
      failedSafely: false,
      checkedAt: nowIso(),
      deterministicDecisionContext: input.deterministicDecision,
      measurement: { latencyMs, promptChars: prompt.length, responseChars: raw.length, runtimeReachable: true },
      capabilityNote: CAPABILITY_NOTE,
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    if ((error as Error).name === 'AbortError') return { ...safeUnavailable(`Local runtime timed out after ${cfg.timeoutMs}ms.`, 'timeout', input.deterministicDecision), measurement: { latencyMs, promptChars: prompt.length, runtimeReachable: false }, capabilityNote: CAPABILITY_NOTE };
    return { ...safeUnavailable(error instanceof Error ? error.message : String(error), 'error', input.deterministicDecision), measurement: { latencyMs, promptChars: prompt.length, runtimeReachable: false }, capabilityNote: CAPABILITY_NOTE };
  } finally {
    clearTimeout(timeout);
  }
}

export function getWatchdogStatus(): WatchdogAdvisory {
  const cfg = getWatchdogConfig();
  if (cfg.mode === 'off') return safeUnavailable('Local safety watchdog is disabled (WATCHDOG_MODE=off). Deterministic safety gate remains active.', 'disabled');
  if (!cfg.url) return safeUnavailable('WATCHDOG_URL is not configured for local-runtime watchdog.', 'not_configured');
  return {
    available: true,
    availability: 'available',
    mode: cfg.mode,
    model: cfg.model,
    engine: 'local-runtime-watchdog',
    offlineCapable: true,
    failedSafely: false,
    rationale: 'Local runtime watchdog is configured. It provides advisory classification only and never overrides the deterministic safety gate. Use a local endpoint (e.g., localhost) to avoid cloud transmission of safety-check text.',
    checkedAt: nowIso(),
  };
}
