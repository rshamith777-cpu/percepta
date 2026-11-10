import { NextResponse } from 'next/server';
import { getMaintenanceRecord, listMaintenanceRecords } from '@/modules/maintenance/store';
import { exportMaintenanceRecordJson, exportMaintenanceRecordsCsv } from '@/modules/integrations/cmms/export';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
    const id = url.searchParams.get('id');
    const syntheticDemo = url.searchParams.get('syntheticDemo') === 'true';

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json({ ok: false, error: 'format must be json or csv.' }, { status: 400 });
    }

    if (id) {
      const record = await getMaintenanceRecord(id);
      if (!record) return NextResponse.json({ ok: false, error: 'Maintenance record not found.' }, { status: 404 });
      if (format === 'csv') {
        const bundle = exportMaintenanceRecordsCsv([record], syntheticDemo);
        return new NextResponse(bundle.body, { headers: { 'Content-Type': bundle.contentType, 'Content-Disposition': `attachment; filename=\"${bundle.filename}\"` } });
      }
      const bundle = exportMaintenanceRecordJson(record, syntheticDemo);
      return new NextResponse(bundle.body, { headers: { 'Content-Type': bundle.contentType, 'Content-Disposition': `attachment; filename=\"${bundle.filename}\"` } });
    }

    const summaries = await listMaintenanceRecords();
    const records = (await Promise.all(summaries.map((s) => getMaintenanceRecord(s.id)))).filter((r): r is NonNullable<typeof r> => r != null);
    if (format === 'csv') {
      const bundle = exportMaintenanceRecordsCsv(records, syntheticDemo);
      return new NextResponse(bundle.body, { headers: { 'Content-Type': bundle.contentType, 'Content-Disposition': `attachment; filename=\"${bundle.filename}\"` } });
    }
    const body = JSON.stringify({ exportType: 'kriyaos-maintenance-export', syntheticDemo, exportedAt: new Date().toISOString(), records }, null, 2);
    return new NextResponse(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename=\"maintenance-export.json\"' } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Export failed.' },
      { status: 500 },
    );
  }
}
