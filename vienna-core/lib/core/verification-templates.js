/**
 * Verification Templates
 * 
 * Reusable verification specifications for common workflows.
 * Templates keep verification deterministic and standardized.
 */

const { CheckType, VerificationStrength } = require('./verification-schema');

/**
 * Verification Template Registry
 */
const VERIFICATION_TEMPLATES = {
  /**
   * Service Recovery Verification
   * 
   * Validates that a service has been successfully restarted and is healthy.
   */
  service_recovery: {
    verification_type: 'service_recovery',
    required_strength: VerificationStrength.OBJECTIVE_STABILITY,
    timeout_ms: 15000,
    stability_window_ms: 5000,
    postconditions: [
      {
        check_id: 'service_active',
        type: CheckType.SYSTEMD_ACTIVE,
        required: true,
        description: 'Service is active'
      },
      {
        check_id: 'port_listening',
        type: CheckType.TCP_PORT_OPEN,
        required: true,
        description: 'Service port is listening'
      },
      {
        check_id: 'healthcheck_ok',
        type: CheckType.HTTP_HEALTHCHECK,
        required: true,
        description: 'Health endpoint returns OK'
      }
    ]
  },

  /**
   * Service Restart Verification
   * 
   * Simpler verification for service restart without health endpoint check.
   */
  service_restart: {
    verification_type: 'service_restart',
    required_strength: VerificationStrength.LOCAL_STATE,
    timeout_ms: 10000,
    stability_window_ms: 3000,
    postconditions: [
      {
        check_id: 'service_active',
        type: CheckType.SYSTEMD_ACTIVE,
        required: true,
        description: 'Service is active'
      }
    ]
  },

  /**
   * HTTP Service Health Verification
   * 
   * Validates that an HTTP service is responding correctly.
   */
  http_service_health: {
    verification_type: 'http_service_health',
    required_strength: VerificationStrength.SERVICE_HEALTH,
    timeout_ms: 10000,
    stability_window_ms: 0,
    postconditions: [
      {
        check_id: 'http_reachable',
        type: CheckType.HTTP_HEALTHCHECK,
        required: true,
        description: 'HTTP endpoint is reachable'
      }
    ]
  },

  /**
   * State Graph Update Verification
   * 
   * Validates that State Graph was successfully updated.
   */
  state_graph_update: {
    verification_type: 'state_graph_update',
    required_strength: VerificationStrength.LOCAL_STATE,
    timeout_ms: 5000,
    stability_window_ms: 0,
    postconditions: [
      {
        check_id: 'state_graph_value',
        type: CheckType.STATE_GRAPH_VALUE,
        required: true,
        description: 'State Graph contains expected value'
      }
    ]
  },

  /**
   * Endpoint Connectivity Verification
   * 
   * Validates that an endpoint is reachable.
   */
  endpoint_connectivity: {
    verification_type: 'endpoint_connectivity',
    required_strength: VerificationStrength.SERVICE_HEALTH,
    timeout_ms: 10000,
    stability_window_ms: 0,
    postconditions: [
      {
        check_id: 'tcp_reachable',
        type: CheckType.TCP_PORT_OPEN,
        required: true,
        description: 'Endpoint is reachable via TCP'
      }
    ]
  },

  /**
   * Query Agent Response Verification
   * 
   * Validates that a query agent responded correctly.
   */
  query_agent_response: {
    verification_type: 'query_agent_response',
    required_strength: VerificationStrength.PROCEDURAL,
    timeout_ms: 5000,
    stability_window_ms: 0,
    postconditions: []
    // Procedural only - validation happens during execution
  },

  /**
   * File Operation Verification
   * 
   * Validates that a file operation completed successfully.
   */
  file_operation: {
    verification_type: 'file_operation',
    required_strength: VerificationStrength.LOCAL_STATE,
    timeout_ms: 5000,
    stability_window_ms: 0,
    postconditions: [
      {
        check_id: 'file_exists',
        type: CheckType.FILE_EXISTS,
        required: true,
        description: 'File exists at expected location'
      }
    ]
  }
};

/**
 * Build verification spec from template
 * 
 * @param {string} templateName - Template identifier
 * @param {Object} context - Context for template expansion (service, port, url, etc.)
 * @returns {Object} Verification spec ready for VerificationTask
 */
function buildVerificationSpec(templateName, context = {}) {
  const template = VERIFICATION_TEMPLATES[templateName];

  if (!template) {
    throw new Error(`Unknown verification template: ${templateName}`);
  }

  // Clone template
  const spec = JSON.parse(JSON.stringify(template));

  // Expand postconditions with context
  spec.postconditions = spec.postconditions.map(check => {
    const expandedCheck = { ...check };

    // Expand target based on check type
    switch (check.type) {
      case CheckType.SYSTEMD_ACTIVE:
        expandedCheck.target = context.service || 'unknown-service';
        break;

      case CheckType.TCP_PORT_OPEN:
        if (context.port) {
          expandedCheck.target = `127.0.0.1:${context.port}`;
        } else if (context.host && context.port) {
          expandedCheck.target = `${context.host}:${context.port}`;
        }
        break;

      case CheckType.HTTP_HEALTHCHECK:
        if (context.health_url) {
          expandedCheck.target = context.health_url;
        } else if (context.port) {
          expandedCheck.target = `http://127.0.0.1:${context.port}/health`;
        }
        expandedCheck.expected_value = context.expected_status || 200;
        break;

      case CheckType.FILE_EXISTS:
      case CheckType.FILE_CONTAINS:
        expandedCheck.target = context.file_path || context.target;
        if (check.type === CheckType.FILE_CONTAINS && context.expected_content) {
          expandedCheck.expected_value = context.expected_content;
        }
        break;

      case CheckType.STATE_GRAPH_VALUE:
        expandedCheck.target = context.entity_type + ':' + context.entity_id;
        expandedCheck.config = {
          field: context.field,
          expected_value: context.expected_value
        };
        break;
    }

    return expandedCheck;
  });

  return spec;
}

/**
 * Get recommended verification template for action
 * 
 * @param {string} action - Action identifier
 * @returns {string|null} Template name
 */
function getRecommendedTemplate(action) {
  const actionTemplateMap = {
    restart_service: 'service_recovery',
    start_service: 'service_restart',
    stop_service: 'service_restart',
    check_health: 'http_service_health',
    query_openclaw_agent: 'query_agent_response',
    query_status: 'endpoint_connectivity',
    inspect_gateway: 'http_service_health',
    collect_logs: null, // No verification needed (read-only)
    run_workflow: null, // Custom verification per workflow
    run_recovery_workflow: null, // Custom verification per workflow
    recovery_action: null, // Custom verification per recovery
    show_status: null, // No verification needed (read-only)
    show_services: null, // No verification needed (read-only)
    show_providers: null, // No verification needed (read-only)
    show_incidents: null, // No verification needed (read-only)
    show_objectives: null, // No verification needed (read-only)
    show_endpoints: null // No verification needed (read-only)
  };

  return actionTemplateMap[action] || null;
}

module.exports = {
  VERIFICATION_TEMPLATES,
  buildVerificationSpec,
  getRecommendedTemplate
};
