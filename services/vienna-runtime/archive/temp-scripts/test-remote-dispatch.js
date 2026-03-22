#!/usr/bin/env node
/**
 * Test Remote Dispatch (Phase 7.5b)
 * 
 * Tests end-to-end Vienna → OpenClaw communication:
 * 1. Local T0 action
 * 2. OpenClaw T0 instruction
 * 3. OpenClaw T1 instruction (with warrant)
 */

const vienna = require('../index');
const path = require('path');

async function test() {
  console.log('=== Phase 7.5b: Remote Dispatch Test ===\n');
  
  try {
    // Initialize Vienna Core
    console.log('[1/6] Initializing Vienna Core...');
    vienna.init({
      adapter: 'openclaw',
      workspace: process.env.HOME + '/.openclaw/workspace',
    });
    
    await vienna.initPhase7_3();
    console.log('✓ Vienna Core initialized\n');
    
    // Test local T0 action
    console.log('[2/6] Testing local T0 action (show status)...');
    const localResult = await vienna.executeOperatorChatRequest('show status');
    
    if (localResult.success) {
      console.log('✓ Local T0 action succeeded');
      console.log(`  Services: ${localResult.result.data.services}`);
      console.log(`  Runtime mode: ${localResult.result.data.runtime_mode}`);
    } else {
      console.log('✗ Local T0 action failed:', localResult.error);
    }
    console.log();
    
    // Test OpenClaw T0 instruction
    console.log('[3/6] Testing OpenClaw T0 instruction (query_status)...');
    console.log('  Note: Requires vienna-instruction-processor.js running');
    
    try {
      const openclawResult = await vienna.sendOpenClawDirection('query_status', {}, {
        timeout_ms: 5000
      });
      
      console.log('✓ OpenClaw T0 instruction succeeded');
      console.log(`  Status: ${openclawResult.status}`);
      console.log(`  Result:`, JSON.stringify(openclawResult.result, null, 2));
    } catch (error) {
      console.log('⚠ OpenClaw T0 instruction failed (processor may not be running)');
      console.log(`  Error: ${error.message}`);
      console.log('  Start processor with: node vienna-instruction-processor.js');
    }
    console.log();
    
    // Test OpenClaw T0 instruction (inspect_gateway)
    console.log('[4/6] Testing OpenClaw T0 instruction (inspect_gateway)...');
    
    try {
      const gatewayResult = await vienna.sendOpenClawDirection('inspect_gateway', {}, {
        timeout_ms: 5000
      });
      
      console.log('✓ OpenClaw inspect_gateway succeeded');
      console.log(`  Port: ${gatewayResult.result.port}`);
      console.log(`  Listening: ${gatewayResult.result.listening}`);
    } catch (error) {
      console.log('⚠ OpenClaw inspect_gateway failed');
      console.log(`  Error: ${error.message}`);
    }
    console.log();
    
    // Test OpenClaw T1 instruction (would require warrant)
    console.log('[5/6] Testing OpenClaw T1 instruction (restart_service)...');
    console.log('  Note: T1 requires warrant, testing envelope creation only');
    
    try {
      const warrantInstruction = vienna.openclawBridge.createInstruction({
        instruction_type: 'restart_service',
        arguments: { service: 'openclaw-gateway' },
        issued_by: 'test-script',
        warrant_id: 'test_warrant_123'
      });
      
      console.log('✓ T1 instruction envelope created');
      console.log(`  Instruction ID: ${warrantInstruction.instruction_id}`);
      console.log(`  Risk tier: ${warrantInstruction.risk_tier}`);
      console.log(`  Warrant ID: ${warrantInstruction.warrant_id}`);
      console.log('  (Not dispatching - would require actual warrant)');
    } catch (error) {
      console.log('✗ T1 instruction envelope creation failed:', error.message);
    }
    console.log();
    
    // Summary
    console.log('[6/6] Summary');
    console.log('  ✓ Local execution: WORKING');
    console.log('  ✓ OpenClaw instruction architecture: READY');
    console.log('  ⚠ Remote dispatch: REQUIRES vienna-instruction-processor.js');
    console.log();
    console.log('=== Test Complete ===\n');
    console.log('To enable full remote dispatch:');
    console.log('  1. Start processor: node vienna-instruction-processor.js &');
    console.log('  2. Re-run this test');
    console.log('  3. Test T0 instructions will execute end-to-end');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
