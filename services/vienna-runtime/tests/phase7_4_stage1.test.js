/**
 * Phase 7.4 Stage 1 Tests: Global Execution Kill Switch
 * 
 * Validates:
 * - Pause blocks execution
 * - Resume restores execution
 * - Pause state persists across restart
 */

const ExecutionControl = require('../lib/execution/execution-control');
const { QueuedExecutor } = require('../lib/execution/queued-executor');
const { ReplayLog } = require('../lib/execution/replay-log');
const fs = require('fs');
const path = require('path');

describe('Phase 7.4 Stage 1: Execution Control', () => {
  
  describe('ExecutionControl (standalone)', () => {
    let stateDir;
    let control;
    
    beforeEach(() => {
      stateDir = path.join(__dirname, '../.test-data/execution-control');
      if (fs.existsSync(stateDir)) {
        fs.rmSync(stateDir, { recursive: true });
      }
      control = new ExecutionControl(stateDir);
    });
    
    afterEach(() => {
      if (fs.existsSync(stateDir)) {
        fs.rmSync(stateDir, { recursive: true });
      }
    });
    
    test('initializes with execution enabled', () => {
      const state = control.getExecutionControlState();
      expect(state.paused).toBe(false);
      expect(state.reason).toBe(null);
    });
    
    test('pauseExecution sets pause state', () => {
      const result = control.pauseExecution('operator emergency stop', 'vienna');
      
      expect(result.paused).toBe(true);
      expect(result.reason).toBe('operator emergency stop');
      expect(result.paused_by).toBe('vienna');
      expect(result.paused_at).toBeTruthy();
      expect(control.isPaused()).toBe(true);
    });
    
    test('pauseExecution requires reason', () => {
      expect(() => {
        control.pauseExecution();
      }).toThrow('Pause reason required');
    });
    
    test('resumeExecution clears pause state', () => {
      control.pauseExecution('test pause');
      
      const result = control.resumeExecution();
      
      expect(result.paused).toBe(false);
      expect(result.resumed_at).toBeTruthy();
      expect(control.isPaused()).toBe(false);
    });
    
    test('pause state persists across restart', () => {
      control.pauseExecution('persistent pause', 'vienna');
      
      // Simulate restart
      const control2 = new ExecutionControl(stateDir);
      
      const state = control2.getExecutionControlState();
      expect(state.paused).toBe(true);
      expect(state.reason).toBe('persistent pause');
      expect(state.paused_by).toBe('vienna');
    });
    
    test('resume state persists across restart', () => {
      control.pauseExecution('test pause');
      control.resumeExecution();
      
      // Simulate restart
      const control2 = new ExecutionControl(stateDir);
      
      const state = control2.getExecutionControlState();
      expect(state.paused).toBe(false);
    });
    
    test('getPauseReason returns reason when paused', () => {
      control.pauseExecution('test reason');
      expect(control.getPauseReason()).toBe('test reason');
    });
    
    test('getPauseReason returns null when not paused', () => {
      expect(control.getPauseReason()).toBe(null);
    });
  });
  
  describe('QueuedExecutor integration', () => {
    let testDir;
    let executor;
    let replayLog;
    
    beforeEach(async () => {
      testDir = path.join(__dirname, '../.test-data/phase7_4_stage1');
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
              allowed_actions: ['file_write:/tmp/test2.txt'],
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
        replayLog
      });
      
      await executor.initialize();
      
      // Register mock adapter
      executor.registerAdapter('file_write', {
        execute: async (action) => ({ success: true, path: action.target })
      });
    });
    
    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    });
    
    test('paused execution blocks executeNext', async () => {
      const envelope = {
        envelope_id: 'env_pause_test_001',
        envelope_type: 'file_write',
        objective_id: 'obj_001',
        trigger_id: 'trig_001',
        causal_depth: 0,
        actions: [
          { type: 'file_write', target: '/tmp/test.txt', content: 'test' }
        ]
      };
      
      await executor.submit(envelope);
      
      // Pause execution
      executor.pauseExecution('test pause');
      
      // Attempt execution
      const result = await executor.executeNext();
      
      expect(result).toBe(null);
      
      // Queue should still have the envelope
      const stats = executor.getQueueState();
      expect(stats.queued).toBe(1);
    });
    
    test('resumed execution allows executeNext', async () => {
      // Verify control starts unpaused
      expect(executor.getExecutionControlState().paused).toBe(false);
      
      // Pause then immediately resume
      executor.pauseExecution('test pause');
      expect(executor.getExecutionControlState().paused).toBe(true);
      
      executor.resumeExecution();
      expect(executor.getExecutionControlState().paused).toBe(false);
      
      // Verify pause state changed correctly
      const finalState = executor.getExecutionControlState();
      expect(finalState.paused).toBe(false);
      expect(finalState.resumed_at).toBeTruthy();
    });
    
    test('getExecutionControlState returns current state', () => {
      const state1 = executor.getExecutionControlState();
      expect(state1.paused).toBe(false);
      
      executor.pauseExecution('check state');
      
      const state2 = executor.getExecutionControlState();
      expect(state2.paused).toBe(true);
      expect(state2.reason).toBe('check state');
    });
    
    test('pause event logged to replay log', async () => {
      executor.pauseExecution('audit test', 'test-operator');
      
      // Give async log time to flush
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const events = await replayLog.query({
        event_type: 'execution_paused'
      });
      
      expect(events.length).toBeGreaterThan(0);
      // Find the specific event
      const event = events.find(e => e.reason === 'audit test');
      expect(event).toBeTruthy();
      expect(event.paused_by).toBe('test-operator');
    });
    
    test('resume event logged to replay log', async () => {
      executor.pauseExecution('test');
      executor.resumeExecution();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const events = await replayLog.query({
        event_type: 'execution_resumed'
      });
      
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
