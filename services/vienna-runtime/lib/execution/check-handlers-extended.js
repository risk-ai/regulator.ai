/**
 * Extended Check Handlers — Phase 17.1
 * 
 * Implements additional check handlers for extended verification templates.
 * 
 * New check types:
 * - DATABASE_QUERY
 * - SYSTEMD_ENABLED
 * - SYSTEMD_LOG_CHECK
 * - DNS_RESOLUTION
 * - TLS_CERTIFICATE_VALID
 * - CONTAINER_STATE
 * - CONTAINER_HEALTH
 * - CONTAINER_RESTART_COUNT
 * - HTTP_BODY_CONTAINS
 * - HTTP_RESPONSE_TIME
 * - HTTP_AUTH_VALID
 * - JSON_SCHEMA_VALID
 * - FILE_PERMISSIONS
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const net = require('net');
const http = require('http');
const https = require('https');
const dns = require('dns').promises;

/**
 * Database Query Check
 * 
 * Executes SQL query against SQLite database.
 */
async function checkDatabaseQuery(parameters, context = {}) {
  const { query, timeout_ms = 5000, contains = null } = parameters;
  const dbPath = context.db_path || parameters.db_path;

  if (!dbPath) {
    return {
      success: false,
      error: 'Database path not provided',
      check_type: 'DATABASE_QUERY'
    };
  }

  try {
    const cmd = `echo "${query}" | sqlite3 "${dbPath}" -cmd ".timeout ${timeout_ms}"`;
    const { stdout, stderr } = await execAsync(cmd, { timeout: timeout_ms });

    if (stderr) {
      return {
        success: false,
        error: stderr,
        check_type: 'DATABASE_QUERY'
      };
    }

    // If contains check specified
    if (contains && Array.isArray(contains)) {
      const output = stdout.toLowerCase();
      const allFound = contains.every(term => 
        output.includes(term.toLowerCase())
      );

      if (!allFound) {
        return {
          success: false,
          error: `Query result missing expected values: ${contains.join(', ')}`,
          output: stdout,
          check_type: 'DATABASE_QUERY'
        };
      }
    }

    return {
      success: true,
      output: stdout.trim(),
      check_type: 'DATABASE_QUERY'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'DATABASE_QUERY'
    };
  }
}

/**
 * Systemd Enabled Check
 * 
 * Checks if service is enabled for auto-start.
 */
async function checkSystemdEnabled(parameters, context = {}) {
  const { service_name } = parameters;

  if (!service_name) {
    return {
      success: false,
      error: 'Service name not provided',
      check_type: 'SYSTEMD_ENABLED'
    };
  }

  try {
    const { stdout } = await execAsync(`systemctl is-enabled ${service_name}`);
    const enabled = stdout.trim() === 'enabled';

    return {
      success: enabled,
      enabled,
      status: stdout.trim(),
      check_type: 'SYSTEMD_ENABLED'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 'disabled',
      check_type: 'SYSTEMD_ENABLED'
    };
  }
}

/**
 * Systemd Log Check
 * 
 * Searches recent logs for error patterns.
 */
async function checkSystemdLog(parameters, context = {}) {
  const { service_name, since = '5 minutes ago', not_contains = [] } = parameters;

  if (!service_name) {
    return {
      success: false,
      error: 'Service name not provided',
      check_type: 'SYSTEMD_LOG_CHECK'
    };
  }

  try {
    const cmd = `journalctl -u ${service_name} --since="${since}" --no-pager`;
    const { stdout } = await execAsync(cmd);

    const logs = stdout.toLowerCase();
    const foundPatterns = not_contains.filter(pattern => 
      logs.includes(pattern.toLowerCase())
    );

    if (foundPatterns.length > 0) {
      return {
        success: false,
        error: `Found unwanted patterns in logs: ${foundPatterns.join(', ')}`,
        found_patterns: foundPatterns,
        check_type: 'SYSTEMD_LOG_CHECK'
      };
    }

    return {
      success: true,
      check_type: 'SYSTEMD_LOG_CHECK'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'SYSTEMD_LOG_CHECK'
    };
  }
}

/**
 * DNS Resolution Check
 * 
 * Resolves hostname to IP address.
 */
async function checkDnsResolution(parameters, context = {}) {
  const { hostname } = parameters;

  if (!hostname) {
    return {
      success: false,
      error: 'Hostname not provided',
      check_type: 'DNS_RESOLUTION'
    };
  }

  try {
    const addresses = await dns.resolve4(hostname);

    return {
      success: true,
      addresses,
      check_type: 'DNS_RESOLUTION'
    };

  } catch (error) {
    const errorType = error.code === 'ENOTFOUND' ? 'nxdomain' :
                      error.code === 'ETIMEOUT' ? 'timeout' :
                      error.code === 'ESERVFAIL' ? 'servfail' :
                      'unknown';

    return {
      success: false,
      error: error.message,
      error_type: errorType,
      check_type: 'DNS_RESOLUTION'
    };
  }
}

