import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMaintenanceRecord, makeAuditEvent, updateRecord } from '@/modules/maintenance/store';

/**
 * Explicit, user-triggered sync for ORDINARY maintenance note drafts only.
 * SAFETY: never modifies safety gate decisions, isolation/safe-to-touch status,
 * verified_resolved state, authorization decisions, or verification/safety-critical fields.
 * Server-side maintenance/safety validation remains authoritative.
 */
const syncSchema = z.object({
  idempotencyKey: z.string().min(1).max(120),
  draftText: z.string().max(4000),
  baseRecordUpdatedAt: z.string().max(60).optional(),
  mode: z.enum(['append', 'replace']).optional().default('replace'),
}).strict();

function alreadyApplied(record: { auditEvents?: Array<{ type: string; details?: Record<string, unknown> }> }, key: string): boolean {
  return (record.auditEvents ?? []).some((e) => e.type === 'notes_updated' && e.details?.draftSyncIdempotencyKey === key);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as unknown;
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_DRAFT_SYNC', message: 'Invalid draft sync payload.', details: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) } }, // no secrets
        { status: 400 },
      );
    }
    const d = parsed.data;
    const existing = await getMaintenanceRecord(id);
    if (!existing) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Maintenance record not found.' } }, { status: 404 });
    if (alreadyApplied(existing, d.idempotencyKey)) {
      return NextResponse.json({ ok: true, record: existing, alreadyApplied: true, sync: 'technician_notes_draft' });
    }
    if (d.baseRecordUpdatedAt && existing.updatedAt !== d.baseRecordUpdatedAt) {
      return NextResponse.json({
        ok: false,
        error: {
          code: 'DRAFT_CONFLICT',
          message: 'Draft conflict: maintenance record changed on the server since this draft was created.',
          serverUpdatedAt: existing.updatedAt,
          serverTechnicianNotesPreview: existing.technicianNotes.slice(0, 500),
        },
      }, { status: 409 });
    }
    const result = await updateRecord(id, (record) => {
      if (alreadyApplied(record, d.idempotencyKey)) return { record, audit: [] };
      const nextNotes = d.mode === 'append' && record.technicianNotes.trim()
        ? `${record.technicianNotes.trimEnd()}\n\n${d.draftText.trim()}`
        : d.draftText;
      record.technicianNotes = nextNotes.slice(0, 4000);
      return {
        record,
        audit: [makeAuditEvent({
          type: 'notes_updated',
          summary: 'Ordinary technician notes updated via explicit offline draft sync (idempotent). No safety/verification state modified.',
          details: { source: 'offline_draft_sync', draftSyncIdempotencyKey: d.idempotencyKey, mode: d.mode },
        })],
      };
    });
    if (result.error) return NextResponse.json({ ok: false, error: { message: result.error } }, { status: result.status ?? 400 });
    return NextResponse.json({ ok: true, record: result.record, alreadyApplied: false, sync: 'technician_notes_draft' });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Draft sync failed.' } },
      { status: 500 },
    );
  }
}
