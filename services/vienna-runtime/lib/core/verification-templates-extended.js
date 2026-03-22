/**
 * Extended Verification Templates — Phase 17.1
 * 
 * Service-specific verification with retry-awareness and failure classification.
 * 
 * Core principles:
 * 1. Each template knows its transient vs permanent failure modes
 * 2. Templates encode retry logic (when to retry, how many times)
 * 3. Service-specific postconditions (HTTP, DB, infra)
 */

const { CheckType, VerificationStrength } = require('./verification-schema');

/**
 * Failure classification
 */
const FailureClass = {
  TRANSIENT: 'transient',           // Retry may succeed
  PERMANENT: 'permanent',           // Retry will not help
  CONFIGURATION: 'configuration',   // Requires config change
  DEPENDENCY: 'dependency'          // External system unavailable
};

/**
 * Extended verification templates with retry-awareness
 */
const EXTENDED_VERIFICATION_TEMPLATES = {
  /**
   * HTTP Service with Health Endpoint
   * 
   * Validates HTTP service with detailed health checks.
   * Distinguishes transient failures (503, timeout) from permanent (404, 500).
   */
  http_service_full: {
    verification_type: 'http_service_full',
    required_strength: VerificationStrength.OBJECTIVE_STABILITY,
    timeout_ms: 20000,
    stability_window_ms: 5000,
    retry_policy: {
      max_attempts: 3,
      backoff_ms: [2000, 5000, 10000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'port_listening',
        type: CheckType.TCP_PORT_OPEN,
        required: true,
        description: 'Service port is open',
        failure_classification: {
          port_closed: FailureClass.TRANSIENT,
          connection_refused: FailureClass.TRANSIENT,
          dns_failure: FailureClass.CONFIGURATION
        }
      },
      {
        check_id: 'http_reachable',
        type: CheckType.HTTP_HEALTHCHECK,
        required: true,
        description: 'HTTP endpoint responds',
        expect: {
          status_code: [200, 204],
          timeout_ms: 5000
        },
        failure_classification: {
          timeout: FailureClass.TRANSIENT,
          503: FailureClass.TRANSIENT,
          502: FailureClass.DEPENDENCY,
          404: FailureClass.CONFIGURATION,
          500: FailureClass.PERMANENT,
          401: FailureClass.CONFIGURATION,
          403: FailureClass.CONFIGURATION
        }
      },
      {
        check_id: 'health_response_valid',
        type: CheckType.HTTP_BODY_CONTAINS,
        required: false,
        description: 'Health response contains expected marker',
        expect: {
          body_contains: ['healthy', 'ok', 'ready'],
          case_insensitive: true
        }
      },
      {
        check_id: 'response_time_acceptable',
        type: CheckType.HTTP_RESPONSE_TIME,
        required: false,
        description: 'Response time under threshold',
        expect: {
          max_ms: 1000
        },
        failure_classification: {
          slow_response: FailureClass.TRANSIENT
        }
      }
    ]
  },

  /**
   * Database Connection Verification
   * 
   * Validates database connectivity and query execution.
   */
  database_connection: {
    verification_type: 'database_connection',
    required_strength: VerificationStrength.SERVICE_HEALTH,
    timeout_ms: 15000,
    stability_window_ms: 3000,
    retry_policy: {
      max_attempts: 3,
      backoff_ms: [1000, 3000, 5000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'db_port_open',
        type: CheckType.TCP_PORT_OPEN,
        required: true,
        description: 'Database port is accessible',
        failure_classification: {
          port_closed: FailureClass.TRANSIENT,
          connection_refused: FailureClass.TRANSIENT,
          network_unreachable: FailureClass.DEPENDENCY
        }
      },
      {
        check_id: 'db_auth_valid',
        type: CheckType.DATABASE_QUERY,
        required: true,
        description: 'Database authentication successful',
        expect: {
          query: 'SELECT 1',
          timeout_ms: 5000
        },
        failure_classification: {
          auth_failed: FailureClass.CONFIGURATION,
          timeout: FailureClass.TRANSIENT,
          connection_error: FailureClass.TRANSIENT
        }
      },
      {
        check_id: 'db_schema_valid',
        type: CheckType.DATABASE_QUERY,
        required: false,
        description: 'Expected schema exists',
        expect: {
          query: 'SELECT name FROM sqlite_master WHERE type="table"',
          contains: ['services', 'providers', 'incidents']
        }
      }
    ]
  },

  /**
   * Systemd Service Verification
   * 
   * Validates systemd service state with detailed status checks.
   */
  systemd_service_full: {
    verification_type: 'systemd_service_full',
    required_strength: VerificationStrength.OBJECTIVE_STABILITY,
    timeout_ms: 15000,
    stability_window_ms: 5000,
    retry_policy: {
      max_attempts: 2,
      backoff_ms: [3000, 7000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'service_active',
        type: CheckType.SYSTEMD_ACTIVE,
        required: true,
        description: 'Service is in active state',
        failure_classification: {
          inactive: FailureClass.TRANSIENT,
          failed: FailureClass.PERMANENT,
          activating: FailureClass.TRANSIENT
        }
      },
      {
        check_id: 'service_enabled',
        type: CheckType.SYSTEMD_ENABLED,
        required: false,
        description: 'Service is enabled for auto-start',
        failure_classification: {
          disabled: FailureClass.CONFIGURATION
        }
      },
      {
        check_id: 'no_recent_failures',
        type: CheckType.SYSTEMD_LOG_CHECK,
        required: false,
        description: 'No failure messages in recent logs',
        expect: {
          since: '5 minutes ago',
          not_contains: ['failed', 'error', 'crash']
        }
      }
    ]
  },

  /**
   * File System Operation Verification
   * 
   * Validates file/directory operations.
   */
  filesystem_operation: {
    verification_type: 'filesystem_operation',
    required_strength: VerificationStrength.LOCAL_STATE,
    timeout_ms: 5000,
    stability_window_ms: 0,
    retry_policy: {
      max_attempts: 2,
      backoff_ms: [500, 1000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'file_exists',
        type: CheckType.FILE_EXISTS,
        required: true,
        description: 'Target file exists',
        failure_classification: {
          not_found: FailureClass.TRANSIENT,
          permission_denied: FailureClass.CONFIGURATION,
          io_error: FailureClass.TRANSIENT
        }
      },
      {
        check_id: 'file_content_valid',
        type: CheckType.FILE_CONTAINS,
        required: false,
        description: 'File contains expected content',
        expect: {
          contains: [] // Populated at runtime
        }
      },
      {
        check_id: 'file_permissions',
        type: CheckType.FILE_PERMISSIONS,
        required: false,
        description: 'File has correct permissions',
        expect: {
          mode: '0644'
        },
        failure_classification: {
          wrong_permissions: FailureClass.CONFIGURATION
        }
      }
    ]
  },

  /**
   * Network Endpoint Verification
   * 
   * Validates network connectivity with detailed diagnostics.
   */
  network_endpoint: {
    verification_type: 'network_endpoint',
    required_strength: VerificationStrength.SERVICE_HEALTH,
    timeout_ms: 10000,
    stability_window_ms: 2000,
    retry_policy: {
      max_attempts: 3,
      backoff_ms: [1000, 2000, 4000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'dns_resolves',
        type: CheckType.DNS_RESOLUTION,
        required: true,
        description: 'Hostname resolves to IP',
        failure_classification: {
          nxdomain: FailureClass.CONFIGURATION,
          timeout: FailureClass.TRANSIENT,
          servfail: FailureClass.DEPENDENCY
        }
      },
      {
        check_id: 'port_reachable',
        type: CheckType.TCP_PORT_OPEN,
        required: true,
        description: 'Port is reachable',
        failure_classification: {
          connection_refused: FailureClass.TRANSIENT,
          timeout: FailureClass.DEPENDENCY,
          network_unreachable: FailureClass.DEPENDENCY
        }
      },
      {
        check_id: 'tls_valid',
        type: CheckType.TLS_CERTIFICATE_VALID,
        required: false,
        description: 'TLS certificate is valid',
        failure_classification: {
          expired: FailureClass.CONFIGURATION,
          self_signed: FailureClass.CONFIGURATION,
          hostname_mismatch: FailureClass.CONFIGURATION
        }
      }
    ]
  },

  /**
   * Container Service Verification
   * 
   * Validates Docker/Podman container state.
   */
  container_service: {
    verification_type: 'container_service',
    required_strength: VerificationStrength.OBJECTIVE_STABILITY,
    timeout_ms: 20000,
    stability_window_ms: 5000,
    retry_policy: {
      max_attempts: 3,
      backoff_ms: [2000, 5000, 10000],
      retry_on: [FailureClass.TRANSIENT]
    },
    postconditions: [
      {
        check_id: 'container_running',
        type: CheckType.CONTAINER_STATE,
        required: true,
        description: 'Container is in running state',
        expect: {
          state: 'running'
        },
        failure_classification: {
          exited: FailureClass.PERMANENT,
          restarting: FailureClass.TRANSIENT,
          paused: FailureClass.CONFIGURATION,
          dead: FailureClass.PERMANENT
        }
      },
      {
        check_id: 'container_healthy',
        type: CheckType.CONTAINER_HEALTH,
        required: false,
        description: 'Container health check passing',
        expect: {
          health_status: 'healthy'
        },
        failure_classification: {
          unhealthy: FailureClass.TRANSIENT,
          starting: FailureClass.TRANSIENT
        }
      },
      {
        check_id: 'container_not_restarting',
        type: CheckType.CONTAINER_RESTART_COUNT,
        required: false,
        description: 'Container not in restart loop',
        expect: {
          max_recent_restarts: 3,
          window_minutes: 5
        },
        failure_classification: {
          restart_loop: FailureClass.PERMANENT
        }
      }
    ]
  },

  /**
   * API Endpoint Verification
   * 
   * Validates API endpoint with auth and response validation.
   */
  api_endpoint: {
    verification_type: 'api_endpoint',
    required_strength: VerificationStrength.SERVICE_HEALTH,
    timeout_ms: 15000,
    stability_window_ms: 3000,
    retry_policy: {
      max_attempts: 3,
      backoff_ms: [1000, 3000, 5000],
      retry_on: [FailureClass.TRANSIENT, FailureClass.DEPENDENCY]
    },
    postconditions: [
      {
        check_id: 'api_reachable',
        type: CheckType.HTTP_HEALTHCHECK,
        required: true,
        description: 'API endpoint is reachable',
        expect: {
          status_code: [200, 201],
          timeout_ms: 5000,
          headers: {} // Populated at runtime
        },
        failure_classification: {
          timeout: FailureClass.TRANSIENT,
          503: FailureClass.TRANSIENT,
          502: FailureClass.DEPENDENCY,
          401: FailureClass.CONFIGURATION,
          403: FailureClass.CONFIGURATION,
          404: FailureClass.CONFIGURATION,
          500: FailureClass.PERMANENT
        }
      },
      {
        check_id: 'api_response_valid',
        type: CheckType.JSON_SCHEMA_VALID,
        required: false,
        description: 'API response matches schema',
        expect: {
          schema: {} // Populated at runtime
        },
        failure_classification: {
          schema_mismatch: FailureClass.PERMANENT
        }
      },
      {
        check_id: 'api_auth_valid',
        type: CheckType.HTTP_AUTH_VALID,
        required: false,
        description: 'API authentication successful',
        failure_classification: {
          invalid_token: FailureClass.CONFIGURATION,
          expired_token: FailureClass.CONFIGURATION
        }
      }
    ]
  }
};

