import type { SafetyDecision } from '@/types';

export type RoboticsDataLabel = 'synthetic_demo' | 'real_consented';
export type TelemetryStatus = 'available' | 'missing' | 'stale' | 'invalid';

export interface RoboticsTelemetry {
  status: TelemetryStatus;
  source?: string | null;
  observedAt?: string | null;
  reason?: string | null;
  values?: Record<string, number | string | boolean | null> | null;
}

export interface MaintenanceHistoryEntry {
  at: string;
  summary: string;
  verificationOutcome: string;
  notes?: string | null;
  safetyDecision?: Pick<SafetyDecision, 'decision' | 'reason' | 'safeNextAction' | 'safetyCritical'> | null;
  source?: string | null;
}

export interface RoboticsTrajectoryRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sessionId?: string | null;
  eventType?: string | null;
  dataLabel: RoboticsDataLabel;
  syntheticDemo: boolean;
  consentAcknowledged: boolean;
  privacyNoticeVersion: string;
  equipmentIdentifier: string;
  operatingStatus?: string | null;
  telemetry?: RoboticsTelemetry;
  maintenanceHistory?: MaintenanceHistoryEntry[];
  beforeImageReference: string | null;
  diagnosisReference: string | null;
  technicianActionMetadata: {
    actionTypes: string[];
    summary: string;
    performedByRole: 'technician_demo' | 'supervisor_demo' | 'unknown';
  };
  verificationOutcome: 'pending' | 'issue_resolved' | 'issue_persists' | 'escalated' | 'unable_to_verify' | 'not_applicable';
  afterImageReference: string | null;
  safetyDecision: Pick<SafetyDecision, 'decision' | 'reason' | 'safeNextAction' | 'safetyCritical'> | null;
  notes?: string;
}

export interface RoboticsTrajectoryIndexEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sessionId?: string | null;
  dataLabel: RoboticsDataLabel;
  equipmentIdentifier: string;
  operatingStatus?: string | null;
  verificationOutcome: RoboticsTrajectoryRecord['verificationOutcome'];
  telemetryStatus?: TelemetryStatus;
  syntheticDemo: boolean;
}
