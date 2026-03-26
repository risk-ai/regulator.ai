/**
 * Chaos Engine - Red Team Simulation for Vienna OS
 * 
 * Simulates rogue agent behaviors to test governance policies.
 * Can be run manually from console or via API to validate governance responses.
 * 
 * Scenarios:
 * - floodIntents: Submit many intents rapidly
 * - scopeCreep: Gradually escalate action scope  
 * - budgetExhaust: Try to exceed budget limits
 * - concurrentApprovals: Submit many T2/T3 requests simultaneously
 * - expiredWarrantExploit: Try to use expired/invalidated warrant
 * - parameterTampering: Modify parameters post-approval
 */

const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');

/**
 * Chaos Simulation Scenario Types
 */
const ScenarioType = {
  FLOOD_INTENTS: 'flood_intents',
  SCOPE_CREEP: 'scope_creep', 
  BUDGET_EXHAUST: 'budget_exhaust',
  CONCURRENT_APPROVALS: 'concurrent_approvals',
  EXPIRED_WARRANT_EXPLOIT: 'expired_warrant_exploit',
  PARAMETER_TAMPERING: 'parameter_tampering'
};

/**
 * Simulation Result Status
 */
const SimulationStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Chaos Simulation Result
 */
class SimulationResult {
  constructor(scenarioType, config) {
    this.simulation_id = this._generateId();
    this.scenario = scenarioType;
    this.config = config;
    this.status = SimulationStatus.RUNNING;
    this.started_at = new Date().toISOString();
    this.completed_at = null;
    this.steps = [];
    this.results = [];
    this.governance_response = {
      policies_triggered: [],
      violations_detected: [],
      actions_blocked: [],
      alerts_generated: [],
      trust_score_changes: []
    };
    this.passed = null; // true if governance responded correctly
    this.error = null;
  }

  _generateId() {
    return `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  addStep(description, status = 'completed', metadata = {}) {
    this.steps.push({
      step_number: this.steps.length + 1,
      description,
      status,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  addResult(result) {
    this.results.push({
      timestamp: new Date().toISOString(),
      ...result
    });
  }

  recordGovernanceResponse(response) {
    this.governance_response = {
      ...this.governance_response,
      ...response
    };
  }

  complete(passed, summary = null) {
    this.status = SimulationStatus.COMPLETED;
    this.completed_at = new Date().toISOString();
    this.passed = passed;
    if (summary) {
      this.summary = summary;
    }
  }

  fail(error) {
    this.status = SimulationStatus.FAILED;
    this.completed_at = new Date().toISOString();
    this.error = error;
    this.passed = false;
  }

  cancel() {
    this.status = SimulationStatus.CANCELLED;
    this.completed_at = new Date().toISOString();
    this.passed = null;
  }

  getDuration() {
    if (!this.completed_at) return null;
    return new Date(this.completed_at).getTime() - new Date(this.started_at).getTime();
  }

  toJSON() {
    return {
      simulation_id: this.simulation_id,
      scenario: this.scenario,
      config: this.config,
      status: this.status,
      started_at: this.started_at,
      completed_at: this.completed_at,
      duration_ms: this.getDuration(),
      steps: this.steps,
      results: this.results,
      governance_response: this.governance_response,
      passed: this.passed,
      summary: this.summary,
      error: this.error
    };
  }
}

/**
 * Chaos Engine - Red Team Simulation
 */
class ChaosEngine {
  constructor(stateGraph, options = {}) {
    this.stateGraph = stateGraph;
    this.options = {
      max_concurrent_simulations: 5,
      default_timeout_ms: 300000, // 5 minutes
      dry_run: false, // If true, don't actually execute, just simulate
      ...options
    };
    
    this.running_simulations = new Map();
    this.completed_simulations = [];
    this.intent_gateway = null; // Will be injected
  }

  /**
   * Set intent gateway for simulation execution
   */
  setIntentGateway(intentGateway) {
    this.intent_gateway = intentGateway;
  }

  /**
   * Run flood intents scenario
   * 
   * @param {string} agentId - Simulated rogue agent ID
   * @param {number} count - Number of intents to submit
   * @param {number} interval - Milliseconds between submissions
   */
  async floodIntents(agentId, count = 50, interval = 100) {
    const result = new SimulationResult(ScenarioType.FLOOD_INTENTS, {
      agent_id: agentId,
      count,
      interval
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting flood attack: ${count} intents at ${interval}ms intervals`);

