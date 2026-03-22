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

class WorkflowEngine {
  constructor(options = {}) {
    this.shellExecutor = options.shellExecutor; // Shell executor for command execution
    this.auditLog = options.auditLog; // Audit log for event emission
    this.workflows = new Map(); // workflow_id -> workflow state
    this.builtInWorkflows = this.initializeBuiltInWorkflows();
    
    console.log('[WorkflowEngine] Initialized with', this.builtInWorkflows.size, 'built-in workflows');
  }
  
  /**
   * Initialize built-in diagnostic workflows
   */
  initializeBuiltInWorkflows() {
    const workflows = new Map();
    
    // OpenClaw Diagnose Workflow
    workflows.set('openclaw_diagnose', {
      name: 'OpenClaw Service Diagnostics',
      description: 'Check OpenClaw Gateway health',
      steps: [
        {
          command: 'check_port',
          args: [18789],
          description: 'Check if port 18789 is listening',
          risk_tier: 'T0',
        },
        {
          command: 'check_process',
          args: ['openclaw'],
          description: 'Check if openclaw process is running',
          risk_tier: 'T0',
        },
        {
          command: 'show_service_status',
          args: ['openclaw-gateway'],
          description: 'Get systemd service status',
          risk_tier: 'T0',
        },
      ],
    });
    
    // OpenClaw Recovery Workflow
    workflows.set('openclaw_recovery', {
      name: 'OpenClaw Service Recovery',
      description: 'Restart OpenClaw Gateway',
      steps: [
        {
          command: 'check_port',
          args: [18789],
          description: 'Pre-check: port 18789 status',
          risk_tier: 'T0',
        },
        {
          command: 'restart_service',
          args: ['openclaw-gateway'],
          description: 'Restart openclaw-gateway service',
          risk_tier: 'T1',
          requires_warrant: true,
        },
        {
          command: 'check_port',
          args: [18789],
          description: 'Post-check: verify port 18789 is listening',
          risk_tier: 'T0',
        },
      ],
    });
    
    // Provider Health Check Workflow
    workflows.set('provider_health_check', {
      name: 'Provider Health Check',
      description: 'Test all LLM providers',
      steps: [
        {
          command: 'exec_command',
          args: ['echo "Provider: Anthropic"'],
          description: 'Check Anthropic provider',
          risk_tier: 'T0',
        },
        {
          command: 'exec_command',
          args: ['echo "Provider: Ollama"'],
          description: 'Check Ollama provider',
          risk_tier: 'T0',
        },
      ],
    });
    
    return workflows;
  }
  
  /**
   * Get available built-in workflows
   */
  getAvailableWorkflows() {
    const workflows = [];
    for (const [id, template] of this.builtInWorkflows.entries()) {
      workflows.push({
        workflow_id: id,
        name: template.name,
        description: template.description,
        step_count: template.steps.length,
        max_risk_tier: this.calculateMaxRiskTier(template.steps),
      });
    }
    return workflows;
  }
  
  /**
   * Calculate maximum risk tier across workflow steps
   */
  calculateMaxRiskTier(steps) {
    const tiers = steps.map(s => s.risk_tier || 'T0');
    if (tiers.includes('T2')) return 'T2';
    if (tiers.includes('T1')) return 'T1';
    return 'T0';
  }
  
