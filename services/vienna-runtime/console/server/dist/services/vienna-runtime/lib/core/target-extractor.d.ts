/**
 * Target Extractor
 *
 * Deterministic mapping from plan step → target IDs for lock acquisition.
 *
 * Core principle:
 * If two steps could conflict, they must resolve to the same target ID.
 *
 * Target ID format:
 * - service: "target:service:<service_id>"
 * - endpoint: "target:endpoint:<endpoint_id>"
 * - provider: "target:provider:<provider_id>"
 * - resource: "target:resource:<resource_id>"
 * - objective: "target:objective:<objective_id>"
 */
/**
 * Extract targets from a plan step
 *
 * @param {Object} step - Plan step
 * @returns {Array<Object>} - [{ target_type, target_id }]
 */
export function extractTargets(step: any): Array<any>;
/**
 * Extract all targets from plan (all steps)
 *
 * @param {Object} plan
 * @returns {Array<Object>}
 */
export function extractPlanTargets(plan: any): Array<any>;
/**
 * Build canonical target ID
 *
 * @param {string} targetType
 * @param {string} rawId
 * @returns {string}
 */
export function buildTargetId(targetType: string, rawId: string): string;
/**
 * Parse target ID into components
 *
 * @param {string} targetId - "target:service:auth-api"
 * @returns {Object} { target_type, raw_id }
 */
export function parseTargetId(targetId: string): any;
//# sourceMappingURL=target-extractor.d.ts.map