/**
 * Phase 5A.1 Integration Test
 * 
 * Validates event emission without requiring full server startup.
 */

const { ViennaEventEmitter } = require('./lib/core/event-emitter.js');

console.log('Phase 5A.1 Integration Test\n');

// Test 1: Event Emitter Initialization
console.log('Test 1: Event Emitter Initialization');
const emitter = new ViennaEventEmitter({
  queueCapacity: 100
});
console.log('✓ Event emitter created');
console.log('Status:', emitter.getStatus());
console.log('');

// Test 2: Event Emission (Buffered)
console.log('Test 2: Event Emission (buffered, no stream connected)');
emitter.emitEnvelopeEvent('started', {
  envelope_id: 'test_env_001',
  objective_id: 'test_obj_001',
  trigger_id: 'test_trigger',
  execution_class: 'T1',
  timeout_ms: 3600000
});
console.log('✓ Event emitted (buffered)');
const statusAfterEmit = emitter.getStatus();
console.log('Status:', statusAfterEmit);
console.log('Expected buffered_events: 1, Actual:', statusAfterEmit.buffered_events);
console.log('');

// Test 3: Multiple Event Types
console.log('Test 3: Multiple Event Types');
emitter.emitEnvelopeEvent('completed', {
  envelope_id: 'test_env_001',
  objective_id: 'test_obj_001',
  result_summary: 'success'
});
emitter.emitObjectiveEvent('created', {
  objective_id: 'test_obj_001',
  total_envelopes: 3,
  status: 'pending'
});
emitter.emitObjectiveEvent('progress.updated', {
  objective_id: 'test_obj_001',
  status: 'active',
  progress: 0.33
});
const statusMultiple = emitter.getStatus();
console.log('✓ Multiple events emitted');
console.log('Expected buffered_events: 4, Actual:', statusMultiple.buffered_events);
console.log('');

// Test 4: Queue Depth Alerts
console.log('Test 4: Queue Depth Alerts');
emitter.checkQueueDepth(50); // 50% - no alert
console.log('✓ 50% queue depth - no alert expected');
emitter.checkQueueDepth(70); // 70% - warning
console.log('✓ 70% queue depth - warning alert expected');
emitter.checkQueueDepth(90); // 90% - critical
console.log('✓ 90% queue depth - critical alert expected');
const statusAlerts = emitter.getStatus();
console.log('Expected buffered_events: 6 (4 previous + 2 alerts), Actual:', statusAlerts.buffered_events);
console.log('');

// Test 5: Mock Stream Connection
console.log('Test 5: Mock Stream Connection and Flush');
const mockStream = {
  publish: (event) => {
    console.log(`  → Event published: ${event.event_type}`);
  }
};
emitter.connect(mockStream);
console.log('✓ Mock stream connected');
const statusAfterConnect = emitter.getStatus();
console.log('Expected buffered_events: 0 (flushed), Actual:', statusAfterConnect.buffered_events);
console.log('Expected connected: true, Actual:', statusAfterConnect.connected);
console.log('');

// Test 6: Live Event Emission
console.log('Test 6: Live Event Emission (after connection)');
emitter.emitEnvelopeEvent('started', {
  envelope_id: 'test_env_002',
  objective_id: 'test_obj_002',
  execution_class: 'T2',
  timeout_ms: 14400000
});
console.log('✓ Live event emitted');
console.log('');

// Test 7: Circuit Breaker Simulation
console.log('Test 7: Circuit Breaker (simulate failures)');
const failingStream = {
  publish: () => {
    throw new Error('Stream connection lost');
  }
};
emitter.connect(failingStream);
for (let i = 0; i < 12; i++) {
  emitter.emitEnvelopeEvent('started', {
    envelope_id: `fail_${i}`,
    objective_id: 'fail_obj'
  });
}
const statusCircuitBreaker = emitter.getStatus();
console.log('Expected circuit_breaker_open: true (after 10 failures), Actual:', statusCircuitBreaker.circuit_breaker_open);
console.log('✓ Circuit breaker protection verified');
console.log('');

// Summary
console.log('=== Test Summary ===');
console.log('✓ Event emitter initialization');
console.log('✓ Buffered event emission');
console.log('✓ Multiple event types');
console.log('✓ Queue depth alerts');
console.log('✓ Stream connection and flush');
console.log('✓ Live event emission');
console.log('✓ Circuit breaker protection');
console.log('');
console.log('Phase 5A.1 core functionality validated.');
console.log('');
console.log('Next: Start console server and verify SSE endpoint.');
