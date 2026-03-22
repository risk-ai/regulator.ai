/**
 * Chat Action Bridge
 * 
 * Maps operator chat requests into governed local actions.
 * Supports T0 (read-only), T1 (side-effect), T2 (critical) actions.
 * 
 * Phase 7.6: Intent Interpretation Layer
 * - Natural language → normalized execution candidate
 * - Intent classification
 * - Entity extraction
 * - Normalization to canonical actions
 * - Ambiguity handling with safe defaults
 * 
 * Design:
 * - No freeform shell generation
 * - Registered action templates only
 * - Risk-tier classification enforced
 * - Warrant requirements respected
 */

const { nanoid } = require('nanoid');
const { IntentClassifier } = require('./intent-classifier.js');
const { generatePlan } = require('./plan-generator.js');
const { validatePlan } = require('./plan-schema.js');
const { VerificationEngine } = require('./verification-engine.js');
const {
  createVerificationTask,
  createWorkflowOutcome,
  deriveWorkflowStatus
} = require('./verification-schema.js');
const { RemediationExecutor } = require('../execution/remediation-executor.js');

class ChatActionBridge {
  constructor() {
    this.actions = new Map(); // action_id → action definition
    this.endpointManager = null;
    this.stateGraph = null;
    this.policyEngine = null;
    this.intentClassifier = new IntentClassifier();
    this.verificationEngine = new VerificationEngine();
    this._registerDefaultActions();
  }

  /**
   * Set dependencies
   */
  setDependencies(endpointManager, stateGraph) {
    this.endpointManager = endpointManager;
    this.stateGraph = stateGraph;
  }

  /**
   * Set policy engine (Phase 8.4)
   */
  setPolicyEngine(policyEngine) {
    this.policyEngine = policyEngine;
  }

  /**
   * Register a chat action
   * 
   * @param {Object} action - Action definition
   */
  registerAction(action) {
    const {
      action_id,
      action_name,
      risk_tier,
      target_endpoint,
      handler
    } = action;

    if (!action_id || !action_name || !risk_tier || !target_endpoint || !handler) {
      throw new Error('action_id, action_name, risk_tier, target_endpoint, and handler required');
    }

    if (!['T0', 'T1', 'T2'].includes(risk_tier)) {
      throw new Error('risk_tier must be T0, T1, or T2');
    }

    this.actions.set(action_id, action);
  }

  /**
   * Register default local actions
   */
  _registerDefaultActions() {
    // T0 / read-only actions
    this.registerAction({
      action_id: 'show_status',
      action_name: 'Show System Status',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const stateGraph = context.stateGraph;
        
        const services = stateGraph.listServices();
        const providers = stateGraph.listProviders();
        const incidents = stateGraph.listIncidents({ status: 'open' });
        const objectives = stateGraph.listObjectives({ status: 'active' });
        const runtimeContext = stateGraph.listRuntimeContext();

        return {
          success: true,
          data: {
            services: services.length,
            services_degraded: services.filter(s => s.status === 'degraded').length,
            providers: providers.length,
            providers_active: providers.filter(p => p.status === 'active').length,
            open_incidents: incidents.length,
            active_objectives: objectives.length,
            runtime_mode: runtimeContext.find(c => c.context_key === 'runtime_mode')?.context_value || 'unknown'
          }
        };
      }
    });

