/**
 * Phase 2D Integration Test
 * 
 * Test workspace-aware command planning:
 * - Intent parsing
 * - File resolution
 * - Plan generation
 * - Error messages
 */

const { IntentParser } = require('./dist/services/intentParser.js');
const { WorkspaceResolver } = require('./dist/services/workspaceResolver.js');
const { PlannerService } = require('./dist/services/plannerService.js');

async function testIntentParser() {
  console.log('\n=== Testing Intent Parser ===\n');
  
  const parser = new IntentParser();
  
  const tests = [
    'summarize package-lock.json',
    'find and summarize package-lock.json',
    'explain src/server.ts',
    'open plannerService.ts',
    'analyze the auth middleware',
    'summarize this file',
    'summarize this folder',
    'find package-lock.json',
  ];
  
  for (const command of tests) {
    const intent = parser.parse(command);
    console.log(`Command: "${command}"`);
    console.log(`  Intent: ${intent.intent}`);
    console.log(`  Target: ${intent.targetType}`);
    console.log(`  Query: ${intent.query || '(none)'}`);
    console.log();
  }
}

async function testWorkspaceResolver() {
  console.log('\n=== Testing Workspace Resolver ===\n');
  
  const resolver = new WorkspaceResolver();
  
  const tests = [
    'package-lock.json',
    'plannerService.ts',
    'server.ts',
    'nonexistent-file.txt',
    'AGENTS.md',
  ];
  
  for (const query of tests) {
    console.log(`Query: "${query}"`);
    try {
      const result = await resolver.resolve(query);
      console.log(`  Status: ${result.status}`);
      
      if (result.status === 'resolved') {
        console.log(`  Path: ${result.relativePath}`);
      } else if (result.status === 'ambiguous') {
        console.log(`  Matches: ${result.matches.length}`);
        result.matches.slice(0, 3).forEach(m => {
          console.log(`    - ${m.relativePath}`);
        });
      } else if (result.status === 'not_found') {
        console.log(`  Not found in workspace`);
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log();
  }
  
  // Stats
  const stats = await resolver.getStats();
  console.log('Workspace Stats:');
  console.log(`  Total files: ${stats.totalFiles}`);
  console.log(`  Unique filenames: ${stats.uniqueFilenames}`);
  console.log(`  Duplicate filenames: ${stats.duplicateFilenames}`);
  console.log();
}

async function testPlannerService() {
  console.log('\n=== Testing Planner Service ===\n');
  
  const planner = new PlannerService();
  
  const tests = [
    {
      command: 'summarize package-lock.json',
      attachments: [],
    },
    {
      command: 'find and summarize AGENTS.md',
      attachments: [],
    },
    {
      command: 'explain plannerService.ts',
      attachments: [],
    },
    {
      command: 'summarize this file',
      attachments: ['AGENTS.md'],
    },
    {
      command: 'unsupported action here',
      attachments: [],
    },
  ];
  
  for (const test of tests) {
    console.log(`Command: "${test.command}"`);
    console.log(`Attachments: ${test.attachments.length ? test.attachments.join(', ') : '(none)'}`);
    
    try {
      const plan = await planner.planCommand({
        objective_id: 'test-obj-001',
        command: test.command,
        attachments: test.attachments,
        operator: 'test-operator',
      });
      
      console.log(`  Plan ID: ${plan.plan_id}`);
      console.log(`  Command Type: ${plan.command_type}`);
      console.log(`  Resolved Path: ${plan.inputs.resolvedPath || '(manual attachment)'}`);
      console.log(`  Actions: ${plan.actions.length}`);
      plan.actions.forEach((action, i) => {
        console.log(`    ${i + 1}. ${action.type} ${action.target ? `→ ${action.target}` : ''}`);
      });
      console.log(`  Expected Outputs: ${plan.expected_outputs.join(', ')}`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    console.log();
  }
}

async function main() {
  console.log('Phase 2D Integration Test\n');
  console.log('Testing workspace-aware command planning...\n');
  
  try {
    await testIntentParser();
    await testWorkspaceResolver();
    await testPlannerService();
    
    console.log('\n✓ All tests complete\n');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
