// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Test: Objective Schema — Phase 9.1
 * 
 * Validates canonical Objective object structure, validation, and helpers.
 */

const {
  ObjectiveSchema,
  OBJECTIVE_STATUS,
  VERIFICATION_STRENGTH,
  validateObjective,
  createObjective,
  updateObjectiveStatus,
  parseInterval
} = require('../../lib/core/objective-schema');

/**
 * Test runner
 */
async function runTests() {
  console.log('Testing Objective Schema (Phase 9.1)...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
    }
  }
  
  // ========================================
  // Category A: Schema Definition
  // ========================================
  
  test('A1: OBJECTIVE_STATUS enum contains all expected states', () => {
    const expectedStates = [
      'declared',
      'monitoring',
      'healthy',
      'violation_detected',
      'remediation_triggered',
      'remediation_running',
      'verification',
      'restored',
      'failed',
      'blocked',
      'suspended',
      'archived'
    ];
    
    expectedStates.forEach(state => {
      if (!Object.values(OBJECTIVE_STATUS).includes(state)) {
        throw new Error(`Missing status: ${state}`);
      }
    });
  });
  
  test('A2: VERIFICATION_STRENGTH enum contains all expected levels', () => {
    const expectedLevels = [
      'service_health',
      'http_healthcheck',
      'full_validation',
      'minimal'
    ];
    
    expectedLevels.forEach(level => {
      if (!Object.values(VERIFICATION_STRENGTH).includes(level)) {
        throw new Error(`Missing verification strength: ${level}`);
      }
    });
  });
  
  test('A3: ObjectiveSchema defines required fields', () => {
    const requiredFields = [
      'objective_id',
      'target_id',
      'desired_state',
      'remediation_plan',
      'evaluation_interval',
      'verification_strength',
      'status',
      'created_at',
      'updated_at'
    ];
    
    requiredFields.forEach(field => {
      if (!(field in ObjectiveSchema)) {
        throw new Error(`Missing field in schema: ${field}`);
      }
    });
  });
  
  // ========================================
  // Category B: Validation
  // ========================================
  
  test('B1: validateObjective accepts valid objective', () => {
    const objective = {
      objective_id: 'obj_123',
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '5m',
      verification_strength: 'service_health',
      status: 'monitoring',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = validateObjective(objective);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
  });
  
  test('B2: validateObjective rejects missing objective_id', () => {
    const objective = {
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '5m'
    };
    
    const result = validateObjective(objective);
    if (result.valid) {
      throw new Error('Should have failed validation');
    }
    if (!result.errors.some(e => e.includes('objective_id'))) {
      throw new Error('Should report missing objective_id');
    }
  });
  
  test('B3: validateObjective rejects invalid status', () => {
    const objective = {
      objective_id: 'obj_123',
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '5m',
      status: 'invalid_status'
    };
    
    const result = validateObjective(objective);
    if (result.valid) {
      throw new Error('Should have failed validation');
    }
    if (!result.errors.some(e => e.includes('status'))) {
      throw new Error('Should report invalid status');
    }
  });
  
  test('B4: validateObjective rejects invalid verification_strength', () => {
    const objective = {
      objective_id: 'obj_123',
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '5m',
      verification_strength: 'invalid_strength'
    };
    
    const result = validateObjective(objective);
    if (result.valid) {
      throw new Error('Should have failed validation');
    }
    if (!result.errors.some(e => e.includes('verification_strength'))) {
      throw new Error('Should report invalid verification_strength');
    }
  });
  
  test('B5: validateObjective rejects invalid interval format', () => {
    const objective = {
      objective_id: 'obj_123',
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: 'invalid'
    };
    
    const result = validateObjective(objective);
    if (result.valid) {
      throw new Error('Should have failed validation');
    }
    if (!result.errors.some(e => e.includes('evaluation_interval'))) {
      throw new Error('Should report invalid interval format');
    }
  });
  
  test('B6: validateObjective rejects non-object desired_state', () => {
    const objective = {
      objective_id: 'obj_123',
      target_id: 'openclaw-gateway',
      desired_state: 'not_an_object',
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '5m'
    };
    
    const result = validateObjective(objective);
    if (result.valid) {
      throw new Error('Should have failed validation');
    }
    if (!result.errors.some(e => e.includes('desired_state'))) {
      throw new Error('Should report invalid desired_state type');
    }
  });
  
  // ========================================
  // Category C: Creation
  // ========================================
  
  test('C1: createObjective generates valid objective with defaults', () => {
    const config = {
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    };
    
    const objective = createObjective(config);
    
    if (!objective.objective_id) throw new Error('Missing objective_id');
    if (objective.status !== OBJECTIVE_STATUS.DECLARED) {
      throw new Error('Default status should be DECLARED');
    }
    if (objective.verification_strength !== VERIFICATION_STRENGTH.SERVICE_HEALTH) {
      throw new Error('Default verification_strength should be SERVICE_HEALTH');
    }
    if (objective.evaluation_interval !== '5m') {
      throw new Error('Default evaluation_interval should be 5m');
    }
    if (objective.priority !== 100) {
      throw new Error('Default priority should be 100');
    }
  });
  
  test('C2: createObjective accepts custom values', () => {
    const config = {
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery',
      evaluation_interval: '30s',
      verification_strength: VERIFICATION_STRENGTH.FULL_VALIDATION,
      priority: 50,
      owner: 'castlereagh'
    };
    
    const objective = createObjective(config);
    
    if (objective.evaluation_interval !== '30s') {
      throw new Error('Should use custom evaluation_interval');
    }
    if (objective.verification_strength !== VERIFICATION_STRENGTH.FULL_VALIDATION) {
      throw new Error('Should use custom verification_strength');
    }
    if (objective.priority !== 50) {
      throw new Error('Should use custom priority');
    }
    if (objective.owner !== 'castlereagh') {
      throw new Error('Should use custom owner');
    }
  });
  
  test('C3: createObjective rejects invalid configuration', () => {
    const config = {
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true }
      // Missing remediation_plan
    };
    
    let threw = false;
    try {
      createObjective(config);
    } catch (error) {
      threw = true;
      if (!error.message.includes('remediation_plan')) {
        throw new Error('Should report missing remediation_plan');
      }
    }
    
    if (!threw) {
      throw new Error('Should have thrown validation error');
    }
  });
  
  test('C4: createObjective sets timestamps', () => {
    const config = {
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    };
    
    const objective = createObjective(config);
    
    if (!objective.created_at) throw new Error('Missing created_at');
    if (!objective.updated_at) throw new Error('Missing updated_at');
    
    // Validate ISO format
    const createdDate = new Date(objective.created_at);
    if (isNaN(createdDate.getTime())) {
      throw new Error('created_at is not valid ISO timestamp');
    }
  });
  
  // ========================================
  // Category D: Status Updates
  // ========================================
  
  test('D1: updateObjectiveStatus changes status', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const updated = updateObjectiveStatus(
      objective,
      OBJECTIVE_STATUS.MONITORING
    );
    
    if (updated.status !== OBJECTIVE_STATUS.MONITORING) {
      throw new Error('Status should be updated');
    }
    if (updated.objective_id !== objective.objective_id) {
      throw new Error('objective_id should be preserved');
    }
  });
  
  test('D2: updateObjectiveStatus updates timestamp', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const updated = updateObjectiveStatus(
      objective,
      OBJECTIVE_STATUS.MONITORING
    );
    
    // Timestamp should be valid ISO string (may be same millisecond in fast execution)
    const updatedDate = new Date(updated.updated_at);
    if (isNaN(updatedDate.getTime())) {
      throw new Error('updated_at should be valid timestamp');
    }
    
    // Timestamp should be >= original (monotonic)
    const originalDate = new Date(objective.updated_at);
    if (updatedDate < originalDate) {
      throw new Error('updated_at should not go backwards');
    }
  });
  
  test('D3: updateObjectiveStatus accepts metadata', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    const updated = updateObjectiveStatus(
      objective,
      OBJECTIVE_STATUS.MONITORING,
      { last_check: 'health_passed' }
    );
    
    if (updated.last_check !== 'health_passed') {
      throw new Error('Metadata should be merged');
    }
  });
  
  test('D4: updateObjectiveStatus rejects invalid status', () => {
    const objective = createObjective({
      target_id: 'openclaw-gateway',
      desired_state: { service_active: true },
      remediation_plan: 'gateway_recovery'
    });
    
    let threw = false;
    try {
      updateObjectiveStatus(objective, 'invalid_status');
    } catch (error) {
      threw = true;
      if (!error.message.includes('Invalid status')) {
        throw new Error('Should report invalid status');
      }
    }
    
    if (!threw) {
      throw new Error('Should have thrown error');
    }
  });
  
  // ========================================
  // Category E: Interval Parsing
  // ========================================
  
  test('E1: parseInterval converts seconds correctly', () => {
    const ms = parseInterval('30s');
    if (ms !== 30000) {
      throw new Error(`Expected 30000ms, got ${ms}`);
    }
  });
  
  test('E2: parseInterval converts minutes correctly', () => {
    const ms = parseInterval('5m');
    if (ms !== 300000) {
      throw new Error(`Expected 300000ms, got ${ms}`);
    }
  });
  
  test('E3: parseInterval converts hours correctly', () => {
    const ms = parseInterval('2h');
    if (ms !== 7200000) {
      throw new Error(`Expected 7200000ms, got ${ms}`);
    }
  });
  
  test('E4: parseInterval rejects invalid format', () => {
    let threw = false;
    try {
      parseInterval('invalid');
    } catch (error) {
      threw = true;
      if (!error.message.includes('Invalid interval format')) {
        throw new Error('Should report invalid format');
      }
    }
    
    if (!threw) {
      throw new Error('Should have thrown error');
    }
  });
  
  test('E5: parseInterval rejects missing unit', () => {
    let threw = false;
    try {
      parseInterval('30');
    } catch (error) {
      threw = true;
    }
    
    if (!threw) {
      throw new Error('Should have thrown error for missing unit');
    }
  });
  
  // ========================================
  // Results
  // ========================================
  
  console.log('\n' + '='.repeat(60));
  console.log(`Objective Schema Tests: ${results.passed}/${results.passed + results.failed} passed`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ All objective schema tests passed');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
