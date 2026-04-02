/**
 * Vienna Economic Model
 *
 * Cost accounting, budget enforcement, resource-aware scheduling.
 */
/**
 * Cost Model for Actions
 */
export class CostModel {
    baseCosts: {
        'compute:light': number;
        'compute:medium': number;
        'compute:heavy': number;
        'compute:intensive': number;
        'llm:haiku:1k_tokens': number;
        'llm:sonnet:1k_tokens': number;
        'llm:opus:1k_tokens': number;
        'network:http_request': number;
        'network:large_payload': number;
        'network:distributed_call': number;
        'storage:read': number;
        'storage:write': number;
        'storage:delete': number;
        'verification:simple': number;
        'verification:complex': number;
        'service:restart': number;
        'service:health_check': number;
    };
    /**
     * Estimate cost for an action
     */
    estimateCost(action: any, context?: {}): number;
    /**
     * Estimate cost for a plan
     */
    estimatePlanCost(plan: any, context?: {}): number;
    /**
     * Record actual cost
     */
    recordActualCost(executionId: any, actualCost: any, breakdown?: {}): {
        execution_id: any;
        actual_cost: any;
        breakdown: {};
        recorded_at: string;
    };
}
/**
 * Budget Model
 */
export class Budget {
    constructor(data: any);
    budget_id: any;
    scope: any;
    scope_id: any;
    limit: any;
    spent: any;
    reserved: any;
    period: any;
    period_start: any;
    period_end: any;
    status: any;
    /**
     * Check if budget can accommodate cost
     */
    canAfford(estimatedCost: any): boolean;
    /**
     * Reserve budget for planned execution
     */
    reserve(estimatedCost: any): any;
    /**
     * Release reserved budget
     */
    releaseReservation(reservedCost: any): any;
    /**
     * Charge actual cost
     */
    charge(actualCost: any): any;
    /**
     * Get available budget
     */
    getAvailable(): number;
    /**
     * Get utilization percentage
     */
    getUtilization(): number;
    /**
     * Check if budget is exhausted
     */
    isExhausted(): boolean;
    /**
     * Calculate period end
     */
    _calculatePeriodEnd(periodStart: any, period: any): string;
    toJSON(): {
        budget_id: any;
        scope: any;
        scope_id: any;
        limit: any;
        spent: any;
        reserved: any;
        available: number;
        utilization: number;
        period: any;
        period_start: any;
        period_end: any;
        status: any;
    };
}
/**
 * Budget Manager
 */
export class BudgetManager {
    budgets: Map<any, any>;
    costModel: CostModel;
    /**
     * Create a budget
     */
    createBudget(budgetData: any): Budget;
    /**
     * Get budget by ID
     */
    getBudget(budgetId: any): any;
    /**
     * Get budget for scope
     */
    getBudgetForScope(scope: any, scopeId: any): any;
    /**
     * Check if action can be afforded
     */
    checkAffordability(action: any, context: any): Promise<{
        affordable: boolean;
        estimated_cost: number;
        checks: {
            scope: string;
            budget_id: any;
            can_afford: any;
            available: any;
            estimated_cost: number;
        }[];
    }>;
    /**
     * Reserve budget for execution
     */
    reserveBudget(executionId: any, estimatedCost: any, context: any): Promise<{
        execution_id: any;
        reservations: {
            scope: string;
            budget_id: any;
            amount: any;
        }[];
        total_reserved: any;
    }>;
    /**
     * Charge actual cost after execution
     */
    chargeExecution(executionId: any, actualCost: any, estimatedCost: any, context: any): Promise<{
        execution_id: any;
        charges: {
            scope: string;
            budget_id: any;
            amount: any;
        }[];
        total_charged: any;
    }>;
    /**
     * List budgets
     */
    listBudgets(filters?: {}): any[];
    /**
     * Generate budget ID
     */
    _generateBudgetId(): string;
}
export function getBudgetManager(): any;
//# sourceMappingURL=cost-model.d.ts.map