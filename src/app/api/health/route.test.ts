import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getHealth } from './route';
import { GET as getStatus } from '../integrations/status/route';

const savedEnv = { ...process.env };
const configKeys = [
  'GOOGLE_AI_API_KEY',
  'DATABASE_URL',
  'KRIYAOS_MAINTENANCE_STORE',
  'FIREBASE_ENABLED',
  'FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'BIGQUERY_ENABLED',
  'GOOGLE_CLOUD_PROJECT',
  'BIGQUERY_DATASET',
  'WATCHDOG_MODE',
  'WATCHDOG_URL',
  'CMMS_ENABLED',
  'CMMS_PROVIDER',
  'CMMS_BASE_URL',
  'CMMS_API_KEY',
  'LYRIA_ENABLED',
  'LYRIA_MODE',
  'LYRIA_CUSTOM_URL',
];

interface Capability {
  id: string;
  status: string;
}

interface HealthResponse {
  ok?: boolean;
  source?: string;
  integrations?: {
    geminiDiagnosis?: string;
    geminiLive?: string;
    database?: string;
    watchdog?: string;
    cmms?: {
      mode?: string;
      connectionState?: string;
      summary?: string;
    };
    firebaseFirestore?: string;
    bigquery?: string;
    cloudRun?: string;
  };
  features?: Record<string, string>;
  notice?: string;
}

function resetEnv() {
  process.env = { ...savedEnv };
  for (const key of configKeys) delete process.env[key];
}

async function statusCapabilities(): Promise<Map<string, Capability>> {
  const res = await getStatus();
  expect(res.status).toBe(200);
  const data = (await res.json()) as { capabilities?: Capability[] };
  return new Map((data.capabilities ?? []).map((capability) => [capability.id, capability]));
}

async function health(): Promise<HealthResponse> {
  const res = await getHealth();
  expect(res.status).toBe(200);
  return (await res.json()) as HealthResponse;
}

function statusOf(capabilities: Map<string, Capability>, id: string): string {
  const capability = capabilities.get(id);
  expect(capability, `missing capability ${id}`).toBeTruthy();
  return capability?.status ?? '';
}

beforeEach(resetEnv);
afterEach(() => { process.env = savedEnv; });

describe('health integration truthfulness', () => {
  it('matches authoritative statuses and keeps safety authoritative when integrations are unavailable', async () => {
    const capabilities = await statusCapabilities();
    const data = await health();
    const integrations = data.integrations ?? {};

    expect(data.ok).toBe(true);
    expect(data.source).toBe('/api/integrations/status');
    expect(integrations.geminiDiagnosis).toBe(statusOf(capabilities, 'gemini-diagnosis'));
    expect(integrations.geminiLive).toBe(`${statusOf(capabilities, 'gemini-live')}_no_realtime_bridge`);
    expect(integrations.watchdog).toBe(`${statusOf(capabilities, 'gemma-offline')}_advisory`);
    expect(integrations.firebaseFirestore).toBe(statusOf(capabilities, 'firebase-firestore'));
    expect(integrations.bigquery).toBe(statusOf(capabilities, 'bigquery'));
    expect(integrations.cloudRun).toBe(statusOf(capabilities, 'cloud-run'));
    expect(integrations.database).toBe('local_json_file_store');
    expect(integrations.cmms?.mode).toBe('disabled');
    expect(integrations.cmms?.connectionState).toBe('disabled');
    expect(integrations.cmms?.summary).toMatch(/No real ERP connection/i);
    expect(data.features?.deterministicSafetyGate).toBe('available_authoritative');
    expect(data.notice).toMatch(/cannot override safety decisions/i);
  });

  it('reports configured integrations as unavailable or unverified, never live', async () => {
    process.env.GOOGLE_AI_API_KEY = 'dummy-key-not-used';
    process.env.DATABASE_URL = 'file:./dummy.db';
    process.env.FIREBASE_PROJECT_ID = 'demo-project';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-project';
    process.env.BIGQUERY_ENABLED = 'true';
    process.env.GOOGLE_CLOUD_PROJECT = 'demo-project';
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'generic';
    process.env.CMMS_BASE_URL = 'https://example.invalid';
    process.env.CMMS_API_KEY = 'dummy-key-not-used';
    process.env.WATCHDOG_MODE = 'local-runtime';
    process.env.WATCHDOG_URL = 'http://127.0.0.1:11434/api/generate';

    const data = await health();
    const integrations = data.integrations ?? {};

    expect(integrations.geminiDiagnosis).toBe('configured_but_unverified');
    expect(integrations.geminiLive).toBe('partially_implemented_no_realtime_bridge');
    expect(integrations.watchdog).toBe('configured_but_unverified_advisory');
    expect(integrations.firebaseFirestore).toBe('not_integrated');
    expect(integrations.bigquery).toBe('not_integrated');
    expect(integrations.cloudRun).toBe('partially_implemented');
    expect(integrations.database).toBe('configured_but_unverified');
    expect(integrations.cmms?.mode).toBe('configured');
    expect(integrations.cmms?.connectionState).toBe('configured_unverified');
    expect(integrations.cmms?.summary).toMatch(/no real ERP\/CMMS connector is implemented/i);
    expect(integrations.watchdog).not.toBe('available');
    expect(JSON.stringify(data)).not.toContain('dummy-key-not-used');
    expect(JSON.stringify(data)).not.toContain('https://example.invalid');
  });

  it('reports selected SQLite persistence as configured, not verified live', async () => {
    process.env.KRIYAOS_MAINTENANCE_STORE = 'sqlite';

    const data = await health();
    expect(data.integrations?.database).toBe('configured_but_unverified');
  });

  it('marks the demo CMMS adapter as simulated, not a real connection', async () => {
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'demo';

    const data = await health();
    const cmms = data.integrations?.cmms;

    expect(cmms?.mode).toBe('demo');
    expect(cmms?.connectionState).toBe('simulated');
    expect(cmms?.summary).toMatch(/Local simulator\/adapter/i);
    expect(cmms?.summary).toMatch(/No real ERP connection/i);
    expect(cmms?.summary).not.toMatch(/\bconnected\b/i);
  });

  it('does not let integration health override the deterministic safety gate', async () => {
    process.env.GOOGLE_AI_API_KEY = 'dummy-key-not-used';
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'demo';

    const data = await health();
    expect(data.features?.deterministicSafetyGate).toBe('available_authoritative');
    expect(data.notice).toMatch(/Deterministic safety gate is authoritative/i);
  });
});
