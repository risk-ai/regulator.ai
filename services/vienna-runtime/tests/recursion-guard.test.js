/**
 * Tests for Recursion Guard
 */

const { RecursionGuard, RecursionBlockedError, DEFAULT_POLICY } = require('../lib/execution/recursion-guard');
const { createEnvelope, createDescendantEnvelope, createRetryEnvelope } = require('../lib/schemas/envelope');

describe('RecursionGuard', () => {
  let guard;
  
  beforeEach(() => {
    guard = new RecursionGuard();
  });
  
  describe('Causal Depth Limit', () => {
    test('allows envelope within depth limit', () => {
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const child = createDescendantEnvelope(root, {
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const result = guard.validate(child);
      
      expect(child.causal_depth).toBe(1);
      expect(result.allowed).toBe(true);
    });
    
    test('blocks envelope exceeding depth limit', () => {
      // Create chain: root -> child1 -> child2 -> child3 (depth 3) -> child4 (depth 4, should fail)
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        loop_budget_remaining: 10 // High budget to avoid budget limit
      });
      
      let current = root;
      for (let i = 0; i < 4; i++) {
        current = createDescendantEnvelope(current, {
          actions: [{ type: 'write_file', target: `/test${i}.txt`, payload: {} }],
          warrant_id: 'warrant_123',
          origin_id: 'talleyrand'
        });
      }
      
      const result = guard.validate(current);
      
      expect(current.causal_depth).toBe(4);
      expect(result.allowed).toBe(false);
      expect(result.blocked_by).toBe('max_causal_depth');
      expect(result.reason).toContain('exceeds limit');
    });
  });
  
  describe('Descendant Budget', () => {
    test('tracks budget per trigger_id', () => {
      const triggerId = 'trig_test_001';
      const objectiveId = 'obj_test_001';
      
      // Create root envelope (attempt = 0, counts against budget)
      const root = createEnvelope({
        actions: [{ type: 'write_file', target: '/test_0.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: triggerId,
        objective_id: objectiveId,
        attempt: 0
      });
      
      expect(guard.validate(root).allowed).toBe(true);
      guard.recordExecution(root);
      
      // Create 4 more siblings from root (total 5 envelopes, hitting the limit)
      for (let i = 1; i < 5; i++) {
        const sibling = createDescendantEnvelope(root, {
          actions: [{ type: 'write_file', target: `/test_${i}.txt`, payload: {} }],
          warrant_id: 'warrant_123',
          origin_id: 'talleyrand'
        });
        
        const result = guard.validate(sibling);
        expect(result.allowed).toBe(true);
        guard.recordExecution(sibling);
      }
      
      // 6th envelope should be blocked by trigger budget
      const tooMany = createDescendantEnvelope(root, {
        actions: [{ type: 'write_file', target: '/test_5.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const result = guard.validate(tooMany);
      expect(result.allowed).toBe(false);
      expect(result.blocked_by).toBe('descendant_budget');
    });
    
    test('retries do not consume budget', () => {
      const triggerId = 'trig_test_002';
      
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: triggerId,
        attempt: 0
      });
      
      guard.recordExecution(envelope);
      const budgetBefore = guard.triggerBudgets.get(triggerId);
      
      // Create retry (same envelope, incremented attempt)
      const retry = createRetryEnvelope(envelope);
      guard.recordExecution(retry);
      
      const budgetAfter = guard.triggerBudgets.get(triggerId);
      
      expect(budgetAfter).toBe(budgetBefore); // Budget unchanged
    });
  });
  
  describe('Idempotency', () => {
    test('blocks duplicate idempotency key within window', () => {
      const envelope1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: 'obj_same'
      });
      
      guard.recordExecution(envelope1);
      
      // Create second envelope with same objective and actions (same idempotency key)
      const envelope2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: 'obj_same'
      });
      
      // Should have same idempotency key
      expect(envelope2.idempotency_key).toBe(envelope1.idempotency_key);
      
      const result = guard.validate(envelope2);
      
      expect(result.allowed).toBe(false);
      expect(result.blocked_by).toBe('idempotency');
    });
    
    test('allows duplicate after window expires', (done) => {
      const customGuard = new RecursionGuard({
        policy: { ...DEFAULT_POLICY, duplicate_window_seconds: 0.1, cooldown_seconds: 0.1 }
      });
      
      const envelope1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: 'obj_same',
        trigger_id: 'trig_idem_test',
        loop_budget_remaining: 10
      });
      
      customGuard.recordExecution(envelope1);
      
      // Wait for both idempotency and cooldown windows to expire
      setTimeout(() => {
        const envelope2 = createEnvelope({
          actions: [{ type: 'write_file', target: '/test.txt', payload: { content: 'foo' } }],
          warrant_id: 'warrant_123',
          origin_id: 'talleyrand',
          objective_id: 'obj_same',
          trigger_id: 'trig_idem_test',
          loop_budget_remaining: 10
        });
        
        const result = customGuard.validate(envelope2);
        if (!result.allowed) {
          console.log('Validation failed:', result);
        }
        expect(result.allowed).toBe(true);
        done();
      }, 150);
    }, 10000);
  });
  
  describe('Cooldown Windows', () => {
    test('blocks same target within cooldown', () => {
      const envelope1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        loop_budget_remaining: 10 // High budget
      });
      
      guard.recordExecution(envelope1);
      
      // Attempt same target again (different objective to avoid idempotency check)
      const envelope2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        objective_id: 'obj_different', // Different objective
        loop_budget_remaining: 10
      });
      
      const result = guard.validate(envelope2);
      
      expect(result.allowed).toBe(false);
      expect(result.blocked_by).toBe('cooldown');
    });
    
    test('allows different target during cooldown', () => {
      const envelope1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test1.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: 'trig_cooldown_test_1',
        loop_budget_remaining: 10
      });
      
      guard.recordExecution(envelope1);
      
      const envelope2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/test2.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: 'trig_cooldown_test_2', // Different trigger
        loop_budget_remaining: 10
      });
      
      const result = guard.validate(envelope2);
      
      if (!result.allowed) {
        console.log('Different target validation failed:', result);
      }
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('Retry Limit', () => {
    test('blocks envelope exceeding retry limit', () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        attempt: 3 // exceeds default max of 2
      });
      
      const result = guard.validate(envelope);
      
      expect(result.allowed).toBe(false);
      expect(result.blocked_by).toBe('retry_limit');
    });
  });
  
  describe('Scope Detection', () => {
    test('detects trading_config scope', () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/path/kalshi_mm_bot/config.json', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      const result = guard.validate(envelope);
      
      expect(result.scope).toBe('trading_config');
    });
    
    test('applies stricter limits to trading_config scope', () => {
      const triggerId = 'trig_trading_001';
      
      // First envelope should pass
      const envelope1 = createEnvelope({
        actions: [{ type: 'write_file', target: '/kalshi_mm_bot/config.json', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: triggerId
      });
      
      const result1 = guard.validate(envelope1);
      expect(result1.allowed).toBe(true);
      
      guard.recordExecution(envelope1);
      
      // Second envelope should be blocked (trading_config max_descendants = 1)
      const envelope2 = createEnvelope({
        actions: [{ type: 'write_file', target: '/kalshi_mm_bot/config.json', payload: { different: true } }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand',
        trigger_id: triggerId
      });
      
      const result2 = guard.validate(envelope2);
      expect(result2.allowed).toBe(false);
      expect(result2.blocked_by).toBe('descendant_budget');
    });
  });
  
  describe('Cleanup', () => {
    test('removes expired cache entries', () => {
      const customGuard = new RecursionGuard({
        policy: { ...DEFAULT_POLICY, duplicate_window_seconds: 0.1, cooldown_seconds: 0.1 }
      });
      
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      customGuard.recordExecution(envelope);
      
      expect(customGuard.idempotencyCache.size).toBe(1);
      expect(customGuard.cooldownTracker.size).toBe(1);
      
      return new Promise(resolve => {
        setTimeout(() => {
          customGuard.cleanup();
          
          expect(customGuard.idempotencyCache.size).toBe(0);
          expect(customGuard.cooldownTracker.size).toBe(0);
          resolve();
        }, 150);
      });
    });
  });
  
  describe('State Observability', () => {
    test('exposes current state', () => {
      const envelope = createEnvelope({
        actions: [{ type: 'write_file', target: '/test.txt', payload: {} }],
        warrant_id: 'warrant_123',
        origin_id: 'talleyrand'
      });
      
      guard.recordExecution(envelope);
      
      const state = guard.getState();
      
      expect(state).toHaveProperty('trigger_budgets');
      expect(state).toHaveProperty('active_cooldowns');
      expect(state).toHaveProperty('cached_idempotency_keys');
      expect(state.cached_idempotency_keys).toBe(1);
    });
  });
});
