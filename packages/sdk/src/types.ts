// ─── Configuration ────────────────────────────────────────────────────────────

/** Configuration options for the ViennaClient. */
export interface ViennaConfig {
  /** API key for authentication (starts with `vna_`). */
  apiKey: string;
  /** Base URL of the Vienna OS API. Defaults to `https://console.regulator.ai`. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to `30000`. */
  timeout?: number;
  /** Number of automatic retries on 429/5xx errors. Defaults to `3`. */
  retries?: number;
  /** Global error handler invoked on every request failure. */
  onError?: (error: Error) => void;
}

// ─── API Envelope ─────────────────────────────────────────────────────────────

/** Standard Vienna API response envelope. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Common pagination parameters. */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/** Paginated list wrapper. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Request Options ──────────────────────────────────────────────────────────

/** Per-request options that can override client defaults. */
export interface RequestOptions {
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
  /** Override timeout for this request. */
  timeout?: number;
}

// ─── Intent ───────────────────────────────────────────────────────────────────

/** Known action types (extensible via string). */
export type ActionType =
  | 'wire_transfer'
  | 'deploy'
  | 'data_access'
  | 'email_send'
  | 'api_call'
  | 'file_write'
  | 'config_change'
  | (string & {});

/** Risk tier classification. */
export type RiskTier = 'T0' | 'T1' | 'T2' | 'T3';

/** Intent execution status. */
export type IntentStatus = 'executed' | 'pending_approval' | 'denied' | 'cancelled' | 'expired';

/** Request body for submitting an intent. */
export interface IntentRequest {
  /** The action the agent wants to perform. */
  action: ActionType;
  /** Identifier of the agent submitting the intent. */
  source: string;
  /** Tenant/environment scope. */
  tenantId?: string;
  /** Arbitrary payload describing the action details. */
  payload: Record<string, unknown>;
  /** Optional metadata tags. */
  metadata?: Record<string, string>;
}

/** Result of an intent submission. */
export interface IntentResult {
  intentId: string;
  status: IntentStatus;
  executionId?: string;
  warrantId?: string;
  riskTier: RiskTier;
  policyMatches: PolicyMatch[];
  auditId: string;
  createdAt: string;
}

/** A policy that matched during intent evaluation. */
export interface PolicyMatch {
  policyId: string;
  policyName: string;
  action: string;
  tier?: RiskTier;
}

/** Full intent status response. */
export interface IntentStatusResponse {
  intentId: string;
  status: IntentStatus;
  riskTier: RiskTier;
  action: string;
  source: string;
  payload: Record<string, unknown>;
  policyMatches: PolicyMatch[];
  approvalId?: string;
  executionId?: string;
  warrantId?: string;
  auditId: string;
  createdAt: string;
  updatedAt: string;
}

/** Result of a simulated (dry-run) intent. */
export interface IntentSimulationResult {
  wouldExecute: boolean;
  status: IntentStatus;
  riskTier: RiskTier;
  policyMatches: PolicyMatch[];
  requiredApprovals: string[];
}

// ─── Policies ─────────────────────────────────────────────────────────────────

/** Condition operators for policy rules. */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'regex';

/** A single condition within a policy rule. */
export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

/** Action taken when a policy matches. */
export type PolicyAction =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'log'
  | 'notify'
  | (string & {});

/** A governance policy rule. */
export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  conditions: PolicyCondition[];
  actionOnMatch: PolicyAction;
  approvalTier?: RiskTier;
  priority: number;
  enabled: boolean;
  tenantId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Parameters for creating a new policy. */
export interface PolicyCreateParams {
  name: string;
  description?: string;
  conditions: PolicyCondition[];
  actionOnMatch: PolicyAction;
  approvalTier?: RiskTier;
  priority: number;
  enabled?: boolean;
  tenantId?: string;
  tags?: string[];
}

/** Parameters for updating an existing policy. */
export interface PolicyUpdateParams {
  name?: string;
  description?: string;
  conditions?: PolicyCondition[];
  actionOnMatch?: PolicyAction;
  approvalTier?: RiskTier;
  priority?: number;
  enabled?: boolean;
  tags?: string[];
}

/** Filter parameters for listing policies. */
export interface PolicyListParams {
  enabled?: boolean;
  tenantId?: string;
  tag?: string;
}

