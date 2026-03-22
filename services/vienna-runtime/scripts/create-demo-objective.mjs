/**
 * Create Phase 9 Demo Objective
 * 
 * Objective: maintain_gateway_health
 * 
 * Goal: Prove autonomous governed execution loop end-to-end
 */

import { getStateGraph } from '../lib/state/state-graph.js';
import { createObjective } from '../lib/core/objective-schema.js';

async function main() {
  console.log('\n=== Creating Phase 9 Demo Objective ===\n');
  
  const sg = getStateGraph();
  await sg.initialize();
  
  // Create remediation plan first
  const planId = `plan_gateway_recovery_${Date.now()}`;
  
  const plan = {
    plan_id: planId,
    objective: 'Restart OpenClaw Gateway',
    risk_tier: 'T1',
    steps: [
      {
        step_id: 'restart_gateway',
        type: 'restart_service',
        target: 'openclaw-gateway',
        params: {
          wait_for_health: true,
          timeout: 30,
        },
      },
      {
        step_id: 'verify_gateway',
        type: 'verify_service',
        target: 'openclaw-gateway',
        params: {
          checks: ['active', 'healthy'],
        },
      },
    ],
    verification_spec: {
      type: 'service_health',
      target: 'openclaw-gateway',
      checks: [
        { type: 'systemd_active', params: { service: 'openclaw-gateway' } },
        { type: 'tcp_port_open', params: { port: 18789 } },
      ],
    },
    status: 'approved', // Pre-approved for autonomous execution
  };
  
  sg.createPlan(plan);
  console.log(`✓ Remediation plan created: ${planId}\n`);
  
  // Create maintain_gateway_health objective
  const objective = createObjective({
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    desired_state: {
      service_active: true,
      service_healthy: true,
    },
    remediation_plan: planId,
    evaluation_interval: '30s', // 30 seconds for demo
    verification_strength: 'service_health',
    priority: 100,
    owner: 'system',
    context: {
      description: 'Maintain OpenClaw Gateway health',
      demo: true,
    },
  });
  
  console.log('Objective configuration:');
  console.log(`  ID: ${objective.objective_id}`);
  console.log(`  Description: ${objective.description}`);
  console.log(`  Target: ${objective.target_id}`);
  console.log(`  Interval: ${objective.evaluation_interval}s`);
  console.log(`  Auto-remediate: ${objective.auto_remediate}`);
  console.log();
  
  // Create in State Graph
  const created = sg.createObjective(objective);
  
  console.log('✓ Objective created in State Graph');
  console.log(`  Status: ${created.status}`);
  console.log(`  Created at: ${created.created_at}`);
  console.log();
  
  // Verify retrieval
  const retrieved = sg.getObjective(objective.objective_id);
  
  if (retrieved) {
    console.log('✓ Objective verified in database');
    console.log(`  Objective ID: ${retrieved.objective_id}`);
    console.log(`  Status: ${retrieved.status}`);
    console.log(`  Desired state:`, JSON.stringify(retrieved.desired_state));
    console.log();
  } else {
    console.error('✗ Failed to retrieve objective');
    process.exit(1);
  }
  
  console.log('=== Demo Objective Ready ===\n');
  console.log('Next steps:');
  console.log('  1. Start evaluation service: node scripts/evaluation-service.js start');
  console.log('  2. Monitor objective state: watch -n 2 "sqlite3 ~/.openclaw/runtime/prod/state/state-graph.db \\"SELECT status, last_evaluated_at FROM managed_objectives WHERE objective_id=\'${objective.objective_id}\'\\" "');
  console.log('  3. Inject failure: systemctl --user stop openclaw-gateway');
  console.log('  4. Observe autonomous remediation');
  console.log('  5. Verify recovery');
  console.log();
}

main().catch(error => {
  console.error('\nError:', error.message);
  console.error(error.stack);
  process.exit(1);
});
