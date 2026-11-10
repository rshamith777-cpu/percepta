import { DemoCmmsAdapter, createDisabledCmmsResult } from './demoAdapter';
import { getCmmsConfig } from './config';
import type { CmmsAdapter, CmmsSyncResult } from './types';
import type { MaintenanceRecord } from '@/modules/maintenance/types';

export function getCmmsAdapter(): CmmsAdapter | null {
  const cfg = getCmmsConfig();
  if (cfg.mode === 'demo') return new DemoCmmsAdapter();
  // "configured" mode is reserved for future real connectors; do not pretend a real ERP is connected.
  return null;
}

export async function syncRecordToCmms(record: MaintenanceRecord): Promise<CmmsSyncResult> {
  const cfg = getCmmsConfig();
  const adapter = getCmmsAdapter();
  if (!adapter) {
    if (cfg.mode === 'configured') {
      return createDisabledCmmsResult(
        'CMMS integration is marked configured, but no real connector is implemented in this build. No real ERP/CMMS system was contacted. Use the demo adapter or implement a real connector.',
        false,
      );
    }
    return createDisabledCmmsResult(
      'ERP/CMMS integration is not configured. Set CMMS_ENABLED=true and CMMS_PROVIDER=demo for a clearly labeled synthetic demonstration, or configure a future real connector. No real ERP/CMMS system was contacted.',
      false,
    );
  }
  try {
    return await adapter.syncMaintenanceRecord(record);
  } catch (error) {
    return {
      ok: false,
      mode: adapter.getStatus().mode,
      adapter: adapter.name,
      syntheticDemo: adapter.syntheticDemo,
      message: 'CMMS sync failed. No real ERP/CMMS state should be assumed changed.',
      retryable: true,
      details: [error instanceof Error ? error.message : String(error)],
      auditedAt: new Date().toISOString(),
    };
  }
}

export * from './types';
export * from './config';
export * from './export';
