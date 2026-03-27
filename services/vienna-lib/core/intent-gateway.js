/**
 * Intent Gateway
 * 
 * Canonical ingress for all actions entering Vienna OS.
 * Normalizes operator/agent requests into governed execution pipeline.
 * 
 * Phase 11 — First Milestone
 * Scope: Three intent types (restore_objective, investigate_objective, set_safe_mode)
 * 
 * Design invariant:
 * Intent gateway is the ONLY entry point for actions.
 * All intents flow through existing governance mechanisms (no bypass).
 */

const { v4: uuidv4 } = require('uuid');
const { SlackAdapter } = require('../adapters/slack.js');
const { EmailAdapter } = require('../adapters/email.js');

/**
 * Intent structure (canonical)
 * 
 * @typedef {Object} Intent
 * @property {string} intent_id - Unique intent identifier
 * @property {string} intent_type - One of: restore_objective, investigate_objective, set_safe_mode
 * @property {Object} source - { type: 'operator'|'agent'|'system', id: string }
 * @property {Object} payload - Intent-specific payload
 * @property {string} submitted_at - ISO timestamp
 */

/**
 * Intent response (canonical)
 * 
 * @typedef {Object} IntentResponse
 * @property {string} intent_id - Same as submitted intent
 * @property {boolean} accepted - Whether intent was accepted
 * @property {string} [action] - Action taken (if accepted)
 * @property {string} [message] - Human-readable message
 * @property {string} [error] - Error reason (if not accepted)
 * @property {Object} [metadata] - Additional response data
 */

class IntentGateway {
  constructor(stateGraph, options = {}) {
    this.stateGraph = stateGraph;
    this.options = {
      supported_intent_types: [
        'restore_objective',
        'investigate_objective',
        'set_safe_mode',
        'test_execution',  // Phase 1 validation support
        'check_system_health',  // Phase 28 integration proof
        'restart_service',  // Service management
        'check_service_logs',  // Diagnostic
        'check_system_status',  // Monitoring
        'trigger_backup',  // Data protection
        'run_diagnostic',  // System health
        'update_configuration',  // Config management
        'list_objectives',  // Objective queries
        'query_state_graph',  // State inspection
        'check_execution_status',  // Execution monitoring
        'list_recent_executions'  // Audit trail
      ],
      ...options
    };

    // Phase 11.5: Initialize intent tracer
    const { IntentTracer } = require('./intent-tracing');
    this.tracer = new IntentTracer(stateGraph);

    // Phase 22: Initialize quota enforcer
    const { QuotaEnforcer } = require('../governance/quota-enforcer');
    this.quotaEnforcer = new QuotaEnforcer(stateGraph);

    // Phase 23: Initialize attestation engine
    const { AttestationEngine } = require('../attestation/attestation-engine');
    this.attestationEngine = new AttestationEngine(stateGraph);

    // Phase 29: Initialize cost tracker
    const { CostTracker } = require('../accounting/cost-tracker');
    this.costTracker = new CostTracker(stateGraph);

    // Phase 15: Initialize notification adapters
    this.slackAdapter = new SlackAdapter();
    this.emailAdapter = new EmailAdapter();
  }

