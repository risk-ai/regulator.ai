/**
 * Phase 7.4 Stage 4: System Integrity Checker
 *
 * Purpose: Continuously verify that Vienna's control-plane guarantees remain true.
 *
 * Design:
 * - Verifies core architectural invariants
 * - Emits alerts when invariants fail
 * - Never auto-mutates system (read-only verification)
 * - Recommends pause on integrity failure
 */
const IntegrityState = {
    INTACT: 'INTACT',
    DEGRADED: 'DEGRADED',
    VIOLATED: 'VIOLATED'
};
class IntegrityChecker {
    constructor() {
        this.lastCheck = null;
        this.violations = [];
        this.maxViolationHistory = 100;
    }
    /**
     * Check system integrity
     *
     * @param {object} executor - QueuedExecutor instance
     * @param {object} viennaCore - Vienna core (optional, for deeper checks)
     * @returns {object} Integrity report
     */
    check(executor, viennaCore = null) {
        const now = Date.now();
        this.lastCheck = now;
        const checks = {
            execution_control_enforced: this._checkExecutionControlEnforced(executor),
            rate_limiting_active: this._checkRateLimitingActive(executor),
            agent_budget_active: this._checkAgentBudgetActive(executor),
            dlq_durable: this._checkDLQDurable(executor),
            recursion_guard_active: this._checkRecursionGuardActive(executor),
            queue_durability: this._checkQueueDurability(executor),
            replay_log_exists: this._checkReplayLogExists(executor)
        };
        // Determine overall state
        const state = this._determineOverallState(checks);
        // Record violations
        for (const [checkName, result] of Object.entries(checks)) {
            if (result.status === 'VIOLATED') {
                this._recordViolation({
                    check: checkName,
                    timestamp: new Date(now).toISOString(),
                    message: result.message
                });
            }
        }
        return {
            state,
            timestamp: new Date(now).toISOString(),
            checks,
            violations: this.violations.slice(-10), // Last 10 violations
            recommendation: state === IntegrityState.VIOLATED ? 'PAUSE_EXECUTION' : null
        };
    }
    /**
     * Check execution control is enforced
     */
    _checkExecutionControlEnforced(executor) {
        try {
            const controlState = executor.getExecutionControlState();
            if (!controlState) {
                return {
                    status: 'VIOLATED',
                    message: 'Execution control state unavailable'
                };
            }
            // Verify pause state is readable
            if (typeof controlState.paused !== 'boolean') {
                return {
                    status: 'VIOLATED',
                    message: 'Execution control pause state invalid'
                };
            }
            return {
                status: 'INTACT',
                message: 'Execution control operational',
                paused: controlState.paused
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Execution control check failed: ${error.message}`
            };
        }
    }
    /**
     * Check rate limiting is active
     */
    _checkRateLimitingActive(executor) {
        try {
            const rateLimiterState = executor.getRateLimiterState();
            if (!rateLimiterState || !rateLimiterState.policy) {
                return {
                    status: 'VIOLATED',
                    message: 'Rate limiter not operational'
                };
            }
            // Verify policy is configured
            if (!rateLimiterState.policy.max_envelopes_per_minute_global) {
                return {
                    status: 'VIOLATED',
                    message: 'Rate limiter policy missing'
                };
            }
            return {
                status: 'INTACT',
                message: 'Rate limiting active',
                global_limit: rateLimiterState.policy.max_envelopes_per_minute_global
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Rate limiter check failed: ${error.message}`
            };
        }
    }
    /**
     * Check agent budget is active
     */
    _checkAgentBudgetActive(executor) {
        try {
            const budgetState = executor.getAgentBudgetState();
            if (!budgetState || !budgetState.policy) {
                return {
                    status: 'VIOLATED',
                    message: 'Agent budget not operational'
                };
            }
            return {
                status: 'INTACT',
                message: 'Agent budgets active',
                max_active: budgetState.policy.max_active_envelopes_per_agent
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Agent budget check failed: ${error.message}`
            };
        }
    }
    /**
     * Check DLQ is durable
     */
    _checkDLQDurable(executor) {
        try {
            const dlqStats = executor.getDeadLetterStats();
            if (!dlqStats) {
                return {
                    status: 'VIOLATED',
                    message: 'DLQ stats unavailable'
                };
            }
            // Verify DLQ is initialized
            if (!executor.deadLetterQueue.loaded) {
                return {
                    status: 'DEGRADED',
                    message: 'DLQ not fully initialized'
                };
            }
            return {
                status: 'INTACT',
                message: 'DLQ operational',
                total_entries: dlqStats.total
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `DLQ check failed: ${error.message}`
            };
        }
    }
    /**
     * Check recursion guard is active
     */
    _checkRecursionGuardActive(executor) {
        try {
            const recursionState = executor.getRecursionState();
            if (!recursionState) {
                return {
                    status: 'VIOLATED',
                    message: 'Recursion guard state unavailable'
                };
            }
            return {
                status: 'INTACT',
                message: 'Recursion guard active',
                active_cooldowns: recursionState.active_cooldowns?.length || 0
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Recursion guard check failed: ${error.message}`
            };
        }
    }
    /**
     * Check queue durability
     */
    _checkQueueDurability(executor) {
        try {
            const queueStats = executor.getQueueState();
            if (!queueStats) {
                return {
                    status: 'VIOLATED',
                    message: 'Queue stats unavailable'
                };
            }
            // Verify queue is initialized
            if (!executor.queue.loaded) {
                return {
                    status: 'DEGRADED',
                    message: 'Queue not fully initialized'
                };
            }
            return {
                status: 'INTACT',
                message: 'Queue operational',
                total_entries: queueStats.total
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Queue check failed: ${error.message}`
            };
        }
    }
    /**
     * Check replay log exists
     */
    _checkReplayLogExists(executor) {
        try {
            if (!executor.replayLog) {
                return {
                    status: 'DEGRADED',
                    message: 'Replay log not configured'
                };
            }
            return {
                status: 'INTACT',
                message: 'Replay log operational'
            };
        }
        catch (error) {
            return {
                status: 'VIOLATED',
                message: `Replay log check failed: ${error.message}`
            };
        }
    }
    /**
     * Determine overall integrity state
     */
    _determineOverallState(checks) {
        const statuses = Object.values(checks).map(c => c.status);
        if (statuses.includes('VIOLATED')) {
            return IntegrityState.VIOLATED;
        }
        if (statuses.includes('DEGRADED')) {
            return IntegrityState.DEGRADED;
        }
        return IntegrityState.INTACT;
    }
    /**
     * Record violation
     */
    _recordViolation(violation) {
        this.violations.push(violation);
        if (this.violations.length > this.maxViolationHistory) {
            this.violations.shift();
        }
    }
    /**
     * Get violation history
     */
    getViolations(limit = 10) {
        return this.violations.slice(-limit);
    }
    /**
     * Clear violation history (operator action)
     */
    clearViolations() {
        this.violations = [];
    }
}
module.exports = { IntegrityChecker, IntegrityState };
//# sourceMappingURL=integrity-checker.js.map