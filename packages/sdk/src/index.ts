/**
 * @vienna/sdk — Official TypeScript SDK for Vienna OS
 *
 * AI Agent Governance Platform SDK providing typed access to
 * intent submission, policy management, fleet operations,
 * approval workflows, integrations, and compliance reporting.
 *
 * @packageDocumentation
 */

// ─── Client ───────────────────────────────────────────────────────────────────
export { ViennaClient } from './client.js';

// ─── Modules ──────────────────────────────────────────────────────────────────
export { IntentModule } from './intent.js';
export { PoliciesModule } from './policies.js';
export { FleetModule } from './fleet.js';
export { ApprovalsModule } from './approvals.js';
export { IntegrationsModule } from './integrations.js';
export { ComplianceModule } from './compliance.js';

// ─── Errors ───────────────────────────────────────────────────────────────────
export {
  ViennaError,
  ViennaAuthError,
  ViennaForbiddenError,
  ViennaNotFoundError,
  ViennaRateLimitError,
  ViennaValidationError,
  ViennaServerError,
} from './errors.js';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  // Config
  ViennaConfig,
  ApiResponse,
  PaginationParams,
  PaginatedList,
  RequestOptions,

  // Intent
  ActionType,
  RiskTier,
  IntentStatus,
  IntentRequest,
  IntentResult,
  IntentStatusResponse,
  IntentSimulationResult,
  PolicyMatch,

  // Policies
  ConditionOperator,
  PolicyCondition,
  PolicyAction,
  PolicyRule,
  PolicyCreateParams,
  PolicyUpdateParams,
  PolicyListParams,
  PolicyEvaluation,
  PolicyTemplate,

  // Fleet
  AgentStatus,
  FleetAgent,
  AgentMetrics,
  AgentActivity,
  AlertSeverity,
  FleetAlert,
  FleetAlertParams,

  // Approvals
  ApprovalStatus,
  Approval,
  ApprovalListParams,
  ApproveParams,
  DenyParams,

  // Integrations
  IntegrationType,
  Integration,
  IntegrationCreateParams,
  IntegrationTestResult,

  // Compliance
  ComplianceReportType,
  ReportStatus,
  ComplianceReport,
  ComplianceSummary,
  ComplianceGenerateParams,
  QuickStatsParams,

  // Audit & Warrant
  AuditEntry,
  Warrant,
} from './types.js';
