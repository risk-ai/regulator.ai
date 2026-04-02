/**
 * Debugging Context Generator — Phase 17.2
 *
 * Generates human-readable explanations for:
 * - Why was this blocked?
 * - Why was this denied?
 * - Why was this retried?
 * - What governance rule applied?
 * - What was the decision reasoning?
 *
 * Core principle: Make every system decision transparent and understandable.
 */
const { FailureClass } = require('./verification-templates-extended');
/**
 * Explanation types
 */
const ExplanationType = {
    BLOCKED: 'blocked',
    DENIED: 'denied',
    RETRIED: 'retried',
    APPROVED: 'approved',
    SKIPPED: 'skipped',
    POLICY_APPLIED: 'policy_applied',
    VERIFICATION_FAILED: 'verification_failed'
};
/**
 * Generate "why blocked?" explanation
 *
 * @param {object} blockEvent - Block event from ledger
 * @returns {object} Explanation object
 */
function explainBlocked(blockEvent) {
    const reasons = [];
    const remediation = [];
    // Lock conflict
    if (blockEvent.reason === 'lock_conflict') {
        reasons.push({
            category: 'concurrency',
            description: `Another execution (${blockEvent.conflicting_execution_id}) holds a lock on the target`,
            technical: `Lock conflict on target: ${blockEvent.target_id}, conflicting execution: ${blockEvent.conflicting_execution_id}`,
            operator_action: 'Wait for concurrent execution to complete, or cancel it if stuck'
        });
        remediation.push('Check execution status: GET /api/v1/executions/' + blockEvent.conflicting_execution_id);
        remediation.push('If stuck, consider killing the blocking execution');
    }
    // Approval pending
    if (blockEvent.reason === 'approval_pending') {
        reasons.push({
            category: 'governance',
            description: 'This action requires operator approval before execution',
            technical: `Risk tier ${blockEvent.risk_tier} requires approval`,
            operator_action: 'Review and approve/deny the pending approval'
        });
        if (blockEvent.approval_id) {
            remediation.push('Review approval: GET /api/v1/approvals/' + blockEvent.approval_id);
            remediation.push('Approve: POST /api/v1/approvals/' + blockEvent.approval_id + '/approve');
        }
    }
    // Policy denial
    if (blockEvent.reason === 'policy_denied') {
        const policyName = blockEvent.policy_name || 'unknown';
        const constraintType = blockEvent.constraint_type || 'unknown';
        reasons.push({
            category: 'policy',
            description: `Policy "${policyName}" blocked this action`,
            technical: `Constraint type: ${constraintType}`,
            operator_action: 'Review policy constraints or request policy override'
        });
        if (blockEvent.policy_details) {
            reasons.push({
                category: 'policy_detail',
                description: blockEvent.policy_details,
                technical: JSON.stringify(blockEvent.constraint_evaluation),
                operator_action: null
            });
        }
        remediation.push('Review policy: GET /api/v1/policies/' + (blockEvent.policy_id || policyName));
        remediation.push('If legitimate, consider policy adjustment or temporary override');
    }
    // Rate limit
    if (blockEvent.reason === 'rate_limit') {
        const windowMs = blockEvent.rate_limit_window_ms || 60000;
        const maxActions = blockEvent.rate_limit_max || '?';
        reasons.push({
            category: 'rate_limit',
            description: `Rate limit exceeded: ${maxActions} actions per ${windowMs / 1000}s`,
            technical: `Rate limit: ${blockEvent.rate_limit_current}/${maxActions} in ${windowMs}ms window`,
            operator_action: 'Wait for rate limit window to expire, or adjust rate limit policy'
        });
        const waitMs = blockEvent.rate_limit_reset_at ?
            new Date(blockEvent.rate_limit_reset_at) - Date.now() :
            windowMs;
        remediation.push(`Wait ${Math.ceil(waitMs / 1000)}s for rate limit reset`);
    }
    // Safe mode
    if (blockEvent.reason === 'safe_mode') {
        reasons.push({
            category: 'safe_mode',
            description: 'System is in safe mode - all autonomous actions are blocked',
            technical: 'Safe mode active, reason: ' + (blockEvent.safe_mode_reason || 'unknown'),
            operator_action: 'Release safe mode if emergency is resolved'
        });
        remediation.push('Check safe mode status: GET /api/v1/safe-mode');
        remediation.push('Release if safe: DELETE /api/v1/safe-mode');
    }
    // Dependency unavailable
    if (blockEvent.reason === 'dependency_unavailable') {
        const dependency = blockEvent.dependency_id || 'unknown';
        reasons.push({
            category: 'dependency',
            description: `Required dependency "${dependency}" is unavailable`,
            technical: `Dependency "${dependency}" status: ${blockEvent.dependency_status || 'unknown'}`,
            operator_action: 'Restore dependency before retrying this action'
        });
        remediation.push('Check dependency status: GET /api/v1/services/' + dependency);
    }
    return {
        type: ExplanationType.BLOCKED,
        summary: reasons[0]?.description || 'Action was blocked',
        reasons,
        remediation_steps: remediation,
        timestamp: blockEvent.timestamp || new Date().toISOString(),
        event_id: blockEvent.event_id
    };
}
/**
 * Generate "why denied?" explanation
 *
 * @param {object} denyEvent - Denial event from ledger
 * @returns {object} Explanation object
 */
