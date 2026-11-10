/**
 * Safety module (Phase 5).
 * Deterministic safety gate, checklist, and escalation decisions for
 * synthetic/de-energized solar inverter demo equipment.
 *
 * Critical rules:
 * - Never claim camera-based electrical hazard detection is reliable.
 * - Never claim camera/AI can verify equipment is electrically de-energized.
 * - Block/replace unsafe guidance and escalate dangerous/uncertain electrical work.
 * - This prototype is not certified for real electrical maintenance.
 */
export const safetyModuleReady = true;

export type {
  EquipmentStatusInput,
  SafetyChecklistItem,
  SafetyDecision,
  SafetyDecisionOutcome,
  SafetyGateInput,
  TriggeredRule,
} from './types';
export { createDefaultSafetyChecklist, mergeChecklist } from './checklist';
export {
  SAFETY_VERIFICATION_DISCLAIMER,
  buildBlockedEscalation,
  evaluateAiOutputSafety,
  evaluateInputSafety,
  evaluateSafetyGate,
} from './safetyGate';
