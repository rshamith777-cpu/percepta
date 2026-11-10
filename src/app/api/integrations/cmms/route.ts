import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCmmsConfig, syncRecordToCmms } from '@/modules/integrations/cmms';
import { getMaintenanceRecord, updateRecord, makeAuditEvent } from '@/modules/maintenance/store';

export async function GET() {
  const config = getCmmsConfig();
  return NextResponse.json({
    ok: true,
    config,
    notice:
      config.mode === 'demo'
        ? 'Demo CMMS adapter is enabled. It uses clearly labeled synthetic data and does not contact a real ERP/CMMS system.'
        : config.mode === 'configured'
          ? 'CMMS is marked configured, but no real connector is active in this build. No real ERP/CMMS system will be contacted.'
          : 'No ERP/CMMS integration is active. No real ERP/CMMS system is connected.',
  });
}

const syncSchema = z.object({ recordId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid payload: recordId is required.' }, { status: 400 });
    }
    const record = await getMaintenanceRecord(parsed.data.recordId);
    if (!record) return NextResponse.json({ ok: false, error: 'Maintenance record not found.' }, { status: 404 });

    const result = await syncRecordToCmms(record);
    // Best-effort audit log on the local maintenance record; does not imply external success beyond result.
    await updateRecord(record.id, (r) => ({
      record: r,
      audit: [
        makeAuditEvent({
          type: 'notes_updated',
          toStatus: r.status,
          summary: `CMMS/ERP sync attempted (${result.adapter}, syntheticDemo=${String(result.syntheticDemo)}): ${result.ok ? 'ok' : 'failed/unavailable'}.`,
          details: { cmms: result },
        }),
      ],
    }));

    return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : result.retryable ? 503 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'CMMS sync failed.' },
      { status: 500 },
    );
  }
}
