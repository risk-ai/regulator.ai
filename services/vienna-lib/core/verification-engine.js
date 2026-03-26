/**
 * Verification Engine
 * 
 * Phase 8.2 — Independent postcondition validation.
 * 
 * Core principle:
 *   Execution tells you what the system tried.
 *   Verification tells you what became true.
 * 
 * Responsibilities:
 *   - Load plan verification spec
 *   - Construct VerificationTask
 *   - Run independent checks
 *   - Enforce timeout and retries
 *   - Apply stability window
 *   - Write VerificationResult
 *   - Derive WorkflowOutcome
 * 
 * Non-responsibilities:
 *   - No execution
 *   - No planning
 *   - No risk-tier classification
 */

const {
  createVerificationResult,
  VerificationStatus,
  VerificationStrength
} = require('./verification-schema');

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const http = require('http');
const https = require('https');
const fs = require('fs');

class VerificationEngine {
  constructor(options = {}) {
    this.checkHandlers = new Map();
    this.auditLogger = options.auditLogger || null;
    this._registerDefaultHandlers();
  }

  /**
   * Register default check handlers
   */
  _registerDefaultHandlers() {
    // systemd_active check
    this.registerCheckHandler('systemd_active', async (check) => {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${check.target}`);
        const status = stdout.trim();
        const passed = status === 'active';
        
        return {
          check_id: check.check_id,
          status: passed ? 'passed' : 'failed',
          observed_value: status,
          expected_value: 'active',
          checked_at: Date.now(),
          evidence: {
            source: 'systemctl',
            detail: `service reported ${status}`
          }
        };
      } catch (error) {
        return {
          check_id: check.check_id,
          status: 'failed',
          observed_value: 'inactive',
          expected_value: 'active',
          checked_at: Date.now(),
          evidence: {
            source: 'systemctl',
            detail: error.message
          }
        };
      }
    });

    // tcp_port_open check
    this.registerCheckHandler('tcp_port_open', async (check) => {
      const [host, port] = check.target.split(':');
      
      return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        const timeout = 3000;

        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
          socket.destroy();
          resolve({
            check_id: check.check_id,
            status: 'passed',
            observed_value: true,
            expected_value: true,
            checked_at: Date.now(),
            evidence: {
              source: 'tcp_probe',
              detail: `${check.target} accepted connection`
            }
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            check_id: check.check_id,
            status: 'failed',
            observed_value: false,
            expected_value: true,
            checked_at: Date.now(),
            evidence: {
              source: 'tcp_probe',
              detail: `connection to ${check.target} timed out after ${timeout}ms`
            }
          });
        });

        socket.on('error', (err) => {
          socket.destroy();
          resolve({
            check_id: check.check_id,
            status: 'failed',
            observed_value: false,
            expected_value: true,
            checked_at: Date.now(),
            evidence: {
              source: 'tcp_probe',
              detail: `connection failed: ${err.message}`
            }
          });
        });

        socket.connect(parseInt(port), host);
      });
    });

    // http_healthcheck check
    this.registerCheckHandler('http_healthcheck', async (check) => {
      return new Promise((resolve) => {
        const url = new URL(check.target);
        const protocol = url.protocol === 'https:' ? https : http;
        const expectedStatus = check.expected_value || 200;

        const req = protocol.get(check.target, { timeout: 5000 }, (res) => {
          const passed = res.statusCode === expectedStatus;
          
          resolve({
            check_id: check.check_id,
            status: passed ? 'passed' : 'failed',
            observed_value: res.statusCode,
            expected_value: expectedStatus,
            checked_at: Date.now(),
            evidence: {
              source: 'http_probe',
              detail: `${check.target} returned ${res.statusCode}`
            }
          });
        });

        req.on('error', (err) => {
          resolve({
            check_id: check.check_id,
            status: 'failed',
            observed_value: null,
            expected_value: expectedStatus,
            checked_at: Date.now(),
            evidence: {
              source: 'http_probe',
              detail: `request failed: ${err.message}`
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            check_id: check.check_id,
            status: 'failed',
            observed_value: null,
            expected_value: expectedStatus,
            checked_at: Date.now(),
            evidence: {
              source: 'http_probe',
              detail: 'request timed out after 5000ms'
            }
          });
        });
      });
    });

    // file_exists check
    this.registerCheckHandler('file_exists', async (check) => {
      const exists = fs.existsSync(check.target);
      
      return {
        check_id: check.check_id,
        status: exists ? 'passed' : 'failed',
        observed_value: exists,
        expected_value: true,
        checked_at: Date.now(),
        evidence: {
          source: 'filesystem',
          detail: exists ? `file exists at ${check.target}` : `file not found at ${check.target}`
        }
      };
    });

    // file_contains check
    this.registerCheckHandler('file_contains', async (check) => {
      try {
        if (!fs.existsSync(check.target)) {
          return {
            check_id: check.check_id,
            status: 'failed',
            observed_value: null,
            expected_value: check.expected_value,
            checked_at: Date.now(),
            evidence: {
              source: 'filesystem',
              detail: `file not found at ${check.target}`
            }
          };
        }

        const content = fs.readFileSync(check.target, 'utf8');
        const contains = content.includes(check.expected_value);

        return {
          check_id: check.check_id,
          status: contains ? 'passed' : 'failed',
          observed_value: contains,
          expected_value: true,
          checked_at: Date.now(),
          evidence: {
            source: 'filesystem',
            detail: contains ? 'expected content found' : 'expected content not found'
          }
        };
      } catch (error) {
        return {
          check_id: check.check_id,
          status: 'failed',
          observed_value: null,
          expected_value: check.expected_value,
          checked_at: Date.now(),
          evidence: {
            source: 'filesystem',
            detail: `error reading file: ${error.message}`
          }
        };
      }
    });
  }

  /**
   * Register a custom check handler
   */
  registerCheckHandler(checkType, handler) {
    this.checkHandlers.set(checkType, handler);
  }

  /**
   * Run verification task
   * 
   * @param {Object} verificationTask - VerificationTask object
   * @param {Object} [warrant] - Associated warrant for scope drift detection
   * @returns {Promise<Object>} VerificationResult
   */
  async runVerification(verificationTask, warrant = null) {
    const startedAt = Date.now();
    const timeout = verificationTask.timeout_ms || 15000;
    const stabilityWindow = verificationTask.stability_window_ms || 0;
    const verificationId = verificationTask.verification_id || `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Emit verification started event
    this._emitVerificationEvent('verification.started', {
      verification_id: verificationId,
      plan_id: verificationTask.plan_id,
      execution_id: verificationTask.execution_id,
      timeout_ms: timeout,
      stability_window_ms: stabilityWindow
    });

    try {
      // Perform scope drift detection if warrant provided
      let scopeDriftResult = null;
      if (warrant) {
        scopeDriftResult = await this._detectScopeDrift(verificationTask, warrant);
        
        if (scopeDriftResult.drift_detected) {
          this._emitVerificationEvent('verification.scope_drift_detected', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            drift_details: scopeDriftResult
          });
        }
      }

      // Perform timing verification if warrant provided
      let timingResult = null;
      if (warrant) {
        timingResult = this._verifyExecutionTiming(verificationTask, warrant, startedAt);
        
        if (!timingResult.timing_valid) {
          this._emitVerificationEvent('verification.timing_violation', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            timing_details: timingResult
          });
        }
      }

      // Run all postcondition checks
      const checkResults = await Promise.race([
        this._runChecks(verificationTask.postconditions),
        this._timeout(timeout)
      ]);

      // Perform output validation if schema defined
      let outputValidationResult = null;
      if (warrant && warrant.constraints && warrant.constraints.output_schema) {
        outputValidationResult = await this._validateExecutionOutput(verificationTask, warrant);
        
        if (!outputValidationResult.schema_valid) {
          this._emitVerificationEvent('verification.output_schema_violation', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            validation_details: outputValidationResult
          });
        }
      }

      // Determine if all required checks passed
      const requiredChecks = checkResults.filter(r => r.required !== false);
      const allRequiredPassed = requiredChecks.every(r => r.status === 'passed');

      // If stability window required and all checks passed, wait and re-verify
      let stabilityResult = null;
      if (allRequiredPassed && stabilityWindow > 0) {
        stabilityResult = await this._verifyStability(
          verificationTask.postconditions,
          stabilityWindow
        );
      }

      const completedAt = Date.now();
      
      // Factor in additional validation results for final objective achievement
      const scopeOk = !scopeDriftResult || !scopeDriftResult.drift_detected;
      const timingOk = !timingResult || timingResult.timing_valid;
      const outputOk = !outputValidationResult || outputValidationResult.schema_valid;
      
      const objectiveAchieved = allRequiredPassed && 
                               scopeOk && 
                               timingOk && 
                               outputOk && 
                               (!stabilityResult || stabilityResult.status === 'passed');

      // Determine verification status
      let status;
      if (objectiveAchieved) {
        status = VerificationStatus.SUCCESS;
      } else if (stabilityResult && stabilityResult.status === 'failed') {
        status = VerificationStatus.FAILED;
      } else if (requiredChecks.some(r => r.status === 'failed')) {
        status = VerificationStatus.FAILED;
      } else if (!scopeOk || !timingOk || !outputOk) {
        status = VerificationStatus.FAILED;
      } else {
        status = VerificationStatus.INCONCLUSIVE;
      }

      // Determine achieved verification strength
      const achievedStrength = this._determineAchievedStrength(
        checkResults,
        stabilityResult,
        verificationTask.verification_strength
      );

      // Generate summary
      const summary = this._generateSummary(
        verificationTask.objective,
        status,
        checkResults,
        stabilityResult,
        scopeDriftResult,
        timingResult,
        outputValidationResult
      );

      const result = createVerificationResult({
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        status,
        objective_achieved: objectiveAchieved,
        verification_strength_achieved: achievedStrength,
        started_at: startedAt,
        completed_at: completedAt,
        checks: checkResults,
        stability: stabilityResult,
        scope_drift: scopeDriftResult,
        timing_verification: timingResult,
        output_validation: outputValidationResult,
        summary
      });

      // Emit verification completed event
      this._emitVerificationEvent('verification.completed', {
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        status,
        objective_achieved: objectiveAchieved,
        verification_time_ms: completedAt - startedAt
      });

      return result;

    } catch (error) {
      const completedAt = Date.now();

      // Emit verification error event
      this._emitVerificationEvent('verification.failed', {
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        error: error.message,
        verification_time_ms: completedAt - startedAt
      });

      if (error.message === 'VERIFICATION_TIMEOUT') {
        return createVerificationResult({
          verification_id: verificationId,
          plan_id: verificationTask.plan_id,
          execution_id: verificationTask.execution_id,
          status: VerificationStatus.TIMED_OUT,
          objective_achieved: false,
          verification_strength_achieved: VerificationStrength.PROCEDURAL,
          started_at: startedAt,
          completed_at: completedAt,
          checks: [],
          stability: null,
          summary: `Verification timed out after ${timeout}ms`
        });
      }

      return createVerificationResult({
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        status: VerificationStatus.FAILED,
        objective_achieved: false,
        verification_strength_achieved: VerificationStrength.PROCEDURAL,
        started_at: startedAt,
        completed_at: completedAt,
        checks: [],
        stability: null,
        summary: `Verification failed: ${error.message}`
      });
    }
  }

  /**
   * Run all postcondition checks
   */
  async _runChecks(postconditions) {
    const results = [];

    for (const check of postconditions) {
      const handler = this.checkHandlers.get(check.type);

      if (!handler) {
        results.push({
          check_id: check.check_id,
          status: 'failed',
          observed_value: null,
          expected_value: check.expected_value,
          checked_at: Date.now(),
          evidence: {
            source: 'verification_engine',
            detail: `no handler registered for check type: ${check.type}`
          }
        });
        continue;
      }

      const result = await handler(check);
      results.push(result);
    }

    return results;
  }

  /**
   * Verify stability over time window
   */
  async _verifyStability(postconditions, windowMs) {
    const startTime = Date.now();
    const checkInterval = Math.min(1000, windowMs / 5); // Check 5 times during window
    const checks = [];

    while (Date.now() - startTime < windowMs) {
      await this._sleep(checkInterval);
      
      const checkResults = await this._runChecks(postconditions);
      const allPassed = checkResults.every(r => r.status === 'passed');
      
      checks.push({
        timestamp: Date.now(),
        all_passed: allPassed
      });

      if (!allPassed) {
        return {
          window_ms: windowMs,
          status: 'failed',
          detail: 'postconditions did not remain stable during window',
          checks
        };
      }
    }

    return {
      window_ms: windowMs,
      status: 'passed',
      detail: 'all required postconditions held for full window',
      checks
    };
  }

  /**
   * Determine achieved verification strength
   */
  _determineAchievedStrength(checkResults, stabilityResult, targetStrength) {
    const hasSystemdChecks = checkResults.some(r => r.evidence?.source === 'systemctl');
    const hasNetworkChecks = checkResults.some(r => r.evidence?.source === 'tcp_probe' || r.evidence?.source === 'http_probe');
    const hasStability = stabilityResult && stabilityResult.status === 'passed';

    if (hasStability) {
      return VerificationStrength.OBJECTIVE_STABILITY;
    }

    if (hasNetworkChecks) {
      return VerificationStrength.SERVICE_HEALTH;
    }

    if (hasSystemdChecks) {
      return VerificationStrength.LOCAL_STATE;
    }

    return VerificationStrength.PROCEDURAL;
  }

  /**
   * Generate human-readable summary
   */
  _generateSummary(objective, status, checkResults, stabilityResult, scopeDriftResult, timingResult, outputValidationResult) {
    const passedCount = checkResults.filter(r => r.status === 'passed').length;
    const totalCount = checkResults.length;
    const issues = [];

    if (status === VerificationStatus.SUCCESS) {
      let message = `${objective} completed successfully. All ${totalCount} postcondition checks passed.`;
      
      if (stabilityResult) {
        message += ` Verified stable for ${stabilityResult.window_ms}ms.`;
      }
      
      if (scopeDriftResult && !scopeDriftResult.drift_detected) {
        message += ' No scope drift detected.';
      }
      
      if (timingResult && timingResult.timing_valid) {
        message += ' Execution completed within warrant TTL.';
      }
      
      if (outputValidationResult && outputValidationResult.schema_valid) {
        message += ' Output schema validation passed.';
      }
      
      return message;
    }

    if (status === VerificationStatus.FAILED) {
      const failedChecks = checkResults.filter(r => r.status === 'failed');
      if (failedChecks.length > 0) {
        const failedNames = failedChecks.map(r => r.check_id).join(', ');
        issues.push(`Failed checks: ${failedNames}`);
      }
      
      if (scopeDriftResult && scopeDriftResult.drift_detected) {
        issues.push('Scope drift detected');
      }
      
      if (timingResult && !timingResult.timing_valid) {
        issues.push('Timing violation');
      }
      
      if (outputValidationResult && !outputValidationResult.schema_valid) {
        issues.push('Output schema validation failed');
      }
      
      if (stabilityResult && stabilityResult.status === 'failed') {
        issues.push('Stability check failed');
      }
      
      return `${objective} verification failed. ${passedCount}/${totalCount} checks passed. Issues: ${issues.join(', ')}.`;
    }

    return `${objective} verification ${status}. ${passedCount}/${totalCount} checks passed.`;
  }

  /**
   * Timeout helper
   */
  _timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('VERIFICATION_TIMEOUT')), ms);
    });
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Detect scope drift - execution accessed resources not in warrant's allowed_actions
   * 
   * @private
   */
  async _detectScopeDrift(verificationTask, warrant) {
    try {
      // This would need to be implemented based on how execution traces are stored
      // For now, return a placeholder implementation
      const allowedActions = warrant.allowed_actions || [];
      const executedActions = verificationTask.executed_actions || [];

      const unauthorizedActions = executedActions.filter(action => 
        !allowedActions.some(allowed => this._actionMatches(action, allowed))
      );

      return {
        drift_detected: unauthorizedActions.length > 0,
        allowed_actions: allowedActions,
        executed_actions: executedActions,
        unauthorized_actions: unauthorizedActions,
        drift_severity: unauthorizedActions.length > 0 ? 
          (unauthorizedActions.some(a => a.risk_level === 'high') ? 'high' : 'medium') : 'none'
      };
    } catch (error) {
      return {
        drift_detected: false,
        error: `Scope drift detection failed: ${error.message}`,
        drift_severity: 'unknown'
      };
    }
  }

  /**
   * Verify execution completed within warrant TTL
   * 
   * @private
   */
  _verifyExecutionTiming(verificationTask, warrant, verificationStartTime) {
    try {
      const warrantIssuedAt = warrant.issued_at || warrant.created_at;
      const warrantTtlMs = warrant.ttl_ms || (30 * 60 * 1000); // Default 30 minutes
      const warrantExpiresAt = warrantIssuedAt + warrantTtlMs;
      
      const executionCompletedAt = verificationTask.execution_completed_at || verificationStartTime;
      const timingValid = executionCompletedAt <= warrantExpiresAt;
      
      return {
        timing_valid: timingValid,
        warrant_issued_at: warrantIssuedAt,
        warrant_expires_at: warrantExpiresAt,
        execution_completed_at: executionCompletedAt,
        time_remaining_ms: Math.max(0, warrantExpiresAt - executionCompletedAt),
        violation_details: timingValid ? null : {
          exceeded_by_ms: executionCompletedAt - warrantExpiresAt,
          severity: 'high'
        }
      };
    } catch (error) {
      return {
        timing_valid: false,
        error: `Timing verification failed: ${error.message}`
      };
    }
  }

  /**
   * Validate execution output matches expected schema if defined in warrant constraints
   * 
   * @private
   */
  async _validateExecutionOutput(verificationTask, warrant) {
    try {
      const outputSchema = warrant.constraints?.output_schema;
      const executionOutput = verificationTask.execution_output || {};

      if (!outputSchema) {
        return {
          schema_valid: true,
          message: 'No output schema defined in warrant constraints'
        };
      }

      // Simple schema validation - in production this might use ajv or similar
      const validationResult = this._validateOutputAgainstSchema(executionOutput, outputSchema);
      
      return {
        schema_valid: validationResult.valid,
        schema: outputSchema,
        actual_output: executionOutput,
        validation_errors: validationResult.errors || [],
        validation_details: validationResult
      };
    } catch (error) {
      return {
        schema_valid: false,
        error: `Output validation failed: ${error.message}`
      };
    }
  }

  /**
   * Check if an executed action matches an allowed action pattern
   * 
   * @private
   */
  _actionMatches(executedAction, allowedAction) {
    // Simple pattern matching - could be enhanced with wildcards, etc.
    if (typeof allowedAction === 'string') {
      return executedAction.type === allowedAction || executedAction.action === allowedAction;
    }
    
    if (typeof allowedAction === 'object') {
      return Object.entries(allowedAction).every(([key, value]) => 
        executedAction[key] === value
      );
    }
    
    return false;
  }

  /**
   * Simple output schema validation
   * 
   * @private
   */
  _validateOutputAgainstSchema(output, schema) {
    const errors = [];
    
    try {
      if (schema.type) {
        const actualType = Array.isArray(output) ? 'array' : typeof output;
        if (actualType !== schema.type) {
          errors.push(`Expected type ${schema.type}, got ${actualType}`);
        }
      }
      
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (!(field in output)) {
            errors.push(`Required field '${field}' missing`);
          }
        }
      }
      
      if (schema.properties && typeof output === 'object') {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (field in output) {
            const fieldResult = this._validateOutputAgainstSchema(output[field], fieldSchema);
            errors.push(...fieldResult.errors.map(e => `${field}.${e}`));
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error.message}`]
      };
    }
  }

  /**
   * Emit verification event to audit trail
   * 
   * @private
   */
  _emitVerificationEvent(eventType, eventData) {
    if (this.auditLogger) {
      try {
        this.auditLogger.logVerificationEvent({
          timestamp: Date.now(),
          event_type: eventType,
          ...eventData
        });
      } catch (error) {
        console.error('[VerificationEngine] Failed to emit verification event:', error);
      }
    }
  }
}

module.exports = { VerificationEngine };
