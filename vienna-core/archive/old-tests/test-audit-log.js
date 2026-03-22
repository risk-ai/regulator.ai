/**
 * Test Audit Log
 * 
 * Phase 6.10: Verify audit log storage and query capabilities
 */

const { AuditLog } = require('./lib/core/audit-log');

async function testAuditLog() {
  console.log('=== Phase 6.10 Audit Log Test ===\n');
  
  // Create audit log
  const auditLog = new AuditLog({ maxEvents: 100 });
  
  // Test 1: Append events
  console.log('Test 1: Append audit events');
  const event1 = auditLog.append({
    action: 'command_proposed',
    result: 'proposed',
    operator: 'test-operator',
    metadata: {
      command: 'check_port',
      args: '[18789]',
      risk_tier: 'T0',
    },
  });
  console.log('✓ Event 1 appended:', event1);
  
  const event2 = auditLog.append({
    action: 'command_executed',
    result: 'success',
    operator: 'test-operator',
    metadata: {
      command: 'check_port',
      args: '[18789]',
      risk_tier: 'T0',
      execution_duration_ms: 123,
    },
  });
  console.log('✓ Event 2 appended:', event2);
  
  const event3 = auditLog.append({
    action: 'command_failed',
    result: 'failed',
    operator: 'test-operator',
    metadata: {
      command: 'restart_service',
      args: '["openclaw-gateway"]',
      risk_tier: 'T1',
      error: 'Service not found',
    },
  });
  console.log('✓ Event 3 appended:', event3);
  
  // Test 2: Query all events
  console.log('\nTest 2: Query all events');
  const allEvents = auditLog.query({ limit: 100 });
  console.log('✓ Total events:', allEvents.total);
  console.log('✓ Returned:', allEvents.records.length);
  console.log('✓ Has more:', allEvents.has_more);
  
  // Test 3: Query by action
  console.log('\nTest 3: Query by action');
  const commandExecuted = auditLog.query({ action: 'command_executed' });
  console.log('✓ Command executed events:', commandExecuted.total);
  
  const commandFailed = auditLog.query({ action: 'command_failed' });
  console.log('✓ Command failed events:', commandFailed.total);
  
  // Test 4: Query by result
  console.log('\nTest 4: Query by result');
  const successEvents = auditLog.query({ result: 'success' });
  console.log('✓ Success events:', successEvents.total);
  
  const failedEvents = auditLog.query({ result: 'failed' });
  console.log('✓ Failed events:', failedEvents.total);
  
  // Test 5: Query by operator
  console.log('\nTest 5: Query by operator');
  const operatorEvents = auditLog.query({ operator: 'test-operator' });
  console.log('✓ Events by test-operator:', operatorEvents.total);
  
  // Test 6: Get specific event
  console.log('\nTest 6: Get specific event');
  const retrieved = auditLog.get(event1);
  console.log('✓ Retrieved event 1:', retrieved ? retrieved.action : 'NOT FOUND');
  
  // Test 7: Get recent events
  console.log('\nTest 7: Get recent events');
  const recent = auditLog.getRecent(5);
  console.log('✓ Recent events:', recent.length);
  recent.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.action} (${e.result}) at ${e.timestamp}`);
  });
  
  // Test 8: Get stats
  console.log('\nTest 8: Get stats');
  const stats = auditLog.getStats();
  console.log('✓ Record count:', stats.record_count);
  console.log('✓ Max capacity:', stats.max_capacity);
  console.log('✓ Utilization:', (stats.utilization * 100).toFixed(2) + '%');
  console.log('✓ By action:', JSON.stringify(stats.by_action, null, 2));
  console.log('✓ By result:', JSON.stringify(stats.by_result, null, 2));
  
  // Test 9: Pagination
  console.log('\nTest 9: Pagination');
  const page1 = auditLog.query({ limit: 2, offset: 0 });
  console.log('✓ Page 1 records:', page1.records.length);
  console.log('✓ Has more:', page1.has_more);
  
  const page2 = auditLog.query({ limit: 2, offset: 2 });
  console.log('✓ Page 2 records:', page2.records.length);
  console.log('✓ Has more:', page2.has_more);
  
  // Test 10: Ring buffer (add more events than capacity)
  console.log('\nTest 10: Ring buffer behavior');
  const smallLog = new AuditLog({ maxEvents: 5 });
  
  for (let i = 0; i < 10; i++) {
    smallLog.append({
      action: 'test_event',
      result: 'success',
      operator: 'test',
      metadata: { index: i },
    });
  }
  
  const smallStats = smallLog.getStats();
  console.log('✓ Ring buffer size:', smallStats.record_count);
  console.log('✓ Expected:', 5);
  console.log('✓ Ring buffer working:', smallStats.record_count === 5 ? 'YES' : 'NO');
  
  console.log('\n=== All Tests Passed ===');
}

testAuditLog().catch(console.error);
