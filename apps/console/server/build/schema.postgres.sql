-- Vienna State Graph Schema (Postgres)
-- Version: 1.0.0 (Postgres Migration)
-- Created: 2026-03-24
-- Converted from SQLite schema for Vercel Postgres compatibility

-- Key conversions:
-- 1. TEXT timestamps → TIMESTAMPTZ
-- 2. DEFAULT (datetime('now')) → DEFAULT NOW()
-- 3. JSON-storing TEXT columns → JSONB
-- 4. INTEGER AUTOINCREMENT → SERIAL
-- 5. CHECK constraints preserved
-- 6. Indexes preserved

-- Services: system services, cron jobs, APIs, daemons
CREATE TABLE IF NOT EXISTS services (
  service_id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK(service_type IN ('cron', 'api', 'daemon', 'worker', 'other')),
  status TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'degraded', 'failed', 'unknown')),
  health TEXT CHECK(health IN ('healthy', 'unhealthy', 'warning') OR health IS NULL),
  last_check_at TIMESTAMPTZ,
  last_restart_at TIMESTAMPTZ,
  dependencies JSONB, -- JSON array of service_ids
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_health ON services(health);

-- Providers: LLM providers, APIs, data sources
CREATE TABLE IF NOT EXISTS providers (
  provider_id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('llm', 'api', 'data', 'other')),
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'degraded', 'failed')),
  health TEXT CHECK(health IN ('healthy', 'unhealthy', 'rate_limited') OR health IS NULL),
  last_health_check TIMESTAMPTZ,
  credentials_status TEXT CHECK(credentials_status IN ('valid', 'expired', 'missing', 'rotated') OR credentials_status IS NULL),
  rate_limit_info JSONB, -- JSON object
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_health ON providers(health);

-- Incidents: system incidents, failures, resolutions
CREATE TABLE IF NOT EXISTS incidents (
  incident_id TEXT PRIMARY KEY,
  incident_type TEXT NOT NULL CHECK(incident_type IN ('service_failure', 'api_error', 'data_corruption', 'config_error', 'security', 'other')),
  severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved', 'closed')),
  affected_services JSONB, -- JSON array of service_ids
  detected_at TIMESTAMPTZ NOT NULL,
  detected_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  root_cause TEXT,
  action_taken TEXT,
  pattern_id TEXT,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON incidents(detected_at);
CREATE INDEX IF NOT EXISTS idx_incidents_pattern_id ON incidents(pattern_id);

-- Objectives: tasks, milestones, projects, investigations
CREATE TABLE IF NOT EXISTS objectives (
  objective_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  objective_name TEXT NOT NULL,
  objective_type TEXT NOT NULL CHECK(objective_type IN ('task', 'milestone', 'project', 'investigation', 'other')),
  status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'blocked', 'cancelled', 'deferred')),
  priority TEXT CHECK(priority IN ('critical', 'high', 'medium', 'low') OR priority IS NULL),
  assigned_to TEXT,
  blocked_reason TEXT,
  dependencies JSONB, -- JSON array of objective_ids
  completion_criteria TEXT,
  progress_pct INTEGER DEFAULT 0 CHECK(progress_pct BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON objectives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);
CREATE INDEX IF NOT EXISTS idx_objectives_priority ON objectives(priority);
CREATE INDEX IF NOT EXISTS idx_objectives_assigned_to ON objectives(assigned_to);

-- Runtime Context: operational flags, configuration state
CREATE TABLE IF NOT EXISTS runtime_context (
  context_key TEXT PRIMARY KEY,
  context_value TEXT NOT NULL,
  context_type TEXT CHECK(context_type IN ('flag', 'config', 'mode', 'status') OR context_type IS NULL),
  expires_at TIMESTAMPTZ,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_context_type ON runtime_context(context_type);
CREATE INDEX IF NOT EXISTS idx_runtime_context_expires_at ON runtime_context(expires_at);

-- Endpoints: execution endpoints (local, OpenClaw, etc.)
CREATE TABLE IF NOT EXISTS endpoints (
  endpoint_id TEXT PRIMARY KEY,
  endpoint_type TEXT NOT NULL CHECK(endpoint_type IN ('local', 'remote')),
  endpoint_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'degraded', 'offline', 'failed')),
  health TEXT NOT NULL CHECK(health IN ('healthy', 'unhealthy', 'unknown')),
  connectivity TEXT CHECK(connectivity IN ('connected', 'disconnected', 'unknown')),
  last_heartbeat TIMESTAMPTZ,
  last_successful_action TIMESTAMPTZ,
  capabilities JSONB, -- JSON array
  version TEXT,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_endpoints_type ON endpoints(endpoint_type);
