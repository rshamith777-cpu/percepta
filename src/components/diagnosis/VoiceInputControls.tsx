'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SupportedLanguage } from '@/types';
import { getPreferredVoiceLocale, type VoiceInputStatus } from '@/modules/voice';

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInputControls({
  language,
  onTranscript,
  disabled,
}: {
  language: SupportedLanguage;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const wasListeningRef = useRef(false);
  const [status, setStatus] = useState<VoiceInputStatus>('idle');
  const [interim, setInterim] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  // Hydration-safe: server snapshot false; client detects browser API (stable per load).
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognitionCtor(),
    () => false,
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus('unsupported');
      setMessage('Speech recognition is not supported in this browser. Please type the problem description.');
      return;
    }
    if (disabled) return;

    recognitionRef.current?.abort();
    setInterim('');
    setMessage(null);
    setStatus('requesting_permission');

    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = getPreferredVoiceLocale(language);
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      wasListeningRef.current = true;
      setStatus('listening');
      setMessage(`Listening (${rec.lang}). Speak the observed problem. You can review and edit the text before diagnosis.`);
    };
    rec.onerror = (event) => {
      const code = event?.error ?? 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setStatus('error');
        setMessage('Microphone permission was denied or unavailable. Use the text input field to describe the problem.');
      } else if (code === 'no-speech') {
        setStatus('error');
        setMessage('No speech was detected. Try again or type the problem description.');
      } else if (code === 'audio-capture') {
        setStatus('error');
        setMessage('No microphone was found or audio capture failed. Use the text input field.');
      } else if (code === 'network') {
        setStatus('error');
        setMessage('Speech recognition network error (browser speech service). Try again or type the problem description.');
      } else if (code === 'aborted') {
        setStatus('idle');
        setMessage(null);
      } else {
        setStatus('error');
        setMessage(`Speech recognition error (${code}). You can type the problem description.`);
      }
    };
    rec.onresult = (event) => {
      setStatus('processing');
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript ?? '';
        if (result?.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        onTranscript(finalText.trim());
        setMessage('Speech transcribed into the problem description. Review/edit the text before running diagnosis.');
      }
      setStatus('listening');
    };
    rec.onend = () => {
      const hadSession = wasListeningRef.current;
      wasListeningRef.current = false;
      if (recognitionRef.current === rec) recognitionRef.current = null;
      setInterim('');
      setStatus((s) => (s === 'error' || s === 'unsupported' ? s : 'idle'));
      setMessage((m) => {
        if (m && (m.includes('denied') || m.includes('error') || m.includes('No speech') || m.includes('network'))) return m;
        if (m && m.includes('transcribed')) return m;
        return hadSession ? 'Voice input stopped. Review/edit the problem description before diagnosis.' : m;
      });
    };

    try {
      rec.start();
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Could not start speech recognition.');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Voice input (optional)</p>
        {status !== 'listening' && status !== 'requesting_permission' ? (
          <button
            type="button"
            onClick={startListening}
            disabled={disabled || !supported}
            className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            🎤 Start microphone
          </button>
        ) : (
          <button type="button" onClick={stopListening} className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
            Stop listening
          </button>
        )}
        <span className="text-xs text-foreground/65">
          Status: {supported ? status.replaceAll('_', ' ') : 'unsupported'} · Locale hint: {getPreferredVoiceLocale(language)}
        </span>
      </div>
      {!supported ? (
        <p className="mt-2 text-sm text-amber-900">
          Browser speech recognition is not supported here. Use the text input field below (working fallback).
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-foreground/70">
        Speech is converted to text only; diagnosis is never auto-submitted. Review and edit the transcription before analysis. Browser support and recognition accuracy vary by device/browser/language.
      </p>
      {interim ? <p className="mt-2 rounded-lg bg-brand/5 p-2 text-sm text-foreground/80"><strong>Interim:</strong> {interim}</p> : null}
      {message ? <p className="mt-2 text-sm text-foreground/80">{message}</p> : null}
    </div>
  );
}
