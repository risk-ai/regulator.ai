/**
 * Vienna OS — OpenClaw Plugin
 * 
 * Governance middleware for OpenClaw agent sessions.
 * When installed, every tool call from an OpenClaw agent flows through
 * Vienna's governance pipeline before execution.
 * 
 * Architecture:
 *   OpenClaw Agent → Tool Call → Vienna Plugin (intercept) → 
 *   Policy Engine → Approval (if needed) → Warrant → Execute → Verify → Audit
 * 
 * Installation:
 *   In OpenClaw config, add this plugin to intercept tool calls.
 *   Set VIENNA_API_URL and VIENNA_API_KEY environment variables.
 * 
 * This is the reference integration for "Vienna OS governs OpenClaw agents"
 * and serves as the first proof-of-concept for the platform.
 */

const crypto = require('crypto');

/**
 * Risk classification for OpenClaw tool calls.
 * Maps tool names to risk tiers.
 */
const TOOL_RISK_MAP = {
  // T0 — Informational (auto-approve)
  read: 'T0',
  web_search: 'T0',
  web_fetch: 'T0',
  image: 'T0',
  memory_search: 'T0',
  memory_get: 'T0',
  session_status: 'T0',
  sessions_list: 'T0',
  sessions_history: 'T0',
  pdf: 'T0',

  // T1 — Low Risk (policy auto-approve)
  write: 'T1',
  edit: 'T1',
  message: 'T1',
  tts: 'T1',
  canvas: 'T1',
  browser: 'T1',
  sessions_send: 'T1',
  sessions_spawn: 'T1',
  sessions_yield: 'T1',
  subagents: 'T1',

  // T2 — Medium Risk (human approval)
  exec: 'T2',
  process: 'T2',
};

/**
 * Patterns that escalate any tool to T2/T3
 */
const ESCALATION_PATTERNS = {
  T3: [
    /rm\s+-rf/i,
    /drop\s+table/i,
    /delete\s+from.*where\s+1/i,
    /curl.*-X\s*DELETE/i,
    /stripe.*transfer/i,
    /wire.*transfer/i,
  ],
  T2: [
    /sudo/i,
    /chmod\s+777/i,
    /git\s+push.*--force/i,
    /DROP\s+/i,
    /DELETE\s+FROM/i,
    /rm\s+-r/i,
    /kill\s+-9/i,
    /systemctl\s+(stop|restart)/i,
  ]
};

class OpenClawGovernancePlugin {
  /**
   * @param {object} config
   * @param {string} config.apiUrl - Vienna OS API URL
   * @param {string} config.apiKey - API key (vos_xxx)
   * @param {string} [config.agentId] - Agent identifier (defaults to session ID)
   * @param {string} [config.mode] - 'enforce' | 'audit' | 'dry-run'
   * @param {object} [config.overrides] - Per-tool risk tier overrides
   * @param {function} [config.onApprovalRequired] - Callback when human approval needed
   * @param {function} [config.onDenied] - Callback when action denied
   * @param {function} [config.logger] - Custom logger
   */
  constructor(config) {
    this.apiUrl = (config.apiUrl || process.env.VIENNA_API_URL || '').replace(/\/$/, '');
    this.apiKey = config.apiKey || process.env.VIENNA_API_KEY || '';
    this.agentId = config.agentId || `openclaw-${process.pid}`;
    this.mode = config.mode || 'enforce'; // enforce | audit | dry-run
    this.overrides = config.overrides || {};
    this.onApprovalRequired = config.onApprovalRequired || null;
    this.onDenied = config.onDenied || null;
    this.logger = config.logger || console;

    // Stats
    this.stats = {
      total: 0,
      approved: 0,
      denied: 0,
      pending: 0,
      errors: 0,
      byTier: { T0: 0, T1: 0, T2: 0, T3: 0 }
    };

    // Active warrants cache
    this._warrants = new Map();
  }

  /**
   * Classify a tool call's risk tier.
   * 
   * @param {string} toolName - OpenClaw tool name
   * @param {object} params - Tool parameters
   * @returns {{ tier: string, reason: string }}
   */
  classifyRisk(toolName, params = {}) {
    // Check overrides first
    if (this.overrides[toolName]) {
      return { tier: this.overrides[toolName], reason: 'override' };
    }

    // Check for escalation patterns in parameters
    const paramStr = JSON.stringify(params);
    
    for (const pattern of ESCALATION_PATTERNS.T3) {
      if (pattern.test(paramStr)) {
        return { tier: 'T3', reason: `dangerous pattern: ${pattern}` };
      }
    }
    
    for (const pattern of ESCALATION_PATTERNS.T2) {
      if (pattern.test(paramStr)) {
        return { tier: 'T2', reason: `elevated risk pattern: ${pattern}` };
      }
    }

    // Use base tool risk map
    const tier = TOOL_RISK_MAP[toolName] || 'T1';
    return { tier, reason: 'default classification' };
  }

