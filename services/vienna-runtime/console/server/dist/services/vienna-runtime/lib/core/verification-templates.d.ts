export namespace VERIFICATION_TEMPLATES {
    namespace service_recovery {
        let verification_type: string;
        let required_strength: string;
        let timeout_ms: number;
        let stability_window_ms: number;
        let postconditions: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
    }
    namespace service_restart {
        let verification_type_1: string;
        export { verification_type_1 as verification_type };
        let required_strength_1: string;
        export { required_strength_1 as required_strength };
        let timeout_ms_1: number;
        export { timeout_ms_1 as timeout_ms };
        let stability_window_ms_1: number;
        export { stability_window_ms_1 as stability_window_ms };
        let postconditions_1: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        export { postconditions_1 as postconditions };
    }
    namespace http_service_health {
        let verification_type_2: string;
        export { verification_type_2 as verification_type };
        let required_strength_2: string;
        export { required_strength_2 as required_strength };
        let timeout_ms_2: number;
        export { timeout_ms_2 as timeout_ms };
        let stability_window_ms_2: number;
        export { stability_window_ms_2 as stability_window_ms };
        let postconditions_2: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        export { postconditions_2 as postconditions };
    }
    namespace state_graph_update {
        let verification_type_3: string;
        export { verification_type_3 as verification_type };
        let required_strength_3: string;
        export { required_strength_3 as required_strength };
        let timeout_ms_3: number;
        export { timeout_ms_3 as timeout_ms };
        let stability_window_ms_3: number;
        export { stability_window_ms_3 as stability_window_ms };
        let postconditions_3: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        export { postconditions_3 as postconditions };
    }
    namespace endpoint_connectivity {
        let verification_type_4: string;
        export { verification_type_4 as verification_type };
        let required_strength_4: string;
        export { required_strength_4 as required_strength };
        let timeout_ms_4: number;
        export { timeout_ms_4 as timeout_ms };
        let stability_window_ms_4: number;
        export { stability_window_ms_4 as stability_window_ms };
        let postconditions_4: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        export { postconditions_4 as postconditions };
    }
    namespace query_agent_response {
        let verification_type_5: string;
        export { verification_type_5 as verification_type };
        let required_strength_5: string;
        export { required_strength_5 as required_strength };
        let timeout_ms_5: number;
        export { timeout_ms_5 as timeout_ms };
        let stability_window_ms_5: number;
        export { stability_window_ms_5 as stability_window_ms };
        let postconditions_5: any[];
        export { postconditions_5 as postconditions };
    }
    namespace file_operation {
        let verification_type_6: string;
        export { verification_type_6 as verification_type };
        let required_strength_6: string;
        export { required_strength_6 as required_strength };
        let timeout_ms_6: number;
        export { timeout_ms_6 as timeout_ms };
        let stability_window_ms_6: number;
        export { stability_window_ms_6 as stability_window_ms };
        let postconditions_6: {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
        }[];
        export { postconditions_6 as postconditions };
    }
}
/**
 * Build verification spec from template
 *
 * @param {string} templateName - Template identifier
 * @param {Object} context - Context for template expansion (service, port, url, etc.)
 * @returns {Object} Verification spec ready for VerificationTask
 */
export function buildVerificationSpec(templateName: string, context?: any): any;
/**
 * Get recommended verification template for action
 *
 * @param {string} action - Action identifier
 * @returns {string|null} Template name
 */
export function getRecommendedTemplate(action: string): string | null;
//# sourceMappingURL=verification-templates.d.ts.map