/**
 * TLS Certificate Valid Check
 * 
 * Validates TLS certificate for hostname.
 */
async function checkTlsCertificate(parameters, context = {}) {
  const { hostname, port = 443 } = parameters;

  if (!hostname) {
    return {
      success: false,
      error: 'Hostname not provided',
      check_type: 'TLS_CERTIFICATE_VALID'
    };
  }

  return new Promise((resolve) => {
    const options = {
      host: hostname,
      port,
      method: 'GET',
      rejectUnauthorized: true // Strict validation
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      resolve({
        success: true,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
        subject: cert.subject,
        issuer: cert.issuer,
        check_type: 'TLS_CERTIFICATE_VALID'
      });
    });

    req.on('error', (error) => {
      const errorType = error.message.includes('expired') ? 'expired' :
                       error.message.includes('self signed') ? 'self_signed' :
                       error.message.includes('hostname') ? 'hostname_mismatch' :
                       'unknown';

      resolve({
        success: false,
        error: error.message,
        error_type: errorType,
        check_type: 'TLS_CERTIFICATE_VALID'
      });
    });

    req.end();
  });
}

/**
 * Container State Check
 * 
 * Checks Docker/Podman container state.
 */
async function checkContainerState(parameters, context = {}) {
  const { container_name, state: expected_state } = parameters;
  const runtime = context.container_runtime || 'docker';

  if (!container_name) {
    return {
      success: false,
      error: 'Container name not provided',
      check_type: 'CONTAINER_STATE'
    };
  }

  try {
    const cmd = `${runtime} inspect --format='{{.State.Status}}' ${container_name}`;
    const { stdout } = await execAsync(cmd);
    const actualState = stdout.trim();

    const success = !expected_state || actualState === expected_state;

    return {
      success,
      state: actualState,
      expected: expected_state,
      check_type: 'CONTAINER_STATE'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'CONTAINER_STATE'
    };
  }
}

/**
 * Container Health Check
 * 
 * Checks Docker/Podman container health status.
 */
async function checkContainerHealth(parameters, context = {}) {
  const { container_name, health_status: expected } = parameters;
  const runtime = context.container_runtime || 'docker';

  if (!container_name) {
    return {
      success: false,
      error: 'Container name not provided',
      check_type: 'CONTAINER_HEALTH'
    };
  }

  try {
    const cmd = `${runtime} inspect --format='{{.State.Health.Status}}' ${container_name}`;
    const { stdout } = await execAsync(cmd);
    const actualHealth = stdout.trim();

    const success = !expected || actualHealth === expected;

    return {
      success,
      health_status: actualHealth,
      expected,
      check_type: 'CONTAINER_HEALTH'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'CONTAINER_HEALTH'
    };
  }
}

/**
 * Container Restart Count Check
 * 
 * Checks for excessive container restarts (restart loop detection).
 */
async function checkContainerRestartCount(parameters, context = {}) {
  const { container_name, max_recent_restarts = 3, window_minutes = 5 } = parameters;
  const runtime = context.container_runtime || 'docker';

  if (!container_name) {
    return {
      success: false,
      error: 'Container name not provided',
      check_type: 'CONTAINER_RESTART_COUNT'
    };
  }

  try {
    // Get container started time and restart count
    const cmd = `${runtime} inspect --format='{{.RestartCount}}|{{.State.StartedAt}}' ${container_name}`;
    const { stdout } = await execAsync(cmd);
    const [restartCount, startedAt] = stdout.trim().split('|');

    const restarts = parseInt(restartCount, 10);
    const startTime = new Date(startedAt);
    const now = new Date();
    const ageMinutes = (now - startTime) / 1000 / 60;

    // If container is very new and has many restarts = restart loop
    if (ageMinutes < window_minutes && restarts > max_recent_restarts) {
      return {
        success: false,
        error: 'Container in restart loop',
        restart_count: restarts,
        age_minutes: ageMinutes,
        check_type: 'CONTAINER_RESTART_COUNT'
      };
    }

    return {
      success: true,
      restart_count: restarts,
      age_minutes: ageMinutes,
      check_type: 'CONTAINER_RESTART_COUNT'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'CONTAINER_RESTART_COUNT'
    };
  }
}

/**
 * HTTP Body Contains Check
 * 
 * Checks if HTTP response body contains expected strings.
 */
async function checkHttpBodyContains(parameters, context = {}) {
  const { url, body_contains = [], case_insensitive = true, timeout_ms = 5000 } = parameters;

  if (!url) {
    return {
      success: false,
      error: 'URL not provided',
      check_type: 'HTTP_BODY_CONTAINS'
    };
  }

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: timeout_ms }, (res) => {
      let body = '';
      
      res.on('data', chunk => { body += chunk; });
      
      res.on('end', () => {
        const searchBody = case_insensitive ? body.toLowerCase() : body;
        const searchTerms = case_insensitive ? 
          body_contains.map(t => t.toLowerCase()) : 
          body_contains;

        const foundAll = searchTerms.every(term => searchBody.includes(term));

        resolve({
          success: foundAll,
          found_terms: searchTerms.filter(term => searchBody.includes(term)),
          missing_terms: searchTerms.filter(term => !searchBody.includes(term)),
          check_type: 'HTTP_BODY_CONTAINS'
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        check_type: 'HTTP_BODY_CONTAINS'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        check_type: 'HTTP_BODY_CONTAINS'
      });
    });
  });
}

