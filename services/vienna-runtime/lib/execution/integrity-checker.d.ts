export class IntegrityChecker {
    lastCheck: number;
    violations: any[];
    maxViolationHistory: number;
    /**
     * Check system integrity
     *
     * @param {object} executor - QueuedExecutor instance
     * @param {object} viennaCore - Vienna core (optional, for deeper checks)
     * @returns {object} Integrity report
     */
    check(executor: object, viennaCore?: object): object;
    /**
     * Check execution control is enforced
     */
    _checkExecutionControlEnforced(executor: any): {
        status: string;
        message: string;
        paused?: undefined;
    } | {
        status: string;
        message: string;
        paused: any;
    };
    /**
     * Check rate limiting is active
     */
    _checkRateLimitingActive(executor: any): {
        status: string;
        message: string;
        global_limit?: undefined;
    } | {
        status: string;
        message: string;
        global_limit: any;
    };
    /**
     * Check agent budget is active
     */
    _checkAgentBudgetActive(executor: any): {
        status: string;
        message: string;
        max_active?: undefined;
    } | {
        status: string;
        message: string;
        max_active: any;
    };
    /**
     * Check DLQ is durable
     */
    _checkDLQDurable(executor: any): {
        status: string;
        message: string;
        total_entries?: undefined;
    } | {
        status: string;
        message: string;
        total_entries: any;
    };
    /**
     * Check recursion guard is active
     */
    _checkRecursionGuardActive(executor: any): {
        status: string;
        message: string;
        active_cooldowns?: undefined;
    } | {
        status: string;
        message: string;
        active_cooldowns: any;
    };
    /**
     * Check queue durability
     */
    _checkQueueDurability(executor: any): {
        status: string;
        message: string;
        total_entries?: undefined;
    } | {
        status: string;
        message: string;
        total_entries: any;
    };
    /**
     * Check replay log exists
     */
    _checkReplayLogExists(executor: any): {
        status: string;
        message: string;
    };
    /**
     * Determine overall integrity state
     */
    _determineOverallState(checks: any): string;
    /**
     * Record violation
     */
    _recordViolation(violation: any): void;
    /**
     * Get violation history
     */
    getViolations(limit?: number): any[];
    /**
     * Clear violation history (operator action)
     */
    clearViolations(): void;
}
export namespace IntegrityState {
    let INTACT: string;
    let DEGRADED: string;
    let VIOLATED: string;
}
//# sourceMappingURL=integrity-checker.d.ts.map