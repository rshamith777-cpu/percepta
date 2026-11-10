import { NextResponse } from 'next/server';
import { appendRepairAction, makeAuditEvent, updateRecord } from '@/modules/maintenance/store';
import { recordRepairAttemptSchema } from '@/modules/maintenance/schemas';
import { canTransition } from '@/modules/maintenance/lifecycle';
import type { MaintenanceStatus } from '@/modules/maintenance/types';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as unknown;
    const parsed = recordRepairAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid repair attempt payload.', details: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) } },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const result = await updateRecord(id, (record) => {
      if (record.status === 'escalated_requires_qualified_technician') {
        return { error: 'This record is escalated. Create a new follow-up maintenance session if needed.', status: 409 };
      }
      const toStatus: MaintenanceStatus = d.moveToAwaitingVerification ? 'awaiting_verification' : 'repair_attempt_recorded';
      if (!canTransition(record.status, toStatus)) {
        return { error: `Cannot transition from ${record.status} to ${toStatus}.`, status: 409 };
      }
      const at = new Date().toISOString();
      record.repairActions.push(...appendRepairAction(d.repairActions, at));
      if (d.partsReplaced?.length) record.partsReplaced.push(...d.partsReplaced);
      if (d.technicianNotes !== undefined) record.technicianNotes = d.technicianNotes;
      const from = record.status;
      record.status = toStatus;
      return {
        record,
        audit: [
          makeAuditEvent({
            type: 'repair_attempt_recorded',
            fromStatus: from,
            toStatus,
            summary: `Repair attempt recorded (${d.repairActions.length} action(s)). ${toStatus === 'awaiting_verification' ? 'Awaiting verification.' : 'Verification not yet submitted.'}`,
            details: { actionCount: d.repairActions.length, partsCount: d.partsReplaced?.length ?? 0 },
          }),
        ],
      };
    });
    if (result.error) return NextResponse.json({ ok: false, error: { message: result.error } }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true, record: result.record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to record repair attempt.' } },
      { status: 500 },
    );
  }
}