/**
 * HTTP Response Time Check
 * 
 * Validates response time is under threshold.
 */
async function checkHttpResponseTime(parameters, context = {}) {
  const { url, max_ms = 1000, timeout_ms = 5000 } = parameters;

  if (!url) {
    return {
      success: false,
      error: 'URL not provided',
      check_type: 'HTTP_RESPONSE_TIME'
    };
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: timeout_ms }, (res) => {
      const responseTime = Date.now() - startTime;
      
      res.on('data', () => {}); // Consume response
      res.on('end', () => {
        resolve({
          success: responseTime <= max_ms,
          response_time_ms: responseTime,
          max_ms,
          check_type: 'HTTP_RESPONSE_TIME'
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        response_time_ms: Date.now() - startTime,
        check_type: 'HTTP_RESPONSE_TIME'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        response_time_ms: Date.now() - startTime,
        check_type: 'HTTP_RESPONSE_TIME'
      });
    });
  });
}

/**
 * HTTP Auth Valid Check
 * 
 * Validates HTTP authentication.
 */
async function checkHttpAuthValid(parameters, context = {}) {
  const { url, headers = {}, timeout_ms = 5000 } = parameters;

  if (!url) {
    return {
      success: false,
      error: 'URL not provided',
      check_type: 'HTTP_AUTH_VALID'
    };
  }

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers,
      timeout: timeout_ms
    };

    const req = protocol.request(options, (res) => {
      const success = res.statusCode !== 401 && res.statusCode !== 403;
      
      const errorType = res.statusCode === 401 ? 'invalid_token' :
                       res.statusCode === 403 ? 'expired_token' :
                       null;

      resolve({
        success,
        status_code: res.statusCode,
        error_type: errorType,
        check_type: 'HTTP_AUTH_VALID'
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        check_type: 'HTTP_AUTH_VALID'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        check_type: 'HTTP_AUTH_VALID'
      });
    });

    req.end();
  });
}

/**
 * JSON Schema Valid Check
 * 
 * Validates JSON response against schema (simple implementation).
 */
async function checkJsonSchemaValid(parameters, context = {}) {
  const { url, schema = {}, timeout_ms = 5000 } = parameters;

  if (!url) {
    return {
      success: false,
      error: 'URL not provided',
      check_type: 'JSON_SCHEMA_VALID'
    };
  }

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, { timeout: timeout_ms }, (res) => {
      let body = '';
      
      res.on('data', chunk => { body += chunk; });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          
          // Simple schema validation (check required fields exist)
          const requiredFields = schema.required || [];
          const missingFields = requiredFields.filter(field => !(field in json));

          if (missingFields.length > 0) {
            resolve({
              success: false,
              error: `Missing required fields: ${missingFields.join(', ')}`,
              missing_fields: missingFields,
              check_type: 'JSON_SCHEMA_VALID'
            });
          } else {
            resolve({
              success: true,
              check_type: 'JSON_SCHEMA_VALID'
            });
          }

        } catch (error) {
          resolve({
            success: false,
            error: `Invalid JSON: ${error.message}`,
            check_type: 'JSON_SCHEMA_VALID'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        check_type: 'JSON_SCHEMA_VALID'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        check_type: 'JSON_SCHEMA_VALID'
      });
    });
  });
}

/**
 * File Permissions Check
 * 
 * Validates file permissions match expected mode.
 */
async function checkFilePermissions(parameters, context = {}) {
  const { file_path, mode: expected_mode } = parameters;

  if (!file_path) {
    return {
      success: false,
      error: 'File path not provided',
      check_type: 'FILE_PERMISSIONS'
    };
  }

  try {
    const stats = await fs.stat(file_path);
    const actualMode = '0' + (stats.mode & parseInt('777', 8)).toString(8);

    const success = !expected_mode || actualMode === expected_mode;

    return {
      success,
      actual_mode: actualMode,
      expected_mode,
      check_type: 'FILE_PERMISSIONS'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      check_type: 'FILE_PERMISSIONS'
    };
  }
}

module.exports = {
  checkDatabaseQuery,
  checkSystemdEnabled,
  checkSystemdLog,
  checkDnsResolution,
  checkTlsCertificate,
  checkContainerState,
  checkContainerHealth,
  checkContainerRestartCount,
  checkHttpBodyContains,
  checkHttpResponseTime,
  checkHttpAuthValid,
  checkJsonSchemaValid,
  checkFilePermissions
};
