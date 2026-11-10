export type SafetyDecisionOutcome = 'allow' | 'caution' | 'block';

export type EquipmentStatusInput =
  | 'synthetic_demo'
  | 'de_energized_confirmed'
  | 'uncertain'
  | 'potentially_live';

export interface SafetyChecklistItem {
  id: string;
  label: string;
  /** Safety-critical items must be satisfied for the demo workflow to proceed. */
  safetyCritical: boolean;
  checked: boolean;
  guidance: string;
}

export interface TriggeredRule {
  ruleId: string;
  /** Deterministic rules are testable server-side checks; AI suggestions are advisory only. */
  source: 'deterministic_rule' | 'ai_suggestion_advisory';
  severity: 'info' | 'caution' | 'critical';
  message: string;
}

export interface SafetyDecision {
  decision: SafetyDecisionOutcome;
  reason: string;
  triggeredRules: TriggeredRule[];
  safeNextAction: string;
  /** Checklist state evaluated for synthetic/de-energized solar inverter demo equipment. */
  checklist: SafetyChecklistItem[];
  /** True when any safety-critical deterministic rule/check affects the decision. */
  safetyCritical: boolean;
  /** Explicit disclaimer required by policy. */
  verificationDisclaimer: string;
}

export interface SafetyGateInput {
  problemDescription: string;
  equipmentStatus: EquipmentStatusInput;
  checklist: SafetyChecklistItem[];
  /** AI-generated diagnosis object/text to scan for unsafe guidance (post-gate). */
  aiGeneratedText?: string;
}
