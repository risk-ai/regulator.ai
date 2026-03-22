/**
 * Vienna Deterministic Executor
 * 
 * Executes envelopes with warrant authorization.
 * All system mutations route through this executor.
 */

const crypto = require('crypto');

class Executor {
  constructor(viennaCore) {
    this.viennaCore = viennaCore;
    this.adapters = new Map();
  }
  
  /**
   * Register adapter for action type
   */
  registerAdapter(actionType, adapter) {
    this.adapters.set(actionType, adapter);
  }
  
  /**
   * Execute envelope with warrant authorization
   * 
   * @param {object} envelope - Validated envelope
   * @returns {Promise<object>} Execution result
   */
  async execute(envelope) {
    const executionId = this._generateExecutionId();
    
    try {
      // Phase 1: Validate envelope structure
      this._validateEnvelope(envelope);
      
      // Phase 2: Verify warrant
      const warrant = await this._verifyWarrant(envelope.warrant_id);
      
      // Phase 3: Preflight checks
      await this._runPreflightChecks(envelope, warrant);
      
      // Phase 4: Execute actions via adapters
      const results = [];
      for (const action of envelope.actions) {
        const actionResult = await this._executeAction(action, warrant, envelope);
        results.push(actionResult);
        
        // Fail-fast on error (unless fail_fast: false)
        if (!actionResult.success && envelope.fail_fast !== false) {
          await this._emitAudit({
            event_type: 'execution_failed',
            execution_id: executionId,
            envelope_id: envelope.envelope_id,
            warrant_id: envelope.warrant_id,
            failed_action: action,
            error: actionResult.error
          });
          
          throw new ExecutionError(
            'ACTION_FAILED',
            `Action ${action.type} failed: ${actionResult.error}`
          );
        }
      }
      
      // Phase 5: Emit success audit
      await this._emitAudit({
        event_type: 'execution_success',
        execution_id: executionId,
        envelope_id: envelope.envelope_id,
        warrant_id: envelope.warrant_id,
        actions_executed: results.length,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        execution_id: executionId,
        envelope_id: envelope.envelope_id,
        results
      };
      
    } catch (error) {
      // Emit failure audit
      await this._emitAudit({
        event_type: 'execution_error',
        execution_id: executionId,
        envelope_id: envelope.envelope_id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Validate envelope structure
   */
  _validateEnvelope(envelope) {
    const required = ['envelope_id', 'warrant_id', 'actions'];
    const missing = required.filter(f => !envelope[f]);
    
    if (missing.length > 0) {
      throw new ExecutionError(
        'INVALID_ENVELOPE',
        `Missing required fields: ${missing.join(', ')}`
      );
    }
    
    if (!Array.isArray(envelope.actions) || envelope.actions.length === 0) {
      throw new ExecutionError(
        'INVALID_ENVELOPE',
        'Envelope must have at least one action'
      );
    }
    
    // Validate each action
    for (const action of envelope.actions) {
      if (!action.type || !action.target) {
        throw new ExecutionError(
          'INVALID_ACTION',
          'Each action must have type and target'
        );
      }
    }
  }
  
  /**
   * Verify warrant is valid
   */
  async _verifyWarrant(warrantId) {
    const verification = await this.viennaCore.warrant.verify(warrantId);
    
    if (!verification.valid) {
      throw new ExecutionError(
        'WARRANT_INVALID',
        `Warrant verification failed: ${verification.reason}`
      );
    }
    
    return verification.warrant;
  }
  
  /**
   * Run preflight checks
   */
  async _runPreflightChecks(envelope, warrant) {
    // Check 1: Trading guard (CRITICAL)
    const tradingCriticalActions = envelope.actions.filter(a =>
      this._isTradingCritical(a)
    );
    
    if (tradingCriticalActions.length > 0) {
      const guardResult = await this.viennaCore.tradingGuard.check(
        tradingCriticalActions
      );
      
      if (!guardResult.safe) {
        throw new ExecutionError(
          'TRADING_GUARD_BLOCKED',
          guardResult.message || guardResult.reason
        );
      }
    }
    
    // Check 2: Scope verification
    for (const action of envelope.actions) {
      const actionStr = `${action.type}:${action.target}`;
      
      if (!warrant.allowed_actions.includes(actionStr)) {
        throw new ExecutionError(
          'ACTION_NOT_IN_SCOPE',
          `Action ${actionStr} not allowed by warrant`
        );
      }
    }
    
    // Check 3: Warrant not expired (redundant but defensive)
    const now = new Date();
    const expires = new Date(warrant.expires_at);
    
    if (now > expires) {
      throw new ExecutionError(
        'WARRANT_EXPIRED',
        `Warrant expired at ${warrant.expires_at}`
      );
    }
  }
  
  /**
   * Execute single action via adapter
   */
  async _executeAction(action, warrant, envelope) {
    const adapter = this.adapters.get(action.type);
    
    if (!adapter) {
      return {
        success: false,
        error: `No adapter registered for action type: ${action.type}`
      };
    }
    
    try {
      const result = await adapter.execute(action, warrant, envelope);
      
      return {
        success: true,
        action_type: action.type,
        target: action.target,
        result
      };
      
    } catch (error) {
      return {
        success: false,
        action_type: action.type,
        target: action.target,
        error: error.message
      };
    }
  }
  
  /**
   * Check if action is trading-critical
   */
  _isTradingCritical(action) {
    const tradingPatterns = ['kalshi', 'trading', 'kalshi_mm_bot'];
    const criticalTypes = ['restart_service', 'stop_service', 'write_db'];
    
    const targetMatches = tradingPatterns.some(pattern =>
      action.target?.toLowerCase().includes(pattern.toLowerCase())
    );
    
    const typeMatches = criticalTypes.some(critical =>
      action.type?.startsWith(critical)
    );
    
    return targetMatches && typeMatches;
  }
  
  /**
   * Emit audit event
   */
  async _emitAudit(event) {
    await this.viennaCore.audit.emit(event);
  }
  
  /**
   * Generate execution ID
   */
  _generateExecutionId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(3).toString('hex');
    return `exec_${timestamp}_${random}`;
  }
}

/**
 * Execution Error
 */
class ExecutionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
  }
}

module.exports = { Executor, ExecutionError };
