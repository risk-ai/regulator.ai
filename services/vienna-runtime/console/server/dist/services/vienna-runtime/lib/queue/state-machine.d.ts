/**
 * Phase 16.3 — Queue State Machine
 *
 * Canonical transition rules for queue item lifecycle.
 */
import { QueueState, TerminalQueueState, RetryEligibleQueueState } from "./types";
export declare const ALLOWED_QUEUE_TRANSITIONS: Record<QueueState, QueueState[]>;
export declare const TERMINAL_STATES: Set<TerminalQueueState>;
export declare const RETRY_ELIGIBLE_STATES: Set<RetryEligibleQueueState>;
export declare function isTerminalState(state: QueueState): state is TerminalQueueState;
export declare function isRetryEligibleState(state: QueueState): state is RetryEligibleQueueState;
export declare function assertValidQueueTransition(from: QueueState, to: QueueState): void;
export declare function isTransitionAllowed(from: QueueState, to: QueueState): boolean;
export declare function getNextStates(state: QueueState): QueueState[];
//# sourceMappingURL=state-machine.d.ts.map