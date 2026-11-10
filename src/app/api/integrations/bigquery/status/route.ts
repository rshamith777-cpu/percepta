import { NextResponse } from 'next/server';
import { z } from 'zod';

const ingestSchema = z.object({
  eventType: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).optional(),
  /** Client must not send secrets/PII; server enforces no safety influence. */
  syntheticDemo: z.boolean().optional(),
}).strict();

export async function GET() {
  const configured = Boolean(
    (process.env.BIGQUERY_ENABLED ?? '').toLowerCase() === 'true' ||
    (process.env.GOOGLE_CLOUD_PROJECT ?? '').trim() ||
    (process.env.BIGQUERY_DATASET ?? '').trim(),
  );
  return NextResponse.json({
    ok: false,
    feature: 'bigquery-analytics',
    configured,
    available: false,
    verified: false,
    error: {
      code: 'BIGQUERY_NOT_INTEGRATED',
      message:
        'BigQuery analytics/event ingestion is not integrated or verified in this build. No data was inserted or queried. Analytics must not influence safety decisions.',
    },
    blocker:
      'Requires GCP project/dataset/table credentials, server-side client, validated schema, parameterized queries, and verified authenticated tests.',
  }, { status: 503 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      ok: false,
      feature: 'bigquery-analytics',
      performed: false,
      error: { code: 'INVALID_EVENT', message: 'Invalid analytics event payload.', issues: parsed.error.flatten() },
    }, { status: 400 });
  }
  // Explicitly do not ingest: no credentials/verified client; never affect safety.
  return NextResponse.json({
    ok: false,
    feature: 'bigquery-analytics',
    performed: false,
    acceptedForValidationOnly: true,
    eventType: parsed.data.eventType,
    error: {
      code: 'BIGQUERY_NOT_INTEGRATED',
      message: 'Event payload was validated locally but NOT ingested to BigQuery. No external write performed.',
    },
  }, { status: 501 });
}
