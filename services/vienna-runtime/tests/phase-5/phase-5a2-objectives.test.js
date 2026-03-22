/**
 * Phase 5A.2 Objective Progress Events Test
 * 
 * Validates objective event emissions from ObjectiveTracker.
 */

const { ObjectiveTracker } = require('./lib/execution/objective-tracker.js');
const { ViennaEventEmitter } = require('./lib/core/event-emitter.js');

console.log('Phase 5A.2 Objective Progress Events Test\n');

// Mock event stream to capture events
const capturedEvents = [];
const mockStream = {
  publish: (event) => {
    capturedEvents.push(event);
    console.log(`  → Event: ${event.event_type} (objective: ${event.objective_id})`);
  }
};

// Initialize emitter and tracker
const emitter = new ViennaEventEmitter({ queueCapacity: 100 });
emitter.connect(mockStream);

const tracker = new ObjectiveTracker();
tracker.connectEventEmitter(emitter);

console.log('Setup complete\n');

// Test 1: Objective Created Event
console.log('Test 1: Objective Created Event');
tracker.registerObjective('obj_001', 5);
console.log('✓ Objective registered');
const createdEvent = capturedEvents.find(e => e.event_type === 'objective.created');
console.log('Expected: objective.created event');
console.log('Actual:', createdEvent ? 'Found' : 'NOT FOUND');
if (createdEvent) {
  console.log('Payload:', JSON.stringify(createdEvent.payload, null, 2));
}
console.log('');

// Test 2: Envelope Tracking and Progress Updates
console.log('Test 2: Envelope State Transitions and Progress Updates');
const beforeProgressCount = capturedEvents.filter(e => e.event_type === 'objective.progress.updated').length;

tracker.trackEnvelope('env_001', 'obj_001', 'queued');
tracker.trackEnvelope('env_002', 'obj_001', 'queued');
tracker.trackEnvelope('env_003', 'obj_001', 'queued');
console.log('✓ 3 envelopes tracked as queued');

const afterQueuedCount = capturedEvents.filter(e => e.event_type === 'objective.progress.updated').length;
console.log(`Progress events emitted: ${afterQueuedCount - beforeProgressCount}`);
console.log('Expected: 3 (one per envelope state change)');

// Transition to executing
tracker.transitionEnvelope('env_001', 'queued', 'executing');
console.log('✓ env_001 transitioned queued → executing');

const executingEvents = capturedEvents.filter(e => 
  e.event_type === 'objective.progress.updated' && 
  e.payload.executing === 1
);
console.log(`Progress events with executing=1: ${executingEvents.length}`);
if (executingEvents.length > 0) {
  console.log('Latest progress:', JSON.stringify(executingEvents[executingEvents.length - 1].payload, null, 2));
}
console.log('');

