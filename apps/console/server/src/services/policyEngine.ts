/**
 * Policy Evaluation Engine — Vienna OS
 * 
 * Core logic for evaluating intents against policy rules.
 * Rules are evaluated top-down by priority (highest first).
 * First matching rule wins (firewall-style).
 * Default action when no rule matches is configurable (default: allow).
 */

// ============================================================================
// Types
// ============================================================================

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

export type ActionType =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'flag_for_review'
  | 'rate_limit'
  | 'escalate';

export interface IntentContext {
  action_type?: string;
  agent_id?: string;
  amount?: number;
  environment?: string;
  time_of_day?: string;   // HH:MM format
  day_of_week?: string;   // monday, tuesday, etc.
  source_ip?: string;
  risk_score?: number;
  resource_type?: string;
  [key: string]: unknown; // custom.* fields
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

// ============================================================================
// Condition Evaluators
// ============================================================================

/**
 * Safely coerce a value to number for comparisons.
 * Returns NaN if not convertible.
 */
function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    return n;
  }
  return NaN;
}

/**
 * Resolve a field value from the intent context.
 * Supports dotted paths like "custom.department".
 */
function resolveField(context: IntentContext, field: string): unknown {
  if (field.includes('.')) {
    const parts = field.split('.');
    let current: unknown = context;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
  return context[field];
}

/**
 * Evaluate a single condition against a context.
 */
export function evaluateCondition(
  condition: PolicyCondition,
  context: IntentContext
): ConditionDetail {
  const { field, operator, value: expected } = condition;
  const actual = resolveField(context, field);

  let passed = false;

  try {
    switch (operator) {
      case 'equals':
        passed = String(actual).toLowerCase() === String(expected).toLowerCase();
        break;

      case 'not_equals':
        passed = String(actual).toLowerCase() !== String(expected).toLowerCase();
        break;

      case 'contains':
        passed = typeof actual === 'string' && typeof expected === 'string'
          && actual.toLowerCase().includes(expected.toLowerCase());
        break;

      case 'not_contains':
        passed = typeof actual === 'string' && typeof expected === 'string'
          && !actual.toLowerCase().includes(expected.toLowerCase());
        break;

      case 'gt':
        passed = toNumber(actual) > toNumber(expected);
        break;

      case 'gte':
        passed = toNumber(actual) >= toNumber(expected);
        break;

      case 'lt':
        passed = toNumber(actual) < toNumber(expected);
        break;

      case 'lte':
        passed = toNumber(actual) <= toNumber(expected);
        break;

      case 'in': {
        const list = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim());
        passed = list.some(item => String(item).toLowerCase() === String(actual).toLowerCase());
        break;
      }

      case 'not_in': {
        const list = Array.isArray(expected) ? expected : String(expected).split(',').map(s => s.trim());
        passed = !list.some(item => String(item).toLowerCase() === String(actual).toLowerCase());
        break;
      }

      case 'matches': {
        try {
          const regex = new RegExp(String(expected), 'i');
          passed = typeof actual === 'string' && regex.test(actual);
        } catch {
          passed = false;
        }
        break;
      }

      case 'between': {
        const num = toNumber(actual);
        if (Array.isArray(expected) && expected.length === 2) {
          const [lo, hi] = expected.map(toNumber);
          passed = !isNaN(num) && !isNaN(lo) && !isNaN(hi) && num >= lo && num <= hi;
        } else if (typeof expected === 'string' && expected.includes(',')) {
          const [lo, hi] = expected.split(',').map(s => toNumber(s.trim()));
          passed = !isNaN(num) && !isNaN(lo) && !isNaN(hi) && num >= lo && num <= hi;
        }
        break;
      }

      case 'time_between': {
        // Compare HH:MM times, handles overnight ranges (e.g., "22:00,06:00")
        const timeStr = actual != null ? String(actual) : getCurrentTime();
        const [startStr, endStr] = Array.isArray(expected)
          ? expected.map(String)
          : String(expected).split(',').map(s => s.trim());

        passed = isTimeBetween(timeStr, startStr, endStr);
        break;
      }

      case 'exists':
        passed = actual !== undefined && actual !== null;
        break;

      case 'not_exists':
        passed = actual === undefined || actual === null;
        break;

      default:
        // Unknown operator — fail safe
        passed = false;
    }
  } catch {
    // Any evaluation error = condition doesn't pass
    passed = false;
  }

  return { field, operator, expected, actual, passed };
}

/**
 * Check if a time string (HH:MM) falls between start and end.
 * Handles overnight ranges (e.g., 22:00 to 06:00).
 */
function isTimeBetween(time: string, start: string, end: string): boolean {
  const toMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const t = toMinutes(time);
  const s = toMinutes(start);
  const e = toMinutes(end);

  if (s <= e) {
    // Normal range: 09:00 - 17:00
    return t >= s && t <= e;
  } else {
    // Overnight range: 22:00 - 06:00
    return t >= s || t <= e;
  }
}

/**
 * Get current time as HH:MM string.
 */
function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// ============================================================================
// Rule Evaluation
// ============================================================================

/**
 * Evaluate a single rule against a context.
 * All conditions must pass (AND logic) for the rule to match.
 * If condition_groups exist, uses OR logic between groups.
 */
