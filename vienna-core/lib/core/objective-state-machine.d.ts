/**
 * Valid state transitions (from → to)
 *
 * Format: { from_state: [allowed_next_states] }
 */
export const TRANSITIONS: {
    [OBJECTIVE_STATUS.DECLARED]: string[];
    [OBJECTIVE_STATUS.MONITORING]: string[];
    [OBJECTIVE_STATUS.HEALTHY]: string[];
    [OBJECTIVE_STATUS.VIOLATION_DETECTED]: string[];
    [OBJECTIVE_STATUS.REMEDIATION_TRIGGERED]: string[];
    [OBJECTIVE_STATUS.REMEDIATION_RUNNING]: string[];
    [OBJECTIVE_STATUS.VERIFICATION]: string[];
    [OBJECTIVE_STATUS.RESTORED]: string[];
    [OBJECTIVE_STATUS.FAILED]: string[];
    [OBJECTIVE_STATUS.BLOCKED]: string[];
    [OBJECTIVE_STATUS.SUSPENDED]: string[];
    [OBJECTIVE_STATUS.ARCHIVED]: undefined[];
};
export namespace TRANSITION_REASON {
    let EVALUATION_STARTED: string;
    let SYSTEM_HEALTHY: string;
    let SYSTEM_UNHEALTHY: string;
    let POLICY_APPROVED: string;
    let POLICY_DENIED: string;
    let EXECUTION_STARTED: string;
    let EXECUTION_COMPLETED: string;
    let EXECUTION_FAILED: string;
    let VERIFICATION_PASSED: string;
    let VERIFICATION_FAILED: string;
    let MANUAL_SUSPENSION: string;
    let MANUAL_RESUME: string;
    let MANUAL_ARCHIVE: string;
    let MAX_RETRIES_EXCEEDED: string;
    let RESOURCE_UNAVAILABLE: string;
}
/**
 * Check if transition is valid
 */
export function isValidTransition(fromState: any, toState: any): boolean;
/**
 * Get allowed next states
 */
export function getAllowedTransitions(currentState: any): string[];
/**
 * Execute state transition with validation
 */
export function transitionState(objective: any, newState: any, reason: any, metadata?: {}): any;
/**
 * Check if state is terminal (no outbound transitions)
 */
export function isTerminalState(state: any): boolean;
/**
 * Check if state indicates active remediation
 */
export function isRemediating(state: any): boolean;
/**
 * Check if state indicates failure
 */
export function isFailed(state: any): boolean;
/**
 * Check if state is stable (healthy or monitoring)
 */
export function isStable(state: any): boolean;
/**
 * Get state category
 */
export function getStateCategory(state: any): "failed" | "archived" | "suspended" | "stable" | "remediating" | "transitional";
import { OBJECTIVE_STATUS } from "./objective-schema";
//# sourceMappingURL=objective-state-machine.d.ts.map