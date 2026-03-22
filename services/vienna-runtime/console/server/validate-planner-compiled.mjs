/**
 * Direct Planner Service Validation (Compiled JS)
 */

import { PlannerService } from './dist/services/plannerService.js';

async function main() {
  console.log('\n=== Phase 2D Validation (Compiled Planner) ===\n');
  
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
      name: 'Explain with path: explain plannerService.ts',
      command: 'explain plannerService.ts',
      attachments: [],
    },
    {
      name: 'Open file: open intentParser.ts',
      command: 'open intentParser.ts',
      attachments: [],
    },
    {
      name: 'Manual attachment: summarize this file',
      command: 'summarize this file',
      attachments: ['AGENTS.md'],
    },
    {
      name: 'File not found (expected error)',
      command: 'summarize nonexistent-xyz-file.txt',
      attachments: [],
      expectError: true,
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
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
      
      if (test.expectError) {
        console.log(`  ✗ FAIL: Expected error but got success`);
        failed++;
      } else {
        console.log(`  ✓ PASS`);
        console.log(`    Intent: ${plan.intent.intent}`);
        console.log(`    Query: ${plan.intent.query || '(none)'}`);
        console.log(`    Resolution: ${plan.resolution ? plan.resolution.status : 'N/A'}`);
        console.log(`    Resolved Path: ${plan.inputs.resolvedPath || plan.inputs.attachments[0] || '(none)'}`);
        console.log(`    Actions: ${plan.actions.length} steps`);
        passed++;
      }
    } catch (error) {
      if (test.expectError) {
        console.log(`  ✓ PASS (expected error)`);
        console.log(`    Error: ${error.message.split('\n')[0]}`);
        passed++;
      } else {
        console.log(`  ✗ FAIL: ${error.message.split('\n')[0]}`);
        failed++;
      }
    }
  }
  
  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  console.log(`\n${passed === tests.length ? '✓ All tests passed' : '✗ Some tests failed'}\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
