/**
 * Manuals module (Phase 3).
 * PDF upload/extraction, per-page chunking with metadata, lightweight local retrieval,
 * and citation validation for manufacturer-manual grounding. No vector DB/external storage.
 * Uploaded manual content is reference data only and never overrides safety rules.
 */
export const manualsModuleReady = true;

export type {
  ExtractedPageText,
  ManualDocument,
  ManualGroundingCitation,
  ManualGroundingResult,
  ManualSupportedClaim,
  RetrievedManualPassage,
  StoredManualChunk,
} from './types';
export { chunkExtractedPages } from './chunking';
export { extractPdfPages, ManualProcessingError } from './pdfExtract';
export { formatRetrievedPassagesForPrompt, retrieveRelevantPassages } from './retrieval';
export { validateManualGrounding } from './grounding';
export { getAllManualChunks, getManualChunks, listManualDocuments, saveManual, sanitizeManualTitle } from './store';
