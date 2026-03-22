/**
 * Phase 6 Full Test Suite
 * 
 * Comprehensive governance regression validation.
 * Target: ≥85% pass rate
 */

const ViennaCore = require('../../index');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

// Include all 12 minimal tests + additional edge cases

describe('Phase 6 Full Suite (Comprehensive)', () => {
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  // ===== Core Governance Tests (Minimal Suite) =====
  
  describe('Core Governance (Minimal Suite)', () => {
    // A-series: Authorization Chain
    test('A1: T1 warrant requires valid truth snapshot', async () => {
      const truthId = `hb_a1_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      await fs.mkdir(truthDir, { recursive: true });
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_a1_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_a1_full',
        objective: 'Test A1 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/a1_full.txt']
      });
      
      expect(warrant.truth_snapshot_id).toBe(truthId);
    });
    
    test('A2: T2 warrant requires approval ID', async () => {
      const truthId = `hb_a2_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_a2_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      await expect(
        ViennaCore.warrant.issue({
          truthSnapshotId: truthId,
          planId: 'tal_a2_full',
          objective: 'Test A2 full',
          riskTier: 'T2',
          allowedActions: ['restart_service:test']
        })
      ).rejects.toThrow(/T2 warrants require approvalId/);
    });
    
    test('A3: Warrant issuance generates unique ID', async () => {
      const truthId = `hb_a3_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_a3_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_a3_full',
        objective: 'Test A3 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/a3_full.txt']
      });
      
      expect(warrant.warrant_id).toMatch(/^wrt_/);
      expect(warrant.change_id).toMatch(/^chg_/);
    });
    
    test('A4: Warrant issuance emits audit event', async () => {
      const truthId = `hb_a4_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_a4_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const auditDir = path.join(WORKSPACE, 'warrants', 'audit');
      const auditsBefore = await fs.readdir(auditDir);
      
      await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_a4_full',
        objective: 'Test A4 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/a4_full.txt']
      });
      
      const auditsAfter = await fs.readdir(auditDir);
      
      expect(auditsAfter.length).toBeGreaterThan(auditsBefore.length);
    });
    
    // H-series: Trading Safety
    test('H1: Trading guard blocks service restart', async () => {
      const result = await ViennaCore.tradingGuard.check([
        { type: 'restart_service', target: 'kalshi-cron' }
      ]);
      
      expect(result.safe).toBe(false);
      expect(result.reason).toBe('AUTONOMOUS_WINDOW_ACTIVE');
    });
    
    test('H2: Trading guard allows non-trading actions', async () => {
      const result = await ViennaCore.tradingGuard.check([
        { type: 'write_file', target: '/tmp/test.txt' }
      ]);
      
      expect(result.safe).toBe(true);
    });
    
    test('H3: T2 warrant rejects stale truth', async () => {
      const truthId = `hb_h3_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const staleTruth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        truth_snapshot_hash: 'sha256:stale_h3_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(staleTruth, null, 2)
      );
      
      await expect(
        ViennaCore.warrant.issue({
          truthSnapshotId: truthId,
          planId: 'tal_h3_full',
          approvalId: 'met_h3_full',
          objective: 'Test H3 full',
          riskTier: 'T2',
          allowedActions: ['write_file:/tmp/h3_full.txt']
        })
      ).rejects.toThrow(/Truth snapshot too old/);
    });
    
    test('H4: T1 warrant rejects stale truth', async () => {
      const truthId = `hb_h4_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const staleTruth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        truth_snapshot_hash: 'sha256:stale_h4_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(staleTruth, null, 2)
      );
      
      await expect(
        ViennaCore.warrant.issue({
          truthSnapshotId: truthId,
          planId: 'tal_h4_full',
          objective: 'Test H4 full',
          riskTier: 'T1',
          allowedActions: ['write_file:/tmp/h4_full.txt']
        })
      ).rejects.toThrow(/Truth snapshot too old/);
    });
    
    // D-series: Verification & Lifecycle
    test('D1: Warrant verification detects valid warrant', async () => {
      const truthId = `hb_d1_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_d1_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_d1_full',
        objective: 'Test D1 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/d1_full.txt']
      });
      
      const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
      
      expect(verification.valid).toBe(true);
    });
    
    test('D2: Warrant verification detects expired warrant', async () => {
      const truthId = `hb_d2_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_d2_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_d2_full',
        objective: 'Test D2 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/d2_full.txt'],
        expiresInMinutes: -1
      });
      
      const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
      
      expect(verification.valid).toBe(false);
      expect(verification.reason).toBe('WARRANT_EXPIRED');
    });
    
    test('D3: Warrant invalidation prevents further use', async () => {
      const truthId = `hb_d3_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_d3_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_d3_full',
        objective: 'Test D3 full',
        riskTier: 'T1',
        allowedActions: ['write_file:/tmp/d3_full.txt']
      });
      
      await ViennaCore.warrant.invalidate(warrant.warrant_id, 'Test invalidation');
      
      const verification = await ViennaCore.warrant.verify(warrant.warrant_id);
      
      expect(verification.valid).toBe(false);
      expect(verification.reason).toBe('WARRANT_INVALIDATED');
    });
    
    // C-series: Concurrent Operations
    test('C1: Concurrent warrant issuance produces unique IDs', async () => {
      const truthId = `hb_c1_full_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_c1_full'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrants = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          ViennaCore.warrant.issue({
            truthSnapshotId: truthId,
            planId: `tal_c1_full_${i}`,
            objective: `Test C1 full ${i}`,
            riskTier: 'T1',
            allowedActions: [`write_file:/tmp/c1_full_${i}.txt`]
          })
        )
      );
      
      const ids = warrants.map(w => w.warrant_id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(10);
    });
  });
  
  // ===== Extended Tests (Edge Cases) =====
  
  describe('Extended Edge Cases', () => {
    test('E1: Missing truth snapshot rejects warrant', async () => {
      const nonexistentId = `hb_missing_${Date.now()}`;
      
      await expect(
        ViennaCore.warrant.issue({
          truthSnapshotId: nonexistentId,
          planId: 'tal_e1',
          objective: 'Test E1',
          riskTier: 'T1',
          allowedActions: ['write_file:/tmp/e1.txt']
        })
      ).rejects.toThrow(/Truth snapshot not found/);
    });
    
    test('E2: Empty allowed actions rejects warrant', async () => {
      const truthId = `hb_e2_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_e2'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      await expect(
        ViennaCore.warrant.issue({
          truthSnapshotId: truthId,
          planId: 'tal_e2',
          objective: 'Test E2',
          riskTier: 'T1',
          allowedActions: [] // Empty
        })
      ).rejects.toThrow();
    });
    
    test('E3: listActive returns only non-expired warrants', async () => {
      const active = await ViennaCore.warrant.listActive();
      
      // All returned warrants should be valid
      const verifications = await Promise.all(
        active.map(w => ViennaCore.warrant.verify(w.warrant_id))
      );
      
      expect(verifications.every(v => v.valid)).toBe(true);
    });
    
    test('E4: T0 warrants do not require approval', async () => {
      const truthId = `hb_e4_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_e4'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_e4',
        objective: 'Test E4',
        riskTier: 'T0',
        allowedActions: ['read_file:/tmp/e4.txt']
        // No approvalId
      });
      
      expect(warrant.risk_tier).toBe('T0');
    });
    
    test('E5: Trading safety detects trading scope correctly', async () => {
      const truthId = `hb_e5_${Date.now()}`;
      const truthDir = path.join(WORKSPACE, 'truth_snapshots');
      
      const truth = {
        truth_snapshot_id: truthId,
        last_verified_at: new Date().toISOString(),
        truth_snapshot_hash: 'sha256:test_e5'
      };
      
      await fs.writeFile(
        path.join(truthDir, `${truthId}.json`),
        JSON.stringify(truth, null, 2)
      );
      
      const warrant = await ViennaCore.warrant.issue({
        truthSnapshotId: truthId,
        planId: 'tal_e5',
        objective: 'Test E5',
        riskTier: 'T1',
        allowedActions: ['write_file:kalshi_mm_bot/config.json']
      });
      
      expect(warrant.trading_safety.trading_in_scope).toBe(true);
      expect(warrant.trading_safety.risk).toBe('medium');
    });
  });
});
