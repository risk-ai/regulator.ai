/**
 * Phase 7.3 End-to-End Integration Test
 * 
 * Validates complete system behavior:
 * - Recursion guard → Queue → Executor → Replay log → Execution state
 * 
 * Critical assertions:
 * - Retries reuse same envelope_id
 * - Recursion blocks are visible in state
 * - Queue survives restart without duplicates
 * - No authority regressions
 */

const fs = require('fs').promises;
const path = require('path');
const ViennaCore = require('../index');
const { createEnvelope, createDescendantEnvelope } = require('../lib/schemas/envelope');

const TEST_WORKSPACE = path.join(__dirname, '../.test-phase7_3');
const TEST_QUEUE_FILE = path.join(TEST_WORKSPACE, 'queue.jsonl');
const TEST_REPLAY_FILE = path.join(TEST_WORKSPACE, 'replay.jsonl');
const TEST_WARRANTS_DIR = path.join(TEST_WORKSPACE, 'warrants', 'active');
const TEST_AUDIT_DIR = path.join(TEST_WORKSPACE, 'warrants', 'audit');
const TEST_TRUTH_DIR = path.join(TEST_WORKSPACE, 'truth_snapshots');

describe('Phase 7.3 End-to-End Integration', () => {
  let viennaCore;
  
  // Helper to create valid truth snapshot
  async function createTruthSnapshot() {
    const truthId = `truth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const truthPath = path.join(TEST_TRUTH_DIR, `${truthId}.json`);
    await fs.writeFile(truthPath, JSON.stringify({
      id: truthId,
      timestamp: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      state: { test: true }
    }));
    return truthId;
  }
  
  beforeAll(async () => {
    // Clean test workspace
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
    
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
    await fs.mkdir(TEST_WARRANTS_DIR, { recursive: true });
    await fs.mkdir(TEST_AUDIT_DIR, { recursive: true });
    await fs.mkdir(TEST_TRUTH_DIR, { recursive: true });
    
    // Initialize Vienna Core with Phase 7.3
    viennaCore = ViennaCore;
    viennaCore.init({
      adapter: 'openclaw',
      workspace: TEST_WORKSPACE,
      phase7_3: {
        queueOptions: { queueFile: TEST_QUEUE_FILE },
        replayOptions: { replayFile: TEST_REPLAY_FILE },
        recursionOptions: {
          policy: {
            max_causal_depth: 3,
            max_descendants_per_root: 5,
            max_retries_per_envelope: 2
          }
        }
      }
    });
    
    await viennaCore.initPhase7_3();
  });
  
  afterAll(async () => {
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });
  
  describe('Scenario 1: Happy Path', () => {
    test('complete lifecycle from proposal to completion', async () => {
      // Create truth snapshot
      const truthId = await createTruthSnapshot();
      
      // Issue warrant
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_happy',
        objective: 'Test happy path',
        allowedActions: ['write_file:/tmp/test_happy.txt'],
        riskTier: 'T0'
      });
      
      // Create envelope
      const envelope = createEnvelope({
        actions: [{
          type: 'write_file',
          target: '/tmp/test_happy.txt',
          content: 'Phase 7.3 test'
        }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test',
        proposed_by: 'integration_test'
      });
      
      // Submit to queued executor
      const submission = await viennaCore.queuedExecutor.submit(envelope);
      
      expect(submission.queued).toBe(true);
      expect(submission.envelope_id).toBe(envelope.envelope_id);
      
      // Execute
      const result = await viennaCore.queuedExecutor.executeNext();
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.envelope_id).toBe(envelope.envelope_id);
      
      // Verify replay log
      const replayEvents = await viennaCore.replayLog.query({
        envelope_id: envelope.envelope_id
      });
      
      expect(replayEvents.length).toBeGreaterThanOrEqual(3);
      expect(replayEvents.some(e => e.event_type === 'envelope_queued')).toBe(true);
      expect(replayEvents.some(e => e.event_type === 'envelope_executing')).toBe(true);
      expect(replayEvents.some(e => e.event_type === 'envelope_completed')).toBe(true);
      
      // Verify execution state via replay log (queue clears completed entries)
      const metrics = await viennaCore.replayLog.getMetrics();
      expect(metrics.completed_count).toBeGreaterThanOrEqual(1);
    });
  });
  
  describe('Scenario 2: Recursion Block', () => {
    test('blocks envelope exceeding depth limit', async () => {
      const truthId = await createTruthSnapshot();
      
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_recursion',
        objective: 'Test recursion block',
        allowedActions: ['write_file:/tmp/test_recursion.txt'],
        riskTier: 'T0'
      });
      
      // Create root
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test_recursion.txt', payload: {} }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test',
        loop_budget_remaining: 10 // High budget to avoid budget limit
      });
      
      // Create deep descendant (depth 4, exceeds limit of 3)
      let current = root;
      for (let i = 0; i < 4; i++) {
        current = createDescendantEnvelope(current, {
          actions: [{ type: 'write_file', target: `/tmp/test_recursion_${i}.txt`, payload: {} }],
          warrant_id: warrant.warrant_id,
          origin_id: 'test'
        });
      }
      
      // Submit should fail with RecursionBlockedError
      await expect(
        viennaCore.queuedExecutor.submit(current)
      ).rejects.toThrow('Causal depth');
      
      // Verify recursion rejection in replay log
      const replayEvents = await viennaCore.replayLog.query({
        event_type: 'recursion_rejected'
      });
      
      const rejection = replayEvents.find(e => e.envelope_id === current.envelope_id);
      expect(rejection).toBeDefined();
      expect(rejection.blocked_by).toBe('max_causal_depth');
    });
    
    test('blocks envelope exceeding descendant budget', async () => {
      const truthId = await createTruthSnapshot();
      
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_budget',
        objective: 'Test budget exhaustion',
        allowedActions: [
          'write_file:/tmp/test_budget_0.txt',
          'write_file:/tmp/test_budget_1.txt',
          'write_file:/tmp/test_budget_2.txt',
          'write_file:/tmp/test_budget_3.txt',
          'write_file:/tmp/test_budget_4.txt',
          'write_file:/tmp/test_budget_5.txt'
        ],
        riskTier: 'T0'
      });
      
      const triggerId = `trig_budget_${Date.now()}`;
      const objectiveId = `obj_budget_${Date.now()}`;
      
      // Submit 5 envelopes (hits default max_descendants_per_root = 5)
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test_budget_0.txt', content: 'test' }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test',
        trigger_id: triggerId,
        objective_id: objectiveId,
        attempt: 0
      });
      
      await viennaCore.queuedExecutor.submit(root);
      await viennaCore.queuedExecutor.executeNext();
      
      // Submit 4 more descendants
      for (let i = 1; i < 5; i++) {
        const descendant = createDescendantEnvelope(root, {
          actions: [{ type: 'write_file', target: `/tmp/test_budget_${i}.txt`, content: 'test' }],
          warrant_id: warrant.warrant_id,
          origin_id: 'test'
        });
        
        await viennaCore.queuedExecutor.submit(descendant);
        await viennaCore.queuedExecutor.executeNext();
      }
      
      // 6th should be blocked
      const tooMany = createDescendantEnvelope(root, {
        actions: [{ type: 'write_file', target: '/tmp/test_budget_5.txt', content: 'test' }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test'
      });
      
      await expect(
        viennaCore.queuedExecutor.submit(tooMany)
      ).rejects.toThrow();
    });
  });
  
  describe('Scenario 3: Retry Path (Transient Failure)', () => {
    test('retries reuse same envelope_id and increment attempt', async () => {
      // This test would require a mock adapter that fails transiently
      // For now, verify the retry envelope creation logic
      
      const { createRetryEnvelope } = require('../lib/schemas/envelope');
      
      const truthId = await createTruthSnapshot();
      
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_retry',
        objective: 'Test retry logic',
        allowedActions: ['write_file:/tmp/test_retry.txt'],
        riskTier: 'T0'
      });
      
      const original = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test_retry.txt', payload: {} }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test',
        attempt: 0
      });
      
      const retry1 = createRetryEnvelope(original);
      
      // CRITICAL: Same envelope_id
      expect(retry1.envelope_id).toBe(original.envelope_id);
      
      // CRITICAL: Incremented attempt
      expect(retry1.attempt).toBe(1);
      
      // CRITICAL: Same objective/trigger
      expect(retry1.objective_id).toBe(original.objective_id);
      expect(retry1.trigger_id).toBe(original.trigger_id);
      
      const retry2 = createRetryEnvelope(retry1);
      expect(retry2.envelope_id).toBe(original.envelope_id);
      expect(retry2.attempt).toBe(2);
      
      // CRITICAL: Max retries enforced
      expect(() => createRetryEnvelope(retry2)).toThrow('Maximum retry attempts exceeded');
    });
    
    test('failure classifier distinguishes transient from permanent', () => {
      const { FailureClassifier } = require('../lib/execution/failure-classifier');
      const classifier = new FailureClassifier();
      
      // Transient
      const transientError = new Error('Network timeout');
      const transientResult = classifier.classify(transientError);
      expect(transientResult.retryable).toBe(true);
      
      // Permanent
      const permanentError = new Error('Warrant invalid');
      const permanentResult = classifier.classify(permanentError);
      expect(permanentResult.retryable).toBe(false);
    });
  });
  
  describe('Scenario 4: Permanent Failure', () => {
    test('permanent failure does not trigger retry', () => {
      const { FailureClassifier } = require('../lib/execution/failure-classifier');
      const classifier = new FailureClassifier();
      
      const permanentErrors = [
        new Error('Warrant expired'),
        new Error('Permission denied'),
        new Error('Trading guard blocked'),
        new Error('Action not in scope')
      ];
      
      permanentErrors.forEach(error => {
        const result = classifier.classify(error);
        expect(result.category).toBe('permanent');
        expect(result.retryable).toBe(false);
      });
    });
  });
  
  describe('Scenario 5: Restart Durability', () => {
    test('queue state survives restart without duplicates', async () => {
      const truthId = await createTruthSnapshot();
      
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_durability',
        objective: 'Test restart durability',
        allowedActions: ['write_file:/tmp/test_durability.txt'],
        riskTier: 'T0'
      });
      
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test_durability.txt', content: 'test' }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test'
      });
      
      // Use separate queue instance to avoid automatic execution
      const { ExecutionQueue } = require('../lib/execution/execution-queue');
      const testQueue = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
      await testQueue.initialize();
      
      // Enqueue directly without executor
      await testQueue.enqueue(envelope);
      
      const beforeStats = testQueue.getStats();
      expect(beforeStats.queued).toBeGreaterThanOrEqual(1);
      
      // Simulate restart by creating new queue instance
      const newQueue = new ExecutionQueue({ queueFile: TEST_QUEUE_FILE });
      await newQueue.initialize();
      
      // Verify envelope still in queue
      const afterEntry = newQueue.getEntry(envelope.envelope_id);
      expect(afterEntry).toBeDefined();
      expect(afterEntry.state).toBe('queued');
      
      // Verify no duplicate
      const allEntries = newQueue.getAllEntries();
      const matchingEntries = allEntries.filter(e => e.envelope_id === envelope.envelope_id);
      expect(matchingEntries.length).toBe(1);
    });
  });
  
  describe('Phase 7.2 Authority Guarantees (No Regression)', () => {
    test('agents cannot execute directly (must propose envelopes)', async () => {
      // Verify executor is not directly exposed to agents
      expect(viennaCore.executor).toBeDefined();
      expect(viennaCore.queuedExecutor).toBeDefined();
      
      // Agents should only have access to read + propose tools
      // (This is enforced by agent tool policy, not tested here directly)
    });
    
    test('all mutations route through executor', async () => {
      const truthId = await createTruthSnapshot();
      
      const warrant = await viennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'plan_authority',
        objective: 'Test authority boundary',
        allowedActions: ['write_file:/tmp/test_authority.txt'],
        riskTier: 'T0'
      });
      
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test_authority.txt', content: 'test' }],
        warrant_id: warrant.warrant_id,
        origin_id: 'test'
      });
      
      // Submit via queued executor (correct path)
      await viennaCore.queuedExecutor.submit(envelope);
      await viennaCore.queuedExecutor.executeNext();
      
      // Verify execution was recorded
      const events = await viennaCore.replayLog.query({ envelope_id: envelope.envelope_id });
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.event_type === 'envelope_queued' || e.event_type === 'envelope_completed')).toBe(true);
    });
  });
  
  describe('Critical Assertions', () => {
    test('parent_envelope_id preserved in descendants', () => {
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/tmp/test.txt', payload: {} }],
        warrant_id: 'warrant_test',
        origin_id: 'test'
      });
      
      const child = createDescendantEnvelope(root, {
        actions: [{ type: 'write_file', target: '/tmp/test2.txt', payload: {} }],
        warrant_id: 'warrant_test',
        origin_id: 'test'
      });
      
      expect(child.parent_envelope_id).toBe(root.envelope_id);
      expect(child.objective_id).toBe(root.objective_id);
      expect(child.trigger_id).toBe(root.trigger_id);
      expect(child.causal_depth).toBe(root.causal_depth + 1);
    });
    
    test('idempotency_key dedupes duplicate work', () => {
      const { generateIdempotencyKey } = require('../lib/schemas/envelope');
      
      const actions1 = [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }];
      const actions2 = [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }];
      const actions3 = [{ type: 'write_file', target: '/test.txt', payload: { content: 'bar' } }];
      
      const key1 = generateIdempotencyKey('obj_123', actions1);
      const key2 = generateIdempotencyKey('obj_123', actions2);
      const key3 = generateIdempotencyKey('obj_123', actions3);
      
      expect(key1).toBe(key2); // Same actions = same key
      expect(key1).not.toBe(key3); // Different payload = different key
    });
  });
});
