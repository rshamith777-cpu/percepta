import { describe, expect, it } from 'vitest';
import { isGroundingEligible, migrateLegacyDoc } from './store';
import { retrieveRelevantPassages } from './retrieval';
import { validateManualGrounding } from './grounding';
import type { ManualDocument, StoredManualChunk } from './types';

const legacyReadyDoc = (overrides: Partial<ManualDocument> = {}): ManualDocument => ({
  id: 'legacy-1',
  title: 'Uploaded Manual',
  filename: 'manual.pdf',
  uploadedAt: '2026-01-01T00:00:00.000Z',
  pageCount: 1,
  chunkCount: 1,
  status: 'ready',
  ...overrides,
});

// Sanitized fixture derived from the actual reported offer-letter document type/content
// (personal identifiers removed; preserves HR/internship/fundraising/reporting/offer signals).
const OFFER_LETTER_CHUNKS: StoredManualChunk[] = [
  {
    id: 'legacy-1:1:0', manualId: 'legacy-1', manualTitle: 'Offer_Letter', pageNumber: 1, chunkIndex: 0,
    text: 'Internship Offer Letter Date: 26 Sept 2026 Place: Delhi. Dear Candidate, we are delighted to welcome you as an Intern – Social Media Marketing at our foundation, under a flagship initiative. This internship opportunity is designed to provide practical exposure.',
  },
  {
    id: 'legacy-1:2:0', manualId: 'legacy-1', manualTitle: 'Offer_Letter', pageNumber: 2, chunkIndex: 1,
    text: 'Annexure A – Terms and Conditions of the Internship. Role & Reporting: You are being appointed as an Intern under a Reporting Manager. Fundraising campaign support. Notify your manager in advance in case of unavoidable unavailability.',
  },
];

const INVERTER_CHUNKS: StoredManualChunk[] = [
  {
    id: 'm:1:0', manualId: 'm', manualTitle: 'Inverter Service Manual', pageNumber: 4, chunkIndex: 0,
    text: 'Troubleshooting: If fault code E031 appears, verify DC input voltage, PV string wiring, and insulation resistance on de-energized equipment. Qualified technician only. Check inverter display and AC breaker.',
  },
];

describe('legacy/stale manual relevance regression (Bug 1 persistence)', () => {
  it('treats legacy stored manual without relevance metadata as not automatically eligible (fail closed)', () => {
    const legacy = legacyReadyDoc(); // no groundingEligible/relevance metadata
    expect(isGroundingEligible(legacy)).toBe(false);
  });

  it('migrates legacy offer-letter record (actual reported document type) to not grounding-eligible', () => {
    const migrated = migrateLegacyDoc(legacyReadyDoc({ title: 'Offer_Letter_Sai', filename: 'Offer_Letter_Sai.pdf' }), OFFER_LETTER_CHUNKS);
    expect(migrated.groundingEligible).toBe(false);
    expect(['irrelevant', 'error']).toContain(migrated.status);
    expect(migrated.relevanceReason).toBeTruthy();
    expect(isGroundingEligible(migrated)).toBe(false);
  });

  it('migrates genuine inverter service manual legacy record to eligible with relevance metadata', () => {
    const migrated = migrateLegacyDoc(legacyReadyDoc({ title: 'Solar Inverter Service Manual', filename: 'manual.pdf' }), INVERTER_CHUNKS);
    expect(migrated.groundingEligible).toBe(true);
    expect(migrated.status).toBe('ready');
    expect(isGroundingEligible(migrated)).toBe(true);
  });

  it('fails closed when legacy metadata is missing and no readable text can be assessed', () => {
    const migrated = migrateLegacyDoc(legacyReadyDoc(), []);
    expect(migrated.groundingEligible).toBe(false);
    expect(isGroundingEligible(migrated)).toBe(false);
  });

  it('irrelevant/HR chunks must not produce manufacturer-supported diagnosis claims when not retrieved (defense in depth)', () => {
    // Store eligibility prevents retrieval; this test confirms that even if text were scored,
    // grounding validation cannot create supported claims without validated citations to retrieved passages.
    // Using inverter chunks as the only eligible retrieved set (simulating store filtering).
    const retrieved = retrieveRelevantPassages(INVERTER_CHUNKS, { problemDescription: 'inverter fault E031 dc input' });
    const grounding = validateManualGrounding(
      {
        visualObservationsFromImage: [],
        manualSupportedClaims: [{
          claim: 'Candidate should do fundraising reporting',
          citations: [{ manualTitle: 'Offer_Letter', pageNumber: 2, supportingPassage: OFFER_LETTER_CHUNKS[1].text }],
        }],
        aiSuggestionsNotSupportedByManual: [],
        manualGroundingStatus: 'grounded',
        groundingDisclosure: '',
        retrievedPassages: retrieved,
      },
      retrieved,
      true,
    );
    expect(grounding.manualGroundingStatus).toBe('not_grounded');
    expect(grounding.manualSupportedClaims).toHaveLength(0);
  });

  it('retrieval over a set containing only inverter chunks does not return offer-letter grounding (eligibility-filtered context)', () => {
    // Simulates store: only eligible chunk sets are passed to retrieval.
    const retrieved = retrieveRelevantPassages(INVERTER_CHUNKS, { problemDescription: 'internship reporting manager fundraising' });
    // Query is unrelated; may return 0 or only irrelevant-to-query inverter chunks, but never offer-letter chunks.
    expect(retrieved.every((p) => p.manualTitle !== 'Offer_Letter')).toBe(true);
  });
});
