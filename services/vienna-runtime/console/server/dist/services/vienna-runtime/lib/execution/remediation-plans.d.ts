/**
 * Phase 9.7.3 — Remediation Plan Templates
 *
 * Pre-defined remediation plans for autonomous recovery.
 * These are NOT dynamically generated - they are fixed workflows.
 */
/**
 * Gateway recovery plan
 *
 * Steps:
 * 1. Restart openclaw-gateway
 * 2. Sleep 3s (stability window)
 * 3. Health check
 *
 * @param {string} service - Service name (must be 'openclaw-gateway')
 * @returns {Object} Plan structure
 */
export function createGatewayRecoveryPlan(service?: string): any;
/**
 * Get remediation plan for a target
 * @param {string} targetType - 'service', 'endpoint', etc.
 * @param {string} targetId - Specific target identifier
 * @returns {Object|null} Plan structure or null if no plan available
 */
export function getRemediationPlan(targetType: string, targetId: string): any | null;
//# sourceMappingURL=remediation-plans.d.ts.map