import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getParent } from './route';
import { GET as getStatus } from './status/route';

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
  summary: string;
}

interface ParentResponse {
  ok?: boolean;
  endpoint?: string;
  source?: string;
  integrations?: Record<string, string>;
  features?: Record<string, string>;
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

async function parent(): Promise<ParentResponse> {
  const res = await getParent();
  expect(res.status).toBe(200);
  return (await res.json()) as ParentResponse;
}

beforeEach(resetEnv);
afterEach(() => { process.env = savedEnv; });

describe('parent integration summary truthfulness', () => {
  it('derives every summary from the authoritative integration status', async () => {
    const capabilities = await statusCapabilities();
    const data = await parent();

    expect(data.ok).toBe(true);
    expect(data.endpoint).toBe('/api/integrations');
    expect(data.source).toBe('/api/integrations/status');
    expect(data.integrations?.geminiDiagnosis).toContain(capabilities.get('gemini-diagnosis')?.status);
    expect(data.integrations?.geminiLive).toContain(capabilities.get('gemini-live')?.status);
    expect(data.integrations?.watchdog).toContain(capabilities.get('gemma-offline')?.status);
    expect(data.integrations?.cmms).toContain(capabilities.get('erp-cmms')?.status);
    expect(data.integrations?.firebaseFirestore).toContain(capabilities.get('firebase-firestore')?.status);
    expect(data.integrations?.bigquery).toContain(capabilities.get('bigquery')?.status);
    expect(data.integrations?.cloudRun).toContain(capabilities.get('cloud-run')?.status);
    expect(data.integrations?.database).toMatch(/local JSON file stores/i);
    expect(data.features?.deterministicSafetyGate).toBe('available_authoritative');
  });

  it('does not turn configuration hints into live connections', async () => {
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

    const data = await parent();
    const integrations = data.integrations ?? {};

    expect(integrations.geminiDiagnosis).toMatch(/^configured_but_unverified:/);
    expect(integrations.geminiLive).toMatch(/^partially_implemented:/);
    expect(integrations.geminiLive).toMatch(/no realtime audio\/session bridge/i);
    expect(integrations.watchdog).toMatch(/^configured_but_unverified:/);
    expect(integrations.watchdog).toMatch(/advisory/i);
    expect(integrations.firebaseFirestore).toMatch(/^not_integrated:/);
    expect(integrations.firebaseFirestore).toMatch(/Configuration hints detected/i);
    expect(integrations.bigquery).toMatch(/^not_integrated:/);
    expect(integrations.bigquery).toMatch(/Configuration hints detected/i);
    expect(integrations.cmms).toMatch(/^partially_implemented:/);
    expect(integrations.cmms).toMatch(/no real ERP\/CMMS connector is implemented/i);
    expect(integrations.database).toMatch(/^configured_but_unverified:/);
    expect(integrations.database).toMatch(/not set to sqlite/i);
    expect(integrations.database).toMatch(/local JSON file stores/i);
    expect(Object.values(integrations).every((value) => !/\bconnected\b/i.test(value))).toBe(true);
    expect(JSON.stringify(data)).not.toContain('dummy-key-not-used');
    expect(JSON.stringify(data)).not.toContain('https://example.invalid');
  });

  it('reports selected SQLite persistence as configured, not verified live', async () => {
    process.env.KRIYAOS_MAINTENANCE_STORE = 'sqlite';

    const data = await parent();
    const database = data.integrations?.database ?? '';

    expect(database).toMatch(/^configured_but_unverified:/);
    expect(database).toMatch(/verified only when the maintenance store is accessed/i);
    expect(database).not.toMatch(/\bconnected\b/i);
  });

  it('labels the demo CMMS adapter as simulated, not a real connection', async () => {
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'demo';

    const data = await parent();
    const cmms = data.integrations?.cmms ?? '';

    expect(cmms).toMatch(/^partially_implemented:/);
    expect(cmms).toMatch(/Local simulator\/adapter/i);
    expect(cmms).toMatch(/No real ERP connection/i);
    expect(cmms).not.toMatch(/\bconnected\b/i);
  });
});
