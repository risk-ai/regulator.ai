/**
 * Phase 10.1a Tests: Reconciliation State Machine Schema
 * 
 * Validates:
 * - Reconciliation fields added to managed_objectives
 * - Safe defaults applied to existing objectives
 * - Migration is idempotent
 * - Indexes created correctly
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

// Test database path
const TEST_DB = path.join(__dirname, '../../.test-data/test-phase-10.1a.db');

async function setup() {
  // Clean test database
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  
  // Ensure directory exists
  const dir = path.dirname(TEST_DB);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function teardown() {
  // Clean up test database
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
}

async function runTests() {
  console.log('\n=== Phase 10.1a Schema Tests ===\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Fresh database has reconciliation fields
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    // Create a test objective
    const objectiveId = 'test_obj_' + Date.now();
    const now = new Date().toISOString();
    sg.createObjective({
      objective_id: objectiveId,
      objective_type: 'maintain_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running' },
      remediation_plan: 'test_plan',
      evaluation_interval: "30s",
      verification_strength: 'service_health',
      status: 'declared',
      created_at: now,
      updated_at: now
    });
    
    // Retrieve and verify reconciliation fields
    const obj = sg.getObjective(objectiveId);
    
    if (obj.reconciliation_status !== 'idle') {
      throw new Error(`Expected reconciliation_status='idle', got '${obj.reconciliation_status}'`);
    }
    if (obj.reconciliation_attempt_count !== 0) {
      throw new Error(`Expected reconciliation_attempt_count=0, got ${obj.reconciliation_attempt_count}`);
    }
    if (obj.reconciliation_generation !== 0) {
      throw new Error(`Expected reconciliation_generation=0, got ${obj.reconciliation_generation}`);
    }
    if (obj.manual_hold !== false) {
      throw new Error(`Expected manual_hold=false, got ${obj.manual_hold}`);
    }
    if (obj.reconciliation_started_at !== null) {
      throw new Error(`Expected reconciliation_started_at=null, got ${obj.reconciliation_started_at}`);
    }
    if (obj.reconciliation_cooldown_until !== null) {
      throw new Error(`Expected reconciliation_cooldown_until=null, got ${obj.reconciliation_cooldown_until}`);
    }
    
    sg.close();
    console.log('✓ Test 1: Fresh database has reconciliation fields with correct defaults');
    passed++;
  } catch (err) {
    console.error('✗ Test 1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test 2: Reconciliation status enum validation
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const objectiveId = 'test_obj_' + Date.now();
    const now = new Date().toISOString();
    sg.createObjective({
      objective_id: objectiveId,
      objective_type: 'maintain_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running' },
      remediation_plan: 'test_plan',
      evaluation_interval: "30s",
      verification_strength: 'service_health',
      status: 'declared',
      created_at: now,
      updated_at: now
    });
    
    // Test valid reconciliation statuses
    const validStatuses = ['idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode'];
    for (const status of validStatuses) {
      sg.db.prepare(`
        UPDATE managed_objectives 
        SET reconciliation_status = ?
        WHERE objective_id = ?
      `).run(status, objectiveId);
      const obj = sg.getObjective(objectiveId);
      if (obj.reconciliation_status !== status) {
        throw new Error(`Failed to set reconciliation_status to '${status}'`);
      }
    }
    
    // Test invalid status (should fail)
    let invalidFailed = false;
    try {
      sg.db.prepare(`
        UPDATE managed_objectives 
        SET reconciliation_status = 'invalid_status'
        WHERE objective_id = ?
      `).run(objectiveId);
    } catch (err) {
      invalidFailed = true;
    }
    
    if (!invalidFailed) {
      throw new Error('Invalid reconciliation_status should have been rejected');
    }
    
    sg.close();
    console.log('✓ Test 2: Reconciliation status enum validation works');
    passed++;
  } catch (err) {
    console.error('✗ Test 2 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test 3: manual_hold boolean constraint
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const objectiveId = 'test_obj_' + Date.now();
    const now = new Date().toISOString();
    sg.createObjective({
      objective_id: objectiveId,
      objective_type: 'maintain_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running' },
      remediation_plan: 'test_plan',
      evaluation_interval: "30s",
      verification_strength: 'service_health',
      status: 'declared',
      created_at: now,
      updated_at: now
    });
    
    // Test valid values (0, 1) parsed to boolean (false, true)
    sg.db.prepare(`UPDATE managed_objectives SET manual_hold = 1 WHERE objective_id = ?`).run(objectiveId);
    let obj = sg.getObjective(objectiveId);
    if (obj.manual_hold !== true) {
      throw new Error('Failed to set manual_hold to true');
    }
    
    sg.db.prepare(`UPDATE managed_objectives SET manual_hold = 0 WHERE objective_id = ?`).run(objectiveId);
    obj = sg.getObjective(objectiveId);
    if (obj.manual_hold !== false) {
      throw new Error('Failed to set manual_hold to false');
    }
    
    // Test invalid value (should fail)
    let invalidFailed = false;
    try {
      sg.db.prepare(`UPDATE managed_objectives SET manual_hold = 2 WHERE objective_id = ?`).run(objectiveId);
    } catch (err) {
      invalidFailed = true;
    }
    
    if (!invalidFailed) {
      throw new Error('Invalid manual_hold value should have been rejected');
    }
    
    sg.close();
    console.log('✓ Test 3: manual_hold boolean constraint works');
    passed++;
  } catch (err) {
    console.error('✗ Test 3 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test 4: Reconciliation index exists
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const indexes = sg.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='managed_objectives' AND name LIKE '%reconciliation%'
    `).all();
    
    const indexNames = indexes.map(idx => idx.name);
    if (!indexNames.includes('idx_managed_objectives_reconciliation_status')) {
      throw new Error('reconciliation_status index not found');
    }
    
    sg.close();
    console.log('✓ Test 4: Reconciliation index created');
    passed++;
  } catch (err) {
    console.error('✗ Test 4 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test 5: Migration is idempotent
  try {
    await setup();
    
    // Initialize twice
    const sg1 = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg1.initialize();
    
    // Create objective
    const objectiveId = 'test_obj_' + Date.now();
    const now = new Date().toISOString();
    sg1.createObjective({
      objective_id: objectiveId,
      objective_type: 'maintain_health',
      target_type: 'service',
      target_id: 'test-service',
      desired_state: { status: 'running' },
      remediation_plan: 'test_plan',
      evaluation_interval: "30s",
      verification_strength: 'service_health',
      status: 'declared',
      created_at: now,
      updated_at: now
    });
    
    sg1.close();
    
    // Re-initialize (should not fail or duplicate columns)
    const sg2 = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg2.initialize();
    
    const obj = sg2.getObjective(objectiveId);
    if (!obj) {
      throw new Error('Objective not found after re-initialization');
    }
    if (obj.reconciliation_status !== 'idle') {
      throw new Error('Objective lost reconciliation_status after re-initialization');
    }
    
    sg2.close();
    console.log('✓ Test 5: Migration is idempotent');
    passed++;
  } catch (err) {
    console.error('✗ Test 5 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