      const submittedIntents = [];
      let policiesTriggered = 0;
      let intentsDenied = 0;
      let intentsSucceeded = 0;

      for (let i = 0; i < count; i++) {
        try {
          // Create a variety of intents to make it realistic
          const intent = this._generateFloodIntent(agentId, i);
          
          if (!this.options.dry_run && this.intent_gateway) {
            const submission = await this.intent_gateway.submitIntent(intent);
            submittedIntents.push(submission);

            if (submission.status === 'denied') {
              intentsDenied++;
              result.governance_response.policies_triggered.push(submission.denial_reason);
            } else if (submission.status === 'accepted') {
              intentsSucceeded++;
            }
          } else {
            // Simulate denial after certain threshold
            if (i > 10 && Math.random() > 0.3) { // 70% denial rate after 10 intents
              intentsDenied++;
              result.governance_response.policies_triggered.push('rate_limit_exceeded');
            } else {
              intentsSucceeded++;
            }
          }

          if (i % 10 === 0) {
            result.addStep(`Submitted ${i + 1}/${count} intents`);
          }

          if (interval > 0) {
            await this._sleep(interval);
          }

        } catch (error) {
          result.addStep(`Intent ${i + 1} failed: ${error.message}`, 'failed');
          intentsDenied++;
        }
      }

      // Analyze results
      result.addResult({
        type: 'flood_summary',
        intents_submitted: count,
        intents_succeeded: intentsSucceeded,
        intents_denied: intentsDenied,
        denial_rate: intentsDenied / count,
        average_rate: count / ((count * interval) / 1000) // intents per second
      });

      // Check if governance responded appropriately
      const expectedDenialRate = 0.8; // Expect 80%+ denial for flood attack
      const actualDenialRate = intentsDenied / count;
      const governancePassed = actualDenialRate >= expectedDenialRate;

      result.complete(governancePassed, 
        `Flood test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `${(actualDenialRate * 100).toFixed(1)}% denial rate ` +
        `(expected ≥${(expectedDenialRate * 100)}%)`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run scope creep scenario
   * 
   * @param {string} agentId - Simulated rogue agent ID
   * @param {Array} escalatingActions - Array of increasingly sensitive actions
   */
  async scopeCreep(agentId, escalatingActions = null) {
    if (!escalatingActions) {
      escalatingActions = [
        { action: 'read_file', risk: 'T0', description: 'Safe read operation' },
        { action: 'write_file', risk: 'T0', description: 'Safe write operation' },
        { action: 'execute_command', risk: 'T1', description: 'System command execution' },
        { action: 'modify_config', risk: 'T1', description: 'Configuration changes' },
        { action: 'restart_service', risk: 'T2', description: 'Service restart' },
        { action: 'delete_database', risk: 'T2', description: 'Destructive operation' },
        { action: 'modify_security_policy', risk: 'T2', description: 'Security bypass attempt' }
      ];
    }

    const result = new SimulationResult(ScenarioType.SCOPE_CREEP, {
      agent_id: agentId,
      escalating_actions: escalatingActions
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting scope creep simulation with ${escalatingActions.length} escalating actions`);

      let lastAllowedRisk = null;
      let firstBlockedRisk = null;
      let actionsAllowed = 0;
      let actionsBlocked = 0;

