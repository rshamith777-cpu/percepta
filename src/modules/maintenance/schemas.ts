import { z } from 'zod';

export const maintenanceStatusSchema = z.enum([
  'diagnosis_recorded',
  'repair_attempt_recorded',
  'awaiting_verification',
  'verified_resolved',
  'verification_failed',
  'escalated_requires_qualified_technician',
]);

export const verificationOutcomeSchema = z.enum(['issue_resolved', 'issue_persists', 'unable_to_verify', 'escalated']);

export const verificationChecklistItemSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(300),
  checked: z.boolean(),
  required: z.boolean().optional(),
});

export const manualRefSchema = z.object({
  manualTitle: z.string().min(1).max(200),
  pageNumber: z.number().int().positive(),
  supportingPassage: z.string().max(500).optional(),
});

export const createMaintenanceSessionSchema = z.object({
  idempotencyKey: z.string().min(1).max(120).optional(),
  problemDescription: z.string().min(3).max(2000),
  diagnosisSummary: z.string().min(1).max(1200),
  observedMachineComponent: z.string().max(500).optional(),
  machineEquipmentIdentifier: z.string().max(120).optional(),
  possibleIssue: z.string().max(800).optional(),
  model: z.string().max(120).optional(),
  responseLanguage: z.string().max(10).optional(),
  manualReferences: z.array(manualRefSchema).max(20).optional(),
  safetyDecisionAtDiagnosis: z.unknown().nullable().optional(), // validated lightly; stored as provided structure
  diagnosisBlocked: z.boolean(),
});

export const recordRepairAttemptSchema = z.object({
  repairActions: z.array(z.string().min(1).max(500)).min(1).max(30),
  partsReplaced: z.array(z.string().min(1).max(200)).max(30).optional(),
  technicianNotes: z.string().max(4000).optional(),
  moveToAwaitingVerification: z.boolean().optional(),
});

export const recordVerificationSchema = z.object({
  outcome: verificationOutcomeSchema,
  checklist: z.array(verificationChecklistItemSchema).min(1).max(30),
  evidence: z.string().max(4000).default(''),
  technicianConfirmation: z.boolean().default(false),
  followUpRecommendations: z.string().max(2000).optional(),
  escalationReason: z.string().max(1000).optional(),
});

export const recordEscalationSchema = z.object({
  reason: z.string().min(3).max(1000),
  technicianNotes: z.string().max(4000).optional(),
});
