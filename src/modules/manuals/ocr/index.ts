import { getOcrConfig } from './config';
import { HttpOcrServiceProvider } from './httpServiceProvider';
import { TesseractLocalOcrProvider } from './tesseractLocalProvider';
import type { OcrProvider } from './types';

export function getConfiguredOcrProvider(): OcrProvider | null {
  const cfg = getOcrConfig();
  if (!cfg.enabled) return null;
  if (cfg.provider === 'tesseract-local' || cfg.provider === 'local-tesseract' || cfg.provider === 'tesseract') {
    return new TesseractLocalOcrProvider();
  }
  if (cfg.provider === 'http-service' || cfg.provider === 'http' || cfg.provider === 'service') {
    return new HttpOcrServiceProvider(cfg.serviceUrl);
  }
  // Unknown/unsupported provider: return a provider that reports unavailable (no fake OCR).
  return {
    name: `unsupported:${cfg.provider}`,
    async isAvailable() {
      return {
        available: false,
        reason: `OCR provider "${cfg.provider}" is not supported. Supported: OCR_PROVIDER=tesseract-local (local Tesseract executable) or OCR_PROVIDER=http-service with OCR_SERVICE_URL.`,
      };
    },
    async recognizePdf() {
      throw new Error(`OCR provider "${cfg.provider}" is not supported. No OCR text was fabricated.`);
    },
  };
}

export * from './types';
export * from './config';
export { HttpOcrServiceProvider, TesseractLocalOcrProvider };
