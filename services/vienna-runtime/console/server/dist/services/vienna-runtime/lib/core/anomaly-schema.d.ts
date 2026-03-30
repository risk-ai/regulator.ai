export namespace AnomalyType {
    let STATE: string;
    let BEHAVIORAL: string;
    let POLICY: string;
    let TEMPORAL: string;
    let GRAPH: string;
}
export namespace AnomalySeverity {
    let LOW: string;
    let MEDIUM: string;
    let HIGH: string;
    let CRITICAL: string;
}
export namespace AnomalyStatus {
    let NEW: string;
    let REVIEWING: string;
    let ACKNOWLEDGED: string;
    let RESOLVED: string;
    let FALSE_POSITIVE: string;
}
export namespace EntityType {
    export let SERVICE: string;
    export let PROVIDER: string;
    export let OBJECTIVE: string;
    export let INTENT: string;
    export let EXECUTION: string;
    export let PLAN: string;
    let POLICY_1: string;
    export { POLICY_1 as POLICY };
    export let ENDPOINT: string;
    export let VERIFICATION: string;
    export let INVESTIGATION: string;
    export let INCIDENT: string;
}
export namespace VALID_TRANSITIONS {
    let _new: string[];
    export { _new as new };
    export let reviewing: string[];
    export let acknowledged: string[];
    export let resolved: any[];
    export let false_positive: any[];
}
/**
 * Validate status transition
 */
export function isValidTransition(currentStatus: any, newStatus: any): any;
/**
 * Validate anomaly object
 */
export function validateAnomaly(anomaly: any): boolean;
/**
 * Validate anomaly creation input
 */
export function validateAnomalyCreate(input: any): boolean;
/**
 * Validate Anomaly Update
 */
export function validateAnomalyUpdate(currentAnomaly: any, updates: any): any;
/**
 * Generate anomaly ID
 */
export function generateAnomalyId(): string;
/**
 * Create Anomaly Object
 */
export function createAnomaly(input: any): any;
/**
 * Check if anomaly is terminal
 */
export function isTerminal(anomaly: any): boolean;
/**
 * Check if anomaly is actionable
 */
export function isActionable(anomaly: any): boolean;
/**
 * Get anomaly priority score
 */
export function getPriorityScore(anomaly: any): any;
/**
 * Format anomaly summary
 */
export function formatSummary(anomaly: any): string;
//# sourceMappingURL=anomaly-schema.d.ts.map