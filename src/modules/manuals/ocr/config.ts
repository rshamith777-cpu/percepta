import type { OcrConfig } from './types';

export function getOcrConfig(): OcrConfig {
  const enabled = (process.env.OCR_ENABLED ?? '').trim().toLowerCase() === 'true';
  const provider = (process.env.OCR_PROVIDER ?? 'http-service').trim().toLowerCase();
  const language = (process.env.OCR_LANGUAGE ?? 'eng').trim() || 'eng';
  const maxPages = Math.max(1, Math.min(200, Number(process.env.OCR_MAX_PAGES ?? '50') || 50));
  const timeoutMs = Math.max(1000, Math.min(600000, Number(process.env.OCR_TIMEOUT_MS ?? '180000') || 180000));
  const serviceUrl = (process.env.OCR_SERVICE_URL ?? '').trim() || undefined;
  const tesseractPath = (process.env.OCR_TESSERACT_PATH ?? process.env.TESSERACT_PATH ?? '').trim() || undefined;
  return { enabled, provider, language, maxPages, timeoutMs, serviceUrl, tesseractPath };
}
