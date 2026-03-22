/**
 * Phase 4A: Executor Timeout Protection Tests
 * 
 * Tests timeout enforcement at executor wrapper level.
 * Validates T1/T2 execution classes, DLQ routing, and event emission.
 */

const { QueuedExecutor, ExecutionTimeoutError } = require('../lib/execution/queued-executor');
const { DLQReason } = require('../lib/execution/dead-letter-queue');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Phase 4A: Executor Timeout Protection', () => {
  let testDir;
  let executor;
  let replayEvents;
  let auditEvents;
  let mockViennaCore;
  
  beforeEach(async () => {
    // Create isolated test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase4a-'));
    
    replayEvents = [];
    auditEvents = [];
    
    // Mock Vienna core with event capture
    mockViennaCore = {
      warrant: {
        verify: jest.fn().mockResolvedValue({
          valid: true,
          warrant: {
            warrant_id: 'test_warrant',
            allowed_actions: [
              'test_action:target',
              'slow_action:target',
              'fast_action:target'
            ],
            expires_at: new Date(Date.now() + 3600000).toISOString()
          }
        })
      },
      audit: {
        emit: jest.fn(async (event) => {
          auditEvents.push(event);
        })
      },
      tradingGuard: {
        check: jest.fn().mockResolvedValue({ safe: true })
      }
    };
    
    // Create executor with short timeouts for testing
    executor = new QueuedExecutor(mockViennaCore, {
      queueOptions: {
        queueFile: path.join(testDir, 'queue.jsonl')
      },
      dlqOptions: {
        dlqFile: path.join(testDir, 'dlq.jsonl')
      },
      replayLog: {
        emit: async (event) => {
          replayEvents.push(event);
        }
      },
      timeoutPolicy: {
        default_timeout_ms: 100,   // 100ms for T1 (fast test)
        t2_timeout_ms: 500         // 500ms for T2 (fast test)
      }
    });
    
    await executor.initialize();
    
    // Register slow test adapter
    executor.registerAdapter('slow_action', {
      execute: async (action) => {
        const delayMs = action.delay_ms || 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return { success: true };
      }
    });
    
    // Register fast test adapter
    executor.registerAdapter('fast_action', {
      execute: async () => {
        return { success: true };
      }
    });
  });
  
  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  /**
   * Test 1: Envelope exceeding timeout → DLQ
   */
  test('T1: Envelope exceeding T1 timeout moves to DLQ', async () => {
    const envelope = {
      envelope_id: 'env_timeout_001',
      warrant_id: 'test_warrant',
      objective_id: 'obj_001',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 200  // Exceeds 100ms T1 timeout
        }
      ],
      execution_class: 'T1'  // Default timeout
    };
    
    // Submit envelope
    await executor.submit(envelope);
    
    // Wait for execution to start and timeout
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Check DLQ contains envelope with EXECUTION_TIMEOUT reason
    const dlqEntries = executor.getDeadLetters();
    expect(dlqEntries.length).toBe(1);
    expect(dlqEntries[0].envelope_id).toBe('env_timeout_001');
    expect(dlqEntries[0].reason).toBe(DLQReason.EXECUTION_TIMEOUT);
    expect(dlqEntries[0].error).toMatch(/exceeded timeout/i);
    
    // Check timeout event emitted to replay log
    const timeoutEvents = replayEvents.filter(e => e.event_type === 'execution_timeout');
    expect(timeoutEvents.length).toBe(1);
    expect(timeoutEvents[0].envelope_id).toBe('env_timeout_001');
    expect(timeoutEvents[0].timeout_ms).toBe(100);
    expect(timeoutEvents[0].duration_ms).toBeGreaterThan(99);
    
    // Check audit event
    const auditTimeoutEvents = auditEvents.filter(e => e.event_type === 'execution_timeout');
    expect(auditTimeoutEvents.length).toBe(1);
    
    // Check objective metrics updated
    const objective = executor.getObjectiveProgress('obj_001');
    expect(objective).toBeTruthy();
    expect(objective.failed).toBe(1);
  });
  
  /**
   * Test 2: T2 envelope exceeding T1 timeout but within T2 timeout → continues
   */
  test('T2: T2 envelope exceeding T1 timeout but within T2 timeout succeeds', async () => {
    const envelope = {
      envelope_id: 'env_t2_001',
      warrant_id: 'test_warrant',
      objective_id: 'obj_002',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 300  // Exceeds T1 (100ms) but within T2 (500ms)
        }
      ],
      execution_class: 'T2'  // Extended timeout
    };
    
    // Submit envelope
    await executor.submit(envelope);
    
    // Wait for execution to complete
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Check envelope NOT in DLQ
    const dlqEntries = executor.getDeadLetters();
    expect(dlqEntries.length).toBe(0);
    
    // Check no timeout events
    const timeoutEvents = replayEvents.filter(e => e.event_type === 'execution_timeout');
    expect(timeoutEvents.length).toBe(0);
    
    // Check envelope completed successfully
    const queueStats = executor.getQueueState();
    expect(queueStats.completed).toBe(1);
    expect(queueStats.failed).toBe(0);
    
    // Check objective metrics show success
    const objective = executor.getObjectiveProgress('obj_002');
    expect(objective).toBeTruthy();
    expect(objective.verified).toBe(1);
    expect(objective.failed).toBe(0);
  });
  
  /**
   * Test 3: Timeout event emitted to replay stream
   */
  test('T3: Timeout event emitted to replay stream with correct metadata', async () => {
    const envelope = {
      envelope_id: 'env_replay_001',
      warrant_id: 'test_warrant',
      objective_id: 'obj_003',
      trigger_id: 'trigger_001',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 150
        }
      ],
      execution_class: 'T1'
    };
    
    await executor.submit(envelope);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Validate execution_started event
    const startedEvents = replayEvents.filter(e => e.event_type === 'execution_started');
    expect(startedEvents.length).toBe(1);
    expect(startedEvents[0].envelope_id).toBe('env_replay_001');
    expect(startedEvents[0].execution_class).toBe('T1');
    expect(startedEvents[0].timeout_ms).toBe(100);
    
    // Validate execution_timeout event structure
    const timeoutEvents = replayEvents.filter(e => e.event_type === 'execution_timeout');
    expect(timeoutEvents.length).toBe(1);
    
    const timeoutEvent = timeoutEvents[0];
    expect(timeoutEvent.envelope_id).toBe('env_replay_001');
    expect(timeoutEvent.objective_id).toBe('obj_003');
    expect(timeoutEvent.trigger_id).toBe('trigger_001');
    expect(timeoutEvent.timeout_ms).toBe(100);
    expect(timeoutEvent.duration_ms).toBeGreaterThanOrEqual(100);
    expect(timeoutEvent.execution_class).toBe('T1');
    expect(timeoutEvent.timestamp).toBeTruthy();
    
    // Validate envelope_dead_lettered event
    const deadLetterEvents = replayEvents.filter(e => e.event_type === 'envelope_dead_lettered');
    expect(deadLetterEvents.length).toBe(1);
    expect(deadLetterEvents[0].reason).toBe(DLQReason.EXECUTION_TIMEOUT);
  });
  
  /**
   * Test 4: Objective metrics update after timeout
   */
  test('T4: Objective metrics updated correctly after timeout', async () => {
    const envelope1 = {
      envelope_id: 'env_metrics_001',
      warrant_id: 'test_warrant',
      objective_id: 'obj_metrics',
      proposed_by: 'test_agent',
      actions: [{ type: 'fast_action', target: 'target' }],
      execution_class: 'T1'
    };
    
    const envelope2 = {
      envelope_id: 'env_metrics_002',
      warrant_id: 'test_warrant',
      objective_id: 'obj_metrics',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 150  // Will timeout
        }
      ],
      execution_class: 'T1'
    };
    
    // Submit both envelopes
    await executor.submit(envelope1);
    await executor.submit(envelope2);
    
    // Wait for both to process
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Check objective metrics
    const objective = executor.getObjectiveProgress('obj_metrics');
    expect(objective).toBeTruthy();
    expect(objective.objective_id).toBe('obj_metrics');
    expect(objective.total_envelopes).toBeGreaterThanOrEqual(1);
    expect(objective.verified).toBe(1);  // envelope1 succeeded
    expect(objective.failed).toBe(1);    // envelope2 timed out
    expect(objective.dead_lettered).toBe(1);  // envelope2 moved to DLQ
    
    // Validate DLQ entry
    const dlqEntries = executor.getDeadLetters({ objective_id: 'obj_metrics' });
    expect(dlqEntries.length).toBe(1);
    expect(dlqEntries[0].envelope_id).toBe('env_metrics_002');
    expect(dlqEntries[0].objective_id).toBe('obj_metrics');
  });
  
  /**
   * Test 5: Lineage preserved after timeout failure
   */
  test('T5: Lineage preserved after timeout failure', async () => {
    const parentEnvelope = {
      envelope_id: 'env_parent',
      warrant_id: 'test_warrant',
      objective_id: 'obj_lineage',
      proposed_by: 'test_agent',
      actions: [{ type: 'fast_action', target: 'target' }],
      execution_class: 'T1'
    };
    
    const childEnvelope = {
      envelope_id: 'env_child',
      parent_envelope_id: 'env_parent',
      warrant_id: 'test_warrant',
      objective_id: 'obj_lineage',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 150  // Will timeout
        }
      ],
      execution_class: 'T1'
    };
    
    // Submit parent and child
    await executor.submit(parentEnvelope);
    await executor.submit(childEnvelope);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Validate lineage tracking
    const lineage = executor.getEnvelopeLineage('env_child');
    expect(lineage.length).toBe(2);
    expect(lineage[0].envelope_id).toBe('env_parent');
    expect(lineage[1].envelope_id).toBe('env_child');
    
    // Validate lineage integrity after timeout
    const integrity = executor.validateLineage();
    expect(integrity.valid).toBe(true);
    expect(integrity.issues.length).toBe(0);
    
    // Validate objective tree
    const tree = executor.getObjectiveTree('obj_lineage');
    expect(tree).toBeTruthy();
    expect(tree.objective_id).toBe('obj_lineage');
    expect(tree.envelope_count).toBe(2);
    expect(tree.roots.length).toBe(1);
    expect(tree.roots[0].envelope_id).toBe('env_parent');
    expect(tree.roots[0].children.length).toBe(1);
    expect(tree.roots[0].children[0].envelope_id).toBe('env_child');
  });
  
  /**
   * Test 6: Explicit timeout override on envelope
   */
  test('T6: Explicit timeout field on envelope overrides execution class', async () => {
    const envelope = {
      envelope_id: 'env_explicit_timeout',
      warrant_id: 'test_warrant',
      objective_id: 'obj_explicit',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 250
        }
      ],
      execution_class: 'T1',  // Would normally be 100ms
      timeout: 300  // Explicit override to 300ms
    };
    
    await executor.submit(envelope);
    await new Promise(resolve => setTimeout(resolve, 350));
    
    // Should succeed because explicit timeout is 300ms > 250ms delay
    const dlqEntries = executor.getDeadLetters();
    expect(dlqEntries.length).toBe(0);
    
    const queueStats = executor.getQueueState();
    expect(queueStats.completed).toBe(1);
  });
  
  /**
   * Test 7: UI behavior - DLQ entry shows timeout reason and duration
   */
  test('T7: DLQ entry contains timeout reason and duration for operator UI', async () => {
    const envelope = {
      envelope_id: 'env_ui_test',
      warrant_id: 'test_warrant',
      objective_id: 'obj_ui',
      proposed_by: 'test_agent',
      actions: [
        {
          type: 'slow_action',
          target: 'target',
          delay_ms: 150
        }
      ],
      execution_class: 'T1'
    };
    
    await executor.submit(envelope);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get DLQ entry
    const entry = executor.deadLetterQueue.getEntry('env_ui_test');
    expect(entry).toBeTruthy();
    
    // Validate UI-relevant fields
    expect(entry.reason).toBe(DLQReason.EXECUTION_TIMEOUT);
    expect(entry.error).toMatch(/exceeded timeout of 100ms/i);
    expect(entry.envelope_id).toBe('env_ui_test');
    expect(entry.objective_id).toBe('obj_ui');
    expect(entry.agent_id).toBe('test_agent');
    expect(entry.state).toBe('dead_lettered');
    expect(entry.dead_lettered_at).toBeTruthy();
    
    // Validate envelope preserved for potential requeue
    expect(entry.envelope).toBeTruthy();
    expect(entry.envelope.envelope_id).toBe('env_ui_test');
  });
});
