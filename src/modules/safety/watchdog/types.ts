import type { SafetyDecision } from '@/types';

export type WatchdogMode = 'off' | 'local-runtime';
export type WatchdogAvailability = 'disabled' | 'not_configured' | 'available' | 'loading' | 'unavailable' | 'timeout' | 'error';

export interface WatchdogConfig {
  mode: WatchdogMode;
  url?: string;
  model?: string;
  timeoutMs: number;
  enabled: boolean;
}

export interface WatchdogAdvisory {
  available: boolean;
  availability: WatchdogAvailability;
  mode: WatchdogMode;
  /** Configured/requested model name (local runtime may ignore if unavailable). */
  model?: string;
  /** Model reported by the local runtime, when available. */
  runtimeModel?: string;
  engine: string;
  offlineCapable: boolean;
  /** Advisory only. Never overrides deterministic safety gate, especially BLOCK decisions. */
  advisoryLabel?: 'caution' | 'review' | 'uncertain' | 'clear';
  rationale?: string;
  failedSafely: boolean;
  error?: string;
  checkedAt: string;
  deterministicDecisionContext?: SafetyDecision['decision'];
  /** Local inference measurement (advisory). Present only for actual runtime calls. */
  measurement?: {
    latencyMs: number;
    promptChars: number;
    responseChars?: number;
    runtimeReachable: boolean;
  };
  /** Honest capability note: local inference is advisory and requires a user-installed local runtime/model. */
  capabilityNote?: string;
}
