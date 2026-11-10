import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = 'kriyaos_session';

function isAuthEnabled(): boolean {
  return (process.env.AUTH_MODE ?? 'none').trim().toLowerCase() === 'local';
}

function isProtectedMutation(req: NextRequest): boolean {
  if (!isAuthEnabled()) return false;
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  const p = req.nextUrl.pathname;
  return p.startsWith('/api/maintenance') || p.startsWith('/api/integrations/cmms') || p.startsWith('/api/auth/logout');
}

export function middleware(req: NextRequest) {
  if (!isProtectedMutation(req)) return NextResponse.next();
  // Lightweight check: require a session-shaped cookie when local auth is enabled.
  // Full HMAC signature/expiry verification is performed by Node route handlers via src/lib/auth.ts.
  const token = req.cookies.get(COOKIE)?.value;
  if (token && token.includes('.')) return NextResponse.next();
  return NextResponse.json({ ok: false, error: 'Authentication required (AUTH_MODE=local).', code: 'AUTH_REQUIRED' }, { status: 401 });
}

export const config = {
  matcher: ['/api/maintenance/:path*', '/api/integrations/:path*', '/api/auth/:path*'],
};