CREATE INDEX IF NOT EXISTS idx_endpoints_status ON endpoints(status);
CREATE INDEX IF NOT EXISTS idx_endpoints_health ON endpoints(health);

-- Endpoint Instructions: instruction dispatch history
CREATE TABLE IF NOT EXISTS endpoint_instructions (
  instruction_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  instruction_type TEXT NOT NULL,
  action TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  warrant_id TEXT,
  issued_by TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK(status IN ('pending', 'executing', 'success', 'failure', 'timeout')),
  result JSONB, -- JSON
  error TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (endpoint_id) REFERENCES endpoints(endpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_instructions_endpoint ON endpoint_instructions(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_instructions_status ON endpoint_instructions(status);
CREATE INDEX IF NOT EXISTS idx_instructions_issued_at ON endpoint_instructions(issued_at);

-- State Transitions: audit trail of state changes for pattern detection
CREATE TABLE IF NOT EXISTS state_transitions (
  transition_id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('service', 'provider', 'incident', 'objective', 'runtime_context', 'endpoint', 'plan', 'verification', 'workflow_outcome')),
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB -- JSON object
);

CREATE INDEX IF NOT EXISTS idx_transitions_entity ON state_transitions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_transitions_changed_at ON state_transitions(changed_at);
CREATE INDEX IF NOT EXISTS idx_transitions_changed_by ON state_transitions(changed_by);

-- Plans: execution plans (Intent → Plan → Warrant → Execution)
CREATE TABLE IF NOT EXISTS plans (
  plan_id TEXT PRIMARY KEY,
  objective TEXT NOT NULL,
  intent_id TEXT,
  steps JSONB NOT NULL, -- JSON array of PlanStep objects
  preconditions JSONB, -- JSON array
  postconditions JSONB, -- JSON array
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  estimated_duration_ms INTEGER,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'executing', 'completed', 'failed', 'cancelled')),
  verification_spec JSONB, -- JSON object (Phase 8.2)
  warrant_id TEXT,
  execution_id TEXT,
  result JSONB, -- JSON
  error TEXT,
  actual_duration_ms INTEGER,
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_risk_tier ON plans(risk_tier);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at);
CREATE INDEX IF NOT EXISTS idx_plans_warrant_id ON plans(warrant_id);
CREATE INDEX IF NOT EXISTS idx_plans_intent_id ON plans(intent_id);

-- Verifications: independent postcondition validation
CREATE TABLE IF NOT EXISTS verifications (
  verification_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  execution_id TEXT,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'inconclusive', 'timed_out', 'skipped')),
  objective_achieved INTEGER NOT NULL CHECK(objective_achieved IN (0, 1)),
  verification_strength_target TEXT,
  verification_strength_achieved TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  summary TEXT,
  evidence_json JSONB, -- JSON object containing checks and stability results
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);

