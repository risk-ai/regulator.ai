/**
 * Load all active policies
 *
 * @returns {Promise<Array>} Array of policy objects
 */
export function loadPolicies(): Promise<any[]>;
/**
 * Get policy by ID
 *
 * @param {string} policyId - Policy ID
 * @returns {Promise<Object|null>}
 */
export function getPolicyById(policyId: string): Promise<any | null>;
/**
 * Get policies by scope criteria
 *
 * @param {Object} criteria - Scope criteria
 * @returns {Promise<Array>}
 */
export function getPoliciesByScope(criteria: any): Promise<any[]>;
//# sourceMappingURL=index.d.ts.map