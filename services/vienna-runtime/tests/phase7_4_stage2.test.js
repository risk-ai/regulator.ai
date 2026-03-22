/**
 * Phase 7.4 Stage 2 Tests: Rate Limiting and Agent Budgets
 * 
 * Validates:
 * - Per-agent rate limiting
 * - Global rate limiting
 * - Per-objective rate limiting
 * - Agent execution budgets
 * - Fair capacity distribution
 */

const RateLimiter = require('../lib/execution/rate-limiter');
const AgentBudget = require('../lib/execution/agent-budget');
const { QueuedExecutor, RateLimitError, BudgetExceededError } = require('../lib/execution/queued-executor');
const { ReplayLog } = require('../lib/execution/replay-log');
const fs = require('fs');
const path = require('path');

describe('Phase 7.4 Stage 2: Rate Limiting and Agent Budgets', () => {
  
  describe('RateLimiter (standalone)', () => {
    let limiter;
    
    beforeEach(() => {
      limiter = new RateLimiter({
        max_envelopes_per_minute_per_agent: 3,
        max_envelopes_per_minute_global: 10,
        max_envelopes_per_minute_per_objective: 5
      });
    });
    
    test('allows admission below limits', () => {
      const envelope = {
        envelope_id: 'env_001',
        proposed_by: 'agent_a',
        objective_id: 'obj_001'
      };
      
      const result = limiter.checkAdmission(envelope);
      expect(result.allowed).toBe(true);
    });
    
    test('blocks per-agent limit', () => {
      const envelopes = Array.from({ length: 4 }, (_, i) => ({
        envelope_id: `env_${i}`,
        proposed_by: 'agent_a',
        objective_id: 'obj_001'
      }));
      
      // Admit first 3
      for (let i = 0; i < 3; i++) {
        const result = limiter.checkAdmission(envelopes[i]);
        expect(result.allowed).toBe(true);
        limiter.recordAdmission(envelopes[i]);
      }
      
      // 4th should be blocked
      const result = limiter.checkAdmission(envelopes[3]);
      expect(result.allowed).toBe(false);
      expect(result.limit_type).toBe('AGENT_RATE_LIMIT');
      expect(result.agent_id).toBe('agent_a');
    });
    
    test('blocks global limit', () => {
      const envelopes = Array.from({ length: 11 }, (_, i) => ({
        envelope_id: `env_${i}`,
        proposed_by: `agent_${i}`,
        objective_id: `obj_${i}`
      }));
      
      // Admit first 10
      for (let i = 0; i < 10; i++) {
        const result = limiter.checkAdmission(envelopes[i]);
        expect(result.allowed).toBe(true);
        limiter.recordAdmission(envelopes[i]);
      }
      
      // 11th should be blocked
      const result = limiter.checkAdmission(envelopes[10]);
      expect(result.allowed).toBe(false);
      expect(result.limit_type).toBe('GLOBAL_RATE_LIMIT');
    });
    
    test('blocks per-objective limit', () => {
      const envelopes = Array.from({ length: 6 }, (_, i) => ({
        envelope_id: `env_${i}`,
        proposed_by: `agent_${i}`,
        objective_id: 'obj_shared'
      }));
      
      // Admit first 5
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkAdmission(envelopes[i]);
        expect(result.allowed).toBe(true);
        limiter.recordAdmission(envelopes[i]);
      }
      
      // 6th should be blocked
      const result = limiter.checkAdmission(envelopes[5]);
      expect(result.allowed).toBe(false);
      expect(result.limit_type).toBe('OBJECTIVE_RATE_LIMIT');
      expect(result.objective_id).toBe('obj_shared');
    });
    
    test('sliding window expires old entries', done => {
      const envelope = {
        envelope_id: 'env_001',
        proposed_by: 'agent_a',
        objective_id: 'obj_001'
      };
      
      // Fill up agent limit
      for (let i = 0; i < 3; i++) {
        limiter.checkAdmission({ ...envelope, envelope_id: `env_${i}` });
        limiter.recordAdmission({ ...envelope, envelope_id: `env_${i}` });
      }
      
      // Should be blocked
      expect(limiter.checkAdmission(envelope).allowed).toBe(false);
      
      // Wait for window to expire (using short window for test)
      limiter.windowMs = 100;
      
      setTimeout(() => {
        // Should be allowed again
        expect(limiter.checkAdmission(envelope).allowed).toBe(true);
        done();
      }, 150);
    });
    
    test('getState returns accurate counts', () => {
      const envelopes = [
        { envelope_id: 'env_1', proposed_by: 'agent_a', objective_id: 'obj_1' },
        { envelope_id: 'env_2', proposed_by: 'agent_a', objective_id: 'obj_2' },
        { envelope_id: 'env_3', proposed_by: 'agent_b', objective_id: 'obj_1' }
      ];
      
      envelopes.forEach(env => {
        limiter.checkAdmission(env);
        limiter.recordAdmission(env);
      });
      
      const state = limiter.getState();
      
      expect(state.global.count).toBe(3);
      expect(state.global.remaining).toBe(7);
      expect(state.agents.agent_a.count).toBe(2);
      expect(state.agents.agent_b.count).toBe(1);
      expect(state.objectives.obj_1.count).toBe(2);
    });
  });
  
  describe('AgentBudget (standalone)', () => {
    let budget;
    
    beforeEach(() => {
      budget = new AgentBudget({
        max_active_envelopes_per_agent: 2,
        max_queued_envelopes_per_agent: 5
      });
    });
    
    test('allows admission below queue budget', () => {
      const result = budget.checkAdmission('agent_a');
      expect(result.allowed).toBe(true);
    });
    
    test('blocks when queue budget exceeded', () => {
      // Queue 5 envelopes
      for (let i = 0; i < 5; i++) {
        budget.recordQueued('agent_a', `env_${i}`);
      }
      
      // 6th should be blocked
      const result = budget.checkAdmission('agent_a');
      expect(result.allowed).toBe(false);
      expect(result.limit_type).toBe('AGENT_QUEUE_BUDGET');
    });
    
    test('allows execution below active budget', () => {
      const result = budget.checkExecution('agent_a');
      expect(result.allowed).toBe(true);
    });
    
    test('blocks when active budget exceeded', () => {
      // Start 2 executions
      budget.recordExecutionStart('agent_a', 'env_1');
      budget.recordExecutionStart('agent_a', 'env_2');
      
      // 3rd should be blocked
      const result = budget.checkExecution('agent_a');
      expect(result.allowed).toBe(false);
      expect(result.limit_type).toBe('AGENT_EXECUTION_BUDGET');
    });
    
    test('moves envelope from queued to active', () => {
      budget.recordQueued('agent_a', 'env_1');
      
      let state = budget.getState();
      expect(state.agents.agent_a.queued.count).toBe(1);
      expect(state.agents.agent_a.active.count).toBe(0);
      
      budget.recordExecutionStart('agent_a', 'env_1');
      
      state = budget.getState();
      expect(state.agents.agent_a.queued.count).toBe(0);
      expect(state.agents.agent_a.active.count).toBe(1);
    });
    
    test('removes envelope from active on completion', () => {
      budget.recordQueued('agent_a', 'env_1');
      budget.recordExecutionStart('agent_a', 'env_1');
      
      let state = budget.getState();
      expect(state.agents.agent_a.active.count).toBe(1);
      
      budget.recordExecutionComplete('agent_a', 'env_1');
      
      state = budget.getState();
      expect(state.agents.agent_a.active.count).toBe(0);
    });
    
    test('different agents have independent budgets', () => {
      // Fill agent_a queue
      for (let i = 0; i < 5; i++) {
        budget.recordQueued('agent_a', `env_a_${i}`);
      }
      
      // agent_a should be blocked
      expect(budget.checkAdmission('agent_a').allowed).toBe(false);
      
      // agent_b should still be allowed
      expect(budget.checkAdmission('agent_b').allowed).toBe(true);
    });
  });
  
  describe('QueuedExecutor integration', () => {
    let testDir;
    let executor;
    let replayLog;
    
    beforeEach(async () => {
      testDir = path.join(__dirname, '../.test-data/phase7_4_stage2');
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
      
      replayLog = new ReplayLog({
        logDir: path.join(testDir, 'replay')
      });
      
      await replayLog.initialize();
      
      const mockCore = {
        warrant: {
          verify: async () => ({
            valid: true,
            warrant: {
              warrant_id: 'warrant_001',
              truth_snapshot_id: 'truth_001',
              plan_id: 'plan_001',
              allowed_actions: ['test_action'],
              risk_tier: 'T0'
            }
          })
        },
        truth: {
          verify: async () => ({ valid: true })
        },
        tradingGuard: {
          check: async () => ({ safe: true })
        },
        audit: {
          emit: async () => {}
        }
      };
      
      executor = new QueuedExecutor(mockCore, {
        queueOptions: {
          queueDir: path.join(testDir, 'queue')
        },
        controlStateDir: path.join(testDir, 'control'),
        rateLimiterPolicy: {
          max_envelopes_per_minute_per_agent: 3,
          max_envelopes_per_minute_global: 10,
          max_envelopes_per_minute_per_objective: 5
        },
        agentBudgetPolicy: {
          max_active_envelopes_per_agent: 2,
          max_queued_envelopes_per_agent: 5
        },
        replayLog
      });
      
      await executor.initialize();
      
      // Register mock adapter
      executor.registerAdapter('test_action', {
        execute: async () => ({ success: true })
      });
    });
    
    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });
    
    test('rejects envelope exceeding agent rate limit', async () => {
      const envelopes = Array.from({ length: 4 }, (_, i) => ({
        envelope_id: `env_${i}`,
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: 'warrant_001',
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      }));
      
      // Submit first 3 should succeed
      for (let i = 0; i < 3; i++) {
        await expect(executor.submit(envelopes[i])).resolves.toHaveProperty('queued', true);
      }
      
      // 4th should be rejected
      await expect(executor.submit(envelopes[3])).rejects.toThrow(RateLimitError);
    });
    
    test('rejects envelope exceeding agent queue budget', async () => {
      // Create executor with higher rate limits to isolate budget testing
      const executorHighRate = new QueuedExecutor(executor.viennaCore, {
        queueOptions: {
          queueDir: path.join(testDir, 'queue2')
        },
        controlStateDir: path.join(testDir, 'control2'),
        rateLimiterPolicy: {
          max_envelopes_per_minute_per_agent: 100, // High enough to not block
          max_envelopes_per_minute_global: 100,
          max_envelopes_per_minute_per_objective: 100
        },
        agentBudgetPolicy: {
          max_active_envelopes_per_agent: 2,
          max_queued_envelopes_per_agent: 5
        },
        replayLog: executor.replayLog
      });
      
      await executorHighRate.initialize();
      executorHighRate.registerAdapter('test_action', {
        execute: async () => ({ success: true })
      });
      
      // Pause execution to prevent background loop from processing envelopes during test
      executorHighRate.pauseExecution('testing agent budget');
      
      const envelopes = Array.from({ length: 6 }, (_, i) => ({
        envelope_id: `env_${i}`,
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: 'warrant_001',
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      }));
      
      // Submit first 5 should succeed (within budget)
      for (let i = 0; i < 5; i++) {
        await executorHighRate.submit(envelopes[i]);
      }
      
      // 6th should be rejected for budget
      await expect(executorHighRate.submit(envelopes[5])).rejects.toThrow(BudgetExceededError);
    });
    
    test('getRateLimiterState returns current state', async () => {
      const envelope = {
        envelope_id: 'env_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: 'warrant_001',
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      const state = executor.getRateLimiterState();
      expect(state.global.count).toBe(1);
      expect(state.agents.agent_a.count).toBe(1);
    });
    
    test('getAgentBudgetState returns current state', async () => {
      const envelope = {
        envelope_id: 'env_001',
        envelope_type: 'test',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        warrant_id: 'warrant_001',
        causal_depth: 0,
        proposed_by: 'agent_a',
        actions: [{ type: 'test_action', target: '/tmp/test.txt' }]
      };
      
      await executor.submit(envelope);
      
      const state = executor.getAgentBudgetState();
      expect(state.agents.agent_a.queued.count).toBe(1);
    });
  });
});
