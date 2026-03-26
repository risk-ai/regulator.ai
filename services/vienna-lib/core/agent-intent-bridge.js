/**
 * Agent Intent Bridge v1
 * 
 * Inbound bridge: OpenClaw agents → Vienna Intent Gateway
 * 
 * Design:
 * - Thin translation layer (<200 lines)
 * - NO business logic
 * - NO execution authority
 * - NO policy/quota/budget enforcement
 * - Vienna remains sole execution plane
 * 
 * Flow:
 * 1. Receive agent request
 * 2. Authenticate caller
 * 3. Resolve tenant server-side
 * 4. Validate action against allowlist
 * 5. Translate to Vienna intent
 * 6. Submit to /api/v1/intent
 * 7. Return canonical Vienna response
 */

const { nanoid } = require('nanoid');

/**
 * v1 Action Allowlist
 * 
 * Strict mapping: agent action → Vienna intent type
 */
const ACTION_ALLOWLIST = new Map([
  ['check_health', {
    intent_type: 'check_system_health',
    risk_tier: 'T0',
    schema: {
      target: 'string' // optional
    }
  }],
  ['list_objectives', {
    intent_type: 'list_objectives',
    risk_tier: 'T0',
    schema: {}
  }],
  ['query_state_graph', {
    intent_type: 'query_state_graph',
    risk_tier: 'T0',
    schema: {
      query: 'string'
    }
  }],
  ['check_system_status', {
    intent_type: 'check_system_status',
    risk_tier: 'T0',
    schema: {}
  }],
  ['list_recent_executions', {
    intent_type: 'list_recent_executions',
    risk_tier: 'T0',
    schema: {
      limit: 'number'
    }
  }],
  ['restart_service', {
    intent_type: 'restart_service',
    risk_tier: 'T1',
    schema: {
      service: 'string'
    }
  }],
  ['check_service_logs', {
    intent_type: 'check_service_logs',
    risk_tier: 'T0',
    schema: {
      service: 'string',
      lines: 'number'
    }
  }],
  ['trigger_backup', {
    intent_type: 'trigger_backup',
    risk_tier: 'T1',
    schema: {}
  }],
  ['run_diagnostic', {
    intent_type: 'run_diagnostic',
    risk_tier: 'T0',
    schema: {
      check: 'string'
    }
  }],
  ['update_configuration', {
    intent_type: 'update_configuration',
    risk_tier: 'T2',
    schema: {
      key: 'string',
      value: 'string'
    }
  }],
  ['check_execution_status', {
    intent_type: 'check_execution_status',
    risk_tier: 'T0',
    schema: {
      execution_id: 'string'
    }
  }]
]);

/**
 * Agent Intent Bridge
 */
class AgentIntentBridge {
  constructor(intentGateway) {
    this.intentGateway = intentGateway;
  }

  /**
   * Process agent request
   * 
   * @param {Object} agentRequest - Agent request
   * @param {Object} authContext - Authentication context
   * @returns {Promise<Object>} Vienna response
   */
  async processAgentRequest(agentRequest, authContext) {
    // Step 1: Authenticate
    const authResult = this._authenticateRequest(agentRequest, authContext);
    if (!authResult.valid) {
      return this._errorResponse('UNAUTHORIZED', authResult.error);
    }

    // Step 2: Resolve tenant
    const tenant = this._resolveTenant(authContext);

    // Step 3: Validate action
    const actionValidation = this._validateAction(agentRequest);
    if (!actionValidation.valid) {
      return this._errorResponse('ACTION_NOT_ALLOWED', actionValidation.error, {
        allowed_actions: Array.from(ACTION_ALLOWLIST.keys())
      });
    }

    // Step 4: Validate payload
    const payloadValidation = this._validatePayload(agentRequest);
    if (!payloadValidation.valid) {
      return this._errorResponse('INVALID_PAYLOAD', payloadValidation.error);
    }

    // Step 5: Translate to Vienna intent
    const viennaIntent = this._translateToIntent(agentRequest, tenant);

    // Step 6: Submit to Vienna
    try {
      const viennaResponse = await this.intentGateway.submitIntent(viennaIntent);
      
      // Step 7: Return canonical response with metadata
      return this._normalizeResponse(viennaResponse, agentRequest, viennaIntent);
    } catch (error) {
      return this._errorResponse('VIENNA_UNAVAILABLE', error.message);
    }
  }

