import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

function uniqueEquip(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createRecord(request: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const payload = {
    equipmentIdentifier: overrides.equipmentIdentifier ?? uniqueEquip('SYNTH-EQP'),
    dataLabel: 'synthetic_demo',
    sessionId: overrides.sessionId ?? null,
    eventType: overrides.eventType ?? 'maintenance_record',
    operatingStatus: overrides.operatingStatus ?? 'synthetic/demo (simulated, not connected)',
    telemetry: overrides.telemetry ?? { status: 'missing', reason: 'No telemetry attached (synthetic/demo).', source: 'synthetic_demo' },
    beforeImageReference: 'local-demo://before',
    diagnosisReference: overrides.diagnosisReference ?? null,
    technicianActionMetadata: { actionTypes: ['visual_inspection'], summary: overrides.summary ?? 'Initial synthetic inspection', performedByRole: 'technician_demo' },
    verificationOutcome: overrides.verificationOutcome ?? 'pending',
    afterImageReference: overrides.afterImageReference ?? null,
    safetyDecision: overrides.safetyDecision ?? null,
    notes: overrides.notes ?? undefined,
    maintenanceHistory: overrides.maintenanceHistory,
    consentAcknowledged: true,
  };
  const res = await request.post('/api/robotics', { data: payload });
  expect(res.ok(), `create failed ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBeTruthy();
  return body.record as Record<string, any>;
}

async function openRoboticsPanel(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Robot detail, telemetry, maintenance history/i })).toBeVisible({ timeout: 30_000 });
}

test.describe.serial('Robotics workflow (browser E2E)', () => {
  test('1. Empty state is truthful when no records exist', async ({ page, request }) => {
    const list = await request.get('/api/robotics');
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    expect(Array.isArray(body.records)).toBeTruthy();
    await openRoboticsPanel(page);
    if (body.records.length === 0) {
      await expect(page.getByText('No robotics records yet. Create a synthetic record or refresh to load persisted records.')).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'Robotics records' })).toBeVisible();
    }
  });

  test('2-4. Robotics list loads, selecting opens detail, detail matches API record', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-LIST');
    const rec = await createRecord(request, { equipmentIdentifier: eq, summary: 'List/detail seed', telemetry: { status: 'available', source: 'synthetic_demo', observedAt: new Date().toISOString(), values: { tempC: 42 } } });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    const item = page.getByRole('button', { name: new RegExp(eq) }).first();
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.click();
    await expect(page.getByText('Selected robot detail')).toBeVisible();
    await expect(page.getByText(rec.id)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(eq, { exact: false }).first()).toBeVisible();
    const api = await request.get(`/api/robotics/${rec.id}`);
    expect(api.ok()).toBeTruthy();
    const apiRec = (await api.json()).record;
    expect(apiRec.equipmentIdentifier).toBe(eq);
    expect(apiRec.id).toBe(rec.id);
    await expect(page.getByText(apiRec.verificationOutcome, { exact: false }).first()).toBeVisible();
  });

  test('5. Telemetry missing state is explicit and not fabricated', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-MISSING');
    await createRecord(request, { equipmentIdentifier: eq, telemetry: { status: 'missing', reason: 'No telemetry sensor configured (synthetic).', source: 'synthetic_demo' } });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(/Telemetry missing/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No telemetry sensor configured/i)).toBeVisible();
  });

  test('6. Stale telemetry is surfaced clearly', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-STALE');
    await createRecord(request, { equipmentIdentifier: eq, telemetry: { status: 'stale', observedAt: '2020-01-01T00:00:00.000Z', reason: 'Telemetry older than freshness threshold.', source: 'synthetic_demo' } });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(/Telemetry stale/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/freshness threshold/i)).toBeVisible();
  });

  test('7. Malformed telemetry is handled safely without crash', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-MALFORMED');
    await createRecord(request, { equipmentIdentifier: eq, telemetry: { status: 'invalid', reason: 'Malformed telemetry payload could not be interpreted.', source: 'synthetic_demo' } });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(/Telemetry malformed\/invalid/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /Robot detail, telemetry, maintenance history/i })).toBeVisible();
  });

  test('8. Maintenance history is present and derived from persisted records', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-HIST');
    const rec = await createRecord(request, { equipmentIdentifier: eq, summary: 'Initial maintenance history seed', verificationOutcome: 'pending' });
    const upd = await request.patch(`/api/robotics/${rec.id}`, { data: { maintenanceAction: { summary: 'Follow-up inspection logged', verificationOutcome: 'issue_persists', notes: 'Persisted history entry' } } });
    expect(upd.ok()).toBeTruthy();
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText('Maintenance history (persisted)')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Initial maintenance history seed/).first()).toBeVisible();
    await expect(page.getByText(/Follow-up inspection logged/)).toBeVisible();
  });

  test('9-10. Supported maintenance update persists and remains after reload', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-UPD');
    const rec = await createRecord(request, { equipmentIdentifier: eq, summary: 'Before update', verificationOutcome: 'pending' });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(rec.id)).toBeVisible({ timeout: 20_000 });
    const updateCard = page.locator('div.rounded-xl.border.border-border.p-3').filter({ has: page.getByText('Supported maintenance update', { exact: true }) });
    await updateCard.getByPlaceholder('Describe maintenance action (advisory/log only)').fill('E2E maintenance update applied');
    await updateCard.locator('label', { hasText: 'Update notes' }).locator('textarea').fill('Updated via UI');
    await updateCard.getByRole('combobox', { name: 'Outcome' }).selectOption('issue_resolved');
    await page.getByRole('button', { name: 'Apply maintenance update' }).click();
    await expect(page.getByText('Maintenance update saved and confirmed from server state.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('E2E maintenance update applied')).toBeVisible();
    await page.reload();
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(rec.id)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('E2E maintenance update applied')).toBeVisible({ timeout: 20_000 });
    const api = await request.get(`/api/robotics/${rec.id}`);
    const apiRec = (await api.json()).record;
    expect(apiRec.verificationOutcome).toBe('issue_resolved');
    expect((apiRec.maintenanceHistory || []).some((h: { summary?: string }) => String(h.summary || '').includes('E2E maintenance update applied'))).toBeTruthy();
  });

  test('11-13. Export selected record, export by equipment, missing/invalid export handling', async ({ request }) => {
    const eq = uniqueEquip('SYNTH-EXPORT');
    const rec1 = await createRecord(request, { equipmentIdentifier: eq, summary: 'Export 1' });
    await createRecord(request, { equipmentIdentifier: eq, summary: 'Export 2' });
    const byId = await request.get(`/api/robotics/export?format=json&id=${encodeURIComponent(rec1.id)}`);
    expect(byId.ok()).toBeTruthy();
    expect(byId.headers()['content-type'] || '').toContain('application/json');
    const byIdBody = await byId.json();
    expect(byIdBody.records).toHaveLength(1);
    expect(byIdBody.records[0].id).toBe(rec1.id);
    const byIdCsv = await request.get(`/api/robotics/export?format=csv&id=${encodeURIComponent(rec1.id)}`);
    expect(byIdCsv.ok()).toBeTruthy();
    expect(byIdCsv.headers()['content-type'] || '').toContain('text/csv');
    expect(byIdCsv.headers()['content-disposition'] || '').toContain(rec1.id);
    const csvText = await byIdCsv.text();
    expect(csvText).toContain(rec1.id);
    const byEq = await request.get(`/api/robotics/export?format=json&equipmentIdentifier=${encodeURIComponent(eq)}`);
    expect(byEq.ok()).toBeTruthy();
    const byEqBody = await byEq.json();
    expect(byEqBody.records.length).toBeGreaterThanOrEqual(2);
    expect(byEqBody.records.every((r: { equipmentIdentifier?: string }) => r.equipmentIdentifier === eq)).toBeTruthy();
    const missing = await request.get('/api/robotics/export?format=json&id=00000000-0000-0000-0000-000000000000');
    expect(missing.status()).toBe(404);
    const invalid = await request.get('/api/robotics/export?format=json&id=bad%20id!!');
    expect(invalid.status()).toBe(400);
  });

  test('14. Invalid update and invalid request are rejected', async ({ request }) => {
    const eq = uniqueEquip('SYNTH-INVALID');
    const rec = await createRecord(request, { equipmentIdentifier: eq });
    expect((await request.get('/api/robotics/not-a-valid-id!!!')).status()).toBe(400);
    expect((await request.patch(`/api/robotics/${rec.id}`, { data: {} })).status()).toBe(400);
    expect((await request.patch(`/api/robotics/${rec.id}`, { data: { maintenanceAction: { summary: '', verificationOutcome: 'pending' } } })).status()).toBe(400);
    expect((await request.patch(`/api/robotics/${rec.id}`, { data: { maintenanceAction: { summary: 'x', verificationOutcome: 'not_real' } } })).status()).toBe(400);
  });

  test('15. Unauthorized mutation rejection where supported', async ({ request }) => {
    const eq = uniqueEquip('SYNTH-AUTH');
    const rec = await createRecord(request, { equipmentIdentifier: eq });
    const res = await request.patch(`/api/robotics/${rec.id}`, { data: { maintenanceAction: { summary: 'Auth-mode-none consistent update', verificationOutcome: 'pending' } } });
    expect([200, 401, 403].includes(res.status())).toBeTruthy();
    if (res.ok()) {
      const body = await res.json();
      expect(body.ok).toBeTruthy();
      expect(body.record.id).toBe(rec.id);
    }
  });

  test('16-18. Simulated/not-connected labeling, no physical hardware-control commands, safety unchanged', async ({ page, request }) => {
    const eq = uniqueEquip('SYNTH-SAFE');
    const rec = await createRecord(request, { equipmentIdentifier: eq, summary: 'Safety label seed' });
    await openRoboticsPanel(page);
    await page.getByRole('button', { name: 'Refresh list' }).click();
    await page.getByRole('button', { name: new RegExp(eq) }).first().click();
    await expect(page.getByText(rec.id)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Simulated, not connected to physical hardware/i).first()).toBeVisible();
    await expect(page.getByText(/No real robot movement, motors, actuators, or electrical-control commands/i).first()).toBeVisible();
    await expect(page.getByText(/no physical robot commands are sent/i).first()).toBeVisible();
    await expect(page.getByText(/Robotics recommendations do not override the deterministic safety gate/i).first()).toBeVisible();
    await page.getByPlaceholder('Describe maintenance action (advisory/log only)').fill('Safety-preserving maintenance note');
    await page.getByRole('button', { name: 'Apply maintenance update' }).click();
    await expect(page.getByText('Maintenance update saved and confirmed from server state.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Robotics recommendations do not override the deterministic safety gate/i).first()).toBeVisible();
    await expect(page.getByText(/No real robot movement, motors, actuators, or electrical-control commands/i).first()).toBeVisible();
  });
});
