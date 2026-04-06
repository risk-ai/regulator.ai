/**
 * Verification Engine Types — Vienna OS
 * 
 * Phase 8.2 — Independent postcondition validation.
 * 
 * Core principle:
 *   Execution tells you what the system tried.
 *   Verification tells you what became true.
 */

// ─── Verification Status ───

export type VerificationStatusType =
  | 'success'
  | 'failed'
  | 'timed_out'
  | 'inconclusive'
  | 'skipped';

export type VerificationStrengthLevel =
  | 'none'
  | 'procedural'
  | 'local_state'
  | 'service_health'
  | 'objective_stability';

// ─── Check Types ───

export type CheckType =
  | 'systemd_active'
  | 'tcp_port_open'
  | 'http_healthcheck'
  | 'file_exists'
  | 'file_contains'
  | string; // extensible via registerCheckHandler

export interface PostconditionCheck {
  check_id: string;
  type: CheckType;
  target: string;
  expected_value?: unknown;
  required?: boolean;
}

export interface CheckEvidence {
  source: string;
  detail: string;
}

export interface CheckResult {
  check_id: string;
  status: 'passed' | 'failed';
  observed_value: unknown;
  expected_value: unknown;
  checked_at: number;
  evidence: CheckEvidence;
  required?: boolean;
}

export type CheckHandler = (check: PostconditionCheck) => Promise<CheckResult>;

// ─── Scope Drift Detection ───

export interface ExecutedAction {
  type?: string;
  action?: string;
  risk_level?: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

export interface ScopeDriftResult {
  drift_detected: boolean;
  allowed_actions?: string[];
  executed_actions?: ExecutedAction[];
  unauthorized_actions?: ExecutedAction[];
  drift_severity: 'none' | 'medium' | 'high' | 'unknown';
  error?: string;
}

// ─── Timing Verification ───

export interface TimingVerificationResult {
  timing_valid: boolean;
  warrant_issued_at?: number;
  warrant_expires_at?: number;
  execution_completed_at?: number;
  time_remaining_ms?: number;
  violation_details?: {
    exceeded_by_ms: number;
    severity: 'high';
  } | null;
  error?: string;
}

// ─── Output Validation ───

export interface OutputSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, OutputSchema>;
  [key: string]: unknown;
}

export interface OutputValidationResult {
  schema_valid: boolean;
  schema?: OutputSchema;
  actual_output?: unknown;
  validation_errors?: string[];
  validation_details?: {
    valid: boolean;
    errors: string[];
  };
  message?: string;
  error?: string;
}

// ─── Stability ───

export interface StabilityCheck {
  timestamp: number;
  all_passed: boolean;
}

export interface StabilityResult {
  window_ms: number;
  status: 'passed' | 'failed';
  detail: string;
  checks: StabilityCheck[];
}

// ─── Verification Task (input) ───

export interface VerificationTask {
  verification_id?: string;
  plan_id: string;
  execution_id: string;
  objective: string;
  postconditions: PostconditionCheck[];
  timeout_ms?: number;
  stability_window_ms?: number;
  verification_strength?: VerificationStrengthLevel;
  executed_actions?: ExecutedAction[];
  execution_completed_at?: number;
  execution_output?: unknown;
}

// ─── Warrant (minimal contract for verification) ───

export interface WarrantForVerification {
  warrant_id: string;
  allowed_actions: string[];
  forbidden_actions?: string[];
  issued_at?: number | string;
  created_at?: number;
  ttl_ms?: number;
  expires_at?: string;
  constraints?: {
    output_schema?: OutputSchema;
    [key: string]: unknown;
  };
}

// ─── Verification Result (output) ───

export interface VerificationResult {
  verification_id: string;
  plan_id: string;
  execution_id: string;
  status: VerificationStatusType;
  objective_achieved: boolean;
  verification_strength_achieved: VerificationStrengthLevel;
  started_at: number;
  completed_at: number;
  checks: CheckResult[];
  stability: StabilityResult | null;
  scope_drift?: ScopeDriftResult | null;
  timing_verification?: TimingVerificationResult | null;
  output_validation?: OutputValidationResult | null;
  summary: string;
}

// ─── Verification Audit Logger ───

export interface VerificationAuditLogger {
  logVerificationEvent(data: {
    timestamp: number;
    event_type: string;
    verification_id?: string;
    plan_id?: string;
    execution_id?: string;
    [key: string]: unknown;
  }): void;
}

// ─── Verification Engine Options ───

export interface VerificationEngineOptions {
  auditLogger?: VerificationAuditLogger | null;
}