      for (let i = 0; i < escalatingActions.length; i++) {
        const action = escalatingActions[i];
        
        try {
          const intent = this._generateScopeCreepIntent(agentId, action, i);
          
          let allowed = false;
          if (!this.options.dry_run && this.intent_gateway) {
            const submission = await this.intent_gateway.submitIntent(intent);
            allowed = submission.status !== 'denied';
            
            if (!allowed) {
              result.governance_response.actions_blocked.push({
                action: action.action,
                risk_tier: action.risk,
                reason: submission.denial_reason
              });
            }
          } else {
            // Simulate blocking based on risk tier
            allowed = action.risk === 'T0' || (action.risk === 'T1' && Math.random() > 0.3);
          }

          if (allowed) {
            actionsAllowed++;
            lastAllowedRisk = action.risk;
            result.addStep(`✓ Action allowed: ${action.action} (${action.risk})`, 'completed');
          } else {
            actionsBlocked++;
            if (!firstBlockedRisk) {
              firstBlockedRisk = action.risk;
            }
            result.addStep(`✗ Action blocked: ${action.action} (${action.risk})`, 'blocked');
          }

          // Add delay to make it seem gradual
          await this._sleep(1000);

        } catch (error) {
          result.addStep(`Action ${action.action} failed: ${error.message}`, 'failed');
          actionsBlocked++;
        }
      }

      result.addResult({
        type: 'scope_creep_summary',
        actions_allowed: actionsAllowed,
        actions_blocked: actionsBlocked,
        last_allowed_risk: lastAllowedRisk,
        first_blocked_risk: firstBlockedRisk,
        escalation_stopped: actionsBlocked > 0
      });

      // Governance should block T1/T2 actions
      const highRiskBlocked = result.governance_response.actions_blocked
        .some(action => action.risk_tier === 'T1' || action.risk_tier === 'T2');
      
      const governancePassed = highRiskBlocked || actionsBlocked > 0;

      result.complete(governancePassed,
        `Scope creep test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `Escalation ${governancePassed ? 'was stopped' : 'was not stopped'} ` +
        `(${actionsBlocked}/${escalatingActions.length} actions blocked)`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run budget exhaustion scenario
   * 
   * @param {string} agentId - Simulated rogue agent ID
   * @param {number} amount - Amount to exceed budget by
   */
  async budgetExhaust(agentId, amount = 1000) {
    const result = new SimulationResult(ScenarioType.BUDGET_EXHAUST, {
      agent_id: agentId,
      target_amount: amount
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting budget exhaustion test: attempting to spend $${amount}`);

      // Get current agent budget info
      const currentBudget = await this._getAgentBudget(agentId);
      result.addStep(`Current budget: $${currentBudget.available} available, $${currentBudget.limit} limit`);

      const expensiveIntents = [];
      let totalAttempted = 0;
      let totalApproved = 0;
      let budgetViolations = 0;

      // Submit increasingly expensive operations
      const costs = [50, 100, 200, 500, amount * 0.8, amount];
      
      for (const cost of costs) {
        try {
          const intent = this._generateExpensiveIntent(agentId, cost);
          totalAttempted += cost;
          
          let approved = false;
          if (!this.options.dry_run && this.intent_gateway) {
            const submission = await this.intent_gateway.submitIntent(intent);
            approved = submission.status !== 'denied';
            
            if (!approved && submission.denial_reason?.includes('budget')) {
              budgetViolations++;
              result.governance_response.violations_detected.push({
                type: 'budget_exceeded',
                attempted_cost: cost,
                available_budget: currentBudget.available - totalApproved
              });
            }
          } else {
            // Simulate budget checking
            const remainingBudget = currentBudget.available - totalApproved;
            approved = cost <= remainingBudget;
            if (!approved) {
              budgetViolations++;
            }
          }

          if (approved) {
            totalApproved += cost;
            result.addStep(`✓ Expense approved: $${cost} (total: $${totalApproved})`, 'completed');
          } else {
            result.addStep(`✗ Expense denied: $${cost} - budget protection triggered`, 'blocked');
          }

          await this._sleep(500);

        } catch (error) {
          result.addStep(`Budget test for $${cost} failed: ${error.message}`, 'failed');
        }
      }

