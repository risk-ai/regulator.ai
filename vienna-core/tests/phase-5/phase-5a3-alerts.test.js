/**
 * Phase 5A.3 Alert Events Test
 * 
 * Validates stateful alert emissions, deduplication, and recovery.
 */

const { ViennaEventEmitter } = require('./lib/core/event-emitter.js');

console.log('Phase 5A.3 Alert Events Test\n');

// Mock event stream to capture events
const capturedEvents = [];
const mockStream = {
  publish: (event) => {
    capturedEvents.push(event);
    console.log(`  → Event: ${event.event_type} (severity: ${event.severity})`);
  }
};

// Initialize emitter
const emitter = new ViennaEventEmitter({
  queueCapacity: 100,
  queueWarningThreshold: 0.7,
  queueCriticalThreshold: 0.9,
  failureRateWarning: 0.05,
  failureRateCritical: 0.10,
  failureRateWindow: 60000, // 1 minute for testing
  stallThresholdMs: 5000 // 5 seconds for testing
});

emitter.connect(mockStream);

console.log('Setup complete');
console.log('Config:', {
  queueCapacity: 100,
  warningThreshold: 70,
  criticalThreshold: 90,
  failureRateWarning: '5%',
  failureRateCritical: '10%'
});
console.log('');

// Test 1: Queue Depth Alerts (Normal → Warning → Critical → Recovered)
console.log('Test 1: Queue Depth State Transitions');
console.log('1.1: Normal state (50 queued)');
emitter.checkQueueDepth(50);
console.log('Expected: No event (normal state)');
console.log('Alert state:', emitter.alertStates.queueDepth);
console.log('');

console.log('1.2: Warning state (70 queued)');
emitter.checkQueueDepth(70);
console.log('Expected: queue.depth.warning event');
console.log('Alert state:', emitter.alertStates.queueDepth);
console.log('');

console.log('1.3: Still warning state (75 queued)');
emitter.checkQueueDepth(75);
console.log('Expected: No event (still warning, deduplicated)');
console.log('');

console.log('1.4: Critical state (90 queued)');
emitter.checkQueueDepth(90);
console.log('Expected: queue.depth.critical event');
console.log('Alert state:', emitter.alertStates.queueDepth);
console.log('');

console.log('1.5: Still critical state (95 queued)');
emitter.checkQueueDepth(95);
console.log('Expected: No event (still critical, deduplicated)');
console.log('');

console.log('1.6: Back to warning (75 queued)');
emitter.checkQueueDepth(75);
console.log('Expected: queue.depth.warning event (downgrade from critical)');
console.log('Alert state:', emitter.alertStates.queueDepth);
console.log('');

console.log('1.7: Recovered to normal (30 queued)');
emitter.checkQueueDepth(30);
console.log('Expected: queue.depth.recovered event');
console.log('Alert state:', emitter.alertStates.queueDepth);
console.log('');

// Test 2: Failure Rate Alerts
console.log('Test 2: Failure Rate State Transitions');

console.log('2.1: Low failure rate (2% - 2/100)');
emitter._resetFailureRateTracking();
for (let i = 0; i < 100; i++) {
  emitter.recordExecutionResult(`env_${i}`, i < 2);
}
console.log('Expected: No alert (2% < 5% warning threshold)');
console.log('Alert state:', emitter.alertStates.failureRate);
console.log('');

console.log('2.2: Warning failure rate (6% - 6/100)');
emitter._resetFailureRateTracking();
for (let i = 0; i < 100; i++) {
  emitter.recordExecutionResult(`env_2_${i}`, i < 6);
}
console.log('Expected: failure.rate.warning event');
console.log('Alert state:', emitter.alertStates.failureRate);
console.log('');

console.log('2.3: Still warning (7% - add 10 more with 1 failure)');
for (let i = 0; i < 10; i++) {
  emitter.recordExecutionResult(`env_3_${i}`, i < 1);
}
console.log('Expected: No event (still warning, deduplicated)');
console.log('Alert state:', emitter.alertStates.failureRate);
console.log('');

console.log('2.4: Critical failure rate (12% - 12/100)');
emitter._resetFailureRateTracking();
for (let i = 0; i < 100; i++) {
  emitter.recordExecutionResult(`env_4_${i}`, i < 12);
}
console.log('Expected: failure.rate.critical event');
console.log('Alert state:', emitter.alertStates.failureRate);
const criticalEvent = capturedEvents.find(e => e.event_type === 'alert.failure.rate.critical');
if (criticalEvent) {
  console.log('Payload:', JSON.stringify(criticalEvent.payload, null, 2));
}
console.log('');

console.log('2.5: Recovered to normal (1% - 1/100)');
emitter._resetFailureRateTracking();
for (let i = 0; i < 100; i++) {
  emitter.recordExecutionResult(`env_5_${i}`, i < 1);
}
console.log('Expected: failure.rate.recovered event (from critical)');
console.log('Alert state:', emitter.alertStates.failureRate);
console.log('');

