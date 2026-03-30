/** Configuration options for the ViennaClient. */
interface ViennaConfig {
    /** API key for authentication (starts with `vna_`). */
    apiKey: string;
    /** Base URL of the Vienna OS API. Defaults to `https://vienna-os.fly.dev`. */
    baseUrl?: string;
    /** Request timeout in milliseconds. Defaults to `30000`. */
    timeout?: number;
    /** Number of automatic retries on 429/5xx errors. Defaults to `3`. */
    retries?: number;
    /** Global error handler invoked on every request failure. */
    onError?: (error: Error) => void;
}
/** Standard Vienna API response envelope. */
interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}
/** Common pagination parameters. */
interface PaginationParams {
    limit?: number;
    offset?: number;
}
/** Paginated list wrapper. */
interface PaginatedList<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}
/** Per-request options that can override client defaults. */
interface RequestOptions {
    /** AbortSignal for request cancellation. */
    signal?: AbortSignal;
    /** Override timeout for this request. */
    timeout?: number;
}
/** Known action types (extensible via string). */
type ActionType = 'wire_transfer' | 'deploy' | 'data_access' | 'email_send' | 'api_call' | 'file_write' | 'config_change' | (string & {});
/** Risk tier classification. */
type RiskTier = 'T0' | 'T1' | 'T2' | 'T3';
/** Intent execution status. */
type IntentStatus = 'executed' | 'pending_approval' | 'denied' | 'cancelled' | 'expired';
/** Request body for submitting an intent. */
interface IntentRequest {
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
interface IntentResult {
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
interface PolicyMatch {
    policyId: string;
    policyName: string;
    action: string;
    tier?: RiskTier;
}
/** Full intent status response. */
interface IntentStatusResponse {
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
interface IntentSimulationResult {
    wouldExecute: boolean;
    status: IntentStatus;
    riskTier: RiskTier;
    policyMatches: PolicyMatch[];
    requiredApprovals: string[];
}
/** Condition operators for policy rules. */
type ConditionOperator = 'equals' | 'not_equals' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'regex';
/** A single condition within a policy rule. */
interface PolicyCondition {
    field: string;
    operator: ConditionOperator;
    value: unknown;
}
/** Action taken when a policy matches. */
type PolicyAction = 'allow' | 'deny' | 'require_approval' | 'log' | 'notify' | (string & {});
/** A governance policy rule. */
interface PolicyRule {
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
interface PolicyCreateParams {
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
interface PolicyUpdateParams {
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
interface PolicyListParams {
    enabled?: boolean;
    tenantId?: string;
    tag?: string;
}
/** Result of evaluating policies against a test payload. */
interface PolicyEvaluation {
    matchedPolicies: PolicyMatch[];
    finalAction: PolicyAction;
    riskTier: RiskTier;
    details: string[];
}
/** An industry policy template. */
interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    industry: string;
    conditions: PolicyCondition[];
    actionOnMatch: PolicyAction;
    approvalTier?: RiskTier;
}
/** Agent status within the fleet. */
type AgentStatus = 'active' | 'suspended' | 'inactive' | 'probation';
/** An agent registered in the fleet. */
interface FleetAgent {
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
interface AgentMetrics {
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
interface AgentActivity {
    id: string;
    agentId: string;
    action: string;
    status: IntentStatus;
    riskTier: RiskTier;
    timestamp: string;
    details?: Record<string, unknown>;
}
/** Alert severity levels. */
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
/** A fleet-wide alert. */
interface FleetAlert {
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
interface FleetAlertParams {
    resolved?: boolean;
    severity?: AlertSeverity;
    agentId?: string;
}
/** Approval status. */
type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';
/** An approval request. */
interface Approval {
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
interface ApprovalListParams {
    status?: ApprovalStatus;
    source?: string;
    riskTier?: RiskTier;
}
/** Parameters for approving a request. */
interface ApproveParams {
    operator: string;
    notes?: string;
}
/** Parameters for denying a request. */
interface DenyParams {
    operator: string;
    reason: string;
}
/** Supported integration types. */
type IntegrationType = 'slack' | 'webhook' | 'pagerduty' | 'email' | 'teams' | (string & {});
/** An external integration. */
interface Integration {
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
interface IntegrationCreateParams {
    type: IntegrationType;
    name: string;
    config: Record<string, unknown>;
    eventTypes: string[];
}
/** Result of testing an integration. */
interface IntegrationTestResult {
    success: boolean;
    latencyMs: number;
    error?: string;
}
/** Compliance report types. */
type ComplianceReportType = 'quarterly' | 'annual' | 'monthly' | 'custom';
/** Report generation status. */
type ReportStatus = 'generating' | 'ready' | 'failed';
/** A compliance report. */
interface ComplianceReport {
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
interface ComplianceSummary {
    totalIntents: number;
    approvedIntents: number;
    deniedIntents: number;
    pendingApprovals: number;
    policyViolations: number;
    avgResponseTimeMs: number;
    complianceScore: number;
    topViolatingAgents: Array<{
        agentId: string;
        violations: number;
    }>;
}
/** Parameters for generating a compliance report. */
interface ComplianceGenerateParams {
    type: ComplianceReportType;
    periodStart: string;
    periodEnd: string;
    tenantId?: string;
}
/** Quick stats request parameters. */
interface QuickStatsParams {
    days: number;
    tenantId?: string;
}
/** An entry in the audit trail. */
interface AuditEntry {
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
/** A cryptographic governance warrant. */
interface Warrant {
    id: string;
    intentId: string;
    hash: string;
    signature: string;
    issuedAt: string;
    expiresAt?: string;
    verified: boolean;
}

/**
 * Module for submitting and managing agent intents through the governance pipeline.
 *
 * @example
 * ```typescript
 * const result = await vienna.intent.submit({
 *   action: 'wire_transfer',
 *   source: 'billing-bot',
 *   payload: { amount: 75000, currency: 'USD' },
 * });
 * ```
 */
declare class IntentModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * Submit an agent intent for governance evaluation and execution.
     *
     * @param intent  - The intent request describing the action.
     * @param options - Optional request options (signal, timeout).
     * @returns The intent result including status, risk tier, and policy matches.
     */
    submit(intent: IntentRequest, options?: RequestOptions): Promise<IntentResult>;
    /**
     * Check the current status of a previously submitted intent.
     *
     * @param intentId - The intent identifier (e.g. `int-abc123`).
     * @param options  - Optional request options.
     * @returns Full intent status including audit trail references.
     */
    status(intentId: string, options?: RequestOptions): Promise<IntentStatusResponse>;
    /**
     * Simulate an intent without executing it (dry-run).
     * Useful for testing policy configurations and understanding governance outcomes.
     *
     * @param intent  - The intent to simulate.
     * @param options - Optional request options.
     * @returns Simulation result showing what would happen.
     */
    simulate(intent: IntentRequest, options?: RequestOptions): Promise<IntentSimulationResult>;
}

/**
 * Module for managing governance policies.
 *
 * @example
 * ```typescript
 * const policies = await vienna.policies.list({ enabled: true });
 * const rule = await vienna.policies.create({
 *   name: 'High-Value Gate',
 *   conditions: [{ field: 'amount', operator: 'gt', value: 10000 }],
 *   actionOnMatch: 'require_approval',
 *   priority: 100,
 * });
 * ```
 */
declare class PoliciesModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * List all policies, optionally filtered.
     *
     * @param params  - Filter parameters.
     * @param options - Optional request options.
     * @returns Array of policy rules.
     */
    list(params?: PolicyListParams, options?: RequestOptions): Promise<PolicyRule[]>;
    /**
     * Get a single policy by ID.
     *
     * @param policyId - The policy identifier.
     * @param options  - Optional request options.
     * @returns The policy rule.
     */
    get(policyId: string, options?: RequestOptions): Promise<PolicyRule>;
    /**
     * Create a new governance policy.
     *
     * @param params  - Policy creation parameters.
     * @param options - Optional request options.
     * @returns The created policy rule.
     */
    create(params: PolicyCreateParams, options?: RequestOptions): Promise<PolicyRule>;
    /**
     * Update an existing policy.
     *
     * @param policyId - The policy identifier.
     * @param params   - Fields to update.
     * @param options  - Optional request options.
     * @returns The updated policy rule.
     */
    update(policyId: string, params: PolicyUpdateParams, options?: RequestOptions): Promise<PolicyRule>;
    /**
     * Delete a policy.
     *
     * @param policyId - The policy identifier.
     * @param options  - Optional request options.
     */
    delete(policyId: string, options?: RequestOptions): Promise<void>;
    /**
     * Evaluate policies against a test payload (dry-run).
     * Returns which policies would match and what action would be taken.
     *
     * @param payload - The test payload to evaluate.
     * @param options - Optional request options.
     * @returns Evaluation result with matched policies and final action.
     */
    evaluate(payload: Record<string, unknown>, options?: RequestOptions): Promise<PolicyEvaluation>;
    /**
     * List available industry policy templates.
     *
     * @param options - Optional request options.
     * @returns Array of policy templates.
     */
    templates(options?: RequestOptions): Promise<PolicyTemplate[]>;
}

/**
 * Module for fleet and agent management.
 *
 * @example
 * ```typescript
 * const fleet = await vienna.fleet.list();
 * const agent = await vienna.fleet.get('billing-bot');
 * await vienna.fleet.suspend('billing-bot', { reason: 'Suspicious activity' });
 * ```
 */
declare class FleetModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * List all agents in the fleet.
     *
     * @param options - Optional request options.
     * @returns Array of fleet agents.
     */
    list(options?: RequestOptions): Promise<FleetAgent[]>;
    /**
     * Get a single agent by ID.
     *
     * @param agentId - The agent identifier.
     * @param options - Optional request options.
     * @returns The fleet agent.
     */
    get(agentId: string, options?: RequestOptions): Promise<FleetAgent>;
    /**
     * Get metrics for a specific agent.
     *
     * @param agentId - The agent identifier.
     * @param options - Optional request options.
     * @returns Agent performance metrics.
     */
    metrics(agentId: string, options?: RequestOptions): Promise<AgentMetrics>;
    /**
     * Get paginated activity log for an agent.
     *
     * @param agentId    - The agent identifier.
     * @param pagination - Pagination parameters.
     * @param options    - Optional request options.
     * @returns Paginated list of agent activities.
     */
    activity(agentId: string, pagination?: PaginationParams, options?: RequestOptions): Promise<PaginatedList<AgentActivity>>;
    /**
     * Suspend an agent, preventing it from submitting intents.
     *
     * @param agentId - The agent identifier.
     * @param params  - Suspension details.
     * @param options - Optional request options.
     * @returns The updated agent.
     */
    suspend(agentId: string, params: {
        reason: string;
    }, options?: RequestOptions): Promise<FleetAgent>;
    /**
     * Reactivate a suspended agent.
     *
     * @param agentId - The agent identifier.
     * @param options - Optional request options.
     * @returns The updated agent.
     */
    activate(agentId: string, options?: RequestOptions): Promise<FleetAgent>;
    /**
     * Manually adjust an agent's trust score.
     *
     * @param agentId - The agent identifier.
     * @param params  - New trust score and reason.
     * @param options - Optional request options.
     * @returns The updated agent.
     */
    setTrust(agentId: string, params: {
        score: number;
        reason: string;
    }, options?: RequestOptions): Promise<FleetAgent>;
    /**
     * List fleet-wide alerts.
     *
     * @param params  - Filter parameters.
     * @param options - Optional request options.
     * @returns Array of fleet alerts.
     */
    alerts(params?: FleetAlertParams, options?: RequestOptions): Promise<FleetAlert[]>;
    /**
     * Resolve a fleet alert.
     *
     * @param alertId - The alert identifier.
     * @param params  - Resolution details.
     * @param options - Optional request options.
     * @returns The resolved alert.
     */
    resolveAlert(alertId: string, params: {
        resolvedBy: string;
    }, options?: RequestOptions): Promise<FleetAlert>;
}

/**
 * Module for managing approval workflows.
 *
 * @example
 * ```typescript
 * const pending = await vienna.approvals.list({ status: 'pending' });
 * await vienna.approvals.approve('appr-123', { operator: 'jane', notes: 'LGTM' });
 * ```
 */
declare class ApprovalsModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * List approvals, optionally filtered by status or source.
     *
     * @param params  - Filter parameters.
     * @param options - Optional request options.
     * @returns Array of approvals.
     */
    list(params?: ApprovalListParams, options?: RequestOptions): Promise<Approval[]>;
    /**
     * Get a single approval by ID.
     *
     * @param approvalId - The approval identifier.
     * @param options    - Optional request options.
     * @returns The approval.
     */
    get(approvalId: string, options?: RequestOptions): Promise<Approval>;
    /**
     * Approve a pending action.
     *
     * @param approvalId - The approval identifier.
     * @param params     - Approval details (operator, optional notes).
     * @param options    - Optional request options.
     * @returns The updated approval.
     */
    approve(approvalId: string, params: ApproveParams, options?: RequestOptions): Promise<Approval>;
    /**
     * Deny a pending action.
     *
     * @param approvalId - The approval identifier.
     * @param params     - Denial details (operator, reason).
     * @param options    - Optional request options.
     * @returns The updated approval.
     */
    deny(approvalId: string, params: DenyParams, options?: RequestOptions): Promise<Approval>;
}

/**
 * Module for managing external integrations (Slack, webhooks, PagerDuty, etc.).
 *
 * @example
 * ```typescript
 * await vienna.integrations.create({
 *   type: 'slack',
 *   name: 'Ops Channel',
 *   config: { webhook_url: 'https://hooks.slack.com/...' },
 *   eventTypes: ['approval_required', 'policy_violation'],
 * });
 * ```
 */
declare class IntegrationsModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * List all configured integrations.
     *
     * @param options - Optional request options.
     * @returns Array of integrations.
     */
    list(options?: RequestOptions): Promise<Integration[]>;
    /**
     * Get a single integration by ID.
     *
     * @param integrationId - The integration identifier.
     * @param options       - Optional request options.
     * @returns The integration.
     */
    get(integrationId: string, options?: RequestOptions): Promise<Integration>;
    /**
     * Create a new integration.
     *
     * @param params  - Integration configuration.
     * @param options - Optional request options.
     * @returns The created integration.
     */
    create(params: IntegrationCreateParams, options?: RequestOptions): Promise<Integration>;
    /**
     * Update an existing integration.
     *
     * @param integrationId - The integration identifier.
     * @param params        - Fields to update.
     * @param options       - Optional request options.
     * @returns The updated integration.
     */
    update(integrationId: string, params: Partial<IntegrationCreateParams>, options?: RequestOptions): Promise<Integration>;
    /**
     * Delete an integration.
     *
     * @param integrationId - The integration identifier.
     * @param options       - Optional request options.
     */
    delete(integrationId: string, options?: RequestOptions): Promise<void>;
    /**
     * Send a test event to an integration to verify connectivity.
     *
     * @param integrationId - The integration identifier.
     * @param options       - Optional request options.
     * @returns Test result with success status and latency.
     */
    test(integrationId: string, options?: RequestOptions): Promise<IntegrationTestResult>;
    /**
     * Toggle an integration's enabled/disabled state.
     *
     * @param integrationId - The integration identifier.
     * @param params        - Enable or disable.
     * @param options       - Optional request options.
     * @returns The updated integration.
     */
    toggle(integrationId: string, params: {
        enabled: boolean;
    }, options?: RequestOptions): Promise<Integration>;
}

/**
 * Module for compliance reporting and statistics.
 *
 * @example
 * ```typescript
 * const report = await vienna.compliance.generate({
 *   type: 'quarterly',
 *   periodStart: '2026-01-01',
 *   periodEnd: '2026-03-31',
 * });
 * const stats = await vienna.compliance.quickStats({ days: 30 });
 * ```
 */
declare class ComplianceModule {
    private readonly client;
    constructor(client: ViennaClient);
    /**
     * Generate a new compliance report.
     *
     * @param params  - Report parameters (type, period).
     * @param options - Optional request options.
     * @returns The created report (may still be generating).
     */
    generate(params: ComplianceGenerateParams, options?: RequestOptions): Promise<ComplianceReport>;
    /**
     * Get a compliance report by ID.
     *
     * @param reportId - The report identifier.
     * @param options  - Optional request options.
     * @returns The compliance report with summary data.
     */
    get(reportId: string, options?: RequestOptions): Promise<ComplianceReport>;
    /**
     * List all compliance reports.
     *
     * @param options - Optional request options.
     * @returns Array of compliance reports.
     */
    list(options?: RequestOptions): Promise<ComplianceReport[]>;
    /**
     * Get quick compliance statistics for a rolling window.
     *
     * @param params  - Stats parameters (number of days).
     * @param options - Optional request options.
     * @returns Compliance summary statistics.
     */
    quickStats(params: QuickStatsParams, options?: RequestOptions): Promise<ComplianceSummary>;
}

/**
 * Main client for the Vienna OS API.
 *
 * @example
 * ```typescript
 * import { ViennaClient } from '@vienna/sdk';
 *
 * const vienna = new ViennaClient({ apiKey: 'vna_your_api_key' });
 * const result = await vienna.intent.submit({ action: 'deploy', source: 'ci-bot', payload: {} });
 * ```
 */
declare class ViennaClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly retries;
    private readonly onError?;
    /** Intent submission and status. */
    readonly intent: IntentModule;
    /** Policy management. */
    readonly policies: PoliciesModule;
    /** Fleet and agent management. */
    readonly fleet: FleetModule;
    /** Approval workflows. */
    readonly approvals: ApprovalsModule;
    /** External integrations. */
    readonly integrations: IntegrationsModule;
    /** Compliance reporting. */
    readonly compliance: ComplianceModule;
    constructor(config: ViennaConfig);
    /**
     * Make an authenticated request to the Vienna API.
     *
     * @param method  - HTTP method.
     * @param path    - API path (e.g. `/api/v1/intents`).
     * @param body    - Optional JSON request body.
     * @param options - Per-request options (signal, timeout override).
     * @returns Parsed response data.
     */
    request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T>;
}

/**
 * Base error class for all Vienna SDK errors.
 * Extends native Error with HTTP status, error code, and optional details.
 */
declare class ViennaError extends Error {
    /** Machine-readable error code from the API (e.g. `POLICY_VIOLATION`). */
    readonly code: string;
    /** HTTP status code. */
    readonly status: number;
    /** Additional error details from the API response. */
    readonly details?: unknown;
    constructor(message: string, status: number, code: string, details?: unknown);
}
/** Thrown when the API key is missing or invalid (HTTP 401). */
declare class ViennaAuthError extends ViennaError {
    constructor(message: string, code?: string, details?: unknown);
}
/** Thrown when the authenticated user lacks permission (HTTP 403). */
declare class ViennaForbiddenError extends ViennaError {
    constructor(message: string, code?: string, details?: unknown);
}
/** Thrown when the requested resource does not exist (HTTP 404). */
declare class ViennaNotFoundError extends ViennaError {
    constructor(message: string, code?: string, details?: unknown);
}
/** Thrown when the rate limit is exceeded (HTTP 429). */
declare class ViennaRateLimitError extends ViennaError {
    /** Seconds to wait before retrying. */
    readonly retryAfter: number;
    constructor(message: string, retryAfter: number, code?: string, details?: unknown);
}
/** Thrown when request validation fails (HTTP 400). */
declare class ViennaValidationError extends ViennaError {
    /** Field-level validation errors. */
    readonly fields?: Record<string, string>;
    constructor(message: string, code?: string, fields?: Record<string, string>, details?: unknown);
}
/** Thrown on server-side errors (HTTP 5xx). */
declare class ViennaServerError extends ViennaError {
    constructor(message: string, status?: number, code?: string, details?: unknown);
}

/**
 * Framework-specific convenience wrappers for Vienna OS SDK.
 *
 * These wrappers provide simplified interfaces for popular AI agent frameworks,
 * focusing on the core governance operations: submitIntent, waitForApproval,
 * reportExecution, and register.
 */

/** Base configuration for framework adapters */
interface FrameworkConfig {
    /** Vienna OS API key (starts with `vna_`) */
    apiKey: string;
    /** Base URL of Vienna OS API (optional, defaults to production) */
    baseUrl?: string;
    /** Agent identifier for this framework instance (optional) */
    agentId?: string;
}
/** Simplified interface focused on core governance operations */
interface FrameworkAdapter {
    /** Submit an intent for governance evaluation */
    submitIntent(action: string, payload: Record<string, unknown>): Promise<IntentResult>;
    /** Wait for approval on a pending intent */
    waitForApproval(intentId: string, timeoutMs?: number): Promise<IntentStatus>;
    /** Report execution results back to Vienna */
    reportExecution(intentId: string, result: 'success' | 'failure', details?: Record<string, unknown>): Promise<void>;
    /** Register this agent with the Vienna fleet */
    register(metadata?: Record<string, string>): Promise<void>;
}
/** Internal base adapter implementation */
declare abstract class BaseFrameworkAdapter implements FrameworkAdapter {
    protected readonly vienna: ViennaClient;
    protected readonly agentId: string;
    constructor(config: FrameworkConfig, frameworkName: string);
    submitIntent(action: string, payload: Record<string, unknown>): Promise<IntentResult>;
    waitForApproval(intentId: string, timeoutMs?: number): Promise<IntentStatus>;
    reportExecution(intentId: string, result: 'success' | 'failure', details?: Record<string, unknown>): Promise<void>;
    register(metadata?: Record<string, string>): Promise<void>;
    protected abstract getFrameworkName(): string;
}
/** LangChain-specific adapter */
declare class LangChainAdapter extends BaseFrameworkAdapter {
    constructor(config: FrameworkConfig);
    protected getFrameworkName(): string;
    /** Enhanced submitIntent with LangChain tool context */
    submitToolIntent(toolName: string, toolArgs: Record<string, unknown>, chainContext?: Record<string, unknown>): Promise<IntentResult>;
}
/** CrewAI-specific adapter */
declare class CrewAIAdapter extends BaseFrameworkAdapter {
    constructor(config: FrameworkConfig);
    protected getFrameworkName(): string;
    /** Enhanced submitIntent with CrewAI task context */
    submitTaskIntent(taskType: string, taskPayload: Record<string, unknown>, crewContext?: Record<string, unknown>): Promise<IntentResult>;
}
/** AutoGen-specific adapter */
declare class AutoGenAdapter extends BaseFrameworkAdapter {
    constructor(config: FrameworkConfig);
    protected getFrameworkName(): string;
    /** Enhanced submitIntent with AutoGen conversation context */
    submitConversationIntent(functionName: string, functionArgs: Record<string, unknown>, conversationContext?: Record<string, unknown>): Promise<IntentResult>;
}
/** OpenClaw-specific adapter */
declare class OpenClawAdapter extends BaseFrameworkAdapter {
    constructor(config: FrameworkConfig);
    protected getFrameworkName(): string;
    /** Enhanced submitIntent with OpenClaw skill context */
    submitSkillIntent(skillName: string, skillArgs: Record<string, unknown>, sessionContext?: Record<string, unknown>): Promise<IntentResult>;
}
/**
 * Create a LangChain-optimized Vienna adapter.
 *
 * @example
 * ```typescript
 * const vienna = createForLangChain({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'langchain-bot-1',
 * });
 *
 * const result = await vienna.submitToolIntent('web_search', { query: 'AI governance' });
 * ```
 */
declare function createForLangChain(config: FrameworkConfig): LangChainAdapter;
/**
 * Create a CrewAI-optimized Vienna adapter.
 *
 * @example
 * ```typescript
 * const vienna = createForCrewAI({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'crew-researcher',
 * });
 *
 * const result = await vienna.submitTaskIntent('research', { topic: 'market analysis' });
 * ```
 */
declare function createForCrewAI(config: FrameworkConfig): CrewAIAdapter;
/**
 * Create an AutoGen-optimized Vienna adapter.
 *
 * @example
 * ```typescript
 * const vienna = createForAutoGen({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'autogen-assistant',
 * });
 *
 * const result = await vienna.submitConversationIntent('get_stock_price', { symbol: 'NVDA' });
 * ```
 */
declare function createForAutoGen(config: FrameworkConfig): AutoGenAdapter;
/**
 * Create an OpenClaw-optimized Vienna adapter.
 *
 * @example
 * ```typescript
 * const vienna = createForOpenClaw({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'openclaw-agent',
 * });
 *
 * const result = await vienna.submitSkillIntent('web_search', { query: 'OpenAI news' });
 * ```
 */
declare function createForOpenClaw(config: FrameworkConfig): OpenClawAdapter;

export { type ActionType, type AgentActivity, type AgentMetrics, type AgentStatus, type AlertSeverity, type ApiResponse, type Approval, type ApprovalListParams, type ApprovalStatus, ApprovalsModule, type ApproveParams, type AuditEntry, type ComplianceGenerateParams, ComplianceModule, type ComplianceReport, type ComplianceReportType, type ComplianceSummary, type ConditionOperator, type DenyParams, type FleetAgent, type FleetAlert, type FleetAlertParams, FleetModule, type FrameworkAdapter, type FrameworkConfig, type Integration, type IntegrationCreateParams, type IntegrationTestResult, type IntegrationType, IntegrationsModule, IntentModule, type IntentRequest, type IntentResult, type IntentSimulationResult, type IntentStatus, type IntentStatusResponse, type PaginatedList, type PaginationParams, PoliciesModule, type PolicyAction, type PolicyCondition, type PolicyCreateParams, type PolicyEvaluation, type PolicyListParams, type PolicyMatch, type PolicyRule, type PolicyTemplate, type PolicyUpdateParams, type QuickStatsParams, type ReportStatus, type RequestOptions, type RiskTier, ViennaAuthError, ViennaClient, type ViennaConfig, ViennaError, ViennaForbiddenError, ViennaNotFoundError, ViennaRateLimitError, ViennaServerError, ViennaValidationError, type Warrant, createForAutoGen, createForCrewAI, createForLangChain, createForOpenClaw };
