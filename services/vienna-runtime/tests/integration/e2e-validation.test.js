/**
 * End-to-End Validation Test
 * Phase 6.6 + 6.7 Live Validation
 * 
 * Tests:
 * 1. Vienna Core initialization
 * 2. Chat message routing (recovery vs general)
 * 3. Read-only command execution
 * 4. Command proposal generation
 * 5. Side-effect command with warrant
 * 6. Audit trail verification
 */

const assert = require('assert');

async function runE2EValidation() {
  console.log('[E2E Validation] Phase 6.6 + 6.7\n');
  
  const tests = [];
  
  // Test 1: Vienna Core initialization
  console.log('Test 1: Vienna Core initialization');
  {
    // Check that Vienna is a singleton
    const ViennaCore = require('./index');
    
    // Initialize if not already initialized
    try {
      const vienna = ViennaCore;
      
      // Check critical components
      assert.ok(vienna, 'Vienna Core should be accessible');
      
      console.log('✓ Vienna Core initialized\n');
      tests.push({ name: 'Vienna Core init', passed: true });
    } catch (error) {
      console.error('✗ Vienna Core initialization failed:', error.message);
      tests.push({ name: 'Vienna Core init', passed: false });
    }
  }
  
  // Test 2: Chat intent classification
  console.log('Test 2: Chat intent classification');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      // Test recovery intents
      const recoveryIntent = vienna.classifyChatIntent('diagnose system');
      assert.strictEqual(recoveryIntent, 'recovery', 'Should classify as recovery');
      
      // Test general chat
      const generalIntent = vienna.classifyChatIntent('hello vienna');
      assert.strictEqual(generalIntent, 'general', 'Should classify as general');
      
      console.log('✓ Intent classification working\n');
      tests.push({ name: 'Intent classification', passed: true });
    } catch (error) {
      console.error('✗ Intent classification failed:', error.message);
      tests.push({ name: 'Intent classification', passed: false });
    }
  }
  
  // Test 3: Read-only command execution
  console.log('Test 3: Read-only command execution');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      // Check if OpenClaw gateway is running
      const portCheckResult = await vienna.executeSystemCommand('check_port', [18789], {
        operator: 'test-validation',
      });
      
      assert.ok(portCheckResult.success, 'Port check should succeed');
      assert.ok(portCheckResult.result.hasOwnProperty('listening'), 'Should return listening status');
      
      console.log(`  OpenClaw gateway on port 18789: ${portCheckResult.result.listening ? 'LISTENING' : 'NOT LISTENING'}`);
      console.log('✓ Read-only command execution working\n');
      tests.push({ name: 'Read-only execution', passed: true });
    } catch (error) {
      console.error('✗ Read-only command failed:', error.message);
      tests.push({ name: 'Read-only execution', passed: false });
    }
  }
  
  // Test 4: Command proposal generation
  console.log('Test 4: Command proposal generation');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      // Propose a service restart
      const proposal = vienna.proposeSystemCommand('restart_service', ['openclaw-gateway'], {
        operator: 'test-validation',
        reason: 'Testing proposal generation',
      });
      
      assert.ok(proposal.proposal_id, 'Proposal should have ID');
      assert.strictEqual(proposal.command, 'restart_service', 'Command name should match');
      assert.strictEqual(proposal.requires_warrant, true, 'Should require warrant');
      assert.strictEqual(proposal.risk_tier, 'T1', 'Should be T1');
      assert.ok(proposal.command_string.includes('openclaw-gateway'), 'Command string should include service name');
      
      console.log(`  Generated proposal: ${proposal.proposal_id}`);
      console.log(`  Command: ${proposal.command_string}`);
      console.log(`  Requires warrant: ${proposal.requires_warrant}`);
      console.log('✓ Command proposal generation working\n');
      tests.push({ name: 'Proposal generation', passed: true });
    } catch (error) {
      console.error('✗ Proposal generation failed:', error.message);
      tests.push({ name: 'Proposal generation', passed: false });
    }
  }
  
  // Test 5: Warrant enforcement
  console.log('Test 5: Warrant enforcement');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      // Try to execute side-effect command without warrant
      try {
        await vienna.executeSystemCommand('restart_service', ['test-service'], {
          operator: 'test-validation',
          // No warrant provided
        });
        console.error('✗ Should have rejected command without warrant');
        tests.push({ name: 'Warrant enforcement', passed: false });
      } catch (error) {
        if (error.message.includes('warrant')) {
          console.log('  Correctly rejected command without warrant');
          console.log('✓ Warrant enforcement working\n');
          tests.push({ name: 'Warrant enforcement', passed: true });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('✗ Warrant enforcement test failed:', error.message);
      tests.push({ name: 'Warrant enforcement', passed: false });
    }
  }
  
  // Test 6: Diagnose and propose fixes
  console.log('Test 6: Diagnose and propose fixes');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      const diagnosis = await vienna.diagnoseAndProposeFixes();
      
      assert.ok(diagnosis.systemState, 'Should include system state');
      assert.ok(Array.isArray(diagnosis.issues), 'Should include issues array');
      assert.ok(Array.isArray(diagnosis.proposals), 'Should include proposals array');
      assert.ok(diagnosis.timestamp, 'Should include timestamp');
      
      console.log(`  System state: ${diagnosis.systemState}`);
      console.log(`  Issues: ${diagnosis.issues.length}`);
      console.log(`  Proposals: ${diagnosis.proposals.length}`);
      
      if (diagnosis.proposals.length > 0) {
        console.log(`  First proposal: ${diagnosis.proposals[0].command || diagnosis.proposals[0].description}`);
      }
      
      console.log('✓ Diagnosis and proposal generation working\n');
      tests.push({ name: 'Diagnose and propose', passed: true });
    } catch (error) {
      console.error('✗ Diagnosis failed:', error.message);
      tests.push({ name: 'Diagnose and propose', passed: false });
    }
  }
  
  // Test 7: Available commands listing
  console.log('Test 7: Available commands listing');
  {
    try {
      const ViennaCore = require('./index');
      const vienna = ViennaCore;
      
      const allCommands = vienna.getAvailableCommands();
      const readOnlyCommands = vienna.getAvailableCommands('read_only');
      const sideEffectCommands = vienna.getAvailableCommands('side_effect');
      
      assert.ok(Array.isArray(allCommands), 'Should return array');
      assert.ok(allCommands.length > 0, 'Should have commands');
      assert.ok(readOnlyCommands.length > 0, 'Should have read-only commands');
      assert.ok(sideEffectCommands.length > 0, 'Should have side-effect commands');
      
      console.log(`  Total commands: ${allCommands.length}`);
      console.log(`  Read-only: ${readOnlyCommands.length}`);
      console.log(`  Side-effect: ${sideEffectCommands.length}`);
      console.log('✓ Command listing working\n');
      tests.push({ name: 'Command listing', passed: true });
    } catch (error) {
      console.error('✗ Command listing failed:', error.message);
      tests.push({ name: 'Command listing', passed: false });
    }
  }
  
  // Results
  console.log('\n=== E2E Validation Results ===');
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  
  tests.forEach(t => {
    console.log(`${t.passed ? '✓' : '✗'} ${t.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✓ Phase 6.6 + 6.7 End-to-End Validation PASSED');
    console.log('\nNext: Test through UI in browser');
    process.exit(0);
  } else {
    console.log('\n✗ Some validation tests failed');
    process.exit(1);
  }
}

// Run validation
runE2EValidation().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
