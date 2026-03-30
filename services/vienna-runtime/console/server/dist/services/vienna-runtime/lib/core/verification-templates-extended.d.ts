export namespace EXTENDED_VERIFICATION_TEMPLATES {
    namespace http_service_full {
        let verification_type: string;
        let required_strength: string;
        let timeout_ms: number;
        let stability_window_ms: number;
        namespace retry_policy {
            let max_attempts: number;
            let backoff_ms: number[];
            let retry_on: string[];
        }
        let postconditions: ({
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            failure_classification: {
                port_closed: string;
                connection_refused: string;
                dns_failure: string;
                timeout?: undefined;
                503?: undefined;
                502?: undefined;
                404?: undefined;
                500?: undefined;
                401?: undefined;
                403?: undefined;
                slow_response?: undefined;
            };
            expect?: undefined;
        } | {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            expect: {
                status_code: number[];
                timeout_ms: number;
                body_contains?: undefined;
                case_insensitive?: undefined;
                max_ms?: undefined;
            };
            failure_classification: {
                timeout: string;
                503: string;
                502: string;
                404: string;
                500: string;
                401: string;
                403: string;
                port_closed?: undefined;
                connection_refused?: undefined;
                dns_failure?: undefined;
                slow_response?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                body_contains: string[];
                case_insensitive: boolean;
                status_code?: undefined;
                timeout_ms?: undefined;
                max_ms?: undefined;
            };
            failure_classification?: undefined;
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                max_ms: number;
                status_code?: undefined;
                timeout_ms?: undefined;
                body_contains?: undefined;
                case_insensitive?: undefined;
            };
            failure_classification: {
                slow_response: string;
                port_closed?: undefined;
                connection_refused?: undefined;
                dns_failure?: undefined;
                timeout?: undefined;
                503?: undefined;
                502?: undefined;
                404?: undefined;
                500?: undefined;
                401?: undefined;
                403?: undefined;
            };
        })[];
    }
    namespace database_connection {
        let verification_type_1: string;
        export { verification_type_1 as verification_type };
        let required_strength_1: string;
        export { required_strength_1 as required_strength };
        let timeout_ms_1: number;
        export { timeout_ms_1 as timeout_ms };
        let stability_window_ms_1: number;
        export { stability_window_ms_1 as stability_window_ms };
        export namespace retry_policy_1 {
            let max_attempts_1: number;
            export { max_attempts_1 as max_attempts };
            let backoff_ms_1: number[];
            export { backoff_ms_1 as backoff_ms };
            let retry_on_1: string[];
            export { retry_on_1 as retry_on };
        }
        export { retry_policy_1 as retry_policy };
        let postconditions_1: ({
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            failure_classification: {
                port_closed: string;
                connection_refused: string;
                network_unreachable: string;
                auth_failed?: undefined;
                timeout?: undefined;
                connection_error?: undefined;
            };
            expect?: undefined;
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                query: string;
                timeout_ms: number;
                contains?: undefined;
            };
            failure_classification: {
                auth_failed: string;
                timeout: string;
                connection_error: string;
                port_closed?: undefined;
                connection_refused?: undefined;
                network_unreachable?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                query: string;
                contains: string[];
                timeout_ms?: undefined;
            };
            failure_classification?: undefined;
        })[];
        export { postconditions_1 as postconditions };
    }
    namespace systemd_service_full {
        let verification_type_2: string;
        export { verification_type_2 as verification_type };
        let required_strength_2: string;
        export { required_strength_2 as required_strength };
        let timeout_ms_2: number;
        export { timeout_ms_2 as timeout_ms };
        let stability_window_ms_2: number;
        export { stability_window_ms_2 as stability_window_ms };
        export namespace retry_policy_2 {
            let max_attempts_2: number;
            export { max_attempts_2 as max_attempts };
            let backoff_ms_2: number[];
            export { backoff_ms_2 as backoff_ms };
            let retry_on_2: string[];
            export { retry_on_2 as retry_on };
        }
        export { retry_policy_2 as retry_policy };
        let postconditions_2: ({
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            failure_classification: {
                inactive: string;
                failed: string;
                activating: string;
                disabled?: undefined;
            };
            expect?: undefined;
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            failure_classification: {
                disabled: string;
                inactive?: undefined;
                failed?: undefined;
                activating?: undefined;
            };
            expect?: undefined;
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                since: string;
                not_contains: string[];
            };
            failure_classification?: undefined;
        })[];
        export { postconditions_2 as postconditions };
    }
    namespace filesystem_operation {
        let verification_type_3: string;
        export { verification_type_3 as verification_type };
        let required_strength_3: string;
        export { required_strength_3 as required_strength };
        let timeout_ms_3: number;
        export { timeout_ms_3 as timeout_ms };
        let stability_window_ms_3: number;
        export { stability_window_ms_3 as stability_window_ms };
        export namespace retry_policy_3 {
            let max_attempts_3: number;
            export { max_attempts_3 as max_attempts };
            let backoff_ms_3: number[];
            export { backoff_ms_3 as backoff_ms };
            let retry_on_3: string[];
            export { retry_on_3 as retry_on };
        }
        export { retry_policy_3 as retry_policy };
        let postconditions_3: ({
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            failure_classification: {
                not_found: string;
                permission_denied: string;
                io_error: string;
                wrong_permissions?: undefined;
            };
            expect?: undefined;
        } | {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            expect: {
                contains: any[];
                mode?: undefined;
            };
            failure_classification?: undefined;
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                mode: string;
                contains?: undefined;
            };
            failure_classification: {
                wrong_permissions: string;
                not_found?: undefined;
                permission_denied?: undefined;
                io_error?: undefined;
            };
        })[];
        export { postconditions_3 as postconditions };
    }
    namespace network_endpoint {
        let verification_type_4: string;
        export { verification_type_4 as verification_type };
        let required_strength_4: string;
        export { required_strength_4 as required_strength };
        let timeout_ms_4: number;
        export { timeout_ms_4 as timeout_ms };
        let stability_window_ms_4: number;
        export { stability_window_ms_4 as stability_window_ms };
        export namespace retry_policy_4 {
            let max_attempts_4: number;
            export { max_attempts_4 as max_attempts };
            let backoff_ms_4: number[];
            export { backoff_ms_4 as backoff_ms };
            let retry_on_4: string[];
            export { retry_on_4 as retry_on };
        }
        export { retry_policy_4 as retry_policy };
        let postconditions_4: ({
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            failure_classification: {
                nxdomain: string;
                timeout: string;
                servfail: string;
                connection_refused?: undefined;
                network_unreachable?: undefined;
                expired?: undefined;
                self_signed?: undefined;
                hostname_mismatch?: undefined;
            };
        } | {
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            failure_classification: {
                connection_refused: string;
                timeout: string;
                network_unreachable: string;
                nxdomain?: undefined;
                servfail?: undefined;
                expired?: undefined;
                self_signed?: undefined;
                hostname_mismatch?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            failure_classification: {
                expired: string;
                self_signed: string;
                hostname_mismatch: string;
                nxdomain?: undefined;
                timeout?: undefined;
                servfail?: undefined;
                connection_refused?: undefined;
                network_unreachable?: undefined;
            };
        })[];
        export { postconditions_4 as postconditions };
    }
    namespace container_service {
        let verification_type_5: string;
        export { verification_type_5 as verification_type };
        let required_strength_5: string;
        export { required_strength_5 as required_strength };
        let timeout_ms_5: number;
        export { timeout_ms_5 as timeout_ms };
        let stability_window_ms_5: number;
        export { stability_window_ms_5 as stability_window_ms };
        export namespace retry_policy_5 {
            let max_attempts_5: number;
            export { max_attempts_5 as max_attempts };
            let backoff_ms_5: number[];
            export { backoff_ms_5 as backoff_ms };
            let retry_on_5: string[];
            export { retry_on_5 as retry_on };
        }
        export { retry_policy_5 as retry_policy };
        let postconditions_5: ({
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                state: string;
                health_status?: undefined;
                max_recent_restarts?: undefined;
                window_minutes?: undefined;
            };
            failure_classification: {
                exited: string;
                restarting: string;
                paused: string;
                dead: string;
                unhealthy?: undefined;
                starting?: undefined;
                restart_loop?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                health_status: string;
                state?: undefined;
                max_recent_restarts?: undefined;
                window_minutes?: undefined;
            };
            failure_classification: {
                unhealthy: string;
                starting: string;
                exited?: undefined;
                restarting?: undefined;
                paused?: undefined;
                dead?: undefined;
                restart_loop?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                max_recent_restarts: number;
                window_minutes: number;
                state?: undefined;
                health_status?: undefined;
            };
            failure_classification: {
                restart_loop: string;
                exited?: undefined;
                restarting?: undefined;
                paused?: undefined;
                dead?: undefined;
                unhealthy?: undefined;
                starting?: undefined;
            };
        })[];
        export { postconditions_5 as postconditions };
    }
    namespace api_endpoint {
        let verification_type_6: string;
        export { verification_type_6 as verification_type };
        let required_strength_6: string;
        export { required_strength_6 as required_strength };
        let timeout_ms_6: number;
        export { timeout_ms_6 as timeout_ms };
        let stability_window_ms_6: number;
        export { stability_window_ms_6 as stability_window_ms };
        export namespace retry_policy_6 {
            let max_attempts_6: number;
            export { max_attempts_6 as max_attempts };
            let backoff_ms_6: number[];
            export { backoff_ms_6 as backoff_ms };
            let retry_on_6: string[];
            export { retry_on_6 as retry_on };
        }
        export { retry_policy_6 as retry_policy };
        let postconditions_6: ({
            check_id: string;
            type: string;
            required: boolean;
            description: string;
            expect: {
                status_code: number[];
                timeout_ms: number;
                headers: {};
                schema?: undefined;
            };
            failure_classification: {
                timeout: string;
                503: string;
                502: string;
                401: string;
                403: string;
                404: string;
                500: string;
                schema_mismatch?: undefined;
                invalid_token?: undefined;
                expired_token?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            expect: {
                schema: {};
                status_code?: undefined;
                timeout_ms?: undefined;
                headers?: undefined;
            };
            failure_classification: {
                schema_mismatch: string;
                timeout?: undefined;
                503?: undefined;
                502?: undefined;
                401?: undefined;
                403?: undefined;
                404?: undefined;
                500?: undefined;
                invalid_token?: undefined;
                expired_token?: undefined;
            };
        } | {
            check_id: string;
            type: any;
            required: boolean;
            description: string;
            failure_classification: {
                invalid_token: string;
                expired_token: string;
                timeout?: undefined;
                503?: undefined;
                502?: undefined;
                401?: undefined;
                403?: undefined;
                404?: undefined;
                500?: undefined;
                schema_mismatch?: undefined;
            };
            expect?: undefined;
        })[];
        export { postconditions_6 as postconditions };
    }
}
export namespace FailureClass {
    let TRANSIENT: string;
    let PERMANENT: string;
    let CONFIGURATION: string;
    let DEPENDENCY: string;
}
/**
 * Failure classifier
 *
 * Determines failure classification from check result.
 */
export function classifyFailure(check: any, result: any): any;
/**
 * Should retry based on failure classification?
 */
export function shouldRetry(verificationType: any, failureClass: any, attemptNumber: any): any;
/**
 * Get backoff delay for retry attempt
 */
export function getBackoffDelay(verificationType: any, attemptNumber: any): any;
/**
 * Get retry policy for verification type
 */
export function getRetryPolicy(verificationType: any): any;
//# sourceMappingURL=verification-templates-extended.d.ts.map