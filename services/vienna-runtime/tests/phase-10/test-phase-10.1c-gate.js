/**
 * Phase 10.1c Tests: Reconciliation Gate
 * 
 * Validates admission control, single-flight enforcement, and atomic transitions.
 */

process.env.VIENNA_ENV = 'test';

const { getStateGraph } = require('../../lib/state/state-graph');
const { createReconciliationGate } = require('../../lib/core/reconciliation-gate');
const fs = require('fs');
const path = require('path');

// Test database path
const TEST_DB = path.join(__dirname, '../../.test-data/test-phase-10.1c.db');

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

function createTestObjective(sg, overrides = {}) {
  const objectiveId = 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  
  sg.createObjective({
    objective_id: objectiveId,
    objective_type: 'maintain_health',
    target_type: 'service',
    target_id: 'test-service',
    desired_state: { status: 'running' },
    remediation_plan: 'test_plan',
    evaluation_interval: '30s',
    verification_strength: 'service_health',
    status: 'declared',
    created_at: now,
    updated_at: now,
    ...overrides
  });
  
  return objectiveId;
}

async function runTests() {
  console.log('\n=== Phase 10.1c Reconciliation Gate Tests ===\n');
  
  let passed = 0;
  let failed = 0;

  // Category A: Basic Admission

  // Test A1: Idle objective is admitted
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (!decision.admitted) {
      throw new Error('Idle objective should be admitted');
    }
    if (decision.reason !== 'drift_detected') {
      throw new Error(`Expected reason 'drift_detected', got '${decision.reason}'`);
    }
    if (!decision.generation) {
      throw new Error('Should return new generation');
    }
    if (!decision.updates) {
      throw new Error('Should return updates');
    }
    
    sg.close();
    console.log('✓ Test A1: Idle objective is admitted');
    passed++;
  } catch (err) {
    console.error('✗ Test A1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A2: Reconciling objective is denied
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set to reconciling
    sg.updateObjective(objectiveId, {
      reconciliation_status: 'reconciling',
      reconciliation_started_at: new Date().toISOString()
    });
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Reconciling objective should be denied');
    }
    if (decision.reason !== 'in_flight') {
      throw new Error(`Expected reason 'in_flight', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A2: Reconciling objective is denied (in_flight)');
    passed++;
  } catch (err) {
    console.error('✗ Test A2 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A3: Active cooldown is denied
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set to cooldown (future expiry)
    const futureTime = new Date(Date.now() + 60000).toISOString();
    sg.updateObjective(objectiveId, {
      reconciliation_status: 'cooldown',
      reconciliation_cooldown_until: futureTime
    });
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Active cooldown should be denied');
    }
    if (decision.reason !== 'cooldown_active') {
      throw new Error(`Expected reason 'cooldown_active', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A3: Active cooldown is denied');
    passed++;
  } catch (err) {
    console.error('✗ Test A3 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A4: Expired cooldown is admitted
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set to cooldown (past expiry)
    const pastTime = new Date(Date.now() - 60000).toISOString();
    sg.updateObjective(objectiveId, {
      reconciliation_status: 'cooldown',
      reconciliation_cooldown_until: pastTime
    });
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (!decision.admitted) {
      throw new Error('Expired cooldown should be admitted');
    }
    if (decision.reason !== 'cooldown_expired') {
      throw new Error(`Expected reason 'cooldown_expired', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A4: Expired cooldown is admitted');
    passed++;
  } catch (err) {
    console.error('✗ Test A4 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A5: Degraded is denied
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set to degraded
    sg.updateObjective(objectiveId, {
      reconciliation_status: 'degraded'
    });
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Degraded objective should be denied');
    }
    if (decision.reason !== 'degraded') {
      throw new Error(`Expected reason 'degraded', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A5: Degraded is denied');
    passed++;
  } catch (err) {
    console.error('✗ Test A5 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A6: Manual hold denies admission
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set manual hold
    sg.updateObjective(objectiveId, {
      manual_hold: true
    });
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Manual hold should deny admission');
    }
    if (decision.reason !== 'manual_hold') {
      throw new Error(`Expected reason 'manual_hold', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A6: Manual hold denies admission');
    passed++;
  } catch (err) {
    console.error('✗ Test A6 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test A7: Global safe mode denies admission
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg, { global_safe_mode: true });
    const objectiveId = createTestObjective(sg);
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Global safe mode should deny admission');
    }
    if (decision.reason !== 'global_safe_mode') {
      throw new Error(`Expected reason 'global_safe_mode', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test A7: Global safe mode denies admission');
    passed++;
  } catch (err) {
    console.error('✗ Test A7 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Category B: Atomic Transitions

  // Test B1: admitAndTransition applies state updates
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    const result = gate.admitAndTransition(objectiveId);
    
    if (!result.admitted) {
      throw new Error('Should admit idle objective');
    }
    if (!result.generation) {
      throw new Error('Should return generation');
    }
    
    // Verify state updated in database
    const objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_status !== 'reconciling') {
      throw new Error(`Expected status 'reconciling', got '${objective.reconciliation_status}'`);
    }
    if (objective.reconciliation_attempt_count !== 1) {
      throw new Error(`Expected attempt count 1, got ${objective.reconciliation_attempt_count}`);
    }
    if (objective.reconciliation_generation !== 1) {
      throw new Error(`Expected generation 1, got ${objective.reconciliation_generation}`);
    }
    if (!objective.reconciliation_started_at) {
      throw new Error('Should set reconciliation_started_at');
    }
    
    sg.close();
    console.log('✓ Test B1: admitAndTransition applies state updates');
    passed++;
  } catch (err) {
    console.error('✗ Test B1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test B2: admitAndTransition increments attempt count
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set existing attempt count
    sg.updateObjective(objectiveId, {
      reconciliation_attempt_count: 2
    });
    
    gate.admitAndTransition(objectiveId);
    
    const objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_attempt_count !== 3) {
      throw new Error(`Expected attempt count 3, got ${objective.reconciliation_attempt_count}`);
    }
    
    sg.close();
    console.log('✓ Test B2: admitAndTransition increments attempt count');
    passed++;
  } catch (err) {
    console.error('✗ Test B2 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test B3: admitAndTransition increments generation
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Set existing generation
    sg.updateObjective(objectiveId, {
      reconciliation_generation: 5
    });
    
    const result = gate.admitAndTransition(objectiveId);
    
    if (result.generation !== 6) {
      throw new Error(`Expected generation 6, got ${result.generation}`);
    }
    
    const objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_generation !== 6) {
      throw new Error(`Expected generation 6 in DB, got ${objective.reconciliation_generation}`);
    }
    
    sg.close();
    console.log('✓ Test B3: admitAndTransition increments generation');
    passed++;
  } catch (err) {
    console.error('✗ Test B3 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Category C: Single-Flight Enforcement

  // Test C1: Second admission attempt is denied
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // First admission succeeds
    const result1 = gate.admitAndTransition(objectiveId);
    if (!result1.admitted) {
      throw new Error('First admission should succeed');
    }
    
    // Second admission denied (status now reconciling)
    const result2 = gate.admitAndTransition(objectiveId);
    if (result2.admitted) {
      throw new Error('Second admission should be denied');
    }
    if (result2.reason !== 'in_flight') {
      throw new Error(`Expected reason 'in_flight', got '${result2.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test C1: Second admission attempt is denied (single-flight)');
    passed++;
  } catch (err) {
    console.error('✗ Test C1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test C2: Generation increments on each admission
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Check initial generation
    let objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_generation !== 0) {
      throw new Error('Initial generation should be 0');
    }
    
    // First admission
    gate.admitAndTransition(objectiveId);
    objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_generation !== 1) {
      throw new Error('Generation should be 1 after first admission');
    }
    
    // Complete and reset to idle
    sg.updateObjective(objectiveId, {
      reconciliation_status: 'idle',
      reconciliation_attempt_count: 0
    });
    
    // Second admission
    gate.admitAndTransition(objectiveId);
    objective = sg.getObjective(objectiveId);
    if (objective.reconciliation_generation !== 2) {
      throw new Error('Generation should be 2 after second admission');
    }
    
    sg.close();
    console.log('✓ Test C2: Generation increments on each admission');
    passed++;
  } catch (err) {
    console.error('✗ Test C2 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Category D: Batch Operations

  // Test D1: batchCheckEligibility works
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    
    const obj1 = createTestObjective(sg); // idle
    const obj2 = createTestObjective(sg); // will be reconciling
    const obj3 = createTestObjective(sg); // will be degraded
    
    sg.updateObjective(obj2, { reconciliation_status: 'reconciling' });
    sg.updateObjective(obj3, { reconciliation_status: 'degraded' });
    
    const decisions = gate.batchCheckEligibility([obj1, obj2, obj3]);
    
    if (decisions.length !== 3) {
      throw new Error('Should return 3 decisions');
    }
    
    const d1 = decisions.find(d => d.objective_id === obj1);
    const d2 = decisions.find(d => d.objective_id === obj2);
    const d3 = decisions.find(d => d.objective_id === obj3);
    
    if (!d1.admitted) {
      throw new Error('obj1 (idle) should be admitted');
    }
    if (d2.admitted) {
      throw new Error('obj2 (reconciling) should be denied');
    }
    if (d3.admitted) {
      throw new Error('obj3 (degraded) should be denied');
    }
    
    sg.close();
    console.log('✓ Test D1: batchCheckEligibility works');
    passed++;
  } catch (err) {
    console.error('✗ Test D1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Category E: Gate Control

  // Test E1: enableSafeMode blocks admissions
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg);
    const objectiveId = createTestObjective(sg);
    
    // Enable safe mode
    gate.enableSafeMode();
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (decision.admitted) {
      throw new Error('Safe mode should block admission');
    }
    if (decision.reason !== 'global_safe_mode') {
      throw new Error(`Expected reason 'global_safe_mode', got '${decision.reason}'`);
    }
    
    sg.close();
    console.log('✓ Test E1: enableSafeMode blocks admissions');
    passed++;
  } catch (err) {
    console.error('✗ Test E1 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test E2: disableSafeMode allows admissions
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg, { global_safe_mode: true });
    const objectiveId = createTestObjective(sg);
    
    // Disable safe mode
    gate.disableSafeMode();
    
    const decision = gate.requestAdmission(objectiveId);
    
    if (!decision.admitted) {
      throw new Error('Should allow admission after disabling safe mode');
    }
    
    sg.close();
    console.log('✓ Test E2: disableSafeMode allows admissions');
    passed++;
  } catch (err) {
    console.error('✗ Test E2 failed:', err.message);
    failed++;
  } finally {
    await teardown();
  }

  // Test E3: getStatus returns gate configuration
  try {
    await setup();
    
    const sg = getStateGraph({ environment: 'test', dbPath: TEST_DB });
    await sg.initialize();
    
    const gate = createReconciliationGate(sg, { global_safe_mode: true });
    
    const status = gate.getStatus();
    
    if (!status.global_safe_mode) {
      throw new Error('Should report global_safe_mode=true');
    }
    if (status.active) {
      throw new Error('Should report active=false when in safe mode');
    }
    
    gate.disableSafeMode();
    const status2 = gate.getStatus();
    
    if (status2.global_safe_mode) {
      throw new Error('Should report global_safe_mode=false after disable');
    }
    if (!status2.active) {
      throw new Error('Should report active=true when not in safe mode');
    }
    
    sg.close();
    console.log('✓ Test E3: getStatus returns gate configuration');
    passed++;
  } catch (err) {
    console.error('✗ Test E3 failed:', err.message);
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
