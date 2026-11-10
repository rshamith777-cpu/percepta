import { NextResponse } from 'next/server';

export async function GET() {
  const projectId = Boolean((process.env.FIREBASE_PROJECT_ID ?? '').trim());
  const enabled = (process.env.FIREBASE_ENABLED ?? '').toLowerCase() === 'true';
  return NextResponse.json({
    ok: false,
    feature: 'firebase-firestore',
    configured: enabled || projectId,
    available: false,
    verified: false,
    error: {
      code: 'FIREBASE_NOT_INTEGRATED',
      message:
        'Firebase/Firestore is not integrated or verified in this build. No SDK initialization, no data read/write, and no upload was performed. Local persistence remains functional.',
    },
    blocker:
      'Requires official Firebase SDK, project/emulator or prod credentials, secure rules, consent/data minimization, and verified authenticated operations.',
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    feature: 'firebase-firestore',
    performed: false,
    error: {
      code: 'FIREBASE_NOT_INTEGRATED',
      message: 'No Firestore/Firebase operation was performed. Integration is not configured/verified.',
    },
  }, { status: 501 });
}