// Test 3: Execution Stall Detection
console.log('Test 3: Execution Stall Detection');
const baseTime = Date.now();

console.log('3.1: Recent execution (no stall)');
emitter.checkExecutionStall(baseTime, 50);
console.log('Expected: No event (recent execution)');
console.log('Alert state:', emitter.alertStates.executionStall);
console.log('');

console.log('3.2: Stall detected (6 seconds ago, 50 queued)');
emitter.checkExecutionStall(baseTime - 6000, 50);
console.log('Expected: execution.stall.detected event');
console.log('Alert state:', emitter.alertStates.executionStall);
const stallEvent = capturedEvents.find(e => e.event_type === 'alert.execution.stall.detected');
if (stallEvent) {
  console.log('Payload:', JSON.stringify(stallEvent.payload, null, 2));
}
console.log('');

console.log('3.3: Still stalled (7 seconds ago, 50 queued)');
emitter.checkExecutionStall(baseTime - 7000, 50);
console.log('Expected: No event (still stalled, deduplicated)');
console.log('');

console.log('3.4: Recovered (recent execution)');
emitter.checkExecutionStall(baseTime, 50);
console.log('Expected: execution.stall.recovered event');
console.log('Alert state:', emitter.alertStates.executionStall);
console.log('');

console.log('3.5: No work queued (not a stall)');
emitter.checkExecutionStall(baseTime - 10000, 0);
console.log('Expected: No event (no work = not a stall)');
console.log('Alert state:', emitter.alertStates.executionStall);
console.log('');

// Summary
console.log('=== Test Summary ===');
console.log('');
console.log('Total events captured:', capturedEvents.length);
console.log('');

console.log('Event breakdown:');
const eventCounts = {};
capturedEvents.forEach(e => {
  eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
});
Object.entries(eventCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log('');

// Validation summary
const expectedEvents = {
  'alert.queue.depth.warning': 2,       // Initial warning + downgrade from critical
  'alert.queue.depth.critical': 1,      // Upgrade to critical
  'alert.queue.depth.recovered': 1,     // Recovery to normal
  'alert.failure.rate.warning': 1,      // Step 2.2: warning (from normal)
  'alert.failure.rate.critical': 1,     // Step 2.4: critical (from normal after reset)
  'alert.failure.rate.recovered': 1,    // Step 2.5: recovered (from critical)
  'alert.execution.stall.detected': 1,  // Stall detected
  'alert.execution.stall.recovered': 1  // Stall recovered
};

console.log('Expected event counts:');
Object.entries(expectedEvents).forEach(([type, count]) => {
  const actual = eventCounts[type] || 0;
  const match = actual === count;
  console.log(`  ${match ? '✓' : '✗'} ${type}: expected ${count}, actual ${actual}`);
});
console.log('');

// Final alert states
console.log('Final alert states:');
console.log('  Queue depth:', emitter.alertStates.queueDepth, '(expected: normal)');
console.log('  Failure rate:', emitter.alertStates.failureRate, '(expected: normal)');
console.log('  Execution stall:', emitter.alertStates.executionStall, '(expected: normal)');
console.log('');

// Check all validations
const validations = [
  { test: 'Queue depth warning emitted', pass: !!eventCounts['alert.queue.depth.warning'] },
  { test: 'Queue depth critical emitted', pass: !!eventCounts['alert.queue.depth.critical'] },
  { test: 'Queue depth recovered emitted', pass: !!eventCounts['alert.queue.depth.recovered'] },
  { test: 'Failure rate warning emitted', pass: !!eventCounts['alert.failure.rate.warning'] },
  { test: 'Failure rate critical emitted', pass: !!eventCounts['alert.failure.rate.critical'] },
  { test: 'Failure rate recovered emitted', pass: !!eventCounts['alert.failure.rate.recovered'] },
  { test: 'Execution stall detected', pass: !!eventCounts['alert.execution.stall.detected'] },
  { test: 'Execution stall recovered', pass: !!eventCounts['alert.execution.stall.recovered'] },
  { test: 'No duplicate warnings (deduplication)', pass: eventCounts['alert.queue.depth.warning'] === 2 }, // 2 is correct (initial + downgrade)
  { test: 'All alert states recovered to normal', pass: 
    emitter.alertStates.queueDepth === 'normal' && 
    emitter.alertStates.failureRate === 'normal' && 
    emitter.alertStates.executionStall === 'normal' 
  }
];

console.log('Validation Results:');
validations.forEach(v => {
  console.log(`  ${v.pass ? '✓' : '✗'} ${v.test}`);
});
console.log('');

const allPassed = validations.every(v => v.pass);
console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
console.log('');
console.log('Phase 5A.3 alert event validation complete.');