/**
 * Failure classifier
 * 
 * Determines failure classification from check result.
 */
function classifyFailure(check, result) {
  if (!check.failure_classification) {
    // No classification rules = assume permanent
    return FailureClass.PERMANENT;
  }

  // Match against failure_classification rules
  for (const [pattern, classification] of Object.entries(check.failure_classification)) {
    if (matchesFailurePattern(result, pattern)) {
      return classification;
    }
  }

  // Default to permanent if no match
  return FailureClass.PERMANENT;
}

/**
 * Check if result matches failure pattern
 */
function matchesFailurePattern(result, pattern) {
  // HTTP status code
  if (typeof pattern === 'number' && result.status_code === pattern) {
    return true;
  }

  // String matching (error messages, status strings)
  if (typeof pattern === 'string') {
    const resultStr = JSON.stringify(result).toLowerCase();
    return resultStr.includes(pattern.toLowerCase());
  }

  return false;
}

/**
 * Get retry policy for verification type
 */
function getRetryPolicy(verificationType) {
  const template = EXTENDED_VERIFICATION_TEMPLATES[verificationType];
  return template?.retry_policy || null;
}

/**
 * Should retry based on failure classification?
 */
function shouldRetry(verificationType, failureClass, attemptNumber) {
  const retryPolicy = getRetryPolicy(verificationType);
  
  if (!retryPolicy) {
    return false;
  }

  if (attemptNumber >= retryPolicy.max_attempts) {
    return false;
  }

  return retryPolicy.retry_on.includes(failureClass);
}

/**
 * Get backoff delay for retry attempt
 */
function getBackoffDelay(verificationType, attemptNumber) {
  const retryPolicy = getRetryPolicy(verificationType);
  
  if (!retryPolicy || !retryPolicy.backoff_ms) {
    return 1000; // Default 1s
  }

  const index = Math.min(attemptNumber - 1, retryPolicy.backoff_ms.length - 1);
  return retryPolicy.backoff_ms[index];
}

module.exports = {
  EXTENDED_VERIFICATION_TEMPLATES,
  FailureClass,
  classifyFailure,
  shouldRetry,
  getBackoffDelay,
  getRetryPolicy
};
