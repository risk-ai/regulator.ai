/**
 * Test runtime environment separation
 */

const { getRuntimeEnvironment, getRuntimePath, getRuntimeDir } = require('./lib/core/runtime-config');

console.log('\n=== Runtime Config Test ===\n');

// Test 1: Default environment
console.log('Test 1: Default environment (should be "prod")');
console.log('  Environment:', getRuntimeEnvironment());
console.log('  Runtime dir:', getRuntimeDir());
console.log('  Queue path:', getRuntimePath('execution-queue.jsonl'));
console.log();

// Test 2: Test environment
console.log('Test 2: Test environment (VIENNA_ENV=test)');
process.env.VIENNA_ENV = 'test';
console.log('  Environment:', getRuntimeEnvironment());
console.log('  Runtime dir:', getRuntimeDir());
console.log('  Queue path:', getRuntimePath('execution-queue.jsonl'));
console.log();

// Test 3: Restore prod
console.log('Test 3: Back to prod');
delete process.env.VIENNA_ENV;
console.log('  Environment:', getRuntimeEnvironment());
console.log('  Runtime dir:', getRuntimeDir());
console.log('  Queue path:', getRuntimePath('execution-queue.jsonl'));
console.log();

console.log('✓ Runtime config test complete\n');
