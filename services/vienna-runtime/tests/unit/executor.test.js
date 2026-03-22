/**
 * Unit tests for Executor
 */

const { Executor, ExecutionError } = require('../../lib/execution/executor');
const { FileAdapter } = require('../../lib/execution/adapters');

// Mock ViennaCore
class MockViennaCore {
  constructor() {
    this.warrant = {
      verify: async (warrantId) => ({
        valid: true,
        warrant: {
          warrant_id: warrantId,
          allowed_actions: ['write_file:/tmp/test.txt', 'read_file:/tmp/test.txt'],
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      })
    };
    
    this.tradingGuard = {
      check: async (actions) => ({ safe: true })
    };
    
    this.audit = {
      emit: async (event) => {
        this.lastAuditEvent = event;
      }
    };
    
    this.lastAuditEvent = null;
  }
}

describe('Executor', () => {
  let executor;
  let mockCore;
  
  beforeEach(() => {
    mockCore = new MockViennaCore();
    executor = new Executor(mockCore);
    executor.registerAdapter('write_file', new FileAdapter());
    executor.registerAdapter('read_file', new FileAdapter());
  });
  
  describe('_validateEnvelope()', () => {
    test('rejects envelope missing required fields', () => {
      const invalidEnvelope = {
        envelope_id: 'env_001'
        // Missing warrant_id and actions
      };
      
      expect(() => executor._validateEnvelope(invalidEnvelope))
        .toThrow('Missing required fields');
    });
    
    test('rejects envelope with empty actions array', () => {
      const invalidEnvelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: []
      };
      
      expect(() => executor._validateEnvelope(invalidEnvelope))
        .toThrow('at least one action');
    });
    
    test('rejects action missing type or target', () => {
      const invalidEnvelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: [
          { type: 'write_file' } // Missing target
        ]
      };
      
      expect(() => executor._validateEnvelope(invalidEnvelope))
        .toThrow('type and target');
    });
    
    test('accepts valid envelope', () => {
      const validEnvelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: [
          { type: 'write_file', target: '/tmp/test.txt', content: 'test' }
        ]
      };
      
      expect(() => executor._validateEnvelope(validEnvelope))
        .not.toThrow();
    });
  });
  
  describe('_verifyWarrant()', () => {
    test('throws if warrant invalid', async () => {
      mockCore.warrant.verify = async () => ({
        valid: false,
        reason: 'WARRANT_EXPIRED'
      });
      
      await expect(executor._verifyWarrant('wrt_expired'))
        .rejects.toThrow('Warrant verification failed');
    });
    
    test('returns warrant if valid', async () => {
      const warrant = await executor._verifyWarrant('wrt_valid');
      
      expect(warrant.warrant_id).toBe('wrt_valid');
    });
  });
  
  describe('_runPreflightChecks()', () => {
    test('throws if action not in warrant scope', async () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: [
          { type: 'delete_file', target: '/tmp/other.txt' }
        ]
      };
      
      const warrant = {
        allowed_actions: ['write_file:/tmp/test.txt'],
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
      
      await expect(executor._runPreflightChecks(envelope, warrant))
        .rejects.toThrow('not allowed by warrant');
    });
    
    test('throws if trading guard blocks', async () => {
      mockCore.tradingGuard.check = async () => ({
        safe: false,
        reason: 'AUTONOMOUS_WINDOW_ACTIVE'
      });
      
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: [
          { type: 'restart_service', target: 'kalshi-cron' }
        ]
      };
      
      const warrant = {
        allowed_actions: ['restart_service:kalshi-cron'],
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
      
      await expect(executor._runPreflightChecks(envelope, warrant))
        .rejects.toThrow('AUTONOMOUS_WINDOW_ACTIVE');
    });
    
    test('passes if all checks pass', async () => {
      const envelope = {
        envelope_id: 'env_001',
        warrant_id: 'wrt_001',
        actions: [
          { type: 'write_file', target: '/tmp/test.txt' }
        ]
      };
      
      const warrant = {
        allowed_actions: ['write_file:/tmp/test.txt'],
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
      
      await expect(executor._runPreflightChecks(envelope, warrant))
        .resolves.toBeUndefined();
    });
  });
  
  describe('_isTradingCritical()', () => {
    test('detects trading-critical actions', () => {
      const action = {
        type: 'restart_service',
        target: 'kalshi-cron'
      };
      
      expect(executor._isTradingCritical(action)).toBe(true);
    });
    
    test('detects non-trading actions', () => {
      const action = {
        type: 'write_file',
        target: '/tmp/test.txt'
      };
      
      expect(executor._isTradingCritical(action)).toBe(false);
    });
  });
  
  describe('execute()', () => {
    test('emits audit event on success', async () => {
      // Override mock to allow this specific action
      mockCore.warrant.verify = async (warrantId) => ({
        valid: true,
        warrant: {
          warrant_id: warrantId,
          allowed_actions: ['write_file:/tmp/executor-test.txt'],
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      });
      
      const envelope = {
        envelope_id: 'env_test',
        warrant_id: 'wrt_test',
        actions: [
          { type: 'write_file', target: '/tmp/executor-test.txt', content: 'test' }
        ]
      };
      
      await executor.execute(envelope);
      
      expect(mockCore.lastAuditEvent).toBeDefined();
      expect(mockCore.lastAuditEvent.event_type).toBe('execution_success');
      expect(mockCore.lastAuditEvent.envelope_id).toBe('env_test');
    });
    
    test('emits audit event on failure', async () => {
      // Unregister adapter to force failure
      executor.adapters.delete('write_file');
      
      const envelope = {
        envelope_id: 'env_fail',
        warrant_id: 'wrt_test',
        actions: [
          { type: 'write_file', target: '/tmp/test.txt', content: 'test' }
        ]
      };
      
      await expect(executor.execute(envelope)).rejects.toThrow();
      
      expect(mockCore.lastAuditEvent).toBeDefined();
      expect(mockCore.lastAuditEvent.event_type).toBe('execution_error');
    });
  });
});
