#!/usr/bin/env node
/**
 * Vienna OS Integration Test
 * 
 * Comprehensive integration test for the governance pipeline.
 * Tests the full lifecycle from intent submission to execution and audit.
 */

const { performance } = require('perf_hooks');
const crypto = require('crypto');
const Warrant = require('../services/vienna-lib/governance/warrant');
const RiskTier = require('../services/vienna-lib/governance/risk-tier');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// In-memory governance pipeline for testing
class GovernancePipeline {
  constructor() {
    this.truthSnapshots = new Map();
    this.policies = new Map();
    this.intents = new Map();
    this.warrants = new Map();
    this.approvals = new Map();
    this.executions = new Map();
    this.auditLog = [];
    
    this.riskTier = new RiskTier();
    this.warrant = new Warrant(this.createAdapter(), { 
      signingKey: 'integration-test-key-12345' 
    });
    
    this.setupDefaultPolicies();
  }

  createAdapter() {
    return {
      saveWarrant: async (warrant) => {
        this.warrants.set(warrant.warrant_id, { ...warrant });
      },
      
      loadWarrant: async (warrantId) => {
        return this.warrants.get(warrantId);
      },
      
      listWarrants: async () => {
        return Array.from(this.warrants.values());
      },
      
      loadTruthSnapshot: async (truthSnapshotId) => {
        return this.truthSnapshots.get(truthSnapshotId);
      },
      
      emitAudit: async (event) => {
        this.auditLog.push({
          ...event,
          timestamp: new Date().toISOString(),
          audit_id: `audit_${this.auditLog.length + 1}`
        });
      }
    };
  }

  setupDefaultPolicies() {
    // Policy 1: Block dangerous operations during business hours
    this.policies.set('pol_business_hours', {
      name: 'Business Hours Safety',
      enabled: true,
      priority: 100,
      conditions: [
        {
          field: 'action',
          operator: 'in',
          values: ['delete_database', 'delete_production', 'wire_transfer']
        },
        {
          field: 'time_of_day',
          operator: 'between',
          values: ['09:00', '17:00']
        }
      ],
      action: 'deny',
      reason: 'High-risk operations blocked during business hours'
    });

    // Policy 2: Require approval for T2+ operations
    this.policies.set('pol_approval_required', {
      name: 'T2+ Approval Gate',
      enabled: true,
      priority: 50,
      conditions: [
        {
          field: 'risk_tier',
          operator: 'in',
          values: ['T2', 'T3']
        },
        {
          field: 'has_approval',
          operator: 'equals',
          value: false
        }
      ],
      action: 'deny',
      reason: 'T2+ operations require human approval'
    });
  }

  // Pipeline stages
  
  async submitIntent(intent) {
    const intentId = `int_${crypto.randomBytes(8).toString('hex')}`;
    
    const fullIntent = {
      intent_id: intentId,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      ...intent
    };
    
    this.intents.set(intentId, fullIntent);
    
    await this.auditEvent('intent_submitted', {
      intent_id: intentId,
      action: intent.action,
      source: intent.source
    });
    
    return fullIntent;
  }

  async checkPolicies(intent) {
    const start = performance.now();
    
    // Classify risk tier
    const operation = {
      action: intent.action,
      reversible: intent.reversible,
      tradingImpact: intent.tradingImpact,
      blastRadius: intent.blastRadius,
      financialImpact: intent.financialImpact,
      piiInScope: intent.piiInScope,
      regulatoryScope: intent.regulatoryScope
    };
    
    const riskTier = this.riskTier.classify(operation);
    intent.risk_tier = riskTier;
    
    // Check policies
    const policyResults = [];
    const currentHour = new Date().getHours();
    
    for (const [policyId, policy] of this.policies) {
      if (!policy.enabled) continue;
      
      let matches = true;
      
      for (const condition of policy.conditions) {
        if (!this.evaluateCondition(intent, condition, { currentHour })) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        policyResults.push({
          policy_id: policyId,
          policy_name: policy.name,
          action: policy.action,
          reason: policy.reason,
          priority: policy.priority
        });
      }
    }
    
    // Sort by priority (higher = more restrictive)
    policyResults.sort((a, b) => b.priority - a.priority);
    
    const checkTime = performance.now() - start;
    
    await this.auditEvent('policy_check_completed', {
      intent_id: intent.intent_id,
      risk_tier: riskTier,
      policies_matched: policyResults.length,
      check_time_ms: Math.round(checkTime)
    });
    
    return {
      risk_tier: riskTier,
      policy_results: policyResults,
      decision: policyResults.length > 0 ? policyResults[0].action : 'allow',
      check_time_ms: Math.round(checkTime)
    };
  }

