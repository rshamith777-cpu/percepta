import { describe, expect, it } from 'vitest';
import {
  buildBlockedEscalation,
  evaluateAiOutputSafety,
  evaluateInputSafety,
  evaluateSafetyGate,
} from './safetyGate';
import { createDefaultSafetyChecklist } from './checklist';
import type { SafetyChecklistItem } from './types';

function checklistWith(overrides: Partial<Record<string, boolean>>): SafetyChecklistItem[] {
  return createDefaultSafetyChecklist('de_energized_confirmed').map((item) => ({
    ...item,
    checked: overrides[item.id] ?? item.checked,
  }));
}

describe('evaluateInputSafety', () => {
  it('returns allow for synthetic/de-energized demo context with required checklist satisfied', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'Inverter display shows warning code and LED is amber during demo.',
      equipmentStatus: 'de_energized_confirmed',
      checklist: checklistWith({}),
    });

    expect(decision.decision).toBe('allow');
    expect(decision.safetyCritical).toBe(true);
    expect(decision.triggeredRules.some((r) => r.ruleId === 'demo_synthetic_or_deenergized_context')).toBe(true);
    expect(decision.safeNextAction).toMatch(/camera or AI model cannot verify de-energized/i);
    expect(decision.verificationDisclaimer).toMatch(/cannot verify whether solar inverter equipment is electrically de-energized/i);
  });

  it('returns block when equipment status is potentially live', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'Inverter shows fault code.',
      equipmentStatus: 'potentially_live',
    });

    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'equipment_status_potentially_live')).toBe(true);
    expect(decision.safeNextAction).toMatch(/Stop repair guidance/i);
    expect(decision.safeNextAction).toMatch(/Do not open energized equipment/i);
  });

  it('returns block when equipment status is uncertain', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'Need help understanding inverter status lights.',
      equipmentStatus: 'uncertain',
    });

    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'equipment_status_uncertain')).toBe(true);
  });

  it('returns block when description indicates live/energized or uncertain status', () => {
    const live = evaluateInputSafety({
      problemDescription: 'The inverter is still on and powered with voltage present.',
      equipmentStatus: 'de_energized_confirmed',
    });
    expect(live.decision).toBe('block');
    expect(live.triggeredRules.some((r) => r.ruleId === 'input_live_voltage_present')).toBe(true);

    const uncertain = evaluateInputSafety({
      problemDescription: 'I am not sure if the unit is de-energized.',
      equipmentStatus: 'de_energized_confirmed',
    });
    expect(uncertain.decision).toBe('block');
    expect(uncertain.triggeredRules.some((r) => r.ruleId === 'input_status_uncertain')).toBe(true);
  });

  it('returns block when safety-critical checklist items are not satisfied', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'Display error on demo unit.',
      equipmentStatus: 'de_energized_confirmed',
      checklist: checklistWith({ no_live_work: false }),
    });

    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'checklist_no_live_work')).toBe(true);
  });

  it('returns block for dangerous symptoms requiring escalation', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'There is a burning smell and visible smoke near the inverter.',
      equipmentStatus: 'de_energized_confirmed',
    });

    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'input_dangerous_symptom')).toBe(true);
  });
});

describe('evaluateAiOutputSafety', () => {
  const checklist = createDefaultSafetyChecklist('de_energized_confirmed');

  it('returns allow when AI output passes deterministic unsafe-guidance checks', () => {
    const decision = evaluateAiOutputSafety(
      JSON.stringify({
        stepByStepInspectionGuidance: [
          { order: 1, instruction: 'Visually inspect the external display and record the error code on de-energized demo equipment.' },
        ],
        safetyWarnings: ['Do not open energized equipment.'],
        imageLimitationsNotice: 'Image analysis cannot reliably detect live electrical hazards.',
      }),
      checklist,
    );

    expect(decision.decision).toBe('allow');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'ai_output_postcheck_passed')).toBe(true);
  });

  it('returns block for unsafe model output instructing to open energized equipment', () => {
    const decision = evaluateAiOutputSafety(
      'Step 1: Open the energized inverter panel and inspect terminals.',
      checklist,
    );

    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'ai_unsafe_open_energized')).toBe(true);
  });

  it('returns block for unsafe model output instructing to touch live components', () => {
    const decision = evaluateAiOutputSafety('Touch live wires to test continuity.', checklist);
    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'ai_unsafe_touch_live')).toBe(true);
  });

  it('returns block for unsafe model output bypassing protective devices', () => {
    const decision = evaluateAiOutputSafety('Bypass the interlock to access the fault.', checklist);
    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'ai_unsafe_bypass_protection')).toBe(true);
  });

  it('returns block for false verification claims by camera/AI', () => {
    const decision = evaluateAiOutputSafety(
      'The camera image confirms the inverter is de-energized and safe.',
      checklist,
    );
    expect(decision.decision).toBe('block');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'ai_false_verification_claim')).toBe(true);
  });
});