/** Result of evaluating policies against a test payload. */
export interface PolicyEvaluation {
  matchedPolicies: PolicyMatch[];
  finalAction: PolicyAction;
  riskTier: RiskTier;
  details: string[];
}

/** An industry policy template. */
export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  conditions: PolicyCondition[];
  actionOnMatch: PolicyAction;
  approvalTier?: RiskTier;
}

// ─── Fleet ────────────────────────────────────────────────────────────────────

/** Agent status within the fleet. */
export type AgentStatus = 'active' | 'suspended' | 'inactive' | 'probation';

/** An agent registered in the fleet. */
export interface FleetAgent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  trustScore: number;
  riskTier: RiskTier;
  tenantId?: string;
  lastActivityAt?: string;
  totalIntents: number;
  deniedIntents: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/** Metrics for a specific agent. */
export interface AgentMetrics {
  agentId: string;
  totalIntents: number;
  approvedIntents: number;
  deniedIntents: number;
  pendingIntents: number;
  avgResponseTimeMs: number;
  trustScore: number;
  riskTier: RiskTier;
  periodStart: string;
  periodEnd: string;
}

/** A single agent activity log entry. */
export interface AgentActivity {
  id: string;
  agentId: string;
  action: string;
  status: IntentStatus;
  riskTier: RiskTier;
  timestamp: string;
  details?: Record<string, unknown>;
}

/** Alert severity levels. */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/** A fleet-wide alert. */
export interface FleetAlert {
  id: string;
  agentId: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

/** Filter parameters for listing fleet alerts. */
export interface FleetAlertParams {
  resolved?: boolean;
  severity?: AlertSeverity;
  agentId?: string;
}

// ─── Approvals ────────────────────────────────────────────────────────────────

/** Approval status. */
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

/** An approval request. */
export interface Approval {
  id: string;
  intentId: string;
  action: string;
  source: string;
  riskTier: RiskTier;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  operator?: string;
  notes?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

/** Filter parameters for listing approvals. */
export interface ApprovalListParams {
  status?: ApprovalStatus;
  source?: string;
  riskTier?: RiskTier;
}

/** Parameters for approving a request. */
export interface ApproveParams {
  operator: string;
  notes?: string;
}

/** Parameters for denying a request. */
export interface DenyParams {
  operator: string;
  reason: string;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

/** Supported integration types. */
export type IntegrationType =
  | 'slack'
  | 'webhook'
  | 'pagerduty'
  | 'email'
  | 'teams'
  | (string & {});

/** An external integration. */
export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  eventTypes: string[];
  enabled: boolean;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Parameters for creating an integration. */
export interface IntegrationCreateParams {
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  eventTypes: string[];
}

/** Result of testing an integration. */
export interface IntegrationTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

/** Compliance report types. */
export type ComplianceReportType = 'quarterly' | 'annual' | 'monthly' | 'custom';

/** Report generation status. */
export type ReportStatus = 'generating' | 'ready' | 'failed';

/** A compliance report. */
export interface ComplianceReport {
  id: string;
  type: ComplianceReportType;
  status: ReportStatus;
  periodStart: string;
  periodEnd: string;
  summary?: ComplianceSummary;
  downloadUrl?: string;
  createdAt: string;
}

/** High-level compliance statistics. */
export interface ComplianceSummary {
  totalIntents: number;
  approvedIntents: number;
  deniedIntents: number;
  pendingApprovals: number;
  policyViolations: number;
  avgResponseTimeMs: number;
  complianceScore: number;
  topViolatingAgents: Array<{ agentId: string; violations: number }>;
}

/** Parameters for generating a compliance report. */
export interface ComplianceGenerateParams {
  type: ComplianceReportType;
  periodStart: string;
  periodEnd: string;
  tenantId?: string;
}

/** Quick stats request parameters. */
export interface QuickStatsParams {
  days: number;
  tenantId?: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

/** An entry in the audit trail. */
export interface AuditEntry {
  id: string;
  intentId: string;
  action: string;
  source: string;
  status: IntentStatus;
  riskTier: RiskTier;
  policyMatches: PolicyMatch[];
  warrantId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Warrant ──────────────────────────────────────────────────────────────────

/** A cryptographic governance warrant. */
export interface Warrant {
  id: string;
  intentId: string;
  hash: string;
  signature: string;
  issuedAt: string;
  expiresAt?: string;
  verified: boolean;
}
