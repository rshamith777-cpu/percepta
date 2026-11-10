import crypto from 'node:crypto';

const COOKIE = 'kriyaos_session';

export function isAuthEnabled(): boolean {
  return (process.env.AUTH_MODE ?? 'none').trim().toLowerCase() === 'local';
}

export function getSessionSecret(): string | null {
  const s = (process.env.AUTH_SESSION_SECRET ?? '').trim();
  return s.length >= 16 ? s : null;
}

function sign(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSessionToken(payload: { sub: string; username: string; role: string; exp: number }): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string | null | undefined): { sub: string; username: string; role: string; exp: number } | null {
  const secret = getSessionSecret();
  if (!secret || !token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { sub: string; username: string; role: string; exp: number };
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

export function getCookieName() { return COOKIE; }

export function verifyLocalCredentials(username: string, password: string): boolean {
  const expectedUser = (process.env.AUTH_LOCAL_USERNAME ?? '').trim();
  const expectedPass = process.env.AUTH_LOCAL_PASSWORD ?? '';
  if (!expectedUser || !expectedPass) return false;
  const userOk = crypto.timingSafeEqual(Buffer.from(username), Buffer.from(expectedUser.padEnd(username.length).slice(0, username.length))) && username.length === expectedUser.length;
  // Prototype local auth: compare configured password using timing-safe equal. For production, use hashed credentials and a proper user store.
  const passBuf = Buffer.from(password);
  const expBuf = Buffer.from(expectedPass);
  const passOk = passBuf.length === expBuf.length && crypto.timingSafeEqual(passBuf, expBuf);
  return userOk && passOk;
}

export function authRequiredResponse() {
  return Response.json({ ok: false, error: 'Authentication required (AUTH_MODE=local).', code: 'AUTH_REQUIRED' }, { status: 401 });
}
