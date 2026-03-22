export class StateGraph {
    constructor(options?: {});
    dbPath: any;
    db: any;
    initialized: boolean;
    environment: any;
    /**
     * Initialize database (create if missing, apply schema)
     */
    initialize(): Promise<void>;
    /**
     * Run database migrations
     */
    _runMigrations(): Promise<void>;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Ensure database is initialized
     */
    _ensureInitialized(): void;
    /**
     * Execute arbitrary SQL query (read-only helper for dashboard/services)
     *
     * @param {string} sql - SQL query string
     * @param {array} params - Query parameters
     * @returns {array} Query results
     */
    query(sql: string, params?: any[]): any[];
    /**
     * List services (with optional filters)
     */
    listServices(filters?: {}): any;
    /**
     * Get service by ID
     */
    getService(serviceId: any): any;
    /**
     * Create service
     */
    createService(service: any): {
        service_id: any;
        changes: any;
    };
    /**
     * Update service
     */
    updateService(serviceId: any, updates: any, changedBy?: string): {
        changes: any;
    };
    /**
     * Delete service
     */
    deleteService(serviceId: any): {
        changes: any;
    };
    listProviders(filters?: {}): any;
    getProvider(providerId: any): any;
    createProvider(provider: any): {
        provider_id: any;
        changes: any;
    };
    updateProvider(providerId: any, updates: any, changedBy?: string): {
        changes: any;
    };
    deleteProvider(providerId: any): {
        changes: any;
    };
    listIncidents(filters?: {}): any;
    getIncident(incidentId: any): any;
    createIncident(incident: any): {
        incident_id: any;
        changes: any;
    };
    updateIncident(incidentId: any, updates: any, changedBy?: string): {
        changes: any;
    };
    deleteIncident(incidentId: any): {
        changes: any;
    };
    listObjectives(filters?: {}): any;
    /**
     * List objectives (with optional filters)
     */
    listObjectives(filters?: {}): any;
    getObjective(objectiveId: any): any;
    /**
     * Get objective by ID
     */
    getObjective(objectiveId: any): {
        objective_id: any;
        objective_type: any;
        target_type: any;
        target_id: any;
        environment: any;
        status: any;
        desired_state: any;
        remediation_plan: any;
        evaluation_interval_seconds: any;
        verification_strength: any;
        priority: any;
        owner: any;
        context: any;
        created_at: any;
        updated_at: any;
        last_evaluated_at: any;
        last_violation_at: any;
        last_restored_at: any;
        is_enabled: boolean;
        reconciliation_status: any;
        reconciliation_attempt_count: any;
        reconciliation_started_at: any;
        reconciliation_cooldown_until: any;
        reconciliation_last_result: any;
        reconciliation_last_error: any;
        reconciliation_last_execution_id: any;
        reconciliation_last_verified_at: any;
        reconciliation_generation: any;
        manual_hold: boolean;
        policy_ref: any;
        consecutive_failures: any;
        total_failures: any;
        total_attempts: any;
        last_failure_at: any;
        last_attempt_at: any;
        degraded_reason: any;
        active_attempt_id: any;
        execution_started_at: any;
        execution_deadline_at: any;
        cancel_requested_at: any;
        execution_terminated_at: any;
        last_terminal_reason: any;
        last_timeout_at: any;
        termination_result: any;
    };
    createObjective(objective: any): {
        objective_id: any;
        changes: any;
    };
    /**
     * Create managed objective (with state machine validation)
     */
    createObjective(objective: any): any;
    updateObjective(objectiveId: any, updates: any, changedBy?: string): {
        changes: any;
    };
    /**
     * Update objective (general update)
     */
    updateObjective(objectiveId: any, updates: any): any;
    deleteObjective(objectiveId: any): {
        changes: any;
    };
    listRuntimeContext(filters?: {}): any;
    getRuntimeContext(contextKey: any): any;
    setRuntimeContext(contextKey: any, contextValue: any, options?: {}): {
        context_key: any;
        changes: any;
    };
    deleteRuntimeContext(contextKey: any): {
        changes: any;
    };
    /**
     * Get current safe mode status
     * @returns {Object} { active: boolean, reason: string|null, entered_at: string|null, entered_by: string|null }
     */
    getSafeModeStatus(): any;
    /**
     * Enable safe mode (suspends autonomous reconciliation admission)
     * @param {string} reason - Why safe mode was enabled
     * @param {string} operator - Who enabled it (operator name or 'system')
     * @param {Object} context - Optional intent context (intent_id, etc.)
     */
    enableSafeMode(reason: string, operator?: string, context?: any): void;
    /**
     * Disable safe mode (resume autonomous reconciliation)
     * @param {string} operator - Who disabled it (operator name or 'system')
     * @param {Object} context - Optional intent context (intent_id, etc.)
     */
    disableSafeMode(operator?: string, context?: any): void;
    /**
     * Record system lifecycle event (safe mode, etc.)
     * @param {string} eventType - Event type (without 'system.' prefix)
     * @param {Object} metadata - Event metadata
     */
    recordSystemEvent(eventType: string, metadata: any): void;
    listEndpoints(filters?: {}): any;
    getEndpoint(endpointId: any): any;
    createEndpoint(endpoint: any): {
        endpoint_id: any;
        changes: any;
    };
    updateEndpoint(endpointId: any, updates: any, changedBy?: string): {
        changes: any;
    };
    deleteEndpoint(endpointId: any): {
        changes: any;
    };
    listEndpointInstructions(filters?: {}): any;
    getEndpointInstruction(instructionId: any): any;
    createEndpointInstruction(instruction: any): {
        instruction_id: any;
        changes: any;
    };
    updateEndpointInstruction(instructionId: any, updates: any): {
        changes: any;
    };
    /**
     * List plans (with optional filters)
     */
    listPlans(filters?: {}): any;
    /**
     * Get plan by ID
     */
    getPlan(planId: any): any;
    /**
     * Create plan
     */
    createPlan(plan: any): {
        plan_id: any;
        changes: any;
    };
    /**
     * Update plan
     */
    updatePlan(planId: any, updates: any): {
        changes: any;
    };
    /**
     * Delete plan
     */
    deletePlan(planId: any): {
        changes: any;
    };
    /**
     * List verifications (with optional filters)
     */
    listVerifications(filters?: {}): any;
    /**
     * Get verification by ID
     */
    getVerification(verificationId: any): any;
    /**
     * Create verification
     */
    createVerification(verification: any): {
        verification_id: any;
        changes: any;
    };
    /**
     * Update verification
     */
    updateVerification(verificationId: any, updates: any): {
        changes: any;
    };
    /**
     * Delete verification
     */
    deleteVerification(verificationId: any): {
        changes: any;
    };
    /**
     * List workflow outcomes (with optional filters)
     */
    listWorkflowOutcomes(filters?: {}): any;
    /**
     * Get workflow outcome by ID
     */
    getWorkflowOutcome(outcomeId: any): any;
    /**
     * Get workflow outcome by plan ID
     */
    getWorkflowOutcomeByPlan(planId: any): any;
    /**
     * Create workflow outcome
     */
    createWorkflowOutcome(outcome: any): {
        outcome_id: any;
        changes: any;
    };
    /**
     * Update workflow outcome
     */
    updateWorkflowOutcome(outcomeId: any, updates: any): {
        changes: any;
    };
    /**
     * Delete workflow outcome
     */
    deleteWorkflowOutcome(outcomeId: any): {
        changes: any;
    };
    /**
     * Append execution ledger event (immutable)
     *
     * Design: Events are append-only lifecycle facts. Summary is derived projection.
     * Projection rules apply event → summary updates deterministically.
     *
     * @param {Object} event - Event to append
     * @returns {Object} { event_id, changes }
     */
    appendLedgerEvent(event: any): any;
    /**
     * Project event into summary (deterministic)
     * Internal method - called by appendLedgerEvent
     *
     * @param {Object} event - Event to project
     */
    _projectEventIntoSummary(event: any): void;
    /**
     * Get execution ledger summary by execution_id
     */
    getExecutionLedgerSummary(executionId: any): any;
    /**
     * Get execution ledger events by execution_id
     */
    getExecutionLedgerEvents(executionId: any): any;
    /**
     * List execution ledger summaries (with filters)
     */
    listExecutionLedgerSummaries(filters?: {}): any;
    /**
     * Rebuild execution ledger summary from events
     *
     * Use when summary is corrupted or needs to be regenerated.
     * This is the safety valve that preserves integrity.
     *
     * @param {string} executionId - Execution to rebuild
     * @returns {Object} Rebuilt summary
     */
    rebuildExecutionLedgerSummary(executionId: string): any;
    /**
     * Rebuild all execution ledger summaries from events
     *
     * Use for migrations or corruption recovery.
     *
     * @returns {Object} { rebuilt: number, failed: string[] }
     */
    rebuildAllExecutionLedgerSummaries(): any;
    /**
     * Save a policy
     */
    savePolicy(policy: any): any;
    /**
     * Get a policy by ID and version
     */
    getPolicy(policyId: any, policyVersion: any): any;
    /**
     * List policies with optional filters
     */
    listPolicies(filters?: {}): any;
    /**
     * Delete a policy
     */
    deletePolicy(policyId: any, policyVersion: any): boolean;
    /**
     * Save a policy decision
     */
    savePolicyDecision(decision: any): any;
    /**
     * Get a policy decision by ID
     */
    getPolicyDecision(decisionId: any): any;
    /**
     * Get policy decision for a plan
     */
    getPolicyDecisionForPlan(planId: any): any;
    /**
     * List policy decisions with optional filters
     */
    listPolicyDecisions(filters?: {}): any;
    /**
     * Update objective status (with state machine validation)
     */
    updateObjectiveStatus(objectiveId: any, newStatus: any, reason: any, metadata?: {}): any;
    /**
     * Record objective evaluation
     */
    recordObjectiveEvaluation(evaluation: any): any;
    /**
     * Record objective transition in history
     */
    recordObjectiveTransition(objectiveId: any, fromStatus: any, toStatus: any, reason: any, metadata?: {}): string;
    /**
     * List objective history
     */
    listObjectiveHistory(objectiveId: any, limit?: number): any;
    /**
     * List objective evaluations
     */
    listObjectiveEvaluations(objectiveId: any, limit?: number): any;
    /**
     * Parse objective row from database
     */
    _parseObjectiveRow(row: any): {
        objective_id: any;
        objective_type: any;
        target_type: any;
        target_id: any;
        environment: any;
        status: any;
        desired_state: any;
        remediation_plan: any;
        evaluation_interval_seconds: any;
        verification_strength: any;
        priority: any;
        owner: any;
        context: any;
        created_at: any;
        updated_at: any;
        last_evaluated_at: any;
        last_violation_at: any;
        last_restored_at: any;
        is_enabled: boolean;
        reconciliation_status: any;
        reconciliation_attempt_count: any;
        reconciliation_started_at: any;
        reconciliation_cooldown_until: any;
        reconciliation_last_result: any;
        reconciliation_last_error: any;
        reconciliation_last_execution_id: any;
        reconciliation_last_verified_at: any;
        reconciliation_generation: any;
        manual_hold: boolean;
        policy_ref: any;
        consecutive_failures: any;
        total_failures: any;
        total_attempts: any;
        last_failure_at: any;
        last_attempt_at: any;
        degraded_reason: any;
        active_attempt_id: any;
        execution_started_at: any;
        execution_deadline_at: any;
        cancel_requested_at: any;
        execution_terminated_at: any;
        last_terminal_reason: any;
        last_timeout_at: any;
        termination_result: any;
    };
    /**
     * Parse interval string to seconds
     */
    _parseInterval(interval: any): number;
    /**
     * Create failure policy
     */
    createFailurePolicy(policy: any): {
        policy_id: any;
        policy_name: any;
        description: any;
        max_consecutive_failures: any;
        cooldown: {};
        degraded: {};
        reset: {};
        created_at: any;
        updated_at: any;
    };
    /**
     * Get failure policy by ID
     */
    getFailurePolicy(policyId: any): {
        policy_id: any;
        policy_name: any;
        description: any;
        max_consecutive_failures: any;
        cooldown: {};
        degraded: {};
        reset: {};
        created_at: any;
        updated_at: any;
    };
    /**
     * List all failure policies
     */
    listFailurePolicies(): any;
    /**
     * Update failure policy
     */
    updateFailurePolicy(policyId: any, updates: any): {
        policy_id: any;
        policy_name: any;
        description: any;
        max_consecutive_failures: any;
        cooldown: {};
        degraded: {};
        reset: {};
        created_at: any;
        updated_at: any;
    };
    /**
     * Delete failure policy
     */
    deleteFailurePolicy(policyId: any): {
        policy_id: any;
        changes: any;
    };
    /**
     * Parse failure policy row from database
     */
    _parseFailurePolicyRow(row: any): {
        policy_id: any;
        policy_name: any;
        description: any;
        max_consecutive_failures: any;
        cooldown: {};
        degraded: {};
        reset: {};
        created_at: any;
        updated_at: any;
    };
    _recordTransition(entityType: any, entityId: any, fieldName: any, oldValue: any, newValue: any, changedBy: any): void;
    listTransitions(filters?: {}): any;
    /**
     * Create intent trace
     */
    createIntentTrace(intent_id: any, intent_type: any, source: any, submitted_at?: any): any;
    /**
     * Append event to intent trace
     */
    appendIntentTraceEvent(intent_id: any, event: any): void;
    /**
     * Get intent trace by ID
     */
    getIntentTrace(intent_id: any): {
        intent_id: any;
        intent_type: any;
        source: any;
        submitted_at: any;
        status: any;
        events: any;
        relationships: any;
        metadata: any;
        created_at: any;
        updated_at: any;
    };
    /**
     * List intent traces with filters
     */
    listIntentTraces(filters?: {}): any;
    /**
     * Update intent relationship links
     */
    updateIntentRelationship(intent_id: any, relationships: any): void;
    /**
     * Update intent status
     */
    updateIntentStatus(intent_id: any, status: any): void;
    /**
     * Create forensic incident (investigation container)
     */
    createForensicIncident({ title, summary, severity, created_by }: {
        title: any;
        summary: any;
        severity: any;
        created_by: any;
    }): any;
    /**
     * Get forensic incident by ID
     */
    getForensicIncident(incident_id: any): any;
    /**
     * List forensic incidents with filters
     */
    listForensicIncidents(filters?: {}): any;
    /**
     * Update forensic incident
     */
    updateForensicIncident(incident_id: any, updates: any): void;
    /**
     * Link investigation to incident
     */
    linkInvestigationToIncident(incident_id: any, investigation_id: any, linked_by?: any): void;
    /**
     * Link intent to incident
     */
    linkIntentToIncident(incident_id: any, intent_id: any, linked_by?: any): void;
    /**
     * Link objective to incident
     */
    linkObjectiveToIncident(incident_id: any, objective_id: any, linked_by?: any): void;
    /**
     * Link artifact to incident
     */
    linkArtifactToIncident(incident_id: any, artifact_id: any, linked_by?: any): void;
    /**
     * Unlink entity from incident
     */
    unlinkFromIncident(incident_id: any, entity_type: any, entity_id: any): void;
    /**
     * Get incident graph (all linked entities)
     */
    getIncidentGraph(incident_id: any): {
        incident: any;
        investigations: any;
        intents: any;
        objectives: any;
        artifacts: any;
    };
    /**
     * Create anomaly record
     * @param {object} anomalyData - Anomaly object (validated by anomaly-schema.js)
     * @returns {object} - Created anomaly
     */
    createAnomaly(anomalyData: object): object;
    /**
     * Get anomaly by ID
     * @param {string} anomaly_id - Anomaly identifier
     * @returns {object|null} - Anomaly object or null if not found
     */
    getAnomaly(anomaly_id: string): object | null;
    /**
     * List anomalies with optional filters
     * @param {object} filters - Query filters (anomaly_type, severity, status, entity_type, entity_id, etc.)
     * @returns {array} - Array of anomaly objects
     */
    listAnomalies(filters?: object): any[];
    /**
     * Update anomaly status
     * @param {string} anomaly_id - Anomaly identifier
     * @param {object} updates - Updates object (status, reviewed_by, reviewed_at, resolution)
     * @returns {object} - Updated anomaly
     */
    updateAnomalyStatus(anomaly_id: string, updates: object): object;
    /**
     * Record anomaly event
     * @param {string} anomaly_id - Anomaly identifier
     * @param {string} event_type - Event type (detected, reviewed, resolved, etc.)
     * @param {object} event_data - Event-specific data
     */
    recordAnomalyEvent(anomaly_id: string, event_type: string, event_data?: object): void;
    /**
     * Get anomaly history
     * @param {string} anomaly_id - Anomaly identifier
     * @returns {array} - Array of history events
     */
    getAnomalyHistory(anomaly_id: string): any[];
    /**
     * Link anomaly to incident
     * @param {string} incident_id - Incident identifier
     * @param {string} anomaly_id - Anomaly identifier
     * @param {string} linked_by - Operator who created link
     */
    linkAnomalyToIncident(incident_id: string, anomaly_id: string, linked_by: string): void;
    /**
     * Link anomaly to objective (via objective metadata)
     * @param {string} anomaly_id - Anomaly identifier
     * @param {string} objective_id - Objective identifier
     */
    linkAnomalyToObjective(anomaly_id: string, objective_id: string): void;
    /**
     * Create proposal record
     * @param {object} proposalData - Proposal object (validated by proposal-schema.js)
     * @returns {object} - Created proposal
     */
    createProposal(proposalData: object): object;
    /**
     * Get proposal by ID
     * @param {string} proposal_id - Proposal identifier
     * @returns {object|null} - Proposal object or null if not found
     */
    getProposal(proposal_id: string): object | null;
    /**
     * List proposals with optional filters
     * @param {object} filters - Query filters (proposal_type, status, objective_id, etc.)
     * @returns {array} - Array of proposal objects
     */
    listProposals(filters?: object): any[];
    /**
     * Review proposal (approve/reject/modify)
     * @param {string} proposal_id - Proposal identifier
     * @param {object} decision - Approval decision object
     * @returns {object} - Updated proposal
     */
    reviewProposal(proposal_id: string, decision: object): object;
    /**
     * Update proposal fields
     * @param {string} proposal_id - Proposal identifier
     * @param {object} updates - Fields to update
     * @returns {object} - Updated proposal
     */
    updateProposal(proposal_id: string, updates: object): object;
    /**
     * Expire proposal
     * @param {string} proposal_id - Proposal identifier
     * @returns {object} - Updated proposal
     */
    expireProposal(proposal_id: string): object;
    /**
     * Record proposal event
     * @param {string} proposal_id - Proposal identifier
     * @param {string} event_type - Event type (created, approved, rejected, etc.)
     * @param {object} event_data - Event-specific data
     */
    recordProposalEvent(proposal_id: string, event_type: string, event_data?: object): void;
    /**
     * Get proposal history
     * @param {string} proposal_id - Proposal identifier
     * @returns {array} - Array of history events
     */
    getProposalHistory(proposal_id: string): any[];
    /**
     * Link proposal to incident
     * @param {string} incident_id - Incident identifier
     * @param {string} proposal_id - Proposal identifier
     * @param {string} linked_by - Operator who created link
     */
    linkProposalToIncident(incident_id: string, proposal_id: string, linked_by: string): void;
    /**
     * Create approval request
     * @param {Object} approval - Approval request object
     * @returns {Object} Created approval
     */
    createApproval(approval: any): any;
    /**
     * Get approval by ID
     * @param {string} approval_id - Approval ID
     * @returns {Object|null} Approval object or null
     */
    getApproval(approval_id: string): any | null;
    /**
     * Get approval by execution and step
     * @param {string} execution_id - Execution ID
     * @param {string} step_id - Step ID
     * @returns {Object|null} Approval object or null
     */
    getApprovalByExecutionStep(execution_id: string, step_id: string): any | null;
    /**
     * List approvals
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of approval objects
     */
    listApprovals(filters?: any): any[];
    /**
     * Update approval
     * @param {string} approval_id - Approval ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Updated approval
     */
    updateApproval(approval_id: string, updates: any): any;
    /**
     * Count approvals by status
     * @param {string} status - Approval status
     * @returns {number} Count
     */
    countApprovalsByStatus(status: string): number;
    /**
     * List investigations (delegates to WorkspaceManager)
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of investigation objects
     */
    listInvestigations(filters?: any): any[];
    _workspaceManager: import("../workspace/workspace-manager.js").WorkspaceManager;
    /**
     * Get investigation by ID (delegates to WorkspaceManager)
     * @param {string} investigation_id - Investigation ID
     * @returns {Object|null} Investigation object or null
     */
    getInvestigation(investigation_id: string): any | null;
    /**
     * List artifacts (delegates to WorkspaceManager)
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of artifact objects
     */
    listArtifacts(filters?: any): any[];
    /**
     * Get artifact by ID (delegates to WorkspaceManager)
     * @param {string} artifact_id - Artifact ID
     * @returns {Object|null} Artifact object or null
     */
    getArtifact(artifact_id: string): any | null;
}
export function getStateGraph(options?: {}): any;
/**
 * Reset singleton for testing
 * WARNING: Only use in tests! Closes current instance and resets singleton.
 */
export function _resetStateGraphForTesting(): void;
//# sourceMappingURL=state-graph.d.ts.map