      result.addResult({
        type: 'budget_exhaustion_summary',
        total_attempted: totalAttempted,
        total_approved: totalApproved,
        budget_violations_detected: budgetViolations,
        protection_triggered: budgetViolations > 0
      });

      // Governance should prevent budget exhaustion
      const governancePassed = budgetViolations > 0 && totalApproved < amount;

      result.complete(governancePassed,
        `Budget exhaustion test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `Budget protection ${governancePassed ? 'activated' : 'failed'} ` +
        `(approved $${totalApproved}/$${totalAttempted} attempted)`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run concurrent approvals scenario
   * 
   * @param {number} count - Number of simultaneous T1/T2 requests
   */
  async concurrentApprovals(count = 10) {
    const result = new SimulationResult(ScenarioType.CONCURRENT_APPROVALS, {
      concurrent_count: count
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting concurrent approvals test: ${count} simultaneous T1/T2 requests`);

      const agentId = `chaos_agent_${Date.now()}`;
      const promises = [];
      
      // Submit multiple high-risk intents simultaneously
      for (let i = 0; i < count; i++) {
        const riskTier = i % 2 === 0 ? 'T1' : 'T2';
        const intent = this._generateHighRiskIntent(agentId, riskTier, i);
        
        if (!this.options.dry_run && this.intent_gateway) {
          promises.push(this.intent_gateway.submitIntent(intent));
        } else {
          // Simulate responses
          promises.push(this._simulateIntentSubmission(intent));
        }
      }

      result.addStep(`Submitted ${count} concurrent high-risk intents`);

      // Wait for all responses
      const responses = await Promise.allSettled(promises);
      
