/**
 * Plan Model — Phase 16 Stage 2
 *
 * Multi-step intent container with governance integration.
 */
const { validatePlan } = require('./agent-proposal-schema.js');
/**
 * Plan Executor
 *
 * Decomposes plan into individual intents and sends through governance.
 * NOW IMPLEMENTS: Per-step governance execution with dependency ordering.
 */
class PlanExecutor {
    constructor(stateGraph, governancePipeline = null) {
        this.stateGraph = stateGraph;
        this.governancePipeline = governancePipeline;
    }
    /**
     * Decompose plan into intents
     *
     * @param {object} plan - Plan object
     * @returns {Array} - Array of intent objects
     */
    decompose(plan) {
        validatePlan(plan);
        return plan.steps.map((step, index) => ({
            intent_id: `${plan.plan_id}_intent_${index}`,
            intent_type: 'proposed',
            action: step.action,
            parameters: step.parameters || {},
            target_type: step.target_type,
            target_id: step.target_id,
            risk_tier: step.risk_tier || 'T0',
            dependencies: step.dependencies || [],
            metadata: {
                plan_id: plan.plan_id,
                step_id: step.step_id,
                step_index: index,
                total_steps: plan.steps.length
            }
        }));
    }
    /**
     * Execute plan with governance
     *
     * Implements:
     * - Dependency ordering
     * - Per-step governance evaluation
     * - Failure handling
     * - Progress tracking
     *
     * @param {object} plan - Plan object
     * @param {object} context - Execution context
     * @returns {Promise<object>} - Execution result
     */
    async execute(plan, context = {}) {
        validatePlan(plan);
        // Validate dependencies
        const depValidation = this.validateDependencies(plan);
        if (!depValidation.valid) {
            return {
                plan_id: plan.plan_id,
                status: 'failed',
                error: 'Invalid dependencies',
                validation_errors: depValidation.errors
            };
        }
        const intents = this.decompose(plan);
        const executionLog = [];
        const completedSteps = new Set();
        // Determine execution order (topological sort based on dependencies)
        const executionOrder = this.orderByDependencies(plan.steps);
        // Execute steps in order
        for (const stepId of executionOrder) {
            const intent = intents.find(i => i.metadata.step_id === stepId);
            if (!intent)
                continue;
            // Check dependencies satisfied
            const step = plan.steps.find(s => s.step_id === stepId);
            const dependenciesMet = (step.dependencies || []).every(dep => completedSteps.has(dep));
            if (!dependenciesMet) {
                executionLog.push({
                    step_id: stepId,
                    status: 'blocked',
                    reason: 'Dependencies not met',
                    timestamp: new Date().toISOString()
                });
                continue;
            }
            // Execute step through governance
            const stepResult = await this.executeStep(intent, plan, context);
            executionLog.push({
                step_id: stepId,
                intent_id: intent.intent_id,
                status: stepResult.status,
                result: stepResult,
                timestamp: new Date().toISOString()
            });
            // PHASE 16.1 HARDENED: Stop plan immediately on any non-success status
            // PHASE 17 STAGE 2: Handle pending_approval status
            if (stepResult.status === 'completed') {
                completedSteps.add(stepId);
            }
            else if (stepResult.status === 'pending_approval') {
                // Approval required - stop plan, wait for operator review
                return {
                    plan_id: plan.plan_id,
                    status: 'pending_approval',
                    pending_at_step: stepId,
                    approval_id: stepResult.approval_id,
                    approval_tier: stepResult.approval_tier,
                    completed_steps: Array.from(completedSteps),
                    execution_log: executionLog,
                    message: stepResult.message,
                    metadata: stepResult.metadata
                };
            }
            else if (stepResult.status === 'denied') {
                // Governance denied this step - stop plan immediately
                return {
                    plan_id: plan.plan_id,
                    status: 'denied',
                    denied_at_step: stepId,
                    denial_reason: stepResult.denial_reason,
                    completed_steps: Array.from(completedSteps),
                    execution_log: executionLog,
                    message: stepResult.message,
                    metadata: stepResult.metadata
                };
            }
            else if (stepResult.status === 'failed') {
                // Execution failed - stop plan immediately
                return {
                    plan_id: plan.plan_id,
                    status: 'failed',
                    failed_at_step: stepId,
                    completed_steps: Array.from(completedSteps),
                    execution_log: executionLog,
                    error: stepResult.error,
                    metadata: stepResult.metadata
                };
            }
            else {
                // Unknown status - fail safe, stop plan
                return {
                    plan_id: plan.plan_id,
                    status: 'failed',
                    failed_at_step: stepId,
                    completed_steps: Array.from(completedSteps),
                    execution_log: executionLog,
                    error: `Unexpected step status: ${stepResult.status}`
                };
            }
        }
        // All steps completed
        return {
            plan_id: plan.plan_id,
            status: 'completed',
            completed_steps: Array.from(completedSteps),
            execution_log: executionLog,
            total_steps: plan.steps.length
        };
    }
    /**
     * Execute single step through governance
     *
     * PHASE 16.1 HARDENED: No stubs, no bypasses, no silent failures.
     *
     * Every step flows through real governance pipeline:
     * intent → reconciliation → policy → warrant → execution → verification → ledger
     *
     * @param {object} intent - Intent object
     * @param {object} plan - Parent plan
     * @param {object} context - Execution context
     * @returns {Promise<object>} - Step result
     */
    async executeStep(intent, plan, context) {
        // HARD REQUIREMENT: Governance pipeline must be configured
        if (!this.governancePipeline) {
            throw new Error(`GOVERNANCE_REQUIRED: PlanExecutor requires governancePipeline. ` +
                `No stub execution allowed. Initialize with real governance pipeline.`);
        }
        const execution_id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const step = plan.steps.find(s => s.step_id === intent.metadata.step_id);
        try {
            // ============================================================
            // STEP 1: Create intent trace
            // ============================================================
            await this._recordIntentTrace(intent, plan, execution_id);
            // ============================================================
            // STEP 2: Reconciliation gate (for objectives only)
            // ============================================================
            if (intent.target_type === 'objective') {
                const admissionResult = await this._requestReconciliation(intent, execution_id);
                if (!admissionResult.admitted) {
                    return this._buildDeniedResult(intent, execution_id, 'reconciliation_denied', admissionResult.reason, { admission: admissionResult });
                }
            }
            // ============================================================
            // STEP 3: Policy evaluation
            // ============================================================
            const policyDecision = await this._evaluatePolicy(intent, plan, context, execution_id);
            if (policyDecision.decision === 'deny') {
                return this._buildDeniedResult(intent, execution_id, 'policy_denied', policyDecision.reasons.join('; '), { policy_decision: policyDecision });
            }
            // ============================================================
            // STEP 4: Approval requirement check (Phase 17 Stage 2)
            // ============================================================
            const approvalRequirement = await this._determineApprovalRequirement(policyDecision, intent, step, execution_id);
            if (approvalRequirement.required) {
                // Create pending approval request
                const approvalRequest = await this._createApprovalRequest(intent, plan, execution_id, approvalRequirement, policyDecision);
                // Return pending_approval status (not denied, not completed)
                return {
                    status: 'pending_approval',
                    intent_id: intent.intent_id,
                    execution_id,
                    approval_id: approvalRequest.approval_id,
                    approval_tier: approvalRequirement.tier,
                    reason: approvalRequirement.reason,
                    ttl: approvalRequirement.ttl,
                    message: `Approval required: ${approvalRequirement.reason}`,
                    metadata: {
                        policy_decision: policyDecision,
                        approval_requirement: approvalRequirement,
                        approval_request: approvalRequest
                    }
                };
            }
            // ============================================================
            // STEP 5: Warrant issuance
            // ============================================================
            const warrant = await this._issueWarrant(intent, policyDecision, execution_id);
            // ============================================================
            // STEP 6: Execute action
            // ============================================================
            const executionResult = await this._executeAction(intent, warrant, execution_id);
            if (!executionResult.ok) {
                return this._buildFailedResult(intent, execution_id, executionResult.error || 'Execution failed', { execution_result: executionResult, warrant });
            }
            // ============================================================
            // STEP 7: Verification (if specified)
            // ============================================================
            let verificationResult = null;
            if (step && step.verification) {
                verificationResult = await this._verifyExecution(intent, executionResult, step.verification, execution_id);
                if (!verificationResult.objective_achieved) {
                    return this._buildFailedResult(intent, execution_id, 'Verification failed', { execution_result: executionResult, verification_result: verificationResult, warrant });
                }
            }
            // ============================================================
            // STEP 8: Record success in ledger
            // ============================================================
            await this._recordSuccessLedger(intent, execution_id, executionResult, verificationResult, warrant);
            // ============================================================
            // SUCCESS: Return completed result
            // ============================================================
            return {
                status: 'completed',
                intent_id: intent.intent_id,
                execution_id,
                governance_result: {
                    policy_decision: policyDecision,
                    warrant,
                    execution_result: executionResult,
                    verification_result: verificationResult
                }
            };
        }
        catch (error) {
            // ============================================================
            // FAILURE: Record to ledger and return failed result
            // ============================================================
            await this._recordFailureLedger(intent, execution_id, error.message);
            return {
                status: 'failed',
                intent_id: intent.intent_id,
                execution_id,
                error: error.message,
                stack: error.stack
            };
        }
    }
    // ============================================================
    // GOVERNANCE PIPELINE HELPERS (Phase 16.1)
    // ============================================================
    async _recordIntentTrace(intent, plan, execution_id) {
        if (!this.stateGraph.createIntentTrace)
            return;
        await this.stateGraph.createIntentTrace(intent.intent_id, intent.intent_type, { type: 'plan', id: plan.plan_id }, new Date().toISOString());
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: 'intent.submitted',
            stage: 'intent',
            actor_type: 'plan',
            actor_id: plan.plan_id,
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                intent_type: intent.intent_type,
                action: intent.action,
                target_type: intent.target_type,
                target_id: intent.target_id
            }
        });
    }
    async _requestReconciliation(intent, execution_id) {
        const { ReconciliationGate } = require('./reconciliation-gate');
        const gate = new ReconciliationGate(this.stateGraph);
        const admission = gate.requestAdmission(intent.target_id, {
            drift_reason: 'plan_step_execution',
            triggered_by: intent.intent_id,
            intent_id: intent.intent_id
        });
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: admission.admitted ? 'reconciliation.admitted' : 'reconciliation.denied',
            stage: 'reconciliation',
            actor_type: 'system',
            actor_id: 'reconciliation-gate',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                target_id: intent.target_id,
                admitted: admission.admitted,
                reason: admission.reason,
                generation: admission.generation
            }
        });
        return admission;
    }
    async _evaluatePolicy(intent, plan, context, execution_id) {
        const PolicyEngine = require('./policy-engine');
        const policyEngine = new PolicyEngine({
            stateGraph: this.stateGraph,
            loadPolicies: async () => this.stateGraph.listPolicies({ enabled: true })
        });
        // Build plan-like object for policy evaluation
        const planForPolicy = {
            plan_id: plan.plan_id,
            objective: intent.target_id || intent.action,
            environment: context.environment || 'production',
            risk_tier: intent.risk_tier || 'T0',
            steps: [{
                    action: intent.action,
                    target_type: intent.target_type,
                    target_id: intent.target_id
                }],
            verification_spec: intent.verification_spec || null
        };
        const policyDecision = await policyEngine.evaluate(planForPolicy, {
            actor: context.actor || { type: 'plan', id: plan.plan_id },
            runtime_context: context.runtime_context || {}
        });
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: policyDecision.decision === 'allow' ? 'policy.approved' : 'policy.denied',
            stage: 'policy',
            actor_type: 'system',
            actor_id: 'policy-engine',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                decision: policyDecision.decision,
                policy_id: policyDecision.policy_id,
                reasons: policyDecision.reasons
            }
        });
        return policyDecision;
    }
    async _issueWarrant(intent, policyDecision, execution_id) {
        const { createWarrant } = require('../governance/warrant');
        const warrant = createWarrant({
            intent_id: intent.intent_id,
            action: intent.action,
            target_type: intent.target_type,
            target_id: intent.target_id,
            risk_tier: intent.risk_tier || 'T0',
            policy_decision: policyDecision,
            issued_by: 'plan-executor',
            execution_id
        });
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: 'warrant.issued',
            stage: 'warrant',
            actor_type: 'system',
            actor_id: 'plan-executor',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                warrant_id: warrant.warrant_id,
                risk_tier: warrant.risk_tier
            }
        });
        return warrant;
    }
    async _executeAction(intent, warrant, execution_id) {
        const { RemediationExecutor } = require('../execution/remediation-executor');
        const executor = new RemediationExecutor(this.stateGraph);
        // Build action descriptor
        const action = {
            type: intent.action, // e.g., 'system_service_restart'
            target: intent.target_id,
            parameters: intent.parameters || {}
        };
        const result = await executor.execute(action, {
            executionId: execution_id,
            objectiveId: intent.target_id,
            warrant
        });
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: result.ok ? 'execution.completed' : 'execution.failed',
            stage: 'execution',
            actor_type: 'system',
            actor_id: 'remediation-executor',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                action_type: action.type,
                target: action.target,
                ok: result.ok,
                error: result.error || null
            }
        });
        return result;
    }
    async _verifyExecution(intent, executionResult, verificationSpec, execution_id) {
        const { VerificationEngine } = require('./verification-engine');
        const verificationEngine = new VerificationEngine(this.stateGraph);
        const verificationTask = {
            task_id: `verify_${execution_id}`,
            template_id: verificationSpec.template_id || 'service_recovery',
            params: {
                ...verificationSpec.params,
                execution_result: executionResult,
                target: intent.target_id
            }
        };
        const result = await verificationEngine.runVerification(verificationTask, {
            execution_id,
            intent_id: intent.intent_id
        });
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: result.objective_achieved ? 'verification.succeeded' : 'verification.failed',
            stage: 'verification',
            actor_type: 'system',
            actor_id: 'verification-engine',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                objective_achieved: result.objective_achieved,
                checks_passed: result.checks_passed || 0,
                checks_total: result.checks_total || 0
            }
        });
        return result;
    }
    async _recordSuccessLedger(intent, execution_id, executionResult, verificationResult, warrant) {
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: 'plan_step.completed',
            stage: 'outcome',
            actor_type: 'system',
            actor_id: 'plan-executor',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                execution_ok: executionResult.ok,
                verification_ok: verificationResult ? verificationResult.objective_achieved : null,
                warrant_id: warrant.warrant_id
            }
        });
    }
    async _recordFailureLedger(intent, execution_id, error) {
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: 'plan_step.failed',
            stage: 'outcome',
            actor_type: 'system',
            actor_id: 'plan-executor',
            event_timestamp: new Date().toISOString(),
            payload_json: {
                intent_id: intent.intent_id,
                error
            }
        });
    }
    /**
     * Record generic ledger event
     *
     * @private
     * @param {string} execution_id - Execution ID
     * @param {string} event_type - Event type
     * @param {Object} payload - Event payload
     */
    async _recordLedgerEvent(execution_id, event_type, payload) {
        await this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type,
            stage: 'approval',
            actor_type: 'system',
            actor_id: 'plan-executor',
            event_timestamp: new Date().toISOString(),
            payload_json: payload
        });
    }
    _buildDeniedResult(intent, execution_id, reason_type, reason_message, metadata = {}) {
        return {
            status: 'denied',
            intent_id: intent.intent_id,
            execution_id,
            denial_reason: reason_type,
            message: reason_message,
            metadata
        };
    }
    _buildFailedResult(intent, execution_id, error, metadata = {}) {
        return {
            status: 'failed',
            intent_id: intent.intent_id,
            execution_id,
            error,
            metadata
        };
    }
    /**
     * Order steps by dependencies (topological sort)
     *
     * @param {Array} steps - Plan steps
     * @returns {Array<string>} - Ordered step IDs
     */
    orderByDependencies(steps) {
        const inDegree = new Map();
        const adjacencyList = new Map();
        // Initialize
        for (const step of steps) {
            inDegree.set(step.step_id, 0);
            adjacencyList.set(step.step_id, []);
        }
        // Build adjacency list and calculate in-degrees
        for (const step of steps) {
            for (const dep of (step.dependencies || [])) {
                // dep → step (dep must complete before step)
                adjacencyList.get(dep).push(step.step_id);
                inDegree.set(step.step_id, inDegree.get(step.step_id) + 1);
            }
        }
        // Topological sort (Kahn's algorithm)
        const queue = [];
        const result = [];
        // Find nodes with no incoming edges (no dependencies)
        for (const [stepId, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(stepId);
            }
        }
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            // For each step that depends on current
            for (const dependent of adjacencyList.get(current)) {
                const newDegree = inDegree.get(dependent) - 1;
                inDegree.set(dependent, newDegree);
                if (newDegree === 0) {
                    queue.push(dependent);
                }
            }
        }
        // If result doesn't include all steps, there's a cycle
        if (result.length !== steps.length) {
            throw new Error('Circular dependencies detected in plan');
        }
        return result;
    }
    /**
     * Validate plan dependencies
     *
     * @param {object} plan - Plan object
     * @returns {object} - {valid: boolean, errors: Array}
     */
    validateDependencies(plan) {
        const stepIds = new Set(plan.steps.map(s => s.step_id));
        const errors = [];
        for (const step of plan.steps) {
            if (step.dependencies) {
                for (const dep of step.dependencies) {
                    if (!stepIds.has(dep)) {
                        errors.push(`Step ${step.step_id} depends on non-existent step ${dep}`);
                    }
                }
            }
        }
        // Check for circular dependencies
        try {
            this.orderByDependencies(plan.steps);
        }
        catch (error) {
            errors.push(error.message);
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    // ============================================================
    // Phase 17 Stage 2: Policy-driven approval integration
    // ============================================================
    /**
     * Determine approval requirement from policy decision
     *
     * @private
     * @param {Object} policyDecision - Policy decision
     * @param {Object} intent - Intent object
     * @param {Object} step - Plan step
     * @param {string} execution_id - Execution ID
     * @returns {Promise<Object>} Approval requirement
     */
    async _determineApprovalRequirement(policyDecision, intent, step, execution_id) {
        const { determineApprovalRequirement } = require('./approval-requirement-normalizer');
        const stepContext = {
            risk_tier: intent.risk_tier || (step ? step.risk_tier : 'T0'),
            action: intent.action,
            target_id: intent.target_id,
            target_type: intent.target_type
        };
        const requirement = determineApprovalRequirement(policyDecision, stepContext);
        // Emit ledger event: approval_requirement_determined
        await this._recordLedgerEvent(execution_id, 'approval_requirement_determined', {
            intent_id: intent.intent_id,
            policy_decision_id: policyDecision.decision_id,
            approval_required: requirement.required,
            approval_tier: requirement.tier,
            reason: requirement.reason,
            fail_closed: requirement.fail_closed
        });
        return requirement;
    }
    /**
     * Create approval request
     *
     * @private
     * @param {Object} intent - Intent object
     * @param {Object} plan - Parent plan
     * @param {string} execution_id - Execution ID
     * @param {Object} approvalRequirement - Approval requirement
     * @param {Object} policyDecision - Policy decision
     * @returns {Promise<Object>} Approval request
     */
    async _createApprovalRequest(intent, plan, execution_id, approvalRequirement, policyDecision) {
        const ApprovalManager = require('./approval-manager');
        const approvalManager = new ApprovalManager(this.stateGraph);
        const step = plan.steps.find(s => s.step_id === intent.metadata.step_id);
        const approvalRequest = await approvalManager.createApprovalRequest({
            execution_id,
            step_id: intent.metadata.step_id,
            plan_id: plan.plan_id,
            intent_id: intent.intent_id,
            objective: plan.objective || null,
            tier: approvalRequirement.tier,
            action: intent.action,
            action_summary: this._generateActionSummary(intent, step),
            target_type: intent.target_type,
            target_id: intent.target_id,
            risk_assessment: {
                tier: approvalRequirement.tier,
                policy_decision: policyDecision.decision,
                reasons: policyDecision.reasons
            },
            requested_by: 'system',
            ttl: approvalRequirement.ttl
        });
        // Emit ledger event: approval_requested
        await this._recordLedgerEvent(execution_id, 'approval_requested', {
            approval_id: approvalRequest.approval_id,
            intent_id: intent.intent_id,
            tier: approvalRequirement.tier,
            ttl: approvalRequirement.ttl,
            action: intent.action,
            target_id: intent.target_id
        });
        return approvalRequest;
    }
    /**
     * Generate human-readable action summary
     *
     * @private
     * @param {Object} intent - Intent object
     * @param {Object} step - Plan step
     * @returns {string} Action summary
     */
    _generateActionSummary(intent, step) {
        if (step && step.description) {
            return step.description;
        }
        return `${intent.action} on ${intent.target_type}:${intent.target_id}`;
    }
}
module.exports = {
    PlanExecutor
};
//# sourceMappingURL=plan-model.js.map