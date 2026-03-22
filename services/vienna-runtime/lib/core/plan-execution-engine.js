/**
 * Plan Execution Engine
 * 
 * Executes multi-step plans with dependency resolution, conditional branching,
 * retries, and failure handling.
 * 
 * Core invariant:
 * Each plan step is independently governable, observable, and ledgered,
 * while the plan as a whole remains the policy-approved execution unit.
 * 
 * Design constraint:
 * Deterministic graph execution, NOT agent loop.
 * Once a plan is approved, the execution engine runs a fixed graph with explicit conditions.
 */

const { StepStatus, FailureStrategy } = require('./plan-step-schema');
const { ExecutionLockManager } = require('../execution/execution-lock-manager');
const { extractTargets } = require('./target-extractor');
const {
  ResolutionOutcome,
  resolveApprovalStatus,
  validateApprovalForResumption,
  getLedgerEventType
} = require('./approval-resolution-handler');

/**
 * Plan execution context
 * Tracks state of multi-step plan execution
 */
class PlanExecutionContext {
  constructor(planId) {
    this.planId = planId;
    this.stepStates = new Map(); // step_id -> { status, result, attempts, started_at, completed_at }
    this.executionLog = [];
    this.startedAt = new Date().toISOString();
    this.completedAt = null;
    this.acquiredLocks = []; // Track locks for cleanup
  }

  /**
   * Initialize step state
   */
  initializeStep(stepId) {
    this.stepStates.set(stepId, {
      status: StepStatus.PENDING,
      result: null,
      attempts: 0,
      started_at: null,
      completed_at: null,
      error: null
    });
  }

  /**
   * Update step state
   */
  updateStepState(stepId, updates) {
    const current = this.stepStates.get(stepId) || {};
    this.stepStates.set(stepId, { ...current, ...updates });
  }

  /**
   * Get step state
   */
  getStepState(stepId) {
    return this.stepStates.get(stepId);
  }

  /**
   * Log execution event
   */
  logEvent(event) {
    this.executionLog.push({
      timestamp: new Date().toISOString(),
      ...event
    });
  }

