import { NextResponse } from 'next/server';
import { makeAuditEvent, updateRecord } from '@/modules/maintenance/store';
import { recordEscalationSchema } from '@/modules/maintenance/schemas';
import { canTransition } from '@/modules/maintenance/lifecycle';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as unknown;
    const parsed = recordEscalationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid escalation payload.', details: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) } },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const result = await updateRecord(id, (record) => {
      const toStatus = 'escalated_requires_qualified_technician' as const;
      if (record.status === toStatus) return { record, audit: [] };
      if (!canTransition(record.status, toStatus)) {
        return { error: `Cannot transition from ${record.status} to ${toStatus}.`, status: 409 };
      }
      const from = record.status;
      record.status = toStatus;
      record.escalationReason = d.reason.trim();
      if (d.technicianNotes !== undefined) record.technicianNotes = d.technicianNotes;
      return {
        record,
        audit: [makeAuditEvent({
          type: 'escalation_recorded',
          fromStatus: from,
          toStatus,
          summary: 'Escalated to qualified technician (deterministic safety/escalation record).',
          details: { reason: d.reason.trim() },
        })],
      };
    });
    if (result.error) return NextResponse.json({ ok: false, error: { message: result.error } }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true, record: result.record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to record escalation.' } },
      { status: 500 },
    );
  }
}
