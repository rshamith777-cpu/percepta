import type { MaintenanceRecord } from '@/modules/maintenance/types';

export type CmmsIntegrationMode = 'disabled' | 'demo' | 'configured';

export interface CmmsConfig {
  mode: CmmsIntegrationMode;
  provider: string;
  baseUrl?: string;
  hasCredentials: boolean;
  exportFormats: Array<'json' | 'csv'>;
}

export interface CmmsSyncResult {
  ok: boolean;
  mode: CmmsIntegrationMode;
  adapter: string;
  syntheticDemo: boolean;
  message: string;
  externalId?: string;
  retryable?: boolean;
  details?: string[];
  auditedAt: string;
}

export interface CmmsAdapter {
  readonly name: string;
  readonly syntheticDemo: boolean;
  getStatus(): CmmsConfig;
  /** Demonstration/export-style sync. Never claims a real ERP connection without real configured integration. */
  syncMaintenanceRecord(record: MaintenanceRecord): Promise<CmmsSyncResult>;
}

export interface MaintenanceExportBundle {
  format: 'json' | 'csv';
  filename: string;
  contentType: string;
  body: string;
  syntheticDemo: boolean;
}
