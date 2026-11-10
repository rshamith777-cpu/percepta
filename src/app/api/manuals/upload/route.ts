import { NextResponse } from 'next/server';
import { chunkExtractedPages } from '@/modules/manuals/chunking';
import { extractPdfPages, ManualProcessingError } from '@/modules/manuals/pdfExtract';
import type { OcrProgressEvent } from '@/modules/manuals/ocr';
import { assessManualRelevance } from '@/modules/manuals/relevance';
import { sanitizeManualTitle, saveManual } from '@/modules/manuals/store';

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 150;

function ndjson(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const wantsStream = request.headers.get('accept')?.includes('application/x-ndjson') || new URL(request.url).searchParams.get('stream') === '1';
  try {
    const form = await request.formData();
    const file = form.get('manual');
    const titleRaw = form.get('title');

    const jsonError = (status: number, payload: Record<string, unknown>) =>
      NextResponse.json({ ok: false, ...payload }, { status });

    if (!(file instanceof File)) {
      return jsonError(400, { error: 'Please select a PDF manual file to upload.' });
    }

    const filename = file.name || 'manual.pdf';
    const isPdfType = file.type === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    if (!isPdfType) {
      return jsonError(400, { error: 'Invalid file type. Please upload a PDF document. Uploaded content is never executed.' });
    }
    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      return jsonError(400, {
        error: `Invalid file size. PDF must be between 1 byte and ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))} MB.`,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const title = sanitizeManualTitle(typeof titleRaw === 'string' ? titleRaw : '', filename);

    const processManual = async (onProgress?: (e: OcrProgressEvent) => void) => {
      let extracted;
      try {
        extracted = await extractPdfPages(buffer, { maxPdfPages: MAX_PDF_PAGES, onProgress });
      } catch (error) {
        if (error instanceof ManualProcessingError) {
          const ocrRequired = error.code === 'OCR_REQUIRED';
          const ocrFailed = error.code === 'OCR_FAILED';
          return {
            ok: false as const,
            status: 400,
            body: {
              error: error.message,
              code: error.code,
              ocrRequired: ocrRequired || ocrFailed,
              ocrFailed,
              details: error.details,
            },
          };
        }
        throw error;
      }

      const tempManualId = 'manual-temp';
      const chunks = chunkExtractedPages(extracted.pages, { manualId: tempManualId, manualTitle: title });
      if (chunks.length === 0) {
        return {
          ok: false as const,
          status: 400,
          body: {
            error:
              'No usable text chunks could be created from this PDF. Configure OCR (OCR_ENABLED=true, OCR_PROVIDER=tesseract-local with Tesseract installed, or OCR_SERVICE_URL) for scanned/image-only documents. No text was fabricated.',
            code: 'OCR_REQUIRED',
            ocrRequired: true,
          },
        };
      }

      // Relevance validation: assess extracted document content (not filename alone) before grounding eligibility.
      const extractedText = extracted.pages.map((p) => p.text).join('\n').slice(0, 150000);
      const relevance = assessManualRelevance({ title, extractedText });

      if (!relevance.suitableForGrounding) {
        // Save metadata for visibility/removal, but do NOT store grounding chunks or allow grounding.
        const manual = await saveManual(
          {
            title,
            filename,
            pageCount: extracted.pageCount,
            status: 'irrelevant',
            ocrRequired: false,
            groundingEligible: false,
            relevanceReason: relevance.reason,
            relevanceCategory: relevance.category,
            error: relevance.reason,
            chunkCount: 0,
          },
          [],
        );
        return {
          ok: false as const,
          status: 422,
          body: {
            error: relevance.reason,
            code: 'MANUAL_IRRELEVANT',
            manualIrrelevant: true,
            manual, // saved for visibility/removal; not grounding-eligible
            relevance,
            message:
              `“${manual.title}” was processed, but it is not suitable for inverter diagnosis grounding. ${relevance.reason}`,
          },
        };
      }

      const manual = await saveManual(
        {
          title,
          filename,
          pageCount: extracted.pageCount,
          status: 'ready',
          ocrRequired: false,
          groundingEligible: true,
          relevanceReason: relevance.reason,
          relevanceCategory: relevance.category,
        },
        chunks,
      );

      const ocrNote = extracted.ocrUsed
        ? ` OCR ${extracted.ocrPartial ? 'partially applied' : 'applied'}${extracted.ocrEngine ? ` (${extracted.ocrEngine})` : ''} for scanned/low-text pages${extracted.scannedPageNumbers.length ? ` [pages: ${extracted.scannedPageNumbers.join(', ')}]` : ''}; page numbers preserved. OCR text may be inaccurate and is untrusted manufacturer-document content.`
        : extracted.scannedPageNumbers.length > 0
          ? ` Warning: low extractable text on page(s) ${extracted.scannedPageNumbers.join(', ')}; OCR may improve grounding if configured.`
          : '';
      const warningNote = extracted.ocrWarnings.length ? ` Warnings: ${extracted.ocrWarnings.join(' | ')}` : '';
      const relevanceNote = relevance.category === 'generic_electrical_safety' ? ` Note: ${relevance.reason}` : '';

      return {
        ok: true as const,
        status: 200,
        body: {
          manual,
          ocrUsed: extracted.ocrUsed,
          ocrPartial: extracted.ocrPartial,
          ocrEngine: extracted.ocrEngine,
          ocrWarnings: extracted.ocrWarnings,
          scannedPageNumbers: extracted.scannedPageNumbers,
          ocrProcessedPageNumbers: extracted.ocrProcessedPageNumbers,
          relevance,
          message: `Processed ${manual.title}: ${manual.pageCount} page(s), ${manual.chunkCount} chunk(s) stored with page-number metadata.${ocrNote}${warningNote}${relevanceNote}`,
        },
      };
    };

    if (!wantsStream) {
      const result = await processManual();
      return NextResponse.json({ ok: result.ok, ...result.body }, { status: result.status });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(ndjson(event)));
        try {
          send({ type: 'progress', phase: 'extracting_text', message: 'Validating PDF and starting text extraction…' });
          const result = await processManual((e) => send({ type: 'progress', ...e }));
          if (result.ok) send({ type: 'complete', ok: true, ...result.body });
          else send({ type: 'error', ok: false, ...result.body, status: result.status });
        } catch (error) {
          send({ type: 'error', ok: false, error: error instanceof Error ? error.message : 'Failed to upload/process the PDF manual.' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to upload/process the PDF manual.',
      },
      { status: 500 },
    );
  }
}