function explainDenied(denyEvent) {
    const reasons = [];
    // Operator denial
    if (denyEvent.denied_by) {
        reasons.push({
            category: 'operator_decision',
            description: `Denied by ${denyEvent.denied_by}`,
            technical: `Denial reason: ${denyEvent.denial_reason || 'not provided'}`,
            operator_action: null
        });
    }
    // Policy denial
    if (denyEvent.policy_id) {
        reasons.push({
            category: 'policy',
            description: `Policy "${denyEvent.policy_name || denyEvent.policy_id}" denied this action`,
            technical: `Constraint evaluation: ${JSON.stringify(denyEvent.constraint_evaluation || {})}`,
            operator_action: 'Review policy if denial seems incorrect'
        });
    }
    // Risk assessment
    if (denyEvent.risk_assessment) {
        reasons.push({
            category: 'risk',
            description: denyEvent.risk_assessment.summary || 'Risk threshold exceeded',
            technical: `Risk score: ${denyEvent.risk_assessment.score}, threshold: ${denyEvent.risk_assessment.threshold}`,
            operator_action: 'Consider lower-risk alternative or manual execution'
        });
    }
    // Precondition failure
    if (denyEvent.precondition_failures) {
        denyEvent.precondition_failures.forEach(failure => {
            reasons.push({
                category: 'precondition',
                description: `Precondition failed: ${failure.description}`,
                technical: `Check "${failure.check_id}" failed: ${failure.reason}`,
                operator_action: 'Fix precondition before retrying'
            });
        });
    }
    return {
        type: ExplanationType.DENIED,
        summary: reasons[0]?.description || 'Action was denied',
        reasons,
        timestamp: denyEvent.timestamp || new Date().toISOString(),
        event_id: denyEvent.event_id,
        can_retry: denyEvent.can_retry !== false
    };
}
/**
 * Generate "why retried?" explanation
 *
 * @param {object} retryHistory - Retry history from verification result
 * @returns {object} Explanation object
 */
function explainRetried(retryHistory) {
    const attempts = retryHistory.filter(e => e.attempt);
    const retries = retryHistory.filter(e => e.action === 'retry_scheduled');
    const reasons = attempts.map((attempt, index) => {
        const failureClass = attempt.failure_class;
        const backoff = retries[index]?.backoff_ms;
        const classDescriptions = {
            [FailureClass.TRANSIENT]: 'Temporary failure that may resolve with retry',
            [FailureClass.PERMANENT]: 'Permanent failure that will not resolve',
            [FailureClass.CONFIGURATION]: 'Configuration error requiring manual fix',
            [FailureClass.DEPENDENCY]: 'External dependency unavailable'
        };
        return {
            attempt_number: attempt.attempt,
            category: failureClass,
            description: classDescriptions[failureClass] || 'Unknown failure type',
            technical: `Checks failed: ${(attempt.checks_failed || []).join(', ')}`,
            operator_action: failureClass === FailureClass.TRANSIENT ?
                'Automatic retry scheduled' :
                'Manual intervention required',
            backoff_ms: backoff,
            timestamp: attempt.timestamp
        };
    });
    return {
        type: ExplanationType.RETRIED,
        summary: `Retried ${attempts.length} time(s) due to transient failures`,
        reasons,
        total_attempts: attempts.length,
        total_backoff_ms: retries.reduce((sum, r) => sum + (r.backoff_ms || 0), 0),
        timestamp: retryHistory[retryHistory.length - 1]?.timestamp || new Date().toISOString()
    };
}
/**
 * Generate policy explanation
 *
 * @param {object} policyDecision - Policy decision from ledger
 * @returns {object} Explanation object
 */