  evaluateCondition(intent, condition, context = {}) {
    const { field, operator, values, value } = condition;
    const fieldValue = this.getFieldValue(intent, field, context);
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'in':
        return values.includes(fieldValue);
      case 'between':
        const [start, end] = values;
        return fieldValue >= start && fieldValue <= end;
      default:
        return false;
    }
  }

  getFieldValue(intent, field, context) {
    switch (field) {
      case 'action':
        return intent.action;
      case 'risk_tier':
        return intent.risk_tier;
      case 'has_approval':
        return intent.approvalIds && intent.approvalIds.length > 0;
      case 'time_of_day':
        const hour = context.currentHour || new Date().getHours();
        return String(hour).padStart(2, '0') + ':00';
      default:
        return intent[field];
    }
  }

  async createTruthSnapshot(intent) {
    const snapshotId = `truth_${crypto.randomBytes(8).toString('hex')}`;
    
    const snapshot = {
      truth_snapshot_id: snapshotId,
      created_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      intent_id: intent.intent_id,
      system_state: {
        timestamp: Date.now(),
        services_healthy: true,
        disk_usage: '45%',
        memory_usage: '62%',
        active_sessions: 23
      },
      truth_snapshot_hash: `sha256:${crypto.randomBytes(32).toString('hex')}`
    };
    
    this.truthSnapshots.set(snapshotId, snapshot);
    
    return snapshot;
  }

  async issueWarrant(intent, truthSnapshot, approvals = []) {
    const start = performance.now();
    
    const warrantOptions = {
      truthSnapshotId: truthSnapshot.truth_snapshot_id,
      planId: intent.plan_id || `plan_${crypto.randomBytes(6).toString('hex')}`,
      objective: intent.objective,
      riskTier: intent.risk_tier,
      allowedActions: intent.allowedActions || [intent.action],
      forbiddenActions: intent.forbiddenActions || [],
      constraints: intent.constraints || {}
    };
    
    // Add approvals for T2/T3
    if (intent.risk_tier === 'T2' && approvals.length > 0) {
      warrantOptions.approvalId = approvals[0];
    } else if (intent.risk_tier === 'T3') {
      if (approvals.length < 2) {
        throw new Error(`T3 operations require 2+ approvals, got ${approvals.length}`);
      }
      warrantOptions.approvalIds = approvals;
      warrantOptions.justification = intent.justification || 'Integration test justification';
      warrantOptions.rollbackPlan = intent.rollbackPlan || 'Integration test rollback plan';
    }
    
    const warrant = await this.warrant.issue(warrantOptions);
    const issueTime = performance.now() - start;
    
    await this.auditEvent('warrant_issued', {
      warrant_id: warrant.warrant_id,
      intent_id: intent.intent_id,
      risk_tier: warrant.risk_tier,
      issue_time_ms: Math.round(issueTime)
    });
    
    return warrant;
  }

  async executeWithWarrant(intent, warrant) {
    const start = performance.now();
    
    // Verify warrant is still valid
    const verification = await this.warrant.verify(warrant.warrant_id);
    if (!verification.valid) {
      throw new Error(`Warrant verification failed: ${verification.reason}`);
    }
    
    // Verify action is in scope
    const scopeCheck = await this.warrant.verifyScope(
      warrant.warrant_id, 
      intent.action,
      intent.parameters || {}
    );
    
    if (!scopeCheck.valid) {
      throw new Error(`Scope check failed: ${scopeCheck.reason}`);
    }
    
    // Simulate execution
    const executionId = `exec_${crypto.randomBytes(8).toString('hex')}`;
    const execution = {
      execution_id: executionId,
      intent_id: intent.intent_id,
      warrant_id: warrant.warrant_id,
      action: intent.action,
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result: {
        success: true,
        message: `Successfully executed ${intent.action}`,
        output: `Mock execution result for ${intent.action}`
      }
    };
    
    this.executions.set(executionId, execution);
    
    const executeTime = performance.now() - start;
    
    await this.auditEvent('execution_completed', {
      execution_id: executionId,
      intent_id: intent.intent_id,
      warrant_id: warrant.warrant_id,
      action: intent.action,
      status: execution.status,
      execute_time_ms: Math.round(executeTime)
    });
    
    return execution;
  }

  async auditEvent(eventType, data) {
    await this.createAdapter().emitAudit({
      event_type: eventType,
      ...data
    });
  }

  async createMockApproval(intentId, approverId = 'test_approver') {
    const approvalId = `approval_${crypto.randomBytes(6).toString('hex')}`;
    const approval = {
      approval_id: approvalId,
      intent_id: intentId,
      approver_id: approverId,
      status: 'approved',
      approved_at: new Date().toISOString(),
      comment: 'Integration test approval'
    };
    
    this.approvals.set(approvalId, approval);
    return approvalId;
  }
}

