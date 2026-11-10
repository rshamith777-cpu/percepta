/**
 * Integration contract tests (MOCK-FREE route handler tests; no external services contacted).
 * These tests verify truthful blocked/unavailable behavior and safety boundaries for
 * credential-gated foundations. They do NOT prove real external integrations work.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as nanoGet, POST as nanoPost } from './nano-banana/status/route';
import { GET as agentGet } from './agent-skills/status/route';
import { GET as fbGet, POST as fbPost } from './firebase/status/route';
import { GET as bqGet, POST as bqPost } from './bigquery/status/route';
import { GET as liveGet } from './gemini-live/status/route';

const savedEnv = { ...process.env };
beforeEach(() => { process.env = { ...savedEnv }; delete process.env.GOOGLE_AI_API_KEY; delete process.env.NANO_BANANA_ENABLED; delete process.env.BIGQUERY_ENABLED; delete process.env.FIREBASE_ENABLED; });
afterEach(() => { process.env = savedEnv; });

describe('integration contract tests (blocked/unavailable; no external calls)', () => {
  it('nano-banana status reports not integrated and performs no generation', async () => {
    const res = await nanoGet();
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.verified).toBe(false);
    expect(data.error.code).toBe('NANO_BANANA_NOT_INTEGRATED');
    expect(String(data.error.message)).toMatch(/No external API call|not implemented/i);
    const post = await nanoPost();
    expect(post.status).toBe(501);
    const p = await post.json();
    expect(p.performed).toBe(false);
  });

  it('agent skills status reports not integrated', async () => {
    const res = await agentGet();
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error.code).toBe('AGENT_SKILLS_NOT_INTEGRATED');
    expect(String(data.error.message)).toMatch(/not.*official Agent Skills/i);
  });

  it('firebase status reports not integrated and performs no write', async () => {
    const res = await fbGet();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('FIREBASE_NOT_INTEGRATED');
    const post = await fbPost();
    expect((await post.json()).performed).toBe(false);
  });

  it('bigquery GET reports not integrated; POST validates but does NOT ingest', async () => {
    const res = await bqGet();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('BIGQUERY_NOT_INTEGRATED');
    const bad = await bqPost(new Request('http://x', { method: 'POST', body: JSON.stringify({}) }));
    expect(bad.status).toBe(400);
    const okShape = await bqPost(new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventType: 'demo_metric', payload: { n: 1 }, syntheticDemo: true }) }));
    expect(okShape.status).toBe(501);
    const data = await okShape.json();
    expect(data.performed).toBe(false);
    expect(data.acceptedForValidationOnly).toBe(true);
    expect(data.error.code).toBe('BIGQUERY_NOT_INTEGRATED');
    expect(String(data.error.message)).toMatch(/NOT ingested/i);
  });

  it('gemini live status is honest when key missing (no fake session)', async () => {
    const res = await liveGet();
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(String(data.error?.message ?? data.message ?? '')).toMatch(/No live session was started|not configured/i);
  });
});
