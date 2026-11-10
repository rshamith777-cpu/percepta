import { NextResponse } from 'next/server';
import { deleteManual, getManualDocument } from '@/modules/manuals/store';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const manual = await getManualDocument(id);
    if (!manual) return NextResponse.json({ ok: false, error: 'Manual not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, manual });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load manual.' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteManual(id);
    if (!deleted) return NextResponse.json({ ok: false, error: 'Manual not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, deletedId: id, message: 'Manual removed from the library.' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to delete manual.' },
      { status: 500 },
    );
  }
}
