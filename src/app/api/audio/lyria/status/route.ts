import { NextResponse } from 'next/server';

export async function GET() {
  const enabled = (process.env.LYRIA_ENABLED ?? '').toLowerCase() === 'true';
  const mode = (process.env.LYRIA_MODE ?? 'disabled').trim().toLowerCase();
  const customUrl = (process.env.LYRIA_CUSTOM_URL ?? '').trim();
  const hasKey = Boolean((process.env.LYRIA_API_KEY ?? '').trim() || (process.env.GOOGLE_AI_API_KEY ?? '').trim());
  const available = enabled && mode === 'custom' && Boolean(customUrl);
  return NextResponse.json({
    ok: true,
    lyria: {
      available,
      enabled,
      mode,
      hasCredentials: hasKey,
      feature: 'optional-ambient-audio',
      speechGuidance: 'Browser speech synthesis remains the supported spoken technician guidance path.',
      notice: available
        ? 'Lyria custom endpoint is configured. Generated audio is optional ambient media only, never a safety alarm or critical warning.'
        : 'Lyria is unavailable/not configured. Set LYRIA_ENABLED=true, LYRIA_MODE=custom, and LYRIA_CUSTOM_URL to enable an explicitly configured audio endpoint. Existing voice controls remain available.',
      limitations: [
        'Generated audio must be user-requested; never auto-generate during diagnosis.',
        'Generated music/audio is not a safety feature, alarm, or critical warning.',
        'Official Google Lyria access may require Vertex AI/Google Cloud auth, quotas, or specific API availability; this build provides a configurable integration hook and graceful disablement.',
      ],
    },
  });
}
