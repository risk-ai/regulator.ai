/**
 * Vienna Console API Contract
 * Phase 8 v1 - Operator Control Surface
 * 
 * All DTOs for REST endpoints and SSE events.
 * Vienna Core authority boundary enforced.
 */

// ============================================================================
// Core State Types
// ============================================================================

export type SystemState = 'healthy' | 'degraded' | 'critical' | 'offline';
export type ExecutorState = 'running' | 'paused' | 'recovering' | 'stopped';
export type ObjectiveStatus = 'pending' | 'executing' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type EnvelopeState = 'queued' | 'executing' | 'retry_wait' | 'blocked' | 'completed' | 'failed' | 'dead_letter';
export type RiskTier = 'T0' | 'T1' | 'T2';
export type TradingGuardState = 'active' | 'emergency_override' | 'disabled';
export type IntegrityState = 'ok' | 'warnings' | 'violations' | 'critical';
export type HealthState = 'healthy' | 'degraded' | 'unhealthy';

// ============================================================================
// System Status
// ============================================================================

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
  trading_override_expires_at?: string; // ISO 8601
  
  nba_autonomous_window?: {
    active: boolean;
    day: number;
    total_days: number;
    expires_at: string; // ISO 8601
  };
  
  health: {
    state: HealthState;
    latency_ms_avg: number;
    stalled_executions: number;
    last_check: string; // ISO 8601
  };
  
  timestamp: string; // ISO 8601
}

// ============================================================================
// Objectives
// ============================================================================

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
  
  started_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  completed_at?: string; // ISO 8601
}

export interface ObjectiveDetail extends ObjectiveSummary {
  description?: string;
  constraints: string[];
  preconditions: string[];
  rollback_plan?: Record<string, unknown>;
  
  warrant_id?: string;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string; // ISO 8601
  
  error_summary?: string;
  retry_count: number;
}

export interface ObjectiveEnvelopesResponse {
  objective_id: string;
  envelopes: EnvelopeExecution[];
  total: number;
}

export interface CausalChainNode {
  envelope_id: string;
  action_type: string;
  target: string;
  state: EnvelopeState;
  depth: number;
  parent_id?: string;
  children: string[];
  executed_at?: string; // ISO 8601
}

export interface CausalChainResponse {
  objective_id: string;
  root_envelope_id: string;
  nodes: CausalChainNode[];
  max_depth: number;
}

// ============================================================================
// Execution
// ============================================================================

export interface EnvelopeExecution {
  envelope_id: string;
  envelope_type: string;
  objective_id: string;
  
  state: EnvelopeState;
  action_type: string;
  target: string;
  
  source: string; // proposing agent
  depth: number;
  attempt: number;
  max_attempts: number;
  
  risk_tier: RiskTier;
  trading_impact: 'none' | 'low' | 'medium' | 'high';
  
  queued_at: string; // ISO 8601
  started_at?: string; // ISO 8601
  completed_at?: string; // ISO 8601
  
  retry_after?: string; // ISO 8601
  blocked_reason?: string;
  error?: string;
  
  warrant_id?: string;
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
  
  time_window_start: string; // ISO 8601
  time_window_end: string; // ISO 8601
}

export interface HealthSnapshot {
  state: HealthState;
  latency_ms_avg: number;
  stalled_executions: number;
  
  queue_healthy: boolean;
  replay_log_writable: boolean;
  adapters_responsive: boolean;
  
  last_check: string; // ISO 8601
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
  
  last_check: string; // ISO 8601
}

// ============================================================================
// Decisions (Operator Inbox)
// ============================================================================

export type DecisionType = 'blocked_recursion' | 'blocked_budget' | 'rate_limited' | 'manual_approval' | 'dead_letter';

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
  
  created_at: string; // ISO 8601
  expires_at?: string; // ISO 8601
  
  actions: DecisionAction[];
}

export interface DecisionAction {
  action_id: string;
  label: string;
  type: 'approve' | 'reject' | 'retry' | 'cancel' | 'escalate';
  requires_reason: boolean;
}

// ============================================================================
// Dead Letters
// ============================================================================

export type DeadLetterState = 'pending_review' | 'requeued' | 'cancelled' | 'archived';

export interface DeadLetterItem {
  envelope_id: string;
  objective_id: string;
  
  state: DeadLetterState;
  
  envelope_type: string;
  action_type: string;
  target: string;
  
  failure_reason: string;
  attempts: number;
  first_failed_at: string; // ISO 8601
  dead_lettered_at: string; // ISO 8601
  
  risk_tier: RiskTier;
  trading_impact: 'none' | 'low' | 'medium' | 'high';
  
  reviewed_by?: string;
  reviewed_at?: string; // ISO 8601
  review_action?: 'requeued' | 'cancelled';
  review_reason?: string;
}

export interface DeadLetterStats {
  total: number;
  pending_review: number;
  requeued: number;
  cancelled: number;
  archived: number;
}

// ============================================================================
// Warrants
// ============================================================================

export type WarrantState = 'active' | 'expired' | 'revoked';

export interface WarrantSummary {
  warrant_id: string;
  state: WarrantState;
  
  issued_at: string; // ISO 8601
  issued_by: string;
  
  truth_snapshot_id: string;
  plan_id: string;
  
  risk_tier: RiskTier;
  
  approval: {
    required: boolean;
    granted_by?: string;
    granted_at?: string; // ISO 8601
  };
  
  trading_guard: {
    consulted: boolean;
    verdict: 'safe' | 'blocked' | 'override';
    checked_at?: string; // ISO 8601
    override_id?: string;
  };
  
