/**
 * Phase 16.3 — Governance Re-entry Handler
 *
 * Executes full governance pipeline for resumed queue items.
 *
 * NOTE: This is a mock implementation for Phase 16.3 validation.
 * Full integration requires actual governance components from Phase 8/17.
 */
export async function executeGovernanceReentry(request) {
    try {
        // Mock governance checks for Phase 16.3 validation
        // Real implementation will integrate with:
        // - ReconciliationGate
        // - PolicyEvaluator  
        // - ApprovalManager
        // - WarrantIssuer
        // Step 1: Reconciliation check (mock: always pass for T0/T1, check for T2)
        if (request.risk_tier === 'T2') {
            // Stricter check for T2
            if (!request.approved_by) {
                return {
                    allowed: false,
                    disposition: "CANCEL",
                    state: "CANCELLED",
                    transition_reason: "T2 requires approval",
                };
            }
        }
        // Step 2: Policy evaluation (mock: deny if resource_keys empty)
        if (!request.resource_keys || request.resource_keys.length === 0) {
            return {
                allowed: false,
                disposition: "CANCEL",
                state: "CANCELLED",
                transition_reason: "No resource keys specified",
            };
        }
        // Step 3: Approval revalidation (mock: check if approval_id present for T1/T2)
        if ((request.risk_tier === 'T1' || request.risk_tier === 'T2') && !request.approval_id) {
            return {
                allowed: false,
                disposition: "REQUEUE",
                state: "BLOCKED_APPROVAL",
                blocked_reason: "APPROVAL_PENDING",
                resume_condition: {
                    type: "approval_granted",
                    approval_id: `mock_approval_${request.queue_item_id}`,
                },
                transition_reason: "Approval required for T1/T2",
            };
        }
        // Step 4: Warrant (mock: generate warrant_id if not present)
        const warrantId = request.warrant_id || `warrant_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        // Success - ready for execution
        const executionId = request.execution_id || `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        return {
            allowed: true,
            warrant_id: warrantId,
            approval_id: request.approval_id,
            execution_id: executionId,
            policy_snapshot_id: `policy_mock_${Date.now()}`,
        };
    }
    catch (error) {
        return {
            allowed: false,
            disposition: "REQUEUE",
            state: "RETRY_SCHEDULED",
            blocked_reason: "TRANSIENT_EXECUTION_ERROR",
            resume_condition: {
                type: "time_retry",
                not_before: new Date(Date.now() + 30000).toISOString(),
            },
            transition_reason: `Governance re-entry error: ${error.message}`,
        };
    }
}
//# sourceMappingURL=governance-reentry.js.map