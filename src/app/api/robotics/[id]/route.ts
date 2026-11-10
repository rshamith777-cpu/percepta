import { NextResponse } from 'next/server';
import { getRoboticsTrajectoryRecord, updateRoboticsTrajectoryRecord } from '@/modules/robotics/store';
import { updateRoboticsTrajectorySchema } from '@/modules/robotics/schemas';

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9-]{1,120}$/.test(id);
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidId(id)) {
      return NextResponse.json({ ok: false, error: { message: 'Invalid robotics record id.' } }, { status: 400 });
    }
    const record = await getRoboticsTrajectoryRecord(id);
    if (!record) {
      return NextResponse.json({ ok: false, error: { message: 'Robotics trajectory record not found.' } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record, prototype: true, syntheticDemoOnly: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Failed to load robotics trajectory record.' } }, { status: 500 });
  }
}

async function handleUpdate(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isValidId(id)) {
      return NextResponse.json({ ok: false, error: { message: 'Invalid robotics record id.' } }, { status: 400 });
    }
    let json: unknown;
    try { json = await request.json(); } catch {
      return NextResponse.json({ ok: false, error: { message: 'Invalid JSON body.' } }, { status: 400 });
    }
    const parsed = updateRoboticsTrajectorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { message: 'Invalid update payload.', details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) } }, { status: 400 });
    }
    const updated = await updateRoboticsTrajectoryRecord(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ ok: false, error: { message: 'Robotics trajectory record not found.' } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record: updated, prototype: true, syntheticDemoOnly: true, updated: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Failed to update robotics trajectory record.' } }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, ctx);
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handleUpdate(request, ctx);
}
