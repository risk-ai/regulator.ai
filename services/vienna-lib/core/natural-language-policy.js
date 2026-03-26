/**
 * Natural Language Policy Creation
 * 
 * Converts human-readable policy descriptions into structured policy rules.
 * "Block wire transfers over $10K after hours" → policy rule JSON
 * 
 * Phase 3 differentiator. Uses pattern matching for common policy patterns
 * with optional LLM fallback for complex rules.
 */

// Common policy templates that can be matched via patterns
const POLICY_TEMPLATES = [
  {
    patterns: [
      /block\s+(.+)\s+over\s+\$?([\d,]+)/i,
      /deny\s+(.+)\s+exceeding\s+\$?([\d,]+)/i,
      /require\s+approval\s+for\s+(.+)\s+over\s+\$?([\d,]+)/i,
    ],
    builder: (match) => ({
      name: `high-value-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() },
        { field: 'amount', operator: 'gt', value: parseInt(match[2].replace(/,/g, '')) }
      ],
      action_on_match: 'require_approval',
      approval_tier: 'T2',
      description: `Require approval for ${match[1].trim()} over $${match[2]}`
    })
  },
  {
    patterns: [
      /block\s+(.+)\s+after\s+(\d+)\s*(pm|am)/i,
      /deny\s+(.+)\s+after\s+(\d+)\s*(pm|am)/i,
      /require\s+approval\s+for\s+(.+)\s+after\s+hours/i,
    ],
    builder: (match) => {
      let hour = parseInt(match[2]);
      if (match[3] && match[3].toLowerCase() === 'pm' && hour < 12) hour += 12;
      return {
        name: `after-hours-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
        conditions: [
          { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() },
          { field: 'time.hour', operator: 'gte', value: hour }
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        description: `Require approval for ${match[1].trim()} after ${hour}:00`
      };
    }
  },
  {
    patterns: [
      /only\s+allow\s+(.+)\s+from\s+agent(?:s)?\s+(.+)/i,
      /restrict\s+(.+)\s+to\s+agent(?:s)?\s+(.+)/i,
    ],
    builder: (match) => ({
      name: `restrict-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() },
        { field: 'agent_id', operator: 'not_in', value: match[2].split(/[,\s]+/).map(s => s.trim()) }
      ],
      action_on_match: 'deny',
      description: `Only allow ${match[1].trim()} from agents: ${match[2].trim()}`
    })
  },
  {
    patterns: [
      /limit\s+(.+)\s+to\s+(\d+)\s+per\s+(hour|day|minute)/i,
      /rate\s+limit\s+(.+)\s+to\s+(\d+)\s+per\s+(hour|day|minute)/i,
    ],
    builder: (match) => ({
      name: `rate-limit-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() },
        { field: `rate.per_${match[3].toLowerCase()}`, operator: 'gt', value: parseInt(match[2]) }
      ],
      action_on_match: 'throttle',
      max_per_period: parseInt(match[2]),
      period: match[3].toLowerCase(),
      description: `Limit ${match[1].trim()} to ${match[2]} per ${match[3]}`
    })
  },
  {
    patterns: [
      /require\s+(\d+)\s+approver[s]?\s+for\s+(.+)/i,
      /need\s+(\d+)\s+approval[s]?\s+for\s+(.+)/i,
    ],
    builder: (match) => ({
      name: `multi-approval-${match[2].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[2].trim().toLowerCase() }
      ],
      action_on_match: 'require_approval',
      approval_tier: parseInt(match[1]) >= 2 ? 'T3' : 'T2',
      required_approvers: parseInt(match[1]),
      description: `Require ${match[1]} approvers for ${match[2].trim()}`
    })
  },
  {
    patterns: [
      /auto[- ]?approve\s+(.+)/i,
      /allow\s+(.+)\s+without\s+approval/i,
    ],
    builder: (match) => ({
      name: `auto-approve-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() }
      ],
      action_on_match: 'auto_approve',
      approval_tier: 'T0',
      description: `Auto-approve ${match[1].trim()}`
    })
  },
  {
    patterns: [
      /block\s+all\s+(.+)/i,
      /deny\s+all\s+(.+)/i,
      /never\s+allow\s+(.+)/i,
    ],
    builder: (match) => ({
      name: `block-${match[1].replace(/\s+/g, '-').toLowerCase()}`,
      conditions: [
        { field: 'action', operator: 'contains', value: match[1].trim().toLowerCase() }
      ],
      action_on_match: 'deny',
      description: `Block all ${match[1].trim()}`
    })
  }
];

class NaturalLanguagePolicyEngine {
  constructor(options = {}) {
    this.templates = [...POLICY_TEMPLATES];
    this.llmFallback = options.llmFallback || null; // Optional LLM for complex rules
  }

  /**
   * Parse a natural language policy description into a structured rule.
   * 
   * @param {string} input - Natural language policy description
   * @returns {ParseResult}
   */
  parse(input) {
    if (!input || typeof input !== 'string') {
      return { success: false, error: 'Input is required', input };
    }

    const trimmed = input.trim();

    // Try template matching first
    for (const template of this.templates) {
      for (const pattern of template.patterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const rule = template.builder(match);
          return {
            success: true,
            method: 'template',
            confidence: 0.9,
            rule: {
              ...rule,
              enabled: false, // Draft by default — requires operator confirmation
              version: 1,
              created_via: 'natural_language',
              source_text: trimmed
            },
            preview: this._generatePreview(rule),
            input: trimmed
          };
        }
      }
    }

    // No template matched — return failure with suggestions
    return {
      success: false,
      method: 'none',
      error: 'Could not parse policy from input',
      input: trimmed,
      suggestions: this._suggestSimilar(trimmed)
    };
  }

  /**
   * Generate a human-readable preview of what the rule does
   */
  _generatePreview(rule) {
    const parts = [];
    
    parts.push(`📋 **${rule.name}**`);
    parts.push(`${rule.description || ''}`);
    parts.push('');
    parts.push('When:');
    
    for (const cond of rule.conditions || []) {
      parts.push(`  • ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
    }
    
    parts.push('');
    parts.push(`Then: ${rule.action_on_match}`);
    
    if (rule.approval_tier) {
      parts.push(`Tier: ${rule.approval_tier}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Suggest similar phrasings when parse fails
   */
  _suggestSimilar(input) {
    return [
      'Try: "Block wire transfers over $10,000"',
      'Try: "Require 2 approvers for production deploys"',
      'Try: "Rate limit API calls to 100 per hour"',
      'Try: "Only allow deployments from agent deploy-bot"',
      'Try: "Auto-approve read-only queries"',
      'Try: "Block all database deletions after 6pm"',
    ];
  }

  /**
   * Register a custom template
   */
  addTemplate(patterns, builder) {
    this.templates.push({ patterns, builder });
  }
}

module.exports = { NaturalLanguagePolicyEngine, POLICY_TEMPLATES };
