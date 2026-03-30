/**
 * Policy Evaluation Engine — Vienna OS
 *
 * Core logic for evaluating intents against policy rules.
 * Rules are evaluated top-down by priority (highest first).
 * First matching rule wins (firewall-style).
 * Default action when no rule matches is configurable (default: allow).
 */
export interface PolicyCondition {
    field: string;
    operator: string;
    value: unknown;
}
export interface ConditionGroup {
    logic: 'AND' | 'OR';
    conditions: PolicyCondition[];
}
export interface PolicyRule {
    id: string;
    name: string;
    conditions: PolicyCondition[];
    condition_groups?: ConditionGroup[];
    action_on_match: ActionType;
    approval_tier?: string;
    required_approvers?: string[];
    priority: number;
    enabled: boolean;
    tenant_scope: string;
}
export type ActionType = 'allow' | 'deny' | 'require_approval' | 'flag_for_review' | 'rate_limit' | 'escalate';
export interface IntentContext {
    action_type?: string;
    agent_id?: string;
    amount?: number;
    environment?: string;
    time_of_day?: string;
    day_of_week?: string;
    source_ip?: string;
    risk_score?: number;
    resource_type?: string;
    [key: string]: unknown;
}
export interface ConditionDetail {
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    passed: boolean;
}
export interface EvaluationResult {
    rule_id: string;
    rule_name: string;
    matched: boolean;
    action: ActionType;
    approval_tier?: string;
    required_approvers?: string[];
    conditions_detail: ConditionDetail[];
}
export interface FullEvaluationResult {
    /** The winning rule (first match), null if no match */
    matched_rule: EvaluationResult | null;
    /** All rules evaluated with their match status */
    all_results: EvaluationResult[];
    /** Default action applied when no rule matches */
    default_action: ActionType;
    /** Timestamp of evaluation */
    evaluated_at: string;
}
/**
 * Evaluate a single condition against a context.
 */
export declare function evaluateCondition(condition: PolicyCondition, context: IntentContext): ConditionDetail;
/**
 * Evaluate a single rule against a context.
 * All conditions must pass (AND logic) for the rule to match.
 * If condition_groups exist, uses OR logic between groups.
 */
export declare function evaluateRule(rule: PolicyRule, context: IntentContext): EvaluationResult;
/**
 * Evaluate all active rules against a context.
 * Rules are sorted by priority (highest first). First match wins.
 */
export declare function evaluateAllRules(rules: PolicyRule[], context: IntentContext, defaultAction?: ActionType): FullEvaluationResult;
export interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    industry: string;
    rules: Omit<PolicyRule, 'id' | 'enabled'>[];
}
export declare const POLICY_TEMPLATES: PolicyTemplate[];
//# sourceMappingURL=policyEngine.d.ts.map