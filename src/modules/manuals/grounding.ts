import type {
  ManualGroundingCitation,
  ManualGroundingResult,
  ManualSupportedClaim,
  RetrievedManualPassage,
} from './types';

function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function citationMatchesRetrieved(citation: ManualGroundingCitation, passages: RetrievedManualPassage[]): boolean {
  const citedPassage = normalizeForMatch(citation.supportingPassage);
  if (citedPassage.length < 20) return false;
  return passages.some((p) => {
    if (p.pageNumber !== citation.pageNumber) return false;
    if (normalizeForMatch(p.manualTitle) !== normalizeForMatch(citation.manualTitle)) return false;
    const retrieved = normalizeForMatch(p.passage);
    return (
      retrieved.includes(citedPassage) ||
      citedPassage.includes(retrieved.slice(0, Math.min(200, retrieved.length))) ||
      retrieved === citedPassage
    );
  });
}

export function validateManualGrounding(
  grounding: ManualGroundingResult | undefined,
  retrievedPassages: RetrievedManualPassage[],
  manualsAvailable: boolean,
): ManualGroundingResult {
  const baseDisclosureNoManuals =
    'No uploaded manuals are available. This diagnosis is not grounded in manufacturer-manual passages.';
  const baseDisclosureNotFound =
    'No relevant manual content found for this problem description. This diagnosis is not grounded in the uploaded manual.';
  const baseDisclosureGrounded =
    'Some claims below are grounded in retrieved manufacturer-manual passages with page citations. Visual observations come from the uploaded image. Other AI suggestions are not supported by the manual and must be treated as advisory.';

  if (!manualsAvailable) {
    return {
      visualObservationsFromImage: grounding?.visualObservationsFromImage ?? [],
      manualSupportedClaims: [],
      aiSuggestionsNotSupportedByManual: [
        ...(grounding?.aiSuggestionsNotSupportedByManual ?? []),
        ...(grounding?.manualSupportedClaims?.map((c) => `${c.claim} (citation could not be validated; no manuals available)`) ?? []),
      ],
      manualGroundingStatus: 'no_manuals',
      groundingDisclosure: baseDisclosureNoManuals,
      retrievedPassages,
    };
  }

  if (retrievedPassages.length === 0) {
    return {
      visualObservationsFromImage: grounding?.visualObservationsFromImage ?? [],
      manualSupportedClaims: [],
      aiSuggestionsNotSupportedByManual: [
        ...(grounding?.aiSuggestionsNotSupportedByManual ?? []),
        ...(grounding?.manualSupportedClaims?.map((c) => `${c.claim} (no relevant manual passage retrieved)`) ?? []),
      ],
      manualGroundingStatus: 'not_grounded',
      groundingDisclosure: baseDisclosureNotFound,
      retrievedPassages,
    };
  }

  const safeClaims: ManualSupportedClaim[] = [];
  const downgraded: string[] = [...(grounding?.aiSuggestionsNotSupportedByManual ?? [])];

  for (const claim of grounding?.manualSupportedClaims ?? []) {
    const validCitations = claim.citations.filter((c) => citationMatchesRetrieved(c, retrievedPassages));
    if (validCitations.length > 0) {
      safeClaims.push({ claim: claim.claim, citations: validCitations });
      if (validCitations.length < claim.citations.length) {
        downgraded.push(`${claim.claim} (one or more citations could not be validated against retrieved passages)`);
      }
    } else {
      downgraded.push(`${claim.claim} (unsupported by retrieved manual passages)`);
    }
  }

  const grounded = safeClaims.length > 0;
  return {
    visualObservationsFromImage: grounding?.visualObservationsFromImage ?? [],
    manualSupportedClaims: safeClaims,
    aiSuggestionsNotSupportedByManual: downgraded,
    manualGroundingStatus: grounded ? 'grounded' : 'not_grounded',
    groundingDisclosure: grounded ? baseDisclosureGrounded : baseDisclosureNotFound,
    retrievedPassages,
  };
}