function explainPolicyDecision(policyDecision) {
    const { policy_name, decision, constraints_evaluated = [] } = policyDecision;
    const constraintResults = constraints_evaluated.map(c => ({
        constraint_type: c.constraint_type,
        result: c.result,
        description: c.description || `${c.constraint_type} check`,
        technical: JSON.stringify(c.parameters || {}),
        operator_action: c.result === false ?
            'Review constraint configuration if incorrect' :
            null
    }));
    return {
        type: ExplanationType.POLICY_APPLIED,
        summary: `Policy "${policy_name}" ${decision === 'allow' ? 'allowed' : 'denied'} this action`,
        policy_name,
        decision,
        constraints: constraintResults,
        timestamp: policyDecision.timestamp || new Date().toISOString()
    };
}
/**
 * Generate verification failure explanation
 *
 * @param {object} verificationResult - Verification result
 * @returns {object} Explanation object
 */
function explainVerificationFailure(verificationResult) {
    // Extract checks_failed from both metadata and root level
    const metadata = verificationResult.verification_metadata || {};
    const checksFailedArray = metadata.checks_failed || verificationResult.checks_failed || [];
    const failureClass = metadata.failure_class;
    const finalFailureReason = metadata.final_failure_reason;
    const checkDescriptions = checksFailedArray.map(checkId => {
        const checkResult = verificationResult.check_results?.[checkId] || {};
        return {
            check_id: checkId,
            description: checkResult.description || checkId,
            error: checkResult.error || 'Unknown error',
            failure_class: classifyCheckFailure(checkId, checkResult)
        };
    });
    return {
        type: ExplanationType.VERIFICATION_FAILED,
        summary: finalFailureReason || 'Verification failed',
        checks_failed: checkDescriptions,
        failure_class: failureClass,
        can_retry: failureClass === FailureClass.TRANSIENT,
        operator_action: failureClass === FailureClass.TRANSIENT ?
            'Automatic retry will be attempted' :
            'Manual intervention required',
        timestamp: new Date().toISOString()
    };
}
/**
 * Classify individual check failure
 */
function classifyCheckFailure(checkId, checkResult) {
    // HTTP checks
    if (checkResult.status_code === 503)
        return FailureClass.TRANSIENT;
    if (checkResult.status_code === 500)
        return FailureClass.PERMANENT;
    if (checkResult.status_code === 404)
        return FailureClass.CONFIGURATION;
    if (checkResult.status_code === 502)
        return FailureClass.DEPENDENCY;
    // Timeout
    if (checkResult.error?.includes('timeout'))
        return FailureClass.TRANSIENT;
    // Port/connection
    if (checkResult.error?.includes('port_closed'))
        return FailureClass.TRANSIENT;
    if (checkResult.error?.includes('connection_refused'))
        return FailureClass.TRANSIENT;
    // Default to permanent
    return FailureClass.PERMANENT;
}
/**
 * Generate comprehensive execution trace explanation
 *
 * Combines all available context into single operator-facing explanation.
 *
 * @param {object} execution - Execution object from ledger
 * @returns {object} Comprehensive explanation
 */
