/**
 * Heuristic relevance validation for uploaded PDFs. Uses extracted text/title (not filename alone).
 * Goal: block clearly unrelated documents (HR/offer/internship/legal-finance/marketing/admin) from grounding
 * inverter diagnosis, while preserving legitimate inverter manuals and generic electrical safety docs.
 * Relevance is based on technical domain evidence and document nature, not mere incidental presence of
 * words like "inverter", "voltage", "manual", or "safety". Fail closed for grounding when relevance
 * cannot be established.
 */
export type ManualRelevanceCategory =
  | 'inverter_or_equipment_manual'
  | 'generic_electrical_safety'
  | 'unrelated_hr_offer'
  | 'unrelated_general'
  | 'insufficient_text'
  | 'unverified_legacy';

export interface ManualRelevanceAssessment {
  suitableForGrounding: boolean;
  category: ManualRelevanceCategory;
  reason: string;
  signals: { domain: number; safety: number; unrelated: number; serviceEvidence: number };
}

// Technical/service-manual evidence (stronger than isolated generic words).
const DOMAIN_TERMS = [
  'inverter', 'solar inverter', 'pv inverter', 'photovoltaic', 'mppt', 'dc input', 'dc bus', 'ac output', 'grid-tied', 'anti-islanding',
  'fault code', 'error code', 'alarm code', 'warning code', 'troubleshooting', 'troubleshoot', 'commissioning', 'service manual', 'maintenance procedure',
  'wiring diagram', 'terminal block', 'circuit breaker', 'dc disconnect', 'ac disconnect', 'insulation resistance',
  'firmware version', 'display panel', 'led indicator', 'error display', 'heatsink', 'cooling fan', 'igbt', 'dc capacitor',
  'string voltage', 'array', 'ground fault', 'isolation fault', 'residual current', 'arc fault',
];

const GENERIC_DOMAIN_WORDS = [
  'inverter', 'voltage', 'current', 'frequency', 'power', 'grounding', 'earthing', 'breaker', 'fuse', 'relay', 'contactor',
  'cable', 'connector', 'wiring', 'terminal', 'manual', 'safety', 'warning', 'installation', 'operation',
];

const SERVICE_EVIDENCE_TERMS = [
  'service manual', 'troubleshooting', 'fault code', 'error code', 'alarm', 'maintenance', 'commissioning',
  'wiring diagram', 'terminal', 'specification', 'rated voltage', 'rated current', 'procedure', 'inspection',
  'replace', 'spare part', 'firmware', 'parameter', 'display', 'indicator',
];

const GENERIC_ELECTRICAL_SAFETY_TERMS = [
  'electrical safety', 'qualified person', 'qualified electrician', 'qualified technician', 'ppe',
  'arc flash', 'nfpa', 'osha', 'lockout/tagout', 'lockout tagout', 'hazardous energy', 'shock hazard',
  'de-energize', 'verify absence of voltage', 'safe work procedure', 'safety procedure', 'live electrical', 'energized equipment',
];

// Clearly non-technical/admin/HR/offer/recruitment/fundraising content.
const UNRELATED_TERMS = [
  'offer letter', 'internship', 'intern -', 'intern —', 'stipend', 'compensation', 'salary', 'ctc', 'joining date', 'employment offer',
  'candidate', 'recruitment', 'human resources', 'hr department', 'onboarding', 'probation', 'reporting manager',
  'benefits package', 'paid leave', 'termination', 'non-disclosure', 'confidentiality agreement',
  'invoice', 'purchase order', 'quotation', 'marketing campaign', 'brochure', 'resume', 'curriculum vitae',
  'bank account', 'pan card', 'aadhaar', 'passport photo',
  'fundraising', 'fund raising', 'donor', 'donation', 'pledge', 'ngo', 'social media marketing',
];

