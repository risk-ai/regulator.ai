/**
 * Natural Language Policy Builder — Vienna OS
 * 
 * Translates human-readable policy descriptions into structured
 * Vienna OS policy objects. Uses pattern matching and keyword
 * extraction — no external LLM dependency required.
 * 
 * Examples:
 *   "Block any agent from making payments over $5,000 without VP approval"
 *   → Policy: scope: payment.*, constraint: amount.max=5000, decision: require_approval
 * 
 *   "Allow read-only operations for all agents automatically"
 *   → Policy: scope: *.read, decision: allow, approval_required: false
 * 
 *   "Deny all production deployments on weekends"
 *   → Policy: scope: deploy.*, environment: production, conditions: weekend, decision: deny
 * 
 * Architecture:
 * 1. Tokenize and normalize input
 * 2. Extract intent (allow/deny/require_approval)
 * 3. Extract scope (actions, resources)
 * 4. Extract constraints (amounts, counts, patterns)
 * 5. Extract conditions (time, environment, actor)
 * 6. Assemble policy object
 * 7. Validate and return with confidence score
 */

import type { RiskTierLevel } from './risk-tier';

// ─── Types ───

export interface ParsedPolicy {
  /** Generated policy object */
  policy: GeneratedPolicy;
  /** Confidence score (0-100) */
  confidence: number;
  /** Human-readable explanation of interpretation */
  explanation: string;
  /** Parts of the input that were used */
  matched_fragments: string[];
  /** Parts of the input that were not understood */
  unmatched_fragments: string[];
  /** Suggested refinements */
  suggestions?: string[];
}

export interface GeneratedPolicy {
  policy_id: string;
  name: string;
  description: string;
  scope: {
    objective?: string | string[];
    environment?: string | string[];
    risk_tier?: RiskTierLevel | RiskTierLevel[];
    actor_type?: string | string[];
  };
  conditions?: Record<string, unknown>;
  requirements: {
    approval_required: boolean;
    approval_tier?: RiskTierLevel;
    required_verification_strength?: string;
  };
  decision: 'allow' | 'deny' | 'require_approval';
  priority: number;
  enabled: boolean;
  constraints?: Record<string, { max?: number; min?: number; enum?: string[]; pattern?: string }>;
}

// ─── Keyword Dictionaries ───

const DECISION_KEYWORDS: Record<string, 'allow' | 'deny' | 'require_approval'> = {
  'allow': 'allow',
  'permit': 'allow',
  'approve': 'allow',
  'auto-approve': 'allow',
  'automate': 'allow',
  'enable': 'allow',
  'block': 'deny',
  'deny': 'deny',
  'prevent': 'deny',
  'forbid': 'deny',
  'prohibit': 'deny',
  'reject': 'deny',
  'disable': 'deny',
  'stop': 'deny',
  'require approval': 'require_approval',
  'need approval': 'require_approval',
  'needs approval': 'require_approval',
  'require review': 'require_approval',
  'human review': 'require_approval',
  'manual approval': 'require_approval',
  'must be approved': 'require_approval',
  'without approval': 'require_approval', // "block X without approval" → require approval
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  'payment': ['payment.*', 'payment.process', 'payment.refund'],
  'deploy': ['deploy.*', 'deploy.staging', 'deploy.production'],
  'deployment': ['deploy.*'],
  'delete': ['delete.*', 'data.delete'],
  'read': ['*.read', 'file.read', 'data.read'],
  'write': ['*.write', 'file.write', 'data.write'],
  'send email': ['email.send'],
  'email': ['email.*'],
  'api call': ['api.call', 'api.*'],
  'database': ['db.*', 'database.*'],
  'file': ['file.*'],
  'transfer': ['transfer.*', 'wire_transfer'],
  'wire transfer': ['wire_transfer'],
  'production': ['deploy.production', '*.production'],
  'staging': ['deploy.staging'],
  'pii': ['pii.*', 'pii_export'],
  'create user': ['user.create', 'create_user'],
  'modify config': ['config.modify', 'modify_config'],
  'restart': ['service.restart', 'restart_service'],
  'trading': ['trading.*'],
};

const ENVIRONMENT_KEYWORDS: Record<string, string> = {
  'production': 'production',
  'prod': 'production',
  'staging': 'staging',
  'stage': 'staging',
  'development': 'development',
  'dev': 'development',
  'test': 'test',
  'testing': 'test',
  'sandbox': 'sandbox',
};

