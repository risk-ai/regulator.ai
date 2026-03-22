#!/usr/bin/env node
/**
 * Test Chat Dispatch (Phase 7.5c)
 * 
 * Verify that processChatMessage() correctly:
 * 1. Parses OpenClaw-targeted commands
 * 2. Dispatches real instructions
 * 3. Returns actual results (not narration)
 * 4. Enforces governance
 */

const { getViennaCore } = require('./lib/core/vienna-core');

async function test() {
  console.log('[Test] Phase 7.5c — Chat Dispatch Integrity\n');

  // Initialize Vienna Core
  const viennaCore = getViennaCore();
  await viennaCore.initialize();

  console.log('[Test] Vienna Core initialized\n');

  // Test 1: OpenClaw status query
  console.log('[Test 1] OpenClaw status query');
  console.log('Input: "ask openclaw for status"\n');
  
  const response1 = await viennaCore.processChatMessage('ask openclaw for status');
  console.log('Response:');
  console.log(response1);
  console.log('\n---\n');

  // Test 2: OpenClaw health check
  console.log('[Test 2] OpenClaw health check');
  console.log('Input: "check openclaw health"\n');
  
  const response2 = await viennaCore.processChatMessage('check openclaw health');
  console.log('Response:');
  console.log(response2);
  console.log('\n---\n');

  // Test 3: Local action
  console.log('[Test 3] Local action');
  console.log('Input: "show endpoints"\n');
  
  const response3 = await viennaCore.processChatMessage('show endpoints');
  console.log('Response:');
  console.log(response3);
  console.log('\n---\n');

  // Test 4: T1 command (should require warrant)
  console.log('[Test 4] T1 command (should reject without warrant)');
  console.log('Input: "restart openclaw service openclaw-gateway"\n');
  
  const response4 = await viennaCore.processChatMessage('restart openclaw service openclaw-gateway');
  console.log('Response:');
  console.log(response4);
  console.log('\n---\n');

  // Test 5: Unrecognized command (should show help)
  console.log('[Test 5] Unrecognized command (should show help)');
  console.log('Input: "random unrecognized text"\n');
  
  const response5 = await viennaCore.processChatMessage('random unrecognized text');
  console.log('Response:');
  console.log(response5);
  console.log('\n---\n');

  // Shutdown
  viennaCore.shutdown();
  console.log('[Test] Complete');
}

test().catch(error => {
  console.error('[Test] Fatal error:', error);
  process.exit(1);
});
