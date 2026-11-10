import { z } from 'zod';

const actionTypesSchema = z.array(z.string().min(1).max(80)).max(20).default([]);
const outcomeSchema = z.enum(['pending', 'issue_resolved', 'issue_persists', 'escalated', 'unable_to_verify', 'not_applicable']);
const safetyDecisionSchema = z.object({
  decision: z.string().min(1).max(40),
  reason: z.string().max(1000).optional().default(''),
  safeNextAction: z.string().max(1000).optional().default(''),
  safetyCritical: z.boolean().optional().default(false),
}).nullable().optional();

const telemetrySchema = z.object({
  status: z.enum(['available', 'missing', 'stale', 'invalid']),
  source: z.string().max(120).nullable().optional(),
  observedAt: z.string().max(80).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  values: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])).nullable().optional(),
}).optional();

const maintenanceHistoryEntrySchema = z.object({
  at: z.string().min(1).max(80),
  summary: z.string().min(1).max(1000),
  verificationOutcome: outcomeSchema,
  notes: z.string().max(2000).nullable().optional(),
  safetyDecision: safetyDecisionSchema,
  source: z.string().max(120).nullable().optional(),
});

export const createRoboticsTrajectorySchema = z.object({
  sessionId: z.string().trim().max(120).nullable().optional(),
  eventType: z.string().trim().max(80).nullable().optional(),
  dataLabel: z.enum(['synthetic_demo', 'real_consented']).default('synthetic_demo'),
  equipmentIdentifier: z.string().trim().min(1).max(120),
  operatingStatus: z.string().trim().max(120).nullable().optional(),
  telemetry: telemetrySchema,
  beforeImageReference: z.string().trim().max(500).nullable().optional(),
  diagnosisReference: z.string().trim().max(200).nullable().optional(),
  technicianActionMetadata: z.object({
    actionTypes: actionTypesSchema,
    summary: z.string().trim().min(1).max(1000),
    performedByRole: z.enum(['technician_demo', 'supervisor_demo', 'unknown']).default('technician_demo'),
  }),
  verificationOutcome: outcomeSchema.default('pending'),
  afterImageReference: z.string().trim().max(500).nullable().optional(),
  safetyDecision: safetyDecisionSchema,
  maintenanceHistory: z.array(maintenanceHistoryEntrySchema).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  consentAcknowledged: z.literal(true, { message: 'Explicit consent/acknowledgment is required. This prototype stores synthetic/local data only; no real worker data may be collected without consent.' }),
});

export const updateRoboticsTrajectorySchema = z.object({
  verificationOutcome: outcomeSchema.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  afterImageReference: z.string().trim().max(500).nullable().optional(),
  safetyDecision: safetyDecisionSchema,
  operatingStatus: z.string().trim().max(120).nullable().optional(),
  telemetry: telemetrySchema,
  maintenanceAction: z.object({
    summary: z.string().trim().min(1).max(1000),
    verificationOutcome: outcomeSchema,
    notes: z.string().trim().max(2000).nullable().optional(),
    safetyDecision: safetyDecisionSchema,
  }).optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one supported maintenance field must be provided.' });

export type CreateRoboticsTrajectoryInput = z.infer<typeof createRoboticsTrajectorySchema>;
export type UpdateRoboticsTrajectoryInput = z.infer<typeof updateRoboticsTrajectorySchema>;
