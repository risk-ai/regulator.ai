/**
 * Vienna OS — Framework Adapter
 * 
 * Generic adapter interface for AI agent frameworks to integrate with Vienna OS.
 * Provides a standard protocol for any framework (LangChain, CrewAI, AutoGen,
 * Google ADK, OpenAI Agents SDK) to submit intents and receive warrants.
 * 
 * Usage:
 *   const adapter = new FrameworkAdapter({ apiUrl: 'https://api.regulator.ai', apiKey: 'vos_xxx' });
 *   const result = await adapter.submitIntent({ action: 'deploy_code', params: { service: 'api' } });
 *   if (result.approved) {
 *     // Execute with warrant
 *     await adapter.reportExecution(result.warrant_id, { success: true, output: '...' });
 *   }
 */

const crypto = require('crypto');

class FrameworkAdapter {
  /**
   * @param {object} config
   * @param {string} config.apiUrl - Vienna OS API URL
   * @param {string} config.apiKey - API key (vos_xxx format)
   * @param {string} config.agentId - Agent identifier
   * @param {string} [config.framework] - Framework name (langchain, crewai, autogen, etc.)
   * @param {function} [config.fetch] - Custom fetch implementation
   */
  constructor(config) {
    if (!config.apiUrl) throw new Error('apiUrl required');
    if (!config.apiKey) throw new Error('apiKey required');
    if (!config.agentId) throw new Error('agentId required');

    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.framework = config.framework || 'unknown';
    this._fetch = config.fetch || globalThis.fetch;
    this._requestSigningKey = config.requestSigningKey || null;
  }

