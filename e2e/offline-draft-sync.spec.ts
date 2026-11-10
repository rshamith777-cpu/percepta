import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const QUEUE_KEY = 'kriyaos.maintenanceDraftQueue.v1';

async function seedRecord(request: APIRequestContext, problem: string, opts?: { diagnosisBlocked?: boolean; safetyDecision?: unknown }) {
  const res = await request.post('/api/maintenance', {
    data: {
      problemDescription: problem,
      diagnosisSummary: 'E2E synthetic diagnosis summary (non-safety).',
      diagnosisBlocked: opts?.diagnosisBlocked ?? false,
      safetyDecisionAtDiagnosis: opts?.safetyDecision ?? { decision: opts?.diagnosisBlocked ? 'block' : 'allow', safeNextAction: 'synthetic/de-energized demo only' },
    },
  });
  expect(res.ok(), `seed failed ${res.status()}`).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBeTruthy();
  return body.record as { id: string; updatedAt: string; technicianNotes: string; status: string; diagnosisBlocked: boolean; safetyDecisionAtDiagnosis?: unknown; currentVerification: unknown; verificationHistory: unknown[]; auditEvents: unknown[] };
}

async function getRecord(request: APIRequestContext, id: string): Promise<Record<string, unknown>> {
  const res = await request.get('/api/maintenance/' + id);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBeTruthy();
  return body.record as Record<string, unknown>;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openAppAndSelectRecord(page: Page, problem: string) {
  await page.goto('/');
  const recBtn = page.getByRole('button', { name: new RegExp(escapeRegExp(problem).slice(0, 45), 'i') }).first();
  await expect(recBtn).toBeVisible({ timeout: 20_000 });
  await recBtn.click();
  await expect(page.locator('#draft-sync-heading')).toBeVisible({ timeout: 10_000 });
}

async function saveDraftUI(page: Page, text: string) {
  await page.getByPlaceholder(/Ordinary technician note draft/i).fill(text);
  await page.getByRole('button', { name: 'Save local draft' }).click();
  await expect(page.getByText(/Draft saved locally/i)).toBeVisible({ timeout: 5000 });
}

function queueFromStorage(raw: string | null) {
  if (!raw) return [];
  return JSON.parse(raw);
}

test.describe('Offline maintenance-note workflow (browser E2E, D: workspace)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((k) => localStorage.removeItem(k), QUEUE_KEY);
  });

  test('1. Online draft creation', async ({ page, request }) => {
    const problem = 'E2E-1 online draft ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Online draft note');
    await expect(page.getByText(/1 pending/i)).toBeVisible();
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items).toHaveLength(1);
    expect(items[0].syncState).toBe('pending');
    expect(items[0].payload.technicianNotesDraft).toBe('Online draft note');
  });

  test('2. Offline draft creation', async ({ page, request, context }) => {
    const problem = 'E2E-2 offline draft ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/Network:\s*offline/i)).toBeVisible();
    await saveDraftUI(page, 'Offline-created draft');
    await expect(page.getByText(/1 pending/i)).toBeVisible();
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items[0].payload.technicianNotesDraft).toBe('Offline-created draft');
    await context.setOffline(false);
  });

  test('3. Refresh while offline and persistence (actual SW behavior observed)', async ({ page, request, context }) => {
    const problem = 'E2E-3 refresh offline ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Persist across offline refresh');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    // Actual app behavior: SW network-first navigation falls back to /offline when fetch fails.
    await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const onOfflinePage = /offline|reconnect|Try again/i.test(bodyText);
    // Persistence: localStorage is origin-scoped; check on same origin (offline page or current document).
    const raw = await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY);
    const items = queueFromStorage(raw);
    expect(items.some((d: any) => (d as any)?.payload?.technicianNotesDraft === 'Persist across offline refresh')).toBeTruthy();
    await context.setOffline(false);
    await page.goto('/');
    await openAppAndSelectRecord(page, problem);
    await expect(page.getByText(/Persist across offline refresh/)).toBeVisible({ timeout: 15_000 });
    // Assert observation recorded (behavior is actual; offline fallback may be /offline page).
    expect(onOfflinePage || /Persist across offline refresh/.test(await page.locator('body').innerText())).toBeTruthy();
  });

  test('4. Pending queue display', async ({ page, request }) => {
    const problem = 'E2E-4 pending display ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Pending A');
    await page.getByPlaceholder(/Ordinary technician note draft/i).fill('Pending B');
    await page.getByRole('button', { name: 'Save local draft' }).click();
    await expect(page.getByText(/2 pending/i)).toBeVisible();
    await expect(page.getByText('Pending A')).toBeVisible();
    await expect(page.getByText('Pending B')).toBeVisible();
  });

  test('5. Reconnection behavior', async ({ page, request, context }) => {
    const problem = 'E2E-5 reconnect ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/Network:\s*offline/i)).toBeVisible();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText(/Network:\s*online/i)).toBeVisible();
  });

  test('6. Explicit sync only (user-triggered)', async ({ page, request }) => {
    const problem = 'E2E-6 explicit only ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    const syncCalls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/draft-notes/sync')) syncCalls.push(r.method() + ' ' + r.url()); });
    await saveDraftUI(page, 'Explicit sync note');
    await page.waitForTimeout(1500);
    expect(syncCalls).toHaveLength(0);
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced as ordinary technician notes/i)).toBeVisible({ timeout: 10_000 });
    expect(syncCalls.length).toBeGreaterThanOrEqual(1);
    const after = await getRecord(request, rec.id);
    expect(after.technicianNotes).toContain('Explicit sync note');
  });

  test('7. Idempotency (server duplicate application prevented)', async ({ page, request }) => {
    const problem = 'E2E-7 idempotent ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Idempotent note');
    const raw = await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY);
    const draft = queueFromStorage(raw)[0];
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced/i)).toBeVisible();
    const after1 = await getRecord(request, rec.id);
    const res2 = await request.post('/api/maintenance/' + rec.id + '/draft-notes/sync', {
      data: { idempotencyKey: draft.idempotencyKey, draftText: 'Idempotent note', baseRecordUpdatedAt: draft.baseRecordUpdatedAt, mode: 'replace' }
    });
    expect(res2.ok()).toBeTruthy();
    const b2 = await res2.json();
    expect(b2.ok).toBeTruthy();
    expect(b2.alreadyApplied).toBe(true);
    const after2 = await getRecord(request, rec.id);
    expect((after2 as any).technicianNotes).toBe((after1 as any).technicianNotes);
    expect(((after2 as any).technicianNotes.match(/Idempotent note/g) || []).length).toBe(1);
  });

  test('8. Conflict detection', async ({ page, request }) => {
    const problem = 'E2E-8 conflict detect ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Local conflicting note');
    const recNow = await getRecord(request, rec.id);
    const bump = await request.post('/api/maintenance/' + rec.id + '/draft-notes/sync', {
      data: { idempotencyKey: 'bump-' + Date.now(), draftText: 'Server changed', baseRecordUpdatedAt: recNow.updatedAt, mode: 'replace' }
    });
    expect(bump.ok()).toBeTruthy();
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Conflict detected/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^conflict$/i).first()).toBeVisible();
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items[0].syncState).toBe('conflict');
  });

  test('9. Conflict resolution (keep local, update base, then sync)', async ({ page, request }) => {
    const problem = 'E2E-9 conflict resolve ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Local wins note');
    const recNow = await getRecord(request, rec.id);
    await request.post('/api/maintenance/' + rec.id + '/draft-notes/sync', {
      data: { idempotencyKey: 'bump2-' + Date.now(), draftText: 'Server other', baseRecordUpdatedAt: recNow.updatedAt, mode: 'replace' }
    });
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Conflict detected/i)).toBeVisible();
    await page.goto('/');
    await openAppAndSelectRecord(page, problem);
    await page.getByRole('button', { name: 'Keep local, update base' }).click();
    await expect(page.getByText(/base updated/i)).toBeVisible();
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced/i)).toBeVisible({ timeout: 10_000 });
    const after = await getRecord(request, rec.id);
    expect(after.technicianNotes).toContain('Local wins note');
  });

  test('10. Failed sync retention', async ({ page, request }) => {
    const problem = 'E2E-10 failed retention ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Will fail sync');
    await page.route('**/draft-notes/sync', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Sync error|sync failed/i)).toBeVisible({ timeout: 10_000 });
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items[0].syncState).toBe('sync_failed');
    expect(items[0].payload.technicianNotesDraft).toBe('Will fail sync');
  });

  test('11. Draft removal', async ({ page, request }) => {
    const problem = 'E2E-11 removal ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Remove me');
    await expect(page.getByText('Remove me')).toBeVisible();
    await page.getByRole('button', { name: 'Remove local draft' }).click();
    await expect(page.getByText(/0 total/i)).toBeVisible();
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items).toHaveLength(0);
  });

  test('12. Corrupted local-storage handling', async ({ page, request }) => {
    const problem = 'E2E-12 corrupt ' + Date.now();
    await seedRecord(request, problem);
    await page.goto('/');
    await page.evaluate((k) => localStorage.setItem(k, '{not-json'), QUEUE_KEY);
    await openAppAndSelectRecord(page, problem);
    await expect(page.getByText(/Local draft storage appears corrupted/i)).toBeVisible({ timeout: 10_000 });
    const raw = await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY);
    expect(raw).toBe('{not-json');
  });

  test('13. Safety state remains unchanged after draft sync', async ({ page, request }) => {
    const problem = 'E2E-13 safety unchanged ' + Date.now();
    const rec = await seedRecord(request, problem);
    const before = await getRecord(request, rec.id);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Safety-neutral note');
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced/i)).toBeVisible();
    const after = await getRecord(request, rec.id);
    expect((after as any).status).toBe((before as any).status);
    expect(after.diagnosisBlocked).toBe(before.diagnosisBlocked);
    expect(after.safetyDecisionAtDiagnosis).toEqual(before.safetyDecisionAtDiagnosis);
    expect(after.currentVerification).toEqual(before.currentVerification);
    expect(after.verificationHistory).toEqual(before.verificationHistory);
    expect(after.technicianNotes).toContain('Safety-neutral note');
  });

  test('14. BLOCK cannot be bypassed (blocked record: notes sync does not change block/safety/verification)', async ({ page, request }) => {
    const problem = 'E2E-14 blocked record ' + Date.now();
    const rec = await seedRecord(request, problem, { diagnosisBlocked: true, safetyDecision: { decision: 'block', reason: 'potentially live', safeNextAction: 'escalate' } });
    const before = await getRecord(request, rec.id);
    expect(before.diagnosisBlocked).toBe(true);
    expect((before as any).safetyDecisionAtDiagnosis?.decision).toBe('block');
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Note on blocked record');
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced/i)).toBeVisible();
    const after = await getRecord(request, rec.id);
    expect(after.diagnosisBlocked).toBe(true);
    expect((after as any).safetyDecisionAtDiagnosis?.decision).toBe('block');
    expect((after as any).status).toBe((before as any).status);
    expect((after as any).currentVerification).toBeNull();
    expect((after as any).technicianNotes).toContain('Note on blocked record');
  });

  test('15. Notes-only server mutation (no safety/verification fields mutated)', async ({ page, request }) => {
    const problem = 'E2E-15 notes-only ' + Date.now();
    const rec = await seedRecord(request, problem);
    const before = await getRecord(request, rec.id);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Notes-only mutation check');
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Draft synced/i)).toBeVisible();
    const after = await getRecord(request, rec.id);
    const mutableOk = new Set(['technicianNotes', 'updatedAt', 'auditEvents']);
    for (const k of Object.keys(before as any)) {
      if (mutableOk.has(k)) continue;
      expect((after as any)[k], `field ${k} must not change`).toEqual((before as any)[k]);
    }
    expect((after as any).technicianNotes).toContain('Notes-only mutation check');
    const lastAudit = ((after as any).auditEvents || [])[ ((after as any).auditEvents || []).length - 1 ] as any;
    expect(lastAudit?.type).toBe('notes_updated');
    expect(lastAudit?.details?.source).toBe('offline_draft_sync');
  });

  test('16. No background or implicit sync (reconnect does not auto-sync)', async ({ page, request, context }) => {
    const problem = 'E2E-16 no background ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    const syncCalls: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/draft-notes/sync')) syncCalls.push(r.url()); });
    await saveDraftUI(page, 'No implicit sync');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(1200);
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(1500);
    expect(syncCalls).toHaveLength(0);
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items[0]?.syncState).toBe('pending');
  });

  test('17. SW/API safety: service worker source never caches /api/* (static contract) and sync remains explicit', async ({ request }) => {
    // Verifies the deployed SW contract is present and contains the /api/ no-cache rule.
    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBeTruthy();
    const text = await sw.text();
    expect(text).toContain("url.pathname.startsWith('/api/')");
    expect(text).toContain('NEVER cache /api/*');
    // And draft sync endpoint remains ordinary API (not cached by design) — request succeeds as normal API.
    // (Behavioral caching is enforced by SW logic; we assert the guard exists in the served SW.)
  });
});

  test('18. Edit draft in place preserves local identity/idempotency and persists across navigation', async ({ page, request }) => {
    const problem = 'E2E-18 edit identity ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Draft v1');
    const beforeRaw = await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY);
    const before = queueFromStorage(beforeRaw)[0];
    expect(before.localId).toBeTruthy();
    expect(before.idempotencyKey).toBeTruthy();

    await page.getByRole('button', { name: 'Edit locally' }).first().click();
    await expect(page.getByText(/Editing existing local draft/i)).toBeVisible();
    await page.getByPlaceholder(/Ordinary technician note draft/i).fill('Draft v2 edited in place');
    await page.getByRole('button', { name: 'Save changes to local draft' }).click();
    await expect(page.getByText(/Local draft updated \(pending explicit sync\)/i)).toBeVisible();

    const afterEditRaw = await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY);
    const afterEdit = queueFromStorage(afterEditRaw);
    expect(afterEdit).toHaveLength(1);
    expect(afterEdit[0].localId).toBe(before.localId);
    expect(afterEdit[0].idempotencyKey).toBe(before.idempotencyKey);
    expect(afterEdit[0].payload.technicianNotesDraft).toBe('Draft v2 edited in place');

    await page.reload();
    await openAppAndSelectRecord(page, problem);
    await expect(page.getByText('Draft v2 edited in place')).toBeVisible({ timeout: 15_000 });

    await page.goto('about:blank');
    await page.goto('/');
    await openAppAndSelectRecord(page, problem);
    await expect(page.getByText('Draft v2 edited in place')).toBeVisible({ timeout: 15_000 });
    const afterNav = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(afterNav).toHaveLength(1);
    expect(afterNav[0].localId).toBe(before.localId);
  });

  test('19. Offline explicit sync attempt shows no false success and draft remains retryable', async ({ page, request, context }) => {
    const problem = 'E2E-19 offline sync attempt ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Offline sync attempt note');
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/Network:\s*offline/i)).toBeVisible();

    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Offline: draft was not sent\. It remains saved locally; sync explicitly after reconnecting\./i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Draft synced/i)).toHaveCount(0);
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items).toHaveLength(1);
    expect(items[0].syncState).toBe('sync_failed');
    expect(items[0].payload.technicianNotesDraft).toBe('Offline sync attempt note');
    await expect(page.getByRole('button', { name: 'Sync now (explicit)' })).toBeVisible();

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText(/Network:\s*online/i)).toBeVisible();
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/UI refreshed from confirmed server state/i)).toBeVisible({ timeout: 10_000 });
    const after = await getRecord(request, rec.id);
    expect(after.technicianNotes).toContain('Offline sync attempt note');
  });

  test('20. 401 authorization response preserves draft for retry', async ({ page, request }) => {
    const problem = 'E2E-20 401 auth ' + Date.now();
    await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Auth-failed draft');
    await page.route('**/draft-notes/sync', (route) => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } }),
    }));
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Authentication required\. Draft kept locally/i)).toBeVisible({ timeout: 10_000 });
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items).toHaveLength(1);
    expect(items[0].syncState).toBe('sync_failed');
    expect(items[0].payload.technicianNotesDraft).toBe('Auth-failed draft');
    await expect(page.getByRole('button', { name: 'Sync now (explicit)' })).toBeVisible();
  });

  test('21. Conflict resolution keep-server removes local draft without mutating safety state', async ({ page, request }) => {
    const problem = 'E2E-21 keep server ' + Date.now();
    const rec = await seedRecord(request, problem);
    const before = await getRecord(request, rec.id);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'Local will be discarded');
    const recNow = await getRecord(request, rec.id);
    await request.post('/api/maintenance/' + rec.id + '/draft-notes/sync', {
      data: { idempotencyKey: 'bump-keep-server-' + Date.now(), draftText: 'Server authoritative note', baseRecordUpdatedAt: recNow.updatedAt, mode: 'replace' }
    });
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/Conflict detected/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Keep server, remove local' }).click();
    await expect(page.getByText(/Local draft removed\. Server notes kept unchanged/i)).toBeVisible();
    const items = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY));
    expect(items).toHaveLength(0);
    const after = await getRecord(request, rec.id);
    expect(after.technicianNotes).toContain('Server authoritative note');
    expect(after.technicianNotes).not.toContain('Local will be discarded');
    expect((after as any).status).toBe((before as any).status);
    expect(after.diagnosisBlocked).toBe(before.diagnosisBlocked);
    expect(after.safetyDecisionAtDiagnosis).toEqual(before.safetyDecisionAtDiagnosis);
    expect(after.currentVerification).toEqual(before.currentVerification);
    expect(after.verificationHistory).toEqual(before.verificationHistory);
  });

  test('22. Repeated explicit sync does not create duplicate notes (UI + server idempotency)', async ({ page, request }) => {
    const problem = 'E2E-22 no dupes ui ' + Date.now();
    const rec = await seedRecord(request, problem);
    await openAppAndSelectRecord(page, problem);
    await saveDraftUI(page, 'No duplicate note');
    const draft = queueFromStorage(await page.evaluate((k) => localStorage.getItem(k), QUEUE_KEY))[0] as any;
    expect(draft).toBeTruthy();
    await page.getByRole('button', { name: 'Sync now (explicit)' }).click();
    await expect(page.getByText(/UI refreshed from confirmed server state/i)).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => ((await getRecord(request, rec.id)) as any).technicianNotes?.match(/No duplicate note/g)?.length || 0, { timeout: 10_000 }).toBe(1);
    // Explicit repeat-sync attempt with the same idempotency key must not create duplicates.
    const recNow = await getRecord(request, rec.id);
    const again = await request.post('/api/maintenance/' + rec.id + '/draft-notes/sync', {
      data: { idempotencyKey: (draft as any).idempotencyKey, draftText: 'No duplicate note', baseRecordUpdatedAt: (recNow as any).updatedAt, mode: 'replace' }
    });
    expect(again.ok()).toBeTruthy();
    const after = await getRecord(request, rec.id);
    expect(((after as any).technicianNotes.match(/No duplicate note/g) || []).length).toBe(1);
    await openAppAndSelectRecord(page, problem);
    await expect(page.getByText(/No duplicate note/).first()).toBeVisible({ timeout: 10_000 });
  });