  expiry?: string; // ISO 8601
  revoked_at?: string; // ISO 8601
  revoked_by?: string;
  revoke_reason?: string;
}

// ============================================================================
// Agents
// ============================================================================

export type AgentRole = 'strategy' | 'governance' | 'operations' | 'reconciliation' | 'learning';
export type AgentAvailability = 'available' | 'busy' | 'offline' | 'error';

export interface AgentSummary {
  agent_id: string;
  name: string;
  role: AgentRole;
  model: string;
  
  availability: AgentAvailability;
  current_objective_id?: string;
  current_task?: string;
  
  last_activity?: string; // ISO 8601
  total_tasks_completed: number;
  total_tasks_failed: number;
}

// ============================================================================
// Replay
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
  timestamp: string; // ISO 8601
  
  envelope_id?: string;
  objective_id?: string;
  warrant_id?: string;
  
  actor: string; // who/what caused the event
  
  payload: Record<string, unknown>;
  
  metadata?: {
    session_id?: string;
    operator?: string;
    parent_event_id?: string;
  };
}

export interface ReplayQueryParams {
  objective_id?: string;
  envelope_id?: string;
  event_type?: ReplayEventType;
  start?: string; // ISO 8601
  end?: string; // ISO 8601
  limit?: number;
  offset?: number;
}

export interface ReplayResponse {
  events: ReplayEvent[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Audit
// ============================================================================

export type AuditResult = 'requested' | 'preview' | 'executing' | 'completed' | 'failed';

export interface AuditRecord {
  id: string;
  action: string;
  timestamp: string; // ISO 8601
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
  result?: AuditResult;
  start?: string; // ISO 8601
  end?: string; // ISO 8601
  limit?: number;
  offset?: number;
}

export interface AuditResponse {
  records: AuditRecord[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Operator Actions
// ============================================================================

export interface PauseExecutionRequest {
  reason: string;
  operator: string;
}

export interface PauseExecutionResponse {
  success: boolean;
  paused_at: string; // ISO 8601
  queued_envelopes_paused: number;
}

export interface ResumeExecutionRequest {
  operator: string;
}

export interface ResumeExecutionResponse {
  success: boolean;
  resumed_at: string; // ISO 8601
  envelopes_resumed: number;
}

export interface SubmitDirectiveRequest {
  text: string;
  risk_tier: RiskTier;
  operator: string;
  metadata?: Record<string, unknown>;
}

export interface SubmitDirectiveResponse {
  success: boolean;
  directive_id: string;
  objective_id: string;
  created_at: string; // ISO 8601
}

export interface CancelObjectiveRequest {
  reason: string;
  operator: string;
}

export interface CancelObjectiveResponse {
  success: boolean;
  objective_id: string;
  cancelled_at: string; // ISO 8601
  envelopes_cancelled: number;
}

export interface RetryDeadLetterRequest {
  operator: string;
  reason: string;
}

export interface RetryDeadLetterResponse {
  success: boolean;
  envelope_id: string;
  requeued_at: string; // ISO 8601
}

export interface CancelDeadLetterRequest {
  operator: string;
  reason: string;
}

export interface CancelDeadLetterResponse {
  success: boolean;
  envelope_id: string;
  cancelled_at: string; // ISO 8601
}

export interface AgentReasonRequest {
  prompt: string;
  objective_id?: string;
  operator: string;
  context?: Record<string, unknown>;
}

export interface AgentReasonResponse {
  success: boolean;
  session_id: string;
  response?: string;
  error?: string;
}

export interface EmergencyOverrideRequest {
  operator: string;
  reason: string;
  duration_minutes: number; // max 60
  metternich_approval_id: string;
}

export interface EmergencyOverrideResponse {
  success: boolean;
  override_id: string;
  activated_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  audit_event_id: string;
}

export interface IntegrityCheckRequest {
  operator: string;
}

export interface IntegrityCheckResponse {
  success: boolean;
  integrity: IntegritySnapshot;
  checked_at: string; // ISO 8601
}

// ============================================================================
// Dashboard Bootstrap
// ============================================================================

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
  
  bootstrapped_at: string; // ISO 8601
}

// ============================================================================
// Server-Sent Events
// ============================================================================

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
  timestamp: string; // ISO 8601
  payload: T;
}

// Specific SSE payload types
export interface SystemStatusUpdatedPayload {
  status: SystemStatus;
}

export interface ObjectiveUpdatedPayload {
  objective_id: string;
  status: ObjectiveStatus;
  changes: Partial<ObjectiveSummary>;
}

export interface ExecutionStartedPayload {
  envelope_id: string;
  objective_id: string;
  started_at: string;
}

export interface ExecutionCompletedPayload {
  envelope_id: string;
  objective_id: string;
  completed_at: string;
  duration_ms: number;
}

export interface ExecutionFailedPayload {
  envelope_id: string;
  objective_id: string;
  error: string;
  failed_at: string;
}

export interface DecisionCreatedPayload {
  decision: DecisionItem;
}

export interface DeadLetterCreatedPayload {
  dead_letter: DeadLetterItem;
}

export interface AlertCreatedPayload {
  alert_id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  created_at: string;
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

// ============================================================================
// Success Response (generic)
// ============================================================================

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string; // ISO 8601
}

// ============================================================================
// Governed Action Results
// ============================================================================

export type GovernedActionStatus = 'executing' | 'completed' | 'approval_required' | 'failed' | 'unavailable';

export interface GovernedActionResult {
  action: string;
  targetId?: string;
  status: GovernedActionStatus;
  message: string;
  objectiveId?: string | null;
  envelopeId?: string | null;
  auditRef?: string | null;
  timestamp: string;
}