  /**
   * Check if all dependencies are satisfied
   */
  areDependenciesSatisfied(step) {
    if (!step.depends_on || step.depends_on.length === 0) {
      return true;
    }

    for (const depStepId of step.depends_on) {
      const depState = this.stepStates.get(depStepId);
      if (!depState || !['completed', 'skipped'].includes(depState.status)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if step condition is met
   */
  isConditionMet(step) {
    if (!step.condition || step.condition.type === 'always') {
      return true;
    }

    const { type, step_ref, expression } = step.condition;

    if (!step_ref) {
      return true; // No reference step, treat as always
    }

    const refState = this.stepStates.get(step_ref);
    if (!refState) {
      return false; // Reference step not executed yet
    }

    switch (type) {
      case 'if_succeeded':
        return refState.status === StepStatus.COMPLETED;
      
      case 'if_failed':
        return refState.status === StepStatus.FAILED;
      
      case 'custom':
        return this._evaluateCustomCondition(refState, expression);
      
      default:
        return true;
    }
  }

  /**
   * Evaluate custom condition expression
   */
  _evaluateCustomCondition(refState, expression) {
    if (!expression) return true;

    // Simple expression evaluation
    // Example: { status_not: 'active' }
    if (expression.status_not && refState.result) {
      return refState.result.status !== expression.status_not;
    }

    if (expression.status_equals && refState.result) {
      return refState.result.status === expression.status_equals;
    }

    if (expression.field && expression.equals && refState.result) {
      return refState.result[expression.field] === expression.equals;
    }

    // Default: condition not met if we can't evaluate
    return false;
  }

  /**
   * Get plan execution summary
   */
  getSummary() {
    const steps = Array.from(this.stepStates.entries()).map(([stepId, state]) => ({
      step_id: stepId,
      status: state.status,
      attempts: state.attempts
    }));

    const statusCounts = {};
    for (const state of this.stepStates.values()) {
      statusCounts[state.status] = (statusCounts[state.status] || 0) + 1;
    }

    return {
      plan_id: this.planId,
      started_at: this.startedAt,
      completed_at: this.completedAt,
      total_steps: this.stepStates.size,
      status_counts: statusCounts,
      steps,
      execution_log: this.executionLog
    };
  }
}

/**
 * Plan Execution Engine
 */
class PlanExecutionEngine {
  constructor(options = {}) {
    this.stateGraph = options.stateGraph;
    this.executor = options.executor; // Action executor (chat-action-bridge or similar)
    this.verificationEngine = options.verificationEngine;
    this.approvalManager = options.approvalManager; // Approval manager for resolution
    this.lockManager = new ExecutionLockManager();
  }

  /**
   * Execute a multi-step plan
   * 
   * @param {Object} plan - Plan object with steps array
   * @param {Object} context - Execution context (user, session, etc.)
   * @returns {Promise<Object>} Execution result
   */
  async executePlan(plan, context = {}) {
    const execContext = new PlanExecutionContext(plan.plan_id);

    // Initialize all steps
    for (const step of plan.steps) {
      execContext.initializeStep(step.step_id);
    }

    execContext.logEvent({
      type: 'plan_execution_started',
      plan_id: plan.plan_id,
      total_steps: plan.steps.length
    });

    // Emit ledger event: plan_execution_started
    await this._emitLedgerEvent({
      execution_id: context.execution_id,
      event_type: 'plan_execution_started',
      stage: 'execution',
      plan_id: plan.plan_id,
      metadata: { total_steps: plan.steps.length }
    });

    try {
      // Execute steps in order
      for (const step of plan.steps) {
        await this._executeStep(step, execContext, context);
      }

      execContext.completedAt = new Date().toISOString();

      // Determine overall plan outcome
      const outcome = this._determinePlanOutcome(execContext);

      execContext.logEvent({
        type: 'plan_execution_completed',
        outcome
      });

      // Emit ledger event: plan_execution_completed
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: 'plan_execution_completed',
        stage: 'execution',
        plan_id: plan.plan_id,
        metadata: { outcome, summary: execContext.getSummary() }
      });

      return {
        success: outcome === 'success',
        plan_id: plan.plan_id,
        outcome,
        summary: execContext.getSummary()
      };

    } catch (error) {
      execContext.completedAt = new Date().toISOString();
      execContext.logEvent({
        type: 'plan_execution_failed',
        error: error.message
      });

      // Emit ledger event: plan_execution_failed
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: 'plan_execution_failed',
        stage: 'execution',
        plan_id: plan.plan_id,
        metadata: { error: error.message, summary: execContext.getSummary() }
      });

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  async _executeStep(step, execContext, context) {
    const stepState = execContext.getStepState(step.step_id);

    // Check if dependencies are satisfied
    if (!execContext.areDependenciesSatisfied(step)) {
      execContext.updateStepState(step.step_id, {
        status: StepStatus.BLOCKED,
        error: 'Dependencies not satisfied'
      });
      execContext.logEvent({
        type: 'step_blocked',
        step_id: step.step_id,
        reason: 'dependencies_not_satisfied'
      });
      return;
    }

    // Check if condition is met
    if (!execContext.isConditionMet(step)) {
      execContext.updateStepState(step.step_id, {
        status: StepStatus.SKIPPED,
        completed_at: new Date().toISOString()
      });
      execContext.logEvent({
        type: 'step_skipped',
        step_id: step.step_id,
        reason: 'condition_not_met'
      });

      // Emit ledger event: plan_step_skipped
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: 'plan_step_skipped',
        stage: 'execution',
        plan_id: execContext.planId,
        step_id: step.step_id,
        metadata: { reason: 'condition_not_met' }
      });

      return;
    }

    // ============================================================
    // LOCK ACQUISITION — CRITICAL SAFETY CONTROL
    // ============================================================
    
    // Extract targets from step
    const targets = extractTargets(step);
    
