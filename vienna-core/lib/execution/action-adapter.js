/**
 * Action Adapter
 * 
 * Wraps ActionExecutor to conform to Vienna adapter interface.
 * Phase 2C: Handles structured action execution.
 */

const { ActionExecutor } = require('./action-executor');
const path = require('path');

class ActionAdapter {
  constructor() {
    const workspace = process.env.OPENCLAW_WORKSPACE || 
                     path.join(process.env.HOME || '~', '.openclaw', 'workspace');
    this.actionExecutor = new ActionExecutor(workspace);
  }
  
  /**
   * Execute action (adapter interface)
   */
  async execute(action, warrant, envelope) {
    // Convert action to envelope format for ActionExecutor
    const executionEnvelope = {
      envelope_id: envelope?.envelope_id,
      objective_id: envelope?.objective_id,
      action_type: action.type,
      target: action.target,
      params: action.params || {},
      input: envelope?.input || envelope?.previousOutput,
    };
    
    const result = await this.actionExecutor.execute(executionEnvelope);
    
    return {
      success: result.success,
      output: result.output,
      metadata: result.metadata,
    };
  }
}

module.exports = { ActionAdapter };
