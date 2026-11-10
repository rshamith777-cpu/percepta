import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { chunkExtractedPages } from './chunking';
import { validateManualGrounding } from './grounding';
import { ManualProcessingError, extractPdfPages } from './pdfExtract';
import { retrieveRelevantPassages } from './retrieval';
import { evaluateSafetyGate } from '@/modules/safety';
import { createDefaultSafetyChecklist } from '@/modules/safety/checklist';
import type { RetrievedManualPassage, StoredManualChunk } from './types';
import type { OcrProvider } from './ocr/types';

async function createTestPdf(pages: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const page = doc.addPage([612, 792]);
    const lines = text.split('\n');
    let y = 740;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 12, font });
      y -= 18;
    }
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

describe('PDF extraction (Phase 3)', () => {
  it('extracts text per page and preserves actual PDF page numbers (text PDF; OCR not needed)', async () => {
    const buffer = await createTestPdf([
      'Solar Inverter Manual Page One\nError code E01 indicates DC input undervoltage.\nCheck PV string connections when de-energized.',
      'Solar Inverter Manual Page Two\nWarning LED amber means grid frequency issue.\nRecord alarm history from display.',
    ]);
    const result = await extractPdfPages(buffer);

    expect(result.pageCount).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[0].text).toMatch(/E01/i);
    expect(result.pages[1].text).toMatch(/amber/i);
    expect(result.ocrUsed).toBe(false);
  }, 20000);

  it('rejects invalid PDFs', async () => {
    await expect(extractPdfPages(Buffer.from('not a pdf'))).rejects.toMatchObject({
      name: 'ManualProcessingError',
      code: 'INVALID_PDF',
    } satisfies Partial<ManualProcessingError>);
  });

  it('detects PDFs with no extractable text and explains OCR is required', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]); // blank page, no text
    const buffer = Buffer.from(await doc.save());
    await expect(extractPdfPages(buffer, { ocrEnabled: false })).rejects.toMatchObject({
      code: 'OCR_REQUIRED',
    });
    try {
      await extractPdfPages(buffer, { ocrEnabled: false });
    } catch (e) {
      expect(e).toBeInstanceOf(ManualProcessingError);
      expect((e as ManualProcessingError).message).toMatch(/OCR/i);
    }
  }, 20000);
});

describe('Chunk creation', () => {
  it('creates chunks with preserved page numbers and document metadata', () => {
    const chunks = chunkExtractedPages(
      [
        { pageNumber: 3, text: 'Section A. DC undervoltage fault. Inspect PV isolator status when de-energized. '.repeat(6) },
        { pageNumber: 4, text: 'Section B. Communication fault. Check RS485 wiring and termination. '.repeat(6) },
      ],
      { manualId: 'manual-1', manualTitle: 'Test Inverter Manual' },
      { maxChars: 220, overlapChars: 30, minChunkChars: 30 },
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.manualId === 'manual-1')).toBe(true);
    expect(chunks.every((c) => c.manualTitle === 'Test Inverter Manual')).toBe(true);
    expect(chunks.every((c) => c.pageNumber === 3 || c.pageNumber === 4)).toBe(true);
    expect(chunks.some((c) => c.pageNumber === 3)).toBe(true);
    expect(chunks.some((c) => c.pageNumber === 4)).toBe(true);
  });
});

describe('Retrieval', () => {
  const chunks: StoredManualChunk[] = [
    {
      id: 'c1', manualId: 'm1', manualTitle: 'Manual A', pageNumber: 5, chunkIndex: 1,
      text: 'Error code E01: DC input undervoltage. Verify PV string voltage on the display after the system is confirmed de-energized by qualified procedure.',
    },
    {
      id: 'c2', manualId: 'm1', manualTitle: 'Manual A', pageNumber: 8, chunkIndex: 2,
      text: 'Communication fault E07: Check RS485 cable polarity and shield termination.',
    },
  ];

  it('returns relevant passages with document title and page numbers', () => {
    const results = retrieveRelevantPassages(chunks, { problemDescription: 'The inverter shows E01 DC undervoltage' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].manualTitle).toBe('Manual A');
    expect(results[0].pageNumber).toBe(5);
    expect(results[0].passage).toMatch(/E01/);
  });

  it('returns no passages when no relevant content is found', () => {
    const results = retrieveRelevantPassages(chunks, { problemDescription: 'hydraulic valve gasket torque sequence' });
    expect(results).toEqual([]);
  });
});

