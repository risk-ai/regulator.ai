/**
 * Remediation Executor
 *
 * Phase 9.7.3: Real Execution
 *
 * Thin action bridge for remediation plan execution.
 *
 * Design principle:
 * This executor may execute an approved typed action.
 * It may not decide what should happen, whether it is allowed, or whether the system is now healthy.
 *
 * Responsibilities:
 * - Dispatch typed actions to handlers
 * - Return structured results
 * - Emit execution events
 *
 * NOT responsible for:
 * - Planning
 * - Policy evaluation
 * - Health interpretation
 * - Verification
 */
const { restartService } = require('./handlers/restart-service.js');
const { sleep } = require('./handlers/sleep.js');
const { healthCheck } = require('./handlers/health-check.js');
class RemediationExecutor {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
        // Handler map
        this.handlers = {
            'system_service_restart': restartService,
            'sleep': sleep,
            'health_check': healthCheck
        };
    }
    /**
     * Execute a typed action
     *
     * @param {Object} action - ActionDescriptor
     * @param {Object} context - Execution context (objectiveId, executionId, planId)
     * @returns {Promise<Object>} ActionResult
     */
    async execute(action, context = {}) {
        const { objectiveId, executionId, planId } = context;
        // Emit action started event (Step 8)
        if (this.stateGraph && executionId) {
            await this._emitEvent({
                type: 'execution_action_started',
                executionId,
                objectiveId,
                planId,
                action: {
                    type: action.type,
                    target: action.target
                },
                timestamp: new Date().toISOString()
            });
        }
        // Dispatch to handler
        const handler = this.handlers[action.type];
        if (!handler) {
            const result = {
                ok: false,
                actionType: action.type,
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                error: `Unsupported action type: ${action.type}`
            };
            // Emit action finished event
            if (this.stateGraph && executionId) {
                await this._emitEvent({
                    type: 'execution_action_finished',
                    executionId,
                    objectiveId,
                    planId,
                    action: { type: action.type, target: action.target },
                    ok: false,
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
            }
            return result;
        }
        // Execute handler
        const result = await handler(action);
        // Emit action finished event (Step 8)
        if (this.stateGraph && executionId) {
            await this._emitEvent({
                type: 'execution_action_finished',
                executionId,
                objectiveId,
                planId,
                action: {
                    type: action.type,
                    target: action.target
                },
                ok: result.ok,
                result: {
                    exitCode: result.exitCode,
                    details: result.details
                },
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }
        return result;
    }
    /**
     * Execute a plan (sequence of actions)
     *
     * @param {Object} plan - Remediation plan
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution results
     */
    async executePlan(plan, context = {}) {
        const results = [];
        for (const step of plan.steps) {
            const action = this._planStepToActionDescriptor(step);
            const result = await this.execute(action, context);
            results.push({
                step,
                action,
                result
            });
            // Stop on first failure (can be made configurable later)
            if (!result.ok) {
                break;
            }
        }
        return {
            planId: plan.plan_id,
            completed: results.every(r => r.result.ok),
            steps: results
        };
    }
    /**
     * Convert plan step to ActionDescriptor (Step 7)
     *
     * @param {Object} step - Plan step
     * @returns {Object} ActionDescriptor
     */
    _planStepToActionDescriptor(step) {
        // Phase 9.7.3: Support nested action structure
        if (step.action && typeof step.action === 'object') {
            // New format: { step_id, action: { type, target, ... }, description }
            return step.action;
        }
        // Legacy format: { action_type, target, ... }
        return {
            type: step.action_type,
            target: step.target,
            timeoutMs: step.timeoutMs,
            durationMs: step.durationMs
        };
    }
    /**
     * Emit structured execution event
     *
     * @param {Object} event - Event payload
     */
    async _emitEvent(event) {
        // For now, just log
        // Later: integrate with ledger
        console.log('[RemediationExecutor Event]', JSON.stringify(event, null, 2));
    }
}
module.exports = { RemediationExecutor };
//# sourceMappingURL=remediation-executor.js.map