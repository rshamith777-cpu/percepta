import { NextResponse } from 'next/server';
import {
  getCapability,
  getCmmsConnectionState,
  getDatabaseStatus,
  getHealthStatus,
  getIntegrationStatusSnapshot,
} from '@/modules/integrations/status';

export async function GET() {
  const status = getIntegrationStatusSnapshot();
  const database = getDatabaseStatus();
  const cmms = status.integrations.cmms;
  const cmmsCapability = getCapability(status, 'erp-cmms');

  return NextResponse.json({
    ok: true,
    app: 'KriyaOS',
    phase: 'final-closeout',
    scenario: 'solar_inverter_maintenance',
    languages: ['en', 'hi', 'kn'],
    source: '/api/integrations/status',
    integrations: {
      geminiDiagnosis: getHealthStatus(getCapability(status, 'gemini-diagnosis')),
      geminiLive: getHealthStatus(getCapability(status, 'gemini-live'), 'no_realtime_bridge'),
      database: database.status,
      watchdog: getHealthStatus(getCapability(status, 'gemma-offline'), 'advisory'),
      cmms: {
        ...cmms,
        connectionState: getCmmsConnectionState(cmms),
        summary: cmmsCapability?.summary ?? 'No authoritative CMMS status available.',
      },
      firebaseFirestore: getHealthStatus(getCapability(status, 'firebase-firestore')),
      bigquery: getHealthStatus(getCapability(status, 'bigquery')),
      cloudRun: getHealthStatus(getCapability(status, 'cloud-run')),
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
    notice:
      'Truthful status only. Configuration does not imply verified external connectivity. Deterministic safety gate is authoritative; integrations cannot override safety decisions.',
  });
}
