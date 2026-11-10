import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, getCookieName, isAuthEnabled, verifyLocalCredentials } from '@/lib/auth';

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });

export async function POST(request: Request) {
  if (!isAuthEnabled()) return NextResponse.json({ ok: false, error: 'Local auth is disabled (AUTH_MODE=none).' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid credentials payload.' }, { status: 400 });
  if (!verifyLocalCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials.' }, { status: 401 });
  }
  const token = createSessionToken({ sub: parsed.data.username, username: parsed.data.username, role: 'technician', exp: Date.now() + 8 * 60 * 60 * 1000 });
  if (!token) return NextResponse.json({ ok: false, error: 'AUTH_SESSION_SECRET is missing or too short (>=16 chars).' }, { status: 503 });
  const res = NextResponse.json({ ok: true, user: { username: parsed.data.username, role: 'technician' } });
  res.cookies.set(getCookieName(), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
  return res;
}
