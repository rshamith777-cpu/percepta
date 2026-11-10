import type { SupportedLanguage } from '@/types';

export type VoiceInputStatus = 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'unsupported' | 'error';
export type VoiceOutputStatus = 'idle' | 'speaking' | 'paused' | 'unsupported' | 'error';

export interface VoiceStatusMessage {
  tone: 'neutral' | 'success' | 'warning' | 'error';
  message: string;
}

export const VOICE_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string[]> = {
  en: ['en-IN', 'en-US', 'en-GB', 'en'],
  hi: ['hi-IN', 'hi'],
  kn: ['kn-IN', 'kn'],
};

export function getPreferredVoiceLocale(language: SupportedLanguage): string {
  return VOICE_LOCALE_BY_LANGUAGE[language][0];
}
