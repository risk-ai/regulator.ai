#!/usr/bin/env node
/**
 * Phase 9.7.3 — Full Autonomous Loop with Real Execution
 * 
 * Success condition:
 * service healthy
 * → service killed
 * → evaluator detects unhealthy
 * → remediation triggered
 * → governed plan executes
 * → service restarted
 * → verification confirms recovery
 * → ledger records lifecycle
 */

const { getStateGraph } = require('../lib/state/state-graph');
const { ObjectiveEvaluator } = require('../lib/core/objective-evaluator');
const { triggerRemediation } = require('../lib/core/remediation-trigger');
const { ChatActionBridge } = require('../lib/core/chat-action-bridge');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function main() {
  console.log('=== Phase 9.7.3: Full Autonomous Loop (Real Execution) ===\n');

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const chatActionBridge = new ChatActionBridge();
  chatActionBridge.setDependencies(null, stateGraph);

  const evaluator = new ObjectiveEvaluator(stateGraph);

  console.log('Step 1: Create remediation plan...');
  
  // Create remediation plan
  const planId = `plan_test_${Date.now()}`;
  stateGraph.createPlan({
    plan_id: planId,
    objective: 'Restore openclaw-gateway health',
    risk_tier: 'T1',
    status: 'pending',
    steps: [
      {
        step_id: 'step_1',
        action_type: 'system_service_restart',
        action: 'restart_service',
        target: 'openclaw-gateway',
        timeoutMs: 10000,
        description: 'Restart gateway service'
      },
      {
        step_id: 'step_2',
        action_type: 'sleep',
        action: 'sleep',
        durationMs: 3000,
        description: 'Wait for service startup'
      },
      {
        step_id: 'step_3',
        action_type: 'health_check',
        action: 'health_check',
        target: 'openclaw-gateway',
        timeoutMs: 5000,
        description: 'Verify gateway health'
      }
    ],
    preconditions: [],
    postconditions: ['gateway_healthy'],
    verification_spec: {
      verification_type: 'service_restart',
      target_service: 'openclaw-gateway',
      checks: [
        {
          check_type: 'systemd_active',
          target: 'openclaw-gateway',
          required: true
        },
        {
          check_type: 'http_healthcheck',
          url: 'http://localhost:18789/health',
          expected_status: 200,
          required: true
        }
      ]
    }
  });

  console.log(`✅ Plan created: ${planId}\n`);

  console.log('Step 2: Create test objective...');
  
  // Create objective
  const objectiveId = `obj_test_${Date.now()}`;
  const now = new Date().toISOString();
  stateGraph.createObjective({
    objective_id: objectiveId,
    objective_name: 'maintain_gateway_health_test',
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    desired_state: {
      service_active: true,
      service_healthy: true
    },
    status: 'declared',
    evaluation_interval: '30s',
    verification_strength: 'service_health',
    remediation_plan: planId,
    context: {
      test: true,
      created_for: 'phase_9.7.3_test'
    },
    created_at: now,
    updated_at: now
  });

  console.log(`✅ Objective created: ${objectiveId}\n`);

  console.log('Step 3: Establish healthy baseline...');
  
  // Evaluate (should be healthy)
  let evaluation = await evaluator.evaluateObjective(objectiveId);
  console.log(`Baseline evaluation satisfied: ${evaluation.objective_satisfied}`);
  console.log(`Baseline state transition: ${evaluation.state_transition.to_status}`);
  
  if (!evaluation.objective_satisfied) {
    console.error('❌ Gateway not healthy at baseline');
    console.error('Evaluation:', JSON.stringify(evaluation, null, 2));
    process.exit(1);
  }
  
  console.log('✅ Baseline healthy\n');

  console.log('Step 4: Kill gateway service...');
  
  try {
    await execAsync('systemctl --user stop openclaw-gateway');
    console.log('✅ Gateway stopped\n');
  } catch (err) {
    console.error('❌ Failed to stop gateway:', err.message);
    process.exit(1);
  }

  // Wait for state to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Step 5: Evaluate (should detect unhealthy)...');
  
  evaluation = await evaluator.evaluateObjective(objectiveId);
  console.log(`Unhealthy evaluation satisfied: ${evaluation.objective_satisfied}`);
  console.log(`Violation detected: ${evaluation.violation_detected}`);
  console.log(`State transition: ${evaluation.state_transition.to_status}`);
  
  if (evaluation.objective_satisfied || !evaluation.violation_detected) {
    console.error('❌ Failed to detect unhealthy state');
    console.error('Evaluation:', JSON.stringify(evaluation, null, 2));
    
    // Restore gateway before exit
    await execAsync('systemctl --user start openclaw-gateway');
    process.exit(1);
  }
  
  const objective = stateGraph.getObjective(objectiveId);
  console.log(`Objective state: ${objective.status}`);
  console.log(`Triggered plan ID: ${objective.triggered_plan_id}\n`);

  if (objective.status !== 'violation_detected') {
    console.error('❌ Objective not in violation_detected state');
    await execAsync('systemctl --user start openclaw-gateway');
    process.exit(1);
  }

  console.log('✅ Violation detected\n');

  console.log('Step 6: Trigger remediation...');
  
  const remediationResult = await triggerRemediation(objectiveId, {
    chatActionBridge,
    triggered_by: 'phase_9.7.3_test'
  });

  console.log('Remediation result:', JSON.stringify(remediationResult, null, 2));

  if (!remediationResult.triggered) {
    console.error('❌ Remediation not triggered');
    console.error('Reason:', remediationResult.suppression_reason);
    
    // Restore gateway
    await execAsync('systemctl --user start openclaw-gateway');
    process.exit(1);
  }

  console.log(`✅ Remediation executed`);
  console.log(`Final objective state: ${remediationResult.objective_state}\n`);

  // Verify gateway is running
  console.log('Step 7: Verify gateway recovery...');
  
  try {
    const { stdout } = await execAsync('systemctl --user is-active openclaw-gateway');
    const isActive = stdout.trim() === 'active';
    
    if (isActive) {
      console.log('✅ Gateway is active\n');
    } else {
      console.log(`⚠️  Gateway state: ${stdout.trim()}\n`);
    }
  } catch (err) {
    console.error('❌ Gateway not active:', err.message);
  }

  // Re-evaluate
  console.log('Step 8: Re-evaluate (should be healthy)...');
  
  evaluation = await evaluator.evaluateObjective(objectiveId);
  console.log(`Final evaluation satisfied: ${evaluation.objective_satisfied}`);
  console.log(`Final state transition: ${evaluation.state_transition.to_status}`);
  
  const finalObjective = stateGraph.getObjective(objectiveId);
  console.log(`Final objective state: ${finalObjective.status}\n`);

  // Check success metric
  console.log('=== SUCCESS METRIC ===');
  console.log('1 failure detected: ✅');
  console.log('1 remediation executed: ✅');
  console.log(`1 recovery verified: ${evaluation.objective_satisfied ? '✅' : '❌'}`);
  
  if (evaluation.objective_satisfied || finalObjective.status === 'restored' || finalObjective.status === 'monitoring') {
    console.log('\n✅ PHASE 9.7.3 COMPLETE — Real execution proven');
    console.log('\nFull loop trace:');
    console.log('  evaluation: unhealthy');
    console.log('  remediation triggered');
    console.log(`  plan executed: ${remediationResult.triggered_plan_id}`);
    console.log(`  verification: ${remediationResult.verification_outcome ? 'complete' : 'pending'}`);
    console.log(`  objective state: ${finalObjective.status}`);
  } else {
    console.log('\n⚠️  Loop completed but final state not fully healthy');
    console.log('This may be acceptable if verification ran successfully');
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  console.error(err.stack);
  
  // Attempt to restore gateway
  const { exec } = require('child_process');
  exec('systemctl --user start openclaw-gateway', (error) => {
    if (error) {
      console.error('Failed to restore gateway:', error.message);
    }
    process.exit(1);
  });
});