const TIER_KEYWORDS: Record<string, RiskTierLevel> = {
  'low risk': 'T0',
  'low-risk': 'T0',
  'informational': 'T0',
  'medium risk': 'T1',
  'medium-risk': 'T1',
  'high risk': 'T2',
  'high-risk': 'T2',
  'critical': 'T3',
  'critical risk': 'T3',
  't0': 'T0',
  't1': 'T1',
  't2': 'T2',
  't3': 'T3',
};

const ACTOR_KEYWORDS: Record<string, string> = {
  'all agents': '*',
  'any agent': '*',
  'every agent': '*',
  'automation': 'automation',
  'system': 'system',
  'operator': 'operator',
  'human': 'operator',
};

const TIME_KEYWORDS: Record<string, Record<string, unknown>> = {
  'weekend': { day_of_week: [0, 6] },
  'weekends': { day_of_week: [0, 6] },
  'weekday': { day_of_week: [1, 2, 3, 4, 5] },
  'weekdays': { day_of_week: [1, 2, 3, 4, 5] },
  'business hours': { hour_range: [9, 17] },
  'after hours': { hour_range: [17, 9], inverted: true },
  'night': { hour_range: [22, 6] },
  'overnight': { hour_range: [22, 6] },
};

// ─── Natural Language Policy Builder ───

export class NaturalLanguagePolicyBuilder {

