export namespace ObjectiveSchema {
    let objective_id: string;
    let target_id: string;
    let desired_state: string;
    let remediation_plan: string;
    let evaluation_interval: string;
    let verification_strength: string;
    let status: string;
    let created_at: string;
    let updated_at: string;
    let priority: string;
    let owner: string;
    let context: string;
}
export namespace OBJECTIVE_STATUS {
    let DECLARED: string;
    let MONITORING: string;
    let HEALTHY: string;
    let VIOLATION_DETECTED: string;
    let REMEDIATION_TRIGGERED: string;
    let REMEDIATION_RUNNING: string;
    let VERIFICATION: string;
    let RESTORED: string;
    let FAILED: string;
    let BLOCKED: string;
    let SUSPENDED: string;
    let ARCHIVED: string;
}
export namespace VERIFICATION_STRENGTH {
    let SERVICE_HEALTH: string;
    let HTTP_HEALTHCHECK: string;
    let FULL_VALIDATION: string;
    let MINIMAL: string;
}
/**
 * Validate objective structure
 */
export function validateObjective(objective: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Create new objective with defaults
 */
export function createObjective(config: any): {
    objective_id: any;
    objective_type: any;
    target_type: any;
    target_id: any;
    desired_state: any;
    remediation_plan: any;
    evaluation_interval: any;
    verification_strength: any;
    status: string;
    priority: any;
    owner: any;
    context: any;
    created_at: string;
    updated_at: string;
};
/**
 * Update objective status (state transition)
 */
export function updateObjectiveStatus(objective: any, newStatus: any, metadata?: {}): any;
/**
 * Parse evaluation interval to milliseconds
 */
export function parseInterval(interval: any): number;
//# sourceMappingURL=objective-schema.d.ts.map