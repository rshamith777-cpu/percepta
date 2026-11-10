export interface ManualDocument {
  id: string;
  title: string;
  filename: string;
  uploadedAt: string; // ISO 8601
  pageCount: number;
  chunkCount: number;
  status: 'processing' | 'ready' | 'error' | 'irrelevant';
  error?: string;
  /** True when the PDF appears scanned/image-only or has no extractable text. */
  ocrRequired?: boolean;
  /** False when the document must not be used for diagnosis grounding (e.g., irrelevant HR/offer content). */
  groundingEligible?: boolean;
  /** Human-readable explanation when not eligible or limited. */
  relevanceReason?: string;
  relevanceCategory?: 'inverter_or_equipment_manual' | 'generic_electrical_safety' | 'unrelated_hr_offer' | 'unrelated_general' | 'insufficient_text' | 'unverified_legacy';
}

export interface ExtractedPageText {
  pageNumber: number; // 1-based actual PDF page
  text: string;
}

export interface StoredManualChunk {
  id: string;
  manualId: string;
  manualTitle: string;
  pageNumber: number; // 1-based actual PDF page
  chunkIndex: number;
  text: string;
}

export interface RetrievedManualPassage {
  manualId: string;
  manualTitle: string;
  pageNumber: number;
  chunkId: string;
  passage: string;
  score: number;
}

export interface ManualGroundingCitation {
  manualTitle: string;
  pageNumber: number;
  supportingPassage: string;
}

export interface ManualSupportedClaim {
  claim: string;
  citations: ManualGroundingCitation[];
}

export interface ManualGroundingResult {
  visualObservationsFromImage: string[];
  manualSupportedClaims: ManualSupportedClaim[];
  aiSuggestionsNotSupportedByManual: string[];
  manualGroundingStatus: 'grounded' | 'not_grounded' | 'no_manuals';
  /** Explicit disclosure shown in UI/API. */
  groundingDisclosure: string;
  /** Retrieved passages provided to the model (for UI display and citation validation). */
  retrievedPassages: RetrievedManualPassage[];
}
