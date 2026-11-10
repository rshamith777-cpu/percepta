import { NextResponse } from 'next/server';
import {
  formatCapability,
  getCapability,
  getDatabaseStatus,
  getIntegrationStatusSnapshot,
} from '@/modules/integrations/status';

export async function GET() {
  const status = getIntegrationStatusSnapshot();
  const database = getDatabaseStatus();
  const summary = (id: string) => formatCapability(getCapability(status, id));

  return NextResponse.json({
    ok: true,
    endpoint: '/api/integrations',
    message: 'KriyaOS integration status endpoint',
    note: 'Use /api/integrations/*/status for detailed per-integration status. This endpoint provides a summary derived from /api/integrations/status.',
    generatedAt: status.generatedAt,
    source: '/api/integrations/status',
    integrations: {
      geminiDiagnosis: summary('gemini-diagnosis'),
      geminiLive: summary('gemini-live'),
      database: `${database.status}: ${database.summary}`,
      watchdog: summary('gemma-offline'),
      cmms: summary('erp-cmms'),
      firebaseFirestore: summary('firebase-firestore'),
      bigquery: summary('bigquery'),
      cloudRun: summary('cloud-run'),
    },
    features: {
      diagnosis: 'available',
      deterministicSafetyGate: 'available_authoritative',
      manualRagGrounding: 'available',
      imageAnnotations2dOverlay: 'available_honest_2d_fallback',
      spatialArTracking: 'not_implemented',
      browserVoice: 'available_where_browser_supported',
      maintenanceRecordsVerification: 'available',
      roboticsLocalSynthetic: 'available_local_only',
      offlineFoundation: 'available_service_worker_production_only_api_never_cached',
      offlineFullSync: 'not_fully_implemented',
      cloudRunArtifacts: 'build_verified_not_deployed',
      ocrTesseractLocal: 'available_requires_local_tesseract',
    },
    link: '/api/integrations/nano-banana/status',
    directive: 'Per-integration status available at sub-routes under /api/integrations/*/status',
  });
}
