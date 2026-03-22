#!/usr/bin/env node
/**
 * Test Single Chat Command
 */

const { getViennaCore } = require('./lib/core/vienna-core');

async function test() {
  console.log('[Test] Single command test\n');

  const viennaCore = getViennaCore();
  await viennaCore.initialize();

  console.log('[Test] Testing: "check openclaw health"\n');
  
  try {
    const response = await viennaCore.processChatMessage('check openclaw health');
    console.log('✅ Success!\n');
    console.log(response);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  viennaCore.shutdown();
  console.log('\n[Test] Complete');
}

test().catch(error => {
  console.error('[Test] Fatal:', error);
  process.exit(1);
});