  /**
   * Parse a natural language policy description into a structured policy.
   */
  parse(input: string): ParsedPolicy {
    const normalized = input.toLowerCase().trim();
    const tokens = this._tokenize(normalized);
    const matchedFragments: string[] = [];
    const unmatchedTokens = new Set(tokens);

    // 1. Extract decision (allow/deny/require_approval)
    const { decision, fragment: decisionFragment } = this._extractDecision(normalized);
    if (decisionFragment) {
      matchedFragments.push(`Decision: "${decisionFragment}" → ${decision}`);
      for (const t of decisionFragment.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 2. Extract actions/scope
    const { actions, fragments: actionFragments } = this._extractActions(normalized);
    for (const f of actionFragments) {
      matchedFragments.push(`Action: "${f}"`);
      for (const t of f.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 3. Extract constraints (amounts, counts)
    const { constraints, fragments: constraintFragments } = this._extractConstraints(normalized);
    for (const f of constraintFragments) {
      matchedFragments.push(`Constraint: "${f}"`);
      for (const t of f.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 4. Extract environment
    const { environment, fragment: envFragment } = this._extractEnvironment(normalized);
    if (envFragment) {
      matchedFragments.push(`Environment: "${envFragment}" → ${environment}`);
      for (const t of envFragment.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 5. Extract risk tier
    const { tier, fragment: tierFragment } = this._extractTier(normalized);
    if (tierFragment) {
      matchedFragments.push(`Risk tier: "${tierFragment}" → ${tier}`);
      for (const t of tierFragment.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 6. Extract actor
    const { actor, fragment: actorFragment } = this._extractActor(normalized);
    if (actorFragment) {
      matchedFragments.push(`Actor: "${actorFragment}" → ${actor}`);
      for (const t of actorFragment.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 7. Extract time conditions
    const { timeCondition, fragment: timeFragment } = this._extractTimeCondition(normalized);
    if (timeFragment) {
      matchedFragments.push(`Time: "${timeFragment}"`);
      for (const t of timeFragment.split(/\s+/)) unmatchedTokens.delete(t);
    }

    // 8. Handle "without [X] approval" pattern (special case)
    let finalDecision = decision;
    const withoutApprovalMatch = normalized.match(/without\s+(?:\w+\s+)?approval/);
    if (withoutApprovalMatch && (decision === 'deny' || decision === 'allow')) {
      finalDecision = 'require_approval';
      matchedFragments.push(`Interpreted "${withoutApprovalMatch[0]}" as "require approval"`);
    }

    // Determine if approval is required
    const approvalRequired = finalDecision === 'require_approval';

    // Build policy
    const policy: GeneratedPolicy = {
      policy_id: `pol_nl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: this._generatePolicyName(finalDecision, actions, environment),
      description: input,
      scope: {},
      requirements: {
        approval_required: approvalRequired,
      },
      decision: approvalRequired ? 'require_approval' : finalDecision,
      priority: finalDecision === 'deny' ? 100 : finalDecision === 'require_approval' ? 50 : 10,
      enabled: true,
    };

    // Set scope
    if (actions.length > 0) {
      policy.scope.objective = actions.length === 1 ? actions[0] : actions;
    }
    if (environment) {
      policy.scope.environment = environment;
    }
    if (tier) {
      policy.scope.risk_tier = tier;
    }
    if (actor && actor !== '*') {
      policy.scope.actor_type = actor;
    }

    // Set constraints
    if (Object.keys(constraints).length > 0) {
      policy.constraints = constraints;
    }

    // Set time conditions
    if (timeCondition) {
      policy.conditions = { time: timeCondition };
    }

    // Compute confidence
    const confidence = this._computeConfidence(matchedFragments, unmatchedTokens, decision, actions);

    // Filter unmatched (remove common words)
    const stopWords = new Set(['a', 'an', 'the', 'for', 'from', 'to', 'in', 'on', 'of', 'any', 'all', 'no', 'not', 'and', 'or', 'with', 'by', 'over', 'under', 'above', 'below', 'than', 'that', 'this', 'it', 'is', 'are', 'be', 'been', 'being', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'making', 'agent', 'agents', 'operations', 'operation', 'action', 'actions', 'automatically', 'only']);
    const meaningfulUnmatched = Array.from(unmatchedTokens).filter(t => !stopWords.has(t) && t.length > 2);

    // Generate explanation
    const explanation = this._generateExplanation(policy, matchedFragments);

    // Suggestions
    const suggestions: string[] = [];
    if (actions.length === 0) {
      suggestions.push('Consider specifying which actions this policy applies to (e.g., "payments", "deployments", "file operations")');
    }
    if (!environment && actions.some(a => a.includes('deploy'))) {
      suggestions.push('Consider specifying an environment (e.g., "in production", "in staging")');
    }
    if (meaningfulUnmatched.length > 0) {
      suggestions.push(`These words were not matched to policy elements: ${meaningfulUnmatched.join(', ')}`);
    }

    return {
      policy,
      confidence,
      explanation,
      matched_fragments: matchedFragments,
      unmatched_fragments: meaningfulUnmatched,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  // ─── Extractors ───

  private _extractDecision(input: string): { decision: 'allow' | 'deny' | 'require_approval'; fragment: string | null } {
    // Check multi-word keywords first
    for (const [keyword, decision] of Object.entries(DECISION_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (input.includes(keyword)) {
        return { decision, fragment: keyword };
      }
    }
    return { decision: 'allow', fragment: null };
  }

  private _extractActions(input: string): { actions: string[]; fragments: string[] } {
    const actions: string[] = [];
    const fragments: string[] = [];

    // Check multi-word keywords first
    for (const [keyword, actionList] of Object.entries(ACTION_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (input.includes(keyword)) {
        actions.push(...actionList.slice(0, 1)); // Take first (most specific)
        fragments.push(keyword);
      }
    }

    // Deduplicate
    return { actions: [...new Set(actions)], fragments: [...new Set(fragments)] };
  }

  private _extractConstraints(input: string): {
    constraints: Record<string, { max?: number; min?: number }>;
    fragments: string[];
  } {
    const constraints: Record<string, { max?: number; min?: number }> = {};
    const fragments: string[] = [];

    // Amount patterns: "over $5,000", "more than $1000", "exceeding $500", "under $100"
    const amountPatterns = [
      /(?:over|more than|exceeding|above|greater than)\s*\$?([\d,]+)/gi,
      /\$?([\d,]+)\s*(?:or more|and above|\+)/gi,
    ];

    for (const pattern of amountPatterns) {
      const match = pattern.exec(input);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''), 10);
        constraints.amount = { max: amount };
        fragments.push(match[0].trim());
      }
    }

    const underPatterns = [
      /(?:under|less than|below|no more than|at most|up to)\s*\$?([\d,]+)/gi,
    ];

    for (const pattern of underPatterns) {
      const match = pattern.exec(input);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''), 10);
        if (constraints.amount) {
          constraints.amount.min = amount;
        } else {
          constraints.amount = { max: amount };
        }
        fragments.push(match[0].trim());
      }
    }

    // Count patterns: "more than 10 times", "limit to 5 per hour"
    const countPatterns = [
      /(?:more than|exceeding|over)\s*(\d+)\s*(?:times|requests|calls|actions)/gi,
      /(?:limit to|max|maximum of?)\s*(\d+)\s*(?:per hour|per day|per minute|times)/gi,
    ];

    for (const pattern of countPatterns) {
      const match = pattern.exec(input);
      if (match) {
        constraints.count = { max: parseInt(match[1], 10) };
        fragments.push(match[0].trim());
      }
    }

    return { constraints, fragments };
  }

  private _extractEnvironment(input: string): { environment: string | null; fragment: string | null } {
    for (const [keyword, env] of Object.entries(ENVIRONMENT_KEYWORDS)) {
      // Match "in production", "on staging", "to production", etc.
      const patterns = [
        new RegExp(`\\b(?:in|on|to|for|from)\\s+${keyword}\\b`, 'i'),
        new RegExp(`\\b${keyword}\\s+(?:environment|env|deploy|deployment)\\b`, 'i'),
        new RegExp(`\\b${keyword}\\b`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          return { environment: env, fragment: match[0].trim() };
        }
      }
    }
    return { environment: null, fragment: null };
  }

  private _extractTier(input: string): { tier: RiskTierLevel | null; fragment: string | null } {
    for (const [keyword, tier] of Object.entries(TIER_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (input.includes(keyword)) {
        return { tier, fragment: keyword };
      }
    }
    return { tier: null, fragment: null };
  }

  private _extractActor(input: string): { actor: string | null; fragment: string | null } {
    for (const [keyword, actor] of Object.entries(ACTOR_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (input.includes(keyword)) {
        return { actor, fragment: keyword };
      }
    }
    return { actor: null, fragment: null };
  }

  private _extractTimeCondition(input: string): { timeCondition: Record<string, unknown> | null; fragment: string | null } {
    for (const [keyword, condition] of Object.entries(TIME_KEYWORDS).sort((a, b) => b[0].length - a[0].length)) {
      if (input.includes(keyword)) {
        return { timeCondition: condition, fragment: keyword };
      }
    }
    return { timeCondition: null, fragment: null };
  }

  // ─── Helpers ───

  private _tokenize(input: string): string[] {
    return input
      .replace(/[^a-z0-9\s$.,*-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  private _computeConfidence(
    matched: string[],
    unmatched: Set<string>,
    decision: string,
    actions: string[]
  ): number {
    let confidence = 30; // Base

    // Decision extracted
    if (decision) confidence += 25;

    // Actions extracted
    if (actions.length > 0) confidence += 25;

    // More matched fragments = higher confidence
    confidence += Math.min(20, matched.length * 5);

    // Penalty for unmatched tokens
    const stopWords = new Set(['a', 'an', 'the', 'for', 'from', 'to', 'in', 'on', 'of', 'any', 'all', 'and', 'or', 'with', 'by', 'agent', 'agents', 'operations', 'automatically', 'only']);
    const meaningful = Array.from(unmatched).filter(t => !stopWords.has(t) && t.length > 2);
    confidence -= meaningful.length * 3;

    return Math.max(10, Math.min(100, confidence));
  }

  private _generatePolicyName(decision: string, actions: string[], environment: string | null): string {
    const actionStr = actions.length > 0 ? actions[0].replace(/\.\*/g, '').replace(/\./g, ' ') : 'all actions';
    const envStr = environment ? ` in ${environment}` : '';
    const decisionStr = decision === 'deny' ? 'Block' : decision === 'require_approval' ? 'Require approval for' : 'Allow';
    return `${decisionStr} ${actionStr}${envStr}`;
  }

  private _generateExplanation(policy: GeneratedPolicy, matched: string[]): string {
    const parts: string[] = [];

    parts.push(`**Decision:** ${policy.decision === 'deny' ? 'DENY' : policy.decision === 'require_approval' ? 'REQUIRE APPROVAL' : 'ALLOW'}`);

    if (policy.scope.objective) {
      const obj = Array.isArray(policy.scope.objective) ? policy.scope.objective.join(', ') : policy.scope.objective;
      parts.push(`**Scope:** ${obj}`);
    }

    if (policy.scope.environment) {
      parts.push(`**Environment:** ${policy.scope.environment}`);
    }

    if (policy.scope.risk_tier) {
      parts.push(`**Risk Tier:** ${policy.scope.risk_tier}`);
    }

    if (policy.constraints) {
      const cstParts = Object.entries(policy.constraints).map(([key, val]) => {
        if (val.max !== undefined) return `${key} ≤ ${val.max}`;
        if (val.min !== undefined) return `${key} ≥ ${val.min}`;
        return key;
      });
      parts.push(`**Constraints:** ${cstParts.join(', ')}`);
    }

    if (policy.conditions?.time) {
      parts.push(`**Time condition:** ${JSON.stringify(policy.conditions.time)}`);
    }

    parts.push(`**Priority:** ${policy.priority}`);

    return parts.join('\n');
  }
}

export default NaturalLanguagePolicyBuilder;