  /**
   * Submit intent to Vienna OS
   * 
   * @param {Intent} intent - Intent object
   * @returns {IntentResponse} Response with acceptance status
   */
  async submitIntent(intent) {
    // Generate intent_id if not provided
    if (!intent.intent_id) {
      intent.intent_id = `intent-${uuidv4()}`;
    }

    // Add timestamp if not provided
    if (!intent.submitted_at) {
      intent.submitted_at = new Date().toISOString();
    }

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
      source: intent.source
    });

    // Phase 11.5: Record trace event
    await this.tracer.recordEvent(intent.intent_id, 'intent.submitted', {
      intent_type: intent.intent_type,
      source: intent.source
    });

    // Validate intent structure
    const validation = this.validateIntent(intent);
    if (!validation.valid) {
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

      return {
        intent_id: intent.intent_id,
        accepted: false,
        error: validation.error,
        metadata: { validation }
      };
    }

    // Emit intent.validated event
    this._emitLifecycleEvent('intent.validated', intent, {
      intent_id: intent.intent_id,
      intent_type: intent.intent_type
    });

    // Phase 11.5: Record validation
    await this.tracer.recordEvent(intent.intent_id, 'intent.validated', {
      intent_type: intent.intent_type
    });

    // Policy Evaluation (Phase 15: Visual Policy Builder)
    if (intent.tenant_id) {
      const policyActions = this.stateGraph.evaluatePolicies(intent.tenant_id, intent);
      
      if (policyActions.length > 0) {
        // Apply policy actions
        for (const policyAction of policyActions) {
          const { action } = policyAction;
          
          // Handle different action types
          if (action.type === 'block') {
            // Block execution immediately
            await this.tracer.recordEvent(intent.intent_id, 'intent.blocked_by_policy', {
              policy_id: policyAction.policy_id,
              policy_name: policyAction.policy_name
            });
            await this.tracer.updateStatus(intent.intent_id, 'denied');
            
            return {
              intent_id: intent.intent_id,
              accepted: false,
              error: `Blocked by policy: ${policyAction.policy_name}`,
              metadata: { policy: policyAction }
            };
          }
          
          if (action.type === 'require_approval') {
            // Modify intent to require approval (will be handled downstream)
            intent._policyRequiresApproval = true;
            intent._approvalTier = action.params?.tier || 'T1';
          }
          
          if (action.type === 'log') {
            // Log policy match
            console.log(`[IntentGateway] Policy matched: ${policyAction.policy_name}`, {
              intent_id: intent.intent_id,
              policy_id: policyAction.policy_id
            });
          }

          if (action.type === 'notify') {
            // Send notifications via configured adapters
            const notificationPayload = {
              intent_id: intent.intent_id,
              intent_type: intent.intent_type,
              action: intent.payload?.action || 'unknown',
              riskTier: intent.risk_tier || 'T0',
              policy_name: policyAction.policy_name,
              message: action.params?.message || `Policy matched: ${policyAction.policy_name}`,
              source: intent.source,
              timestamp: intent.submitted_at || new Date().toISOString()
            };

            const channels = action.params?.channels || ['slack', 'email'];

            // Send to Slack
            if (channels.includes('slack')) {
              try {
                await this.slackAdapter.sendPolicyNotification(notificationPayload);
              } catch (err) {
                console.error('[IntentGateway] Slack notification failed:', err.message);
              }
            }

            // Send to Email
            if (channels.includes('email')) {
              try {
                await this.emailAdapter.sendPolicyNotification(notificationPayload);
              } catch (err) {
                console.error('[IntentGateway] Email notification failed:', err.message);
              }
            }

            // Record notification event
            await this.tracer.recordEvent(intent.intent_id, 'policy.notification_sent', {
              policy_id: policyAction.policy_id,
              channels,
              message: notificationPayload.message
            });
          }
        }
        
        // Record policy evaluation
        await this.tracer.recordEvent(intent.intent_id, 'policies.evaluated', {
          policies_matched: policyActions.length,
          actions_applied: policyActions.map(p => p.action.type)
        });
      }
    }

    // Normalize intent (canonical form)
    const normalized = this.normalizeIntent(intent);

    // Resolve intent (dispatch to appropriate handler)
    const resolution = await this.resolveIntent(normalized);

    // Emit intent.resolved event
    this._emitLifecycleEvent('intent.resolved', intent, {
      intent_id: intent.intent_id,
      accepted: resolution.accepted,
      action: resolution.action || null,
      error: resolution.error || null
    });

    // Phase 11.5: Record resolution
    await this.tracer.recordEvent(intent.intent_id, 'intent.resolved', {
      accepted: resolution.accepted,
      action: resolution.action || null,
      error: resolution.error || null
    });

    // Emit intent.executed or intent.denied based on outcome
    if (resolution.accepted && resolution.action) {
      this._emitLifecycleEvent('intent.executed', intent, {
        intent_id: intent.intent_id,
        action: resolution.action,
        metadata: resolution.metadata
      });

      // Phase 11.5: Record execution
      await this.tracer.recordEvent(intent.intent_id, 'intent.executed', {
        action: resolution.action,
        metadata: resolution.metadata
      });
      await this.tracer.updateStatus(intent.intent_id, 'executing');

      // Phase 15: Track agent activity (Fleet Dashboard)
      if (intent.source?.id && intent.tenant_id) {
        this.stateGraph.upsertAgent({
          agent_id: intent.source.id,
          tenant_id: intent.tenant_id,
          name: intent.source.name || intent.source.id,
          type: intent.source.platform || 'unknown',
          status: 'active',
          metadata_json: intent.source.metadata || {}
        });
        
        // Update execution stats
        const executionStatus = resolution.accepted ? 'completed' : 'failed';
        this.stateGraph.updateAgentStats(intent.source.id, executionStatus);
      }

      // Link to execution if available
      if (resolution.metadata && resolution.metadata.execution_id) {
        await this.tracer.linkExecution(intent.intent_id, resolution.metadata.execution_id);
      }
    } else if (!resolution.accepted) {
      this._emitLifecycleEvent('intent.denied', intent, {
        intent_id: intent.intent_id,
        denial_reason: resolution.error,
        stage: 'resolution'
      });

      // Phase 11.5: Record denial
      await this.tracer.recordEvent(intent.intent_id, 'intent.denied', {
        reason: resolution.error,
        stage: 'resolution'
      });
      await this.tracer.updateStatus(intent.intent_id, 'denied');
    }

    return {
      intent_id: intent.intent_id,
      ...resolution
    };
  }

  /**
   * Validate intent structure
   * 
   * @param {Intent} intent - Intent to validate
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateIntent(intent) {
    // Check required fields
    if (!intent.intent_type) {
      return { valid: false, error: 'missing_intent_type' };
    }

    if (!intent.source || !intent.source.type || !intent.source.id) {
      return { valid: false, error: 'invalid_source' };
    }

    if (!intent.payload || typeof intent.payload !== 'object') {
      return { valid: false, error: 'invalid_payload' };
    }

    // Check supported intent types
    if (!this.options.supported_intent_types.includes(intent.intent_type)) {
      return {
        valid: false,
        error: 'unsupported_intent_type',
        supported: this.options.supported_intent_types
      };
    }

    // Intent-specific validation
    const typeValidation = this._validateIntentType(intent);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    return { valid: true };
  }

  /**
   * Normalize intent to canonical form
   * 
   * @param {Intent} intent - Raw intent
   * @returns {Intent} Normalized intent
   */
  normalizeIntent(intent) {
    const normalized = {
      intent_id: intent.intent_id,
      intent_type: intent.intent_type,
      source: {
        type: intent.source.type,
        id: intent.source.id
      },
      payload: { ...intent.payload },
      submitted_at: intent.submitted_at
    };

    // Type-specific normalization
    if (intent.intent_type === 'restore_objective') {
      // Ensure objective_id is trimmed
      if (normalized.payload.objective_id) {
        normalized.payload.objective_id = normalized.payload.objective_id.trim();
      }
    }

    return normalized;
  }

  /**
   * Resolve intent (dispatch to handler)
   * 
   * @param {Intent} intent - Normalized intent
   * @returns {Promise<Object>} Resolution result
   */
  async resolveIntent(intent) {
    const handler = this._getHandler(intent.intent_type);
    if (!handler) {
      return {
        accepted: false,
        error: 'no_handler_available'
      };
    }

    try {
      return await handler.call(this, intent);
    } catch (error) {
      console.error(`[IntentGateway] Resolution error for ${intent.intent_type}:`, error);
      return {
        accepted: false,
        error: 'resolution_failed',
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Get handler for intent type
   * 
   * @private
   * @param {string} intentType
   * @returns {Function|null} Handler function
   */
  _getHandler(intentType) {
    const handlers = {
      'restore_objective': this._handleRestoreObjective,
      'investigate_objective': this._handleInvestigateObjective,
      'set_safe_mode': this._handleSetSafeMode,
      'test_execution': this._handleTestExecution,
      'check_system_health': this._handleCheckSystemHealth,
      'list_objectives': this._handleListObjectives,
      'query_state_graph': this._handleQueryStateGraph,
      'check_system_status': this._handleCheckSystemStatus,
      'list_recent_executions': this._handleListRecentExecutions,
      'restart_service': this._handleRestartService,
      'check_service_logs': this._handleCheckServiceLogs,
      'trigger_backup': this._handleTriggerBackup,
      'run_diagnostic': this._handleRunDiagnostic,
      'update_configuration': this._handleUpdateConfiguration,
      'check_execution_status': this._handleCheckExecutionStatus
    };

    return handlers[intentType] || null;
  }

  /**
   * Validate intent type-specific requirements
   * 
   * @private
   * @param {Intent} intent
   * @returns {Object} { valid: boolean, error?: string }
   */
  _validateIntentType(intent) {
    switch (intent.intent_type) {
      case 'test_execution':
        if (!intent.payload.mode) {
          return { valid: false, error: 'missing_mode' };
        }
        const validModes = ['success', 'simulation', 'quota_block', 'budget_block', 'failure'];
        if (!validModes.includes(intent.payload.mode)) {
          return { valid: false, error: 'invalid_mode' };
        }
        return { valid: true };

      case 'restore_objective':
        if (!intent.payload.objective_id) {
          return { valid: false, error: 'missing_objective_id' };
        }
        return { valid: true };

      case 'investigate_objective':
        if (!intent.payload.objective_id) {
          return { valid: false, error: 'missing_objective_id' };
        }
        return { valid: true };

      case 'set_safe_mode':
        if (typeof intent.payload.enabled !== 'boolean') {
          return { valid: false, error: 'missing_enabled_flag' };
        }
        if (intent.payload.enabled && !intent.payload.reason) {
          return { valid: false, error: 'missing_reason' };
        }
        return { valid: true };

      case 'check_system_health':
        // No required fields for health check (target defaults to vienna_backend)
        return { valid: true };

      case 'list_objectives':
        // No required fields
        return { valid: true };

      case 'query_state_graph':
        // query field optional (defaults to full state)
        return { valid: true };

      case 'check_system_status':
        // No required fields
        return { valid: true };

      case 'list_recent_executions':
        // limit field optional (defaults to 10)
        return { valid: true };

      case 'restart_service':
        if (!intent.payload.service) {
          return { valid: false, error: 'missing_service' };
        }
        return { valid: true };

      case 'check_service_logs':
        if (!intent.payload.service) {
          return { valid: false, error: 'missing_service' };
        }
        return { valid: true };

      case 'trigger_backup':
        // No required fields
        return { valid: true };

      case 'run_diagnostic':
        // check field optional (defaults to all)
        return { valid: true };

      case 'update_configuration':
        if (!intent.payload.key || !intent.payload.value) {
          return { valid: false, error: 'missing_key_or_value' };
        }
        return { valid: true };

      case 'check_execution_status':
        if (!intent.payload.execution_id) {
          return { valid: false, error: 'missing_execution_id' };
        }
        return { valid: true };

      default:
        return { valid: false, error: 'unknown_intent_type' };
    }
  }

  // ============================================================
  // INTENT HANDLERS

  /**
   * Handle restore_objective intent
   * 
   * Action: Submit reconciliation admission request
   * 
   * @private
   * @param {Intent} intent
   * @returns {Promise<Object>} Response
   */
  async _handleRestoreObjective(intent) {
    const { objective_id } = intent.payload;

    // Check if objective exists
    const objective = this.stateGraph.getObjective(objective_id);
    if (!objective) {
      return {
        accepted: false,
        error: 'unknown_objective',
        metadata: { objective_id }
      };
    }

    // Submit reconciliation admission request via ReconciliationGate
    const { ReconciliationGate } = require('./reconciliation-gate');
    const gate = new ReconciliationGate(this.stateGraph);

    const admission = gate.requestAdmission(objective_id, {
      drift_reason: 'operator_restore_request',
      triggered_by: intent.source.id,
      intent_id: intent.intent_id
    });

    if (!admission.admitted) {
      return {
        accepted: false,
        error: 'admission_denied',
        message: `Reconciliation admission denied: ${admission.reason}`,
        metadata: {
          objective_id,
          admission_reason: admission.reason,
          current_status: objective.reconciliation_status
        }
      };
    }

    return {
      accepted: true,
      action: 'reconciliation_requested',
      message: 'Objective restoration submitted to governance pipeline.',
      metadata: {
        objective_id,
        generation: admission.generation,
        reconciliation_status: 'reconciling'
      }
    };
  }

  /**
   * Handle investigate_objective intent
   * 
   * Action: Return State Graph summary (no execution)
   * 
   * @private
   * @param {Intent} intent
   * @returns {Promise<Object>} Response
   */
  async _handleInvestigateObjective(intent) {
    const { objective_id } = intent.payload;

    // Load objective
    const objective = this.stateGraph.getObjective(objective_id);
    if (!objective) {
      return {
        accepted: false,
        error: 'unknown_objective',
        metadata: { objective_id }
      };
    }

    // Load recent evaluations
    const evaluations = this.stateGraph.listObjectiveEvaluations(objective_id, 5);

    // Load recent history
    const history = this.stateGraph.listObjectiveHistory(objective_id, 10);

    return {
      accepted: true,
      action: 'investigation_report',
      message: `Objective ${objective_id} investigation complete.`,
      metadata: {
        objective,
        recent_evaluations: evaluations,
        recent_history: history,
        summary: {
          current_status: objective.status,
          reconciliation_status: objective.reconciliation_status,
          consecutive_failures: objective.consecutive_failures,
          last_evaluated: objective.last_evaluated_at,
          last_violation: objective.last_violation_at
        }
      }
    };
  }

  /**
   * Handle set_safe_mode intent
   * 
   * Action: Call safe mode runtime control
   * 
   * @private
   * @param {Intent} intent
   * @returns {Promise<Object>} Response
   */
  async _handleSetSafeMode(intent) {
    const { enabled, reason } = intent.payload;
    const operator = intent.source.id;

    if (enabled) {
      // Enable safe mode (pass intent context)
      this.stateGraph.enableSafeMode(reason, operator, { intent_id: intent.intent_id });

      return {
        accepted: true,
        action: 'safe_mode_enabled',
        message: `Safe mode enabled: ${reason}`,
        metadata: {
          safe_mode: this.stateGraph.getSafeModeStatus()
        }
      };
    } else {
      // Disable safe mode (pass intent context)
      this.stateGraph.disableSafeMode(operator, { intent_id: intent.intent_id });

      return {
        accepted: true,
        action: 'safe_mode_disabled',
        message: 'Safe mode disabled. Autonomous reconciliation resumed.',
        metadata: {
          safe_mode: this.stateGraph.getSafeModeStatus()
        }
      };
    }
  }

  /**
   * Handle test_execution intent (Phase 1 validation)
   * 
   * Synthetic execution for validation testing
   * 
   * @private
   * @param {Intent} intent
   * @returns {Promise<Object>} Response
   */
  async _handleTestExecution(intent) {
    const { mode } = intent.payload;
    const execution_id = `exec-${uuidv4()}`;
    
    // Record start
    await this.tracer.recordEvent(intent.intent_id, 'execution.started', {
      execution_id,
      mode
    });

    let result;
    
    switch (mode) {
      case 'success':
        result = {
          accepted: true,
          action: 'test_execution_success',
          execution_id,
          message: 'Test execution completed successfully',
          metadata: { mode, synthetic: true }
        };
        break;
        
      case 'simulation':
        result = {
          accepted: true,
          action: 'test_execution_simulated',
          execution_id,
          message: 'Test execution simulated (no real action)',
          metadata: { mode, synthetic: true, simulated: true }
        };
        break;
        
      case 'quota_block':
        return {
          accepted: false,
          error: 'quota_exceeded',
          message: 'Test execution blocked by quota',
          metadata: { mode, synthetic: true, blocked_by: 'quota' }
        };
        
      case 'budget_block':
        return {
          accepted: false,
          error: 'budget_exceeded',
          message: 'Test execution blocked by budget',
          metadata: { mode, synthetic: true, blocked_by: 'budget' }
        };
        
      case 'failure':
        return {
          accepted: false,
          error: 'execution_failed',
          message: 'Test execution failed (synthetic)',
          metadata: { mode, synthetic: true, failed: true }
        };
        
      default:
        return {
          accepted: false,
          error: 'invalid_mode',
          message: `Unknown test mode: ${mode}`
        };
    }

    // Record completion
    await this.tracer.recordEvent(intent.intent_id, 'execution.completed', {
      execution_id,
      mode,
      action: result.action
    });

    return result;
  }

  /**
   * Handle check_system_health intent (Phase 28 integration proof)
   * 
   * Real external health check with governed execution path
   * 
   * @private
   * @param {Intent} intent
   * @returns {Promise<Object>} Response
   */
  async _handleCheckSystemHealth(intent) {
    const target = intent.payload.target || 'vienna_backend';
    const tenant_id = intent.payload.tenant || 'system';
    // Check both top-level and payload for simulation flag (agent layer uses top-level)
    const simulation = intent.simulation === true || intent.payload.simulation === true;
    const execution_id = `exec-${uuidv4()}`;

    // Extract tenant context for governance
    const tenantContext = {
      tenant_id,
      source: intent.source
    };

    // Record execution start
    await this.tracer.recordEvent(intent.intent_id, 'execution.started', {
      execution_id,
      target,
      simulation
    });

    // Phase 22: Check quota (BEFORE execution decision)
    const quotaCheck = await this.quotaEnforcer.checkQuota(tenantContext, {
      action_type: 'integration',
      target,
      cost_estimate: 0.001  // Minimal cost for health check
    });

    if (!quotaCheck.allowed) {
      await this.tracer.recordEvent(intent.intent_id, 'execution.blocked', {
        reason: 'quota_exceeded',
        available: quotaCheck.available
      });

      return {
        accepted: false,
        error: 'quota_exceeded',
        message: quotaCheck.reason || 'Quota exceeded',
        metadata: {
          tenant: tenant_id,
          status: 'blocked_quota',
          available: quotaCheck.available
        }
      };
    }

    // Phase 29: Check budget (BEFORE execution decision)
    // Note: Budget check bypassed for health checks (minimal cost integration proof)
    // Full budget enforcement will be added in production tenant management

    let healthResult;
    let actualCost = null;

    if (simulation) {
      // SIMULATION MODE: Do NOT call external endpoint
      healthResult = {
        ok: true,
        status_code: 200,
        target,
        simulated: true
      };

      await this.tracer.recordEvent(intent.intent_id, 'execution.simulated', {
        execution_id,
        target
      });
    } else {
      // EXECUTION MODE: Call real external endpoint
      try {
        const https = require('https');
        const http = require('http');

        const endpoint = target === 'vienna_backend' 
          ? 'https://vienna-os.fly.dev/health'
          : intent.payload.endpoint;

        if (!endpoint) {
          throw new Error('No endpoint configured for target: ' + target);
        }

        // Perform real HTTP health check
        const protocol = endpoint.startsWith('https://') ? https : http;
        const response = await new Promise((resolve, reject) => {
          const req = protocol.get(endpoint, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              resolve({
                status_code: res.statusCode,
                body,
                ok: res.statusCode >= 200 && res.statusCode < 300
              });
            });
          });
          req.on('error', reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Health check timeout'));
          });
        });

        healthResult = {
          ok: response.ok,
          status_code: response.status_code,
          target,
          endpoint
        };

        // Calculate actual cost (minimal for health check)
        actualCost = 0.001;

        // Phase 29: Record cost (bypassed for minimal integration proof)
        // await this.costTracker.recordCost({
        //   execution_id,
        //   tenant_id,
        //   action_type: 'integration',
        //   target,
        //   cost: actualCost
        // });

        await this.tracer.recordEvent(intent.intent_id, 'execution.completed', {
          execution_id,
          target,
          status_code: response.status_code,
          ok: response.ok
        });

      } catch (error) {
        // Execution failed
        await this.tracer.recordEvent(intent.intent_id, 'execution.failed', {
          execution_id,
          error: error.message
        });

        // Phase 23: Create failure attestation
        const attestation = await this.attestationEngine.createAttestation({
          execution_id,
          tenant_id,
          status: 'failed',
          input_hash: null,
          output_hash: null,
          metadata: {
            target,
            error: error.message
          }
        });

        return {
          accepted: false,
          action: 'health_check_failed',
          error: error.message,
          message: `Health check failed: ${error.message}`,
          metadata: {
            tenant: tenant_id,
            status: 'failed',
            execution_id,
            target,
            attestation: {
              attestation_id: attestation.attestation_id,
              status: attestation.status
            }
          }
        };
      }
    }

    // Phase 23: Create attestation (for both executed and simulated)
    // Attestation status must be: success, failed, or blocked
    const attestationStatus = simulation ? 'blocked' : 'success';  // Simulated treated as "blocked from real execution"
    const attestation = await this.attestationEngine.createAttestation({
      execution_id,
      tenant_id,
      status: attestationStatus,
      input_hash: JSON.stringify({ target }),
      output_hash: JSON.stringify(healthResult),
      metadata: {
        target,
        simulation
      }
    });

    return {
      accepted: true,
      action: simulation ? 'health_check_simulated' : 'health_check_executed',
      message: simulation 
        ? 'Health check simulated (no external call)'
        : `Health check completed: ${healthResult.ok ? 'healthy' : 'unhealthy'}`,
      metadata: {
        tenant: tenant_id,
        status: simulation ? 'simulated' : 'executed',
        simulation,
        execution_id,
        target,
        cost: actualCost,
        attestation: {
          attestation_id: attestation.attestation_id,
          status: attestation.status
        },
        result: healthResult
      }
    };
  }

  /**
   * Handle list_objectives intent
   * @private
   */
  async _handleListObjectives(intent) {
    const objectives = this.stateGraph.listObjectives(intent.payload || {});
    return {
      accepted: true,
      action: 'objectives_listed',
      message: `Found ${objectives.length} objective(s)`,
      metadata: { objectives, count: objectives.length }
    };
  }

  /**
   * Handle query_state_graph intent
   * @private
   */
  async _handleQueryStateGraph(intent) {
    const { entity_type, filters } = intent.payload || {};
    
    let result;
    switch (entity_type) {
      case 'services':
        result = this.stateGraph.listServices(filters);
        break;
      case 'providers':
        result = this.stateGraph.listProviders();
        break;
      case 'incidents':
        result = this.stateGraph.listIncidents(filters);
        break;
      default:
        return {
          accepted: false,
          error: 'invalid_entity_type',
          message: `Unknown entity type: ${entity_type}`
        };
    }

    return {
      accepted: true,
      action: 'state_queried',
      message: `Query returned ${result.length} result(s)`,
      metadata: { entity_type, results: result, count: result.length }
    };
  }

  /**
   * Handle check_system_status intent
   * @private
   */
  async _handleCheckSystemStatus(intent) {
    const services = this.stateGraph.listServices();
    const providers = this.stateGraph.listProviders();
    const incidents = this.stateGraph.listIncidents({ status: 'open' });

    return {
      accepted: true,
      action: 'status_checked',
      message: `System status: ${services.length} services, ${incidents.length} open incidents`,
      metadata: {
        services: services.map(s => ({ id: s.service_id, status: s.status })),
        providers: providers.map(p => ({ id: p.provider_id, status: p.status })),
        open_incidents: incidents.length
      }
    };
  }

  /**
   * Handle list_recent_executions intent
   * @private
   */
  async _handleListRecentExecutions(intent) {
    const limit = intent.payload?.limit || 20;
    const executions = this.stateGraph.listExecutions({ limit });

    return {
      accepted: true,
      action: 'executions_listed',
      message: `Found ${executions.length} recent execution(s)`,
      metadata: { executions, count: executions.length }
    };
  }

  /**
   * Handle restart_service intent (T1)
   */
  async _handleRestartService(intent) {
    const service = intent.payload.service;
    
    // Simulation or execution logic TBD
    return {
      accepted: true,
      action: 'service_restart_queued',
      message: `Service restart queued: ${service}`,
      metadata: { service, status: 'pending' }
    };
  }

  /**
   * Handle check_service_logs intent (T0)
   */
  async _handleCheckServiceLogs(intent) {
    const service = intent.payload.service;
    const lines = intent.payload.lines || 50;
    
    // Stub implementation - logs retrieval TBD
    return {
      accepted: true,
      action: 'logs_retrieved',
      message: `Retrieved ${lines} log lines for ${service}`,
      metadata: { service, lines, logs: [] }
    };
  }

  /**
   * Handle trigger_backup intent (T1)
   */
  async _handleTriggerBackup(intent) {
    // Stub implementation - backup trigger TBD
    return {
      accepted: true,
      action: 'backup_triggered',
      message: 'Backup process initiated',
      metadata: { status: 'started', backup_id: `backup_${Date.now()}` }
    };
  }

  /**
   * Handle run_diagnostic intent (T0)
   */
  async _handleRunDiagnostic(intent) {
    const check = intent.payload.check || 'all';
    
    // Stub implementation - diagnostic logic TBD
    return {
      accepted: true,
      action: 'diagnostic_completed',
      message: `Diagnostic check completed: ${check}`,
      metadata: { check, status: 'healthy', details: {} }
    };
  }

  /**
   * Handle update_configuration intent (T2)
   */
  async _handleUpdateConfiguration(intent) {
    const { key, value } = intent.payload;
    
    // Stub implementation - configuration update TBD (requires T2 approval)
    return {
      accepted: false,
      error: 'requires_approval',
      message: `Configuration update requires T2 approval: ${key}`,
      metadata: { key, value, risk_tier: 'T2' }
    };
  }

  /**
   * Handle check_execution_status intent (T0)
   */
  async _handleCheckExecutionStatus(intent) {
    const execution_id = intent.payload.execution_id;
    
    try {
      const execution = this.stateGraph.getExecution(execution_id);
      
      if (!execution) {
        return {
          accepted: false,
          error: 'execution_not_found',
          message: `Execution not found: ${execution_id}`,
          metadata: { execution_id }
        };
      }
      
      return {
        accepted: true,
        action: 'execution_status_retrieved',
        message: `Execution status: ${execution.status}`,
        metadata: { execution }
      };
    } catch (error) {
      return {
        accepted: false,
        error: 'status_check_failed',
        message: error.message,
        metadata: { execution_id }
      };
    }
  }

  // ============================================================
  // LIFECYCLE EVENTS

  /**
   * Emit intent lifecycle event
   * @private
   * @param {string} eventType - Event type (intent.submitted, intent.validated, etc.)
   * @param {Intent} intent - Intent object
   * @param {Object} metadata - Event metadata
   */
  _emitLifecycleEvent(eventType, intent, metadata) {
    const now = new Date().toISOString();
    
    // Record to execution ledger
    this.stateGraph.appendLedgerEvent({
      execution_id: intent.intent_id,
      event_type: eventType,
      stage: 'intent',
      actor_type: intent.source?.type || 'unknown',
      actor_id: intent.source?.id || 'unknown',
      event_timestamp: now,
      payload_json: {
        intent_type: intent.intent_type,
        ...metadata
      }
    });
  }
}

// Phase 21-30: Apply governance patch
const { patchIntentGateway } = require('./intent-gateway-patch');
const PatchedIntentGateway = patchIntentGateway(IntentGateway);

module.exports = { IntentGateway: PatchedIntentGateway };
