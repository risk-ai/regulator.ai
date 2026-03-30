/**
 * Approval requirement result
 */
export type ApprovalRequirement = {
    /**
     * - Whether approval is required
     */
    required: boolean;
    /**
     * - Approval tier (T0|T1|T2|null)
     */
    tier: string | null;
    /**
     * - Why approval is/isn't required
     */
    reason: string;
    /**
     * - TTL in seconds (null = use default)
     */
    ttl: number | null;
    /**
     * - Whether requirement was fail-closed due to ambiguity
     */
    fail_closed: boolean;
};
/**
 * Approval requirement result
 *
 * @typedef {Object} ApprovalRequirement
 * @property {boolean} required - Whether approval is required
 * @property {string|null} tier - Approval tier (T0|T1|T2|null)
 * @property {string} reason - Why approval is/isn't required
 * @property {number|null} ttl - TTL in seconds (null = use default)
 * @property {boolean} fail_closed - Whether requirement was fail-closed due to ambiguity
 */
/**
 * Determine approval requirement from policy decision
 *
 * Maps policy decision → normalized approval requirement.
 *
 * Decision logic:
 * - T0 risk tier → no approval
 * - T1 risk tier → approval required (tier=T1)
 * - T2 risk tier → approval required (tier=T2)
 * - policy decision = REQUIRE_APPROVAL → approval required
 * - policy requirements.approval_required = true → approval required
 * - ambiguous tier with approval required → FAIL CLOSED
 * - missing approval metadata when approval required → FAIL CLOSED
 *
 * @param {Object} policyDecision - Policy decision object
 * @param {Object} stepContext - Step context (risk_tier, action, target_id)
 * @returns {ApprovalRequirement}
 */
export function determineApprovalRequirement(policyDecision: any, stepContext?: any): ApprovalRequirement;
/**
 * Validate approval requirement result
 *
 * @param {ApprovalRequirement} requirement - Requirement to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateApprovalRequirement(requirement: ApprovalRequirement): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=approval-requirement-normalizer.d.ts.map