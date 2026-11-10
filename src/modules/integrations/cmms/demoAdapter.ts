import type { MaintenanceRecord } from '@/modules/maintenance/types';
import { getCmmsConfig } from './config';
import type { CmmsAdapter, CmmsSyncResult } from './types';

export class DemoCmmsAdapter implements CmmsAdapter {
  readonly name = 'demo-synthetic-cmms';
  readonly syntheticDemo = true;

  getStatus(): import('./types').CmmsConfig {
    const cfg = getCmmsConfig();
    return { ...cfg, mode: (cfg.mode === 'demo' ? 'demo' : cfg.mode) as import('./types').CmmsIntegrationMode, provider: this.name };
  }

  async syncMaintenanceRecord(record: MaintenanceRecord): Promise<CmmsSyncResult> {
    const auditedAt = new Date().toISOString();
    // Deterministic synthetic external ID for demo traceability; clearly not a real ERP record.
    const externalId = `DEMO-CMMS-${record.id.slice(0, 8).toUpperCase()}`;
    return {
      ok: true,
      mode: 'demo',
      adapter: this.name,
      syntheticDemo: true,
      message:
        'Demonstration CMMS sync completed with clearly labeled synthetic data. No real ERP/CMMS system was contacted.',
      externalId,
      retryable: false,
      details: [
        `Synthetic demo external ID: ${externalId}`,
        `Local maintenance record: ${record.id}`,
        `Status mapped for demo: ${record.status}`,
        'Real CMMS credentials/integration are not configured; this result is not a real external work order.',
      ],
      auditedAt,
    };
  }
}

export function createDisabledCmmsResult(message: string, retryable = false): CmmsSyncResult {
  return {
    ok: false,
    mode: 'disabled',
    adapter: 'none',
    syntheticDemo: false,
    message,
    retryable,
    auditedAt: new Date().toISOString(),
  };
}
