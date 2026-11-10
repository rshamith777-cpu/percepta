import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = (process.env.NANO_BANANA_ENABLED ?? '').toLowerCase() === 'true';
  const hasModelHint = Boolean((process.env.NANO_BANANA_MODEL ?? '').trim());
  return NextResponse.json({
    ok: false,
    feature: 'nano-banana-official',
    configured: enabled || hasModelHint,
    available: false,
    verified: false,
    error: {
      code: 'NANO_BANANA_NOT_INTEGRATED',
      message:
        'No official Nano Banana image generation/editing integration is implemented or verified in this build. No external API call was made. Validated SVG annotations/2D camera overlay remain available as advisory fallbacks (not Nano Banana).',
    },
    blocker:
      'Requires official supported Google image model/API access, server-side credentials, implementation against official docs, and a verified real generation/editing test.',
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    feature: 'nano-banana-official',
    performed: false,
    error: {
      code: 'NANO_BANANA_NOT_INTEGRATED',
      message: 'No image was generated or edited. Official Nano Banana integration is not implemented/verified; no fake output was created.',
    },
  }, { status: 501 });
}
