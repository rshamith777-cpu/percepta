import { NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  prompt: z.string().min(3).max(500),
  userRequested: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid request. Ambient audio generation requires an explicit user request and prompt.' }, { status: 400 });
    }
    const enabled = (process.env.LYRIA_ENABLED ?? '').toLowerCase() === 'true';
    const mode = (process.env.LYRIA_MODE ?? 'disabled').trim().toLowerCase();
    const customUrl = (process.env.LYRIA_CUSTOM_URL ?? '').trim();
    if (!enabled || mode !== 'custom' || !customUrl) {
      return NextResponse.json({
        ok: false,
        unavailable: true,
        error: 'Lyria/ambient audio generation is unavailable or not configured. Existing browser speech synthesis voice controls remain available.',
      }, { status: 503 });
    }
    const apiKey = (process.env.LYRIA_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '').trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(customUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ prompt: parsed.data.prompt, feature: 'optional_ambient_audio_non_safety' }),
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Configured audio endpoint failed (${res.status}).`, details: text.slice(0, 300) }, { status: 502 });
      }
      let data: unknown = null;
      try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
      return NextResponse.json({
        ok: true,
        notice: 'Generated audio is optional ambient media only. It is not a safety feature, alarm, or critical warning.',
        result: data,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return NextResponse.json({ ok: false, error: 'Audio generation timed out.' }, { status: 504 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Audio generation failed.' }, { status: 500 });
  }
}
