import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = Boolean((process.env.GOOGLE_AI_API_KEY ?? '').trim());
  // @google/genai exports Live/Session, but a production Gemini Live integration requires:
  // valid credentials, supported model/access, and a secure realtime audio bridge (API key must remain server-side).
  // This endpoint reports honest status only; it does not start a fake session.
  if (!hasKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      available: false,
      feature: 'gemini-live',
      error: {
        code: 'GEMINI_LIVE_NOT_CONFIGURED',
        message: 'Gemini Live is not configured. Set GOOGLE_AI_API_KEY (server-side) and implement/verify a supported realtime audio bridge with explicit microphone consent. No live session was started.',
      },
      blocker: 'Missing GOOGLE_AI_API_KEY and/or unverified realtime client bridge/access for the official Gemini Live API.',
    }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    available: false,
    feature: 'gemini-live',
    message: 'GOOGLE_AI_API_KEY is present on the server, but a verified Gemini Live realtime audio session bridge is not confirmed in this environment. No fake live session is started.',
    requirements: [
      'Official Gemini Live SDK/API access and supported model',
      'Secure realtime audio bridge (server-side credential handling)',
      'Explicit microphone consent and session lifecycle/error handling',
      'Verification with a real session using valid credentials',
    ],
  });
}
