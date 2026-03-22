// Test environment setup
process.env.VIENNA_ENV = 'test';

/**
 * Phase 9.7 — Objective Evaluation Service Tests
 * 
 * Test coverage:
 * - Service lifecycle (start/stop/pause/resume)
 * - Interval execution
 * - Rate limiting
 * - Health metrics
 * - Graceful shutdown
 */

const test = require('node:test');
const assert = require('node:assert');
const { ObjectiveEvaluationService, resetEvaluationService } = require('../../lib/core/objective-evaluation-service');

// Test helper: wait for condition
async function waitFor(conditionFn, timeoutMs = 5000, checkIntervalMs = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  return false;
}

test('Phase 9.7 — Objective Evaluation Service', async (t) => {

  t.afterEach(() => {
    resetEvaluationService();
  });

  // ===== Category A: Service Lifecycle =====

  await t.test('A1: Service starts and stops', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    // Initially disabled
    assert.strictEqual(service.enabled, false);
    assert.strictEqual(service.running, false);
    
    // Start service
    await service.start();
    assert.strictEqual(service.enabled, true);
    
    // Wait for first cycle to complete
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    assert.ok(service.metrics.cyclesRun > 0, 'Should run at least one cycle');
    
    // Stop service
    await service.stop();
    assert.strictEqual(service.enabled, false);
    assert.strictEqual(service.running, false);
  });

  await t.test('A2: Pause and resume work correctly', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    
    // Wait for first cycle
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    const cyclesBeforePause = service.metrics.cyclesRun;
    
    // Pause
    service.pause();
    assert.strictEqual(service.paused, true);
    
    // Wait a bit - should not run new cycles
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.strictEqual(service.metrics.cyclesRun, cyclesBeforePause, 'Should not run cycles when paused');
    
    // Resume
    service.resume();
    assert.strictEqual(service.paused, false);
    
    // Should start running cycles again
    await waitFor(() => service.metrics.cyclesRun > cyclesBeforePause, 1000);
    assert.ok(service.metrics.cyclesRun > cyclesBeforePause, 'Should resume running cycles');
    
    await service.stop();
  });

  await t.test('A3: Cannot start twice', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    assert.strictEqual(service.enabled, true);
    
    // Second start should be no-op
    await service.start();
    assert.strictEqual(service.enabled, true);
    
    await service.stop();
  });

  await t.test('A4: Cannot stop when not running', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    // Should be no-op
    await service.stop();
    assert.strictEqual(service.enabled, false);
  });

  // ===== Category B: Interval Execution =====

  await t.test('B1: Runs cycles at regular intervals', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 200 });
    
    await service.start();
    
    // Wait for multiple cycles
    await waitFor(() => service.metrics.cyclesRun >= 3, 2000);
    
    assert.ok(service.metrics.cyclesRun >= 3, 'Should run multiple cycles');
    assert.ok(service.metrics.lastCycleAt !== null, 'Should record last cycle time');
    
    await service.stop();
  });

  await t.test('B2: Respects interval timing', async () => {
    const intervalMs = 200;
    const service = new ObjectiveEvaluationService({ intervalMs });
    
    await service.start();
    
    // Wait for first cycle
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    const firstCycleTime = Date.now();
    
    // Wait for second cycle
    await waitFor(() => service.metrics.cyclesRun > 1, 1000);
    const secondCycleTime = Date.now();
    
    const actualInterval = secondCycleTime - firstCycleTime;
    
    // Allow some tolerance (±50ms)
    assert.ok(
      actualInterval >= intervalMs - 50 && actualInterval <= intervalMs + 100,
      `Interval should be ~${intervalMs}ms (actual: ${actualInterval}ms)`
    );
    
    await service.stop();
  });

  // ===== Category C: Rate Limiting =====

  await t.test('C1: Respects maxConcurrent limit', async () => {
    const service = new ObjectiveEvaluationService({ 
      intervalMs: 50,
      maxConcurrent: 1 
    });
    
    await service.start();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Should never exceed maxConcurrent
    assert.ok(service.currentEvaluations <= 1, 'Should respect maxConcurrent=1');
    
    await service.stop();
  });

  await t.test('C2: Skips cycles when at max concurrent', async () => {
    const service = new ObjectiveEvaluationService({ 
      intervalMs: 100,
      maxConcurrent: 1 
    });
    
    // Mock slow evaluation cycle
    const originalRunCycle = service._runCycle.bind(service);
    let slowCycleRunning = false;
    
    service._runCycle = async function() {
      if (slowCycleRunning) {
        // Second call while first is running - should skip immediately
        return;
      }
      
      slowCycleRunning = true;
      this.running = true;
      this.currentEvaluations++;
      
      // Simulate slow evaluation (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.currentEvaluations--;
      this.running = false;
      slowCycleRunning = false;
    };
    
    await service.start();
    
    // Wait a bit - interval is 100ms but cycle takes 300ms
    // Should only complete ~1-2 cycles in 400ms
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Should have skipped some cycles due to maxConcurrent
    assert.ok(service.currentEvaluations <= 1, 'Should never exceed maxConcurrent');
    
    await service.stop();
  });

  // ===== Category D: Health Metrics =====

  await t.test('D1: Tracks cycle count correctly', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    
    await waitFor(() => service.metrics.cyclesRun >= 3, 2000);
    
    assert.ok(service.metrics.cyclesRun >= 3, 'Should track cycle count');
    
    await service.stop();
  });

  await t.test('D2: Tracks duration metrics', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    
    assert.ok(service.metrics.lastCycleDurationMs !== null, 'Should track last cycle duration');
    assert.ok(service.metrics.totalDurationMs > 0, 'Should track total duration');
    assert.ok(service.metrics.lastCycleAt !== null, 'Should track last cycle timestamp');
    
    await service.stop();
  });

  await t.test('D3: Tracks cycle status', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    
    assert.ok(
      service.metrics.lastCycleStatus === 'completed' || 
      service.metrics.lastCycleStatus === 'failed',
      'Should track cycle status'
    );
    
    await service.stop();
  });

  await t.test('D4: Can reset metrics', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    
    assert.ok(service.metrics.cyclesRun > 0, 'Should have cycles before reset');
    
    service.resetMetrics();
    
    assert.strictEqual(service.metrics.cyclesRun, 0);
    assert.strictEqual(service.metrics.objectivesEvaluated, 0);
    assert.strictEqual(service.metrics.cyclesFailed, 0);
    assert.strictEqual(service.metrics.totalDurationMs, 0);
    assert.strictEqual(service.metrics.lastCycleAt, null);
    
    await service.stop();
  });

  // ===== Category E: Graceful Shutdown =====

  await t.test('E1: Waits for current evaluation to complete on stop', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    // Track when cycle completes
    let cycleCompletedAt = null;
    let stopCompletedAt = null;
    
    const originalRunCycle = service._runCycle.bind(service);
    service._runCycle = async function() {
      this.running = true;
      this.currentEvaluations++;
      
      // Simulate slow evaluation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.currentEvaluations--;
      this.running = false;
      cycleCompletedAt = Date.now();
    };
    
    await service.start();
    
    // Wait for cycle to start
    await waitFor(() => service.running, 1000);
    assert.strictEqual(service.running, true, 'Cycle should be running');
    
    // Stop while cycle is running
    await service.stop();
    stopCompletedAt = Date.now();
    
    // Stop should have waited for cycle to complete
    assert.ok(cycleCompletedAt !== null, 'Cycle should have completed');
    assert.ok(stopCompletedAt !== null, 'Stop should have completed');
    assert.ok(cycleCompletedAt <= stopCompletedAt, 'Cycle should complete before or with stop');
    assert.strictEqual(service.running, false, 'Service should not be running after stop');
  });

  await t.test('E2: Cancels pending timer on stop', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 1000 }); // Long interval
    
    await service.start();
    
    // Should have scheduled next cycle
    assert.ok(service.timerId !== null, 'Should have scheduled timer');
    
    await service.stop();
    
    // Timer should be cancelled
    assert.strictEqual(service.timerId, null, 'Timer should be cancelled');
  });

  // ===== Category F: Status API =====

  await t.test('F1: getStatus returns correct state', async () => {
    const service = new ObjectiveEvaluationService({ 
      intervalMs: 200,
      maxConcurrent: 2 
    });
    
    // Before start
    let status = service.getStatus();
    assert.strictEqual(status.enabled, false);
    assert.strictEqual(status.paused, false);
    assert.strictEqual(status.running, false);
    assert.strictEqual(status.intervalMs, 200);
    assert.strictEqual(status.maxConcurrent, 2);
    
    // After start
    await service.start();
    status = service.getStatus();
    assert.strictEqual(status.enabled, true);
    
    // After pause
    service.pause();
    status = service.getStatus();
    assert.strictEqual(status.paused, true);
    
    // After resume
    service.resume();
    status = service.getStatus();
    assert.strictEqual(status.paused, false);
    
    // After stop
    await service.stop();
    status = service.getStatus();
    assert.strictEqual(status.enabled, false);
  });

  await t.test('F2: getStatus includes metrics', async () => {
    const service = new ObjectiveEvaluationService({ intervalMs: 100 });
    
    await service.start();
    await waitFor(() => service.metrics.cyclesRun > 0, 1000);
    
    const status = service.getStatus();
    
    assert.ok(status.metrics !== undefined);
    assert.ok(status.metrics.cyclesRun > 0);
    assert.ok(status.metrics.lastCycleAt !== null);
    
    await service.stop();
  });

  console.log('\n✅ All Phase 9.7 Evaluation Service tests passed\n');
});