    this.registerAction({
      action_id: 'show_services',
      action_name: 'Show Services',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const stateGraph = context.stateGraph;
        const filters = args.filters || {};
        const services = stateGraph.listServices(filters);
        
        return {
          success: true,
          data: services
        };
      }
    });

    this.registerAction({
      action_id: 'show_providers',
      action_name: 'Show Providers',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const stateGraph = context.stateGraph;
        const providers = stateGraph.listProviders();
        
        return {
          success: true,
          data: providers
        };
      }
    });

    this.registerAction({
      action_id: 'show_incidents',
      action_name: 'Show Incidents',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const stateGraph = context.stateGraph;
        const filters = args.filters || {};
        const incidents = stateGraph.listIncidents(filters);
        
        return {
          success: true,
          data: incidents
        };
      }
    });

    this.registerAction({
      action_id: 'show_objectives',
      action_name: 'Show Objectives',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const stateGraph = context.stateGraph;
        const filters = args.filters || {};
        const objectives = stateGraph.listObjectives(filters);
        
        return {
          success: true,
          data: objectives
        };
      }
    });

    this.registerAction({
      action_id: 'show_endpoints',
      action_name: 'Show Endpoints',
      risk_tier: 'T0',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const endpointManager = context.endpointManager;
        const endpoints = endpointManager.listEndpoints();
        
        return {
          success: true,
          data: endpoints
        };
      }
    });

    // Remote OpenClaw actions
    this.registerAction({
      action_id: 'query_openclaw_agent',
      action_name: 'Query OpenClaw Agent',
      risk_tier: 'T0',
      target_endpoint: 'openclaw',
      handler: async (args, context) => {
        const { query } = args;
        const endpointManager = context.endpointManager;
        
        if (!query) {
          throw new Error('query required');
        }

        // Send query_agent instruction to OpenClaw endpoint
        const instructionResult = await endpointManager.sendInstruction('openclaw', {
          instruction_type: 'query_agent',
          arguments: { query },
          risk_tier: 'T0'
        });

        return instructionResult;
      }
    });

    // T1 / side-effect actions
    this.registerAction({
      action_id: 'restart_service',
      action_name: 'Restart Service',
      risk_tier: 'T1',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const { service_name } = args;
        
        if (!service_name) {
          throw new Error('service_name required');
        }

        // This would route through Vienna Core executor
        // Placeholder for now
        return {
          success: true,
          message: `Service restart request submitted: ${service_name}`,
          action: 'restart_service',
          target: service_name
        };
      }
    });

    this.registerAction({
      action_id: 'run_recovery_workflow',
      action_name: 'Run Recovery Workflow',
      risk_tier: 'T1',
      target_endpoint: 'local',
      handler: async (args, context) => {
        const { workflow_name } = args;
        
        if (!workflow_name) {
          throw new Error('workflow_name required');
        }

        return {
          success: true,
          message: `Recovery workflow submitted: ${workflow_name}`,
          action: 'run_recovery_workflow',
          workflow: workflow_name
        };
      }
    });
  }

  /**
   * Parse chat request into action
   * 
   * @param {string} request - User chat request
   * @returns {Object|null} Parsed action or null
   */
  parseRequest(request) {
    const lower = request.toLowerCase().trim();

    // T0 patterns
    if (lower === 'show status' || lower === 'status') {
      return {
        action_id: 'show_status',
        arguments: {}
      };
    }

    if (lower === 'show services' || lower === 'services') {
      return {
        action_id: 'show_services',
        arguments: {}
      };
    }

    if (lower === 'show providers' || lower === 'providers') {
      return {
        action_id: 'show_providers',
        arguments: {}
      };
    }

    if (lower === 'show incidents' || lower === 'incidents') {
      return {
        action_id: 'show_incidents',
        arguments: {}
      };
    }

    if (lower === 'show objectives' || lower === 'objectives') {
      return {
        action_id: 'show_objectives',
        arguments: {}
      };
    }

    if (lower === 'show endpoints' || lower === 'endpoints') {
      return {
        action_id: 'show_endpoints',
        arguments: {}
      };
    }

    // Remote OpenClaw patterns
    const askOpenClawMatch = lower.match(/^ask\s+openclaw\s+(.+)$/);
    if (askOpenClawMatch) {
      return {
        action_id: 'query_openclaw_agent',
        arguments: {
          query: askOpenClawMatch[1].trim()
        }
      };
    }

    // T1 patterns
    const restartMatch = lower.match(/^restart\s+(.+)$/);
    if (restartMatch) {
      return {
        action_id: 'restart_service',
        arguments: {
          service_name: restartMatch[1].trim()
        }
      };
    }

    const recoveryMatch = lower.match(/^run\s+recovery\s+(.+)$/);
    if (recoveryMatch) {
      return {
        action_id: 'run_recovery_workflow',
        arguments: {
          workflow_name: recoveryMatch[1].trim()
        }
      };
    }

    return null;
  }

  /**
   * Emit execution ledger event
   * Helper method for Phase 8.3 execution ledger integration
   * 
   * @param {string} executionId - Execution ID
   * @param {string} eventType - Event type
   * @param {string} stage - Lifecycle stage
   * @param {Object} payload - Event payload
   * @param {Object} context - Execution context
   */
  _emitLedgerEvent(executionId, eventType, stage, payload = {}, context = {}) {
    if (!this.stateGraph) return;
    
    try {
      // Get next sequence number for this execution
      const existingEvents = this.stateGraph.getExecutionLedgerEvents(executionId);
      const sequenceNum = existingEvents.length;
      
      const event = {
        event_id: `evt_${nanoid(12)}`,
        execution_id: executionId,
        plan_id: context.plan_id || null,
        verification_id: context.verification_id || null,
        warrant_id: context.warrant_id || null,
        outcome_id: context.outcome_id || null,
        event_type: eventType,
        stage: stage,
        actor_type: context.actor_type || 'operator',
        actor_id: context.actor_id || 'conductor',
        environment: context.environment || this.stateGraph.environment,
        risk_tier: context.risk_tier || null,
        objective: context.objective || null,
        target_type: context.target_type || null,
        target_id: context.target_id || null,
        event_timestamp: new Date().toISOString(),
        sequence_num: sequenceNum,
        status: payload.status || null,
        payload_json: payload,
        evidence_json: payload.evidence || null,
        summary: payload.summary || null
      };
      
      this.stateGraph.appendLedgerEvent(event);
    } catch (error) {
      console.error('Failed to emit ledger event:', error.message);
      // Don't fail the workflow if ledger write fails
    }
  }

  /**
   * Interpret natural language and execute
   * Phase 7.6: Intent Interpretation Layer
   * Phase 8.3: Execution Ledger Integration
   * 
   * @param {string} request - User chat request
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Result with interpretation metadata
   */
  async interpretAndExecute(request, context = {}) {
    // Generate execution ID for this workflow
    const executionId = `exec_${nanoid(12)}`;
    
    // Step 1: Classify intent
    const interpretation = this.intentClassifier.classify(request);
    
    // Emit intent_received event
    this._emitLedgerEvent(executionId, 'intent_received', 'intent', {
      raw_request: request,
      summary: `Intent received: ${request.substring(0, 100)}`
    }, context);
    
    // Emit intent_classified event
    this._emitLedgerEvent(executionId, 'intent_classified', 'intent', {
      intent_type: interpretation.intent_type,
      confidence: interpretation.confidence,
      normalized_action: interpretation.normalized_action,
      summary: `Classified as ${interpretation.intent_type} (confidence: ${interpretation.confidence})`
    }, context);
    
    // Step 2: Handle ambiguity
    if (interpretation.ambiguity.is_ambiguous && interpretation.confidence < 0.5) {
      return {
        success: false,
        error: 'Request is ambiguous',
        interpretation,
        suggestion: interpretation.ambiguity.resolution
      };
    }
    
    // Step 3: Generate plan from intent (Phase 8.1)
    let plan = null;
    if (interpretation.normalized_action) {
      try {
        plan = generatePlan(interpretation);
        
        // Validate plan
        const validation = validatePlan(plan);
        if (!validation.valid) {
          return {
            success: false,
            error: 'Invalid plan generated',
            validation_errors: validation.errors,
            interpretation
          };
        }
        
        // Persist plan to State Graph
        if (this.stateGraph) {
          this.stateGraph.createPlan(plan);
          
          // Emit plan_created event
          this._emitLedgerEvent(executionId, 'plan_created', 'plan', {
            objective: plan.objective,
            steps: plan.steps.map(s => s.action),
            risk_tier: plan.risk_tier,
            verification_type: plan.verification_spec ? plan.verification_spec.verification_type : null,
            summary: `Plan created: ${plan.objective}`
          }, {
            ...context,
            plan_id: plan.plan_id,
            risk_tier: plan.risk_tier,
            objective: plan.objective
          });
        }
        
      } catch (error) {
        // Plan generation failed, continue without plan
        console.warn('Plan generation failed:', error.message);
      }
    }
    
    // Step 3.5: Evaluate policy (Phase 8.4)
    let policyDecision = null;
    if (plan && this.policyEngine) {
      try {
        // Emit policy_evaluation_started event
        this._emitLedgerEvent(executionId, 'policy_evaluation_started', 'policy', {
          plan_id: plan.plan_id,
          objective: plan.objective,
          risk_tier: plan.risk_tier,
          summary: `Policy evaluation started for plan ${plan.plan_id}`
        }, {
          ...context,
          plan_id: plan.plan_id,
          risk_tier: plan.risk_tier,
          objective: plan.objective
        });
        
        // Evaluate plan against policies
        policyDecision = await this.policyEngine.evaluate(plan, context);
        
        // Persist policy decision to State Graph
        if (this.stateGraph) {
          this.stateGraph.savePolicyDecision(policyDecision);
        }
        
        // Emit policy_evaluated event based on decision
        const policyEventType = `policy_evaluated_${policyDecision.decision}`.replace(/_/g, '_');
        this._emitLedgerEvent(executionId, policyEventType, 'policy', {
          decision: policyDecision.decision,
          policy_id: policyDecision.policy_id,
          policy_version: policyDecision.policy_version,
          reasons: policyDecision.reasons,
          approval_required: policyDecision.requirements.approval_required,
          summary: `Policy decision: ${policyDecision.decision}`
        }, {
          ...context,
          plan_id: plan.plan_id,
          risk_tier: plan.risk_tier,
          objective: plan.objective
        });
        
        // Check if policy blocks execution
        if (policyDecision.decision === 'deny') {
          return {
            success: false,
            error: 'Policy denied execution',
            policyDecision,
            reasons: policyDecision.reasons,
            interpretation
          };
        }
        
        // Check if policy requires approval (and approval not yet granted)
        if (policyDecision.requirements.approval_required && !context.approval_granted) {
          return {
            success: false,
            requires_approval: true,
            policyDecision,
            plan,
            interpretation,
            message: 'This action requires operator approval'
          };
        }
        
      } catch (error) {
        console.error('Policy evaluation failed:', error.message);
        // For safety, deny execution if policy evaluation fails
        return {
          success: false,
          error: 'Policy evaluation failed',
          policy_error: error.message,
          interpretation
        };
      }
    }
    
    // Step 4: Execute action (with plan reference if available)
    if (interpretation.normalized_action) {
      const executionContext = {
        ...context,
        plan_id: plan ? plan.plan_id : null,
        execution_id: executionId
      };
      
      // Emit execution_started event
      this._emitLedgerEvent(executionId, 'execution_started', 'execution', {
        action: interpretation.normalized_action.action_id,
        arguments: interpretation.normalized_action.arguments,
        summary: `Execution started: ${interpretation.normalized_action.action_id}`
      }, {
        ...executionContext,
        risk_tier: plan ? plan.risk_tier : 'T0',
        objective: plan ? plan.objective : null
      });
      
      const executionStartTime = Date.now();
      const result = await this._executeNormalizedAction(interpretation.normalized_action, executionContext);
      const executionDuration = Date.now() - executionStartTime;
      
      // Emit execution_completed or execution_failed event
      const executionEventType = result.success ? 'execution_completed' : 'execution_failed';
      this._emitLedgerEvent(executionId, executionEventType, 'execution', {
        status: result.success ? 'success' : 'failed',
        duration_ms: executionDuration,
        action: interpretation.normalized_action.action_id,
        error: result.error || null,
        summary: result.success 
          ? `Execution completed successfully (${executionDuration}ms)`
          : `Execution failed: ${result.error}`
      }, {
        ...executionContext,
        risk_tier: plan ? plan.risk_tier : 'T0',
        objective: plan ? plan.objective : null
      });
      
      // Phase 8.2: Run verification if plan has verification_spec
      let verificationResult = null;
      let workflowOutcome = null;
      
      if (plan && plan.verification_spec && this.stateGraph) {
        // Only run verification if execution succeeded
        // (if execution failed, objective cannot be achieved)
        if (result.success) {
          try {
            // Emit verification_started event
            this._emitLedgerEvent(executionId, 'verification_started', 'verification', {
              verification_type: plan.verification_spec.verification_type,
              required_strength: plan.verification_spec.required_strength,
              summary: `Verification started: ${plan.verification_spec.verification_type}`
            }, {
              ...executionContext,
              risk_tier: plan.risk_tier,
              objective: plan.objective
            });
            
            // Build VerificationTask from plan.verification_spec
            const verificationTask = this._buildVerificationTask(
              plan,
              result,
              executionContext
            );
            
            // Run verification engine
            verificationResult = await this.verificationEngine.runVerification(verificationTask);
            
            // Persist VerificationResult to State Graph
            this.stateGraph.createVerification({
              verification_id: verificationResult.verification_id,
              plan_id: verificationResult.plan_id,
              execution_id: verificationResult.execution_id,
              verification_type: plan.verification_spec.verification_type,
              status: verificationResult.status,
              objective_achieved: verificationResult.objective_achieved,
              verification_strength_target: plan.verification_spec.required_strength,
              verification_strength_achieved: verificationResult.verification_strength_achieved,
              started_at: new Date(verificationResult.started_at).toISOString(),
              completed_at: new Date(verificationResult.completed_at).toISOString(),
              duration_ms: verificationResult.duration_ms,
              summary: verificationResult.summary,
              evidence_json: {
                checks: verificationResult.checks,
                stability: verificationResult.stability
              },
              metadata: verificationResult.metadata || {}
            });
            
            // Emit verification_completed or verification_failed event
            const verificationEventType = verificationResult.status === 'success' 
              ? 'verification_completed' 
              : verificationResult.status === 'inconclusive'
              ? 'verification_inconclusive'
              : 'verification_failed';
            
            this._emitLedgerEvent(executionId, verificationEventType, 'verification', {
              status: verificationResult.status,
              objective_achieved: verificationResult.objective_achieved,
              verification_strength_achieved: verificationResult.verification_strength_achieved,
              duration_ms: verificationResult.duration_ms,
              evidence: {
                checks: verificationResult.checks,
                stability: verificationResult.stability
              },
              summary: verificationResult.summary
            }, {
              ...executionContext,
              verification_id: verificationResult.verification_id,
              risk_tier: plan.risk_tier,
              objective: plan.objective
            });
            
          } catch (error) {
            console.error('Verification failed:', error);
            
            // Emit verification_failed event for exception
            this._emitLedgerEvent(executionId, 'verification_failed', 'verification', {
              status: 'failed',
              error: error.message,
              summary: `Verification exception: ${error.message}`
            }, {
              ...executionContext,
              risk_tier: plan.risk_tier,
              objective: plan.objective
            });
            
            // Continue without verification result
          }
        }
        
        // Derive WorkflowOutcome from execution + verification
        const executionStatus = result.success ? 'success' : 'failed';
        const verificationStatus = verificationResult ? verificationResult.status : null;
        
        const workflowStatus = deriveWorkflowStatus(executionStatus, verificationStatus);
        const objectiveAchieved = verificationResult 
          ? verificationResult.objective_achieved 
          : result.success;
        
        // Generate operator-visible summary
        const summary = this._generateWorkflowSummary(
          plan.objective,
          executionStatus,
          verificationStatus,
          objectiveAchieved
        );
        
        // Create WorkflowOutcome
        workflowOutcome = createWorkflowOutcome({
          plan_id: plan.plan_id,
          execution_id: executionContext.execution_id || null,
          verification_id: verificationResult ? verificationResult.verification_id : null,
          workflow_status: workflowStatus,
          objective_achieved: objectiveAchieved,
          risk_tier: plan.risk_tier,
          execution_status: executionStatus,
          verification_status: verificationStatus,
          operator_visible_summary: summary,
          next_actions: [],
          metadata: {
            interpretation_confidence: interpretation.confidence
          }
        });
        
        // Persist WorkflowOutcome to State Graph
        this.stateGraph.createWorkflowOutcome(workflowOutcome);
        
        // Emit workflow_outcome_finalized event
        this._emitLedgerEvent(executionId, 'workflow_outcome_finalized', 'outcome', {
          workflow_status: workflowStatus,
          objective_achieved: objectiveAchieved,
          execution_status: executionStatus,
          verification_status: verificationStatus,
          final_summary: summary,
          summary: `Workflow finalized: ${workflowStatus}, objective ${objectiveAchieved ? 'achieved' : 'not achieved'}`
        }, {
          ...executionContext,
          outcome_id: workflowOutcome.outcome_id,
          verification_id: verificationResult ? verificationResult.verification_id : null,
          risk_tier: plan.risk_tier,
          objective: plan.objective
        });
        
        // Update plan with outcome reference
        const planUpdate = {
          status: workflowStatus,
          result: result.result || null,
          error: result.error || null,
          actual_duration_ms: executionDuration
        };
        this.stateGraph.updatePlan(plan.plan_id, planUpdate);
      } else {
        // No verification spec - update plan with execution result only
        if (plan && this.stateGraph) {
          const planUpdate = {
            status: result.success ? 'completed' : 'failed',
            result: result.result || null,
            error: result.error || null,
            actual_duration_ms: executionDuration
          };
          this.stateGraph.updatePlan(plan.plan_id, planUpdate);
        }
      }
      
      // Return combined result
      return {
        ...result,
        interpretation,
        execution_id: executionId,
        plan_id: plan ? plan.plan_id : null,
        verification: verificationResult ? {
          verification_id: verificationResult.verification_id,
          status: verificationResult.status,
          objective_achieved: verificationResult.objective_achieved,
          summary: verificationResult.summary
        } : null,
        workflow_outcome: workflowOutcome ? {
          outcome_id: workflowOutcome.outcome_id,
          workflow_status: workflowOutcome.workflow_status,
          objective_achieved: workflowOutcome.objective_achieved,
          summary: workflowOutcome.operator_visible_summary
        } : null
      };
    }
    
    // Step 5: Fallback to pattern matching (backward compatibility)
    const parsedAction = this.parseRequest(request);
    
    if (parsedAction) {
      const result = await this._executeParsedAction(parsedAction, context);
      return {
        ...result,
        interpretation,
        fallback_used: true
      };
    }
    
    // Step 6: No execution path found
    return {
      success: false,
      error: 'Request not recognized',
      interpretation,
      suggestion: interpretation.ambiguity.resolution || 'Try "show status", "ask openclaw [question]", or "restart [service]"'
    };
  }

  /**
   * Execute normalized action from intent classifier
   */
  async _executeNormalizedAction(normalizedAction, context) {
    const { action_id, arguments: args } = normalizedAction;
    
    const action = this.actions.get(action_id);
    
    if (!action) {
      return {
        success: false,
        error: `Action not found: ${action_id}`,
        recognized: false
      };
    }

    // Build execution context
    const execContext = {
      stateGraph: this.stateGraph,
      endpointManager: this.endpointManager,
      ...context
    };

    // Execute action
    try {
      const result = await action.handler(args, execContext);
      
      return {
        success: true,
        action_id: action.action_id,
        action_name: action.action_name,
        risk_tier: action.risk_tier,
        target_endpoint: action.target_endpoint,
        result
      };
    } catch (error) {
      return {
        success: false,
        action_id: action.action_id,
        action_name: action.action_name,
        error: error.message
      };
    }
  }

  /**
   * Execute parsed action (backward compatibility)
   */
  async _executeParsedAction(parsedAction, context) {
    const action = this.actions.get(parsedAction.action_id);
    
    if (!action) {
      return {
        success: false,
        error: `Action not found: ${parsedAction.action_id}`,
        recognized: false
      };
    }

    // Build execution context
    const execContext = {
      stateGraph: this.stateGraph,
      endpointManager: this.endpointManager,
      ...context
    };

    // Execute action
    try {
      const result = await action.handler(parsedAction.arguments, execContext);
      
      return {
        success: true,
        action_id: action.action_id,
        action_name: action.action_name,
        risk_tier: action.risk_tier,
        target_endpoint: action.target_endpoint,
        result
      };
    } catch (error) {
      return {
        success: false,
        action_id: action.action_id,
        action_name: action.action_name,
        error: error.message
      };
    }
  }

  /**
   * Build VerificationTask from plan.verification_spec
   * 
   * @param {Object} plan - Plan object with verification_spec
   * @param {Object} executionResult - Result from execution
   * @param {Object} context - Execution context
   * @returns {Object} VerificationTask
   */
  _buildVerificationTask(plan, executionResult, context) {
    const verificationSpec = plan.verification_spec;
    
    return createVerificationTask({
      plan_id: plan.plan_id,
      execution_id: context.execution_id || null,
      objective: plan.objective,
      verification_type: verificationSpec.verification_type,
      scope: {
        plan: plan.plan_id,
        action: plan.steps[0].action,
        executor: plan.steps[0].executor
      },
      postconditions: verificationSpec.postconditions || [],
      verification_strength: verificationSpec.required_strength,
      timeout_ms: verificationSpec.timeout_ms || 15000,
      stability_window_ms: verificationSpec.stability_window_ms || 0,
      retry_policy: { max_attempts: 3, backoff_ms: 1000 },
      created_by: 'chat-action-bridge'
    });
  }

  /**
   * Generate operator-visible workflow summary
   * 
   * @param {string} objective - Plan objective
   * @param {string} executionStatus - Execution status (success/failed)
   * @param {string} verificationStatus - Verification status (success/failed/etc)
   * @param {boolean} objectiveAchieved - Whether objective was achieved
   * @returns {string} Human-readable summary
   */
  _generateWorkflowSummary(objective, executionStatus, verificationStatus, objectiveAchieved) {
    if (executionStatus === 'failed') {
      return `${objective}: Execution failed`;
    }
    
    if (!verificationStatus) {
      return `${objective}: Completed (no verification)`;
    }
    
    if (objectiveAchieved && verificationStatus === 'success') {
      return `${objective}: Completed successfully with verification`;
    }
    
    if (verificationStatus === 'failed') {
      return `${objective}: Execution succeeded but verification failed`;
    }
    
    if (verificationStatus === 'inconclusive') {
      return `${objective}: Execution succeeded but verification was inconclusive`;
    }
    
    if (verificationStatus === 'timed_out') {
      return `${objective}: Execution succeeded but verification timed out`;
    }
    
    return `${objective}: ${executionStatus}`;
  }

  /**
   * Execute chat action (legacy method, calls interpretAndExecute)
   * 
   * @param {string} request - User chat request
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Result
   */
  async executeRequest(request, context = {}) {
    return this.interpretAndExecute(request, context);
  }

  /**
   * List all registered actions
   * 
   * @returns {Array} All actions
   */
  listActions() {
    return Array.from(this.actions.values()).map(action => ({
      action_id: action.action_id,
      action_name: action.action_name,
      risk_tier: action.risk_tier,
      target_endpoint: action.target_endpoint
    }));
  }

  /**
   * Execute a plan directly (Phase 9.5 — Remediation Trigger Integration)
   * 
   * Used by objective remediation to execute pre-created plans through the
   * governed pipeline (Policy → Warrant → Execution → Verification).
   * 
   * @param {string} planId - Plan ID to execute
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result with verification
   */
  async executePlan(planId, context = {}) {
    if (!this.stateGraph) {
      throw new Error('State Graph not initialized');
    }

    // Load plan from State Graph
    const plan = this.stateGraph.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Generate execution ID
    const execution_id = `exec_${Date.now()}_${nanoid(8)}`;
    context.execution_id = execution_id;

    // Emit ledger event: execution_started
    if (this.stateGraph) {
      this.stateGraph.appendLedgerEvent({
        execution_id,
        event_type: 'execution_started',
        event_timestamp: new Date().toISOString(),
        plan_id: planId,
        intent_text: plan.objective,
        event_payload: {
          plan_id: planId,
          objective: plan.objective,
          risk_tier: plan.risk_tier,
          source: 'remediation_trigger'
        }
      });
    }

    // Phase 8.4: Policy evaluation
    let policyDecision = null;
    if (this.policyEngine) {
      policyDecision = await this.policyEngine.evaluatePolicies(
        plan.objective,
        plan.steps[0].action,
        plan.risk_tier,
        context
      );

      // Emit ledger event: policy_evaluated
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'policy_evaluated_' + (policyDecision.requires_approval ? 'requires_approval' : 'no_approval'),
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          event_payload: {
            decision: policyDecision.decision,
            matched_policy: policyDecision.matched_policy,
            requires_approval: policyDecision.requires_approval
          }
        });
      }

      if (policyDecision.decision === 'deny') {
        return {
          status: 'denied',
          plan_id: planId,
          execution_id,
          policy_decision: policyDecision,
          message: policyDecision.reason || 'Execution denied by policy'
        };
      }

      if (policyDecision.requires_approval) {
        // Emit ledger event: approval_requested
        if (this.stateGraph) {
          this.stateGraph.appendLedgerEvent({
            execution_id,
            event_type: 'approval_requested',
            event_timestamp: new Date().toISOString(),
            plan_id: planId,
            intent_text: plan.objective,
            event_payload: {
              policy_id: policyDecision.matched_policy,
              reason: policyDecision.reason
            }
          });
        }

        return {
          status: 'approval_required',
          plan_id: planId,
          execution_id,
          policy_decision: policyDecision,
          message: 'Approval required before execution'
        };
      }
    }

    // Execute first step (Vienna Core currently supports single-step plans)
    // Multi-step execution is Phase 8.5
    const step = plan.steps[0];
    const action = this.actions.get(step.action);

    if (!action) {
      const error = `Unknown action: ${step.action}`;
      
      // Emit ledger event: execution_failed
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'execution_failed',
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          event_payload: { error }
        });
      }

      return {
        status: 'failed',
        plan_id: planId,
        execution_id,
        error,
        policy_decision: policyDecision
      };
    }

    // Execute action
    let executionResult;
    try {
      executionResult = await action.handler(step.args, {
        ...context,
        stateGraph: this.stateGraph,
        endpointManager: this.endpointManager,
        plan_id: planId,
        execution_id
      });

      // Emit ledger event: execution_completed
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'execution_completed',
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          event_payload: {
            action: step.action,
            status: executionResult.status || 'success'
          }
        });
      }

    } catch (error) {
      // Emit ledger event: execution_failed
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'execution_failed',
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          event_payload: {
            error: error.message,
            stack: error.stack
          }
        });
      }

      return {
        status: 'failed',
        plan_id: planId,
        execution_id,
        error: error.message,
        policy_decision: policyDecision
      };
    }

    // Phase 8.2: Verification
    let verificationResult = null;
    let workflowOutcome = null;

    if (plan.verification_spec) {
      // Build verification task from plan
      const verificationTask = this._buildVerificationTask(plan, executionResult, context);

      // Emit ledger event: verification_started
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'verification_started',
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          event_payload: {
            verification_type: verificationTask.verification_type,
            postconditions: verificationTask.postconditions
          }
        });
      }

      // Run verification
      verificationResult = await this.verificationEngine.runVerification(verificationTask, context);

      // Persist verification result
      const verificationId = this.stateGraph.createVerification(verificationResult);
      verificationResult.verification_id = verificationId;

      // Emit ledger event: verification_completed/failed/inconclusive
      const verificationEventType = verificationResult.overall_status === 'success'
        ? 'verification_completed'
        : verificationResult.overall_status === 'failed'
        ? 'verification_failed'
        : 'verification_inconclusive';

      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: verificationEventType,
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          verification_id: verificationId,
          event_payload: {
            overall_status: verificationResult.overall_status,
            objective_achieved: verificationResult.objective_achieved,
            failed_checks: verificationResult.failed_checks
          }
        });
      }

      // Derive workflow outcome
      const executionStatus = executionResult.status === 'success' || executionResult.success ? 'success' : 'failed';
      const verificationStatus = verificationResult.overall_status;
      const workflowStatus = deriveWorkflowStatus(executionStatus, verificationStatus);

      workflowOutcome = createWorkflowOutcome({
        plan_id: planId,
        execution_id,
        verification_id: verificationId,
        execution_status: executionStatus,
        verification_status: verificationStatus,
        workflow_status: workflowStatus,
        objective_achieved: verificationResult.objective_achieved,
        summary: this._generateWorkflowSummary(
          plan.objective,
          executionStatus,
          verificationStatus,
          verificationResult.objective_achieved
        ),
        metadata: {
          execution_result: executionResult,
          verification_result: verificationResult
        }
      });

      // Persist workflow outcome
      const outcomeId = this.stateGraph.createWorkflowOutcome(workflowOutcome);
      workflowOutcome.outcome_id = outcomeId;

      // Update plan with outcome reference
      this.stateGraph.updatePlan(planId, {
        outcome_id: outcomeId,
        status: workflowStatus === 'success' ? 'completed' : 'failed'
      });

      // Emit ledger event: workflow_outcome_finalized
      if (this.stateGraph) {
        this.stateGraph.appendLedgerEvent({
          execution_id,
          event_type: 'workflow_outcome_finalized',
          event_timestamp: new Date().toISOString(),
          plan_id: planId,
          intent_text: plan.objective,
          verification_id: verificationId,
          outcome_id: outcomeId,
          event_payload: {
            workflow_status: workflowStatus,
            objective_achieved: verificationResult.objective_achieved,
            summary: workflowOutcome.summary
          }
        });
      }
    }

    return {
      status: workflowOutcome ? workflowOutcome.workflow_status : (executionResult.status || 'success'),
      plan_id: planId,
      execution_id,
      execution_result: executionResult,
      verification_result: verificationResult,
      workflow_outcome: workflowOutcome,
      policy_decision: policyDecision,
      message: workflowOutcome ? workflowOutcome.summary : executionResult.message
    };
  }

  /**
   * Execute remediation plan (Phase 9.7.3)
   * 
   * Uses RemediationExecutor for governed action execution.
   * 
   * @param {string} planId - Plan ID
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async executeRemediationPlan(planId, context = {}) {
    if (!this.stateGraph) {
      throw new Error('State Graph not initialized');
    }

    // Load plan from State Graph
    const plan = this.stateGraph.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Generate execution ID
    const execution_id = `exec_${Date.now()}_${nanoid(8)}`;
    context.execution_id = execution_id;
    context.plan_id = planId;

    // Initialize RemediationExecutor
    const executor = new RemediationExecutor(this.stateGraph);

    // Execute plan
    try {
      const planResult = await executor.executePlan(plan, context);

      // Check success
      const success = planResult.completed;

      // Build verification task if plan succeeded
      let verificationResult = null;
      if (success && plan.verification_spec) {
        const verificationTask = createVerificationTask({
          plan_id: planId,
          execution_id,
          verification_spec: plan.verification_spec,
          execution_context: context
        });

        verificationResult = await this.verificationEngine.runVerification(verificationTask, context);

        // Persist verification
        const verificationId = this.stateGraph.createVerification(verificationResult);
        verificationResult.verification_id = verificationId;
      }

      // Derive workflow outcome
      const workflowStatus = success && verificationResult?.objective_achieved ? 'success' : 'failed';

      return {
        status: workflowStatus,
        plan_id: planId,
        execution_id,
        execution_result: {
          success,
          steps: planResult.steps
        },
        verification_result: verificationResult,
        workflow_outcome: {
          workflow_status: workflowStatus,
          objective_achieved: verificationResult?.objective_achieved ?? false
        }
      };
    } catch (error) {
      return {
        status: 'failed',
        plan_id: planId,
        execution_id,
        error: error.message
      };
    }
  }
}

module.exports = { ChatActionBridge };
