/**
 * API Types
 * 
 * Re-export types from backend contract.
 * In production, these should be generated from backend or shared via package.
 */

// For now, duplicate key types needed by frontend
// TODO: Share types via @vienna/shared-types package

export type SystemState = 'healthy' | 'degraded' | 'critical' | 'offline';
export type ExecutorState = 'running' | 'paused' | 'recovering' | 'stopped';
export type ObjectiveStatus = 'pending' | 'executing' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type EnvelopeState = 'queued' | 'executing' | 'retry_wait' | 'blocked' | 'completed' | 'failed' | 'dead_letter';
export type RiskTier = 'T0' | 'T1' | 'T2';
export type TradingGuardState = 'active' | 'emergency_override' | 'disabled';
export type IntegrityState = 'ok' | 'warnings' | 'violations' | 'critical';
export type HealthState = 'healthy' | 'degraded' | 'unhealthy';
export type DecisionType = 'blocked_recursion' | 'blocked_budget' | 'rate_limited' | 'manual_approval' | 'dead_letter';
export type DeadLetterState = 'pending_review' | 'requeued' | 'cancelled' | 'archived';
export type AgentRole = 'strategy' | 'governance' | 'operations' | 'reconciliation' | 'learning';
export type AgentAvailability = 'available' | 'busy' | 'offline' | 'error';
export type WarrantState = 'active' | 'expired' | 'revoked';

export interface SystemStatus {
  system_state: SystemState;
  executor_state: ExecutorState;
  paused: boolean;
  pause_reason?: string;
  queue_depth: number;
  active_envelopes: number;
  blocked_envelopes: number;
  dead_letter_count: number;
  integrity_state: IntegrityState;
  trading_guard_state: TradingGuardState;
  trading_override_expires_at?: string;
  nba_autonomous_window?: {
    active: boolean;
    day: number;
    total_days: number;
    expires_at: string;
  };
  health: {
    state: HealthState;
    latency_ms_avg: number;
    stalled_executions: number;
    last_check: string;
  };
  timestamp: string;
}

