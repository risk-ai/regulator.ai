/**
 * Test: Phase 6.7 — Governed System Executor
 * 
 * Validates:
 * 1. Command template registry
 * 2. Command validation
 * 3. Proposal generation
 * 4. Warrant requirement enforcement
 * 5. Command execution (read-only)
 * 6. Side-effect command governance
 */

const assert = require('assert');

async function testGovernedExecutor() {
  console.log('[Test] Phase 6.7 — Governed System Executor\n');
  
  const tests = [];
  
  // Test 1: Command template registry
  console.log('Test 1: Command template registry');
  {
    const { ShellExecutor, CommandCategory, COMMAND_TEMPLATES } = require('./lib/execution/shell-executor');
    
    // Check that templates are defined
    assert.ok(COMMAND_TEMPLATES.check_port, 'check_port template should exist');
    assert.ok(COMMAND_TEMPLATES.check_process, 'check_process template should exist');
    assert.ok(COMMAND_TEMPLATES.show_service_status, 'show_service_status template should exist');
    assert.ok(COMMAND_TEMPLATES.restart_service, 'restart_service template should exist');
    assert.ok(COMMAND_TEMPLATES.stop_service, 'stop_service template should exist');
    assert.ok(COMMAND_TEMPLATES.start_service, 'start_service template should exist');
    
    // Check categories
    assert.strictEqual(COMMAND_TEMPLATES.check_port.category, CommandCategory.READ_ONLY);
    assert.strictEqual(COMMAND_TEMPLATES.restart_service.category, CommandCategory.SIDE_EFFECT);
    assert.strictEqual(COMMAND_TEMPLATES.kill_process.category, CommandCategory.DANGEROUS);
    
    // Check warrant requirements
    assert.strictEqual(COMMAND_TEMPLATES.check_port.requiresWarrant, undefined);
    assert.strictEqual(COMMAND_TEMPLATES.restart_service.requiresWarrant, true);
    assert.strictEqual(COMMAND_TEMPLATES.kill_process.requiresWarrant, true);
    
    console.log('✓ Command templates defined correctly\n');
    tests.push({ name: 'Command templates', passed: true });
  }
  
  // Test 2: Command validation
  console.log('Test 2: Command validation');
  {
    const { COMMAND_TEMPLATES } = require('./lib/execution/shell-executor');
    
    // Valid port
    assert.ok(COMMAND_TEMPLATES.check_port.validate(18789));
    assert.ok(COMMAND_TEMPLATES.check_port.validate(80));
    assert.ok(COMMAND_TEMPLATES.check_port.validate(443));
    
    // Invalid port
    assert.strictEqual(COMMAND_TEMPLATES.check_port.validate(0), false);
    assert.strictEqual(COMMAND_TEMPLATES.check_port.validate(70000), false);
    assert.strictEqual(COMMAND_TEMPLATES.check_port.validate(-1), false);
    
    // Valid service name
    assert.ok(COMMAND_TEMPLATES.restart_service.validate('openclaw-gateway'));
    assert.ok(COMMAND_TEMPLATES.restart_service.validate('test-service'));
    
    // Invalid service name
    assert.strictEqual(COMMAND_TEMPLATES.restart_service.validate('../../etc/passwd'), false);
    assert.strictEqual(COMMAND_TEMPLATES.restart_service.validate('service;ls'), false);
    
    console.log('✓ Command validation working\n');
    tests.push({ name: 'Command validation', passed: true });
  }
  
  // Test 3: Proposal generation
  console.log('Test 3: Proposal generation');
  {
    const { ShellExecutor } = require('./lib/execution/shell-executor');
    
    const executor = new ShellExecutor({ dryRun: true });
    
    // Propose read-only command
    const portProposal = executor.proposeCommand('check_port', [18789], {
      proposedBy: 'test',
    });
    
    assert.ok(portProposal.proposal_id);
    assert.strictEqual(portProposal.command, 'check_port');
    assert.strictEqual(portProposal.category, 'read_only');
    assert.strictEqual(portProposal.requires_warrant, false);
    assert.ok(portProposal.command_string.includes('18789'));
    
    // Propose side-effect command
    const restartProposal = executor.proposeCommand('restart_service', ['openclaw-gateway'], {
      proposedBy: 'test',
    });
    
    assert.ok(restartProposal.proposal_id);
    assert.strictEqual(restartProposal.command, 'restart_service');
    assert.strictEqual(restartProposal.category, 'side_effect');
    assert.strictEqual(restartProposal.requires_warrant, true);
    assert.strictEqual(restartProposal.risk_tier, 'T1');
    assert.ok(restartProposal.command_string.includes('openclaw-gateway'));
    
    console.log('✓ Proposal generation working\n');
    tests.push({ name: 'Proposal generation', passed: true });
  }
  
  // Test 4: Warrant requirement enforcement
  console.log('Test 4: Warrant requirement enforcement');
  {
    const { ShellExecutor } = require('./lib/execution/shell-executor');
    
    const executor = new ShellExecutor({ dryRun: true });
    
    // Read-only command should work without warrant
    const readOnlyResult = await executor.execute('check_port', [18789], {
      operator: 'test',
    });
    
    assert.ok(readOnlyResult.success || readOnlyResult.dryRun);
    
    // Side-effect command should fail without warrant
    try {
      await executor.execute('restart_service', ['openclaw-gateway'], {
        operator: 'test',
        // No warrant provided
      });
      assert.fail('Should have thrown error for missing warrant');
    } catch (error) {
      assert.ok(error.message.includes('requires warrant'));
    }
    
    // Side-effect command should work with warrant
    const withWarrantResult = await executor.execute('restart_service', ['openclaw-gateway'], {
      operator: 'test',
      warrant: 'mock-warrant-123',
    });
    
    assert.ok(withWarrantResult.success || withWarrantResult.dryRun);
    
    console.log('✓ Warrant enforcement working\n');
    tests.push({ name: 'Warrant enforcement', passed: true });
  }
  
  // Test 5: Read-only command execution
  console.log('Test 5: Read-only command execution');
  {
    const { ShellExecutor } = require('./lib/execution/shell-executor');
    
    // Use real execution (not dry run) for read-only
    const executor = new ShellExecutor({ dryRun: false });
    
    // Test port check (OpenClaw gateway)
    const portResult = await executor.execute('check_port', [18789], {
      operator: 'test',
    });
    
    assert.ok(portResult.success);
    assert.ok(portResult.result.hasOwnProperty('listening'));
    assert.ok(typeof portResult.result.listening === 'boolean');
    
    console.log(`  Port 18789 listening: ${portResult.result.listening}`);
    
    // Test process check
    const processResult = await executor.execute('check_process', ['node'], {
      operator: 'test',
    });
    
    assert.ok(processResult.success);
    assert.ok(processResult.result.hasOwnProperty('running'));
    
    if (processResult.result.running) {
      console.log(`  Node processes: ${processResult.result.pids.length} found`);
    }
    
    console.log('✓ Read-only execution working\n');
    tests.push({ name: 'Read-only execution', passed: true });
  }
  
  // Test 6: Dry run mode
  console.log('Test 6: Dry run mode');
  {
    const { ShellExecutor } = require('./lib/execution/shell-executor');
    
    const executor = new ShellExecutor({ dryRun: true });
    
    // Side-effect command in dry run should not execute
    const dryRunResult = await executor.execute('restart_service', ['openclaw-gateway'], {
      operator: 'test',
      warrant: 'mock-warrant',
    });
    
    assert.ok(dryRunResult.dryRun);
    assert.ok(dryRunResult.success);
    assert.ok(dryRunResult.result.message.includes('Dry run'));
    
    console.log('✓ Dry run mode working\n');
    tests.push({ name: 'Dry run mode', passed: true });
  }
  
  // Test 7: Vienna Core integration
  console.log('Test 7: Vienna Core integration');
  {
    const fs = require('fs');
    const indexContent = fs.readFileSync('./index.js', 'utf8');
    
    // Check that Phase 6.7 code is present
    assert.ok(indexContent.includes('getAvailableCommands'), 'getAvailableCommands should be defined');
    assert.ok(indexContent.includes('proposeSystemCommand'), 'proposeSystemCommand should be defined');
    assert.ok(indexContent.includes('executeSystemCommand'), 'executeSystemCommand should be defined');
    assert.ok(indexContent.includes('diagnoseAndProposeFixes'), 'diagnoseAndProposeFixes should be defined');
    assert.ok(indexContent.includes('Phase 6.7'), 'Phase 6.7 comments should be present');
    
    // Check that shell executor exists
    assert.ok(fs.existsSync('./lib/execution/shell-executor.js'), 'Shell executor should exist');
    
    console.log('✓ Vienna Core integration complete\n');
    tests.push({ name: 'Vienna Core integration', passed: true });
  }
  
  // Results
  console.log('\n=== Test Results ===');
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  
  tests.forEach(t => {
    console.log(`${t.passed ? '✓' : '✗'} ${t.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✓ Phase 6.7 - Governed System Executor validated');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
testGovernedExecutor().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