// Test scenarios
class IntegrationTests {
  constructor() {
    this.results = [];
  }

  async runTest(name, testFn) {
    const start = performance.now();
    
    log('cyan', `\n🧪 ${name}`);
    
    try {
      const result = await testFn();
      const duration = performance.now() - start;
      
      this.results.push({
        name,
        status: 'PASS',
        duration: Math.round(duration),
        result
      });
      
      log('green', `✅ PASS (${Math.round(duration)}ms)`);
      if (result && result.summary) {
        log('blue', `   ${result.summary}`);
      }
    } catch (error) {
      const duration = performance.now() - start;
      
      this.results.push({
        name,
        status: 'FAIL',
        duration: Math.round(duration),
        error: error.message
      });
      
      log('red', `❌ FAIL (${Math.round(duration)}ms)`);
      log('red', `   Error: ${error.message}`);
    }
  }

  async run() {
    log('bold', '🚀 Vienna OS Integration Test Suite');
    log('blue', '=====================================\n');

    // Test 1: Full Lifecycle - T1 Operation
    await this.runTest('Full Lifecycle: T1 Operation (Auto-Approve)', async () => {
      const pipeline = new GovernancePipeline();
      
      // Submit intent
      const intent = await pipeline.submitIntent({
        action: 'send_email',
        source: 'notification_service',
        objective: 'Send user welcome email',
        allowedActions: ['send_email'],
        parameters: { recipients: 1 }
      });
      
      // Check policies
      const policyResult = await pipeline.checkPolicies(intent);
      if (policyResult.decision === 'deny') {
        throw new Error(`Unexpected policy denial: ${policyResult.policy_results[0]?.reason}`);
      }
      
      // Create truth snapshot
      const truth = await pipeline.createTruthSnapshot(intent);
      
      // Issue warrant (T1 - no approvals needed)
      const warrant = await pipeline.issueWarrant(intent, truth);
      
      // Execute
      const execution = await pipeline.executeWithWarrant(intent, warrant);
      
      // Verify audit trail
      const auditEvents = pipeline.auditLog.filter(e => e.intent_id === intent.intent_id);
      
      return {
        summary: `T1 operation completed: ${auditEvents.length} audit events, warrant ${warrant.warrant_id}`,
        intent_id: intent.intent_id,
        risk_tier: intent.risk_tier,
        warrant_id: warrant.warrant_id,
        execution_status: execution.status,
        audit_events: auditEvents.length
      };
    });

    // Test 2: Denied Flow - Policy Block
    await this.runTest('Denied Flow: Policy Blocks Operation', async () => {
      const pipeline = new GovernancePipeline();
      
      // Submit high-risk intent during business hours
      const intent = await pipeline.submitIntent({
        action: 'delete_database',
        source: 'maintenance_bot',
        objective: 'Clean up test database'
      });
      
      // Check policies - should be denied
      const policyResult = await pipeline.checkPolicies(intent);
      
      if (policyResult.decision !== 'deny') {
        throw new Error('Expected policy denial for delete_database during business hours');
      }
      
      // Verify the right policy blocked it
      const blockingPolicy = policyResult.policy_results[0];
      if (blockingPolicy.policy_id !== 'pol_business_hours') {
        throw new Error(`Wrong policy blocked operation: ${blockingPolicy.policy_id}`);
      }
      
      // Should not proceed to warrant issuance
      return {
        summary: `Operation correctly denied by ${blockingPolicy.policy_name}`,
        intent_id: intent.intent_id,
        blocking_policy: blockingPolicy.policy_name,
        denial_reason: blockingPolicy.reason
      };
    });

    // Test 3: T2 Flow - Single Approval Required
    await this.runTest('T2 Flow: Single Approval Required', async () => {
      const pipeline = new GovernancePipeline();
      
      // Submit T2 intent
      const intent = await pipeline.submitIntent({
        action: 'deploy_code',
        source: 'ci_system',
        objective: 'Deploy hotfix to production',
        allowedActions: ['deploy_code', 'restart_service'],
        approvalIds: [] // Start without approvals
      });
      
      // Check policies - should require approval
      let policyResult = await pipeline.checkPolicies(intent);
      if (policyResult.decision !== 'deny') {
        throw new Error('Expected policy denial for T2 operation without approval');
      }
      
      // Add approval
      const approvalId = await pipeline.createMockApproval(intent.intent_id);
      intent.approvalIds = [approvalId];
      
      // Check policies again - should pass now
      policyResult = await pipeline.checkPolicies(intent);
      if (policyResult.decision === 'deny') {
        throw new Error(`Still denied after approval: ${policyResult.policy_results[0]?.reason}`);
      }
      
      // Create truth snapshot
      const truth = await pipeline.createTruthSnapshot(intent);
      
      // Issue warrant
      const warrant = await pipeline.issueWarrant(intent, truth, [approvalId]);
      
      // Execute
      const execution = await pipeline.executeWithWarrant(intent, warrant);
      
      return {
        summary: `T2 operation completed with approval: ${approvalId}`,
        intent_id: intent.intent_id,
        risk_tier: intent.risk_tier,
        approval_id: approvalId,
        warrant_id: warrant.warrant_id,
        execution_status: execution.status
      };
    });

    // Test 4: T3 Flow - Multi-Party Approval
    await this.runTest('T3 Flow: Multi-Party Approval Required', async () => {
      const pipeline = new GovernancePipeline();
      
      // Submit T3 intent
      const intent = await pipeline.submitIntent({
        action: 'wire_transfer',
        source: 'finance_system',
        objective: 'Emergency vendor payment',
        allowedActions: ['wire_transfer'],
        financialImpact: 50000,
        justification: 'Critical vendor payment to prevent service disruption',
        rollbackPlan: 'Contact bank to reverse transfer if needed'
      });
      
      // Check policies and classification
      const policyResult = await pipeline.checkPolicies(intent);
      
      if (intent.risk_tier !== 'T3') {
        throw new Error(`Expected T3 classification, got ${intent.risk_tier}`);
      }
      
      // Create multiple approvals
      const approval1 = await pipeline.createMockApproval(intent.intent_id, 'finance_director');
      const approval2 = await pipeline.createMockApproval(intent.intent_id, 'ceo');
      const approval3 = await pipeline.createMockApproval(intent.intent_id, 'cfo');
      
      // Create truth snapshot
      const truth = await pipeline.createTruthSnapshot(intent);
      
      // Issue warrant with multiple approvals
      const warrant = await pipeline.issueWarrant(intent, truth, [approval1, approval2, approval3]);
      
      // Verify T3 requirements are met
      if (!warrant.justification || !warrant.rollback_plan) {
        throw new Error('T3 warrant missing justification or rollback plan');
      }
      
      if (warrant.approval_ids.length < 2) {
        throw new Error(`T3 warrant should have 2+ approvals, got ${warrant.approval_ids.length}`);
      }
      
      // Execute
      const execution = await pipeline.executeWithWarrant(intent, warrant);
      
      return {
        summary: `T3 operation completed with ${warrant.approval_ids.length} approvals`,
        intent_id: intent.intent_id,
        risk_tier: intent.risk_tier,
        approval_count: warrant.approval_ids.length,
        warrant_id: warrant.warrant_id,
        execution_status: execution.status,
        enhanced_audit: warrant.enhanced_audit
      };
    });

    // Test 5: Tamper Flow - Modified Warrant Fails
    await this.runTest('Tamper Flow: Modified Warrant Fails Verification', async () => {
      const pipeline = new GovernancePipeline();
      
      // Submit and process intent normally
      const intent = await pipeline.submitIntent({
        action: 'update_config',
        source: 'admin_tool',
        objective: 'Update service configuration'
      });
      
      await pipeline.checkPolicies(intent);
      const truth = await pipeline.createTruthSnapshot(intent);
      const warrant = await pipeline.issueWarrant(intent, truth);
      
      // Tamper with warrant - escalate allowed actions
      const tamperedWarrant = { ...warrant };
      tamperedWarrant.allowed_actions = ['update_config', 'delete_database']; // Add dangerous action
      
      // Replace warrant with tampered version
      pipeline.warrants.set(warrant.warrant_id, tamperedWarrant);
      
      // Try to execute - should fail verification
      try {
        await pipeline.executeWithWarrant(intent, tamperedWarrant);
        throw new Error('Tampered warrant should have failed verification');
      } catch (error) {
        if (!error.message.includes('WARRANT_TAMPERED')) {
          throw new Error(`Expected tamper detection, got: ${error.message}`);
        }
      }
      
      // Verify audit event was created
      const tamperEvents = pipeline.auditLog.filter(e => 
        e.event_type === 'warrant_tamper_detected'
      );
      
      if (tamperEvents.length === 0) {
        throw new Error('No tamper detection audit event found');
      }
      
      return {
        summary: `Tamper correctly detected and blocked execution`,
        warrant_id: warrant.warrant_id,
        tamper_events: tamperEvents.length
      };
    });

    // Test 6: Performance Benchmark
    await this.runTest('Performance: Full Pipeline Timing', async () => {
      const pipeline = new GovernancePipeline();
      const iterations = 10;
      const timings = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const intent = await pipeline.submitIntent({
          action: 'generate_report',
          source: 'reporting_service',
          objective: `Generate daily report #${i}`
        });
        
        await pipeline.checkPolicies(intent);
        const truth = await pipeline.createTruthSnapshot(intent);
        const warrant = await pipeline.issueWarrant(intent, truth);
        await pipeline.executeWithWarrant(intent, warrant);
        
        timings.push(performance.now() - start);
      }
      
      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      
      return {
        summary: `Avg: ${avgTiming.toFixed(1)}ms, Min: ${minTiming.toFixed(1)}ms, Max: ${maxTiming.toFixed(1)}ms`,
        iterations,
        average_ms: Math.round(avgTiming),
        min_ms: Math.round(minTiming),
        max_ms: Math.round(maxTiming)
      };
    });

    // Print results summary
    this.printSummary();
  }

  printSummary() {
    log('bold', '\n📊 Test Results Summary');
    log('blue', '========================\n');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    log('bold', `Results: ${passed}/${total} tests passed`);
    
    if (failed > 0) {
      log('red', `Failed Tests:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => log('red', `  - ${r.name}: ${r.error}`));
    }
    
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    log('blue', `\nTotal execution time: ${totalTime}ms`);
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tests = new IntegrationTests();
  tests.run().catch(error => {
    log('red', `\n💥 Test suite crashed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { GovernancePipeline, IntegrationTests };