    if (targets.length > 0) {
      // Attempt to acquire locks on all targets
      const lockResult = await this._acquireStepLocks(step, targets, execContext, context);
      
      if (!lockResult.success) {
        // Lock conflict — deny execution
        execContext.updateStepState(step.step_id, {
          status: StepStatus.BLOCKED,
          error: `Lock conflict: ${lockResult.reason}`,
          conflicting_targets: lockResult.conflicting_targets
        });
        
        execContext.logEvent({
          type: 'step_blocked',
          step_id: step.step_id,
          reason: 'lock_conflict',
          conflicting_targets: lockResult.conflicting_targets
        });
        
        // Emit ledger event: lock_denied
        await this._emitLedgerEvent({
          execution_id: context.execution_id,
          event_type: 'lock_denied',
          stage: 'execution',
          plan_id: execContext.planId,
          step_id: step.step_id,
          metadata: {
            reason: lockResult.reason,
            conflicting_targets: lockResult.conflicting_targets,
            locked_by: lockResult.locked_by
          }
        });
        
        return; // Stop execution, do NOT continue
      }
      
      // Locks acquired successfully
      execContext.logEvent({
        type: 'locks_acquired',
        step_id: step.step_id,
        lock_ids: lockResult.lock_ids,
        targets: targets.map(t => t.target_id)
      });
      
      // Emit ledger event: lock_acquired
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: 'lock_acquired',
        stage: 'execution',
        plan_id: execContext.planId,
        step_id: step.step_id,
        metadata: {
          lock_ids: lockResult.lock_ids,
          targets: targets.map(t => ({ target_type: t.target_type, target_id: t.target_id }))
        }
      });
    }

    // Mark step as ready
    execContext.updateStepState(step.step_id, {
      status: StepStatus.READY
    });

    // ============================================================
    // APPROVAL RESOLUTION — GOVERNANCE CHECKPOINT
    // ============================================================
    
    // Check if this step requires approval
    const approvalCheck = await this._checkApprovalResolution(step, execContext, context);
    
    if (!approvalCheck.can_proceed) {
      // Approval not granted — stop execution
      execContext.updateStepState(step.step_id, {
        status: approvalCheck.outcome === 'pending_approval' ? StepStatus.BLOCKED : StepStatus.FAILED,
        error: approvalCheck.reason,
        completed_at: new Date().toISOString()
      });
      
      execContext.logEvent({
        type: 'step_approval_denied',
        step_id: step.step_id,
        outcome: approvalCheck.outcome,
        reason: approvalCheck.reason
      });
      
      // Emit ledger event for denial/expiry/missing
      const ledgerEventType = getLedgerEventType(approvalCheck.outcome);
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: ledgerEventType,
        stage: 'approval',
        plan_id: execContext.planId,
        step_id: step.step_id,
        metadata: approvalCheck.metadata
      });
      
      return; // Stop execution, do NOT continue to warrant/execution
    }
    
    // Approval granted (or not required) — emit success event if approval was checked
    if (approvalCheck.approval_id) {
      execContext.logEvent({
        type: 'step_approval_granted',
        step_id: step.step_id,
        approval_id: approvalCheck.approval_id
      });
      
      await this._emitLedgerEvent({
        execution_id: context.execution_id,
        event_type: 'approval_resolved_approved',
        stage: 'approval',
        plan_id: execContext.planId,
        step_id: step.step_id,
        metadata: approvalCheck.metadata
      });
    }

    // Execute step with retry logic
    try {
      await this._executeStepWithRetry(step, execContext, context);
    } finally {
      // ALWAYS release locks in finally block (no leaks)
      if (targets.length > 0) {
        await this._releaseStepLocks(step, execContext, context);
      }
    }
  }

  /**
   * Execute step with retry logic
   */
  async _executeStepWithRetry(step, execContext, context) {
    const maxAttempts = step.retry_policy ? step.retry_policy.max_attempts : 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        execContext.updateStepState(step.step_id, {
          status: attempt > 1 ? StepStatus.RETRYING : StepStatus.RUNNING,
          attempts: attempt,
          started_at: attempt === 1 ? new Date().toISOString() : execContext.getStepState(step.step_id).started_at
        });

        execContext.logEvent({
          type: attempt > 1 ? 'step_retry' : 'step_started',
          step_id: step.step_id,
          attempt
        });

        // Emit ledger event
        await this._emitLedgerEvent({
          execution_id: context.execution_id,
          event_type: attempt > 1 ? 'plan_step_retried' : 'plan_step_started',
          stage: 'execution',
          plan_id: execContext.planId,
          step_id: step.step_id,
          metadata: { attempt, max_attempts: maxAttempts }
        });

        // Execute the actual action
        const result = await this._executeStepAction(step, context);

        // Verify if verification spec exists
        let verificationResult = null;
        if (step.verification_spec) {
          verificationResult = await this._verifyStep(step, result, context);
        }

        // Mark step as completed
        execContext.updateStepState(step.step_id, {
          status: StepStatus.COMPLETED,
          result,
          verification_result: verificationResult,
          completed_at: new Date().toISOString()
        });

        execContext.logEvent({
          type: 'step_completed',
          step_id: step.step_id,
          attempt
        });

        // Emit ledger event
        await this._emitLedgerEvent({
          execution_id: context.execution_id,
          event_type: 'plan_step_completed',
          stage: 'execution',
          plan_id: execContext.planId,
          step_id: step.step_id,
          metadata: { attempt, result, verification_result: verificationResult }
        });

        return; // Success, exit retry loop

      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (attempt < maxAttempts) {
          const delay = this._calculateRetryDelay(step.retry_policy, attempt);
          execContext.logEvent({
            type: 'step_retry_scheduled',
            step_id: step.step_id,
            attempt,
            delay_ms: delay,
            error: error.message
          });
          await this._sleep(delay);
        }
      }
    }

    // All retries failed
    execContext.updateStepState(step.step_id, {
      status: StepStatus.FAILED,
      error: lastError.message,
      completed_at: new Date().toISOString()
    });

    execContext.logEvent({
      type: 'step_failed',
      step_id: step.step_id,
      error: lastError.message,
      total_attempts: maxAttempts
    });

    // Emit ledger event
    await this._emitLedgerEvent({
      execution_id: context.execution_id,
      event_type: 'plan_step_failed',
      stage: 'execution',
      plan_id: execContext.planId,
      step_id: step.step_id,
      metadata: { error: lastError.message, total_attempts: maxAttempts }
    });

    // Handle failure according to strategy
    await this._handleStepFailure(step, execContext, context, lastError);
  }

  /**
   * Execute step action
   */
  async _executeStepAction(step, context) {
    if (!step.action) {
      return { success: true, message: 'No action to execute' };
    }

    // Timeout wrapper
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Step execution timeout')), step.timeout_ms);
    });

    const executionPromise = this._callActionExecutor(step.action, context);

    const result = await Promise.race([executionPromise, timeoutPromise]);

    // PHASE 18 INTEGRATION: Record execution for pattern detection
    if (context.learningCoordinator && result) {
      try {
        await context.learningCoordinator.recordExecution({
          execution_id: context.execution_id,
          plan_id: context.plan_id,
          step_id: step.step_id,
          action_type: step.action?.action_id,
          target_id: step.action?.entities?.service || step.action?.entities?.target_id,
          success: result.success,
          error: result.error?.message,
          duration_ms: result.duration_ms,
          timestamp: new Date().toISOString()
        });
      } catch (learningError) {
        // Log but don't fail execution on learning errors
        console.warn('Learning system recording failed:', learningError.message);
      }
    }

    return result;
  }

  /**
   * Call action executor (interface to chat-action-bridge or similar)
   */
  async _callActionExecutor(action, context) {
    // Call the actual executor if provided
    if (this.executor && typeof this.executor.execute === 'function') {
      return await this.executor.execute(action, context);
    }
    
    // Fallback mock result if no executor
    return {
      success: true,
      action_id: action.action_id,
      entities: action.entities,
      result: {
        status: 'completed',
        message: `Executed ${action.action_id}`
      }
    };
  }

  /**
   * Verify step execution
   */
  async _verifyStep(step, executionResult, context) {
    if (!this.verificationEngine || !step.verification_spec) {
      return null;
    }

    // Build verification task from step spec
    const verificationTask = {
      task_id: `verify_${step.step_id}`,
      template_id: step.verification_spec.template_id,
      params: {
        ...step.verification_spec.params,
        execution_result: executionResult
      }
    };

    return await this.verificationEngine.runVerification(verificationTask, context);
  }

  /**
   * Handle step failure
   */
  async _handleStepFailure(step, execContext, context, error) {
    switch (step.on_failure) {
      case FailureStrategy.ABORT:
        throw new Error(`Step ${step.step_id} failed, aborting plan: ${error.message}`);

      case FailureStrategy.CONTINUE:
        // Just log and continue
        execContext.logEvent({
          type: 'step_failure_continued',
          step_id: step.step_id
        });
        break;

      case FailureStrategy.FALLBACK:
        if (step.fallback_step_id) {
          execContext.logEvent({
            type: 'step_failure_fallback',
            step_id: step.step_id,
            fallback_step_id: step.fallback_step_id
          });
          // Fallback step will be executed in normal flow if dependencies/conditions met
        }
        break;

      case FailureStrategy.ESCALATE:
        execContext.logEvent({
          type: 'step_failure_escalate',
          step_id: step.step_id
        });
        // Escalation would trigger incident creation
        break;

      case FailureStrategy.RETRY:
        // Already handled in retry loop
        break;
    }
  }

  /**
   * Calculate retry delay
   */
  _calculateRetryDelay(retryPolicy, attempt) {
    if (!retryPolicy) return 0;

    const baseDelay = retryPolicy.delay_ms;
    const backoff = retryPolicy.backoff || 'fixed';

    switch (backoff) {
      case 'linear':
        return baseDelay * attempt;
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  /**
   * Determine overall plan outcome
   */
  _determinePlanOutcome(execContext) {
    const states = Array.from(execContext.stepStates.values());

    const hasFailed = states.some(s => s.status === StepStatus.FAILED);
    const hasBlocked = states.some(s => s.status === StepStatus.BLOCKED);
    const allCompleted = states.every(s => 
      s.status === StepStatus.COMPLETED || s.status === StepStatus.SKIPPED
    );

    if (hasFailed) return 'failed';
    if (hasBlocked) return 'blocked';
    if (allCompleted) return 'success';
    return 'partial';
  }

  /**
   * Emit ledger event
   */
  async _emitLedgerEvent(event) {
    if (this.stateGraph && this.stateGraph.appendLedgerEvent) {
      // Add event_timestamp if not present
      if (!event.event_timestamp) {
        event.event_timestamp = new Date().toISOString();
      }
      await this.stateGraph.appendLedgerEvent(event);
    }
  }

  /**
   * Acquire locks for step (atomic set acquisition)
   * 
   * Core guarantee: ALL locks must succeed, or none are held.
   * 
   * @param {Object} step
   * @param {Array} targets - [{ target_type, target_id }]
   * @param {Object} execContext
   * @param {Object} context
   * @returns {Promise<Object>} { success, lock_ids?, reason?, conflicting_targets?, locked_by? }
   */
  async _acquireStepLocks(step, targets, execContext, context) {
    const acquiredLocks = [];
    const conflictingTargets = [];
    
    try {
      // Attempt to acquire all locks
      for (const target of targets) {
        const { target_type, target_id } = target;
        
        // Parse target ID to extract raw components
        const parts = target_id.split(':');
        const rawTargetId = parts.length === 3 ? parts[2] : target_id;
        
        // Emit ledger event: lock_requested
        await this._emitLedgerEvent({
          execution_id: context.execution_id,
          event_type: 'lock_requested',
          stage: 'execution',
          plan_id: execContext.planId,
          step_id: step.step_id,
          metadata: { target_type, target_id }
        });
        
        const lockResult = await this.lockManager.acquireLock({
          target_type,
          target_id: rawTargetId,
          execution_id: context.execution_id,
          plan_id: execContext.planId,
          objective_id: context.objective_id,
          ttl_seconds: step.timeout_ms ? Math.ceil(step.timeout_ms / 1000) + 60 : 360 // Step timeout + 60s buffer
        });
        
        if (!lockResult.success) {
          // Lock conflict detected
          conflictingTargets.push({
            target_type,
            target_id,
            locked_by: lockResult.locked_by,
            expires_at: lockResult.expires_at
          });
          
          // Rollback: release all previously acquired locks
          for (const acquiredLock of acquiredLocks) {
            await this.lockManager.releaseLock({
              lock_id: acquiredLock.lock_id,
              execution_id: context.execution_id
            });
          }
          
          return {
            success: false,
            reason: lockResult.reason || 'TARGET_LOCKED',
            conflicting_targets: conflictingTargets,
            locked_by: lockResult.locked_by
          };
        }
        
        // Lock acquired successfully
        acquiredLocks.push({
          lock_id: lockResult.lock_id,
          target_type,
          target_id: rawTargetId
        });
      }
      
      // All locks acquired — track in context for cleanup
      execContext.acquiredLocks.push(...acquiredLocks);
      
      return {
        success: true,
        lock_ids: acquiredLocks.map(l => l.lock_id)
      };
      
    } catch (error) {
      // Exception during lock acquisition — release all acquired locks
      for (const acquiredLock of acquiredLocks) {
        try {
          await this.lockManager.releaseLock({
            lock_id: acquiredLock.lock_id,
            execution_id: context.execution_id
          });
        } catch (releaseError) {
          // Log but don't throw (cleanup must not fail)
          console.error(`Failed to release lock ${acquiredLock.lock_id}:`, releaseError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * Release locks for step
   * 
   * @param {Object} step
   * @param {Object} execContext
   * @param {Object} context
   */
  async _releaseStepLocks(step, execContext, context) {
    const locksToRelease = execContext.acquiredLocks.filter(lock => {
      // Release all locks for this execution
      return true;
    });
    
    for (const lock of locksToRelease) {
      try {
        const releaseResult = await this.lockManager.releaseLock({
          lock_id: lock.lock_id,
          execution_id: context.execution_id
        });
        
        if (releaseResult.success) {
          execContext.logEvent({
            type: 'lock_released',
            step_id: step.step_id,
            lock_id: lock.lock_id,
            target_id: lock.target_id,
            duration_seconds: releaseResult.duration_seconds
          });
          
          // Emit ledger event: lock_released
          await this._emitLedgerEvent({
            execution_id: context.execution_id,
            event_type: 'lock_released',
            stage: 'execution',
            plan_id: execContext.planId,
            step_id: step.step_id,
            metadata: {
              lock_id: lock.lock_id,
              target_type: lock.target_type,
              target_id: lock.target_id,
              duration_seconds: releaseResult.duration_seconds
            }
          });
        }
        
      } catch (error) {
        // Log but don't throw (cleanup must not fail)
        console.error(`Failed to release lock ${lock.lock_id}:`, error.message);
        
        execContext.logEvent({
          type: 'lock_release_failed',
          step_id: step.step_id,
          lock_id: lock.lock_id,
          error: error.message
        });
      }
    }
    
    // Clear acquired locks from context
    execContext.acquiredLocks = [];
  }

  /**
   * Check approval resolution and determine if execution can proceed
   * 
   * Core invariant:
   * No warrant/execution occurs when approval is required but not granted.
   * 
   * @param {Object} step - Plan step
   * @param {Object} execContext - Execution context
   * @param {Object} context - Runtime context
   * @returns {Promise<Object>} { can_proceed, outcome, reason, metadata, approval_id? }
   */
  async _checkApprovalResolution(step, execContext, context) {
    // No approval manager — default to allow (backward compatibility)
    if (!this.approvalManager) {
      return {
        can_proceed: true,
        outcome: 'no_approval_system',
        reason: 'Approval system not configured',
        metadata: {}
      };
    }

    // Check if step has approval_required flag (set by policy in Stage 2)
    if (!step.approval_required) {
      // No approval required — proceed
      return {
        can_proceed: true,
        outcome: 'approval_not_required',
        reason: 'Step does not require approval',
        metadata: {}
      };
    }

    // Approval required — fetch approval record
    const approval = await this.approvalManager.getApprovalByContext(
      context.execution_id,
      step.step_id
    );

    // Resolve approval status
    const resolution = resolveApprovalStatus(approval, step, context);

    // If not approved, return denial outcome
    if (resolution.outcome !== ResolutionOutcome.APPROVED) {
      return {
        can_proceed: false,
        outcome: resolution.outcome,
        reason: resolution.reason,
        metadata: resolution.metadata,
        approval_id: approval ? approval.approval_id : null
      };
    }

    // Approval approved — revalidate before proceeding
    const validation = validateApprovalForResumption(approval, step, context);

    if (!validation.valid) {
      // Validation failed between resolution and execution
      return {
        can_proceed: false,
        outcome: ResolutionOutcome.MALFORMED,
        reason: validation.reason,
        metadata: validation.metadata,
        approval_id: approval.approval_id
      };
    }

    // All checks passed — approval granted and still valid
    return {
      can_proceed: true,
      outcome: ResolutionOutcome.APPROVED,
      reason: 'Approval granted and validated',
      metadata: resolution.metadata,
      approval_id: approval.approval_id
    };
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  PlanExecutionEngine,
  PlanExecutionContext
};
