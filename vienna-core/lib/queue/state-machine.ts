/**
 * Phase 16.3 — Queue State Machine
 * 
 * Canonical transition rules for queue item lifecycle.
 */

import { QueueState, TerminalQueueState, RetryEligibleQueueState } from "./types";

export const ALLOWED_QUEUE_TRANSITIONS: Record<QueueState, QueueState[]> = {
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

export const TERMINAL_STATES: Set<TerminalQueueState> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const RETRY_ELIGIBLE_STATES: Set<RetryEligibleQueueState> = new Set([
  "BLOCKED_LOCK",
  "BLOCKED_DEPENDENCY",
  "RETRY_SCHEDULED",
]);

export function isTerminalState(state: QueueState): state is TerminalQueueState {
  return TERMINAL_STATES.has(state as TerminalQueueState);
}

export function isRetryEligibleState(state: QueueState): state is RetryEligibleQueueState {
  return RETRY_ELIGIBLE_STATES.has(state as RetryEligibleQueueState);
}

export function assertValidQueueTransition(from: QueueState, to: QueueState): void {
  const allowed = ALLOWED_QUEUE_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid queue transition: ${from} -> ${to}`);
  }
}

export function isTransitionAllowed(from: QueueState, to: QueueState): boolean {
  const allowed = ALLOWED_QUEUE_TRANSITIONS[from];
  return allowed.includes(to);
}

export function getNextStates(state: QueueState): QueueState[] {
  return ALLOWED_QUEUE_TRANSITIONS[state] || [];
}
