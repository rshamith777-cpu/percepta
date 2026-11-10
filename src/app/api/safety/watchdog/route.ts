import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWatchdogStatus, runLocalRuntimeWatchdog } from '@/modules/safety/watchdog/localRuntime';

const postSchema = z.object({
  problemDescription: z.string().min(1).max(4000),
  deterministicDecision: z.enum(['allow', 'caution', 'block']).optional(),
});

export async function GET() {
  return NextResponse.json({ ok: true, watchdog: getWatchdogStatus() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid watchdog request.' }, { status: 400 });
    }
    const watchdog = await runLocalRuntimeWatchdog({
      problemDescription: parsed.data.problemDescription,
      deterministicDecision: parsed.data.deterministicDecision,
    });
    return NextResponse.json({ ok: true, watchdog });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Watchdog check failed.' },
      { status: 500 },
    );
  }
}
