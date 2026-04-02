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
function createGatewayRecoveryPlan(service = 'openclaw-gateway') {
    if (service !== 'openclaw-gateway') {
        throw new Error(`Gateway recovery plan only supports openclaw-gateway, got: ${service}`);
    }
    return {
        objective: `Recover ${service} from unhealthy state`,
        steps: [
            {
                step_id: 'restart',
                action: {
                    type: 'system_service_restart',
                    target: service,
                    timeoutMs: 30000
                },
                description: `Restart ${service} via systemctl`
            },
            {
                step_id: 'stability_wait',
                action: {
                    type: 'sleep',
                    durationMs: 3000
                },
                description: 'Wait 3s for service stabilization'
            },
            {
                step_id: 'health_check',
                action: {
                    type: 'health_check',
                    target: service,
                    timeoutMs: 10000
                },
                description: `Verify ${service} is healthy`
            }
        ],
        preconditions: [
            `service_exists:${service}`,
            `service_unhealthy:${service}`
        ],
        postconditions: [
            `service_active:${service}`,
            `service_healthy:${service}`
        ],
        risk_tier: 'T1', // Service restart requires T1
        estimated_duration_ms: 45000,
        verification_spec: {
            checks: [
                {
                    check_id: 'service_active',
                    type: 'systemd_active',
                    target: service,
                    expected_value: 'active'
                }
            ],
            min_checks_required: 1,
            verification_strength: 'strong'
        },
        metadata: {
            plan_type: 'remediation',
            target_type: 'service',
            target_id: service,
            created_by: 'remediation-trigger'
        }
    };
}
/**
 * Get remediation plan for a target
 * @param {string} targetType - 'service', 'endpoint', etc.
 * @param {string} targetId - Specific target identifier
 * @returns {Object|null} Plan structure or null if no plan available
 */
function getRemediationPlan(targetType, targetId) {
    if (targetType === 'service' && targetId === 'openclaw-gateway') {
        return createGatewayRecoveryPlan(targetId);
    }
    // No plan available for this target
    return null;
}
module.exports = {
    createGatewayRecoveryPlan,
    getRemediationPlan
};
//# sourceMappingURL=remediation-plans.js.map