// Test 3: No-op Suppression (state doesn't change)
console.log('Test 3: No-op Suppression');
const beforeNoOpCount = capturedEvents.length;
tracker.transitionEnvelope('env_001', 'executing', 'executing'); // No-op transition
const afterNoOpCount = capturedEvents.length;
console.log(`Events before no-op: ${beforeNoOpCount}`);
console.log(`Events after no-op: ${afterNoOpCount}`);
console.log('Expected: Same count (no event emitted for no-op)');
console.log('Result:', beforeNoOpCount === afterNoOpCount ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 4: Objective Completion Event
console.log('Test 4: Objective Completion Event');
tracker.transitionEnvelope('env_001', 'executing', 'verified');
tracker.transitionEnvelope('env_002', 'queued', 'executing');
tracker.transitionEnvelope('env_002', 'executing', 'verified');
tracker.transitionEnvelope('env_003', 'queued', 'executing');
tracker.transitionEnvelope('env_003', 'executing', 'verified');
console.log('✓ All 3 envelopes verified');

const completedEvent = capturedEvents.find(e => e.event_type === 'objective.completed');
console.log('Expected: objective.completed event');
console.log('Actual:', completedEvent ? 'Found' : 'NOT FOUND');
if (completedEvent) {
  console.log('Payload:', JSON.stringify(completedEvent.payload, null, 2));
  console.log('Expected verified: 3, Actual:', completedEvent.payload.verified);
  console.log('Expected total_envelopes: 5, Actual:', completedEvent.payload.total_envelopes);
}
console.log('');

// Test 5: Objective Failure Event
console.log('Test 5: Objective Failure Event');
tracker.registerObjective('obj_002', 3);
tracker.trackEnvelope('env_004', 'obj_002', 'queued');
tracker.trackEnvelope('env_005', 'obj_002', 'queued');
tracker.trackEnvelope('env_006', 'obj_002', 'queued');
tracker.transitionEnvelope('env_004', 'queued', 'executing');
tracker.transitionEnvelope('env_004', 'executing', 'verified');
tracker.transitionEnvelope('env_005', 'queued', 'executing');
tracker.transitionEnvelope('env_005', 'executing', 'failed');
tracker.transitionEnvelope('env_006', 'queued', 'executing');
tracker.transitionEnvelope('env_006', 'executing', 'dead_lettered');
console.log('✓ obj_002: 1 verified, 1 failed, 1 dead_lettered');

const failedEvent = capturedEvents.find(e => 
  e.event_type === 'objective.failed' && 
  e.objective_id === 'obj_002'
);
console.log('Expected: objective.failed event for obj_002');
console.log('Actual:', failedEvent ? 'Found' : 'NOT FOUND');
if (failedEvent) {
  console.log('Payload:', JSON.stringify(failedEvent.payload, null, 2));
  console.log('Expected verified: 1, Actual:', failedEvent.payload.verified);
  console.log('Expected failed: 1, Actual:', failedEvent.payload.failed);
  console.log('Expected dead_lettered: 1, Actual:', failedEvent.payload.dead_lettered);
}
console.log('');

// Test 6: Progress Percentage Accuracy
console.log('Test 6: Progress Percentage Accuracy');
tracker.registerObjective('obj_003', 10);
for (let i = 0; i < 10; i++) {
  tracker.trackEnvelope(`env_${100 + i}`, 'obj_003', 'queued');
}
// Complete 5 of 10
for (let i = 0; i < 5; i++) {
  tracker.transitionEnvelope(`env_${100 + i}`, 'queued', 'executing');
  tracker.transitionEnvelope(`env_${100 + i}`, 'executing', 'verified');
}

const obj003Progress = capturedEvents.filter(e => 
  e.event_type === 'objective.progress.updated' && 
  e.objective_id === 'obj_003'
);
const latestProgress = obj003Progress[obj003Progress.length - 1];
console.log('Completed 5 of 10 envelopes');
console.log('Expected progress: 0.5');
console.log('Actual progress:', latestProgress?.payload.progress);
console.log('Result:', latestProgress?.payload.progress === 0.5 ? '✓ PASS' : '✗ FAIL');
console.log('');

// Test 7: Event Buffering and Flush
console.log('Test 7: Event Buffering and Flush');
const emitter2 = new ViennaEventEmitter({ queueCapacity: 100 });
const tracker2 = new ObjectiveTracker();
tracker2.connectEventEmitter(emitter2);

// Register objective before stream connected (should buffer)
tracker2.registerObjective('obj_buffered', 2);
console.log('✓ Objective registered (emitter not connected yet)');
console.log('Expected: Event buffered');
console.log('Actual buffered_events:', emitter2.getStatus().buffered_events);

// Connect stream and capture flushed events
const flushedEvents = [];
const flushStream = {
  publish: (event) => {
    flushedEvents.push(event);
  }
};
emitter2.connect(flushStream);
console.log('✓ Stream connected, events flushed');
console.log('Expected: 1 buffered event flushed');
console.log('Actual flushed events:', flushedEvents.length);
console.log('Event type:', flushedEvents[0]?.event_type);
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
Object.entries(eventCounts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log('');

// Validation summary
const validations = [
  { test: 'Objective created event', pass: !!createdEvent },
  { test: 'Progress updates emit', pass: afterQueuedCount > beforeProgressCount },
  { test: 'No-op suppression', pass: beforeNoOpCount === afterNoOpCount },
  { test: 'Objective completion event', pass: !!completedEvent },
  { test: 'Objective failure event', pass: !!failedEvent },
  { test: 'Progress percentage accuracy', pass: latestProgress?.payload.progress === 0.5 },
  { test: 'Event buffering and flush', pass: flushedEvents.length === 1 }
];

console.log('Validation Results:');
validations.forEach(v => {
  console.log(`  ${v.pass ? '✓' : '✗'} ${v.test}`);
});
console.log('');

const allPassed = validations.every(v => v.pass);
console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
console.log('');
console.log('Phase 5A.2 objective event validation complete.');