CREATE INDEX IF NOT EXISTS idx_verifications_plan ON verifications(plan_id);
CREATE INDEX IF NOT EXISTS idx_verifications_execution ON verifications(execution_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_objective_achieved ON verifications(objective_achieved);
CREATE INDEX IF NOT EXISTS idx_verifications_started_at ON verifications(started_at);

-- Workflow Outcomes: final workflow conclusions
CREATE TABLE IF NOT EXISTS workflow_outcomes (
  outcome_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  execution_id TEXT,
  verification_id TEXT,
  workflow_status TEXT NOT NULL CHECK(workflow_status IN (
    'planned', 'awaiting_approval', 'approved', 'dispatched', 'executing',
    'execution_failed', 'verifying', 'completed', 'completed_with_warnings',
    'verification_failed', 'inconclusive', 'timed_out', 'cancelled', 'denied'
  )),
  execution_status TEXT,
  verification_status TEXT,
  objective_achieved INTEGER NOT NULL CHECK(objective_achieved IN (0, 1)),
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  finalized_at TIMESTAMPTZ NOT NULL,
  operator_visible_summary TEXT,
  next_actions JSONB, -- JSON array
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
  FOREIGN KEY (verification_id) REFERENCES verifications(verification_id)
);

CREATE INDEX IF NOT EXISTS idx_outcomes_plan ON workflow_outcomes(plan_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_workflow_status ON workflow_outcomes(workflow_status);
CREATE INDEX IF NOT EXISTS idx_outcomes_objective_achieved ON workflow_outcomes(objective_achieved);
CREATE INDEX IF NOT EXISTS idx_outcomes_risk_tier ON workflow_outcomes(risk_tier);
CREATE INDEX IF NOT EXISTS idx_outcomes_finalized_at ON workflow_outcomes(finalized_at);

-- Intent Traces: intent lifecycle tracking (Phase 11.5)
CREATE TABLE IF NOT EXISTS intent_traces (
  intent_id TEXT PRIMARY KEY,
  intent_type TEXT NOT NULL,
  source JSONB NOT NULL, -- JSON: { type, id }
  submitted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('submitted', 'validated', 'denied', 'executing', 'completed', 'failed')),
  events JSONB NOT NULL, -- JSON array of IntentTraceEvent objects
  relationships JSONB, -- JSON: { reconciliation_id, execution_id, verification_id, outcome_id }
  metadata JSONB, -- JSON object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_traces_type ON intent_traces(intent_type);
CREATE INDEX IF NOT EXISTS idx_intent_traces_status ON intent_traces(status);
CREATE INDEX IF NOT EXISTS idx_intent_traces_submitted_at ON intent_traces(submitted_at);

-- Execution Ledger Events: immutable lifecycle facts (forensic record)
CREATE TABLE IF NOT EXISTS execution_ledger_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  execution_id TEXT NOT NULL,
  plan_id TEXT,
  verification_id TEXT,
  warrant_id TEXT,
  outcome_id TEXT,

  event_type TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('intent', 'plan', 'policy', 'warrant', 'execution', 'verification', 'outcome')),

  actor_type TEXT,
  actor_id TEXT,
  environment TEXT,
  risk_tier TEXT CHECK(risk_tier IN ('T0', 'T1', 'T2') OR risk_tier IS NULL),

  objective TEXT,
  target_type TEXT,
  target_id TEXT,

  event_timestamp TIMESTAMPTZ NOT NULL,
  sequence_num INTEGER NOT NULL,

  status TEXT,
  payload_json JSONB,
  evidence_json JSONB,
  summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_execution_id ON execution_ledger_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_plan_id ON execution_ledger_events(plan_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_event_type ON execution_ledger_events(event_type);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_event_timestamp ON execution_ledger_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_events_stage ON execution_ledger_events(stage);
CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_ledger_events_execution_sequence ON execution_ledger_events(execution_id, sequence_num);

-- Execution Ledger Summary: derived current-state projection
CREATE TABLE IF NOT EXISTS execution_ledger_summary (
  execution_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  plan_id TEXT,
  verification_id TEXT,
  warrant_id TEXT,
  outcome_id TEXT,

  actor_type TEXT,
  actor_id TEXT,
  environment TEXT,
  risk_tier TEXT CHECK(risk_tier IN ('T0', 'T1', 'T2') OR risk_tier IS NULL),

  objective TEXT,
  target_type TEXT,
  target_id TEXT,

  current_stage TEXT CHECK(current_stage IN ('intent', 'plan', 'policy', 'warrant', 'execution', 'verification', 'outcome') OR current_stage IS NULL),
  execution_status TEXT,
  verification_status TEXT,
  workflow_status TEXT,
  objective_achieved BOOLEAN DEFAULT false,

  approval_required BOOLEAN DEFAULT false,
  approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'denied', 'not_required') OR approval_status IS NULL),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  event_count INTEGER NOT NULL DEFAULT 0,
  last_event_type TEXT,
  last_event_timestamp TIMESTAMPTZ,

  summary TEXT,
  entities_json JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_objective ON execution_ledger_summary(objective);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_target_id ON execution_ledger_summary(target_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_workflow_status ON execution_ledger_summary(workflow_status);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_risk_tier ON execution_ledger_summary(risk_tier);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_started_at ON execution_ledger_summary(started_at);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_summary_current_stage ON execution_ledger_summary(current_stage);

-- Policies: governance policies for execution admissibility
CREATE TABLE IF NOT EXISTS policies (
  policy_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  policy_json JSONB NOT NULL, -- Full policy object as JSON
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  priority INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (policy_id, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority);

-- Policy Decisions: policy evaluation results
CREATE TABLE IF NOT EXISTS policy_decisions (
  decision_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  policy_id TEXT,
  policy_version TEXT,
  decision TEXT NOT NULL CHECK(decision IN ('allow', 'deny', 'require_approval', 'require_stronger_verification', 'require_precondition_check', 'defer_to_operator')),
  decision_json JSONB NOT NULL, -- Full PolicyDecision object as JSON
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_decisions_plan ON policy_decisions(plan_id);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_policy ON policy_decisions(policy_id, policy_version);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_decision ON policy_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_timestamp ON policy_decisions(timestamp);

-- Failure Policies (Circuit Breaker Policies)
CREATE TABLE IF NOT EXISTS failure_policies (
  policy_id TEXT PRIMARY KEY,
  policy_name TEXT NOT NULL,
  description TEXT,
  max_consecutive_failures INTEGER,
  cooldown_mode TEXT CHECK(cooldown_mode IN ('exponential', 'fixed', 'linear')),
  cooldown_base_seconds INTEGER,
  cooldown_multiplier REAL,
  cooldown_max_seconds INTEGER,
  degraded_after_consecutive_failures INTEGER,
  reset_on_verified_recovery INTEGER NOT NULL DEFAULT 1 CHECK(reset_on_verified_recovery IN (0, 1)),
  reset_on_manual_reset INTEGER NOT NULL DEFAULT 1 CHECK(reset_on_manual_reset IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failure_policies_name ON failure_policies(policy_name);

-- Managed Objectives: declarative system state management
CREATE TABLE IF NOT EXISTS managed_objectives (
  objective_id TEXT PRIMARY KEY,
  objective_type TEXT NOT NULL CHECK(objective_type IN ('maintain_health', 'enforce_availability', 'ensure_compliance', 'monitor_performance', 'custom')),
  target_type TEXT NOT NULL CHECK(target_type IN ('service', 'endpoint', 'provider', 'resource', 'system')),
  target_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('prod', 'test')),
  status TEXT NOT NULL CHECK(status IN ('declared', 'monitoring', 'healthy', 'violation_detected', 'remediation_triggered', 'remediation_running', 'verification', 'restored', 'failed', 'blocked', 'suspended', 'archived')),
  desired_state_json JSONB NOT NULL, -- Machine-evaluable state specification
  remediation_plan TEXT NOT NULL, -- Plan ID to trigger on violation
  evaluation_interval_seconds INTEGER NOT NULL,
  verification_strength TEXT NOT NULL CHECK(verification_strength IN ('service_health', 'http_healthcheck', 'full_validation', 'minimal')),
  priority INTEGER DEFAULT 100,
  owner TEXT DEFAULT 'system',
  context_json JSONB, -- Additional metadata (not evaluation criteria)
  
  reconciliation_status TEXT NOT NULL DEFAULT 'idle' CHECK(reconciliation_status IN ('idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode')),
  reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0,
  reconciliation_started_at TIMESTAMPTZ,
  reconciliation_cooldown_until TIMESTAMPTZ,
  reconciliation_last_result TEXT,
  reconciliation_last_error TEXT,
  reconciliation_last_execution_id TEXT,
  reconciliation_last_verified_at TIMESTAMPTZ,
  reconciliation_generation INTEGER NOT NULL DEFAULT 0,
  manual_hold INTEGER NOT NULL DEFAULT 0 CHECK(manual_hold IN (0, 1)),
  
  policy_ref TEXT DEFAULT 'default-service-remediation',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  total_failures INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  degraded_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_evaluated_at TIMESTAMPTZ,
  last_violation_at TIMESTAMPTZ,
  last_restored_at TIMESTAMPTZ,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_managed_objectives_status ON managed_objectives(status);
CREATE INDEX IF NOT EXISTS idx_managed_objectives_target ON managed_objectives(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_managed_objectives_environment ON managed_objectives(environment);
CREATE INDEX IF NOT EXISTS idx_managed_objectives_enabled ON managed_objectives(is_enabled);
CREATE INDEX IF NOT EXISTS idx_managed_objectives_priority ON managed_objectives(priority);
CREATE INDEX IF NOT EXISTS idx_managed_objectives_reconciliation_status ON managed_objectives(reconciliation_status);

-- Managed Objective Evaluations: periodic observation results
CREATE TABLE IF NOT EXISTS managed_objective_evaluations (
  evaluation_id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL,
  evaluation_timestamp TIMESTAMPTZ NOT NULL,
  observed_state_json JSONB NOT NULL, -- Actual observed state
  objective_satisfied INTEGER NOT NULL CHECK(objective_satisfied IN (0, 1)),
  violation_detected INTEGER NOT NULL CHECK(violation_detected IN (0, 1)),
  action_taken TEXT CHECK(action_taken IN ('none', 'monitoring', 'remediation_triggered', 'escalated', 'suspended')),
  result_summary TEXT,
  triggered_plan_id TEXT,
  triggered_execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_managed_objective_evaluations_objective ON managed_objective_evaluations(objective_id);
CREATE INDEX IF NOT EXISTS idx_managed_objective_evaluations_timestamp ON managed_objective_evaluations(evaluation_timestamp);
CREATE INDEX IF NOT EXISTS idx_managed_objective_evaluations_satisfied ON managed_objective_evaluations(objective_satisfied);
CREATE INDEX IF NOT EXISTS idx_managed_objective_evaluations_violation ON managed_objective_evaluations(violation_detected);

-- Managed Objective History: lifecycle transitions and major events
CREATE TABLE IF NOT EXISTS managed_objective_history (
  history_id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  metadata_json JSONB, -- Transition metadata
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_managed_objective_history_objective ON managed_objective_history(objective_id);
CREATE INDEX IF NOT EXISTS idx_managed_objective_history_timestamp ON managed_objective_history(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_managed_objective_history_status ON managed_objective_history(to_status);

-- Workspace Artifacts: Files, traces, reports, notes created during investigations
CREATE TABLE IF NOT EXISTS workspace_investigations (
  investigation_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  objective_id TEXT,
  incident_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved', 'archived')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  environment TEXT NOT NULL CHECK(environment IN ('prod', 'test')),
  
  metadata_json JSONB,
  
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_investigations_status ON workspace_investigations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_objective ON workspace_investigations(objective_id);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_incident ON workspace_investigations(incident_id);
CREATE INDEX IF NOT EXISTS idx_workspace_investigations_created ON workspace_investigations(created_at);

CREATE TABLE IF NOT EXISTS workspace_artifacts (
  artifact_id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL CHECK(artifact_type IN (
    'investigation_workspace', 'investigation_notes', 'investigation_report',
    'trace', 'intent_trace', 'execution_graph', 'timeline_export',
    'execution_output', 'execution_stdout', 'execution_stderr',
    'verification_report',
    'state_snapshot', 'config_snapshot', 'system_snapshot',
    'objective_history', 'objective_analysis',
    'incident_timeline', 'incident_postmortem',
    'investigation_note', 'operator_annotation'
  )),
  artifact_path TEXT NOT NULL,
  parent_investigation_id TEXT,
  
  intent_id TEXT,
  execution_id TEXT,
  objective_id TEXT,
  incident_id TEXT,
  
  content_hash TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  environment TEXT NOT NULL CHECK(environment IN ('prod', 'test')),
  
  metadata_json JSONB,
  
  FOREIGN KEY (parent_investigation_id) REFERENCES workspace_investigations(investigation_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_type ON workspace_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_investigation ON workspace_artifacts(parent_investigation_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_intent ON workspace_artifacts(intent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_execution ON workspace_artifacts(execution_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_objective ON workspace_artifacts(objective_id);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_status ON workspace_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_workspace_artifacts_created ON workspace_artifacts(created_at);

-- Workspace Artifact Tags: Many-to-many relationship for artifact organization
CREATE TABLE IF NOT EXISTS workspace_artifact_tags (
  artifact_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (artifact_id, tag),
  FOREIGN KEY (artifact_id) REFERENCES workspace_artifacts(artifact_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_artifact_tags_tag ON workspace_artifact_tags(tag);

-- Execution Locks: Target-level locks to prevent concurrent plan collisions
-- Note: expires_at converted to TIMESTAMPTZ for Postgres (was INTEGER unix timestamp in SQLite)
CREATE TABLE IF NOT EXISTS execution_locks (
  lock_id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK(target_type IN ('service', 'endpoint', 'provider', 'resource')),
  target_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  plan_id TEXT,
  objective_id TEXT,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK(status IN ('active', 'released', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_locks_target ON execution_locks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_execution_locks_execution ON execution_locks(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_locks_status ON execution_locks(status);
CREATE INDEX IF NOT EXISTS idx_execution_locks_expires ON execution_locks(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_locks_active_target 
  ON execution_locks(target_type, target_id) 
  WHERE status = 'active';

-- Approval Requests: T1/T2 approval workflow
CREATE TABLE IF NOT EXISTS approval_requests (
  approval_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  
  required_tier TEXT NOT NULL CHECK(required_tier IN ('T1', 'T2')),
  required_by TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'denied', 'expired')),
  
  requested_at TIMESTAMPTZ NOT NULL,
  requested_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  
  action_summary TEXT NOT NULL,
  risk_summary TEXT NOT NULL,
  target_entities JSONB NOT NULL, -- JSON array
  estimated_duration_ms INTEGER NOT NULL,
  rollback_available INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_execution ON approval_requests(execution_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_plan ON approval_requests(plan_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_step ON approval_requests(step_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_expires ON approval_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_at ON approval_requests(requested_at);

-- Queue System
CREATE TABLE IF NOT EXISTS queue_items (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN (
    'READY', 'BLOCKED_LOCK', 'BLOCKED_APPROVAL', 'BLOCKED_DEPENDENCY',
    'RETRY_SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  
  blocked_reason TEXT CHECK(blocked_reason IN (
    'LOCK_CONFLICT', 'APPROVAL_REQUIRED', 'APPROVAL_PENDING',
    'DEPENDENCY_PENDING', 'DEPENDENCY_FAILED', 'TRANSIENT_EXECUTION_ERROR',
    'POLICY_RECHECK_DEFERRED', 'RATE_LIMITED'
  )),
  resume_condition_json JSONB,
  
  retry_policy_json JSONB,
  retry_json JSONB NOT NULL,
  
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  resumed_by TEXT,
  
  plan_id TEXT NOT NULL,
  execution_id TEXT,
  step_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  
  warrant_id TEXT,
  approval_id TEXT,
  verification_template_id TEXT,
  
  resource_keys_json JSONB NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  policy_snapshot_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  queued_at TIMESTAMPTZ NOT NULL,
  eligible_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  scheduler_lease_id TEXT,
  scheduler_lease_expires_at TIMESTAMPTZ,
  
  last_transition_at TIMESTAMPTZ NOT NULL,
  transition_reason TEXT,
  
  metadata_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_queue_state ON queue_items(state);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_items(priority);
CREATE INDEX IF NOT EXISTS idx_queue_plan ON queue_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_queue_approval ON queue_items(approval_id);
CREATE INDEX IF NOT EXISTS idx_queue_eligible ON queue_items(state, eligible_at);
CREATE INDEX IF NOT EXISTS idx_queue_scheduler_lease ON queue_items(scheduler_lease_id, scheduler_lease_expires_at);

-- Scheduler Workers: Track active scheduler processes
CREATE TABLE IF NOT EXISTS scheduler_workers (
  worker_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE')),
  started_at TIMESTAMPTZ NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL,
  version TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_workers_status ON scheduler_workers(status);
CREATE INDEX IF NOT EXISTS idx_scheduler_workers_heartbeat ON scheduler_workers(heartbeat_at);

-- Queue Leases: Exclusive orchestration claims
CREATE TABLE IF NOT EXISTS queue_leases (
  lease_id TEXT PRIMARY KEY,
  queue_item_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'EXPIRED', 'RELEASED')),
  acquired_at TIMESTAMPTZ NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (worker_id) REFERENCES scheduler_workers(worker_id),
  UNIQUE(queue_item_id, status)
);

CREATE INDEX IF NOT EXISTS idx_queue_leases_queue_item ON queue_leases(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_queue_leases_worker ON queue_leases(worker_id);
CREATE INDEX IF NOT EXISTS idx_queue_leases_status ON queue_leases(status);
CREATE INDEX IF NOT EXISTS idx_queue_leases_expires_at ON queue_leases(expires_at);
CREATE INDEX IF NOT EXISTS idx_queue_leases_active ON queue_leases(queue_item_id, status) WHERE status = 'ACTIVE';

-- Execution Claims: Idempotency protection for queue execution
CREATE TABLE IF NOT EXISTS execution_claims (
  claim_id TEXT PRIMARY KEY,
  queue_item_id TEXT NOT NULL,
  execution_key TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  worker_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('CLAIMED', 'STARTED', 'COMPLETED', 'FAILED', 'ABANDONED')),
  claimed_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result_summary TEXT,
  error_message TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id),
  FOREIGN KEY (worker_id) REFERENCES scheduler_workers(worker_id),
  UNIQUE(queue_item_id, attempt_number),
  UNIQUE(execution_key)
);

CREATE INDEX IF NOT EXISTS idx_execution_claims_queue_item ON execution_claims(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_execution_claims_execution_key ON execution_claims(execution_key);
CREATE INDEX IF NOT EXISTS idx_execution_claims_status ON execution_claims(status);
CREATE INDEX IF NOT EXISTS idx_execution_claims_worker ON execution_claims(worker_id);
CREATE INDEX IF NOT EXISTS idx_execution_claims_claimed_at ON execution_claims(claimed_at);
CREATE INDEX IF NOT EXISTS idx_execution_claims_active ON execution_claims(queue_item_id, status) WHERE status IN ('CLAIMED', 'STARTED');

-- Recovery Events
CREATE TABLE IF NOT EXISTS recovery_events (
  recovery_id TEXT PRIMARY KEY,
  queue_item_id TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK(disposition IN ('RECLAIM', 'REQUEUE', 'FAIL_CLOSED', 'CANCEL', 'IGNORE')),
  detected_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id)
);

CREATE INDEX IF NOT EXISTS idx_recovery_events_queue_item ON recovery_events(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_recovery_events_detected_at ON recovery_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_recovery_events_disposition ON recovery_events(disposition);

-- Supersession Records
CREATE TABLE IF NOT EXISTS supersession_records (
  queue_item_id TEXT PRIMARY KEY,
  superseded_by_queue_item_id TEXT,
  reason TEXT NOT NULL CHECK(reason IN ('PLAN_REVISED', 'OPERATOR_CANCELLED', 'DEPENDENCY_INVALIDATED', 'POLICY_SUPERSEDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id),
  FOREIGN KEY (superseded_by_queue_item_id) REFERENCES queue_items(id)
);

CREATE INDEX IF NOT EXISTS idx_supersession_created_at ON supersession_records(created_at);
CREATE INDEX IF NOT EXISTS idx_supersession_reason ON supersession_records(reason);

-- Execution Patterns
CREATE TABLE IF NOT EXISTS execution_patterns (
  pattern_id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL CHECK(pattern_type IN ('failure_cluster', 'policy_conflict', 'remediation_effectiveness')),
  
  action_type TEXT,
  target_type TEXT,
  target_id TEXT,
  policy_id TEXT,
  
  observation_window_days INTEGER NOT NULL,
  event_count INTEGER NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  metadata JSONB NOT NULL, -- failure_reason, first_observed, last_observed, evidence, etc.
  
  detected_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'stale')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_type ON execution_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON execution_patterns(status);
CREATE INDEX IF NOT EXISTS idx_patterns_action_type ON execution_patterns(action_type);
CREATE INDEX IF NOT EXISTS idx_patterns_detected_at ON execution_patterns(detected_at);

-- Policy Recommendations
CREATE TABLE IF NOT EXISTS policy_recommendations (
  recommendation_id TEXT PRIMARY KEY,
  pattern_id TEXT REFERENCES execution_patterns(pattern_id),
  
  recommendation_type TEXT NOT NULL CHECK(recommendation_type IN (
    'relax_constraint',
    'add_exception',
    'adjust_threshold',
    'new_policy'
  )),
  
  policy_id TEXT NOT NULL,
  
  proposed_change JSONB NOT NULL,
  expected_benefit JSONB NOT NULL,
  evidence JSONB NOT NULL,
  
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON policy_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_pattern ON policy_recommendations(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON policy_recommendations(created_at);

-- Plan Improvements
CREATE TABLE IF NOT EXISTS plan_improvements (
  improvement_id TEXT PRIMARY KEY,
  plan_template_id TEXT NOT NULL,
  
  improvement_type TEXT NOT NULL CHECK(improvement_type IN (
    'step_reordering',
    'verification_adjustment',
    'retry_tuning',
    'timeout_adjustment'
  )),
  
  proposed_change JSONB NOT NULL,
  expected_benefit JSONB NOT NULL,
  evidence JSONB NOT NULL,
  
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'applied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_improvements_status ON plan_improvements(status);
CREATE INDEX IF NOT EXISTS idx_improvements_template ON plan_improvements(plan_template_id);
CREATE INDEX IF NOT EXISTS idx_improvements_created_at ON plan_improvements(created_at);

-- Operator Feedback
CREATE TABLE IF NOT EXISTS operator_feedback (
  feedback_id TEXT PRIMARY KEY,
  
  execution_id TEXT,
  approval_id TEXT,
  plan_id TEXT,
  
  decision TEXT NOT NULL CHECK(decision IN ('approved', 'denied')),
  decision_time_ms INTEGER,
  
  action_type TEXT,
  target_type TEXT,
  risk_tier TEXT CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  
  denial_reason TEXT,
  
  similar_count INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_decision ON operator_feedback(decision);
CREATE INDEX IF NOT EXISTS idx_feedback_action_type ON operator_feedback(action_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON operator_feedback(created_at);

-- Execution Nodes
CREATE TABLE IF NOT EXISTS execution_nodes (
  node_id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL CHECK(node_type IN ('worker', 'coordinator', 'hybrid')),
  
  host TEXT NOT NULL,
  region TEXT,
  environment TEXT CHECK(environment IN ('production', 'staging', 'development')),
  
  capabilities JSONB NOT NULL, -- ['systemd', 'docker', 'postgres', ...]
  
  status TEXT NOT NULL DEFAULT 'online' CHECK(status IN ('online', 'offline', 'degraded')),
  last_heartbeat_at TIMESTAMPTZ NOT NULL,
  
  current_load REAL DEFAULT 0 CHECK(current_load >= 0 AND current_load <= 1),
  
  metadata JSONB,
  
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_status ON execution_nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON execution_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_heartbeat ON execution_nodes(last_heartbeat_at);

-- Distributed Execution Assignments
CREATE TABLE IF NOT EXISTS execution_assignments (
  assignment_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  node_id TEXT NOT NULL REFERENCES execution_nodes(node_id),
  
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN (
    'assigned',
    'running',
    'completed',
    'failed',
    'cancelled'
  )),
  
  result JSONB,
  
  FOREIGN KEY (execution_id) REFERENCES execution_ledger_summary(execution_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_execution ON execution_assignments(execution_id);
CREATE INDEX IF NOT EXISTS idx_assignments_node ON execution_assignments(node_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON execution_assignments(status);

-- Distributed Locks
CREATE TABLE IF NOT EXISTS distributed_locks (
  lock_id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('target', 'action', 'global')),
  
  held_by TEXT NOT NULL,
  
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  wait_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_locks_resource ON distributed_locks(resource_id);
CREATE INDEX IF NOT EXISTS idx_locks_holder ON distributed_locks(held_by);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON distributed_locks(expires_at);

-- Lock Queue
CREATE TABLE IF NOT EXISTS lock_queue (
  queue_entry_id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  holder_id TEXT NOT NULL,
  
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timeout_ms INTEGER,
  priority INTEGER DEFAULT 100,
  
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_queue_resource ON lock_queue(resource_id);
CREATE INDEX IF NOT EXISTS idx_queue_queued_at ON lock_queue(queued_at);

-- Federated Ledger
CREATE TABLE IF NOT EXISTS federated_ledger (
  event_id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  
  event_type TEXT NOT NULL,
  execution_id TEXT,
  
  vector_clock JSONB NOT NULL,
  
  payload JSONB NOT NULL,
  
  prev_hash TEXT,
  event_hash TEXT NOT NULL,
  
  tombstoned INTEGER DEFAULT 0 CHECK(tombstoned IN (0, 1)),
  tombstoned_at TIMESTAMPTZ,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_federated_node ON federated_ledger(node_id);
CREATE INDEX IF NOT EXISTS idx_federated_execution ON federated_ledger(execution_id);
CREATE INDEX IF NOT EXISTS idx_federated_timestamp ON federated_ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_federated_tombstoned ON federated_ledger(tombstoned);

-- Execution Attestations
CREATE TABLE IF NOT EXISTS execution_attestations (
  attestation_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT,
  
  status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'blocked')),
  
  input_hash TEXT,
  output_hash TEXT,
  
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestations_execution ON execution_attestations(execution_id);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant ON execution_attestations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attestations_status ON execution_attestations(status);
CREATE INDEX IF NOT EXISTS idx_attestations_attested_at ON execution_attestations(attested_at);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

-- Custom Actions: Tenant-defined action types
-- Allows operators to register custom actions beyond the built-in 11
CREATE TABLE IF NOT EXISTS custom_actions (
  action_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  intent_type TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
  schema_json JSONB, -- JSON schema for payload validation
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(tenant_id, action_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_actions_tenant ON custom_actions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_actions_enabled ON custom_actions(enabled);
CREATE INDEX IF NOT EXISTS idx_custom_actions_risk_tier ON custom_actions(risk_tier);

-- Policies: User-defined governance rules
-- Operators create conditional rules that modify Vienna behavior
CREATE TABLE IF NOT EXISTS policies (
  policy_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Conditions: array of { field, operator, value }
  conditions_json JSONB NOT NULL, -- JSON: [{ field: "action", operator: "==", value: "wire_transfer" }]
  
  -- Actions: array of { type, params }
  actions_json JSONB NOT NULL, -- JSON: [{ type: "require_approval", params: { tier: "T2" } }]
  
  -- Priority: higher priority policies evaluated first
  priority INTEGER DEFAULT 100,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT, -- operator_id
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority DESC);

-- Agents: Track agents under governance
-- Auto-populated from execution ledger
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT,
  type TEXT, -- 'openclaw', 'langchain', 'custom', etc.
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  last_seen TIMESTAMPTZ,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Statistics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  blocked_executions INTEGER DEFAULT 0,
  
  -- Metadata
  metadata_json JSONB, -- JSON: { version, capabilities, etc. }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC);

-- Agent Activity: Recent actions per agent (rolling window)
CREATE OR REPLACE VIEW agent_activity AS
SELECT 
  el.actor_id as agent_id,
  el.tenant_id,
  COUNT(*) as total_actions,
  SUM(CASE WHEN el.workflow_status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN el.workflow_status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN el.workflow_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
  MAX(el.started_at) as last_action,
  CAST(SUM(CASE WHEN el.workflow_status = 'completed' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 as success_rate
FROM execution_ledger_summary el
WHERE el.started_at > NOW() - INTERVAL '7 days'
GROUP BY el.actor_id, el.tenant_id;
