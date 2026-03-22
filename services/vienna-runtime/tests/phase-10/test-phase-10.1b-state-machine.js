/**
 * Phase 10.1b Tests: Reconciliation State Machine
 * 
 * Validates transition logic, state helpers, and eligibility checks.
 */

const {
  ReconciliationStatus,
  TransitionReason,
  canTransition,
  getAllowedNextStates,
  getAllowedReasons,
  applyTransition,
  isEligibleForReconciliation,
  isTerminalState,
  isRemediating,
  isInCooldown,
  hasAttemptsRemaining,
  isStaleReconciliation,
  determineFailureStatus,
  getReconciliationSummary,
  DEFAULT_POLICY
} = require('../../lib/core/reconciliation-state-machine');

async function runTests() {
  console.log('\n=== Phase 10.1b State Machine Tests ===\n');
  
  let passed = 0;
  let failed = 0;

  // Category A: Transition Validation
  
  // Test A1: Valid transitions from idle
  try {
    if (!canTransition('idle', 'reconciling', 'drift_detected')) {
      throw new Error('Should allow idle → reconciling with drift_detected');
    }
    if (!canTransition('idle', 'safe_mode', 'safe_mode_entered')) {
      throw new Error('Should allow idle → safe_mode with safe_mode_entered');
    }
    console.log('✓ Test A1: Valid transitions from idle');
    passed++;
  } catch (err) {
    console.error('✗ Test A1 failed:', err.message);
    failed++;
  }

  // Test A2: Invalid transitions from idle
  try {
    if (canTransition('idle', 'cooldown', 'drift_detected')) {
      throw new Error('Should not allow idle → cooldown');
    }
    if (canTransition('idle', 'reconciling', 'verification_success')) {
      throw new Error('Should not allow idle → reconciling with wrong reason');
    }
    console.log('✓ Test A2: Invalid transitions from idle rejected');
    passed++;
  } catch (err) {
    console.error('✗ Test A2 failed:', err.message);
    failed++;
  }

  // Test A3: Valid transitions from reconciling
  try {
    if (!canTransition('reconciling', 'idle', 'verification_success')) {
      throw new Error('Should allow reconciling → idle with verification_success');
    }
    if (!canTransition('reconciling', 'cooldown', 'execution_failed')) {
      throw new Error('Should allow reconciling → cooldown with execution_failed');
    }
    if (!canTransition('reconciling', 'degraded', 'attempts_exhausted')) {
      throw new Error('Should allow reconciling → degraded with attempts_exhausted');
    }
    console.log('✓ Test A3: Valid transitions from reconciling');
    passed++;
  } catch (err) {
    console.error('✗ Test A3 failed:', err.message);
    failed++;
  }

  // Test A4: Valid transitions from cooldown
  try {
    if (!canTransition('cooldown', 'reconciling', 'cooldown_expired')) {
      throw new Error('Should allow cooldown → reconciling with cooldown_expired');
    }
    if (!canTransition('cooldown', 'idle', 'passive_recovery')) {
      throw new Error('Should allow cooldown → idle with passive_recovery');
    }
    if (!canTransition('cooldown', 'degraded', 'attempts_exhausted')) {
      throw new Error('Should allow cooldown → degraded with attempts_exhausted');
    }
    console.log('✓ Test A4: Valid transitions from cooldown');
    passed++;
  } catch (err) {
    console.error('✗ Test A4 failed:', err.message);
    failed++;
  }

  // Test A5: Valid transitions from degraded
  try {
    if (!canTransition('degraded', 'idle', 'manual_reset')) {
      throw new Error('Should allow degraded → idle with manual_reset');
    }
    if (canTransition('degraded', 'reconciling', 'drift_detected')) {
      throw new Error('Should not allow degraded → reconciling without manual reset');
    }
    console.log('✓ Test A5: Degraded requires manual reset');
    passed++;
  } catch (err) {
    console.error('✗ Test A5 failed:', err.message);
    failed++;
  }

  // Test A6: Self-transitions always invalid
  try {
    if (canTransition('idle', 'idle', 'drift_detected')) {
      throw new Error('Should not allow self-transition');
    }
    if (canTransition('reconciling', 'reconciling', 'execution_failed')) {
      throw new Error('Should not allow self-transition');
    }
    console.log('✓ Test A6: Self-transitions rejected');
    passed++;
  } catch (err) {
    console.error('✗ Test A6 failed:', err.message);
    failed++;
  }

  // Category B: State Helpers

  // Test B1: getAllowedNextStates
  try {
    const idleNext = getAllowedNextStates('idle');
    if (!idleNext.includes('reconciling') || !idleNext.includes('safe_mode')) {
      throw new Error('idle should allow transitions to reconciling and safe_mode');
    }
    
    const reconcilingNext = getAllowedNextStates('reconciling');
    if (!reconcilingNext.includes('idle') || !reconcilingNext.includes('cooldown') || !reconcilingNext.includes('degraded')) {
      throw new Error('reconciling should allow transitions to idle, cooldown, degraded');
    }
    
    console.log('✓ Test B1: getAllowedNextStates works');
    passed++;
  } catch (err) {
    console.error('✗ Test B1 failed:', err.message);
    failed++;
  }

  // Test B2: getAllowedReasons
  try {
    const reasons = getAllowedReasons('idle', 'reconciling');
    if (!reasons.includes('drift_detected') || !reasons.includes('cooldown_expired')) {
      throw new Error('idle → reconciling should allow drift_detected and cooldown_expired');
    }
    console.log('✓ Test B2: getAllowedReasons works');
    passed++;
  } catch (err) {
    console.error('✗ Test B2 failed:', err.message);
    failed++;
  }

  // Category C: Apply Transition

  // Test C1: idle → reconciling increments generation
  try {
    const objective = {
      reconciliation_status: 'idle',
      reconciliation_generation: 5,
      reconciliation_attempt_count: 0
    };
    
    const updates = applyTransition(objective, 'reconciling', 'drift_detected');
    
    if (updates.reconciliation_status !== 'reconciling') {
      throw new Error('Should set status to reconciling');
    }
    if (updates.reconciliation_generation !== 6) {
      throw new Error(`Should increment generation to 6, got ${updates.reconciliation_generation}`);
    }
    if (!updates.reconciliation_started_at) {
      throw new Error('Should set reconciliation_started_at');
    }
    if (updates.reconciliation_cooldown_until !== null) {
      throw new Error('Should clear cooldown_until');
    }
    
    console.log('✓ Test C1: idle → reconciling increments generation');
    passed++;
  } catch (err) {
    console.error('✗ Test C1 failed:', err.message);
    failed++;
  }

  // Test C2: reconciling → idle resets attempt count on success
  try {
    const objective = {
      reconciliation_status: 'reconciling',
      reconciliation_attempt_count: 2,
      reconciliation_generation: 5
    };
    
    const updates = applyTransition(objective, 'idle', 'verification_success');
    
    if (updates.reconciliation_status !== 'idle') {
      throw new Error('Should set status to idle');
    }
    if (updates.reconciliation_attempt_count !== 0) {
      throw new Error('Should reset attempt count to 0');
    }
    if (!updates.reconciliation_last_verified_at) {
      throw new Error('Should set last_verified_at');
    }
    if (updates.reconciliation_last_error !== null) {
      throw new Error('Should clear last_error on success');
    }
    
    console.log('✓ Test C2: reconciling → idle resets attempt count on success');
    passed++;
  } catch (err) {
    console.error('✗ Test C2 failed:', err.message);
    failed++;
  }

  // Test C3: reconciling → cooldown sets cooldown_until
  try {
    const objective = {
      reconciliation_status: 'reconciling',
      reconciliation_attempt_count: 1
    };
    
    const updates = applyTransition(objective, 'cooldown', 'execution_failed', {
      cooldown_seconds: 300,
      error: 'service restart failed'
    });
    
    if (updates.reconciliation_status !== 'cooldown') {
      throw new Error('Should set status to cooldown');
    }
    if (!updates.reconciliation_cooldown_until) {
      throw new Error('Should set cooldown_until');
    }
    if (updates.reconciliation_last_error !== 'service restart failed') {
      throw new Error('Should capture error message');
    }
    
    // Check cooldown_until is in the future
    const cooldownTime = new Date(updates.reconciliation_cooldown_until);
    const now = new Date();
    if (cooldownTime <= now) {
      throw new Error('cooldown_until should be in the future');
    }
    
    console.log('✓ Test C3: reconciling → cooldown sets cooldown_until');
    passed++;
  } catch (err) {
    console.error('✗ Test C3 failed:', err.message);
    failed++;
  }

  // Test C4: Invalid transition throws error
  try {
    const objective = {
      reconciliation_status: 'idle',
      reconciliation_attempt_count: 0
    };
    
    let threw = false;
    try {
      applyTransition(objective, 'cooldown', 'drift_detected');
    } catch (err) {
      threw = true;
      if (!err.message.includes('Invalid transition')) {
        throw new Error('Should throw with "Invalid transition" message');
      }
    }
    
    if (!threw) {
      throw new Error('Should throw on invalid transition');
    }
    
    console.log('✓ Test C4: Invalid transition throws error');
    passed++;
  } catch (err) {
    console.error('✗ Test C4 failed:', err.message);
    failed++;
  }

  // Category D: Eligibility Checks

  // Test D1: isEligibleForReconciliation - idle is eligible
  try {
    const objective = { reconciliation_status: 'idle', manual_hold: false };
    const result = isEligibleForReconciliation(objective);
    
    if (!result.eligible) {
      throw new Error('idle objective should be eligible');
    }
    if (result.reason !== 'idle') {
      throw new Error('reason should be "idle"');
    }
    
    console.log('✓ Test D1: idle is eligible for reconciliation');
    passed++;
  } catch (err) {
    console.error('✗ Test D1 failed:', err.message);
    failed++;
  }

  // Test D2: isEligibleForReconciliation - reconciling is not eligible
  try {
    const objective = { reconciliation_status: 'reconciling', manual_hold: false };
    const result = isEligibleForReconciliation(objective);
    
    if (result.eligible) {
      throw new Error('reconciling objective should not be eligible');
    }
    if (result.reason !== 'in_flight') {
      throw new Error('reason should be "in_flight"');
    }
    
    console.log('✓ Test D2: reconciling is not eligible');
    passed++;
  } catch (err) {
    console.error('✗ Test D2 failed:', err.message);
    failed++;
  }

  // Test D3: isEligibleForReconciliation - active cooldown blocks
  try {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    const objective = {
      reconciliation_status: 'cooldown',
      reconciliation_cooldown_until: futureTime,
      manual_hold: false
    };
    const result = isEligibleForReconciliation(objective);
    
    if (result.eligible) {
      throw new Error('cooldown objective should not be eligible');
    }
    if (result.reason !== 'cooldown_active') {
      throw new Error('reason should be "cooldown_active"');
    }
    
    console.log('✓ Test D3: active cooldown blocks reconciliation');
    passed++;
  } catch (err) {
    console.error('✗ Test D3 failed:', err.message);
    failed++;
  }

  // Test D4: isEligibleForReconciliation - expired cooldown is eligible
  try {
    const pastTime = new Date(Date.now() - 60000).toISOString();
    const objective = {
      reconciliation_status: 'cooldown',
      reconciliation_cooldown_until: pastTime,
      manual_hold: false
    };
    const result = isEligibleForReconciliation(objective);
    
    if (!result.eligible) {
      throw new Error('expired cooldown should be eligible');
    }
    if (result.reason !== 'cooldown_expired') {
      throw new Error('reason should be "cooldown_expired"');
    }
    
    console.log('✓ Test D4: expired cooldown is eligible');
    passed++;
  } catch (err) {
    console.error('✗ Test D4 failed:', err.message);
    failed++;
  }

  // Test D5: isEligibleForReconciliation - manual_hold blocks
  try {
    const objective = { reconciliation_status: 'idle', manual_hold: true };
    const result = isEligibleForReconciliation(objective);
    
    if (result.eligible) {
      throw new Error('manual_hold should block reconciliation');
    }
    if (result.reason !== 'manual_hold') {
      throw new Error('reason should be "manual_hold"');
    }
    
    console.log('✓ Test D5: manual_hold blocks reconciliation');
    passed++;
  } catch (err) {
    console.error('✗ Test D5 failed:', err.message);
    failed++;
  }

  // Test D6: isEligibleForReconciliation - global_safe_mode blocks
  try {
    const objective = { reconciliation_status: 'idle', manual_hold: false };
    const result = isEligibleForReconciliation(objective, { global_safe_mode: true });
    
    if (result.eligible) {
      throw new Error('global_safe_mode should block reconciliation');
    }
    if (result.reason !== 'global_safe_mode') {
      throw new Error('reason should be "global_safe_mode"');
    }
    
    console.log('✓ Test D6: global_safe_mode blocks reconciliation');
    passed++;
  } catch (err) {
    console.error('✗ Test D6 failed:', err.message);
    failed++;
  }

  // Test D7: isEligibleForReconciliation - degraded blocks
  try {
    const objective = { reconciliation_status: 'degraded', manual_hold: false };
    const result = isEligibleForReconciliation(objective);
    
    if (result.eligible) {
      throw new Error('degraded should block reconciliation');
    }
    if (result.reason !== 'degraded') {
      throw new Error('reason should be "degraded"');
    }
    
    console.log('✓ Test D7: degraded blocks reconciliation');
    passed++;
  } catch (err) {
    console.error('✗ Test D7 failed:', err.message);
    failed++;
  }

  // Category E: Status Checks

  // Test E1: isTerminalState
  try {
    if (!isTerminalState({ reconciliation_status: 'degraded' })) {
      throw new Error('degraded should be terminal');
    }
    if (isTerminalState({ reconciliation_status: 'idle' })) {
      throw new Error('idle should not be terminal');
    }
    if (isTerminalState({ reconciliation_status: 'cooldown' })) {
      throw new Error('cooldown should not be terminal');
    }
    
    console.log('✓ Test E1: isTerminalState works');
    passed++;
  } catch (err) {
    console.error('✗ Test E1 failed:', err.message);
    failed++;
  }

  // Test E2: isRemediating
  try {
    if (!isRemediating({ reconciliation_status: 'reconciling' })) {
      throw new Error('reconciling should be remediating');
    }
    if (isRemediating({ reconciliation_status: 'idle' })) {
      throw new Error('idle should not be remediating');
    }
    
    console.log('✓ Test E2: isRemediating works');
    passed++;
  } catch (err) {
    console.error('✗ Test E2 failed:', err.message);
    failed++;
  }

  // Test E3: isInCooldown
  try {
    const futureTime = new Date(Date.now() + 60000).toISOString();
    const pastTime = new Date(Date.now() - 60000).toISOString();
    
    if (!isInCooldown({ reconciliation_status: 'cooldown', reconciliation_cooldown_until: futureTime })) {
      throw new Error('future cooldown should be active');
    }
    if (isInCooldown({ reconciliation_status: 'cooldown', reconciliation_cooldown_until: pastTime })) {
      throw new Error('past cooldown should not be active');
    }
    if (isInCooldown({ reconciliation_status: 'idle' })) {
      throw new Error('idle should not be in cooldown');
    }
    
    console.log('✓ Test E3: isInCooldown works');
    passed++;
  } catch (err) {
    console.error('✗ Test E3 failed:', err.message);
    failed++;
  }

  // Test E4: hasAttemptsRemaining
  try {
    if (!hasAttemptsRemaining({ reconciliation_attempt_count: 0 })) {
      throw new Error('0 attempts should have attempts remaining');
    }
    if (!hasAttemptsRemaining({ reconciliation_attempt_count: 2 })) {
      throw new Error('2 attempts should have attempts remaining (max 3)');
    }
    if (hasAttemptsRemaining({ reconciliation_attempt_count: 3 })) {
      throw new Error('3 attempts should not have attempts remaining');
    }
    if (hasAttemptsRemaining({ reconciliation_attempt_count: 5 })) {
      throw new Error('5 attempts should not have attempts remaining');
    }
    
    console.log('✓ Test E4: hasAttemptsRemaining works');
    passed++;
  } catch (err) {
    console.error('✗ Test E4 failed:', err.message);
    failed++;
  }

  // Test E5: isStaleReconciliation
  try {
    const recentStart = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    const oldStart = new Date(Date.now() - 200000).toISOString(); // 3.3 min ago
    
    if (isStaleReconciliation({ 
      reconciliation_status: 'reconciling',
      reconciliation_started_at: recentStart
    })) {
      throw new Error('recent reconciliation should not be stale');
    }
    
    if (!isStaleReconciliation({
      reconciliation_status: 'reconciling',
      reconciliation_started_at: oldStart
    })) {
      throw new Error('old reconciliation should be stale (>120s)');
    }
    
    if (isStaleReconciliation({ reconciliation_status: 'idle' })) {
      throw new Error('idle should not be stale');
    }
    
    console.log('✓ Test E5: isStaleReconciliation works');
    passed++;
  } catch (err) {
    console.error('✗ Test E5 failed:', err.message);
    failed++;
  }

  // Test E6: determineFailureStatus
  try {
    if (determineFailureStatus({ reconciliation_attempt_count: 0 }) !== 'cooldown') {
      throw new Error('0 attempts should transition to cooldown');
    }
    if (determineFailureStatus({ reconciliation_attempt_count: 2 }) !== 'cooldown') {
      throw new Error('2 attempts should transition to cooldown');
    }
    if (determineFailureStatus({ reconciliation_attempt_count: 3 }) !== 'degraded') {
      throw new Error('3 attempts should transition to degraded');
    }
    
    console.log('✓ Test E6: determineFailureStatus works');
    passed++;
  } catch (err) {
    console.error('✗ Test E6 failed:', err.message);
    failed++;
  }

  // Test E7: getReconciliationSummary
  try {
    const objective = {
      reconciliation_status: 'cooldown',
      reconciliation_attempt_count: 2,
      reconciliation_last_result: 'execution_failed',
      reconciliation_last_error: 'timeout',
      reconciliation_cooldown_until: new Date(Date.now() + 60000).toISOString(),
      reconciliation_generation: 5,
      manual_hold: false
    };
    
    const summary = getReconciliationSummary(objective);
    
    if (summary.status !== 'cooldown') {
      throw new Error('summary should include status');
    }
    if (summary.attempt_count !== 2) {
      throw new Error('summary should include attempt_count');
    }
    if (summary.last_result !== 'execution_failed') {
      throw new Error('summary should include last_result');
    }
    if (summary.last_error !== 'timeout') {
      throw new Error('summary should include last_error');
    }
    if (summary.generation !== 5) {
      throw new Error('summary should include generation');
    }
    if (summary.is_terminal !== false) {
      throw new Error('cooldown should not be terminal');
    }
    if (summary.is_in_cooldown !== true) {
      throw new Error('should detect active cooldown');
    }
    
    console.log('✓ Test E7: getReconciliationSummary works');
    passed++;
  } catch (err) {
    console.error('✗ Test E7 failed:', err.message);
    failed++;
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
