import { describe, expect, it, vi, afterEach } from 'vitest';
import { POST } from './route';
import { createDefaultSafetyChecklist } from '@/modules/safety/checklist';
import type { EquipmentStatusInput } from '@/modules/safety/types';

type DiagnoseBody = {
  ok: boolean;
  blockedEscalation?: string;
  diagnosis?: unknown;
  safetyDecision?: { decision?: string };
  error?: { code?: string; retryable?: boolean; message?: string };
};

function makeImageFile(name = 'test.jpg', type = 'image/jpeg', bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])) {
  return new File([bytes], name, { type });
}

function makeFormData(overrides?: { problemDescription?: string; equipmentStatus?: EquipmentStatusInput; checklist?: unknown; image?: File | null }) {
  const equipmentStatus = overrides?.equipmentStatus ?? 'de_energized_confirmed';
  const checklist = overrides?.checklist ?? createDefaultSafetyChecklist(equipmentStatus);
  const fd = new FormData();
  if (overrides?.image !== null) {
    fd.set('image', overrides?.image ?? makeImageFile());
  }
  fd.set('problemDescription', overrides?.problemDescription ?? 'Inverter display is blank on synthetic demo unit');
  fd.set('equipmentStatus', equipmentStatus);
  fd.set('safetyChecklist', JSON.stringify(checklist));
  fd.set('language', 'en');
  fd.set('acceptedSafetyRules', 'true');
  return fd;
}

async function post(fd: FormData): Promise<Response> {
  const req = new Request('http://localhost/api/diagnose', { method: 'POST', body: fd });
  return POST(req);
}

async function readBody(res: Response): Promise<DiagnoseBody> {
  return (await res.json()) as DiagnoseBody;
}

describe('/api/diagnose regression (no Gemini calls)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks potentially live/unsafe input before AI and returns escalation (authoritative, no Gemini)', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', '');
    const equipmentStatus: EquipmentStatusInput = 'potentially_live';
    const checklist = createDefaultSafetyChecklist(equipmentStatus).map((c) =>
      c.safetyCritical ? { ...c, checked: false } : c,
    );
    const fd = makeFormData({
      problemDescription: 'The inverter is powered on and sparking, can I touch it?',
      equipmentStatus,
      checklist,
    });
    const res = await post(fd);
    expect(res.status).toBe(200);
    const body = await readBody(res);
    expect(body.ok).toBe(true);
    expect(String(body.blockedEscalation || '')).toBeTruthy();
    expect(body.safetyDecision?.decision).toBe('block');
    expect(body.diagnosis).toBeUndefined();
  });

  it('preserves independent safety decision when Gemini is unavailable (missing key) for non-blocked input', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', '');
    const fd = makeFormData({ equipmentStatus: 'de_energized_confirmed' });
    const res = await post(fd);
    expect(res.status).toBe(503);
    const body = await readBody(res);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('MISSING_API_KEY');
    expect(body.error?.retryable).toBe(false);
    expect(body.safetyDecision).toBeTruthy();
    expect(['allow', 'caution', 'block']).toContain(body.safetyDecision?.decision);
    expect(body.safetyDecision?.decision).not.toBe('block');
    expect(body.diagnosis).toBeUndefined();
  });

  it('rejects invalid image without fabricating results', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', '');
    const fd = makeFormData({ image: new File([new Uint8Array([1, 2, 3])], 'x.txt', { type: 'text/plain' }) });
    const res = await post(fd);
    expect(res.status).toBe(400);
    const body = await readBody(res);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('INVALID_IMAGE');
  });
});
