/**
 * Vienna Runtime Service
 *
 * Interface layer between console server and Vienna Core.
 * All console operations route through this service.
 *
 * AUTHORITY BOUNDARY:
 * - Console server calls methods here
 * - This service calls Vienna Core runtime
 * - Vienna Core calls Executor/Validator/Adapters
 * - Never bypass this chain
 */
import type { SystemStatus, ObjectiveSummary, ObjectiveDetail, EnvelopeExecution, QueueSnapshot, ExecutionMetrics, HealthSnapshot, IntegritySnapshot, DecisionItem, DeadLetterItem, DeadLetterStats, AgentSummary, WarrantSummary, ReplayEvent, ReplayQueryParams, CausalChainNode, PauseExecutionRequest, ResumeExecutionRequest, SubmitDirectiveRequest, CancelObjectiveRequest, RetryDeadLetterRequest, CancelDeadLetterRequest, AgentReasonRequest, EmergencyOverrideRequest } from '../types/api.js';
export declare class ViennaRuntimeService {
    private viennaCore;
    private providerManager;
    private replayService;
    private deadLetterQueue;
    constructor(viennaCore: any, providerManager: any, deadLetterQueue?: any);
    private getReplayService;
    getDiagnostics(): Promise<{
        provider_state: any;
        executor_state: any;
        queue_state: any;
        replay_state: any;
        audit_state: any;
    }>;
    /**
     * Get unified system truth snapshot (Phase 7.3)
     *
     * @returns {Promise<Object>} System snapshot from State Graph
     */
    getSystemSnapshot(): Promise<any>;
    getSystemStatus(): Promise<SystemStatus>;
    getObjectives(params?: {
        status?: string;
        search?: string;
        limit?: number;
    }): Promise<ObjectiveSummary[]>;
    getObjective(objectiveId: string): Promise<ObjectiveDetail | null>;
    private normalizeObjectiveDetail;
    private inferObjectiveStatus;
    getObjectiveEnvelopes(objectiveId: string): Promise<EnvelopeExecution[]>;
    getObjectiveCausalChain(objectiveId: string): Promise<{
        root_envelope_id: string;
        nodes: CausalChainNode[];
        max_depth: number;
    }>;
    getObjectiveWarrant(objectiveId: string): Promise<WarrantSummary | null>;
    /**
     * Get objective progress (Phase 3D)
     *
     * Real-time envelope state tracking per objective.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Progress data
     */
    getObjectiveProgress(objectiveId: string): Promise<any>;
    /**
     * Get objective tracker statistics (Phase 3D)
     *
     * Summary stats across all objectives.
     *
     * @returns {Promise<object>} Stats summary
     */
    getObjectiveTrackerStats(): Promise<any>;
    /**
     * Get envelope lineage chain (Phase 3E)
     *
     * Returns lineage from root to target envelope.
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {Promise<array>} Lineage chain
     */
    getEnvelopeLineage(envelopeId: string): Promise<any[]>;
    /**
     * Get objective fanout tree (Phase 3E)
     *
     * Hierarchical tree structure of envelope relationships.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Tree structure
     */
    getObjectiveTree(objectiveId: string): Promise<any>;
    /**
     * Validate lineage integrity (Phase 3E)
     *
     * Check for orphaned envelopes, cycles, and fanout index issues.
     *
     * @returns {Promise<object>} Validation report
     */
    validateLineage(): Promise<any>;
    cancelObjective(objectiveId: string, request: CancelObjectiveRequest): Promise<{
        cancelled_at: string;
        envelopes_cancelled: number;
    }>;
    getActiveEnvelopes(): Promise<EnvelopeExecution[]>;
    /**
     * Get currently executing envelopes (Phase 5E)
     */
    getExecutingEnvelopes(): Promise<any[]>;
    /**
     * Get recent failures (Phase 5E)
     */
    getRecentFailures(limit?: number): Promise<any[]>;
    getQueueState(): Promise<QueueSnapshot>;
    getBlockedEnvelopes(): Promise<EnvelopeExecution[]>;
    getExecutionMetrics(): Promise<ExecutionMetrics>;
    getHealth(): Promise<HealthSnapshot>;
    checkIntegrity(operator: string): Promise<IntegritySnapshot>;
    pauseExecution(request: PauseExecutionRequest): Promise<{
        paused_at: string;
        queued_envelopes_paused: number;
    }>;
    resumeExecution(request: ResumeExecutionRequest): Promise<{
        resumed_at: string;
        envelopes_resumed: number;
    }>;
    activateEmergencyOverride(request: EmergencyOverrideRequest): Promise<{
        override_id: string;
        activated_at: string;
        expires_at: string;
        audit_event_id: string;
    }>;
    getDecisions(): Promise<DecisionItem[]>;
    getDeadLetters(params?: {
        state?: string;
        objective_id?: string;
        limit?: number;
    }): Promise<DeadLetterItem[]>;
    getDeadLetterStats(): Promise<DeadLetterStats>;
    retryDeadLetter(envelopeId: string, request: RetryDeadLetterRequest): Promise<{
        requeued_at: string;
    }>;
    cancelDeadLetter(envelopeId: string, request: CancelDeadLetterRequest): Promise<{
        cancelled_at: string;
    }>;
    getAgents(): Promise<AgentSummary[]>;
    requestAgentReasoning(agentId: string, request: AgentReasonRequest): Promise<{
        session_id: string;
        response?: string;
    }>;
    queryReplay(params: ReplayQueryParams): Promise<{
        events: ReplayEvent[];
        total: number;
        has_more: boolean;
    }>;
    getEnvelopeReplay(envelopeId: string): Promise<ReplayEvent[]>;
    queryAudit(params: any): Promise<{
        records: any[];
        total: number;
        has_more: boolean;
    }>;
    getAuditRecord(auditId: string): Promise<any | null>;
    submitDirective(request: SubmitDirectiveRequest): Promise<{
        directive_id: string;
        objective_id: string;
        created_at: string;
    }>;
    getProviders(): Promise<{
        primary: string;
        fallback: string[];
        providers: Record<string, {
            name: string;
            status: 'healthy' | 'degraded' | 'unavailable';
            lastCheckedAt: string;
            latencyMs: number | null;
            cooldownUntil: string | null;
            consecutiveFailures?: number;
        }>;
    }>;
    getServices(): Promise<Array<{
        service: string;
        status: 'running' | 'degraded' | 'stopped' | 'unknown';
        lastHeartbeatAt?: string;
        connectivity?: 'healthy' | 'degraded' | 'offline';
        restartable: boolean;
    }>>;
    restartService(serviceName: string, operator: string): Promise<{
        objective_id: string;
        status: 'preview' | 'executing' | 'failed';
        message: string;
    }>;
    listFiles(request: {
        path: string;
        operator: string;
    }): Promise<{
        path: string;
        files: Array<{
            name: string;
            path: string;
            type: 'file' | 'directory';
            size?: number;
            modified?: string;
        }>;
    }>;
    readFile(request: {
        path: string;
        operator: string;
    }): Promise<{
        path: string;
        content: string;
        size: number;
        modified: string;
    }>;
    writeFile(request: {
        path: string;
        content: string;
        createOnly?: boolean;
        operator: string;
    }): Promise<{
        envelope_id: string;
        objective_id: string;
        status: 'queued' | 'executing' | 'completed' | 'failed';
        path: string;
    }>;
    deleteFile(request: {
        path: string;
        operator: string;
    }): Promise<{
        envelope_id: string;
        objective_id: string;
        status: 'queued' | 'executing' | 'completed' | 'failed';
        path: string;
    }>;
    uploadFiles(request: {
        files: Array<{
            originalname: string;
            buffer: Buffer;
            mimetype: string;
            size: number;
        }>;
        targetPath: string;
        operator: string;
    }): Promise<{
        files: Array<{
            name: string;
            path: string;
            size: number;
            envelope_id: string;
            status: 'verified' | 'failed';
            error?: string;
        }>;
    }>;
    searchFiles(request: {
        query: string;
        path: string;
        contentSearch: boolean;
        operator: string;
    }): Promise<{
        query: string;
        path: string;
        results: Array<{
            path: string;
            name: string;
            type: 'file' | 'directory';
            match: 'name' | 'content';
            snippet?: string;
        }>;
    }>;
    submitCommand(request: {
        command: string;
        attachments: string[];
        context: Record<string, any>;
        operator: string;
    }): Promise<{
        objective_id: string;
        status: 'queued' | 'planning' | 'executing';
        command: string;
        attachments: string[];
        message: string;
        plan_id?: string;
        envelope_count?: number;
    }>;
    /**
     * Generate envelopes from execution plan
     */
    private generateEnvelopesFromPlan;
    getRuntimeEnvelopes(params: {
        limit?: number;
        status?: string;
        objectiveId?: string;
    }): Promise<Array<{
        envelope_id: string;
        objective_id: string;
        parent_envelope_id?: string;
        action_type: string;
        target: string;
        state: string;
        warrant_id?: string;
        verification_status?: string;
        retry_count: number;
        dead_letter: boolean;
        queued_at: string;
        started_at?: string;
        completed_at?: string;
        error?: string;
    }>>;
    getRuntimeEnvelope(envelopeId: string): Promise<{
        envelope_id: string;
        objective_id: string;
        parent_envelope_id?: string;
        action_type: string;
        target: string;
        state: string;
        warrant_id?: string;
        verification_status?: string;
        retry_count: number;
        dead_letter: boolean;
        queued_at: string;
        started_at?: string;
        completed_at?: string;
        error?: string;
        payload?: any;
    } | null>;
    getObjectiveExecution(objectiveId: string): Promise<{
        objective_id: string;
        title: string;
        status: string;
        envelopes: Array<{
            envelope_id: string;
            parent_envelope_id?: string;
            action_type: string;
            target: string;
            state: string;
            warrant_id?: string;
            verification_status?: string;
            retry_count: number;
            queued_at: string;
            started_at?: string;
            completed_at?: string;
        }>;
        execution_tree: Array<{
            envelope_id: string;
            children: string[];
            depth: number;
        }>;
    } | null>;
    bootstrapDashboard(): Promise<void>;
    /**
     * Process recovery intent
     *
     * @param message - Recovery command ("diagnose system", "show failures", etc.)
     * @returns Recovery response (markdown-formatted)
     */
    processRecoveryIntent(message: string): Promise<string>;
    /**
     * Get current runtime mode state
     *
     * @returns Runtime mode state
     */
    getRuntimeMode(): Promise<{
        mode: string;
        reasons: string[];
        enteredAt: string;
        previousMode: string | null;
        fallbackProvidersActive: string[];
        availableCapabilities: string[];
    }>;
    /**
     * Force runtime mode transition (operator override)
     *
     * @param mode - Target mode
     * @param reason - Reason for override
     * @returns Transition record
     */
    forceRuntimeMode(mode: string, reason: string): Promise<{
        from: string;
        to: string;
        timestamp: string;
        reason: string;
        automatic: boolean;
    }>;
    /**
     * Get provider health (for recovery diagnostics)
     *
     * @returns Provider health map
     */
    getProviderHealth(): Promise<Record<string, {
        provider: string;
        status: string;
        lastCheckedAt: string;
        lastSuccessAt: string | null;
        lastFailureAt: string | null;
        cooldownUntil: string | null;
        latencyMs: number | null;
        errorRate: number | null;
        consecutiveFailures: number;
    }>>;
    /**
     * Process chat message (Phase 6.6)
     *
     * Routes message to appropriate handler:
     * - Recovery intents → recovery API
     * - General chat → active LLM provider
     *
     * @param message - User message
     * @param context - Conversation context
     * @returns Chat response
     */
    processChatMessage(message: string, context?: {
        systemPrompt?: string;
        conversationHistory?: Array<{
            role: string;
            content: string;
        }>;
        model?: string;
    }): Promise<string>;
    /**
     * Classify chat intent (Phase 6.6)
     *
     * @param message - User message
     * @returns 'recovery' or 'general'
     */
    classifyChatIntent(message: string): 'recovery' | 'general';
    /**
     * Get available built-in workflows
     */
    getAvailableWorkflows(): Array<{
        workflow_id: string;
        name: string;
        description: string;
        step_count: number;
        max_risk_tier: string;
    }>;
    /**
     * Create workflow instance from template
     */
    createWorkflow(templateId: string, context?: any): any;
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId: string): any;
    /**
     * Get all workflows
     */
    getAllWorkflows(): any[];
    /**
     * Approve workflow for execution
     */
    approveWorkflow(workflowId: string, operator: string): any;
    /**
     * Execute workflow
     */
    executeWorkflow(workflowId: string): Promise<any>;
    /**
     * Cancel workflow
     */
    cancelWorkflow(workflowId: string, operator: string): any;
    /**
     * Get all models from registry
     */
    getAllModelsFromRegistry(): Array<any>;
    /**
     * Get enabled models
     */
    getEnabledModels(): Array<any>;
    /**
     * Update model status
     */
    updateModelStatus(modelId: string, status: string): any;
    /**
     * Set operator model preference
     */
    setOperatorModelPreference(operator: string, taskType: string, modelId: string): void;
    /**
     * Get operator model preferences
     */
    getOperatorModelPreferences(operator: string): Array<any>;
    /**
     * Clear operator model preference
     */
    clearOperatorModelPreference(operator: string, taskType: string): void;
    /**
     * Route task to appropriate model
     */
    routeTaskToModel(request: {
        task_type: string;
        operator?: string;
        required_capabilities?: string[];
        max_cost_class?: string;
    }): any;
    /**
     * Get model routing statistics
     */
    getModelRoutingStats(): any;
    /**
     * Test model routing
     */
    testModelRouting(taskType: string, operator?: string): any;
    /**
     * Get available system commands
     *
     * @param category - Optional category filter
     * @returns Available commands
     */
    getAvailableCommands(category?: string): Array<{
        name: string;
        category: string;
        description: string;
        requiresWarrant: boolean;
        riskTier: string;
    }>;
    /**
     * Propose a system command for execution
     *
     * @param commandName - Command template name
     * @param args - Command arguments
     * @param context - Execution context
     * @returns Command proposal
     */
    proposeSystemCommand(commandName: string, args?: any[], context?: any): any;
    /**
     * Execute a system command (with governance)
     *
     * @param commandName - Command template name
     * @param args - Command arguments
     * @param context - Execution context (operator, warrant, etc.)
     * @returns Execution result
     */
    executeSystemCommand(commandName: string, args?: any[], context?: any): Promise<any>;
    /**
     * Diagnose system issues and propose fixes
     *
     * @returns Diagnosis with proposed actions
     */
    diagnoseAndProposeFixes(): Promise<any>;
    /**
     * Approve and execute T1 action (Phase 7.5e)
     */
    approveAndExecuteT1(action: any, approver: string): Promise<any>;
    denyT1Action(action: any, reason: string): Promise<void>;
}
//# sourceMappingURL=viennaRuntime.d.ts.map