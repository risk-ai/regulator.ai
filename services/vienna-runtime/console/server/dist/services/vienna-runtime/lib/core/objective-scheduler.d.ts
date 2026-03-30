/**
 * Parse evaluation interval string to milliseconds
 * @param {string} interval - Format: "5m", "1h", "30s"
 * @returns {number} Milliseconds
 */
export function parseInterval(interval: string): number;
/**
 * Check if objective is due for evaluation
 * @param {Object} objective - Objective from State Graph
 * @param {number} currentTime - Current timestamp (ms)
 * @returns {boolean}
 */
export function isObjectiveDue(objective: any, currentTime?: number): boolean;
/**
 * Check if objective should be skipped for evaluation
 * @param {Object} objective - Objective from State Graph
 * @returns {{skip: boolean, reason: string|null}}
 */
export function shouldSkipObjective(objective: any): {
    skip: boolean;
    reason: string | null;
};
/**
 * Get objectives due for evaluation
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Objectives due for evaluation
 */
export function getObjectivesDue(options?: any): Promise<any[]>;
/**
 * Calculate next due time for objective
 * @param {Object} objective - Objective
 * @param {number} currentTime - Current timestamp (ms)
 * @returns {string|null} ISO timestamp or null
 */
export function calculateNextDueTime(objective: any, currentTime?: number): string | null;
//# sourceMappingURL=objective-scheduler.d.ts.map