  /**
   * Governance check — called before each tool execution.
   * 
   * @param {string} toolName - Tool being called
   * @param {object} params - Tool parameters
   * @param {object} context - Session context (agent ID, session key, etc.)
   * @returns {Promise<GovernanceResult>}
   */
  async beforeToolCall(toolName, params = {}, context = {}) {
    this.stats.total++;
    
    const { tier, reason } = this.classifyRisk(toolName, params);
    this.stats.byTier[tier]++;

    const intentId = `int_oc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // In dry-run mode, log but don't enforce
    if (this.mode === 'dry-run') {
      this.logger.log(`[Vienna/dry-run] ${toolName} → ${tier} (${reason})`);
      this.stats.approved++;
      return { 
        allowed: true, 
        tier, 
        reason, 
        mode: 'dry-run',
        intent_id: intentId 
      };
    }

    // T0: Always allow, just log
    if (tier === 'T0') {
      this.stats.approved++;
      if (this.mode === 'audit') {
        await this._auditLog(intentId, toolName, params, tier, 'auto-approved');
      }
      return { 
        allowed: true, 
        tier, 
        reason: 'T0 auto-approved',
        intent_id: intentId 
      };
    }

    // If no API configured, fall back to audit mode
    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn(`[Vienna] No API configured — ${toolName} (${tier}) proceeding ungovened`);
      this.stats.approved++;
      return { 
        allowed: true, 
        tier, 
        reason: 'no API configured',
        ungoverned: true,
        intent_id: intentId 
      };
    }

    // Submit intent to Vienna OS
    try {
      const result = await this._submitIntent(intentId, toolName, params, tier, context);

      if (result.status === 'approved') {
        this.stats.approved++;
        this._warrants.set(intentId, result.warrant_id);
        return {
          allowed: true,
          tier,
          warrant_id: result.warrant_id,
          intent_id: intentId
        };
      }

      if (result.status === 'pending') {
        this.stats.pending++;
        
        // T2/T3 requires human approval
        if (this.onApprovalRequired) {
          this.onApprovalRequired({
            intent_id: intentId,
            tool: toolName,
            tier,
            params,
            poll_url: result.poll_url
          });
        }

        // In enforce mode, block execution
        if (this.mode === 'enforce') {
          return {
            allowed: false,
            tier,
            reason: `${tier} requires human approval`,
            intent_id: intentId,
            poll_url: result.poll_url
          };
        }

        // In audit mode, allow but flag
        this.stats.approved++;
        return {
          allowed: true,
          tier,
          reason: `${tier} approval pending (audit mode)`,
          intent_id: intentId
        };
      }

      // Denied
      this.stats.denied++;
      if (this.onDenied) {
        this.onDenied({ intent_id: intentId, tool: toolName, tier, reason: result.reason });
      }
      return {
        allowed: this.mode !== 'enforce',
        tier,
        reason: result.reason || 'denied by policy',
        intent_id: intentId
      };

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[Vienna] Governance check failed for ${toolName}:`, error.message);
      
      // Fail-open in audit mode, fail-closed in enforce mode
      const failOpen = this.mode !== 'enforce';
      return {
        allowed: failOpen,
        tier,
        reason: `governance error: ${error.message}`,
        error: true,
        intent_id: intentId
      };
    }
  }

  /**
   * Post-execution reporting — called after tool execution completes.
   * 
   * @param {string} intentId - Intent ID from beforeToolCall
   * @param {object} result - Execution result
   * @param {boolean} result.success
   * @param {string} [result.output]
   * @param {string} [result.error]
   */
  async afterToolCall(intentId, result = {}) {
    const warrantId = this._warrants.get(intentId);
    if (!warrantId) return; // T0 or no warrant

    try {
      await this._reportExecution(warrantId, result);
      this._warrants.delete(intentId);
    } catch (error) {
      this.logger.error(`[Vienna] Execution report failed:`, error.message);
    }
  }

  /**
   * Get governance statistics.
   */
  getStats() {
    return { ...this.stats };
  }

  // --- Private API calls ---

  async _submitIntent(intentId, toolName, params, tier, context) {
    const response = await fetch(`${this.apiUrl}/api/v1/intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Vienna-Agent': this.agentId,
        'X-Vienna-Framework': 'openclaw'
      },
      body: JSON.stringify({
        intent_id: intentId,
        agent_id: context.agentId || this.agentId,
        framework: 'openclaw',
        action: toolName,
        params: this._sanitizeParams(params),
        objective: `OpenClaw tool call: ${toolName}`,
        metadata: {
          session_key: context.sessionKey,
          risk_tier: tier,
          source: 'openclaw-governance-plugin'
        }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Vienna API error: ${response.status}`);
    }

    return response.json();
  }

  async _reportExecution(warrantId, result) {
    await fetch(`${this.apiUrl}/api/v1/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Vienna-Agent': this.agentId,
        'X-Vienna-Framework': 'openclaw'
      },
      body: JSON.stringify({
        warrant_id: warrantId,
        agent_id: this.agentId,
        success: result.success !== false,
        output: result.output ? String(result.output).slice(0, 10000) : null,
        error: result.error || null,
        completed_at: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(5000)
    });
  }

  async _auditLog(intentId, toolName, params, tier, outcome) {
    try {
      // Fire-and-forget audit log
      fetch(`${this.apiUrl}/api/v1/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Vienna-Agent': this.agentId
        },
        body: JSON.stringify({
          intent_id: intentId,
          action: toolName,
          risk_tier: tier,
          outcome,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {}); // Swallow errors on audit
    } catch {}
  }

  /**
   * Sanitize params to avoid sending secrets
   */
  _sanitizeParams(params) {
    if (!params || typeof params !== 'object') return {};
    
    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Truncate large values
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.slice(0, 1000) + '...[truncated]';
      }
    }

    return sanitized;
  }
}

/**
 * Quick factory function
 */
function createOpenClawPlugin(config = {}) {
  return new OpenClawGovernancePlugin(config);
}

module.exports = { OpenClawGovernancePlugin, createOpenClawPlugin, TOOL_RISK_MAP, ESCALATION_PATTERNS };
