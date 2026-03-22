/**
 * Phase 16.3 — Queue Type System
 * 
 * Queued work is governed deferred intent, not failure.
 */

export type QueueState =
  | "READY"
  | "BLOCKED_LOCK"
  | "BLOCKED_APPROVAL"
  | "BLOCKED_DEPENDENCY"
  | "RETRY_SCHEDULED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type TerminalQueueState = "COMPLETED" | "FAILED" | "CANCELLED";

export type RetryEligibleQueueState =
  | "BLOCKED_LOCK"
  | "BLOCKED_DEPENDENCY"
  | "RETRY_SCHEDULED";

export type QueueBlockReason =
  | "LOCK_CONFLICT"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_PENDING"
  | "DEPENDENCY_PENDING"
  | "DEPENDENCY_FAILED"
  | "TRANSIENT_EXECUTION_ERROR"
  | "POLICY_RECHECK_DEFERRED"
  | "RATE_LIMITED";

export type ResumeCondition =
  | {
      type: "lock_released";
      resource_keys: string[];
    }
  | {
      type: "approval_granted";
      approval_id: string;
    }
  | {
      type: "time_retry";
      not_before: string; // ISO timestamp
    }
  | {
      type: "dependency_complete";
      dependency_execution_id: string;
    };

export type RetryStrategy = "fixed" | "exponential";

export type RetryPolicy = {
  max_attempts: number;
  backoff_ms: number;
  strategy: RetryStrategy;
};

export type RetryMetadata = {
  attempt_count: number;
  last_attempt_at?: string;
  next_retry_at?: string;
  last_error_code?: string;
  last_error_message?: string;
};

export type QueuePriority = "P0" | "P1" | "P2" | "P3";

export const QUEUE_PRIORITY_ORDER: Record<QueuePriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export type QueueItem = {
  id: string;

  state: QueueState;
  priority: QueuePriority;

  blocked_reason?: QueueBlockReason;
  resume_condition?: ResumeCondition;

  retry_policy?: RetryPolicy;
  retry: RetryMetadata;

  requested_by: string;
  approved_by?: string;
  resumed_by?: string;

  plan_id: string;
  execution_id?: string;
  step_id: string;
  intent_id: string;

  warrant_id?: string;
  approval_id?: string;
  verification_template_id?: string;

  resource_keys: string[];

  risk_tier: "T0" | "T1" | "T2";
  policy_snapshot_id?: string;

  created_at: string;
  updated_at: string;
  queued_at: string;

  eligible_at?: string;
  started_at?: string;
  completed_at?: string;

  scheduler_lease_id?: string;
  scheduler_lease_expires_at?: string;

  last_transition_at: string;
  transition_reason?: string;

  metadata?: Record<string, unknown>;
};

export type QueueItemRow = {
  id: string;
  state: QueueState;
  priority: QueuePriority;

  blocked_reason: QueueBlockReason | null;
  resume_condition_json: string | null;

  retry_policy_json: string | null;
  retry_json: string;

  requested_by: string;
  approved_by: string | null;
  resumed_by: string | null;

  plan_id: string;
  execution_id: string | null;
  step_id: string;
  intent_id: string;

  warrant_id: string | null;
  approval_id: string | null;
  verification_template_id: string | null;

  resource_keys_json: string;
  risk_tier: "T0" | "T1" | "T2";
  policy_snapshot_id: string | null;

  created_at: string;
  updated_at: string;
  queued_at: string;
  eligible_at: string | null;
  started_at: string | null;
  completed_at: string | null;

  scheduler_lease_id: string | null;
  scheduler_lease_expires_at: string | null;

  last_transition_at: string;
  transition_reason: string | null;

  metadata_json: string | null;
};

export type EnqueueDeferredIntentInput = {
  requested_by: string;
  approved_by?: string;

  plan_id: string;
  execution_id?: string;
  step_id: string;
  intent_id: string;

  warrant_id?: string;
  approval_id?: string;
  verification_template_id?: string;

  risk_tier: "T0" | "T1" | "T2";
  priority: QueuePriority;
  resource_keys: string[];

  initial_state: "BLOCKED_LOCK" | "BLOCKED_APPROVAL" | "BLOCKED_DEPENDENCY" | "RETRY_SCHEDULED";

  blocked_reason: QueueBlockReason;
  resume_condition: ResumeCondition;

  retry_policy?: RetryPolicy;
  metadata?: Record<string, unknown>;
};

export type QueueTransitionInput = {
  queue_item_id: string;
  from_state: QueueState;
  to_state: QueueState;
  reason: string;
  resumed_by?: string;
  blocked_reason?: QueueBlockReason;
  resume_condition?: ResumeCondition;
  next_retry_at?: string;
  metadata?: Record<string, unknown>;
};

export type GovernanceReentryRequest = {
  queue_item_id: string;

  plan_id: string;
  step_id: string;
  intent_id: string;
  execution_id?: string;

  approval_id?: string;
  warrant_id?: string;
  verification_template_id?: string;

  requested_by: string;
  approved_by?: string;
  resumed_by: string;

  risk_tier: "T0" | "T1" | "T2";
  resource_keys: string[];
};

export type GovernanceReentryResult =
  | {
      allowed: true;
      warrant_id?: string;
      approval_id?: string;
      execution_id: string;
      policy_snapshot_id?: string;
    }
  | {
      allowed: false;
      disposition: "REQUEUE" | "CANCEL";
      state: QueueState;
      blocked_reason?: QueueBlockReason;
      resume_condition?: ResumeCondition;
      transition_reason: string;
    };

export type QueueItemView = {
  id: string;
  state: QueueState;
  priority: QueuePriority;

  blocked_reason?: QueueBlockReason;
  resume_condition_summary?: string;

  requested_by: string;
  approved_by?: string;
  resumed_by?: string;

  plan_id: string;
  step_id: string;
  intent_id: string;

  queued_at: string;
  next_retry_at?: string;
  retry_attempts: number;
};

export type SchedulerEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: string };

export type QueueLedgerEventType =
  | "QUEUE_ITEM_CREATED"
  | "QUEUE_ITEM_BLOCKED"
  | "QUEUE_ITEM_READY"
  | "QUEUE_ITEM_RETRY_SCHEDULED"
  | "QUEUE_ITEM_LEASE_ACQUIRED"
  | "QUEUE_ITEM_GOVERNANCE_REENTRY_STARTED"
  | "QUEUE_ITEM_GOVERNANCE_REENTRY_PASSED"
  | "QUEUE_ITEM_GOVERNANCE_REENTRY_REQUEUED"
  | "QUEUE_ITEM_GOVERNANCE_REENTRY_CANCELLED"
  | "QUEUE_ITEM_EXECUTION_STARTED"
  | "QUEUE_ITEM_EXECUTION_COMPLETED"
  | "QUEUE_ITEM_EXECUTION_FAILED"
  | "QUEUE_ITEM_CANCELLED";