  /**
   * Submit an intent for governance evaluation.
   * Returns immediately with approval status and warrant (if auto-approved),
   * or a pending status requiring polling/webhook for T2/T3.
   * 
   * @param {object} intent
   * @param {string} intent.action - Action to perform
   * @param {object} [intent.params] - Action parameters
   * @param {string} [intent.objective] - Human-readable description
   * @param {object} [intent.metadata] - Framework-specific metadata
   * @returns {Promise<IntentResult>}
   */
  async submitIntent(intent) {
    const body = {
      agent_id: this.agentId,
      framework: this.framework,
      action: intent.action,
      params: intent.params || {},
      objective: intent.objective || `${intent.action} via ${this.framework}`,
      metadata: intent.metadata || {},
      timestamp: new Date().toISOString()
    };

    // Optional request signing (HMAC)
    const headers = this._buildHeaders(body);

    const response = await this._fetch(`${this.apiUrl}/v1/intents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new ViennaError(`Intent submission failed: ${error.message}`, response.status);
    }

    return response.json();
  }

  /**
   * Check the status of a pending intent (for T2/T3 awaiting approval).
   * 
   * @param {string} intentId
   * @returns {Promise<IntentResult>}
   */
  async checkIntent(intentId) {
    const response = await this._fetch(`${this.apiUrl}/v1/intents/${intentId}`, {
      method: 'GET',
      headers: this._buildHeaders()
    });

    if (!response.ok) {
      throw new ViennaError(`Intent check failed`, response.status);
    }

    return response.json();
  }

  /**
   * Wait for an intent to be resolved (approved or denied).
   * Polls with exponential backoff.
   * 
   * @param {string} intentId
   * @param {object} [options]
   * @param {number} [options.timeoutMs=300000] - Max wait time (5 min default)
   * @param {number} [options.intervalMs=2000] - Initial poll interval
   * @returns {Promise<IntentResult>}
   */
  async waitForApproval(intentId, options = {}) {
    const timeoutMs = options.timeoutMs || 300000;
    const initialInterval = options.intervalMs || 2000;
    const maxInterval = 30000;
    
    const deadline = Date.now() + timeoutMs;
    let interval = initialInterval;

    while (Date.now() < deadline) {
      const result = await this.checkIntent(intentId);
      
      if (result.status !== 'pending') {
        return result;
      }

      await new Promise(r => setTimeout(r, interval));
      interval = Math.min(interval * 1.5, maxInterval);
    }

    throw new ViennaError(`Approval timeout after ${timeoutMs}ms`, 408);
  }

  /**
   * Report execution result back to Vienna OS.
   * Required after warrant-authorized execution completes.
   * 
   * @param {string} warrantId
   * @param {object} result
   * @param {boolean} result.success
   * @param {string} [result.output]
   * @param {object} [result.metrics] - Execution metrics (duration, resources)
   * @param {string} [result.error] - Error message if failed
   * @returns {Promise<void>}
   */
  async reportExecution(warrantId, result) {
    const body = {
      warrant_id: warrantId,
      agent_id: this.agentId,
      framework: this.framework,
      success: result.success,
      output: result.output || null,
      error: result.error || null,
      metrics: result.metrics || {},
      completed_at: new Date().toISOString()
    };

    const response = await this._fetch(`${this.apiUrl}/v1/executions`, {
      method: 'POST',
      headers: this._buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new ViennaError(`Execution report failed`, response.status);
    }
  }

  /**
   * Register this agent with Vienna OS.
   * Should be called once during agent initialization.
   * 
   * @param {object} registration
   * @param {string} registration.name - Agent display name
   * @param {string[]} [registration.capabilities] - List of actions this agent can perform
   * @param {object} [registration.config] - Agent-specific config
   * @returns {Promise<object>} Registration confirmation
   */
  async register(registration) {
    const body = {
      agent_id: this.agentId,
      framework: this.framework,
      name: registration.name,
      capabilities: registration.capabilities || [],
      config: registration.config || {},
      registered_at: new Date().toISOString()
    };

    const response = await this._fetch(`${this.apiUrl}/v1/agents`, {
      method: 'POST',
      headers: this._buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new ViennaError(`Agent registration failed`, response.status);
    }

    return response.json();
  }

  /**
   * Send a heartbeat (agent is alive and operational).
   * 
   * @param {object} [status] - Optional status payload
   * @returns {Promise<void>}
   */
  async heartbeat(status = {}) {
    const response = await this._fetch(`${this.apiUrl}/v1/agents/${this.agentId}/heartbeat`, {
      method: 'POST',
      headers: this._buildHeaders(),
      body: JSON.stringify({ ...status, timestamp: new Date().toISOString() })
    });

    if (!response.ok) {
      throw new ViennaError(`Heartbeat failed`, response.status);
    }
  }

  // --- Private helpers ---

  _buildHeaders(body) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Vienna-Agent': this.agentId,
      'X-Vienna-Framework': this.framework
    };

    // Optional HMAC request signing for enhanced security
    if (this._requestSigningKey && body) {
      const payload = JSON.stringify(body);
      const signature = crypto
        .createHmac('sha256', this._requestSigningKey)
        .update(payload)
        .digest('hex');
      headers['X-Vienna-Signature'] = `hmac-sha256:${signature}`;
    }

    return headers;
  }
}

class ViennaError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ViennaError';
    this.statusCode = statusCode;
  }
}

/**
 * Convenience factory functions for popular frameworks
 */
function createLangChainAdapter(config) {
  return new FrameworkAdapter({ ...config, framework: 'langchain' });
}

function createCrewAIAdapter(config) {
  return new FrameworkAdapter({ ...config, framework: 'crewai' });
}

function createAutoGenAdapter(config) {
  return new FrameworkAdapter({ ...config, framework: 'autogen' });
}

function createOpenClawAdapter(config) {
  return new FrameworkAdapter({ ...config, framework: 'openclaw' });
}

module.exports = {
  FrameworkAdapter,
  ViennaError,
  createLangChainAdapter,
  createCrewAIAdapter,
  createAutoGenAdapter,
  createOpenClawAdapter
};
