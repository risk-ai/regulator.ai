export class ObjectiveEvaluationService {
    constructor(options?: {});
    intervalMs: any;
    maxConcurrent: any;
    enabled: boolean;
    paused: boolean;
    running: boolean;
    timerId: NodeJS.Timeout;
    currentEvaluations: number;
    metrics: {
        cyclesRun: number;
        objectivesEvaluated: number;
        cyclesFailed: number;
        totalDurationMs: number;
        lastCycleAt: any;
        lastCycleDurationMs: any;
        lastCycleStatus: any;
        lastError: any;
    };
    /**
     * Start the evaluation service
     */
    start(): Promise<void>;
    /**
     * Stop the evaluation service
     */
    stop(): Promise<void>;
    /**
     * Pause evaluation cycles (keep service running but skip cycles)
     */
    pause(): void;
    /**
     * Resume evaluation cycles
     */
    resume(): void;
    /**
     * Get current service status
     */
    getStatus(): {
        enabled: boolean;
        paused: boolean;
        running: boolean;
        currentEvaluations: number;
        intervalMs: any;
        maxConcurrent: any;
        metrics: {
            cyclesRun: number;
            objectivesEvaluated: number;
            cyclesFailed: number;
            totalDurationMs: number;
            lastCycleAt: any;
            lastCycleDurationMs: any;
            lastCycleStatus: any;
            lastError: any;
        };
    };
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Run single evaluation cycle
     * @private
     */
    private _runCycle;
    /**
     * Schedule next evaluation cycle
     * @private
     */
    private _scheduleNext;
}
/**
 * Get singleton service instance
 * @param {Object} options - Service options
 * @returns {ObjectiveEvaluationService}
 */
export function getEvaluationService(options?: any): ObjectiveEvaluationService;
/**
 * Reset singleton instance (for testing)
 */
export function resetEvaluationService(): void;
//# sourceMappingURL=objective-evaluation-service.d.ts.map