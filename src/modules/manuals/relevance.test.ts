import { describe, expect, it } from 'vitest';
import { assessManualRelevance } from './relevance';

describe('manual relevance validation (Bug 1 regression)', () => {
  it('rejects clearly unrelated HR/offer/internship/fundraising documents for inverter grounding (content-based, not filename)', () => {
    const text = `
      Internship Offer Letter Date: 26 Sept 2026 Place: Delhi
      Dear Candidate, we are delighted to welcome you as an Intern – Social Media Marketing.
      Reporting manager, fundraising, campaign, onboarding, probation.
      Compensation/stipend terms and performance incentives. This is a performance-based internship.
    `;
    const r = assessManualRelevance({ title: 'Offer_Letter_Sai', extractedText: text });
    expect(r.suitableForGrounding).toBe(false);
    expect(['unrelated_hr_offer', 'unrelated_general']).toContain(r.category);
  });

  it('rejects HR/admin documents that mention inverter/voltage/safety only incidentally', () => {
    const text = `
      Internship Offer Letter - Human Resources
      You will support social media for a solar inverter company. Reporting manager assigned.
      Office safety briefing mentions voltage awareness. Candidate onboarding, stipend, joining date.
      Fundraising campaign and recruitment admin tasks.
    `;
    const r = assessManualRelevance({ title: 'Offer Letter', extractedText: text });
    expect(r.suitableForGrounding).toBe(false);
  });

  it('accepts inverter/service manual content for grounding', () => {
    const text = `
      Solar Inverter Service Manual
      Troubleshooting fault codes and alarm display. Check DC input voltage, MPPT, grid frequency.
      Maintenance: inspect terminals, wiring, fan, heatsink. Firmware update procedure.
      Safety: de-energized equipment only, lockout/tagout, qualified technician.
    `;
    const r = assessManualRelevance({ title: 'Solar Inverter Service Manual', extractedText: text });
    expect(r.suitableForGrounding).toBe(true);
    expect(['inverter_or_equipment_manual', 'generic_electrical_safety']).toContain(r.category);
  });

  it('preserves legitimate generic electrical safety documents (suitable for grounding as safety context; not rejected as unrelated)', () => {
    const text = `
      Electrical Safety Procedure
      Qualified person must verify absence of voltage. Lockout/tagout (LOTO) required.
      PPE, arc flash hazard assessment, NFPA and OSHA guidance. Shock hazard.
      Safe work on de-energized equipment only.
    `;
    const r = assessManualRelevance({ title: 'Electrical Safety', extractedText: text });
    expect(r.suitableForGrounding).toBe(true);
    expect(['generic_electrical_safety', 'inverter_or_equipment_manual']).toContain(r.category);
  });

  it('rejects documents with insufficient readable text', () => {
    const r = assessManualRelevance({ title: 'Scan', extractedText: '' });
    expect(r.suitableForGrounding).toBe(false);
    expect(r.category).toBe('insufficient_text');
  });
});
