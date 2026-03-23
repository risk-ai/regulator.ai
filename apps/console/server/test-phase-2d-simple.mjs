/**
 * Phase 2D Simple Test
 * 
 * Test intent parser and workspace resolver directly.
 */

import { IntentParser } from './src/services/intentParser.js';
import { WorkspaceResolver } from './src/services/workspaceResolver.js';

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

async function main() {
  console.log('Phase 2D Simple Test\n');
  
  try {
    await testIntentParser();
    await testWorkspaceResolver();
    
    console.log('\n✓ All tests complete\n');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