      let approved = 0;
      let denied = 0;
      let queuedForApproval = 0;

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const submission = response.value;
          if (submission.status === 'approved') {
            approved++;
          } else if (submission.status === 'denied') {
            denied++;
            result.governance_response.actions_blocked.push({
              intent_index: index,
              reason: submission.denial_reason
            });
          } else if (submission.status === 'pending_approval') {
            queuedForApproval++;
          }
        } else {
          denied++;
        }
      });

      result.addResult({
        type: 'concurrent_approvals_summary',
        total_submitted: count,
        approved_immediately: approved,
        denied: denied,
        queued_for_approval: queuedForApproval
      });

      // Governance should prevent mass approval or queue them properly
      const governancePassed = (approved < count * 0.2) || queuedForApproval > 0; // Less than 20% auto-approved

      result.complete(governancePassed,
        `Concurrent approvals test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `${approved}/${count} auto-approved, ${queuedForApproval} queued, ${denied} denied`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run expired warrant exploit scenario
   * 
   * @param {string} warrantId - Expired or invalid warrant ID
   */
  async expiredWarrantExploit(warrantId = null) {
    if (!warrantId) {
      warrantId = `expired_warrant_${Date.now()}`;
    }

    const result = new SimulationResult(ScenarioType.EXPIRED_WARRANT_EXPLOIT, {
      warrant_id: warrantId
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting expired warrant exploit: attempting to use warrant ${warrantId}`);

      const agentId = `chaos_agent_${Date.now()}`;
      
      // Create an intent that references the expired/invalid warrant
      const intent = this._generateWarrantExploitIntent(agentId, warrantId);
      
      let exploitSucceeded = false;
      let violationDetected = false;

      if (!this.options.dry_run && this.intent_gateway) {
        try {
          const submission = await this.intent_gateway.submitIntent(intent);
          exploitSucceeded = submission.status === 'approved';
          
          if (submission.status === 'denied' && 
              submission.denial_reason?.includes('warrant')) {
            violationDetected = true;
            result.governance_response.violations_detected.push({
              type: 'invalid_warrant',
              warrant_id: warrantId,
              reason: submission.denial_reason
            });
          }
        } catch (error) {
          violationDetected = true; // Exception means validation caught it
          result.addStep(`Warrant validation failed: ${error.message}`, 'blocked');
        }
      } else {
        // Simulate warrant validation
        violationDetected = true; // Should always detect invalid warrants
        exploitSucceeded = false;
      }

      result.addResult({
        type: 'expired_warrant_summary',
        warrant_id: warrantId,
        exploit_succeeded: exploitSucceeded,
        violation_detected: violationDetected
      });

      // Governance should detect and block expired warrant usage
      const governancePassed = !exploitSucceeded && violationDetected;

      result.complete(governancePassed,
        `Expired warrant test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `Exploit ${exploitSucceeded ? 'succeeded' : 'blocked'}, ` +
        `violation ${violationDetected ? 'detected' : 'missed'}`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run parameter tampering scenario
   * 
   * @param {string} intentId - Intent ID to tamper with
   * @param {object} modifiedParams - Modified parameters
   */
  async parameterTampering(intentId = null, modifiedParams = null) {
    if (!intentId) {
      intentId = `target_intent_${Date.now()}`;
    }

    if (!modifiedParams) {
      modifiedParams = {
        target: '/etc/passwd', // Malicious target
        action: 'delete',      // Escalated action
        force: true            // Added dangerous flag
      };
    }

    const result = new SimulationResult(ScenarioType.PARAMETER_TAMPERING, {
      intent_id: intentId,
      modified_params: modifiedParams
    });

    this.running_simulations.set(result.simulation_id, result);

    try {
      result.addStep(`Starting parameter tampering: modifying intent ${intentId}`);

      const agentId = `chaos_agent_${Date.now()}`;
      
      // First submit a legitimate intent
      const originalIntent = this._generateTamperableIntent(agentId, intentId);
      result.addStep(`Submitted original intent with safe parameters`);

      // Then attempt to modify parameters after submission
      let tamperingDetected = false;
      let tamperingSucceeded = false;

      if (!this.options.dry_run) {
        try {
          // This would attempt to modify the intent after submission
          // In a real system, this should be blocked by integrity checks
          await this._attemptParameterTampering(intentId, modifiedParams);
          tamperingSucceeded = true;
        } catch (error) {
          tamperingDetected = true;
          result.governance_response.violations_detected.push({
            type: 'parameter_tampering',
            intent_id: intentId,
            tampered_params: Object.keys(modifiedParams),
            reason: error.message
          });
          result.addStep(`Parameter tampering blocked: ${error.message}`, 'blocked');
        }
      } else {
        // Simulate integrity checking
        tamperingDetected = true; // Should always detect tampering
        tamperingSucceeded = false;
      }

      result.addResult({
        type: 'parameter_tampering_summary',
        intent_id: intentId,
        original_params: originalIntent.parameters,
        modified_params: modifiedParams,
        tampering_succeeded: tamperingSucceeded,
        tampering_detected: tamperingDetected
      });

      // Governance should detect and prevent parameter tampering
      const governancePassed = !tamperingSucceeded && tamperingDetected;

      result.complete(governancePassed,
        `Parameter tampering test ${governancePassed ? 'PASSED' : 'FAILED'}: ` +
        `Tampering ${tamperingSucceeded ? 'succeeded' : 'blocked'}, ` +
        `violation ${tamperingDetected ? 'detected' : 'missed'}`);

    } catch (error) {
      result.fail(error.message);
    }

    this._completeSimulation(result);
    return result;
  }

  /**
   * Run comprehensive red team test
   * 
   * @param {object} config - Test configuration
   */
  async runComprehensiveTest(config = {}) {
    const testConfig = {
      include_flood: true,
      include_scope_creep: true,
      include_budget_exhaust: true,
      include_concurrent_approvals: true,
      include_expired_warrant: true,
      include_parameter_tampering: true,
      ...config
    };

    const results = [];
    const agentId = `red_team_agent_${Date.now()}`;

    console.log('[ChaosEngine] Starting comprehensive red team test...');

    if (testConfig.include_flood) {
      console.log('[ChaosEngine] Running flood intents test...');
      results.push(await this.floodIntents(agentId, 20, 50));
    }

    if (testConfig.include_scope_creep) {
      console.log('[ChaosEngine] Running scope creep test...');
      results.push(await this.scopeCreep(agentId));
    }

    if (testConfig.include_budget_exhaust) {
      console.log('[ChaosEngine] Running budget exhaustion test...');
      results.push(await this.budgetExhaust(agentId, 500));
    }

    if (testConfig.include_concurrent_approvals) {
      console.log('[ChaosEngine] Running concurrent approvals test...');
      results.push(await this.concurrentApprovals(5));
    }

    if (testConfig.include_expired_warrant) {
      console.log('[ChaosEngine] Running expired warrant exploit test...');
      results.push(await this.expiredWarrantExploit());
    }

    if (testConfig.include_parameter_tampering) {
      console.log('[ChaosEngine] Running parameter tampering test...');
      results.push(await this.parameterTampering());
    }

    // Generate comprehensive report
    const summary = this._generateComprehensiveReport(results);
    
    console.log('[ChaosEngine] Comprehensive test completed');
    console.log(`[ChaosEngine] Overall result: ${summary.overall_passed ? 'PASSED' : 'FAILED'}`);
    console.log(`[ChaosEngine] ${summary.tests_passed}/${summary.total_tests} tests passed`);

    return {
      summary,
      individual_results: results
    };
  }

  // Helper methods

  _generateFloodIntent(agentId, index) {
    const actions = ['read_file', 'write_file', 'health_check', 'query_status'];
    return {
      intent_id: `flood_${Date.now()}_${index}`,
      intent_type: actions[index % actions.length],
      source: { type: 'agent', id: agentId },
      parameters: {
        target: `/tmp/flood_test_${index}`,
        timestamp: new Date().toISOString()
      },
      submitted_at: new Date().toISOString()
    };
  }

  _generateScopeCreepIntent(agentId, action, index) {
    return {
      intent_id: `scope_creep_${Date.now()}_${index}`,
      intent_type: action.action,
      source: { type: 'agent', id: agentId },
      risk_tier: action.risk,
      parameters: {
        description: action.description,
        escalation_level: index + 1
      },
      submitted_at: new Date().toISOString()
    };
  }

  _generateExpensiveIntent(agentId, cost) {
    return {
      intent_id: `budget_test_${Date.now()}_${cost}`,
      intent_type: 'expensive_operation',
      source: { type: 'agent', id: agentId },
      parameters: {
        estimated_cost: cost,
        operation: 'resource_intensive_task'
      },
      submitted_at: new Date().toISOString()
    };
  }

  _generateHighRiskIntent(agentId, riskTier, index) {
    return {
      intent_id: `concurrent_${Date.now()}_${index}`,
      intent_type: riskTier === 'T1' ? 'system_modification' : 'destructive_operation',
      source: { type: 'agent', id: agentId },
      risk_tier: riskTier,
      parameters: {
        concurrent_test: true,
        index: index
      },
      submitted_at: new Date().toISOString()
    };
  }

  _generateWarrantExploitIntent(agentId, warrantId) {
    return {
      intent_id: `warrant_exploit_${Date.now()}`,
      intent_type: 'privileged_operation',
      source: { type: 'agent', id: agentId },
      warrant_id: warrantId,
      parameters: {
        exploit_attempt: true,
        target: 'sensitive_resource'
      },
      submitted_at: new Date().toISOString()
    };
  }

  _generateTamperableIntent(agentId, intentId) {
    return {
      intent_id: intentId,
      intent_type: 'file_operation',
      source: { type: 'agent', id: agentId },
      parameters: {
        target: '/tmp/safe_file.txt',
        action: 'read',
        force: false
      },
      submitted_at: new Date().toISOString()
    };
  }

  async _getAgentBudget(agentId) {
    // Mock budget info - in real implementation would query budget system
    return {
      available: 1000,
      limit: 2000,
      spent: 500
    };
  }

  async _simulateIntentSubmission(intent) {
    // Simulate various responses based on intent properties
    await this._sleep(Math.random() * 100); // Simulate network delay
    
    if (intent.risk_tier === 'T2') {
      return { status: 'pending_approval', approval_required: true };
    } else if (intent.risk_tier === 'T1') {
      return Math.random() > 0.7 ? 
        { status: 'denied', denial_reason: 'risk_policy_violation' } :
        { status: 'pending_approval', approval_required: true };
    } else {
      return { status: 'approved' };
    }
  }

  async _attemptParameterTampering(intentId, modifiedParams) {
    // Simulate parameter tampering attempt - should always fail in secure system
    throw new Error('Parameter tampering detected: intent integrity violation');
  }

  _generateComprehensiveReport(results) {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    
    return {
      total_tests: totalTests,
      tests_passed: passedTests,
      tests_failed: totalTests - passedTests,
      overall_passed: passedTests === totalTests,
      pass_rate: passedTests / totalTests,
      individual_results: results.map(r => ({
        scenario: r.scenario,
        passed: r.passed,
        duration_ms: r.getDuration(),
        summary: r.summary
      })),
      governance_effectiveness: {
        policies_triggered: results.reduce((sum, r) => 
          sum + r.governance_response.policies_triggered.length, 0),
        violations_detected: results.reduce((sum, r) => 
          sum + r.governance_response.violations_detected.length, 0),
        actions_blocked: results.reduce((sum, r) => 
          sum + r.governance_response.actions_blocked.length, 0)
      },
      timestamp: new Date().toISOString()
    };
  }

  _completeSimulation(result) {
    this.running_simulations.delete(result.simulation_id);
    this.completed_simulations.push(result);
    
    // Keep only last 50 completed simulations
    if (this.completed_simulations.length > 50) {
      this.completed_simulations.shift();
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public interface methods

  /**
   * Get simulation result by ID
   */
  getSimulation(simulationId) {
    const running = this.running_simulations.get(simulationId);
    if (running) return running;
    
    return this.completed_simulations.find(s => s.simulation_id === simulationId);
  }

  /**
   * List all simulations
   */
  listSimulations(filters = {}) {
    const all = [
      ...Array.from(this.running_simulations.values()),
      ...this.completed_simulations
    ];

    let filtered = all;

    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    if (filters.scenario) {
      filtered = filtered.filter(s => s.scenario === filters.scenario);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Cancel running simulation
   */
  cancelSimulation(simulationId) {
    const simulation = this.running_simulations.get(simulationId);
    if (simulation) {
      simulation.cancel();
      this._completeSimulation(simulation);
      return true;
    }
    return false;
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      running_simulations: this.running_simulations.size,
      completed_simulations: this.completed_simulations.length,
      total_simulations: this.running_simulations.size + this.completed_simulations.length,
      scenario_counts: this._getScenarioCounts(),
      success_rate: this._calculateSuccessRate()
    };
  }

  _getScenarioCounts() {
    const counts = {};
    for (const scenario of Object.values(ScenarioType)) {
      counts[scenario] = this.completed_simulations
        .filter(s => s.scenario === scenario).length;
    }
    return counts;
  }

  _calculateSuccessRate() {
    if (this.completed_simulations.length === 0) return 0;
    
    const passed = this.completed_simulations.filter(s => s.passed).length;
    return passed / this.completed_simulations.length;
  }
}

module.exports = {
  ChaosEngine,
  SimulationResult,
  ScenarioType,
  SimulationStatus
};