import { NextResponse } from 'next/server';
import { listManualDocuments } from '@/modules/manuals/store';

export async function GET() {
  try {
    const manuals = await listManualDocuments();
    return NextResponse.json({ ok: true, manuals });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        manuals: [],
        error: error instanceof Error ? error.message : 'Failed to list manuals.',
      },
      { status: 500 },
    );
  }
}