  /**
   * Create workflow instance from template
   * 
   * @param {string} templateId - Built-in workflow template ID
   * @param {object} context - Execution context
   * @returns {object} Workflow instance
   */
  createWorkflow(templateId, context = {}) {
    const template = this.builtInWorkflows.get(templateId);
    if (!template) {
      throw new Error(`Unknown workflow template: ${templateId}`);
    }
    
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create workflow instance
    const workflow = {
      workflow_id: workflowId,
      workflow_name: template.name,
      description: template.description,
      steps: template.steps.map((step, index) => ({
        step_id: `${workflowId}_step_${index}`,
        step_index: index,
        description: step.description,
        command: step.command,
        arguments: step.args || [],
        risk_tier: step.risk_tier || 'T0',
        requires_warrant: step.requires_warrant || false,
        status: 'pending',
        result: null,
        error: null,
        started_at: null,
        completed_at: null,
      })),
      status: 'proposed',
      operator: context.operator || 'unknown',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      context,
    };
    
    // Store workflow
    this.workflows.set(workflowId, workflow);
    
    // Emit audit event
    if (this.auditLog) {
      this.auditLog.append({
        action: 'workflow_proposed',
        result: 'proposed',
        operator: workflow.operator,
        metadata: {
          workflow_id: workflowId,
          workflow_name: template.name,
          step_count: workflow.steps.length,
          max_risk_tier: this.calculateMaxRiskTier(template.steps),
        },
      });
    }
    
    return workflow;
  }
  
  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId) || null;
  }
  
  /**
   * Get all workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }
  
  /**
   * Approve workflow for execution
   */
  approveWorkflow(workflowId, operator) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (workflow.status !== 'proposed') {
      throw new Error(`Workflow cannot be approved in status: ${workflow.status}`);
    }
    
    workflow.status = 'approved';
    workflow.approved_by = operator;
    workflow.approved_at = new Date().toISOString();
    
    // Emit audit event
    if (this.auditLog) {
      this.auditLog.append({
        action: 'workflow_approved',
        result: 'approved',
        operator,
        metadata: {
          workflow_id: workflowId,
          workflow_name: workflow.workflow_name,
        },
      });
    }
    
    return workflow;
  }
  
  /**
   * Execute workflow sequentially
   * 
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<object>} Execution result
   */
  async executeWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (workflow.status !== 'approved') {
      throw new Error(`Workflow must be approved before execution. Current status: ${workflow.status}`);
    }
    
    workflow.status = 'executing';
    workflow.started_at = new Date().toISOString();
    
    // Emit audit event
    if (this.auditLog) {
      this.auditLog.append({
        action: 'workflow_started',
        result: 'executing',
        operator: workflow.operator,
        metadata: {
          workflow_id: workflowId,
          workflow_name: workflow.workflow_name,
        },
      });
    }
    
    console.log(`[WorkflowEngine] Executing workflow: ${workflow.workflow_name}`);
    
    // Execute steps sequentially
    for (const step of workflow.steps) {
      try {
        step.status = 'executing';
        step.started_at = new Date().toISOString();
        
        console.log(`[WorkflowEngine] Executing step ${step.step_index}: ${step.description}`);
        
        // Execute command through shell executor
        const result = await this.shellExecutor.execute(
          step.command,
          step.arguments,
          {
            operator: workflow.operator,
            workflow_id: workflowId,
            step_id: step.step_id,
          }
        );
        
        step.status = result.success ? 'complete' : 'failed';
        step.result = result;
        step.completed_at = new Date().toISOString();
        
        // Emit audit event for step
        if (this.auditLog) {
          this.auditLog.append({
            action: 'workflow_step_completed',
            result: step.status,
            operator: workflow.operator,
            metadata: {
              workflow_id: workflowId,
              step_id: step.step_id,
              step_index: step.step_index,
              command: step.command,
              success: result.success,
            },
          });
        }
        
        // Stop on failure
        if (!result.success) {
          step.error = result.error || 'Step failed';
          console.error(`[WorkflowEngine] Step ${step.step_index} failed:`, step.error);
          break;
        }
        
      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        step.completed_at = new Date().toISOString();
        
        console.error(`[WorkflowEngine] Step ${step.step_index} error:`, error);
        
        // Emit audit event for step failure
        if (this.auditLog) {
          this.auditLog.append({
            action: 'workflow_step_failed',
            result: 'failed',
            operator: workflow.operator,
            metadata: {
              workflow_id: workflowId,
              step_id: step.step_id,
              step_index: step.step_index,
              error: error.message,
            },
          });
        }
        
        break; // Stop workflow on error
      }
    }
    
    // Determine workflow final status
    const allComplete = workflow.steps.every(s => s.status === 'complete');
    const anyFailed = workflow.steps.some(s => s.status === 'failed');
    
    workflow.status = allComplete ? 'complete' : anyFailed ? 'failed' : 'cancelled';
    workflow.completed_at = new Date().toISOString();
    
    // Emit final audit event
    if (this.auditLog) {
      this.auditLog.append({
        action: 'workflow_completed',
        result: workflow.status,
        operator: workflow.operator,
        metadata: {
          workflow_id: workflowId,
          workflow_name: workflow.workflow_name,
          steps_completed: workflow.steps.filter(s => s.status === 'complete').length,
          steps_total: workflow.steps.length,
        },
      });
    }
    
    console.log(`[WorkflowEngine] Workflow ${workflow.status}: ${workflow.workflow_name}`);
    
    return workflow;
  }
  
  /**
   * Cancel workflow
   */
  cancelWorkflow(workflowId, operator) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    if (workflow.status === 'complete' || workflow.status === 'failed') {
      throw new Error(`Cannot cancel workflow in status: ${workflow.status}`);
    }
    
    workflow.status = 'cancelled';
    workflow.completed_at = new Date().toISOString();
    
    // Mark pending steps as skipped
    for (const step of workflow.steps) {
      if (step.status === 'pending') {
        step.status = 'skipped';
      }
    }
    
    // Emit audit event
    if (this.auditLog) {
      this.auditLog.append({
        action: 'workflow_cancelled',
        result: 'cancelled',
        operator,
        metadata: {
          workflow_id: workflowId,
          workflow_name: workflow.workflow_name,
        },
      });
    }
    
    return workflow;
  }
}

module.exports = { WorkflowEngine };
