'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { DiagnosisResult, SafetyDecision, SupportedLanguage } from '@/types';
import { buildDiagnosisSpeechText, getPreferredVoiceLocale, type VoiceOutputStatus } from '@/modules/voice';

function pickVoice(lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefs = [getPreferredVoiceLocale(lang), lang, `${lang}-`, lang === 'en' ? 'en' : lang];
  for (const pref of prefs) {
    const found = voices.find((v) => v.lang === pref || v.lang.toLowerCase().startsWith(pref.toLowerCase()));
    if (found) return found;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export function VoiceOutputControls({
  language,
  diagnosis,
  safetyDecision,
  blockedEscalation,
}: {
  language: SupportedLanguage;
  diagnosis: DiagnosisResult | null;
  safetyDecision: SafetyDecision | null;
  blockedEscalation: string | null;
}) {
  const [status, setStatus] = useState<VoiceOutputStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  // Hydration-safe: server snapshot false; client detects browser API (stable per load).
  const supported = useSyncExternalStore(
    () => () => {},
    () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    () => false,
  );

  const speechText = useMemo(() => {
    if (diagnosis) {
      return buildDiagnosisSpeechText({ diagnosis, safetyDecision, blockedEscalation }).text;
    }
    if (blockedEscalation || safetyDecision?.decision === 'block') {
      return [
        'Repair guidance is blocked by the deterministic safety gate.',
        safetyDecision?.reason ? `Safety reason: ${safetyDecision.reason}` : '',
        safetyDecision?.safeNextAction ? `Safe next action: ${safetyDecision.safeNextAction}` : '',
        safetyDecision?.verificationDisclaimer ?? '',
        'Safety warnings remain visible. Do not open energized electrical equipment or touch live components.',
      ].filter(Boolean).join(' ');
    }
    if (safetyDecision) {
      return [
        `Safety decision: ${safetyDecision.decision}.`,
        `Reason: ${safetyDecision.reason}.`,
        `Safe next action: ${safetyDecision.safeNextAction}.`,
        safetyDecision.verificationDisclaimer,
      ].join(' ');
    }
    return '';
  }, [diagnosis, safetyDecision, blockedEscalation]);

  useEffect(() => {
    // Stop speech when navigating away/unmounting or when content language context changes start new sessions.
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    // Starting another speech session context: cancel any ongoing speech.
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    // Status is reset by speak/stop handlers and cancel events; avoid synchronous setState in effect.
  }, [speechText, language]);

  function speak() {
    if (!supported) {
      setStatus('unsupported');
      setMessage('Speech output is not supported in this browser.');
      return;
    }
    if (!speechText) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(speechText);
    utter.lang = getPreferredVoiceLocale(language);
    const voice = pickVoice(language);
    if (voice) utter.voice = voice;
    utter.onstart = () => { setStatus('speaking'); setMessage(null); };
    utter.onend = () => { setStatus('idle'); };
    utter.onerror = (e) => {
      if ((e as { error?: string }).error === 'canceled' || (e as { error?: string }).error === 'interrupted') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setMessage(`Speech output error. Browser voices for ${language} may be limited; text remains available.`);
    };
    utter.onpause = () => setStatus('paused');
    utter.onresume = () => setStatus('speaking');
    window.speechSynthesis.speak(utter);
    if (!voice) {
      setMessage(`Using browser default voice (requested ${getPreferredVoiceLocale(language)}). Installed voices/language support vary by device.`);
    }
  }

  function pause() { window.speechSynthesis?.pause(); }
  function resume() { window.speechSynthesis?.resume(); }
  function stop() {
    window.speechSynthesis?.cancel();
    setStatus('idle');
  }

  const hasContent = !!speechText;
  if (!hasContent) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Voice output (browser speech synthesis)</p>
        <button type="button" onClick={speak} disabled={!supported} className="rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
          🔊 Speak
        </button>
        <button type="button" onClick={pause} disabled={!supported || status !== 'speaking'} className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50">Pause</button>
        <button type="button" onClick={resume} disabled={!supported || status !== 'paused'} className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50">Resume</button>
        <button type="button" onClick={stop} disabled={!supported || status === 'idle'} className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50">Stop</button>
        <span className="text-xs text-foreground/65">Status: {supported ? status : 'unsupported'}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-foreground/70">
        Reads diagnosis and safety warnings in the selected language when a matching browser voice is available. Safety warnings remain visible on screen. Voice output is browser speech synthesis (not Gemini/Lyria). Do not rely on audio alone for safety-critical decisions.
      </p>
      {!supported ? <p className="mt-1 text-sm text-amber-900">Speech output is not supported in this browser; read the on-screen text.</p> : null}
      {message ? <p className="mt-1 text-sm text-foreground/80">{message}</p> : null}
    </div>
  );
}
