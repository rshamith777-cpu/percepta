export interface OcrPageResult {
  pageNumber: number; // 1-based, must preserve original PDF page number
  text: string;
  confidence?: number;
  warnings?: string[];
}

export interface OcrDocumentResult {
  pages: OcrPageResult[];
  engine: string;
  warnings: string[];
}

export type OcrProgressPhase =
  | 'extracting_text'
  | 'scanned_detected'
  | 'ocr_page'
  | 'ocr_complete'
  | 'ocr_partial'
  | 'ocr_unavailable'
  | 'ocr_failed';

export interface OcrProgressEvent {
  phase: OcrProgressPhase;
  message: string;
  pageNumber?: number;
  pageCount?: number;
  pagesToOcr?: number;
  current?: number;
  total?: number;
}

export interface OcrRecognizeOptions {
  language?: string;
  maxPages?: number;
  /** Original 1-based PDF page numbers to OCR (e.g. scanned/low-text pages). Providers may ignore but should respect when possible. */
  pageNumbers?: number[];
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (event: OcrProgressEvent) => void;
}

export interface OcrProvider {
  readonly name: string;
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  recognizePdf(buffer: Buffer, options?: OcrRecognizeOptions): Promise<OcrDocumentResult>;
}

export interface OcrConfig {
  enabled: boolean;
  provider: string;
  language: string;
  maxPages: number;
  timeoutMs: number;
  serviceUrl?: string;
  tesseractPath?: string;
}
