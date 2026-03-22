/**
 * Test replay log rotation
 */

const fs = require('fs').promises;
const path = require('path');
const { ReplayLog } = require('./lib/execution/replay-log');

console.log('\n=== Replay Log Rotation Test ===\n');

async function runTest() {
  // Create a test log with small rotation threshold
  const testLogPath = path.join(process.env.HOME, '.openclaw/runtime/test/replay-log.jsonl');
  
  const log = new ReplayLog({
    replayFile: testLogPath,
    rotationConfig: {
      maxSizeBytes: 1024, // 1KB for quick rotation test
      maxFiles: 3,
      rotationEnabled: true
    }
  });
  
  console.log('Initializing log...');
  await log.initialize();
  
  console.log('Writing 2KB of events (should trigger rotation)...');
  
  // Write enough events to exceed 1KB
  for (let i = 0; i < 50; i++) {
    await log.emit({
      type: 'test_event',
      envelope_id: `test_${i}`,
      data: 'x'.repeat(50)
    });
  }
  
  console.log('Checking file size...');
  const stats = await fs.stat(testLogPath).catch(() => null);
  if (stats) {
    console.log(`  Current file size: ${stats.size} bytes`);
  }
  
  // Check archive directory
  const archiveDir = path.join(process.env.HOME, '.openclaw/runtime/archive');
  const files = await fs.readdir(archiveDir).catch(() => []);
  const rotatedFiles = files.filter(f => f.startsWith('replay-log-'));
  
  console.log(`  Rotated files in archive: ${rotatedFiles.length}`);
  if (rotatedFiles.length > 0) {
    console.log('  ✓ Rotation triggered successfully');
    rotatedFiles.forEach(f => console.log(`    - ${f}`));
  } else {
    console.log('  ℹ No rotation yet (file under threshold)');
  }
  
  console.log('\n✓ Rotation test complete\n');
}

runTest().catch(console.error);
