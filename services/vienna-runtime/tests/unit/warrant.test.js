/**
 * Unit tests for Warrant module
 */

const Warrant = require('../../lib/governance/warrant');
const fs = require('fs').promises;
const path = require('path');

// Mock adapter
class MockAdapter {
  constructor() {
    this.warrants = new Map();
    this.auditEvents = [];
  }
  
  async saveWarrant(warrant) {
    this.warrants.set(warrant.warrant_id, warrant);
  }
  
  async loadWarrant(warrantId) {
    return this.warrants.get(warrantId) || null;
  }
  
  async listWarrants() {
    return Array.from(this.warrants.values());
  }
  
  async loadTruthSnapshot(truthId) {
    return {
      truth_snapshot_id: truthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:mock'
    };
  }
  
  async emitAudit(event) {
    this.auditEvents.push(event);
  }
}

describe('Warrant', () => {
  let warrant;
  let adapter;
  
  beforeEach(() => {
    adapter = new MockAdapter();
    warrant = new Warrant(adapter);
  });
  
  describe('issue()', () => {
    test('issues valid T1 warrant', async () => {
      const result = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test warrant',
        riskTier: 'T1',
        allowedActions: ['write_file:/test.txt']
      });
      
      expect(result.warrant_id).toMatch(/^wrt_/);
      expect(result.change_id).toMatch(/^chg_/);
      expect(result.risk_tier).toBe('T1');
      expect(result.status).toBe('issued');
      expect(adapter.auditEvents).toHaveLength(1);
    });
    
    test('requires approval for T2 warrant', async () => {
      await expect(
        warrant.issue({
          truthSnapshotId: 'hb_447',
          planId: 'tal_212',
          objective: 'Test warrant',
          riskTier: 'T2',
          allowedActions: ['restart_service:kalshi-cron']
        })
      ).rejects.toThrow('T2 warrants require approvalId');
    });
    
    test('assesses trading safety correctly', async () => {
      const result = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Update trading config',
        riskTier: 'T1',
        allowedActions: ['write_file:kalshi_mm_bot/config.json']
      });
      
      expect(result.trading_safety.trading_in_scope).toBe(true);
      expect(result.trading_safety.risk).toBe('medium');
    });
  });
  
  describe('verify()', () => {
    test('validates active warrant', async () => {
      const issued = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test warrant',
        riskTier: 'T1',
        allowedActions: ['write_file:/test.txt']
      });
      
      const result = await warrant.verify(issued.warrant_id);
      
      expect(result.valid).toBe(true);
      expect(result.warrant).toBeDefined();
    });
    
    test('detects expired warrant', async () => {
      const issued = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test warrant',
        riskTier: 'T1',
        allowedActions: ['write_file:/test.txt'],
        expiresInMinutes: -1 // Already expired
      });
      
      const result = await warrant.verify(issued.warrant_id);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WARRANT_EXPIRED');
    });
    
    test('detects invalidated warrant', async () => {
      const issued = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test warrant',
        riskTier: 'T1',
        allowedActions: ['write_file:/test.txt']
      });
      
      await warrant.invalidate(issued.warrant_id, 'Test invalidation');
      
      const result = await warrant.verify(issued.warrant_id);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('WARRANT_INVALIDATED');
    });
  });
  
  describe('invalidate()', () => {
    test('invalidates active warrant', async () => {
      const issued = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test warrant',
        riskTier: 'T1',
        allowedActions: ['write_file:/test.txt']
      });
      
      await warrant.invalidate(issued.warrant_id, 'Manual invalidation');
      
      const loaded = await adapter.loadWarrant(issued.warrant_id);
      expect(loaded.status).toBe('invalidated');
      expect(loaded.invalidation_reason).toBe('Manual invalidation');
    });
  });
  
  describe('listActive()', () => {
    test('returns only active warrants', async () => {
      const w1 = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_212',
        objective: 'Test 1',
        riskTier: 'T1',
        allowedActions: ['write_file:/test1.txt']
      });
      
      const w2 = await warrant.issue({
        truthSnapshotId: 'hb_447',
        planId: 'tal_213',
        objective: 'Test 2',
        riskTier: 'T1',
        allowedActions: ['write_file:/test2.txt'],
        expiresInMinutes: -1 // Expired
      });
      
      const active = await warrant.listActive();
      
      expect(active).toHaveLength(1);
      expect(active[0].warrant_id).toBe(w1.warrant_id);
    });
  });
});
