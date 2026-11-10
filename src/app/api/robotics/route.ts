import { NextResponse } from 'next/server';
import { createRoboticsTrajectorySchema } from '@/modules/robotics/schemas';
import { createRoboticsTrajectoryRecord, listRoboticsTrajectoryRecords } from '@/modules/robotics/store';

export async function GET() {
  try {
    const records = await listRoboticsTrajectoryRecords();
    return NextResponse.json({
      ok: true,
      prototype: true,
      syntheticDemoOnly: true,
      notice: 'Local synthetic robotics trajectory prototype. No real worker data collected. No automatic upload to BigQuery, Firebase, or external services.',
      records,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Failed to list robotics prototype records.' } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createRoboticsTrajectorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        ok: false,
        error: { message: 'Invalid synthetic robotics trajectory payload.', details: parsed.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`) },
      }, { status: 400 });
    }
    const record = await createRoboticsTrajectoryRecord(parsed.data);
    return NextResponse.json({ ok: true, record, prototype: true, syntheticDemoOnly: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Failed to create robotics prototype record.' } }, { status: 500 });
  }
}
