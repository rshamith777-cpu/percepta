import type { OcrDocumentResult, OcrPageResult, OcrProvider, OcrRecognizeOptions } from './types';
import { getOcrConfig } from './config';

export class HttpOcrServiceProvider implements OcrProvider {
  readonly name = 'http-ocr-service';
  constructor(private readonly url = getOcrConfig().serviceUrl) {}

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    if (!this.url) return { available: false, reason: 'OCR_SERVICE_URL is not configured.' };
    return { available: true };
  }

  async recognizePdf(buffer: Buffer, options: OcrRecognizeOptions = {}): Promise<OcrDocumentResult> {
    const cfg = getOcrConfig();
    if (!this.url) throw new Error('OCR service URL is not configured (OCR_SERVICE_URL).');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
    const onAbort = () => controller.abort();
    options?.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: buffer.toString('base64'),
          language: options.language ?? cfg.language,
          maxPages: options.maxPages ?? cfg.maxPages,
          pageNumbers: options.pageNumbers,
          preservePageNumbers: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OCR service failed (${res.status}): ${text.slice(0, 300) || res.statusText}`);
      }
      const data = (await res.json()) as { pages?: Array<{ pageNumber?: number; text?: string; confidence?: number; warnings?: string[] }>; warnings?: string[]; engine?: string };
      const pages: OcrPageResult[] = Array.isArray(data.pages)
        ? data.pages
            .map((p) => ({
              pageNumber: Number(p.pageNumber),
              text: typeof p.text === 'string' ? p.text : '',
              confidence: typeof p.confidence === 'number' ? p.confidence : undefined,
              warnings: Array.isArray(p.warnings) ? p.warnings.filter((w): w is string => typeof w === 'string') : undefined,
            }))
            .filter((p) => Number.isFinite(p.pageNumber) && p.pageNumber >= 1)
        : [];
      return { pages, engine: typeof data.engine === 'string' ? data.engine : this.name, warnings: Array.isArray(data.warnings) ? data.warnings.filter((w): w is string => typeof w === 'string') : [] };
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error(`OCR service timed out after ${cfg.timeoutMs}ms.`);
      throw error;
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener('abort', onAbort);
    }
  }
}
