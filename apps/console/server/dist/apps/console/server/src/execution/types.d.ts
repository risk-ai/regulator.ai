/**
 * Execution Types
 *
 * Common types for execution handlers
 */
export interface ExecutionContext {
    tenantId: string;
    operatorId: string;
    intentId?: string;
    payload: any;
    timestamp: Date;
}
export interface ExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTimeMs?: number;
}
export interface ExecutionHandler {
    name: string;
    description: string;
    execute(context: ExecutionContext): Promise<ExecutionResult>;
    validate(payload: any): boolean;
}
export interface HandlerRegistry {
    [key: string]: ExecutionHandler;
}
//# sourceMappingURL=types.d.ts.map