/**
 * AI module (Phase 1).
 * Server-side Gemini integration via Google AI Studio (@google/genai), with
 * structured multilingual diagnosis, Zod validation, and safety-constrained prompts.
 * API keys must never be exposed in frontend code.
 */
export const aiModuleReady = true;
export const aiProvider = 'google-ai-studio-gemini' as const;
export { diagnoseSolarInverterImage, DiagnosisServiceError } from './geminiDiagnosis';
export { diagnosisResultSchema, supportedLanguageSchema } from './diagnosisSchema';
