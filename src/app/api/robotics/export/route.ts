import { NextResponse } from 'next/server';
import { getRoboticsTrajectoryRecord, listFullRoboticsTrajectoryRecords } from '@/modules/robotics/store';

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9-]{1,120}$/.test(id);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
    const id = url.searchParams.get('id')?.trim() || '';
    const equipmentIdentifier = url.searchParams.get('equipmentIdentifier')?.trim() || '';

    if (id && !isValidId(id)) {
      return NextResponse.json({ ok: false, error: { message: 'Invalid robotics record id.' } }, { status: 400 });
    }

    let records = await listFullRoboticsTrajectoryRecords();
    if (id) {
      const rec = await getRoboticsTrajectoryRecord(id);
      records = rec ? [rec] : [];
    } else if (equipmentIdentifier) {
      records = records.filter((r) => r.equipmentIdentifier === equipmentIdentifier);
    }

    if ((id || equipmentIdentifier) && records.length === 0) {
      return NextResponse.json({ ok: false, error: { message: 'No robotics records found for the requested selection.' } }, { status: 404 });
    }

    const suffix = id ? `record-${id}` : equipmentIdentifier ? `equipment-${equipmentIdentifier.replace(/[^a-zA-Z0-9-_]/g, '_')}` : 'all';
    if (format === 'csv') {
      const header = ['id','createdAt','updatedAt','syntheticDemo','dataLabel','equipmentIdentifier','operatingStatus','telemetryStatus','verificationOutcome','afterImageReference','safetyDecision','technicianActionSummary','maintenanceHistoryCount','notes'];
      const rows = records.map((r) => [
        r.id, r.createdAt, r.updatedAt ?? '', r.syntheticDemo, r.dataLabel, r.equipmentIdentifier, r.operatingStatus ?? '', r.telemetry?.status ?? 'missing', r.verificationOutcome, r.afterImageReference ?? '',
        r.safetyDecision ? r.safetyDecision.decision : '', r.technicianActionMetadata.summary, r.maintenanceHistory?.length ?? 0, r.notes ?? '',
      ].map(csvEscape).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kriyaos-robotics-${suffix}.csv"` } });
    }
    return NextResponse.json({
      ok: true,
      exportType: 'kriyaos-robotics-synthetic-prototype',
      syntheticDemoOnly: true,
      notice: 'Local synthetic prototype export. No real worker data. No automatic upload to BigQuery/Firebase/cloud.',
      exportedAt: new Date().toISOString(),
      filter: { id: id || null, equipmentIdentifier: equipmentIdentifier || null },
      records,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { message: error instanceof Error ? error.message : 'Export failed.' } }, { status: 500 });
  }
}
