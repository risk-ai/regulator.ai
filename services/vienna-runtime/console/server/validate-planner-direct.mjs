/**
 * Direct Planner Service Validation
 * 
 * Test planner without auth layer
 */

import { PlannerService } from './src/services/plannerService.js';

async function main() {
  console.log('\n=== Direct Planner Validation ===\n');
  
  const planner = new PlannerService();
  
  const tests = [
    {
      name: 'Auto-resolve: summarize package-lock.json',
      command: 'summarize package-lock.json',
      attachments: [],
    },
    {
      name: 'Find pattern: find and summarize AGENTS.md',
      command: 'find and summarize AGENTS.md',
      attachments: [],
    },
    {
      name: 'Explain with path: explain src/server.ts',
      command: 'explain src/server.ts',
      attachments: [],
    },
    {
      name: 'Open file: open plannerService.ts',
      command: 'open plannerService.ts',
      attachments: [],
    },
    {
      name: 'Manual attachment: summarize this file',
      command: 'summarize this file',
      attachments: ['AGENTS.md'],
    },
    {
      name: 'File not found (should fail)',
      command: 'summarize nonexistent-xyz-file.txt',
      attachments: [],
    },
  ];
  
  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`  Command: "${test.command}"`);
    console.log(`  Attachments: ${test.attachments.length ? test.attachments.join(', ') : '(none)'}`);
    
    try {
      const plan = await planner.planCommand({
        objective_id: 'test-obj-' + Date.now(),
        command: test.command,
        attachments: test.attachments,
        operator: 'test-operator',
      });
      
      console.log(`  ✓ Plan generated`);
      console.log(`    Intent: ${plan.intent.intent}`);
      console.log(`    Query: ${plan.intent.query || '(none)'}`);
      console.log(`    Resolution: ${plan.resolution ? plan.resolution.status : 'N/A'}`);
      console.log(`    Resolved Path: ${plan.inputs.resolvedPath || plan.inputs.attachments[0] || '(none)'}`);
      console.log(`    Actions: ${plan.actions.length}`);
      plan.actions.forEach((action, i) => {
        console.log(`      ${i + 1}. ${action.type}${action.target ? ` → ${action.target}` : ''}`);
      });
    } catch (error) {
      console.log(`  ✗ Error: ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log('\n=== Validation Complete ===\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
