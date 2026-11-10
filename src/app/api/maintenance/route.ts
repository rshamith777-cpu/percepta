import { NextResponse } from 'next/server';
import { createMaintenanceSession, listMaintenanceRecords } from '@/modules/maintenance/store';
import { createMaintenanceSessionSchema } from '@/modules/maintenance/schemas';

export async function GET() {
  try {
    const records = await listMaintenanceRecords();
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to list maintenance records.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createMaintenanceSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid maintenance session payload.', details: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`) } },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const result = await createMaintenanceSession({
      idempotencyKey: d.idempotencyKey,
      problemDescription: d.problemDescription.trim(),
      diagnosisSummary: d.diagnosisSummary.trim(),
      observedMachineComponent: d.observedMachineComponent?.trim(),
      machineEquipmentIdentifier: d.machineEquipmentIdentifier?.trim(),
      possibleIssue: d.possibleIssue?.trim(),
      model: d.model?.trim(),
      responseLanguage: d.responseLanguage?.trim(),
      manualReferences: d.manualReferences,
      safetyDecisionAtDiagnosis: (d.safetyDecisionAtDiagnosis ?? null) as never,
      diagnosisBlocked: d.diagnosisBlocked,
    });
    return NextResponse.json({ ok: true, record: result.record, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Failed to create maintenance session.' } },
      { status: 500 },
    );
  }
}
