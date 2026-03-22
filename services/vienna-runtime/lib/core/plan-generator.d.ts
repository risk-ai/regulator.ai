/**
 * Generate plan from IntentObject
 *
 * @param {Object} intentObject - Parsed intent from classifier
 * @returns {Object} Plan object
 */
export function generatePlan(intentObject: any): any;
export namespace ACTION_TEMPLATES {
    namespace show_status {
        let executor: string;
        let risk_tier: string;
        let timeout_ms: number;
        let verification: string[];
    }
    namespace show_services {
        let executor_1: string;
        export { executor_1 as executor };
        let risk_tier_1: string;
        export { risk_tier_1 as risk_tier };
        let timeout_ms_1: number;
        export { timeout_ms_1 as timeout_ms };
        let verification_1: string[];
        export { verification_1 as verification };
    }
    namespace show_providers {
        let executor_2: string;
        export { executor_2 as executor };
        let risk_tier_2: string;
        export { risk_tier_2 as risk_tier };
        let timeout_ms_2: number;
        export { timeout_ms_2 as timeout_ms };
        let verification_2: string[];
        export { verification_2 as verification };
    }
    namespace show_incidents {
        let executor_3: string;
        export { executor_3 as executor };
        let risk_tier_3: string;
        export { risk_tier_3 as risk_tier };
        let timeout_ms_3: number;
        export { timeout_ms_3 as timeout_ms };
        let verification_3: string[];
        export { verification_3 as verification };
    }
    namespace show_objectives {
        let executor_4: string;
        export { executor_4 as executor };
        let risk_tier_4: string;
        export { risk_tier_4 as risk_tier };
        let timeout_ms_4: number;
        export { timeout_ms_4 as timeout_ms };
        let verification_4: string[];
        export { verification_4 as verification };
    }
    namespace show_endpoints {
        let executor_5: string;
        export { executor_5 as executor };
        let risk_tier_5: string;
        export { risk_tier_5 as risk_tier };
        let timeout_ms_5: number;
        export { timeout_ms_5 as timeout_ms };
        let verification_5: string[];
        export { verification_5 as verification };
    }
    namespace query_openclaw_agent {
        let executor_6: string;
        export { executor_6 as executor };
        let risk_tier_6: string;
        export { risk_tier_6 as risk_tier };
        let timeout_ms_6: number;
        export { timeout_ms_6 as timeout_ms };
        let verification_6: string[];
        export { verification_6 as verification };
    }
    namespace query_status {
        let executor_7: string;
        export { executor_7 as executor };
        let risk_tier_7: string;
        export { risk_tier_7 as risk_tier };
        let timeout_ms_7: number;
        export { timeout_ms_7 as timeout_ms };
        let verification_7: string[];
        export { verification_7 as verification };
    }
    namespace inspect_gateway {
        let executor_8: string;
        export { executor_8 as executor };
        let risk_tier_8: string;
        export { risk_tier_8 as risk_tier };
        let timeout_ms_8: number;
        export { timeout_ms_8 as timeout_ms };
        let verification_8: string[];
        export { verification_8 as verification };
    }
    namespace check_health {
        let executor_9: string;
        export { executor_9 as executor };
        let risk_tier_9: string;
        export { risk_tier_9 as risk_tier };
        let timeout_ms_9: number;
        export { timeout_ms_9 as timeout_ms };
        let verification_9: string[];
        export { verification_9 as verification };
    }
    namespace collect_logs {
        let executor_10: string;
        export { executor_10 as executor };
        let risk_tier_10: string;
        export { risk_tier_10 as risk_tier };
        let timeout_ms_10: number;
        export { timeout_ms_10 as timeout_ms };
        let verification_10: string[];
        export { verification_10 as verification };
    }
    namespace restart_service {
        let executor_11: string;
        export { executor_11 as executor };
        let risk_tier_11: string;
        export { risk_tier_11 as risk_tier };
        let timeout_ms_11: number;
        export { timeout_ms_11 as timeout_ms };
        let verification_11: string[];
        export { verification_11 as verification };
        export let preconditions: string[];
        export let postconditions: string[];
    }
    namespace run_recovery_workflow {
        let executor_12: string;
        export { executor_12 as executor };
        let risk_tier_12: string;
        export { risk_tier_12 as risk_tier };
        let timeout_ms_12: number;
        export { timeout_ms_12 as timeout_ms };
        let verification_12: string[];
        export { verification_12 as verification };
        let preconditions_1: string[];
        export { preconditions_1 as preconditions };
        let postconditions_1: string[];
        export { postconditions_1 as postconditions };
    }
    namespace run_workflow {
        let executor_13: string;
        export { executor_13 as executor };
        let risk_tier_13: string;
        export { risk_tier_13 as risk_tier };
        let timeout_ms_13: number;
        export { timeout_ms_13 as timeout_ms };
        let verification_13: string[];
        export { verification_13 as verification };
        let preconditions_2: string[];
        export { preconditions_2 as preconditions };
    }
    namespace recovery_action {
        let executor_14: string;
        export { executor_14 as executor };
        let risk_tier_14: string;
        export { risk_tier_14 as risk_tier };
        let timeout_ms_14: number;
        export { timeout_ms_14 as timeout_ms };
        let verification_14: string[];
        export { verification_14 as verification };
        let preconditions_3: string[];
        export { preconditions_3 as preconditions };
    }
}
//# sourceMappingURL=plan-generator.d.ts.map