describe('evaluateSafetyGate and blocked escalation', () => {
  it('returns caution when advisory checklist items are not confirmed', () => {
    const decision = evaluateInputSafety({
      problemDescription: 'Demo inverter shows an amber LED.',
      equipmentStatus: 'synthetic_demo',
      checklist: checklistWith({ ppe_visual_inspection: false }),
    });

    expect(decision.decision).toBe('caution');
    expect(decision.triggeredRules.some((r) => r.ruleId === 'checklist_ppe_visual_inspection')).toBe(true);
  });

  it('returns allow/caution when deterministic checks pass and AI post-check passes', () => {
    const decision = evaluateSafetyGate({
      problemDescription: 'Demo inverter shows an amber LED.',
      equipmentStatus: 'synthetic_demo',
      checklist: createDefaultSafetyChecklist('synthetic_demo'),
      aiGeneratedText: JSON.stringify({
        imageLimitationsNotice: 'Image analysis cannot reliably detect live electrical hazards.',
        stepByStepInspectionGuidance: [{ order: 1, instruction: 'Record the LED pattern.' }],
      }),
    });

    // Combined gate keeps caution/allow semantics deterministic; allow from subchecks is acceptable.
    expect(['allow', 'caution']).toContain(decision.decision);
    expect(decision.triggeredRules.length).toBeGreaterThan(0);
  });

  it('blocks unsafe AI output even when input pre-check passes', () => {
    const decision = evaluateSafetyGate({
      problemDescription: 'Demo unit error code.',
      equipmentStatus: 'de_energized_confirmed',
      checklist: createDefaultSafetyChecklist('de_energized_confirmed'),
      aiGeneratedText: 'Open the energized panel and repair while energized.',
    });

    expect(decision.decision).toBe('block');
    expect(buildBlockedEscalation(decision)).toMatch(/Repair guidance was blocked/i);
    expect(buildBlockedEscalation(decision)).toMatch(/Triggered rules/i);
  });
});

  it('does not falsely trigger live/energized on confirmed de-energized descriptions', () => {
    const r = evaluateInputSafety({
      equipmentStatus: 'de_energized_confirmed',
      problemDescription: 'Synthetic test fixture (confirmed de-energized demo): inverter display blank, no status LEDs, DC isolator off. Advisory visual inspection only.',
      checklist: createDefaultSafetyChecklist('de_energized_confirmed'),
    });
    expect(r.decision).not.toBe('block');
    expect(r.triggeredRules.some((rule) => rule.ruleId === 'input_live_voltage_present')).toBe(false);
  });

describe('safety negation regressions (narrow; never suppress genuine hazards)', () => {
  const okChecklist = () => createDefaultSafetyChecklist('de_energized_confirmed');
  const base = (desc: string) =>
    evaluateInputSafety({
      equipmentStatus: 'de_energized_confirmed',
      problemDescription: desc,
      checklist: okChecklist(),
    });

  it('allows explicit safe policy/context phrases', () => {
    for (const desc of [
      'confirmed de-energized demo: display blank',
      'Confirmed de-energized demo, no live work: display blank.',
      'synthetic demo, not energized, advisory inspection only',
      'DE-ENERGIZED DEMO — NO LIVE WORK',
      'confirmed de-energized; no live electrical work during inspection',
      'work on de-energized equipment, never open live equipment',
    ]) {
      const r = base(desc);
      expect(r.decision, desc).not.toBe('block');
      expect(r.triggeredRules.some((rule) => rule.ruleId === 'input_live_voltage_present'), desc).toBe(false);
    }
  });

  it('blocks genuine hazard indicators (never weakened)', () => {
    for (const desc of [
      'live voltage present at terminals',
      'equipment is powered on',
      'energized equipment observed',
      'ENERGIZED EQUIPMENT - do not touch',
      'display blank but unit still on',
      'sparking observed near connector',
      'there is current flowing',
    ]) {
      const r = base(desc);
      expect(r.decision, desc).toBe('block');
      expect(r.triggeredRules.some((rule) => rule.ruleId === 'input_live_voltage_present'), desc).toBe(true);
    }
  });

  it('does NOT suppress a separate genuine hazard when negation appears elsewhere', () => {
    for (const desc of [
      'confirmed de-energized demo, no live work, but voltage present at input',
      'no live work; equipment is powered on',
      'not energized in text? no - energized equipment and sparking',
      'no live work, but sparking observed',
      'no live electrical work. Current flowing was reported.',
    ]) {
      const r = base(desc);
      expect(r.decision, desc).toBe('block');
      expect(r.triggeredRules.some((rule) => rule.ruleId === 'input_live_voltage_present'), desc).toBe(true);
    }
  });

  it('handles punctuation/capitalization/word-order variants safely', () => {
    expect(base('No Live Work (demo), de-energized').triggeredRules.some((r) => r.ruleId === 'input_live_voltage_present')).toBe(false);
    expect(base('de-energized: no   live   electrical   work').triggeredRules.some((r) => r.ruleId === 'input_live_voltage_present')).toBe(false);
    expect(base('Equipment: LIVE voltage present!').decision).toBe('block');
    expect(base('Powered On - inverter').decision).toBe('block');
  });
});
