/**
 * Phase 5 Validation Test
 * 
 * Creates test execution to validate observability surfaces
 */

const ViennaCore = require('./index.js');
const path = require('path');
const os = require('os');

async function runValidation() {
  console.log('=== Phase 5 Validation Test ===\n');
  
  const workspace = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
  
  // Initialize Vienna Core
  console.log('1. Initializing Vienna Core...');
  ViennaCore.init({
    adapter: 'openclaw',
    workspace,
    phase7_3: {
      queueOptions: {
        maxQueueSize: 1000,
        processingConcurrency: 1
      },
      recursionOptions: {
        maxRecursionDepth: 5,
        maxEnvelopesPerObjective: 50
      },
      replayOptions: {
        logDir: path.join(workspace, 'vienna-core', 'replay-logs')
      }
    }
  });
  
  await ViennaCore.initPhase7_3();
  console.log('✓ Vienna Core initialized\n');
  
  // Create test objective
  console.log('2. Creating test objective...');
  const objective = {
    objective_id: `obj_phase5_test_${Date.now()}`,
    description: 'Phase 5 observability validation test',
    envelopes: [
      {
        envelope_id: `env_test_1_${Date.now()}`,
        envelope_type: 'command_execution',
        actions: [
          {
            type: 'echo',
            target: 'console',
            content: 'Phase 5 observability test execution'
          }
        ]
      }
    ]
  };
  
  console.log(`✓ Created objective: ${objective.objective_id}\n`);
  
  // Submit objective
  console.log('3. Submitting objective to execution queue...');
  const result = await ViennaCore.submitObjective(objective);
  console.log(`✓ Objective submitted: ${JSON.stringify(result, null, 2)}\n`);
  
  // Wait for processing
  console.log('4. Waiting for execution (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('✓ Wait complete\n');
  
  // Validation summary
  console.log('=== Validation Complete ===');
  console.log('Phase 5 observability surfaces should now show:');
  console.log('  - Active/completed objective in timeline');
  console.log('  - Execution events in activity feed');
  console.log('  - Queue metrics in runtime stats');
  console.log('  - Provider health status');
  console.log('\nAccess console at: http://localhost:5174/#now');
  
  process.exit(0);
}

runValidation().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