export function evaluateRule(
  rule: PolicyRule,
  context: IntentContext
): EvaluationResult {
  const details: ConditionDetail[] = [];
  let matched: boolean;

  if (rule.condition_groups && rule.condition_groups.length > 0) {
    // OR between groups, AND within each group
    matched = rule.condition_groups.some(group => {
      const groupDetails = group.conditions.map(c => evaluateCondition(c, context));
      details.push(...groupDetails);

      if (group.logic === 'OR') {
        return groupDetails.some(d => d.passed);
      }
      // Default AND
      return groupDetails.every(d => d.passed);
    });
  } else if (rule.conditions.length === 0) {
    // No conditions = always match (catch-all rule)
    matched = true;
  } else {
    // Simple AND across all conditions
    for (const condition of rule.conditions) {
      const detail = evaluateCondition(condition, context);
      details.push(detail);
    }
    matched = details.every(d => d.passed);
  }

  return {
    rule_id: rule.id,
    rule_name: rule.name,
    matched,
    action: rule.action_on_match,
    approval_tier: rule.approval_tier || undefined,
    required_approvers: rule.required_approvers || undefined,
    conditions_detail: details,
  };
}

/**
 * Evaluate all active rules against a context.
 * Rules are sorted by priority (highest first). First match wins.
 */
export function evaluateAllRules(
  rules: PolicyRule[],
  context: IntentContext,
  defaultAction: ActionType = 'allow'
): FullEvaluationResult {
  // Sort by priority descending (higher priority = evaluated first)
  const sorted = [...rules]
    .filter(r => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  const allResults: EvaluationResult[] = [];
  let matchedRule: EvaluationResult | null = null;

  for (const rule of sorted) {
    const result = evaluateRule(rule, context);
    allResults.push(result);

    if (result.matched && !matchedRule) {
      matchedRule = result;
      // Don't break — evaluate all for dry-run visibility
    }
  }

  return {
    matched_rule: matchedRule,
    all_results: allResults,
    default_action: defaultAction,
    evaluated_at: new Date().toISOString(),
  };
}

// ============================================================================
// Industry Templates
// ============================================================================

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  rules: Omit<PolicyRule, 'id' | 'enabled'>[];
}

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'financial-services',
    name: 'Financial Services',
    description: 'Wire transfer limits, trade controls, after-hours monitoring',
    industry: 'Financial Services',
    rules: [
      {
        name: 'Wire Transfers > $10K Require Multi-Party Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'wire_transfer' },
          { field: 'amount', operator: 'gt', value: 10000 },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        required_approvers: [],
        priority: 200,
        tenant_scope: '*',
      },
      {
        name: 'Trades > $100K Require Multi-Party Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'trade' },
          { field: 'amount', operator: 'gt', value: 100000 },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        required_approvers: [],
        priority: 190,
        tenant_scope: '*',
      },
      {
        name: 'After-Hours Trades Flagged for Review',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'trade' },
          { field: 'time_of_day', operator: 'time_between', value: ['17:00', '08:00'] },
        ],
        action_on_match: 'flag_for_review',
        priority: 180,
        tenant_scope: '*',
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'PHI access controls, data export restrictions, medication orders',
    industry: 'Healthcare',
    rules: [
      {
        name: 'PHI Access Requires Single Approval',
        conditions: [
          { field: 'resource_type', operator: 'equals', value: 'phi' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        required_approvers: [],
        priority: 200,
        tenant_scope: '*',
      },
      {
        name: 'Bulk Data Exports Denied',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'bulk_export' },
          { field: 'resource_type', operator: 'in', value: ['phi', 'patient_records', 'medical_data'] },
        ],
        action_on_match: 'deny',
        priority: 250,
        tenant_scope: '*',
      },
      {
        name: 'Medication Orders Require Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'medication_order' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        required_approvers: [],
        priority: 190,
        tenant_scope: '*',
      },
    ],
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Production deploy gates, migration controls, rollback auto-approval',
    industry: 'DevOps',
    rules: [
      {
        name: 'Production Deploys Require Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'deploy' },
          { field: 'environment', operator: 'equals', value: 'production' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        required_approvers: [],
        priority: 200,
        tenant_scope: '*',
      },
      {
        name: 'Database Migrations Require Multi-Party Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'db_migration' },
          { field: 'environment', operator: 'equals', value: 'production' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        required_approvers: [],
        priority: 210,
        tenant_scope: '*',
      },
      {
        name: 'Rollbacks Auto-Approved',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'rollback' },
        ],
        action_on_match: 'allow',
        approval_tier: 'T0',
        priority: 220,
        tenant_scope: '*',
      },
    ],
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Document filing controls, client fund transfer gates',
    industry: 'Legal',
    rules: [
      {
        name: 'Document Filing Requires Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'document_filing' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        required_approvers: [],
        priority: 200,
        tenant_scope: '*',
      },
      {
        name: 'Client Fund Transfers Require Multi-Party Approval',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'fund_transfer' },
          { field: 'resource_type', operator: 'equals', value: 'client_funds' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        required_approvers: [],
        priority: 210,
        tenant_scope: '*',
      },
    ],
  },
  {
    id: 'general',
    name: 'General',
    description: 'Universal governance rules for any industry',
    industry: 'General',
    rules: [
      {
        name: 'High Risk Score Actions Require Approval',
        conditions: [
          { field: 'risk_score', operator: 'gte', value: 80 },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        required_approvers: [],
        priority: 300,
        tenant_scope: '*',
      },
      {
        name: 'Moderate Risk Score Flagged for Review',
        conditions: [
          { field: 'risk_score', operator: 'between', value: [50, 79] },
        ],
        action_on_match: 'flag_for_review',
        priority: 150,
        tenant_scope: '*',
      },
      {
        name: 'Unknown Agents Escalated',
        conditions: [
          { field: 'agent_id', operator: 'equals', value: 'unknown' },
        ],
        action_on_match: 'escalate',
        priority: 250,
        tenant_scope: '*',
      },
    ],
  },
];
