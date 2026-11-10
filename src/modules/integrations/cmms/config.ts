import type { CmmsConfig, CmmsIntegrationMode } from './types';

export function getCmmsConfig(): CmmsConfig {
  const provider = (process.env.CMMS_PROVIDER ?? '').trim().toLowerCase();
  const baseUrl = (process.env.CMMS_BASE_URL ?? '').trim() || undefined;
  const apiKey = (process.env.CMMS_API_KEY ?? '').trim();
  const enabled = (process.env.CMMS_ENABLED ?? '').trim().toLowerCase() === 'true';
  const hasCredentials = Boolean(baseUrl && apiKey);

  let mode: CmmsIntegrationMode = 'disabled';
  if (enabled && provider === 'demo') mode = 'demo';
  else if (enabled && hasCredentials) mode = 'configured';

  return {
    mode,
    provider: provider || 'none',
    baseUrl: baseUrl ? '[configured]' : undefined,
    hasCredentials,
    exportFormats: ['json', 'csv'],
  };
}

export function getCmmsAuditLog(message: string, details?: Record<string, unknown>) {
  return {
    at: new Date().toISOString(),
    source: 'cmms-integration',
    message,
    details,
  };
}
