/**
 * Dual-Path Comparison Test
 * 
 * Runs same inputs through legacy + Core, compares outputs.
 * Detects structural mismatches, timing variances, audit gaps.
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ViennaCore = require('../../index');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');
const LEGACY_SCRIPT = path.join(WORKSPACE, 'scripts', 'issue-warrant.js');
const CORE_SCRIPT = path.join(WORKSPACE, 'scripts', 'issue-warrant-core.js');

describe('Dual-Path Comparison', () => {
  let testTruthId;
  
  beforeAll(async () => {
    // Create test truth snapshot
    testTruthId = `hb_dual_test_${Date.now()}`;
    const truthDir = path.join(WORKSPACE, 'truth_snapshots');
    await fs.mkdir(truthDir, { recursive: true });
    
    const truthSnapshot = {
      truth_snapshot_id: testTruthId,
      last_verified_at: new Date().toISOString(),
      truth_snapshot_hash: 'sha256:dual_test',
      sources: ['dual-path-comparison.test.js']
    };
    
    await fs.writeFile(
      path.join(truthDir, `${testTruthId}.json`),
      JSON.stringify(truthSnapshot, null, 2)
    );
    
    // Initialize Vienna Core
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
  });
  
  test('legacy and core produce compatible warrant structure', async () => {
    const testPlan = `dual_test_${Date.now()}`;
    const testObjective = 'Dual-path comparison test';
    const allowedAction = 'write_file:/tmp/dual_test.txt';
    
    // Run legacy (note: legacy requires approvalId even for T1, Core doesn't)
    const legacyCmd = `node ${LEGACY_SCRIPT} --truth ${testTruthId} --plan ${testPlan} --approval met_test --objective "${testObjective}" --tier T1 --allow "${allowedAction}"`;
    const legacyOutput = execSync(legacyCmd, { encoding: 'utf8' });
    const legacyResult = JSON.parse(legacyOutput);
    
    // Run core (approvalId optional for T1)
    const coreCmd = `node ${CORE_SCRIPT} --truth ${testTruthId} --plan ${testPlan} --objective "${testObjective}" --tier T1 --allow "${allowedAction}"`;
    const coreOutput = execSync(coreCmd, { encoding: 'utf8' });
    const coreResult = JSON.parse(coreOutput);
    
    // Compare structure
    expect(legacyResult.status).toBe('success');
    expect(coreResult.status).toBe('success');
    
    expect(legacyResult.warrant_id).toMatch(/^wrt_/);
    expect(coreResult.warrant_id).toMatch(/^wrt_/);
    
    expect(legacyResult.change_id).toMatch(/^chg_/);
    expect(coreResult.change_id).toMatch(/^chg_/);
    
    // Load actual warrant files
    const legacyWarrant = JSON.parse(
      await fs.readFile(legacyResult.warrant_path, 'utf8')
    );
    
    const coreWarrant = JSON.parse(
      await fs.readFile(coreResult.warrant_path, 'utf8')
    );
    
    // Compare critical fields
    expect(legacyWarrant.risk_tier).toBe(coreWarrant.risk_tier);
    expect(legacyWarrant.objective).toBe(coreWarrant.objective);
    expect(legacyWarrant.allowed_actions).toEqual(coreWarrant.allowed_actions);
    expect(legacyWarrant.truth_snapshot_id).toBe(coreWarrant.truth_snapshot_id);
    expect(legacyWarrant.plan_id).toBe(coreWarrant.plan_id);
    
    // Check trading safety assessment
    expect(legacyWarrant.trading_safety_assertion).toBeDefined();
    expect(coreWarrant.trading_safety).toBeDefined();
    
    // Both should detect no trading scope
    expect(legacyWarrant.trading_safety_assertion.trading_in_scope).toBe(false);
    expect(coreWarrant.trading_safety.trading_in_scope).toBe(false);
  });
  
  test('both paths emit audit events', async () => {
    const auditDir = path.join(WORKSPACE, 'warrants', 'audit');
    const auditsBefore = await fs.readdir(auditDir);
    
    const testPlan = `dual_audit_${Date.now()}`;
    
    // Run legacy (requires approvalId)
    execSync(`node ${LEGACY_SCRIPT} --truth ${testTruthId} --plan ${testPlan} --approval met_test --objective "Audit test legacy" --tier T1 --allow "write_file:/tmp/test.txt"`, { encoding: 'utf8' });
    
    // Run core (approvalId optional for T1)
    execSync(`node ${CORE_SCRIPT} --truth ${testTruthId} --plan ${testPlan}_core --objective "Audit test core" --tier T1 --allow "write_file:/tmp/test.txt"`, { encoding: 'utf8' });
    
    const auditsAfter = await fs.readdir(auditDir);
    
    // At least 2 new audit files (one from each path)
    expect(auditsAfter.length).toBeGreaterThanOrEqual(auditsBefore.length + 2);
    
    // Find audit events
    const newAudits = auditsAfter.filter(f => !auditsBefore.includes(f));
    const auditContents = await Promise.all(
      newAudits.map(f => fs.readFile(path.join(auditDir, f), 'utf8').then(JSON.parse))
    );
    
    // Both should have warrant_issued events
    const legacyAudit = auditContents.find(a => !a.adapter);
    const coreAudit = auditContents.find(a => a.adapter === 'openclaw');
    
    // Legacy might not have adapter field, but should have event_type
    expect(auditContents.some(a => a.event_type === 'warrant_issued')).toBe(true);
    
    // Core should have adapter field
    expect(coreAudit).toBeDefined();
    expect(coreAudit.event_type).toBe('warrant_issued');
    expect(coreAudit.adapter).toBe('openclaw');
  });
  
  test('timing variance within acceptable range', async () => {
    const iterations = 5;
    const legacyTimes = [];
    const coreTimes = [];
    
    for (let i = 0; i < iterations; i++) {
      const testPlan = `timing_${Date.now()}_${i}`;
      
      // Time legacy (requires approvalId)
      const legacyStart = Date.now();
      execSync(`node ${LEGACY_SCRIPT} --truth ${testTruthId} --plan ${testPlan} --approval met_test --objective "Timing test" --tier T1 --allow "write_file:/tmp/test.txt"`, { encoding: 'utf8' });
      const legacyTime = Date.now() - legacyStart;
      legacyTimes.push(legacyTime);
      
      // Time core (approvalId optional for T1)
      const coreStart = Date.now();
      execSync(`node ${CORE_SCRIPT} --truth ${testTruthId} --plan ${testPlan}_core --objective "Timing test" --tier T1 --allow "write_file:/tmp/test.txt"`, { encoding: 'utf8' });
      const coreTime = Date.now() - coreStart;
      coreTimes.push(coreTime);
    }
    
    const avgLegacy = legacyTimes.reduce((a, b) => a + b) / iterations;
    const avgCore = coreTimes.reduce((a, b) => a + b) / iterations;
    
    const variance = Math.abs(avgCore - avgLegacy) / avgLegacy;
    
    console.log(`Timing: Legacy avg ${avgLegacy}ms, Core avg ${avgCore}ms, Variance ${(variance * 100).toFixed(1)}%`);
    
    // Acceptable: <50% timing variance
    expect(variance).toBeLessThan(0.5);
  });
  
  test('both paths enforce trading guard', async () => {
    const testPlan = `trading_guard_${Date.now()}`;
    
    // Both should detect trading scope
    const tradingAction = 'restart_service:kalshi-cron';
    
    // Legacy should detect (via trading_safety_assertion)
    const legacyOutput = execSync(`node ${LEGACY_SCRIPT} --truth ${testTruthId} --plan ${testPlan} --approval met_test --objective "Trading test" --tier T1 --allow "${tradingAction}"`, { encoding: 'utf8' });
    const legacyResult = JSON.parse(legacyOutput);
    
    const legacyWarrant = JSON.parse(
      await fs.readFile(legacyResult.warrant_path, 'utf8')
    );
    
    expect(legacyWarrant.trading_safety_assertion.trading_in_scope).toBe(true);
    expect(legacyWarrant.trading_safety_assertion.trading_interruption_risk).toBe('high');
    
    // Core should detect (via trading_safety)
    const coreOutput = execSync(`node ${CORE_SCRIPT} --truth ${testTruthId} --plan ${testPlan}_core --objective "Trading test" --tier T1 --allow "${tradingAction}"`, { encoding: 'utf8' });
    const coreResult = JSON.parse(coreOutput);
    
    const coreWarrant = JSON.parse(
      await fs.readFile(coreResult.warrant_path, 'utf8')
    );
    
    expect(coreWarrant.trading_safety.trading_in_scope).toBe(true);
    expect(coreWarrant.trading_safety.risk).toBe('high');
    
    // Both detected trading scope correctly
  });
});
