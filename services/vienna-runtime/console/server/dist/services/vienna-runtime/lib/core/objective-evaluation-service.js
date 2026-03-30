/**
 * Phase 9.7 — Objective Evaluation Service
 *
 * Background scheduler for objective evaluation.
 *
 * Core responsibilities:
 * 1. Run evaluation cycles at regular intervals
 * 2. Provide start/stop/pause controls
 * 3. Rate limiting (max concurrent evaluations)
 * 4. Health metrics (duration, skip count, error rate)
 * 5. Graceful shutdown
 *
 * Design:
 * - Interval-based polling (default: 30s)
 * - Uses Phase 9.6 runEvaluationCycle()
 * - Deterministic timing (no drift)
 * - Safe restart (no catch-up storms)
 */
const { runEvaluationCycle } = require('./objective-coordinator');
class ObjectiveEvaluationService {
    constructor(options = {}) {
        this.intervalMs = options.intervalMs || 30000; // Default: 30s
        this.maxConcurrent = options.maxConcurrent || 1; // Default: serial execution
        this.enabled = false;
        this.paused = false;
        this.running = false;
        this.timerId = null;
        this.currentEvaluations = 0;
        // Health metrics
        this.metrics = {
            cyclesRun: 0,
            objectivesEvaluated: 0,
            cyclesFailed: 0,
            totalDurationMs: 0,
            lastCycleAt: null,
            lastCycleDurationMs: null,
            lastCycleStatus: null,
            lastError: null
        };
    }
    /**
     * Start the evaluation service
     */
    async start() {
        if (this.enabled) {
            console.log('[ObjectiveEvaluationService] Already running');
            return;
        }
        console.log(`[ObjectiveEvaluationService] Starting (interval: ${this.intervalMs}ms, maxConcurrent: ${this.maxConcurrent})`);
        this.enabled = true;
        this.paused = false;
        // Start first cycle immediately
        await this._runCycle();
        // Schedule next cycle
        this._scheduleNext();
    }
    /**
     * Stop the evaluation service
     */
    async stop() {
        if (!this.enabled) {
            console.log('[ObjectiveEvaluationService] Not running');
            return;
        }
        console.log('[ObjectiveEvaluationService] Stopping...');
        this.enabled = false;
        // Cancel pending timer
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        // Wait for current evaluations to complete
        while (this.running) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('[ObjectiveEvaluationService] Stopped');
    }
    /**
     * Pause evaluation cycles (keep service running but skip cycles)
     */
    pause() {
        if (!this.enabled) {
            console.log('[ObjectiveEvaluationService] Not running');
            return;
        }
        console.log('[ObjectiveEvaluationService] Paused');
        this.paused = true;
    }
    /**
     * Resume evaluation cycles
     */
    resume() {
        if (!this.enabled) {
            console.log('[ObjectiveEvaluationService] Not running');
            return;
        }
        console.log('[ObjectiveEvaluationService] Resumed');
        this.paused = false;
    }
    /**
     * Get current service status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            paused: this.paused,
            running: this.running,
            currentEvaluations: this.currentEvaluations,
            intervalMs: this.intervalMs,
            maxConcurrent: this.maxConcurrent,
            metrics: { ...this.metrics }
        };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            cyclesRun: 0,
            objectivesEvaluated: 0,
            cyclesFailed: 0,
            totalDurationMs: 0,
            lastCycleAt: null,
            lastCycleDurationMs: null,
            lastCycleStatus: null,
            lastError: null
        };
    }
    /**
     * Run single evaluation cycle
     * @private
     */
    async _runCycle() {
        // Skip if paused
        if (this.paused) {
            console.log('[ObjectiveEvaluationService] Cycle skipped (paused)');
            return;
        }
        // Skip if already at max concurrent
        if (this.currentEvaluations >= this.maxConcurrent) {
            console.log('[ObjectiveEvaluationService] Cycle skipped (max concurrent reached)');
            return;
        }
        this.running = true;
        this.currentEvaluations++;
        const startTime = Date.now();
        try {
            console.log('[ObjectiveEvaluationService] Running evaluation cycle...');
            // Run evaluation cycle
            const result = await runEvaluationCycle();
            // Update metrics
            const durationMs = Date.now() - startTime;
            this.metrics.cyclesRun++;
            this.metrics.objectivesEvaluated += result.objectives_evaluated || 0;
            this.metrics.totalDurationMs += durationMs;
            this.metrics.lastCycleAt = new Date().toISOString();
            this.metrics.lastCycleDurationMs = durationMs;
            this.metrics.lastCycleStatus = result.status;
            if (result.status === 'failed') {
                this.metrics.cyclesFailed++;
                this.metrics.lastError = result.error;
                console.log(`[ObjectiveEvaluationService] Cycle failed: ${result.error}`);
            }
            else {
                this.metrics.lastError = null;
                console.log(`[ObjectiveEvaluationService] Cycle completed (${result.objectives_evaluated} objectives, ${durationMs}ms)`);
            }
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.metrics.cyclesRun++;
            this.metrics.cyclesFailed++;
            this.metrics.totalDurationMs += durationMs;
            this.metrics.lastCycleAt = new Date().toISOString();
            this.metrics.lastCycleDurationMs = durationMs;
            this.metrics.lastCycleStatus = 'failed';
            this.metrics.lastError = error.message;
            console.error('[ObjectiveEvaluationService] Cycle error:', error);
        }
        finally {
            this.currentEvaluations--;
            this.running = false;
        }
    }
    /**
     * Schedule next evaluation cycle
     * @private
     */
    _scheduleNext() {
        if (!this.enabled) {
            return;
        }
        this.timerId = setTimeout(async () => {
            await this._runCycle();
            this._scheduleNext();
        }, this.intervalMs);
    }
}
// Singleton instance
let serviceInstance = null;
/**
 * Get singleton service instance
 * @param {Object} options - Service options
 * @returns {ObjectiveEvaluationService}
 */
function getEvaluationService(options = {}) {
    if (!serviceInstance) {
        serviceInstance = new ObjectiveEvaluationService(options);
    }
    return serviceInstance;
}
/**
 * Reset singleton instance (for testing)
 */
function resetEvaluationService() {
    if (serviceInstance) {
        if (serviceInstance.enabled) {
            serviceInstance.stop();
        }
        serviceInstance = null;
    }
}
module.exports = {
    ObjectiveEvaluationService,
    getEvaluationService,
    resetEvaluationService
};
//# sourceMappingURL=objective-evaluation-service.js.map