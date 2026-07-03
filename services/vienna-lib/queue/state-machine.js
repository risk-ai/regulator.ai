"use strict";
/**
 * Phase 16.3 — Queue State Machine
 *
 * Canonical transition rules for queue item lifecycle.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETRY_ELIGIBLE_STATES = exports.TERMINAL_STATES = exports.ALLOWED_QUEUE_TRANSITIONS = void 0;
exports.isTerminalState = isTerminalState;
exports.isRetryEligibleState = isRetryEligibleState;
exports.assertValidQueueTransition = assertValidQueueTransition;
exports.isTransitionAllowed = isTransitionAllowed;
exports.getNextStates = getNextStates;
exports.ALLOWED_QUEUE_TRANSITIONS = {
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
exports.TERMINAL_STATES = new Set([
    "COMPLETED",
    "FAILED",
    "CANCELLED",
]);
exports.RETRY_ELIGIBLE_STATES = new Set([
    "BLOCKED_LOCK",
    "BLOCKED_DEPENDENCY",
    "RETRY_SCHEDULED",
]);
function isTerminalState(state) {
    return exports.TERMINAL_STATES.has(state);
}
function isRetryEligibleState(state) {
    return exports.RETRY_ELIGIBLE_STATES.has(state);
}
function assertValidQueueTransition(from, to) {
    const allowed = exports.ALLOWED_QUEUE_TRANSITIONS[from];
    if (!allowed.includes(to)) {
        throw new Error(`Invalid queue transition: ${from} -> ${to}`);
    }
}
function isTransitionAllowed(from, to) {
    const allowed = exports.ALLOWED_QUEUE_TRANSITIONS[from];
    return allowed.includes(to);
}
function getNextStates(state) {
    return exports.ALLOWED_QUEUE_TRANSITIONS[state] || [];
}
