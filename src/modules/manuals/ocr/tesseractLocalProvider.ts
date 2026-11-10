import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOcrConfig } from './config';
import type { OcrDocumentResult, OcrPageResult, OcrProvider, OcrRecognizeOptions } from './types';

type NapiCanvasModule = typeof import('@napi-rs/canvas');

// pdfjs-dist renders through its own nested @napi-rs/canvas copy. Using a
// different copy here causes a native access violation when pdfjs draws onto
// our canvas context, so resolve the exact copy pdfjs uses.
function findPdfjsPackagePath(): string | null {
  const requireFromHere = createRequire(import.meta.url);
  try {
    const resolved = requireFromHere.resolve('pdfjs-dist/package.json');
    if (path.isAbsolute(resolved) && existsSync(resolved)) return resolved;
  } catch {
    // Bundlers may rewrite the specifier or fail resolution; fall back to a
    // filesystem search below.
  }

  const startDirs = [process.cwd()];
  try {
    startDirs.push(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url may be unavailable in non-ESM runtimes.
  }

  for (const start of startDirs) {
    let dir = start;
    for (let depth = 0; depth < 12; depth++) {
      const candidate = path.join(dir, 'node_modules', 'pdfjs-dist', 'package.json');
      if (existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function loadPdfJsCompatibleCanvas(): NapiCanvasModule {
  const pdfjsPackage = findPdfjsPackagePath();
  if (pdfjsPackage) {
    try {
      const requireFromPdfjs = createRequire(pdfjsPackage);
      return requireFromPdfjs('@napi-rs/canvas') as NapiCanvasModule;
    } catch {
      // Fall through to the app-level copy if pdfjs did not install one.
    }
  }
  return createRequire(import.meta.url)('@napi-rs/canvas') as NapiCanvasModule;
}

const napiCanvas = loadPdfJsCompatibleCanvas();
const { createCanvas } = napiCanvas;
const canvasGlobals = globalThis as unknown as {
  DOMMatrix?: unknown;
  ImageData?: unknown;
  Path2D?: unknown;
};
if (!canvasGlobals.DOMMatrix) canvasGlobals.DOMMatrix = napiCanvas.DOMMatrix;
if (!canvasGlobals.ImageData) canvasGlobals.ImageData = napiCanvas.ImageData;
if (!canvasGlobals.Path2D) canvasGlobals.Path2D = napiCanvas.Path2D;

const OCR_RENDER_SCALE = 2.5;

function normalizePageText(text: string): string {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveTesseractPath(): string {
  // Priority: explicit env var > .env.local config > Windows Program Files default > PATH search
  const explicit = (process.env.OCR_TESSERACT_PATH ?? process.env.TESSERACT_PATH ?? '').trim();
  if (explicit) return explicit;
  // Check common Windows install paths
  const commonPaths = [
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
    'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
  ];
  for (const p of commonPaths) {
    if (existsSync(p)) return p;
  }
  // Fall back to just 'tesseract' and let the spawn error be descriptive
  return 'tesseract';
}

async function runTesseract(imagePath: string, language: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
  const bin = resolveTesseractPath();
  const args = [imagePath, 'stdout', '-l', language, '--psm', '6'];
  return await new Promise<string>((resolve, reject) => {
    const proc = spawn(bin, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...(process.env.OCR_TESSDATA_PREFIX ? { TESSDATA_PREFIX: process.env.OCR_TESSDATA_PREFIX } : {}),
      },
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (err?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (err) reject(err);
      else resolve(value ?? '');
    };
    const kill = () => {
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
      try { proc.kill(); } catch { /* ignore */ }
    };
    const onAbort = () => { kill(); finish(Object.assign(new Error('OCR aborted.'), { name: 'AbortError' })); };
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => { kill(); finish(new Error(`Tesseract OCR timed out after ${timeoutMs}ms.`)); }, timeoutMs);
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString('utf8'); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf8'); });
    proc.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        finish(new Error(`Tesseract executable not found (${bin}). Install Tesseract OCR and set OCR_TESSERACT_PATH or add it to PATH.`));
      } else finish(err);
    });
    proc.on('close', (code) => {
      if (settled) return;
      if (code === 0) finish(undefined, stdout);
      else finish(new Error(`Tesseract exited with code ${code}: ${stderr.trim().slice(0, 500) || 'no stderr output'}`));
    });
  });
}

export class TesseractLocalOcrProvider implements OcrProvider {
  readonly name = 'tesseract-local';

  async isAvailable(): Promise<{ available: boolean; reason?: string }> {
    const bin = resolveTesseractPath();
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(bin, ['--version'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        const timer = setTimeout(() => { try { proc.kill(); } catch {} reject(new Error('timeout')); }, 5000);
        proc.on('error', reject);
        proc.on('close', (code) => {
          clearTimeout(timer);
          if (code === 0) resolve();
          else reject(new Error(`exit ${code}`));
        });
      });
      return { available: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        available: false,
        reason: msg.includes('ENOENT') || msg.includes('not found')
          ? `Tesseract executable not found (${bin}). Install Tesseract OCR and set OCR_TESSERACT_PATH or add it to PATH.`
          : `Tesseract is not available: ${msg}`,
      };
    }
  }

  async recognizePdf(buffer: Buffer, options: OcrRecognizeOptions = {}): Promise<OcrDocumentResult> {
    const cfg = getOcrConfig();
    const language = options.language ?? cfg.language;
    const timeoutMs = options.timeoutMs ?? cfg.timeoutMs;
    const maxPages = Math.max(1, Math.min(options.maxPages ?? cfg.maxPages, 200));
    const progress = options.onProgress;
    const signal = options.signal;
    const warnings: string[] = [];
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kriyaos-ocr-'));
    type PdfJsDoc = {
      numPages: number;
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: unknown) => { promise: Promise<void> };
      }>;
      destroy?: () => Promise<void>;
    };
    let doc: PdfJsDoc | null = null;

    const throwIfAborted = () => {
      if (signal?.aborted) throw Object.assign(new Error('OCR aborted.'), { name: 'AbortError' });
    };

    try {
      progress?.({ phase: 'extracting_text', message: 'Loading PDF for OCR rendering…' });
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        disableWorker: true,
        isEvalSupported: false,
        useSystemFonts: true,
      } as unknown as Parameters<typeof pdfjs.getDocument>[0]);
      doc = (await loadingTask.promise) as unknown as PdfJsDoc;
      const pageCount = doc.numPages;
      const requested = (options.pageNumbers?.length ? options.pageNumbers : Array.from({ length: pageCount }, (_, i) => i + 1))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= pageCount)
        .sort((a, b) => a - b);
      const uniquePages = [...new Set(requested)].slice(0, maxPages);
      if (requested.length > maxPages) {
        warnings.push(`OCR page limit applied: processed ${maxPages} of ${requested.length} requested page(s).`);
      }
      progress?.({ phase: 'scanned_detected', message: `OCR will process ${uniquePages.length} page(s).`, pageCount, pagesToOcr: uniquePages.length });

      const pages: OcrPageResult[] = [];
      for (let i = 0; i < uniquePages.length; i++) {
        throwIfAborted();
        const pageNumber = uniquePages[i];
        progress?.({ phase: 'ocr_page', message: `OCR processing page ${pageNumber} (${i + 1}/${uniquePages.length})…`, pageNumber, current: i + 1, total: uniquePages.length, pageCount });
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        // Render page to canvas.
        await page.render({ canvasContext: context as unknown, viewport }).promise;
        const png = canvas.toBuffer('image/png');
        const imgPath = path.join(tmpDir, `page-${pageNumber}-${randomUUID()}.png`);
        await fs.writeFile(imgPath, png);
        try {
          // Per-page timeout budget: divide remaining roughly, but keep a floor.
          const perPageTimeout = Math.max(5000, Math.min(timeoutMs, Math.ceil(timeoutMs / Math.max(1, uniquePages.length - i))));
          const raw = await runTesseract(imgPath, language, perPageTimeout, signal);
          const text = normalizePageText(raw);
          pages.push({ pageNumber, text, warnings: text ? undefined : ['OCR returned no text for this page.'] });
          if (!text) warnings.push(`Page ${pageNumber}: OCR returned no text.`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if ((err as Error)?.name === 'AbortError') throw err;
          warnings.push(`Page ${pageNumber}: OCR failed (${msg.slice(0, 200)}).`);
          pages.push({ pageNumber, text: '', warnings: [`OCR failed: ${msg.slice(0, 200)}`] });
        } finally {
          await fs.unlink(imgPath).catch(() => {});
        }
      }

      const anyText = pages.some((p) => p.text.trim().length > 0);
      progress?.({ phase: anyText ? 'ocr_complete' : 'ocr_failed', message: anyText ? `OCR completed for ${pages.length} page(s).` : 'OCR completed but returned no usable text.', pageCount });
      return { pages, engine: `${this.name} (${language})`, warnings };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      progress?.({ phase: 'ocr_failed', message: `OCR failed: ${msg}` });
      throw err;
    } finally {
      try { await doc?.destroy?.(); } catch {}
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}