export interface ObjectiveSummary {
  objective_id: string;
  title: string;
  status: ObjectiveStatus;
  risk_tier: RiskTier;
  trigger_id: string;
  trigger_type: 'directive' | 'scheduled' | 'agent_proposal' | 'system';
  envelope_count: number;
  active_count: number;
  blocked_count: number;
  dead_letter_count: number;
  completed_count: number;
  current_step?: string;
  current_envelope_id?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ObjectiveDetail extends ObjectiveSummary {
  description?: string;
  constraints: string[];
  preconditions: string[];
  rollback_plan?: Record<string, unknown>;
  warrant_id?: string;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  error_summary?: string;
  retry_count: number;
}

export interface EnvelopeExecution {
  envelope_id: string;
  envelope_type: string;
  objective_id: string;
  state: EnvelopeState;
  action_type: string;
  target: string;
  source: string;
  depth: number;
  attempt: number;
  max_attempts: number;
  risk_tier: RiskTier;
  trading_impact: 'none' | 'low' | 'medium' | 'high';
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  retry_after?: string;
  blocked_reason?: string;
  error?: string;
  warrant_id?: string;
}

export interface DecisionItem {
  decision_id: string;
  type: DecisionType;
  envelope_id: string;
  objective_id: string;
  title: string;
  description: string;
  reason: string;
  risk_tier: RiskTier;
  trading_impact: 'none' | 'low' | 'medium' | 'high';
  created_at: string;
  expires_at?: string;
  actions: DecisionAction[];
}

export interface DecisionAction {
  action_id: string;
  label: string;
  type: 'approve' | 'reject' | 'retry' | 'cancel' | 'escalate';
  requires_reason: boolean;
}

export interface DeadLetterItem {
  envelope_id: string;
  objective_id: string;
  state: DeadLetterState;
  envelope_type: string;
  action_type: string;
  target: string;
  failure_reason: string;
  attempts: number;
  first_failed_at: string;
  dead_lettered_at: string;
  risk_tier: RiskTier;
  trading_impact: 'none' | 'low' | 'medium' | 'high';
  reviewed_by?: string;
  reviewed_at?: string;
  review_action?: 'requeued' | 'cancelled';
  review_reason?: string;
}

export interface AgentSummary {
  agent_id: string;
  name: string;
  role: AgentRole;
  model: string;
  availability: AgentAvailability;
  current_objective_id?: string;
  current_task?: string;
  last_activity?: string;
  total_tasks_completed: number;
  total_tasks_failed: number;
}

export interface WarrantSummary {
  warrant_id: string;
  state: WarrantState;
  issued_at: string;
  issued_by: string;
  truth_snapshot_id: string;
  plan_id: string;
  risk_tier: RiskTier;
  approval: {
    required: boolean;
    granted_by?: string;
    granted_at?: string;
  };
  trading_guard: {
    consulted: boolean;
    verdict: 'safe' | 'blocked' | 'override';
    checked_at?: string;
    override_id?: string;
  };
  expiry?: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
}

export interface DashboardBootstrapResponse {
  status: SystemStatus;
  objectives: ObjectiveSummary[];
  active_execution: EnvelopeExecution[];
  queue_state: QueueSnapshot;
  decisions: DecisionItem[];
  dead_letters: DeadLetterItem[];
  agents: AgentSummary[];
  metrics: ExecutionMetrics;
  health: HealthSnapshot;
  integrity: IntegritySnapshot;
  bootstrapped_at: string;
}

export interface QueueSnapshot {
  total: number;
  queued: number;
  executing: number;
  retry_wait: number;
  blocked: number;
  paused_backlog: number;
}

export interface ExecutionMetrics {
  total_executed: number;
  total_failed: number;
  total_retried: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  throughput_per_minute: number;
  by_risk_tier: {
    T0: { executed: number; failed: number };
    T1: { executed: number; failed: number };
    T2: { executed: number; failed: number };
  };
  time_window_start: string;
  time_window_end: string;
}

export interface HealthSnapshot {
  state: HealthState;
  latency_ms_avg: number;
  stalled_executions: number;
  queue_healthy: boolean;
  replay_log_writable: boolean;
  adapters_responsive: boolean;
  last_check: string;
  issues: string[];
}

export interface IntegritySnapshot {
  state: IntegrityState;
  checks: {
    warrant_binding: 'pass' | 'fail' | 'warning';
    truth_freshness: 'pass' | 'fail' | 'warning';
    envelope_ancestry: 'pass' | 'fail' | 'warning';
    replay_completeness: 'pass' | 'fail' | 'warning';
  };
  violations: string[];
  warnings: string[];
  last_check: string;
}

// API Response wrappers
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// SSE Event types
export type SSEEventType =
  | 'system.status.updated'
  | 'objective.created'
  | 'objective.updated'
  | 'objective.completed'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.blocked'
  | 'decision.created'
  | 'decision.resolved'
  | 'deadletter.created'
  | 'deadletter.resolved'
  | 'health.updated'
  | 'integrity.updated'
  | 'alert.created'
  | 'replay.appended';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  timestamp: string;
  payload: T;
}

// ============================================================================
// Replay & Audit Types
// ============================================================================

export type ReplayEventType = 
  | 'envelope.queued'
  | 'envelope.started'
  | 'envelope.completed'
  | 'envelope.failed'
  | 'envelope.blocked'
  | 'warrant.issued'
  | 'warrant.expired'
  | 'trading_guard.consulted'
  | 'objective.created'
  | 'objective.completed'
  | 'objective.failed'
  | 'system.paused'
  | 'system.resumed';

export interface ReplayEvent {
  event_id: string;
  event_type: ReplayEventType;
  timestamp: string;
  envelope_id?: string;
  objective_id?: string;
  warrant_id?: string;
  actor: string;
  payload: Record<string, unknown>;
  metadata?: {
    session_id?: string;
    operator?: string;
    parent_event_id?: string;
  };
}

export type AuditResult = 'requested' | 'preview' | 'executing' | 'completed' | 'failed';

export interface AuditRecord {
  id: string;
  action: string;
  timestamp: string;
  operator?: string | null;
  result: AuditResult;
  objective_id?: string | null;
  envelope_id?: string | null;
  thread_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryParams {
  objective_id?: string;
  envelope_id?: string;
  thread_id?: string;
  action?: string;
  operator?: string;
  result?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export interface AuditResponse {
  records: AuditRecord[];
  total: number;
  has_more: boolean;
}
