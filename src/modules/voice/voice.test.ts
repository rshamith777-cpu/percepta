import { describe, expect, it } from 'vitest';
import { buildDiagnosisSpeechText, getPreferredVoiceLocale, VOICE_LOCALE_BY_LANGUAGE } from './index';
import type { DiagnosisResult } from '@/types/diagnosis';
import type { SafetyDecision } from '@/types';

const baseSafetyDecision = (decision: SafetyDecision['decision']): SafetyDecision => ({
  decision,
  reason: 'Reason text',
  triggeredRules: [],
  safeNextAction: 'Escalate to a qualified technician.',
  checklist: [],
  safetyCritical: decision === 'block',
  verificationDisclaimer: 'Camera or AI cannot verify electrical isolation.',
});

const baseDiagnosis: DiagnosisResult = {
  responseLanguage: 'en',
  observedMachineComponent: 'Solar inverter display',
  possibleIssue: 'DC undervoltage alarm',
  confidenceLevel: 'medium',
  confidenceRationale: 'Based on visible display text.',
  supportingVisualObservations: ['Display shows E01'],
  uncertainObservations: ['Internal state is not visible'],
  stepByStepInspectionGuidance: [
    { order: 1, instruction: 'Record the alarm code while the unit remains de-energized.', caution: 'Do not open the enclosure.' },
  ],
  requiredToolsOrPpe: ['Camera'],
  safetyWarnings: ['Do not touch live components.'],
  requiresExpertAssistance: true,
  expertAssistanceReason: 'Qualified review recommended.',
  imageLimitationsNotice: 'Camera or AI cannot verify electrical isolation or safety.',
  demoEquipmentNotice: 'Synthetic or de-energized demo equipment only.',
  manualGrounding: {
    visualObservationsFromImage: ['Display shows E01'],
    manualSupportedClaims: [
      {
        claim: 'E01 indicates DC undervoltage.',
        citations: [{ manualTitle: 'Service Manual', pageNumber: 12, supportingPassage: 'E01 DC undervoltage.' }],
      },
    ],
    aiSuggestionsNotSupportedByManual: ['Check installation date.'],
    manualGroundingStatus: 'grounded',
    groundingDisclosure: 'Grounded in retrieved manual passages.',
    retrievedPassages: [],
  },
};

describe('voice locale mapping (Phase 2)', () => {
  it('maps supported languages to preferred locales', () => {
    expect(getPreferredVoiceLocale('en')).toBe('en-IN');
    expect(getPreferredVoiceLocale('hi')).toBe('hi-IN');
    expect(getPreferredVoiceLocale('kn')).toBe('kn-IN');
    expect(VOICE_LOCALE_BY_LANGUAGE.en.length).toBeGreaterThan(0);
  });
});

describe('diagnosis speech text building', () => {
  it('includes diagnosis content and safety warnings for allowed/cautious guidance', () => {
    const { text, safetyIncluded } = buildDiagnosisSpeechText({
      diagnosis: baseDiagnosis,
      safetyDecision: baseSafetyDecision('caution'),
      blockedEscalation: null,
    });
    expect(safetyIncluded).toBe(true);
    expect(text).toMatch(/DC undervoltage alarm/);
    expect(text).toMatch(/Safety warnings/i);
    expect(text).toMatch(/Do not touch live components/);
    expect(text).toMatch(/de-energized/i);
    expect(text).toMatch(/Service Manual, page 12/);
  });

  it('does not read unsafe blocked instructions as actionable guidance; reads safe escalation only', () => {
    const { text } = buildDiagnosisSpeechText({
      diagnosis: baseDiagnosis,
      safetyDecision: baseSafetyDecision('block'),
      blockedEscalation: 'SAFE ESCALATION: stop and contact qualified technician.',
    });
    expect(text).toMatch(/blocked/i);
    expect(text).toMatch(/Safe next action/i);
    expect(text).toMatch(/qualified technician/i);
    // Must not read diagnosis step-by-step/issue as actionable blocked guidance path.
    expect(text).not.toMatch(/Step 1: Record the alarm code/);
    expect(text).not.toMatch(/DC undervoltage alarm/);
  });
});
