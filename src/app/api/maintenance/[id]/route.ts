import { NextResponse } from 'next/server';
import { getMaintenanceRecord } from '@/modules/maintenance/store';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const record = await getMaintenanceRecord(id);
    if (!record) return NextResponse.json({ ok: false, error: { message: 'Maintenance record not found.' } }, { status: 404 });
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to load maintenance record.' } },
      { status: 500 },
    );
  }
}
