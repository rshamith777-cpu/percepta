import type { WatchdogConfig } from './types';

export function getWatchdogConfig(): WatchdogConfig {
  const raw = (process.env.WATCHDOG_MODE ?? 'off').trim().toLowerCase();
  const mode = raw === 'local-runtime' || raw === 'local' ? 'local-runtime' : 'off';
  const url = (process.env.WATCHDOG_URL ?? '').trim() || undefined;
  const model = (process.env.WATCHDOG_MODEL ?? '').trim() || undefined;
  const timeoutMs = Math.max(500, Math.min(60000, Number(process.env.WATCHDOG_TIMEOUT_MS ?? '8000') || 8000));
  return { mode, url, model, timeoutMs, enabled: mode !== 'off' };
}
