import { describe, it, expect } from 'vitest';
import {
  UNIVERSAL_OBJECT_PRESETS,
  DEFAULT_INITIAL_BRAIN,
  recordBrainLearningEvent,
  teachBrainCustomRule,
  buildActiveContextMemoryPrompt
} from './universalBrain';

describe('Universal Object AI Brain & Self-Learning Memory', () => {
  it('contains both consumer and industrial object presets', () => {
    expect(UNIVERSAL_OBJECT_PRESETS.length).toBeGreaterThanOrEqual(4);
    const bottle = UNIVERSAL_OBJECT_PRESETS.find((p) => p.id === 'juice-bottle');
    expect(bottle).toBeDefined();
    expect(bottle?.intents.length).toBe(4);

    const charger = UNIVERSAL_OBJECT_PRESETS.find((p) => p.id === 'charger-gadget');
    expect(charger).toBeDefined();
    expect(charger?.intents.length).toBe(4);

    const inverter = UNIVERSAL_OBJECT_PRESETS.find((p) => p.id === 'solar-inverter');
    expect(inverter).toBeDefined();
    expect(inverter?.intents.length).toBe(4);
  });

  it('records learning events, awards experience, and creates new behavioral rules', () => {
    const initial = { ...DEFAULT_INITIAL_BRAIN, rules: [...DEFAULT_INITIAL_BRAIN.rules] };
    const updated = recordBrainLearningEvent(initial, 'Empty Juice Bottle', 'Recycle & Dispose Guide');
    expect(updated.experience).toBeGreaterThan(initial.experience);
    expect(updated.totalObjectsScanned).toBe(initial.totalObjectsScanned + 1);
    expect(updated.rules.length).toBeGreaterThan(initial.rules.length);
    expect(updated.rules[0].ruleText).toContain('Empty Juice Bottle');
  });

  it('allows user to directly teach custom behavioral rules', () => {
    const initial = { ...DEFAULT_INITIAL_BRAIN, rules: [...DEFAULT_INITIAL_BRAIN.rules] };
    const customNote = 'Always prioritize biodegradable materials over single-use plastics';
    const updated = teachBrainCustomRule(initial, customNote);
    expect(updated.rules[0].ruleText).toContain(customNote);
    expect(updated.rules[0].feedback).toBe('improved');
  });

  it('generates active context memory prompt injection for Gemini Omni', () => {
    const prompt = buildActiveContextMemoryPrompt(DEFAULT_INITIAL_BRAIN);
    expect(prompt).toContain('ACTIVE REINFORCEMENT LEARNING CONTEXT');
    expect(prompt).toContain('eco-recycling');
  });
});