function explainExecution(execution) {
    const explanations = [];
    // Blocked events
    if (execution.blocked_events) {
        execution.blocked_events.forEach(event => {
            explanations.push(explainBlocked(event));
        });
    }
    // Denied events
    if (execution.denied_events) {
        execution.denied_events.forEach(event => {
            explanations.push(explainDenied(event));
        });
    }
    // Policy decisions
    if (execution.policy_decisions) {
        execution.policy_decisions.forEach(decision => {
            explanations.push(explainPolicyDecision(decision));
        });
    }
    // Verification failures
    if (execution.verification_result && !execution.verification_result.objective_achieved) {
        explanations.push(explainVerificationFailure(execution.verification_result));
    }
    // Retry history
    if (execution.verification_result?.verification_metadata?.retry_history) {
        const retryHistory = execution.verification_result.verification_metadata.retry_history;
        if (retryHistory.length > 0) {
            explanations.push(explainRetried(retryHistory));
        }
    }
    return {
        execution_id: execution.execution_id,
        status: execution.status,
        explanations,
        timeline: buildExecutionTimeline(execution),
        operator_summary: generateOperatorSummary(explanations)
    };
}
/**
 * Build chronological execution timeline
 */
function buildExecutionTimeline(execution) {
    const events = [];
    // Collect all timestamped events
    if (execution.intent_received_at) {
        events.push({
            timestamp: execution.intent_received_at,
            stage: 'intent',
            description: 'Intent received',
            type: 'info'
        });
    }
    if (execution.plan_created_at) {
        events.push({
            timestamp: execution.plan_created_at,
            stage: 'plan',
            description: 'Plan created',
            type: 'info'
        });
    }
    if (execution.policy_evaluated_at) {
        events.push({
            timestamp: execution.policy_evaluated_at,
            stage: 'policy',
            description: execution.policy_decision === 'allow' ? 'Policy allowed' : 'Policy denied',
            type: execution.policy_decision === 'allow' ? 'success' : 'error'
        });
    }
    if (execution.approval_requested_at) {
        events.push({
            timestamp: execution.approval_requested_at,
            stage: 'approval',
            description: 'Approval requested',
            type: 'warning'
        });
    }
    if (execution.approval_granted_at) {
        events.push({
            timestamp: execution.approval_granted_at,
            stage: 'approval',
            description: 'Approval granted',
            type: 'success'
        });
    }
    if (execution.execution_started_at) {
        events.push({
            timestamp: execution.execution_started_at,
            stage: 'execution',
            description: 'Execution started',
            type: 'info'
        });
    }
    if (execution.execution_completed_at) {
        events.push({
            timestamp: execution.execution_completed_at,
            stage: 'execution',
            description: 'Execution completed',
            type: 'success'
        });
    }
    if (execution.verification_completed_at) {
        events.push({
            timestamp: execution.verification_completed_at,
            stage: 'verification',
            description: execution.objective_achieved ? 'Verification passed' : 'Verification failed',
            type: execution.objective_achieved ? 'success' : 'error'
        });
    }
    // Sort by timestamp
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
/**
 * Generate high-level operator summary
 */
function generateOperatorSummary(explanations) {
    if (explanations.length === 0) {
        return 'Execution completed without issues';
    }
    const types = explanations.map(e => e.type);
    if (types.includes(ExplanationType.DENIED)) {
        const denial = explanations.find(e => e.type === ExplanationType.DENIED);
        return `Denied: ${denial.summary}`;
    }
    if (types.includes(ExplanationType.BLOCKED)) {
        const block = explanations.find(e => e.type === ExplanationType.BLOCKED);
        return `Blocked: ${block.summary}`;
    }
    if (types.includes(ExplanationType.VERIFICATION_FAILED)) {
        const failure = explanations.find(e => e.type === ExplanationType.VERIFICATION_FAILED);
        return `Verification failed: ${failure.summary}`;
    }
    if (types.includes(ExplanationType.RETRIED)) {
        const retry = explanations.find(e => e.type === ExplanationType.RETRIED);
        return `Retried ${retry.total_attempts} times, eventual ${retry.reasons[retry.reasons.length - 1]?.category}`;
    }
    return `${explanations.length} governance event(s)`;
}
module.exports = {
    ExplanationType,
    explainBlocked,
    explainDenied,
    explainRetried,
    explainPolicyDecision,
    explainVerificationFailure,
    explainExecution,
    buildExecutionTimeline,
    generateOperatorSummary
};
//# sourceMappingURL=debugging-context-generator.js.map