function countMatches(text: string, terms: string[]): number {
  const lower = ` ${text.toLowerCase()} `;
  let n = 0;
  for (const t of terms) {
    if (lower.includes(t.toLowerCase())) n += 1;
  }
  return n;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function assessManualRelevance(input: { title: string; extractedText: string }): ManualRelevanceAssessment {
  const combined = normalizeText(`${input.title}\n${input.extractedText}`).slice(0, 120000);
  if (combined.length < 40) {
    return {
      suitableForGrounding: false,
      category: 'insufficient_text',
      reason:
        'The document does not contain enough readable text to assess relevance for solar inverter diagnosis grounding. Upload a readable inverter/service manual, or configure OCR for scanned manuals. Failing closed for grounding.',
      signals: { domain: 0, safety: 0, unrelated: 0, serviceEvidence: 0 },
    };
  }

  const domain = countMatches(combined, DOMAIN_TERMS);
  const genericDomain = countMatches(combined, GENERIC_DOMAIN_WORDS);
  const safety = countMatches(combined, GENERIC_ELECTRICAL_SAFETY_TERMS);
  const unrelated = countMatches(combined, UNRELATED_TERMS);
  const serviceEvidence = countMatches(combined, SERVICE_EVIDENCE_TERMS);
  const signals = { domain, safety, unrelated, serviceEvidence };

  // Fail closed: clearly unrelated admin/HR/offer/internship/fundraising/recruitment documents.
  // Incidental mentions of words like "inverter", "voltage", "manual", or "safety" are NOT sufficient.
  if (unrelated >= 2) {
    const strongTechnical = domain >= 5 && serviceEvidence >= 3 && unrelated < domain;
    if (!strongTechnical) {
      return {
        suitableForGrounding: false,
        category: 'unrelated_hr_offer',
        reason:
          'This document appears unrelated to solar inverter/electrical equipment service documentation (it contains HR/offer/internship, fundraising, recruitment, administrative, or other non-technical content). Incidental technical words do not make it suitable for manufacturer grounding. It cannot be used for inverter diagnosis grounding. Remove it and upload a relevant inverter/service manual or electrical safety document.',
        signals,
      };
    }
  }
  if (unrelated >= 1 && domain + safety + serviceEvidence <= 2) {
    return {
      suitableForGrounding: false,
      category: 'unrelated_general',
      reason:
        'This document does not show sufficient technical/service evidence for solar inverter diagnosis grounding and contains non-technical/administrative signals. Failing closed for grounding. Remove it and upload a relevant inverter/service manual.',
      signals,
    };
  }

  // Generic electrical safety is allowed as reference context where claims are actually supported.
  if (safety >= 2 && domain <= 2 && serviceEvidence <= 2 && unrelated === 0) {
    return {
      suitableForGrounding: true,
      category: 'generic_electrical_safety',
      reason:
        'Document appears to contain generic electrical safety/procedure content. It may be used only as reference context for claims it actually supports (with validated citations), and it is not an inverter-specific manufacturer service manual. It must not override safety rules.',
      signals,
    };
  }

  // Inverter/equipment manuals require real technical/service evidence (not just generic words).
  if (domain >= 3 || (domain >= 2 && serviceEvidence >= 2) || (domain >= 2 && safety >= 1 && serviceEvidence >= 1)) {
    return {
      suitableForGrounding: true,
      category: 'inverter_or_equipment_manual',
      reason:
        'Document appears relevant to inverter/electrical equipment service content based on technical/service evidence. It may be used for grounding only when passages are relevant to the problem and citations are validated.',
      signals,
    };
  }

  // Incidental generic words only (e.g., mentions "voltage" or "manual" in passing) — fail closed.
  if (domain <= 1 && serviceEvidence <= 1 && genericDomain <= 3 && combined.length > 120) {
    return {
      suitableForGrounding: false,
      category: 'unrelated_general',
      reason:
        'The document does not show enough inverter-specific or electrical service technical evidence to be used reliably for inverter diagnosis grounding. Mere incidental mentions of generic technical words are not sufficient. Failing closed for grounding. Remove it and upload a relevant manufacturer manual if available.',
      signals,
    };
  }

  // Borderline: fail closed for grounding integrity unless clearly technical.
  if (domain === 0 && safety === 0 && combined.length > 200) {
    return {
      suitableForGrounding: false,
      category: 'unrelated_general',
      reason:
        'The document text does not show inverter, electrical equipment, or electrical safety service content needed for reliable grounding. Failing closed. Remove it and upload a relevant manual.',
      signals,
    };
  }

  return {
    suitableForGrounding: false,
    category: 'unrelated_general',
    reason:
      'Document relevance to inverter diagnosis grounding could not be established with sufficient technical evidence. Failing closed for grounding. Upload a clearly relevant inverter service manual or electrical safety document.',
    signals,
  };
}
