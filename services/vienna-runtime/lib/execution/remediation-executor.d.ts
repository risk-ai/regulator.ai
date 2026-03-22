export class RemediationExecutor {
    constructor(stateGraph: any);
    stateGraph: any;
    handlers: {
        system_service_restart: typeof restartService;
        sleep: typeof sleep;
        health_check: typeof healthCheck;
    };
    /**
     * Execute a typed action
     *
     * @param {Object} action - ActionDescriptor
     * @param {Object} context - Execution context (objectiveId, executionId, planId)
     * @returns {Promise<Object>} ActionResult
     */
    execute(action: any, context?: any): Promise<any>;
    /**
     * Execute a plan (sequence of actions)
     *
     * @param {Object} plan - Remediation plan
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution results
     */
    executePlan(plan: any, context?: any): Promise<any>;
    /**
     * Convert plan step to ActionDescriptor (Step 7)
     *
     * @param {Object} step - Plan step
     * @returns {Object} ActionDescriptor
     */
    _planStepToActionDescriptor(step: any): any;
    /**
     * Emit structured execution event
     *
     * @param {Object} event - Event payload
     */
    _emitEvent(event: any): Promise<void>;
}
import { restartService } from "./handlers/restart-service.js";
import { sleep } from "./handlers/sleep.js";
import { healthCheck } from "./handlers/health-check.js";
//# sourceMappingURL=remediation-executor.d.ts.map