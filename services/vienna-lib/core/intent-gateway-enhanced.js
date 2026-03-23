/**
 * Enhanced Intent Gateway Submit Method
 * Phases 21-30 Integration
 * 
 * This enhanced submitIntent method includes:
 * - Phase 21: Tenant context extraction
 * - Phase 22: Quota enforcement
 * - Phase 23: Attestation creation
 * - Phase 24: Simulation mode
 * - Phase 27: Explanation generation
 * - Phase 29: Cost tracking
 */

/**
 * Submit intent with full Phase 21-30 governance
 * 
 * @param {Intent} intent - Intent object
 * @param {Object} context - Request context { tenant_id, session, simulation }
 * @returns {IntentResponse} Enhanced response with tenant/quota/cost/attestation/explanation
 */
async function submitIntentEnhanced(intent, context = {}) {
  const {
    tenant_id = 'system',
    session = null,
    simulation = false
  } = context;

  // Generate intent_id if not provided
  if (!intent.intent_id) {
    intent.intent_id = `intent-${require('uuid').v4()}`;
  }

  // Add timestamp if not provided
  if (!intent.submitted_at) {
    intent.submitted_at = new Date().toISOString();
  }

  // Phase 21: Attach tenant context
  intent.tenant_id = tenant_id;
  intent.simulation = simulation;

  // Initialize response object
  const response = {
    intent_id: intent.intent_id,
    tenant_id: tenant_id,
    simulation: simulation,
    accepted: false,
    action: null,
    error: null,
    execution_id: null,
    explanation: null,
    attestation: null,
    cost: null,
    quota_state: null,
    metadata: {}
  };

  try {
    // Phase 11.5: Create intent trace
    this.stateGraph.createIntentTrace(
      intent.intent_id,
      intent.intent_type,
      intent.source,
      intent.submitted_at
    );

    // Emit intent.submitted event
    this._emitLifecycleEvent('intent.submitted', intent, {
      intent_id: intent.intent_id,
      intent_type: intent.intent_type,
      source: intent.source,
      tenant_id: tenant_id
    });

    // Phase 11.5: Record trace event
    await this.tracer.recordEvent(intent.intent_id, 'intent.submitted', {
      intent_type: intent.intent_type,
      source: intent.source,
      tenant_id: tenant_id
    });

    // Validate intent structure
    const validation = this.validateIntent(intent);
    if (!validation.valid) {
      response.error = validation.error;
      response.explanation = `Intent validation failed: ${validation.error}`;

      // Emit intent.denied event
      this._emitLifecycleEvent('intent.denied', intent, {
        intent_id: intent.intent_id,
        denial_reason: validation.error,
        stage: 'validation'
      });

      // Phase 11.5: Record denial
      await this.tracer.recordEvent(intent.intent_id, 'intent.denied', {
        reason: validation.error,
        stage: 'validation'
      });
      await this.tracer.updateStatus(intent.intent_id, 'denied');

      return response;
    }

    // Phase 11.5: Record validation
    await this.tracer.recordEvent(intent.intent_id, 'intent.validated', {
      intent_type: intent.intent_type
    });

    // Phase 22: Quota check (skip for system tenant and simulation)
    if (tenant_id !== 'system' && !simulation) {
      try {
        const quotaCheck = await this.quotaEnforcer.checkQuota(tenant_id, intent);

        if (!quotaCheck.allowed) {
          response.error = 'quota_exceeded';
          response.explanation = `Quota exceeded. Used ${quotaCheck.used}/${quotaCheck.limit} units (${Math.round(quotaCheck.utilization * 100)}%). ${quotaCheck.reason || ''}`;
          response.quota_state = {
            used: quotaCheck.used,
            limit: quotaCheck.limit,
            available: quotaCheck.available,
            utilization: quotaCheck.utilization,
            blocked: true
          };

          // Emit quota.exceeded event
          this._emitLifecycleEvent('quota.exceeded', intent, {
            intent_id: intent.intent_id,
            tenant_id: tenant_id,
            quota_state: response.quota_state
          });

          await this.tracer.recordEvent(intent.intent_id, 'quota.exceeded', {
            tenant_id: tenant_id,
            quota_state: response.quota_state
          });
          await this.tracer.updateStatus(intent.intent_id, 'blocked');

          return response;
        }

        // Record quota state (allowed)
        response.quota_state = {
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          available: quotaCheck.available,
          utilization: quotaCheck.utilization,
          blocked: false
        };

      } catch (quotaError) {
        console.error('[IntentGateway] Quota check error:', quotaError);
        response.error = 'quota_check_failed';
        response.explanation = `Quota check failed: ${quotaError.message}`;
        return response;
      }
    }

    // Phase 29: Budget check (estimate cost, skip for simulation)
    if (!simulation) {
      try {
        const costEstimate = await this.costTracker.estimateCost(intent);

        const budgetCheck = await this.costTracker.checkBudget(tenant_id, costEstimate);

        if (!budgetCheck.allowed) {
          response.error = 'budget_exceeded';
          response.explanation = `Budget exceeded. Estimated cost ${budgetCheck.currency} ${costEstimate.toFixed(4)} exceeds available budget ${budgetCheck.currency} ${budgetCheck.available.toFixed(4)}.`;
          response.cost = {
            estimated: costEstimate,
            available: budgetCheck.available,
            currency: budgetCheck.currency,
            blocked: true
          };

          await this.tracer.recordEvent(intent.intent_id, 'budget.exceeded', {
            tenant_id: tenant_id,
            cost_estimate: costEstimate,
            available_budget: budgetCheck.available
          });
          await this.tracer.updateStatus(intent.intent_id, 'blocked');

          return response;
        }

      } catch (budgetError) {
        console.error('[IntentGateway] Budget check error:', budgetError);
        // Don't block on budget check failure, log warning
        response.metadata.budget_check_warning = budgetError.message;
      }
    }

    // Normalize intent (canonical form)
    const normalized = this.normalizeIntent(intent);

    // Phase 24: Add simulation flag to normalized intent
    normalized.simulation = simulation;

    // Resolve intent (dispatch to appropriate handler)
    const resolution = await this.resolveIntent(normalized);

    // Populate response from resolution
    response.accepted = resolution.accepted;
    response.action = resolution.action || null;
    response.error = resolution.error || null;
    response.execution_id = resolution.metadata?.execution_id || null;
    response.metadata = { ...response.metadata, ...resolution.metadata };

    // Phase 27: Generate explanation
    if (resolution.accepted && resolution.action) {
      if (simulation) {
        response.explanation = `Simulation: Would execute ${resolution.action}. No side effects were performed.`;
      } else {
        response.explanation = `Executed ${resolution.action} successfully. ${resolution.message || ''}`;
      }
    } else if (!resolution.accepted) {
      response.explanation = `Intent denied: ${resolution.error || 'unknown reason'}.`;
    }

    // Phase 23: Create attestation (only for real executions)
    if (!simulation && resolution.accepted && response.execution_id) {
      try {
        const attestationResult = await this.attestationEngine.createAttestation(
          response.execution_id,
          tenant_id,
          'success',
          normalized,
          resolution.metadata
        );

        response.attestation = {
          status: 'attested',
          attestation_id: attestationResult.attestation_id,
          timestamp: attestationResult.attested_at
        };

      } catch (attestationError) {
        console.error('[IntentGateway] Attestation error:', attestationError);
        response.metadata.attestation_error = attestationError.message;
      }
    }

    // Phase 29: Record actual cost (only for real executions)
    if (!simulation && resolution.accepted && response.execution_id) {
      try {
        const actualCost = await this.costTracker.calculateActualCost(response.execution_id);

        await this.costTracker.recordCost(
          response.execution_id,
          tenant_id,
          actualCost.amount,
          actualCost.breakdown
        );

        response.cost = {
          amount: actualCost.amount,
          currency: actualCost.currency,
          breakdown: actualCost.breakdown
        };

      } catch (costError) {
        console.error('[IntentGateway] Cost tracking error:', costError);
        response.metadata.cost_tracking_error = costError.message;
      }
    }

    // Emit intent.executed or intent.denied based on outcome
    if (resolution.accepted && resolution.action) {
      this._emitLifecycleEvent('intent.executed', intent, {
        intent_id: intent.intent_id,
        action: resolution.action,
        execution_id: response.execution_id,
        simulation: simulation
      });

      await this.tracer.recordEvent(intent.intent_id, 'intent.executed', {
        action: resolution.action,
        execution_id: response.execution_id,
        simulation: simulation
      });
      await this.tracer.updateStatus(intent.intent_id, simulation ? 'simulated' : 'executing');

      if (response.execution_id) {
        await this.tracer.linkExecution(intent.intent_id, response.execution_id);
      }
    } else if (!resolution.accepted) {
      this._emitLifecycleEvent('intent.denied', intent, {
        intent_id: intent.intent_id,
        denial_reason: resolution.error,
        stage: 'resolution'
      });

      await this.tracer.recordEvent(intent.intent_id, 'intent.denied', {
        reason: resolution.error,
        stage: 'resolution'
      });
      await this.tracer.updateStatus(intent.intent_id, 'denied');
    }

    return response;

  } catch (error) {
    console.error('[IntentGateway] Submit intent error:', error);

    response.error = 'intent_processing_failed';
    response.explanation = `Intent processing failed: ${error.message}`;
    response.metadata.error_stack = error.stack;

    // Record failure
    await this.tracer.recordEvent(intent.intent_id, 'intent.failed', {
      error: error.message,
      stack: error.stack
    });
    await this.tracer.updateStatus(intent.intent_id, 'failed');

    return response;
  }
}

module.exports = { submitIntentEnhanced };
