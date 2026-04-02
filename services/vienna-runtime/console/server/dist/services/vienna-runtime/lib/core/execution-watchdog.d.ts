/**
 * Generate unique attempt ID
 */
export function generateAttemptId(): string;
/**
 * Start watchdog service
 */
export function startWatchdog(intervalMs?: number): void;
/**
 * Stop watchdog service
 */
export function stopWatchdog(): void;
/**
 * Get watchdog status
 */
export function getWatchdogStatus(): {
    running: boolean;
    interval_ms: number;
};
/**
 * Startup sweep - terminalize expired persisted attempts
 */
export function startupSweep(): Promise<void>;
/**
 * Watchdog tick - scan and enforce deadlines
 */
export function watchdogTick(): Promise<void>;
/**
 * Handle expired execution lease
 */
export function handleExpiredLease(objective: any, now: any): Promise<void>;
/**
 * Apply failed attempt accounting
 *
 * Increments failure counters and determines transition.
 */
export function applyFailedAttemptAccounting(objectiveId: any, generation: any, failureReason: any): Promise<void>;
/**
 * Clear active attempt fields
 */
export function clearActiveAttemptFields(objectiveId: any): Promise<void>;
//# sourceMappingURL=execution-watchdog.d.ts.map