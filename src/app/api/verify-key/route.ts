import { NextResponse } from 'next/server';
import { getGoogleAiApiKey } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey: clientApiKey } = body;

    const apiKey =
      (clientApiKey && clientApiKey.trim().replace(/^["']|["']$/g, '')) ||
      getGoogleAiApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_KEY',
          message: 'No API key provided. Please paste your API key.',
        },
        { status: 400 }
      );
    }

    // Auto-detect provider by prefix
    if (apiKey.startsWith('gsk_')) {
      // Groq Cloud verification
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          provider: 'Groq Cloud',
          message: '✅ Groq Cloud key verified! Fast Llama-3.2/4 Vision ready.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          error: 'INVALID_GROQ_KEY',
          message: err?.error?.message || 'Invalid Groq API key.',
        }, { status: 401 });
      }
    }

    if (apiKey.startsWith('sk-or-')) {
      // OpenRouter verification
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          provider: 'OpenRouter',
          message: '✅ OpenRouter key verified! Multi-model universal routing ready.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          error: 'INVALID_OPENROUTER_KEY',
          message: err?.error?.message || 'Invalid OpenRouter API key.',
        }, { status: 401 });
      }
    }

    if (apiKey.startsWith('sk-')) {
      // OpenAI verification
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          provider: 'OpenAI',
          message: '✅ OpenAI key verified! GPT-4o-mini vision ready.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          error: 'INVALID_OPENAI_KEY',
          message: err?.error?.message || 'Invalid OpenAI API key.',
        }, { status: 401 });
      }
    }

    // Default: Google AI Studio (AIzaSy... or standard Google key)
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      const models = (data.models || []).map((m: any) =>
        m.name.replace('models/', '')
      );
      return NextResponse.json({
        ok: true,
        provider: 'Google AI Studio',
        message: '✅ Google AI Studio key verified! Gemini & Gemma Vision ready.',
        availableModelsCount: models.length,
      });
    } else {
      let errorMsg = 'Invalid Google API key or network error.';
      try {
        const errJson = await res.json();
        errorMsg = errJson?.error?.message || errorMsg;
      } catch {
        errorMsg = await res.text();
      }

      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_KEY',
          message: errorMsg,
        },
        { status: 401 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'SERVER_ERROR',
        message: err?.message || 'Failed to verify key.',
      },
      { status: 500 }
    );
  }
}
