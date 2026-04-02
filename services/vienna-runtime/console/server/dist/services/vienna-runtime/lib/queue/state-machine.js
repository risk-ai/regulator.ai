/**
 * Phase 16.3 — Queue State Machine
 *
 * Canonical transition rules for queue item lifecycle.
 */
export const ALLOWED_QUEUE_TRANSITIONS = {
    READY: [
        "RUNNING",
        "BLOCKED_LOCK",
        "BLOCKED_APPROVAL",
        "BLOCKED_DEPENDENCY",
        "RETRY_SCHEDULED",
        "CANCELLED",
    ],
    BLOCKED_LOCK: ["READY", "RETRY_SCHEDULED", "CANCELLED"],
    BLOCKED_APPROVAL: ["READY", "CANCELLED"],
    BLOCKED_DEPENDENCY: ["READY", "RETRY_SCHEDULED", "CANCELLED"],
    RETRY_SCHEDULED: ["READY", "CANCELLED"],
    RUNNING: [
        "COMPLETED",
        "FAILED",
        "BLOCKED_LOCK",
        "BLOCKED_APPROVAL",
        "BLOCKED_DEPENDENCY",
        "RETRY_SCHEDULED",
        "CANCELLED",
    ],
    COMPLETED: [],
    FAILED: [],
    CANCELLED: [],
};
export const TERMINAL_STATES = new Set([
    "COMPLETED",
    "FAILED",
    "CANCELLED",
]);
export const RETRY_ELIGIBLE_STATES = new Set([
    "BLOCKED_LOCK",
    "BLOCKED_DEPENDENCY",
    "RETRY_SCHEDULED",
]);
export function isTerminalState(state) {
    return TERMINAL_STATES.has(state);
}
export function isRetryEligibleState(state) {
    return RETRY_ELIGIBLE_STATES.has(state);
}
export function assertValidQueueTransition(from, to) {
    const allowed = ALLOWED_QUEUE_TRANSITIONS[from];
    if (!allowed.includes(to)) {
        throw new Error(`Invalid queue transition: ${from} -> ${to}`);
    }
}
export function isTransitionAllowed(from, to) {
    const allowed = ALLOWED_QUEUE_TRANSITIONS[from];
    return allowed.includes(to);
}
export function getNextStates(state) {
    return ALLOWED_QUEUE_TRANSITIONS[state] || [];
}
//# sourceMappingURL=state-machine.js.map