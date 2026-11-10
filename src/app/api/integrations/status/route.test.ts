import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from './route';

const savedEnv = { ...process.env };
const configKeys = [
  'GOOGLE_AI_API_KEY',
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

function resetEnv() {
  process.env = { ...savedEnv };
  for (const key of configKeys) delete process.env[key];
}

async function getCapabilities(): Promise<Capability[]> {
  const res = await GET();
  expect(res.status).toBe(200);
  const data = (await res.json()) as { ok?: boolean; capabilities?: Capability[] };
  expect(data.ok).toBe(true);
  expect(Array.isArray(data.capabilities)).toBe(true);
  return data.capabilities ?? [];
}

function capability(caps: Capability[], id: string): Capability {
  const found = caps.find((c) => c.id === id);
  expect(found, `missing capability ${id}`).toBeTruthy();
  return found as Capability;
}

beforeEach(resetEnv);
afterEach(() => { process.env = savedEnv; });

describe('integration status truthfulness', () => {
  it('keeps config-hint-only integrations out of configured_but_unverified', async () => {
    process.env.GOOGLE_AI_API_KEY = 'dummy-key-not-used';
    process.env.FIREBASE_PROJECT_ID = 'demo-project';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-project';
    process.env.BIGQUERY_ENABLED = 'true';
    process.env.GOOGLE_CLOUD_PROJECT = 'demo-project';
    process.env.CMMS_ENABLED = 'true';
    process.env.CMMS_PROVIDER = 'generic';
    process.env.CMMS_BASE_URL = 'https://example.invalid';
    process.env.CMMS_API_KEY = 'dummy-key-not-used';

    const caps = await getCapabilities();
    const geminiLive = capability(caps, 'gemini-live');
    const firebase = capability(caps, 'firebase-firestore');
    const bigquery = capability(caps, 'bigquery');
    const cmms = capability(caps, 'erp-cmms');

    expect(geminiLive.status).toBe('partially_implemented');
    expect(geminiLive.summary).toMatch(/no realtime audio\/session bridge/i);
    expect(firebase.status).toBe('not_integrated');
    expect(firebase.summary).toMatch(/Configuration hints detected/i);
    expect(firebase.summary).toMatch(/no Firebase\/Firestore SDK/i);
    expect(bigquery.status).toBe('not_integrated');
    expect(bigquery.summary).toMatch(/Configuration hints detected/i);
    expect(bigquery.summary).toMatch(/no BigQuery client/i);
    expect(cmms.status).toBe('partially_implemented');
    expect(cmms.summary).toMatch(/no real ERP\/CMMS connector is implemented/i);
    expect(cmms.summary).toMatch(/No external system was contacted/i);
    expect(caps.filter((c) => c.status === 'configured_but_unverified').map((c) => c.id)).toEqual(['gemini-diagnosis']);
  });

  it('reports unimplemented integrations as not_integrated without config hints', async () => {
    const caps = await getCapabilities();

    expect(capability(caps, 'gemini-live').status).toBe('partially_implemented');
    expect(capability(caps, 'firebase-firestore').status).toBe('not_integrated');
    expect(capability(caps, 'firebase-firestore').summary).toMatch(/No Firebase credentials\/project configured/i);
    expect(capability(caps, 'bigquery').status).toBe('not_integrated');
    expect(capability(caps, 'bigquery').summary).toMatch(/No GCP\/BigQuery credentials configured/i);
  });
});
