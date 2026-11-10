import { describe, expect, it } from 'vitest';
import { createRoboticsTrajectorySchema } from './schemas';

describe('robotics synthetic trajectory schema', () => {
  it('accepts a valid synthetic/local record with required consent', () => {
    const parsed = createRoboticsTrajectorySchema.safeParse({
      equipmentIdentifier: 'SYNTH-DEMO-001',
      beforeImageReference: 'local-demo://before',
      diagnosisReference: 'maint:abc',
      technicianActionMetadata: { actionTypes: ['visual_inspection'], summary: 'Documented demo inspection.', performedByRole: 'technician_demo' },
      verificationOutcome: 'pending',
      afterImageReference: null,
      safetyDecision: { decision: 'caution', reason: 'demo', safeNextAction: 'escalate if unclear', safetyCritical: true },
      consentAcknowledged: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects missing consent acknowledgment', () => {
    const parsed = createRoboticsTrajectorySchema.safeParse({
      equipmentIdentifier: 'SYNTH-DEMO-001',
      technicianActionMetadata: { actionTypes: [], summary: 'Demo', performedByRole: 'technician_demo' },
      verificationOutcome: 'pending',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects empty equipment identifier', () => {
    const parsed = createRoboticsTrajectorySchema.safeParse({
      equipmentIdentifier: '',
      technicianActionMetadata: { actionTypes: [], summary: 'Demo', performedByRole: 'technician_demo' },
      verificationOutcome: 'pending',
      consentAcknowledged: true,
    });
    expect(parsed.success).toBe(false);
  });
});
