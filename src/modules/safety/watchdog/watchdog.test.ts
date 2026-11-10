import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyWatchdogText, getWatchdogStatus, runLocalRuntimeWatchdog } from './localRuntime';

describe('Local safety watchdog', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env = { ...env };
    delete process.env.WATCHDOG_MODE;
    delete process.env.WATCHDOG_URL;
    delete process.env.WATCHDOG_MODEL;
    vi.restoreAllMocks();
  });
  afterEach(() => { process.env = { ...env }; vi.restoreAllMocks(); });

  it('reports disabled by default', () => {
    const status = getWatchdogStatus();
    expect(status.availability).toBe('disabled');
    expect(status.available).toBe(false);
  });

  it('reports not configured when enabled without URL', () => {
    process.env.WATCHDOG_MODE = 'local-runtime';
    const status = getWatchdogStatus();
    expect(status.availability).toBe('not_configured');
  });

  it('fails safely on runtime/network failure', async () => {
    process.env.WATCHDOG_MODE = 'local-runtime';
    process.env.WATCHDOG_URL = 'http://127.0.0.1:9/unavailable';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect failed'); }));
    const res = await runLocalRuntimeWatchdog({ problemDescription: 'fan noise', deterministicDecision: 'caution' });
    expect(res.available).toBe(false);
    expect(res.failedSafely).toBe(true);
    expect(res.availability).toMatch(/error|unavailable/);
  });

  it('fails safely on timeout', async () => {
    process.env.WATCHDOG_MODE = 'local-runtime';
    process.env.WATCHDOG_URL = 'http://127.0.0.1:11434/api/generate';
    process.env.WATCHDOG_TIMEOUT_MS = '5';
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const e = new Error('aborted');
        e.name = 'AbortError';
        reject(e);
      });
    })));
    const res = await runLocalRuntimeWatchdog({ problemDescription: 'fan noise', deterministicDecision: 'caution' });
    expect(res.available).toBe(false);
    expect(res.availability).toBe('timeout');
    expect(res.failedSafely).toBe(true);
  });

  it('never overrides deterministic BLOCK decision', async () => {
    process.env.WATCHDOG_MODE = 'local-runtime';
    process.env.WATCHDOG_URL = 'http://127.0.0.1:11434/api/generate';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await runLocalRuntimeWatchdog({ problemDescription: 'live wire exposed', deterministicDecision: 'block' });
    expect(res.deterministicDecisionContext).toBe('block');
    expect(res.advisoryLabel).toBe('caution');
    expect(res.rationale).toMatch(/cannot override/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('heuristic classifier is conservative for uncertain/energized language', () => {
    expect(classifyWatchdogText('I am not sure if the inverter is isolated')).toBe('caution');
    expect(classifyWatchdownTextFallback('smoke from DC terminals')).toMatch(/review|caution/);
  });

  it('returns advisory measurement when local runtime responds (mocked, no model download)', async () => {
    process.env.WATCHDOG_MODE = 'local-runtime';
    process.env.WATCHDOG_URL = 'http://127.0.0.1:11434/api/generate';
    process.env.WATCHDOG_MODEL = 'gemma3:1b';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      model: 'gemma3:1b',
      response: '{"label":"review","rationale":"smoke mentioned"}',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const res = await runLocalRuntimeWatchdog({ problemDescription: 'smell from inverter', deterministicDecision: 'caution' });
    expect(res.available).toBe(true);
    expect(res.advisoryLabel).toBe('review');
    expect(res.runtimeModel).toBe('gemma3:1b');
    expect(res.measurement?.runtimeReachable).toBe(true);
    expect(typeof res.measurement?.latencyMs).toBe('number');
    expect(res.capabilityNote).toMatch(/advisory only/i);
    expect(res.capabilityNote).toMatch(/never overrides/i);
  });
});

function classifyWatchdownTextFallback(t: string) { return classifyWatchdogText(t); }
