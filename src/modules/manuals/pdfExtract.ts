import type { ExtractedPageText } from './types';
import { getConfiguredOcrProvider, getOcrConfig, type OcrProgressEvent, type OcrProvider } from './ocr';

export class ManualProcessingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_PDF'
      | 'EMPTY_PDF'
      | 'OCR_REQUIRED'
      | 'OCR_FAILED'
      | 'OCR_PARTIAL'
      | 'EXTRACTION_FAILED',
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'ManualProcessingError';
  }
}

function normalizePageText(text: string): string {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const MIN_PAGE_TEXT_CHARS = 20;
const MIN_TOTAL_TEXT_CHARS = 20;
const DEFAULT_MAX_PDF_PAGES = 150;

export interface PdfExtractionOptions {
  ocrProvider?: OcrProvider | null;
  ocrEnabled?: boolean;
  ocrLanguage?: string;
  ocrMaxPages?: number;
  maxPdfPages?: number;
  signal?: AbortSignal;
  onProgress?: (event: OcrProgressEvent) => void;
}

export interface PdfExtractionResult {
  pageCount: number;
  pages: ExtractedPageText[];
  ocrUsed: boolean;
  ocrPartial: boolean;
  ocrEngine?: string;
  ocrWarnings: string[];
  scannedPageNumbers: number[];
  ocrProcessedPageNumbers: number[];
}

export async function extractPdfPages(buffer: Buffer, options: PdfExtractionOptions = {}): Promise<PdfExtractionResult> {
  if (!buffer || buffer.length < 5) {
    throw new ManualProcessingError('The uploaded file is empty or invalid.', 'INVALID_PDF');
  }
  const header = buffer.subarray(0, 5).toString('latin1');
  if (header !== '%PDF-') {
    throw new ManualProcessingError('The uploaded file is not a valid PDF document.', 'INVALID_PDF');
  }

  const progress = options.onProgress;
  const throwIfAborted = () => {
    if (options.signal?.aborted) throw Object.assign(new Error('PDF processing aborted.'), { name: 'AbortError' });
  };

  try {
    progress?.({ phase: 'extracting_text', message: 'Extracting PDF text…' });
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // In Node, disable worker to avoid worker resolution issues in server/test contexts.
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
    } as unknown as Parameters<typeof pdfjs.getDocument>[0]);
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const maxPdfPages = Math.max(1, Math.min(options.maxPdfPages ?? DEFAULT_MAX_PDF_PAGES, 500));
    if (pageCount > maxPdfPages) {
      try { await doc.destroy(); } catch {}
      throw new ManualProcessingError(
        `PDF has ${pageCount} pages, which exceeds the supported limit of ${maxPdfPages} pages for this prototype. Split the manual into smaller PDFs.`,
        'INVALID_PDF',
      );
    }

    const pages: ExtractedPageText[] = [];
    let totalTextLength = 0;
    const scannedPageNumbers: number[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      throwIfAborted();
      progress?.({ phase: 'extracting_text', message: `Extracting text from page ${pageNumber} of ${pageCount}…`, pageNumber, current: pageNumber, total: pageCount, pageCount });
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = (content.items as Array<{ str?: string }>)
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .filter(Boolean);
      const text = normalizePageText(strings.join(' '));
      if (text.length < MIN_PAGE_TEXT_CHARS) scannedPageNumbers.push(pageNumber);
      totalTextLength += text.length;
      pages.push({ pageNumber, text });
    }

    try { await doc.destroy(); } catch { /* best-effort cleanup */ }

    if (pageCount <= 0) {
      throw new ManualProcessingError('The PDF contains no pages.', 'EMPTY_PDF');
    }

    const cfg = getOcrConfig();
    const ocrEnabled = options.ocrEnabled ?? cfg.enabled;
    const ocrProvider = options.ocrProvider !== undefined ? options.ocrProvider : (ocrEnabled ? getConfiguredOcrProvider() : null);

    if (scannedPageNumbers.length > 0) {
      progress?.({ phase: 'scanned_detected', message: `Scanned or low-text pages detected: ${scannedPageNumbers.join(', ')}.`, pageCount, pagesToOcr: scannedPageNumbers.length });
    }

    if (scannedPageNumbers.length > 0 && ocrProvider) {
      const availability = await ocrProvider.isAvailable();
      if (!availability.available) {
        progress?.({ phase: 'ocr_unavailable', message: `OCR unavailable: ${availability.reason ?? 'unknown reason'}` });
        if (totalTextLength < MIN_TOTAL_TEXT_CHARS) {
          throw new ManualProcessingError(
            `No extractable text was found in this PDF and OCR is not available: ${availability.reason ?? 'unknown reason'}. Configure a local OCR engine (e.g., OCR_ENABLED=true, OCR_PROVIDER=tesseract-local with Tesseract installed) before scanned/image-only manuals can be grounded.`,
            'OCR_REQUIRED',
            `Scanned/image-only or low-text pages: ${scannedPageNumbers.join(', ')}. ${availability.reason ?? ''}`.trim(),
          );
        }
        return {
          pageCount,
          pages,
          ocrUsed: false,
          ocrPartial: true,
          ocrWarnings: [`OCR unavailable for scanned pages ${scannedPageNumbers.join(', ')}: ${availability.reason ?? 'unknown reason'}. Extracted text may be incomplete.`],
          scannedPageNumbers,
          ocrProcessedPageNumbers: [],
        };
      }

      try {
        const ocrResult = await ocrProvider.recognizePdf(buffer, {
          language: options.ocrLanguage ?? cfg.language,
          maxPages: options.ocrMaxPages ?? cfg.maxPages,
          pageNumbers: scannedPageNumbers,
          timeoutMs: cfg.timeoutMs,
          signal: options.signal,
          onProgress: progress,
        });
        const byPage = new Map<number, string>();
        for (const p of ocrResult.pages) {
          const text = normalizePageText(p.text);
          if (Number.isFinite(p.pageNumber) && p.pageNumber >= 1 && p.pageNumber <= pageCount && text) {
            byPage.set(p.pageNumber, text);
          }
        }
        const ocrProcessedPageNumbers = ocrResult.pages
          .map((p) => p.pageNumber)
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= pageCount)
          .sort((a, b) => a - b);
        let mergedTotal = 0;
        for (const page of pages) {
          const ocrText = byPage.get(page.pageNumber);
          if (ocrText && (page.text.length < MIN_PAGE_TEXT_CHARS || ocrText.length > page.text.length)) {
            page.text = ocrText;
          }
          mergedTotal += page.text.length;
        }
        totalTextLength = mergedTotal;
        const missingAfterOcr = pages.filter((p) => scannedPageNumbers.includes(p.pageNumber) && p.text.length < MIN_PAGE_TEXT_CHARS).map((p) => p.pageNumber);
        const ocrPartial = missingAfterOcr.length > 0 && byPage.size < scannedPageNumbers.length;
        if (totalTextLength < MIN_TOTAL_TEXT_CHARS) {
          throw new ManualProcessingError(
            'OCR completed but no usable text could be extracted. The document may be unreadable or OCR returned empty page results. No OCR text was fabricated.',
            'OCR_FAILED',
            `OCR engine: ${ocrResult.engine}. Pages returned: ${ocrResult.pages.length}.`,
          );
        }
        progress?.({ phase: ocrPartial ? 'ocr_partial' : 'ocr_complete', message: ocrPartial ? `OCR partially completed; some scanned pages still have no usable text: ${missingAfterOcr.join(', ')}.` : `OCR completed for scanned pages.` });
        const warnings = [...(ocrResult.warnings ?? [])];
        if (ocrPartial) warnings.push(`OCR partially completed. Pages still lacking usable text: ${missingAfterOcr.join(', ')}.`);
        warnings.push('OCR text is extracted from rendered page images and may be inaccurate. Verify against the original manufacturer manual.');
        return {
          pageCount,
          pages,
          ocrUsed: byPage.size > 0,
          ocrPartial,
          ocrEngine: ocrResult.engine,
          ocrWarnings: warnings,
          scannedPageNumbers,
          ocrProcessedPageNumbers,
        };
      } catch (error) {
        if (error instanceof ManualProcessingError) throw error;
        if ((error as Error)?.name === 'AbortError') throw new ManualProcessingError('OCR was aborted.', 'OCR_FAILED');
        const message = error instanceof Error ? error.message : String(error);
        progress?.({ phase: 'ocr_failed', message: `OCR failed: ${message}` });
        if (totalTextLength < MIN_TOTAL_TEXT_CHARS) {
          throw new ManualProcessingError(
            `OCR processing failed for a scanned/image-only PDF: ${message}. No OCR text was fabricated.`,
            'OCR_FAILED',
            `Scanned/image-only or low-text pages: ${scannedPageNumbers.join(', ')}`,
          );
        }
        return {
          pageCount,
          pages,
          ocrUsed: false,
          ocrPartial: true,
          ocrWarnings: [`OCR failed for scanned pages ${scannedPageNumbers.join(', ')}; using extracted text only: ${message}. OCR text, when available, may be inaccurate.`],
          scannedPageNumbers,
          ocrProcessedPageNumbers: [],
        };
      }
    }

    if (totalTextLength < MIN_TOTAL_TEXT_CHARS) {
      throw new ManualProcessingError(
        'No extractable text was found in this PDF. It may be scanned/image-only. OCR is required before manual grounding can use this document. Enable OCR (OCR_ENABLED=true) and configure OCR_PROVIDER=tesseract-local with Tesseract installed, or OCR_PROVIDER=http-service with OCR_SERVICE_URL.',
        'OCR_REQUIRED',
        `Extracted text length: ${totalTextLength}. Scanned/image-only or low-text pages: ${scannedPageNumbers.join(', ') || 'all/unknown'}`,
      );
    }

    if (scannedPageNumbers.length > 0) {
      progress?.({ phase: 'ocr_unavailable', message: `Low-text pages detected (${scannedPageNumbers.join(', ')}), but OCR is not enabled. Configure OCR to improve grounding.` });
    }
    progress?.({ phase: 'extracting_text', message: 'PDF text extraction completed.' });
    return { pageCount, pages, ocrUsed: false, ocrPartial: false, ocrWarnings: [], scannedPageNumbers, ocrProcessedPageNumbers: [] };
  } catch (error) {
    if (error instanceof ManualProcessingError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/Invalid PDF|password|encrypted/i.test(message)) {
      throw new ManualProcessingError(
        'The PDF could not be processed. It may be invalid, corrupted, or password-protected. Uploaded PDFs are never executed.',
        'INVALID_PDF',
        message,
      );
    }
    throw new ManualProcessingError('Failed to extract text from the PDF.', 'EXTRACTION_FAILED', message);
  }
}