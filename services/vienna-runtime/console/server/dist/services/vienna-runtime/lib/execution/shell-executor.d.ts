/**
 * Shell Executor
 *
 * Executes system commands through governed templates.
 */
export class ShellExecutor {
    constructor(options?: {});
    warrantSystem: any;
    auditSystem: any;
    dryRun: any;
    /**
     * Get available commands
     *
     * @param {string} category - Optional category filter
     * @returns {Array<object>} Command metadata
     */
    getAvailableCommands(category?: string): Array<object>;
    /**
     * Execute a command
     *
     * @param {string} commandName - Template name
     * @param {Array} args - Command arguments
     * @param {object} context - Execution context (operator, warrant, etc.)
     * @returns {Promise<object>} Execution result
     */
    execute(commandName: string, args?: any[], context?: object): Promise<object>;
    /**
     * Propose a command for execution
     *
     * Returns structured proposal that can be approved by operator.
     *
     * @param {string} commandName - Template name
     * @param {Array} args - Command arguments
     * @param {object} context - Execution context
     * @returns {object} Command proposal
     */
    proposeCommand(commandName: string, args?: any[], context?: object): object;
}
export namespace CommandCategory {
    let READ_ONLY: string;
    let SIDE_EFFECT: string;
    let DANGEROUS: string;
}
export namespace COMMAND_TEMPLATES {
    namespace check_port {
        import category = CommandCategory.READ_ONLY;
        export { category };
        export let description: string;
        export function command(port: any): string;
        export function validate(port: any): boolean;
        export function parseResult(stdout: any): {
            listening: boolean;
            output?: undefined;
        } | {
            listening: boolean;
            output: any;
        };
    }
    namespace check_process {
        import category_1 = CommandCategory.READ_ONLY;
        export { category_1 as category };
        let description_1: string;
        export { description_1 as description };
        export function command_1(processName: any): string;
        export { command_1 as command };
        export function validate_1(processName: any): boolean;
        export { validate_1 as validate };
        export function parseResult_1(stdout: any): {
            running: boolean;
            pids?: undefined;
        } | {
            running: boolean;
            pids: any;
        };
        export { parseResult_1 as parseResult };
    }
    namespace show_service_status {
        import category_2 = CommandCategory.READ_ONLY;
        export { category_2 as category };
        let description_2: string;
        export { description_2 as description };
        export function command_2(serviceName: any): string;
        export { command_2 as command };
        export function validate_2(serviceName: any): boolean;
        export { validate_2 as validate };
        export function parseResult_2(stdout: any): {
            found: boolean;
            active?: undefined;
            inactive?: undefined;
            failed?: undefined;
            output?: undefined;
        } | {
            found: boolean;
            active: any;
            inactive: any;
            failed: any;
            output: any;
        };
        export { parseResult_2 as parseResult };
    }
    namespace read_log_tail {
        import category_3 = CommandCategory.READ_ONLY;
        export { category_3 as category };
        let description_3: string;
        export { description_3 as description };
        export function command_3(logPath: any, lines?: number): string;
        export { command_3 as command };
        export function validate_3(logPath: any, lines?: number): boolean;
        export { validate_3 as validate };
        export function parseResult_3(stdout: any): {
            lines: any;
        };
        export { parseResult_3 as parseResult };
    }
    namespace restart_service {
        import category_4 = CommandCategory.SIDE_EFFECT;
        export { category_4 as category };
        let description_4: string;
        export { description_4 as description };
        export function command_4(serviceName: any): string;
        export { command_4 as command };
        export function validate_4(serviceName: any): boolean;
        export { validate_4 as validate };
        export function parseResult_4(stdout: any, stderr: any): {
            success: boolean;
            output: any;
        };
        export { parseResult_4 as parseResult };
        export let requiresWarrant: boolean;
        export let riskTier: string;
    }
    namespace stop_service {
        import category_5 = CommandCategory.SIDE_EFFECT;
        export { category_5 as category };
        let description_5: string;
        export { description_5 as description };
        export function command_5(serviceName: any): string;
        export { command_5 as command };
        export function validate_5(serviceName: any): boolean;
        export { validate_5 as validate };
        export function parseResult_5(stdout: any, stderr: any): {
            success: boolean;
            output: any;
        };
        export { parseResult_5 as parseResult };
        let requiresWarrant_1: boolean;
        export { requiresWarrant_1 as requiresWarrant };
        let riskTier_1: string;
        export { riskTier_1 as riskTier };
    }
    namespace start_service {
        import category_6 = CommandCategory.SIDE_EFFECT;
        export { category_6 as category };
        let description_6: string;
        export { description_6 as description };
        export function command_6(serviceName: any): string;
        export { command_6 as command };
        export function validate_6(serviceName: any): boolean;
        export { validate_6 as validate };
        export function parseResult_6(stdout: any, stderr: any): {
            success: boolean;
            output: any;
        };
        export { parseResult_6 as parseResult };
        let requiresWarrant_2: boolean;
        export { requiresWarrant_2 as requiresWarrant };
        let riskTier_2: string;
        export { riskTier_2 as riskTier };
    }
    namespace kill_process {
        import category_7 = CommandCategory.DANGEROUS;
        export { category_7 as category };
        let description_7: string;
        export { description_7 as description };
        export function command_7(pid: any, signal?: string): string;
        export { command_7 as command };
        export function validate_7(pid: any, signal?: string): boolean;
        export { validate_7 as validate };
        export function parseResult_7(stdout: any, stderr: any): {
            success: boolean;
            output: any;
        };
        export { parseResult_7 as parseResult };
        let requiresWarrant_3: boolean;
        export { requiresWarrant_3 as requiresWarrant };
        let riskTier_3: string;
        export { riskTier_3 as riskTier };
    }
}
//# sourceMappingURL=shell-executor.d.ts.map