/**
 * Phase 9.6 — Objective Evaluation Scheduler
 *
 * Deterministic interval-based evaluation scheduling.
 *
 * Core invariants:
 * 1. Scheduler never executes remediation directly
 * 2. One active remediation per objective
 * 3. Interval logic deterministic (persisted timestamps)
 * 4. Evaluation bounded (no tight loops)
 *
 * Design:
 * - next_due_at = last_evaluated_at + evaluation_interval
 * - Scheduler queries: "is objective due now?"
 * - Skip if disabled/archived/suspended/remediating
 */
const { getStateGraph } = require('../state/state-graph');
/**
 * Parse evaluation interval string to milliseconds
 * @param {string} interval - Format: "5m", "1h", "30s"
 * @returns {number} Milliseconds
 */
function parseInterval(interval) {
    if (!interval || typeof interval !== 'string') {
        throw new Error('Invalid interval format');
    }
    const match = interval.match(/^(\d+)([smh])$/);
    if (!match) {
        throw new Error(`Invalid interval format: ${interval}`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000
    };
    return value * multipliers[unit];
}
/**
 * Check if objective is due for evaluation
 * @param {Object} objective - Objective from State Graph
 * @param {number} currentTime - Current timestamp (ms)
 * @returns {boolean}
 */
function isObjectiveDue(objective, currentTime = Date.now()) {
    // Support both evaluation_interval (string) and evaluation_interval_seconds (number)
    let intervalMs;
    if (objective.evaluation_interval) {
        intervalMs = parseInterval(objective.evaluation_interval);
    }
    else if (objective.evaluation_interval_seconds) {
        intervalMs = objective.evaluation_interval_seconds * 1000;
    }
    else {
        return false; // Not scheduled
    }
    // If never evaluated, due immediately
    if (!objective.last_evaluated_at) {
        return true;
    }
    // Calculate next due time
    const lastEvaluatedMs = new Date(objective.last_evaluated_at).getTime();
    const nextDueAt = lastEvaluatedMs + intervalMs;
    return currentTime >= nextDueAt;
}
/**
 * Check if objective should be skipped for evaluation
 * @param {Object} objective - Objective from State Graph
 * @returns {{skip: boolean, reason: string|null}}
 */
function shouldSkipObjective(objective) {
    // Skip if disabled (no 'disabled' status, but check for completeness)
    if (objective.status === 'disabled') {
        return { skip: true, reason: 'disabled' };
    }
    // Skip if archived
    if (objective.status === 'archived') {
        return { skip: true, reason: 'archived' };
    }
    // Skip if suspended
    if (objective.status === 'suspended') {
        return { skip: true, reason: 'suspended' };
    }
    // Skip if already remediating (prevents duplicate triggers)
    const remediatingStates = [
        'remediation_triggered',
        'remediation_running',
        'verification'
    ];
    if (remediatingStates.includes(objective.status)) {
        return { skip: true, reason: 'active_remediation' };
    }
    return { skip: false, reason: null };
}
/**
 * Get objectives due for evaluation
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Objectives due for evaluation
 */
async function getObjectivesDue(options = {}) {
    const stateGraph = getStateGraph();
    await stateGraph.initialize();
    const currentTime = options.currentTime || Date.now();
    // Get all managed objectives
    const allObjectives = stateGraph.listObjectives();
    const dueObjectives = [];
    for (const objective of allObjectives) {
        // Check skip conditions
        const { skip, reason } = shouldSkipObjective(objective);
        if (skip) {
            continue;
        }
        // Check if due
        if (isObjectiveDue(objective, currentTime)) {
            dueObjectives.push({
                ...objective,
                next_due_at: null // Will be calculated after evaluation
            });
        }
    }
    return dueObjectives;
}
/**
 * Calculate next due time for objective
 * @param {Object} objective - Objective
 * @param {number} currentTime - Current timestamp (ms)
 * @returns {string|null} ISO timestamp or null
 */
function calculateNextDueTime(objective, currentTime = Date.now()) {
    let intervalMs;
    if (objective.evaluation_interval) {
        intervalMs = parseInterval(objective.evaluation_interval);
    }
    else if (objective.evaluation_interval_seconds) {
        intervalMs = objective.evaluation_interval_seconds * 1000;
    }
    else {
        return null;
    }
    const lastEvaluatedMs = objective.last_evaluated_at
        ? new Date(objective.last_evaluated_at).getTime()
        : currentTime;
    const nextDueAt = lastEvaluatedMs + intervalMs;
    return new Date(nextDueAt).toISOString();
}
module.exports = {
    parseInterval,
    isObjectiveDue,
    shouldSkipObjective,
    getObjectivesDue,
    calculateNextDueTime
};
//# sourceMappingURL=objective-scheduler.js.map