/**
 * Workflow Engine
 *
 * Phase 6.11: Multi-step diagnostic and repair workflows
 *
 * Design:
 * - AI proposes structured workflows
 * - Operator approves workflow (not individual steps)
 * - Steps execute sequentially through executor
 * - Each step emits audit events
 * - Workflow state tracked in memory
 *
 * Workflow Schema:
 * {
 *   workflow_id,
 *   workflow_name,
 *   steps: [{
 *     step_id,
 *     description,
 *     command_template,
 *     arguments,
 *     risk_tier,
 *     status: 'pending'|'proposed'|'approved'|'executing'|'complete'|'failed'|'skipped'
 *   }],
 *   status: 'proposed'|'approved'|'executing'|'complete'|'failed'|'cancelled',
 *   created_at,
 *   started_at,
 *   completed_at
 * }
 */
export class WorkflowEngine {
    constructor(options?: {});
    shellExecutor: any;
    auditLog: any;
    workflows: Map<any, any>;
    builtInWorkflows: Map<any, any>;
    /**
     * Initialize built-in diagnostic workflows
     */
    initializeBuiltInWorkflows(): Map<any, any>;
    /**
     * Get available built-in workflows
     */
    getAvailableWorkflows(): {
        workflow_id: any;
        name: any;
        description: any;
        step_count: any;
        max_risk_tier: string;
    }[];
    /**
     * Calculate maximum risk tier across workflow steps
     */
    calculateMaxRiskTier(steps: any): "T0" | "T1" | "T2";
    /**
     * Create workflow instance from template
     *
     * @param {string} templateId - Built-in workflow template ID
     * @param {object} context - Execution context
     * @returns {object} Workflow instance
     */
    createWorkflow(templateId: string, context?: object): object;
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId: any): any;
    /**
     * Get all workflows
     */
    getAllWorkflows(): any[];
    /**
     * Approve workflow for execution
     */
    approveWorkflow(workflowId: any, operator: any): any;
    /**
     * Execute workflow sequentially
     *
     * @param {string} workflowId - Workflow ID
     * @returns {Promise<object>} Execution result
     */
    executeWorkflow(workflowId: string): Promise<object>;
    /**
     * Cancel workflow
     */
    cancelWorkflow(workflowId: any, operator: any): any;
}
//# sourceMappingURL=workflow-engine.d.ts.map