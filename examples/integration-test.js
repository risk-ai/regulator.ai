#!/usr/bin/env node

/**
 * Vienna OS Integration Test
 * 
 * Verifies that examples work correctly with Vienna OS.
 * Run this after setting up Vienna OS to validate your installation.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const EXAMPLES_TO_TEST = [
  {
    name: '5-Minute Quickstart',
    path: './5-minute-quickstart',
    command: 'timeout 30s node index.js --test || true',
    expectedOutput: ['Demo Complete', 'Next Steps']
  },
  {
    name: 'Governed DevOps Agent',
    path: './governed-devops-agent',
    command: 'timeout 15s node agent.js || true',
    expectedOutput: ['Vienna OS connection verified', 'DevOps Operation']
  }
];

class IntegrationTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runTests() {
    console.log('🧪 Vienna OS Examples Integration Test');
    console.log('=====================================\n');

    for (const example of EXAMPLES_TO_TEST) {
      await this.testExample(example);
    }

    this.printSummary();
  }

  async testExample(example) {
    const { name, path: examplePath, command, expectedOutput } = example;
    
    console.log(`🔍 Testing: ${name}`);
    console.log(`📁 Path: ${examplePath}`);
    
    const startTime = Date.now();
    let success = false;
    let output = '';
    let error = null;

    try {
      // Check if example directory exists
      const fullPath = path.resolve(examplePath);
      await fs.access(fullPath);
      
      // Check if package.json exists
      try {
        await fs.access(path.join(fullPath, 'package.json'));
        
        // Install dependencies first
        console.log('📦 Installing dependencies...');
        const { stderr: installError } = await execAsync('npm install', { 
          cwd: fullPath,
          timeout: 30000
        });
        
        if (installError && !installError.includes('warn')) {
          throw new Error(`Dependency installation failed: ${installError}`);
        }
        
      } catch (e) {
        console.log('⚠️  No package.json found, skipping dependency installation');
      }

      // Run the example
      console.log('🚀 Running example...');
      const { stdout, stderr } = await execAsync(command, { 
        cwd: fullPath,
        timeout: 45000  // 45 second timeout
      });
      
      output = stdout + stderr;
      
      // Check for expected output
      const foundExpected = expectedOutput.every(expected => 
        output.includes(expected)
      );
      
      if (foundExpected) {
        success = true;
        console.log('✅ Test passed');
      } else {
        console.log('⚠️  Test completed but expected output not found');
        console.log(`Expected: ${expectedOutput.join(', ')}`);
        success = false;
      }
      
    } catch (err) {
      error = err;
      console.log(`❌ Test failed: ${err.message}`);
    }

    const duration = Date.now() - startTime;
    
    this.results.push({
      name,
      success,
      duration,
      output: output.slice(0, 500), // First 500 chars
      error: error?.message || null
    });

    console.log(`⏱️  Duration: ${duration}ms\n`);
  }

  printSummary() {
    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Total time: ${totalTime}ms\n`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Vienna OS examples are working correctly.');
      console.log('\n✅ Your Vienna OS setup is ready for development!');
      console.log('\nNext steps:');
      console.log('• Try the full examples: cd examples/governed-devops-agent && npm start');
      console.log('• Read the docs: docs/GETTING_STARTED.md');
      console.log('• Join our Discord: https://discord.gg/vienna-os');
    } else {
      console.log('⚠️  Some tests failed. This might indicate:');
      console.log('• Vienna OS is not running (start with: npm run dev)');
      console.log('• Missing API key (add ANTHROPIC_API_KEY to .env)');
      console.log('• Network connectivity issues');
      console.log('• Dependency installation problems');
      
      console.log('\n🔍 Failed tests:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`\n• ${result.name}:`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        if (result.output) {
          console.log(`  Output: ${result.output.substring(0, 200)}...`);
        }
      });
    }
  }
}

// Main execution
async function main() {
  const tester = new IntegrationTester();
  
  // Check if we're in the examples directory
  try {
    await fs.access('./5-minute-quickstart');
  } catch (e) {
    console.error('❌ Please run this test from the regulator.ai/examples directory');
    console.log('Usage: cd regulator.ai/examples && node integration-test.js');
    process.exit(1);
  }
  
  await tester.runTests();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}