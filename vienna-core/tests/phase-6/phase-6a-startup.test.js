/**
 * Phase 6A: Startup Validator Test
 * 
 * Validates that:
 * 1. Startup validator detects missing components
 * 2. Validation blocks startup on critical failures
 * 3. Validation report is human-readable
 * 4. All components are checked
 */

const ViennaCore = require('./index.js');
const { StartupValidator } = require('./lib/core/startup-validator.js');

async function runTests() {
console.log('═══════════════════════════════════════════════════════════');
console.log('Phase 6A: Startup Validator Test');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Test 1: Uninitialized Vienna Core should fail validation
console.log('Test 1: Uninitialized Runtime Validation');
console.log('───────────────────────────────────────────────────────────');

try {
  const uninitCore = { isInitialized: () => false };
  const validator = new StartupValidator();
  const result = validator.validate(uninitCore);
  
  console.log(`✅ Validation detected uninitialized state`);
  console.log(`   Valid: ${result.valid}`);
  console.log(`   Critical failures: ${result.summary.critical}`);
  
  if (result.valid) {
    console.log('❌ FAIL: Uninitialized core should not pass validation');
    process.exit(1);
  }
} catch (error) {
  console.log(`❌ FAIL: ${error.message}`);
  process.exit(1);
}

console.log('');

// Test 2: Initialize Vienna Core and validate
console.log('Test 2: Initialized Runtime Validation');
console.log('───────────────────────────────────────────────────────────');

try {
  const path = require('path');
  const os = require('os');
  const workspace = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
  
  // Initialize Vienna Core
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
  
  console.log('✅ Vienna Core initialized');
  
  // Run async initialization
  await ViennaCore.initPhase7_3();
  console.log('✅ Phase 7.3 components initialized');
  
  // Validate
  const result = ViennaCore.validate();
  
  console.log(`\nValidation Result:`);
  console.log(`  Valid: ${result.valid ? '✅' : '❌'}`);
  console.log(`  Total checks: ${result.summary.total}`);
  console.log(`  Passed: ${result.summary.passed}`);
  console.log(`  Failed: ${result.summary.failed}`);
  console.log(`  Critical failures: ${result.summary.critical}`);
  
  if (!result.valid) {
    console.log('\n❌ FAIL: Initialized core should pass validation');
    console.log('\nValidation Report:');
    console.log(ViennaCore.getValidationReport());
    process.exit(1);
  }
  
  console.log('✅ All components validated successfully');
  
} catch (error) {
  console.log(`❌ FAIL: ${error.message}`);
  console.error(error);
  process.exit(1);
}

console.log('');

// Test 3: Verify validation report format
console.log('Test 3: Validation Report Format');
console.log('───────────────────────────────────────────────────────────');

try {
  const report = ViennaCore.getValidationReport();
  
  // Check report contains key sections
  const requiredSections = [
    'Vienna Core Startup Validation',
    'Summary:',
    'Component Checks:',
    'CORE:',
    'EXECUTOR:',
    'QUEUE:',
    'EVENTS:',
    'GOVERNANCE:'
  ];
  
  const missingSections = requiredSections.filter(section => !report.includes(section));
  
  if (missingSections.length > 0) {
    console.log(`❌ FAIL: Report missing sections: ${missingSections.join(', ')}`);
    console.log('\nActual report:');
    console.log(report);
    process.exit(1);
  }
  
  console.log('✅ Validation report contains all required sections');
  console.log('\nSample Report:');
  console.log('───────────────────────────────────────────────────────────');
  console.log(report);
  
} catch (error) {
  console.log(`❌ FAIL: ${error.message}`);
  process.exit(1);
}

console.log('');

// Test 4: Validate throwOnFailure option
console.log('Test 4: Validation throwOnFailure Option');
console.log('───────────────────────────────────────────────────────────');

try {
  // Should not throw on valid runtime
  ViennaCore.validate({ throwOnFailure: true });
  console.log('✅ throwOnFailure does not throw on valid runtime');
  
  // Create a broken core instance
  const brokenCore = {
    isInitialized: () => true,
    executor: null,  // Missing executor
    queuedExecutor: null,
    executionQueue: null
  };
  
  const validator = new StartupValidator();
  const result = validator.validate(brokenCore);
  
  if (result.valid) {
    console.log('❌ FAIL: Broken core should not pass validation');
    process.exit(1);
  }
  
  console.log('✅ Broken runtime detected (missing executor)');
  console.log(`   Critical failures: ${result.summary.critical}`);
  
} catch (error) {
  console.log(`❌ FAIL: ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Phase 6A: All Tests Passed');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Startup Validator operational:');
console.log('  ✅ Detects uninitialized runtime');
console.log('  ✅ Validates initialized runtime');
console.log('  ✅ Detects missing components');
console.log('  ✅ Generates human-readable reports');
console.log('  ✅ Supports throwOnFailure option');
console.log('');
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
