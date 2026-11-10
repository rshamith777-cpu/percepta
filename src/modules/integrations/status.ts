import { getMissingServerConfig } from '@/lib/env';
import { getCmmsConfig } from './cmms';
import type { CmmsConfig } from './cmms';

export type IntegrationStatus =
  | 'implemented_verified'
  | 'implemented_requires_credentials'
  | 'configured_but_unverified'
  | 'partially_implemented'
  | 'blocked_by_credentials'
  | 'not_integrated'
  | 'failed';

export interface IntegrationCapability {
  id: string;
  name: string;
  status: IntegrationStatus;
  summary: string;
  details: string[];
  configHints?: string[];
}

export interface IntegrationStatusSnapshot {
  ok: true;
  generatedAt: string;
  notice: string;
  integrations: {
    gemini: 'configured_unverified' | 'unconfigured';
    geminiLiveStatusEndpoint: string;
    cmms: CmmsConfig;
  };
  capabilities: IntegrationCapability[];
}

export type DatabaseStatus = 'local_json_file_store' | 'configured_but_unverified';

export interface DatabaseStatusSnapshot {
  status: DatabaseStatus;
  configured: boolean;
  summary: string;
}

function boolEnv(name: string): boolean {
  return (process.env[name] ?? '').toLowerCase() === 'true';
}

export function getDatabaseStatus(): DatabaseStatusSnapshot {
  const sqliteStoreSelected = (process.env.KRIYAOS_MAINTENANCE_STORE ?? '').trim().toLowerCase() === 'sqlite';
  const databaseUrlConfigured = Boolean((process.env.DATABASE_URL ?? '').trim());

  if (sqliteStoreSelected) {
    return {
      status: 'configured_but_unverified',
      configured: true,
      summary: databaseUrlConfigured
        ? 'SQLite maintenance store selected with DATABASE_URL. Availability is verified only when the maintenance store is accessed; manual/robotics data remains on local JSON stores.'
        : 'SQLite maintenance store selected using the default local database file. Availability is verified only when the maintenance store is accessed; manual/robotics data remains on local JSON stores.',
    };
  }

  if (databaseUrlConfigured) {
    return {
      status: 'configured_but_unverified',
      configured: true,
      summary:
        'DATABASE_URL is configured, but KRIYAOS_MAINTENANCE_STORE is not set to sqlite; maintenance persistence remains on local JSON file stores.',
    };
  }

  return {
    status: 'local_json_file_store',
    configured: false,
    summary:
      'No DATABASE_URL or SQLite maintenance store selected. Maintenance/manual/robotics data uses local JSON file stores; the SQLite schema module remains optional.',
  };
}

