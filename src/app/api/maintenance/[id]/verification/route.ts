import { NextResponse } from 'next/server';
import { appendVerification, makeAuditEvent, updateRecord } from '@/modules/maintenance/store';
import { recordVerificationSchema } from '@/modules/maintenance/schemas';
import { canTransition, statusFromVerificationOutcome, validateSuccessfulVerification } from '@/modules/maintenance/lifecycle';
import type { VerificationRecord } from '@/modules/maintenance/types';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as unknown;
    const parsed = recordVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid verification payload.', details: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) } },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const result = await updateRecord(id, (record) => {
      if (record.status === 'diagnosis_recorded') {
        return { error: 'Record a repair attempt before submitting verification.', status: 409 };
      }
      const toStatus = statusFromVerificationOutcome(d.outcome);
      if (!canTransition(record.status, toStatus)) {
        return { error: `Cannot transition from ${record.status} to ${toStatus}.`, status: 409 };
      }
      const verification: VerificationRecord = {
        recordedAt: new Date().toISOString(),
        outcome: d.outcome,
        checklist: d.checklist.map((c) => ({ ...c, required: c.required ?? false })),
        evidence: d.evidence.trim(),
        technicianConfirmation: d.technicianConfirmation,
        followUpRecommendations: d.followUpRecommendations?.trim(),
        recordedBy: 'technician',
      };

      if (d.outcome === 'issue_resolved') {
        const ok = validateSuccessfulVerification({
          record: verification,
          safetyDecisionAtDiagnosis: record.safetyDecisionAtDiagnosis,
          diagnosisBlocked: record.diagnosisBlocked,
        });
        if (!ok.ok) return { error: ok.errors.join(' '), status: 409 };
      }
      if (d.outcome === 'escalated' && d.escalationReason?.trim()) {
        record.escalationReason = d.escalationReason.trim();
      }

      const from = record.status;
      const changed = !!record.currentVerification;
      record.status = toStatus;
      const audit = [appendVerification(record, verification, changed)];
      if (from !== toStatus) {
        audit.push(makeAuditEvent({
          type: 'status_changed',
          fromStatus: from,
          toStatus,
          summary: `Status changed from ${from} to ${toStatus} based on technician-entered verification (not AI safety certification).`,
        }));
      }
      return { record, audit };
    });
    if (result.error) return NextResponse.json({ ok: false, error: { message: result.error } }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true, record: result.record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to record verification.' } },
      { status: 500 },
    );
  }
}