  /**
   * Authenticate agent request
   * 
   * @private
   */
  _authenticateRequest(agentRequest, authContext) {
    // Validate source.platform (accept multiple valid sources)
    const sourcePlatform = typeof agentRequest.source === 'string' 
      ? agentRequest.source 
      : agentRequest.source?.platform;
    
    // Allowed sources: openclaw (agents), web (marketing /try page), api (direct API), try (demo)
    const validSources = ['openclaw', 'web', 'api', 'try'];
    
    if (!sourcePlatform || !validSources.includes(sourcePlatform)) {
      return {
        valid: false,
        error: `Invalid source. Must be one of: ${validSources.join(', ')}`
      };
    }

    // In v1, auth is simple: require authContext with tenant
    if (!authContext || !authContext.tenant) {
      return {
        valid: false,
        error: 'Invalid agent credentials'
      };
    }

    return { valid: true };
  }

  /**
   * Resolve tenant server-side
   * 
   * @private
   */
  _resolveTenant(authContext) {
    // Server-side tenant resolution
    // Never trust client-supplied tenant blindly
    return authContext.tenant;
  }

  /**
   * Validate action against allowlist
   * 
   * @private
   */
  _validateAction(agentRequest) {
    const { action } = agentRequest;

    if (!action || typeof action !== 'string') {
      return {
        valid: false,
        error: 'action required (string)'
      };
    }

    if (!ACTION_ALLOWLIST.has(action)) {
      return {
        valid: false,
        error: `Action '${action}' not in allowlist`
      };
    }

    return { valid: true };
  }

  /**
   * Validate payload against action schema
   * 
   * @private
   */
  _validatePayload(agentRequest) {
    const { action, payload = {} } = agentRequest;
    const actionDef = ACTION_ALLOWLIST.get(action);

    // Simple schema validation for v1
    // In production, use JSON schema validator
    for (const [field, type] of Object.entries(actionDef.schema)) {
      if (payload[field] !== undefined && typeof payload[field] !== type) {
        return {
          valid: false,
          error: `Field '${field}' must be ${type}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Translate agent request to Vienna intent
   * 
   * @private
   */
  _translateToIntent(agentRequest, tenant) {
    const { action, payload = {}, simulation = false, source, context } = agentRequest;
    const actionDef = ACTION_ALLOWLIST.get(action);

    // Support both source object and context object (legacy)
    const sourceData = source || context || {};
    const platform = typeof sourceData === 'string' ? sourceData : (sourceData.platform || 'openclaw');

    return {
      intent_type: actionDef.intent_type,
      payload: payload,
      simulation: simulation,
      tenant_id: tenant,
      source: {
        type: 'agent',
        id: sourceData.agent_id || 'unknown',
        platform: platform,
        user_id: sourceData.user_id,
        conversation_id: sourceData.conversation_id,
        message_id: sourceData.message_id
      },
      metadata: {
        original_action: action,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Normalize Vienna response
   * 
   * @private
   */
  _normalizeResponse(viennaResponse, agentRequest, viennaIntent) {
    // Normalize Vienna response to canonical agent response structure
    // Map Vienna's fields to agent expectations
    
    const status = viennaResponse.simulation ? 'simulated' :
                   viennaResponse.accepted ? 'executed' :
                   viennaResponse.error ? 'failed' : 'blocked';
    
    return {
      success: viennaResponse.accepted && !viennaResponse.error,
      status: status,
      simulation: viennaResponse.simulation || false,
      explanation: viennaResponse.explanation || viennaResponse.message || null,
      result: viennaResponse.metadata || viennaResponse.result || null,
      cost: viennaResponse.cost || null,
      attestation: viennaResponse.attestation || null,
      error: viennaResponse.error || null,
      metadata: {
        agent_request_id: `agent_req_${nanoid(8)}`,
        vienna_intent_id: viennaResponse.intent_id || null,
        mapped_action: agentRequest.action,
        source: agentRequest.source,
        execution_id: viennaResponse.execution_id || null,
        quota_state: viennaResponse.quota_state || null
      }
    };
  }

  /**
   * Error response
   * 
   * @private
   */
  _errorResponse(code, message, details = null) {
    const response = {
      success: false,
      error: {
        code: code,
        message: message
      }
    };

    if (details) {
      response.error.details = details;
    }

    return response;
  }

  /**
   * List allowed actions (for debugging/docs)
   */
  listAllowedActions() {
    return Array.from(ACTION_ALLOWLIST.entries()).map(([action, def]) => ({
      action: action,
      intent_type: def.intent_type,
      risk_tier: def.risk_tier
    }));
  }
}

module.exports = { AgentIntentBridge, ACTION_ALLOWLIST };