describe('Citation metadata and grounding validation', () => {
  const retrieved: RetrievedManualPassage[] = [
    {
      manualId: 'm1',
      manualTitle: 'Service Manual',
      pageNumber: 12,
      chunkId: 'm1:p12:c1',
      passage: 'If alarm E01 appears, record the DC voltage shown on the display and consult the qualified service procedure.',
      score: 2.5,
    },
  ];

  it('accepts citations that match retrieved passages and preserves display metadata', () => {
    const result = validateManualGrounding(
      {
        visualObservationsFromImage: ['Display shows E01'],
        manualSupportedClaims: [
          {
            claim: 'E01 should be recorded from the display.',
            citations: [{ manualTitle: 'Service Manual', pageNumber: 12, supportingPassage: 'If alarm E01 appears, record the DC voltage shown on the display and consult the qualified service procedure.' }],
          },
        ],
        aiSuggestionsNotSupportedByManual: ['Check installation date.'],
        manualGroundingStatus: 'grounded',
        groundingDisclosure: 'grounded',
        retrievedPassages: retrieved,
      },
      retrieved,
      true,
    );

    expect(result.manualGroundingStatus).toBe('grounded');
    expect(result.manualSupportedClaims[0].citations[0]).toMatchObject({ manualTitle: 'Service Manual', pageNumber: 12 });
    expect(result.manualSupportedClaims[0].citations[0].supportingPassage).toMatch(/E01/);
  });

  it('rejects fabricated citations and labels claims as unsupported', () => {
    const result = validateManualGrounding(
      {
        visualObservationsFromImage: [],
        manualSupportedClaims: [
          {
            claim: 'Replace capacitor C7.',
            citations: [{ manualTitle: 'Fake Manual', pageNumber: 999, supportingPassage: 'Replace capacitor C7 immediately.' }],
          },
        ],
        aiSuggestionsNotSupportedByManual: [],
        manualGroundingStatus: 'grounded',
        groundingDisclosure: 'x',
        retrievedPassages: retrieved,
      },
      retrieved,
      true,
    );

    expect(result.manualSupportedClaims).toHaveLength(0);
    expect(result.manualGroundingStatus).toBe('not_grounded');
    expect(result.aiSuggestionsNotSupportedByManual.some((s) => /unsupported/i.test(s))).toBe(true);
  });

  it('returns explicit no-manual and no-relevant-content disclosures', () => {
    const noManuals = validateManualGrounding(undefined, [], false);
    expect(noManuals.manualGroundingStatus).toBe('no_manuals');
    expect(noManuals.groundingDisclosure).toMatch(/not grounded/i);

    const noRelevant = validateManualGrounding(undefined, [], true);
    expect(noRelevant.manualGroundingStatus).toBe('not_grounded');
    expect(noRelevant.groundingDisclosure).toMatch(/No relevant manual content found/i);
  });
});

describe('Safety gate integration with manual-grounded diagnosis', () => {
  it('blocks unsafe AI output even when manual grounding data is present', () => {
    const decision = evaluateSafetyGate({
      problemDescription: 'Inverter shows E01 on de-energized demo unit.',
      equipmentStatus: 'de_energized_confirmed',
      checklist: createDefaultSafetyChecklist('de_energized_confirmed'),
      aiGeneratedText: JSON.stringify({
        manualGrounding: {
          manualSupportedClaims: [{ claim: 'Open the energized panel', citations: [] }],
        },
        stepByStepInspectionGuidance: [{ order: 1, instruction: 'Open the energized inverter panel.' }],
      }),
    });
    expect(decision.decision).toBe('block');
  });

  it('keeps pre-diagnosis safety block for uncertain equipment before grounding matters', () => {
    const decision = evaluateSafetyGate({
      problemDescription: 'Not sure if inverter is de-energized; E01 shown.',
      equipmentStatus: 'uncertain',
      checklist: createDefaultSafetyChecklist('uncertain'),
    });
    expect(decision.decision).toBe('block');
  });
});

