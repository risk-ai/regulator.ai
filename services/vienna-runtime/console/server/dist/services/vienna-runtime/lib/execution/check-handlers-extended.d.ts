/**
 * Database Query Check
 *
 * Executes SQL query against SQLite database.
 */
export function checkDatabaseQuery(parameters: any, context?: {}): Promise<{
    success: boolean;
    error: string;
    output: string;
    check_type: string;
} | {
    success: boolean;
    output: string;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    output?: undefined;
}>;
/**
 * Systemd Enabled Check
 *
 * Checks if service is enabled for auto-start.
 */
export function checkSystemdEnabled(parameters: any, context?: {}): Promise<{
    success: boolean;
    error: string;
    check_type: string;
    enabled?: undefined;
    status?: undefined;
} | {
    success: boolean;
    enabled: boolean;
    status: string;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    status: string;
    check_type: string;
    enabled?: undefined;
}>;
/**
 * Systemd Log Check
 *
 * Searches recent logs for error patterns.
 */
export function checkSystemdLog(parameters: any, context?: {}): Promise<{
    success: boolean;
    error: string;
    found_patterns: any;
    check_type: string;
} | {
    success: boolean;
    check_type: string;
    error?: undefined;
    found_patterns?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    found_patterns?: undefined;
}>;
/**
 * DNS Resolution Check
 *
 * Resolves hostname to IP address.
 */
export function checkDnsResolution(parameters: any, context?: {}): Promise<{
    success: boolean;
    error: string;
    check_type: string;
    addresses?: undefined;
    error_type?: undefined;
} | {
    success: boolean;
    addresses: string[];
    check_type: string;
    error?: undefined;
    error_type?: undefined;
} | {
    success: boolean;
    error: any;
    error_type: string;
    check_type: string;
    addresses?: undefined;
}>;
/**
 * TLS Certificate Valid Check
 *
 * Validates TLS certificate for hostname.
 */
export function checkTlsCertificate(parameters: any, context?: {}): Promise<any>;
/**
 * Container State Check
 *
 * Checks Docker/Podman container state.
 */
export function checkContainerState(parameters: any, context?: {}): Promise<{
    success: boolean;
    state: string;
    expected: any;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    state?: undefined;
    expected?: undefined;
}>;
/**
 * Container Health Check
 *
 * Checks Docker/Podman container health status.
 */
export function checkContainerHealth(parameters: any, context?: {}): Promise<{
    success: boolean;
    health_status: string;
    expected: any;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    health_status?: undefined;
    expected?: undefined;
}>;
/**
 * Container Restart Count Check
 *
 * Checks for excessive container restarts (restart loop detection).
 */
export function checkContainerRestartCount(parameters: any, context?: {}): Promise<{
    success: boolean;
    error: string;
    restart_count: number;
    age_minutes: number;
    check_type: string;
} | {
    success: boolean;
    restart_count: number;
    age_minutes: number;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    restart_count?: undefined;
    age_minutes?: undefined;
}>;
/**
 * HTTP Body Contains Check
 *
 * Checks if HTTP response body contains expected strings.
 */
export function checkHttpBodyContains(parameters: any, context?: {}): Promise<any>;
/**
 * HTTP Response Time Check
 *
 * Validates response time is under threshold.
 */
export function checkHttpResponseTime(parameters: any, context?: {}): Promise<any>;
/**
 * HTTP Auth Valid Check
 *
 * Validates HTTP authentication.
 */
export function checkHttpAuthValid(parameters: any, context?: {}): Promise<any>;
/**
 * JSON Schema Valid Check
 *
 * Validates JSON response against schema (simple implementation).
 */
export function checkJsonSchemaValid(parameters: any, context?: {}): Promise<any>;
/**
 * File Permissions Check
 *
 * Validates file permissions match expected mode.
 */
export function checkFilePermissions(parameters: any, context?: {}): Promise<{
    success: boolean;
    actual_mode: string;
    expected_mode: any;
    check_type: string;
    error?: undefined;
} | {
    success: boolean;
    error: any;
    check_type: string;
    actual_mode?: undefined;
    expected_mode?: undefined;
}>;
//# sourceMappingURL=check-handlers-extended.d.ts.map