/**
 * Verification Engine — Vienna OS
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

import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import type {
  VerificationTask,
  VerificationResult,
  VerificationStatusType,
  VerificationStrengthLevel,
  PostconditionCheck,
  CheckResult,
  CheckHandler,
  CheckEvidence,
  ScopeDriftResult,
  TimingVerificationResult,
  OutputValidationResult,
  OutputSchema,
  StabilityResult,
  StabilityCheck,
  ExecutedAction,
  WarrantForVerification,
  VerificationAuditLogger,
  VerificationEngineOptions,
} from './verification-engine.types.js';

const execAsync = promisify(exec);

// Import schema from JS bridge
const verificationSchemaModule = require('./verification-schema');
const { createVerificationResult, VerificationStatus, VerificationStrength } = verificationSchemaModule;

export class VerificationEngine {
  private checkHandlers: Map<string, CheckHandler>;
  private auditLogger: VerificationAuditLogger | null;

  constructor(options: VerificationEngineOptions = {}) {
    this.checkHandlers = new Map();
    this.auditLogger = options.auditLogger || null;
    this._registerDefaultHandlers();
  }

  /** Register a custom check handler */
  registerCheckHandler(checkType: string, handler: CheckHandler): void {
    this.checkHandlers.set(checkType, handler);
  }

  /**
   * Run verification task — the main entry point.
   * 
   * Performs: postcondition checks, scope drift detection, timing verification,
   * output validation, and stability verification.
   */
  async runVerification(
    verificationTask: VerificationTask,
    warrant: WarrantForVerification | null = null
  ): Promise<VerificationResult> {
    const startedAt = Date.now();
    const timeout = verificationTask.timeout_ms || 15000;
    const stabilityWindow = verificationTask.stability_window_ms || 0;
    const verificationId =
      verificationTask.verification_id ||
      `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this._emitEvent('verification.started', {
      verification_id: verificationId,
      plan_id: verificationTask.plan_id,
      execution_id: verificationTask.execution_id,
      timeout_ms: timeout,
      stability_window_ms: stabilityWindow,
    });

    try {
      // Scope drift detection
      let scopeDriftResult: ScopeDriftResult | null = null;
      if (warrant) {
        scopeDriftResult = this._detectScopeDrift(verificationTask, warrant);
        if (scopeDriftResult.drift_detected) {
          this._emitEvent('verification.scope_drift_detected', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            drift_details: scopeDriftResult,
          });
        }
      }

      // Timing verification
      let timingResult: TimingVerificationResult | null = null;
      if (warrant) {
        timingResult = this._verifyExecutionTiming(verificationTask, warrant, startedAt);
        if (!timingResult.timing_valid) {
          this._emitEvent('verification.timing_violation', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            timing_details: timingResult,
          });
        }
      }

      // Run postcondition checks (with timeout)
      const checkResults = await Promise.race([
        this._runChecks(verificationTask.postconditions),
        this._timeout<CheckResult[]>(timeout),
      ]);

      // Output validation
      let outputValidationResult: OutputValidationResult | null = null;
      if (warrant?.constraints?.output_schema) {
        outputValidationResult = this._validateExecutionOutput(verificationTask, warrant);
        if (!outputValidationResult.schema_valid) {
          this._emitEvent('verification.output_schema_violation', {
            verification_id: verificationId,
            plan_id: verificationTask.plan_id,
            execution_id: verificationTask.execution_id,
            validation_details: outputValidationResult,
          });
        }
      }

      // Check required postconditions
      const requiredChecks = checkResults.filter((r) => r.required !== false);
      const allRequiredPassed = requiredChecks.every((r) => r.status === 'passed');

      // Stability verification (if all checks passed and window requested)
      let stabilityResult: StabilityResult | null = null;
      if (allRequiredPassed && stabilityWindow > 0) {
        stabilityResult = await this._verifyStability(
          verificationTask.postconditions,
          stabilityWindow
        );
      }

      const completedAt = Date.now();

      // Compute final result
      const scopeOk = !scopeDriftResult || !scopeDriftResult.drift_detected;
      const timingOk = !timingResult || timingResult.timing_valid;
      const outputOk = !outputValidationResult || outputValidationResult.schema_valid;
      const stabilityOk = !stabilityResult || stabilityResult.status === 'passed';

      const objectiveAchieved =
        allRequiredPassed && scopeOk && timingOk && outputOk && stabilityOk;

      // Determine status
      let status: string;
      if (objectiveAchieved) {
        status = VerificationStatus.SUCCESS;
      } else if (requiredChecks.some((r) => r.status === 'failed')) {
        status = VerificationStatus.FAILED;
      } else if (!scopeOk || !timingOk || !outputOk) {
        status = VerificationStatus.FAILED;
      } else if (stabilityResult && stabilityResult.status === 'failed') {
        status = VerificationStatus.FAILED;
      } else {
        status = VerificationStatus.INCONCLUSIVE;
      }

      const achievedStrength = this._determineAchievedStrength(
        checkResults,
        stabilityResult,
        verificationTask.verification_strength
      );

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
        summary,
      });

      this._emitEvent('verification.completed', {
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        status,
        objective_achieved: objectiveAchieved,
        verification_time_ms: completedAt - startedAt,
      });

      return result;
    } catch (error: unknown) {
      const completedAt = Date.now();
      const errMsg = error instanceof Error ? error.message : String(error);

      this._emitEvent('verification.failed', {
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        error: errMsg,
        verification_time_ms: completedAt - startedAt,
      });

      const timedOut = errMsg === 'VERIFICATION_TIMEOUT';

      return createVerificationResult({
        verification_id: verificationId,
        plan_id: verificationTask.plan_id,
        execution_id: verificationTask.execution_id,
        status: timedOut ? VerificationStatus.TIMED_OUT : VerificationStatus.FAILED,
        objective_achieved: false,
        verification_strength_achieved: VerificationStrength.PROCEDURAL,
        started_at: startedAt,
        completed_at: completedAt,
        checks: [],
        stability: null,
        summary: timedOut
          ? `Verification timed out after ${timeout}ms`
          : `Verification failed: ${errMsg}`,
      });
    }
  }

  // ─── Check Execution ───

  private async _runChecks(postconditions: PostconditionCheck[]): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

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
            detail: `no handler registered for check type: ${check.type}`,
          },
        });
        continue;
      }

      const result = await handler(check);
      results.push(result);
    }

    return results;
  }

  // ─── Stability Verification ───

  private async _verifyStability(
    postconditions: PostconditionCheck[],
    windowMs: number
  ): Promise<StabilityResult> {
    const startTime = Date.now();
    const checkInterval = Math.min(1000, windowMs / 5);
    const checks: StabilityCheck[] = [];

    while (Date.now() - startTime < windowMs) {
      await this._sleep(checkInterval);

      const checkResults = await this._runChecks(postconditions);
      const allPassed = checkResults.every((r) => r.status === 'passed');

      checks.push({ timestamp: Date.now(), all_passed: allPassed });

      if (!allPassed) {
        return {
          window_ms: windowMs,
          status: 'failed',
          detail: 'postconditions did not remain stable during window',
          checks,
        };
      }
    }

    return {
      window_ms: windowMs,
      status: 'passed',
      detail: 'all required postconditions held for full window',
      checks,
    };
  }

  // ─── Scope Drift Detection ───

  private _detectScopeDrift(
    verificationTask: VerificationTask,
    warrant: WarrantForVerification
  ): ScopeDriftResult {
    try {
      const allowedActions = warrant.allowed_actions || [];
      const executedActions = verificationTask.executed_actions || [];

      const unauthorizedActions = executedActions.filter(
        (action) =>
          !allowedActions.some((allowed) => this._actionMatches(action, allowed))
      );

      return {
        drift_detected: unauthorizedActions.length > 0,
        allowed_actions: allowedActions,
        executed_actions: executedActions,
        unauthorized_actions: unauthorizedActions,
        drift_severity: unauthorizedActions.length > 0
          ? unauthorizedActions.some((a) => a.risk_level === 'high')
            ? 'high'
            : 'medium'
          : 'none',
      };
    } catch (error: unknown) {
      return {
        drift_detected: false,
        error: `Scope drift detection failed: ${error instanceof Error ? error.message : String(error)}`,
        drift_severity: 'unknown',
      };
    }
  }

  // ─── Timing Verification ───

  private _verifyExecutionTiming(
    verificationTask: VerificationTask,
    warrant: WarrantForVerification,
    verificationStartTime: number
  ): TimingVerificationResult {
    try {
      const warrantIssuedAt =
        typeof warrant.issued_at === 'number'
          ? warrant.issued_at
          : warrant.created_at || Date.now();
      const warrantTtlMs = warrant.ttl_ms || 30 * 60 * 1000;
      const warrantExpiresAt = warrantIssuedAt + warrantTtlMs;
      const executionCompletedAt =
        verificationTask.execution_completed_at || verificationStartTime;
      const timingValid = executionCompletedAt <= warrantExpiresAt;

      return {
        timing_valid: timingValid,
        warrant_issued_at: warrantIssuedAt,
        warrant_expires_at: warrantExpiresAt,
        execution_completed_at: executionCompletedAt,
        time_remaining_ms: Math.max(0, warrantExpiresAt - executionCompletedAt),
        violation_details: timingValid
          ? null
          : { exceeded_by_ms: executionCompletedAt - warrantExpiresAt, severity: 'high' },
      };
    } catch (error: unknown) {
      return {
        timing_valid: false,
        error: `Timing verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ─── Output Validation ───

  private _validateExecutionOutput(
    verificationTask: VerificationTask,
    warrant: WarrantForVerification
  ): OutputValidationResult {
    try {
      const outputSchema = warrant.constraints?.output_schema;
      const executionOutput = verificationTask.execution_output || {};

      if (!outputSchema) {
        return { schema_valid: true, message: 'No output schema defined in warrant constraints' };
      }

      const validationResult = this._validateOutputAgainstSchema(executionOutput, outputSchema);

      return {
        schema_valid: validationResult.valid,
        schema: outputSchema,
        actual_output: executionOutput,
        validation_errors: validationResult.errors,
        validation_details: validationResult,
      };
    } catch (error: unknown) {
      return {
        schema_valid: false,
        error: `Output validation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private _validateOutputAgainstSchema(
    output: unknown,
    schema: OutputSchema
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      if (schema.type) {
        const actualType = Array.isArray(output) ? 'array' : typeof output;
        if (actualType !== schema.type) {
          errors.push(`Expected type ${schema.type}, got ${actualType}`);
        }
      }

      if (schema.required && Array.isArray(schema.required) && typeof output === 'object' && output !== null) {
        for (const field of schema.required) {
          if (!(field in (output as Record<string, unknown>))) {
            errors.push(`Required field '${field}' missing`);
          }
        }
      }

      if (schema.properties && typeof output === 'object' && output !== null) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
          if (field in (output as Record<string, unknown>)) {
            const fieldResult = this._validateOutputAgainstSchema(
              (output as Record<string, unknown>)[field],
              fieldSchema
            );
            errors.push(...fieldResult.errors.map((e) => `${field}.${e}`));
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error: unknown) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  // ─── Strength Determination ───

  private _determineAchievedStrength(
    checkResults: CheckResult[],
    stabilityResult: StabilityResult | null,
    _targetStrength?: VerificationStrengthLevel
  ): string {
    const hasStability = stabilityResult?.status === 'passed';
    const hasNetworkChecks = checkResults.some(
      (r) => r.evidence?.source === 'tcp_probe' || r.evidence?.source === 'http_probe'
    );
    const hasSystemdChecks = checkResults.some(
      (r) => r.evidence?.source === 'systemctl'
    );

    if (hasStability) return VerificationStrength.OBJECTIVE_STABILITY;
    if (hasNetworkChecks) return VerificationStrength.SERVICE_HEALTH;
    if (hasSystemdChecks) return VerificationStrength.LOCAL_STATE;
    return VerificationStrength.PROCEDURAL;
  }

  // ─── Summary ───

  private _generateSummary(
    objective: string,
    status: string,
    checkResults: CheckResult[],
    stabilityResult: StabilityResult | null,
    scopeDriftResult: ScopeDriftResult | null,
    timingResult: TimingVerificationResult | null,
    outputValidationResult: OutputValidationResult | null
  ): string {
    const passedCount = checkResults.filter((r) => r.status === 'passed').length;
    const totalCount = checkResults.length;

    if (status === VerificationStatus.SUCCESS) {
      let msg = `${objective} completed successfully. All ${totalCount} postcondition checks passed.`;
      if (stabilityResult) msg += ` Verified stable for ${stabilityResult.window_ms}ms.`;
      if (scopeDriftResult && !scopeDriftResult.drift_detected) msg += ' No scope drift detected.';
      if (timingResult?.timing_valid) msg += ' Execution completed within warrant TTL.';
      if (outputValidationResult?.schema_valid) msg += ' Output schema validation passed.';
      return msg;
    }

    if (status === VerificationStatus.FAILED) {
      const issues: string[] = [];
      const failedChecks = checkResults.filter((r) => r.status === 'failed');
      if (failedChecks.length > 0) issues.push(`Failed checks: ${failedChecks.map((r) => r.check_id).join(', ')}`);
      if (scopeDriftResult?.drift_detected) issues.push('Scope drift detected');
      if (timingResult && !timingResult.timing_valid) issues.push('Timing violation');
      if (outputValidationResult && !outputValidationResult.schema_valid) issues.push('Output schema validation failed');
      if (stabilityResult?.status === 'failed') issues.push('Stability check failed');
      return `${objective} verification failed. ${passedCount}/${totalCount} checks passed. Issues: ${issues.join(', ')}.`;
    }

    return `${objective} verification ${status}. ${passedCount}/${totalCount} checks passed.`;
  }

  // ─── Default Check Handlers ───

  private _registerDefaultHandlers(): void {
    // systemd_active
    this.registerCheckHandler('systemd_active', async (check) => {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${check.target}`);
        const status = stdout.trim();
        return {
          check_id: check.check_id, status: status === 'active' ? 'passed' : 'failed',
          observed_value: status, expected_value: 'active', checked_at: Date.now(),
          evidence: { source: 'systemctl', detail: `service reported ${status}` },
        };
      } catch (error: unknown) {
        return {
          check_id: check.check_id, status: 'failed', observed_value: 'inactive',
          expected_value: 'active', checked_at: Date.now(),
          evidence: { source: 'systemctl', detail: (error as Error).message },
        };
      }
    });

    // tcp_port_open
    this.registerCheckHandler('tcp_port_open', async (check) => {
      const [host, portStr] = check.target.split(':');
      const port = parseInt(portStr, 10);
      const timeout = 3000;

      return new Promise<CheckResult>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on('connect', () => {
          socket.destroy();
          resolve({
            check_id: check.check_id, status: 'passed', observed_value: true,
            expected_value: true, checked_at: Date.now(),
            evidence: { source: 'tcp_probe', detail: `${check.target} accepted connection` },
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            check_id: check.check_id, status: 'failed', observed_value: false,
            expected_value: true, checked_at: Date.now(),
            evidence: { source: 'tcp_probe', detail: `connection to ${check.target} timed out after ${timeout}ms` },
          });
        });

        socket.on('error', (err) => {
          socket.destroy();
          resolve({
            check_id: check.check_id, status: 'failed', observed_value: false,
            expected_value: true, checked_at: Date.now(),
            evidence: { source: 'tcp_probe', detail: `connection failed: ${err.message}` },
          });
        });

        socket.connect(port, host);
      });
    });

    // http_healthcheck
    this.registerCheckHandler('http_healthcheck', async (check) => {
      return new Promise<CheckResult>((resolve) => {
        const url = new URL(check.target);
        const protocol = url.protocol === 'https:' ? https : http;
        const expectedStatus = (check.expected_value as number) || 200;

        const req = protocol.get(check.target, { timeout: 5000 }, (res) => {
          resolve({
            check_id: check.check_id, status: res.statusCode === expectedStatus ? 'passed' : 'failed',
            observed_value: res.statusCode, expected_value: expectedStatus, checked_at: Date.now(),
            evidence: { source: 'http_probe', detail: `${check.target} returned ${res.statusCode}` },
          });
        });

        req.on('error', (err) => {
          resolve({
            check_id: check.check_id, status: 'failed', observed_value: null,
            expected_value: expectedStatus, checked_at: Date.now(),
            evidence: { source: 'http_probe', detail: `request failed: ${err.message}` },
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            check_id: check.check_id, status: 'failed', observed_value: null,
            expected_value: expectedStatus, checked_at: Date.now(),
            evidence: { source: 'http_probe', detail: 'request timed out after 5000ms' },
          });
        });
      });
    });

    // file_exists
    this.registerCheckHandler('file_exists', async (check) => {
      const exists = fs.existsSync(check.target);
      return {
        check_id: check.check_id, status: exists ? 'passed' : 'failed',
        observed_value: exists, expected_value: true, checked_at: Date.now(),
        evidence: { source: 'filesystem', detail: exists ? `file exists at ${check.target}` : `file not found at ${check.target}` },
      };
    });

    // file_contains
    this.registerCheckHandler('file_contains', async (check) => {
      try {
        if (!fs.existsSync(check.target)) {
          return {
            check_id: check.check_id, status: 'failed' as const, observed_value: null,
            expected_value: check.expected_value, checked_at: Date.now(),
            evidence: { source: 'filesystem', detail: `file not found at ${check.target}` },
          };
        }
        const content = fs.readFileSync(check.target, 'utf8');
        const contains = content.includes(String(check.expected_value));
        return {
          check_id: check.check_id, status: contains ? 'passed' as const : 'failed' as const,
          observed_value: contains, expected_value: true, checked_at: Date.now(),
          evidence: { source: 'filesystem', detail: contains ? 'expected content found' : 'expected content not found' },
        };
      } catch (error: unknown) {
        return {
          check_id: check.check_id, status: 'failed' as const, observed_value: null,
          expected_value: check.expected_value, checked_at: Date.now(),
          evidence: { source: 'filesystem', detail: `error reading file: ${(error as Error).message}` },
        };
      }
    });
  }

  // ─── Helpers ───

  private _actionMatches(executedAction: ExecutedAction, allowedAction: string): boolean {
    return executedAction.type === allowedAction || executedAction.action === allowedAction;
  }

  private _timeout<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('VERIFICATION_TIMEOUT')), ms);
    });
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private _emitEvent(eventType: string, data: Record<string, unknown>): void {
    if (!this.auditLogger) return;
    try {
      this.auditLogger.logVerificationEvent({ timestamp: Date.now(), event_type: eventType, ...data });
    } catch (error) {
      console.error('[VerificationEngine] Failed to emit verification event:', error);
    }
  }
}

export default VerificationEngine;