describe('OCR integration (deterministic provider fixtures; not real OCR engine accuracy)', () => {
  it('uses configured OCR provider for scanned/image-only PDFs and preserves page numbers', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]); // page 1, no text
    doc.addPage([612, 792]); // page 2, no text
    const buffer = Buffer.from(await doc.save());

    const provider: OcrProvider = {
      name: 'test-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf(_buf, opts) {
        expect(opts?.pageNumbers).toEqual([1, 2]);
        return {
          engine: 'test-ocr-fixture',
          warnings: [],
          pages: [
            { pageNumber: 1, text: 'Inverter alarm E05 indicates AC output overvoltage. Confirm system is de-energized by qualified procedure before inspection.' },
            { pageNumber: 2, text: 'Record alarm history from the display and check grid settings on page 2 of this manual.' },
          ],
        };
      },
    };

    const result = await extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true });
    expect(result.pageCount).toBe(2);
    expect(result.ocrUsed).toBe(true);
    expect(result.ocrEngine).toBe('test-ocr-fixture');
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[0].text).toMatch(/E05/);
    expect(result.pages[1].text).toMatch(/page 2/i);

    const chunks = chunkExtractedPages(result.pages, { manualId: 'm-ocr', manualTitle: 'OCR Manual' });
    const passages = retrieveRelevantPassages(chunks, { problemDescription: 'E05 AC output overvoltage alarm' });
    expect(passages.length).toBeGreaterThan(0);
    expect(passages[0].pageNumber).toBe(1);

    const grounding = validateManualGrounding({
      visualObservationsFromImage: ['Alarm E05 visible'],
      manualSupportedClaims: [{ claim: 'E05 relates to AC output overvoltage.', citations: [{ manualTitle: 'OCR Manual', pageNumber: 1, supportingPassage: passages[0].passage.slice(0, 120) }] }],
      aiSuggestionsNotSupportedByManual: [],
      manualGroundingStatus: 'grounded',
      groundingDisclosure: 'grounded',
      retrievedPassages: passages,
    }, passages, true);
    expect(grounding.manualGroundingStatus).toBe('grounded');
    expect(grounding.manualSupportedClaims[0].citations[0].pageNumber).toBe(1);
  }, 20000);

  it('handles mixed text/scanned PDFs by targeting scanned pages and preserving all original page numbers', async () => {
    const buffer = await createTestPdf([
      'Page 1 has clear extractable text. Inverter model X100 service overview and safety notices for de-energized demo units.',
      '', // scanned/low-text page 2 simulation (pdf-lib creates a page; we draw no text)
    ]);
    // The blank page becomes low-text; verify OCR is asked only for that page when provider is present.
    const provider: OcrProvider = {
      name: 'mixed-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf(_buf, opts) {
        expect(opts?.pageNumbers).toEqual([2]);
        return { engine: 'mixed-ocr-fixture', warnings: [], pages: [{ pageNumber: 2, text: 'Page 2 scanned content: check DC isolator status indicator when de-energized by qualified procedure.' }] };
      },
    };
    const result = await extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true });
    expect(result.pageCount).toBe(2);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[0].text).toMatch(/X100/);
    expect(result.pages[1].text).toMatch(/DC isolator/i);
    expect(result.scannedPageNumbers).toContain(2);
  }, 20000);

  it('reports OCR failure clearly without fabricating text', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'failing-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf() { throw new Error('OCR engine crashed'); },
    };
    await expect(extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true })).rejects.toMatchObject({
      code: 'OCR_FAILED',
    });
  }, 20000);

  it('handles empty OCR output without fabricating text', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'empty-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf() { return { engine: 'empty-ocr-fixture', warnings: ['empty'], pages: [{ pageNumber: 1, text: '   ' }] }; },
    };
    await expect(extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true })).rejects.toMatchObject({
      code: 'OCR_FAILED',
    });
  }, 20000);

  it('reports partial OCR completion when some scanned pages still lack usable text', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'partial-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf() {
        return {
          engine: 'partial-ocr-fixture',
          warnings: [],
          pages: [
            { pageNumber: 1, text: 'Readable scanned page 1: inverter status LED descriptions and alarm E11 context for de-energized inspection.' },
            { pageNumber: 2, text: '' },
          ],
        };
      },
    };
    const result = await extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true });
    expect(result.ocrUsed).toBe(true);
    expect(result.ocrPartial).toBe(true);
    expect(result.ocrWarnings.join(' ')).toMatch(/partial|lacking usable text/i);
  }, 20000);

  it('honors abort/timeout-style failures from provider', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'timeout-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf() { throw Object.assign(new Error('timed out'), { name: 'AbortError' }); },
    };
    await expect(extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true })).rejects.toMatchObject({
      code: 'OCR_FAILED',
    });
  }, 20000);

  it('keeps OCR_REQUIRED when OCR is unavailable for scanned PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'unavailable-ocr-fixture',
      async isAvailable() { return { available: false, reason: 'service not configured' }; },
      async recognizePdf() { return { engine: 'x', warnings: [], pages: [] }; },
    };
    await expect(extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true })).rejects.toMatchObject({
      code: 'OCR_REQUIRED',
    });
  }, 20000);

  it('validates citations against OCR-extracted text and rejects fabricated citations', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    const buffer = Buffer.from(await doc.save());
    const provider: OcrProvider = {
      name: 'citation-ocr-fixture',
      async isAvailable() { return { available: true }; },
      async recognizePdf() {
        return { engine: 'citation-ocr-fixture', warnings: [], pages: [{ pageNumber: 1, text: 'Alarm E22 indicates fan fault. Check fan connector with system de-energized by qualified procedure.' }] };
      },
    };
    const result = await extractPdfPages(buffer, { ocrProvider: provider, ocrEnabled: true });
    const chunks = chunkExtractedPages(result.pages, { manualId: 'm-cite', manualTitle: 'OCR Cite Manual' });
    const passages = retrieveRelevantPassages(chunks, { problemDescription: 'E22 fan fault alarm' });
    expect(passages[0].pageNumber).toBe(1);
    const grounding = validateManualGrounding({
      visualObservationsFromImage: [],
      manualSupportedClaims: [{ claim: 'Replace motor immediately.', citations: [{ manualTitle: 'OCR Cite Manual', pageNumber: 1, supportingPassage: 'Replace motor immediately and bypass interlocks.' }] }],
      aiSuggestionsNotSupportedByManual: [],
      manualGroundingStatus: 'grounded',
      groundingDisclosure: 'x',
      retrievedPassages: passages,
    }, passages, true);
    expect(grounding.manualSupportedClaims).toHaveLength(0);
    expect(grounding.manualGroundingStatus).toBe('not_grounded');
  }, 20000);
});

describe('Real local Tesseract OCR integration', () => {
  it('runs Tesseract on the scanned ZX-731 fixture and preserves the PDF page number', async () => {
    process.env.OCR_TESSERACT_PATH = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
    process.env.TESSDATA_PREFIX = 'C:\\Program Files\\Tesseract-OCR\\tessdata';

    const { TesseractLocalOcrProvider } = await import('./ocr/tesseractLocalProvider');
    const tesseract = new TesseractLocalOcrProvider();
    const availability = await tesseract.isAvailable();
    expect(availability.available).toBe(true);

    const fixturePath = path.resolve(process.cwd(), 'scanned-manual.pdf');
    const buffer = await fs.readFile(fixturePath);
    const result = await extractPdfPages(buffer, { ocrProvider: tesseract, ocrEnabled: true });

    expect(result.ocrUsed).toBe(true);
    expect(result.scannedPageNumbers).toContain(1);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toContain('ZX-731');
    expect(result.ocrEngine).toMatch(/tesseract-local/i);
  }, 180000);
});
