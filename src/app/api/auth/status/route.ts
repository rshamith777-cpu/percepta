import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCookieName, isAuthEnabled, verifySessionToken } from '@/lib/auth';

export async function GET() {
  const enabled = isAuthEnabled();
  if (!enabled) return NextResponse.json({ ok: true, auth: { enabled: false, mode: 'none' } });
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(getCookieName())?.value);
  return NextResponse.json({ ok: true, auth: { enabled: true, mode: 'local', authenticated: Boolean(session), user: session ? { username: session.username, role: session.role } : null } });
}