export function getIntegrationStatusSnapshot(): IntegrationStatusSnapshot {
  const missing = getMissingServerConfig();
  const geminiKeyConfigured = !missing.includes('GOOGLE_AI_API_KEY');
  const cmms = getCmmsConfig();
  const watchdogMode = (process.env.WATCHDOG_MODE ?? 'off').trim().toLowerCase();
  const watchdogUrl = (process.env.WATCHDOG_URL ?? '').trim();
  const lyriaEnabled = boolEnv('LYRIA_ENABLED');
  const lyriaMode = (process.env.LYRIA_MODE ?? 'disabled').trim().toLowerCase();
  const lyriaCustomUrl = (process.env.LYRIA_CUSTOM_URL ?? '').trim();
  const firebaseConfigured = Boolean(
    (process.env.FIREBASE_PROJECT_ID ?? '').trim() || (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '').trim(),
  );
  const bigqueryConfigured = Boolean(
    (process.env.GOOGLE_CLOUD_PROJECT ?? '').trim() || (process.env.BIGQUERY_DATASET ?? '').trim(),
  );

  const capabilities: IntegrationCapability[] = [
    {
      id: 'gemini-diagnosis',
      name: 'Gemini diagnosis',
      status: geminiKeyConfigured ? 'configured_but_unverified' : 'implemented_requires_credentials',
      summary: geminiKeyConfigured
        ? 'Implemented server-side; API key configured but external diagnosis not verified in this session (quota/model/network can fail).'
        : 'Implemented server-side. Requires GOOGLE_AI_API_KEY; quota/model access needed for real responses.',
      details: [
        'Uses @google/genai with validated output and deterministic pre/post safety gates.',
        'Keys remain server-side. 429/timeouts/malformed output handled with graceful fallback (no fabricated diagnosis).',
      ],
      configHints: ['GOOGLE_AI_API_KEY', 'GEMINI_MODEL (optional)'],
    },
    {
      id: 'gemini-live',
      name: 'Gemini Live (real-time audio/video)',
      status: 'partially_implemented',
      summary: geminiKeyConfigured
        ? 'Status/scaffold only: an API key is present, but no realtime audio/session bridge is implemented or verified; no live session is available.'
        : 'Status/scaffold only: no API key and no realtime audio/session bridge; no fake live session is created.',
      details: [
        'SDK exports Live/Session are present, but verified real-time session lifecycle/audio bridge is not implemented.',
        'See GET /api/integrations/gemini-live/status for explicit config/runtime status.',
      ],
      configHints: ['GOOGLE_AI_API_KEY'],
    },
    {
      id: 'nano-banana',
      name: 'Nano Banana (official image generation/editing)',
      status: 'not_integrated',
      summary: 'No verified official Nano Banana image generation/editing integration.',
      details: [
        'Honest fallback: validated SVG annotations and 2D camera overlay (advisory). Never safety certification.',
        'Truthful status endpoint: /api/integrations/nano-banana/status (returns 503; no external call).',
      ],
      configHints: ['NANO_BANANA_ENABLED', 'NANO_BANANA_MODEL'],
    },
    {
      id: 'gemma-offline',
      name: 'Gemma / local safety watchdog',
      status: watchdogMode === 'local-runtime' && watchdogUrl ? 'configured_but_unverified' : 'partially_implemented',
      summary:
        watchdogMode === 'local-runtime' && watchdogUrl
          ? 'Local runtime configured (advisory). Real KriyaOS-to-Gemma inference must be verified with an actual synthetic response; config presence is not proof.'
          : 'Advisory Ollama-compatible client implemented; KriyaOS watchdog client behavior tested with mocks (prior baseline). No browser Gemma inference. Runtime/model presence requires verification.',
      details: [
        `Watchdog mode: ${watchdogMode}. Deterministic safety gate remains authoritative and is never overridden (BLOCK short-circuits runtime call).`,
        'No automatic model download. Use localhost endpoint only; treat model output as untrusted advisory data. Use /api/safety/watchdog for advisory checks when configured.',
      ],
      configHints: ['WATCHDOG_MODE', 'WATCHDOG_URL', 'WATCHDOG_MODEL'],
    },
    {
      id: 'lyria',
      name: 'Lyria (official)',
      status: lyriaEnabled && lyriaMode === 'custom' && Boolean(lyriaCustomUrl) ? 'configured_but_unverified' : 'not_integrated',
      summary:
        lyriaEnabled && lyriaMode === 'custom' && Boolean(lyriaCustomUrl)
          ? 'Custom ambient audio hook configured only; not a verified official Lyria integration.'
          : 'No official Lyria integration. Browser speech synthesis/custom hook fallback only; not presented as Lyria.',
      details: ['Ambient audio is optional, user-requested only, and never a safety-critical alarm.'],
      configHints: ['LYRIA_ENABLED', 'LYRIA_MODE', 'LYRIA_CUSTOM_URL'],
    },
    {
      id: 'google-agent-skills',
      name: 'Google Agent Skills (official)',
      status: 'not_integrated',
      summary: 'No verified official Google Agent Skills integration.',
      details: [
        'Generic prompts/local workflow helpers are not labeled as official Agent Skills.',
        'Truthful status endpoint: /api/integrations/agent-skills/status (returns 503; no external call).',
      ],
      configHints: ['GOOGLE_AGENT_SKILLS_ENABLED'],
    },
    {
      id: 'firebase-firestore',
      name: 'Firebase / Firestore',
      status: 'not_integrated',
      summary: firebaseConfigured
        ? 'Configuration hints detected, but no Firebase/Firestore SDK or verified read/write/upload operations are implemented.'
        : 'Not integrated/verified. No Firebase credentials/project configured.',
      details: [
        'Configuration hints are not evidence of connectivity; no silent upload of images/audio/maintenance data occurs. Local mode remains functional.',
        'Truthful status endpoint: /api/integrations/firebase/status (returns 503; no external call).',
      ],
      configHints: ['FIREBASE_ENABLED', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL'],
    },
    {
      id: 'bigquery',
      name: 'BigQuery',
      status: 'not_integrated',
      summary: bigqueryConfigured
        ? 'Configuration hints detected, but no BigQuery client, insert, or query is implemented; analytics cannot affect safety.'
        : 'Not integrated/verified. No GCP/BigQuery credentials configured.',
      details: [
        'Analytics must not influence safety decisions. Use server-side credentials and parameterized queries only if implemented.',
        'Truthful status/validation endpoint: /api/integrations/bigquery/status (GET 503; POST validates payload but performs no external ingest).',
      ],
      configHints: ['BIGQUERY_ENABLED', 'GOOGLE_CLOUD_PROJECT', 'BIGQUERY_DATASET', 'BIGQUERY_TABLE'],
    },
    {
      id: 'cloud-run',
      name: 'Cloud Run deployment',
      status: 'partially_implemented',
      summary: 'Deployment artifacts/config build-verified (Dockerfile, standalone, /api/health). Not deployed; no verified URL.',
      details: ['Docker/gcloud not available in this environment; no billable deploy performed.'],
      configHints: ['Docker', 'gcloud auth/project (explicit approval required to deploy)'],
    },
    {
      id: 'offline-sync',
      name: 'Offline application & synchronization',
      status: 'partially_implemented',
      summary: 'Service worker foundation never caches /api/*; /offline fallback; safety-preserving client-side maintenance draft queue foundation added. Full reliable sync not complete.',
      details: [
        'Draft queue stores local notes only (no safety/verification state). Manual/explicit sync intent required; no automatic safety-state mutations.',
        'Browser offline toggle/manual conflict resolution testing still required.',
      ],
    },
    {
      id: 'robotics',
      name: 'Robotics data collection',
      status: 'implemented_verified',
      summary: 'Local synthetic/consented robotics workflow implemented and previously runtime-verified (API/export/consent). No real hardware/external upload.',
      details: ['Synthetic/consented labels and metadata supported. Never command real robots; never authorize electrical maintenance.'],
    },
    {
      id: 'erp-cmms',
      name: 'Real ERP / CMMS',
      status: 'partially_implemented',
      summary:
        cmms.mode === 'configured'
          ? 'Configuration/credentials detected, but no real ERP/CMMS connector is implemented. No external system was contacted.'
          : 'Local simulator/adapter and export foundations only (synthetic/demo or disabled). No real ERP connection.',
      details: ['No fabricated ERP responses or fake work-order success. Human approval required for consequential records.'],
      configHints: ['CMMS_ENABLED', 'CMMS_PROVIDER', 'CMMS_BASE_URL', 'CMMS_API_KEY'],
    },
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    notice:
      'Truthful capability labels. "Configured/credentials present" does NOT mean verified external connectivity. Deterministic safety rules remain authoritative.',
    integrations: {
      gemini: geminiKeyConfigured ? 'configured_unverified' : 'unconfigured',
      geminiLiveStatusEndpoint: '/api/integrations/gemini-live/status',
      cmms,
    },
    capabilities,
  };
}

export function getCapability(
  snapshot: IntegrationStatusSnapshot,
  id: string,
): IntegrationCapability | undefined {
  return snapshot.capabilities.find((capability) => capability.id === id);
}

export function formatCapability(capability: IntegrationCapability | undefined): string {
  if (!capability) return 'status_unavailable: no authoritative capability record';
  return `${capability.status}: ${capability.summary}`;
}

export function getHealthStatus(
  capability: IntegrationCapability | undefined,
  suffix?: string,
): string {
  const status = capability?.status ?? 'failed';
  return suffix ? `${status}_${suffix}` : status;
}

export function getCmmsConnectionState(
  config: CmmsConfig,
): 'simulated' | 'configured_unverified' | 'disabled' {
  if (config.mode === 'demo') return 'simulated';
  if (config.mode === 'configured') return 'configured_unverified';
  return 'disabled';
}
