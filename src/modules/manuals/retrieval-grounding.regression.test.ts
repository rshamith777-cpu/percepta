import { describe, expect, it } from 'vitest';
import { retrieveRelevantPassages } from './retrieval';
import { validateManualGrounding } from './grounding';
import type { StoredManualChunk } from './types';

const chunk = (overrides: Partial<StoredManualChunk> = {}): StoredManualChunk => ({
  id: 'c1',
  manualId: 'm1',
  manualTitle: 'Inverter Manual',
  pageNumber: 12,
  chunkIndex: 0,
  text: 'If the display is blank, check DC input voltage and external breaker status. Verify connections are secure on de-energized equipment.',
  ...overrides,
});

describe('manual retrieval/grounding consistency (Bugs 2,3 regression)', () => {
  it('returns only passages passing relevance thresholds as candidates (not all chunks)', () => {
    const chunks = [
      chunk(),
      chunk({ id: 'c2', pageNumber: 13, text: 'Company holiday calendar and office lunch menu.' }),
    ];
    const candidates = retrieveRelevantPassages(chunks, { problemDescription: 'display blank inverter no lights' });
    expect(candidates.length).toBe(1);
    expect(candidates[0].chunkId).toBe('c1');
  });

  it('does not mark diagnosis grounded when candidate passages exist but no claim has validated citations (Bug 2)', () => {
    const retrieved = retrieveRelevantPassages([chunk()], { problemDescription: 'display blank inverter' });
    expect(retrieved.length).toBeGreaterThan(0); // candidate retrieval passed threshold
    const grounding = validateManualGrounding(
      {
        visualObservationsFromImage: ['Display appears off'],
        manualSupportedClaims: [{ claim: 'Reset the inverter now', citations: [{ manualTitle: 'Wrong Manual', pageNumber: 99, supportingPassage: 'fabricated passage text that does not exist in retrieved content' }] }],
        aiSuggestionsNotSupportedByManual: [],
        manualGroundingStatus: 'grounded',
        groundingDisclosure: '',
        retrievedPassages: retrieved,
      },
      retrieved,
      true,
    );
    expect(grounding.manualSupportedClaims).toHaveLength(0);
    expect(grounding.manualGroundingStatus).toBe('not_grounded');
    expect(grounding.groundingDisclosure.toLowerCase()).toContain('not grounded');
  });

  it('accepts only citations matching retrieved manual title, page, and supporting passage (Bug 3)', () => {
    const retrieved = retrieveRelevantPassages([chunk()], { problemDescription: 'display blank inverter dc input' });
    const passage = retrieved[0].passage;
    const grounding = validateManualGrounding(
      {
        visualObservationsFromImage: [],
        manualSupportedClaims: [{
          claim: 'Check DC input/breaker status',
          citations: [{ manualTitle: 'Inverter Manual', pageNumber: 12, supportingPassage: passage.slice(0, 120) }],
        }],
        aiSuggestionsNotSupportedByManual: [],
        manualGroundingStatus: 'not_grounded',
        groundingDisclosure: '',
        retrievedPassages: retrieved,
      },
      retrieved,
      true,
    );
    expect(grounding.manualGroundingStatus).toBe('grounded');
    expect(grounding.manualSupportedClaims[0].citations[0]).toMatchObject({ manualTitle: 'Inverter Manual', pageNumber: 12 });
  });

  it('rejects citations pointing to wrong page/title even if text looks plausible (Bug 3)', () => {
    const retrieved = retrieveRelevantPassages([chunk()], { problemDescription: 'display blank inverter' });
    const grounding = validateManualGrounding(
      {
        visualObservationsFromImage: [],
        manualSupportedClaims: [{
          claim: 'Claim',
          citations: [{ manualTitle: 'Inverter Manual', pageNumber: 999, supportingPassage: retrieved[0].passage.slice(0, 80) }],
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
});
