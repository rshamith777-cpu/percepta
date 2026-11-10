/**
 * Server-side environment configuration.
 * Do not import this module into client components; keep secrets on the server.
 * Presence/config hints do NOT prove verified external connectivity.
 */

function has(name: string): boolean {
  return Boolean((process.env[name] ?? '').trim());
}

export function getGoogleAiApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY;
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'file:./dev.db';
}

export function getMissingServerConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.GOOGLE_AI_API_KEY) missing.push('GOOGLE_AI_API_KEY');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  return missing;
}

/** Truthful config-presence hints only (never secret values). */
export function getIntegrationConfigPresence() {
  return {
    gemini: has('GOOGLE_AI_API_KEY'),
    nanoBanana: has('NANO_BANANA_ENABLED') || has('NANO_BANANA_API_KEY') || has('NANO_BANANA_MODEL'),
    lyriaHook: (process.env.LYRIA_ENABLED ?? '').toLowerCase() === 'true' && has('LYRIA_CUSTOM_URL'),
    agentSkills: has('GOOGLE_AGENT_SKILLS_ENABLED'),
    firebase: has('FIREBASE_ENABLED') || has('FIREBASE_PROJECT_ID'),
    bigquery: has('BIGQUERY_ENABLED') || has('GOOGLE_CLOUD_PROJECT') || has('BIGQUERY_DATASET'),
    watchdogLocal: (process.env.WATCHDOG_MODE ?? '').trim().toLowerCase() === 'local-runtime' && has('WATCHDOG_URL'),
    cmmsConfigured: (process.env.CMMS_ENABLED ?? '').toLowerCase() === 'true',
  };
}
