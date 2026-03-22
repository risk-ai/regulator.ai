/**
 * Extended Verification Engine — Phase 17.1
 * 
 * Retry-aware verification with failure classification.
 * 
 * Integrates with extended verification templates to:
 * 1. Classify failures (transient vs permanent)
 * 2. Retry transient failures with backoff
 * 3. Report detailed failure reasons to operator
 */

const { VerificationEngine } = require('./verification-engine');
const {
  EXTENDED_VERIFICATION_TEMPLATES,
  FailureClass,
  classifyFailure,
  shouldRetry,
  getBackoffDelay
} = require('./verification-templates-extended');

/**
 * Extended verification result
 */
class ExtendedVerificationResult {
  constructor(baseResult, metadata = {}) {
    this.baseResult = baseResult;
    this.attempts = metadata.attempts || 1;
    this.failureClass = metadata.failureClass || null;
    this.retryHistory = metadata.retryHistory || [];
    this.finalFailureReason = metadata.finalFailureReason || null;
    this.totalDuration = metadata.totalDuration || 0;
  }

  toJSON() {
    return {
      ...this.baseResult,
      verification_metadata: {
        attempts: this.attempts,
        failure_class: this.failureClass,
        retry_history: this.retryHistory,
        final_failure_reason: this.finalFailureReason,
        total_duration_ms: this.totalDuration
      }
    };
  }
}

/**
 * Extended Verification Engine
 * 
 * Wraps base VerificationEngine with retry logic and failure classification.
 */
class ExtendedVerificationEngine extends VerificationEngine {
  constructor(stateGraph, chatActionBridge) {
    super(stateGraph, chatActionBridge);
  }

  /**
   * Run verification with retry logic
   * 
   * @param {object} verificationTask - Verification task
   * @param {object} context - Execution context
   * @returns {Promise<ExtendedVerificationResult>}
   */
  async runVerificationWithRetry(verificationTask, context = {}) {
    const startTime = Date.now();
    const retryHistory = [];
    let attemptNumber = 1;
    let lastResult = null;
    let lastFailureClass = null;

    while (true) {
      try {
        // Run verification attempt
        const result = await super.runVerification(verificationTask, context);

        // If successful, return immediately
        if (result.objective_achieved) {
          return new ExtendedVerificationResult(result, {
            attempts: attemptNumber,
            retryHistory,
            totalDuration: Date.now() - startTime
          });
        }

        // Failed - classify failure
        lastResult = result;
        lastFailureClass = this._classifyVerificationFailure(verificationTask, result);

        // Record attempt
        retryHistory.push({
          attempt: attemptNumber,
          timestamp: new Date().toISOString(),
          failure_class: lastFailureClass,
          checks_failed: result.checks_failed || []
        });

        // Should retry?
        if (shouldRetry(verificationTask.verification_type, lastFailureClass, attemptNumber)) {
          const backoffMs = getBackoffDelay(verificationTask.verification_type, attemptNumber);
          
          retryHistory.push({
            action: 'retry_scheduled',
            backoff_ms: backoffMs,
            timestamp: new Date().toISOString()
          });

          await this._sleep(backoffMs);
          attemptNumber++;
          continue;
        }

        // No more retries - return final failure
        return new ExtendedVerificationResult(lastResult, {
          attempts: attemptNumber,
          failureClass: lastFailureClass,
          retryHistory,
          finalFailureReason: this._buildFailureReason(verificationTask, lastResult, lastFailureClass),
          totalDuration: Date.now() - startTime
        });

      } catch (error) {
        // Unhandled error - return immediately
        return new ExtendedVerificationResult(
          {
            objective_achieved: false,
            verification_id: verificationTask.verification_id,
            checks_passed: [],
            checks_failed: ['verification_error'],
            error: error.message
          },
          {
            attempts: attemptNumber,
            failureClass: FailureClass.PERMANENT,
            retryHistory,
            finalFailureReason: `Verification error: ${error.message}`,
            totalDuration: Date.now() - startTime
          }
        );
      }
    }
  }

  /**
   * Classify verification failure
   * 
   * Analyzes failed checks and determines failure classification.
   */
  _classifyVerificationFailure(verificationTask, result) {
    const template = EXTENDED_VERIFICATION_TEMPLATES[verificationTask.verification_type];
    
    if (!template) {
      // Unknown template = assume permanent
      return FailureClass.PERMANENT;
    }

    // Get failed checks
    const failedChecks = result.checks_failed || [];
    
    if (failedChecks.length === 0) {
      // No failed checks but objective not achieved = configuration issue
      return FailureClass.CONFIGURATION;
    }

    // Classify each failed check
    const classifications = failedChecks.map(checkId => {
      const check = template.postconditions.find(c => c.check_id === checkId);
      if (!check) {
        return FailureClass.PERMANENT;
      }
      
      return classifyFailure(check, result.check_results?.[checkId] || {});
    });

    // Aggregate classifications (most severe wins)
    const priority = [
      FailureClass.PERMANENT,
      FailureClass.CONFIGURATION,
      FailureClass.DEPENDENCY,
      FailureClass.TRANSIENT
    ];

    for (const failureClass of priority) {
      if (classifications.includes(failureClass)) {
        return failureClass;
      }
    }

    return FailureClass.PERMANENT;
  }

  /**
   * Build human-readable failure reason
   */
  _buildFailureReason(verificationTask, result, failureClass) {
    const template = EXTENDED_VERIFICATION_TEMPLATES[verificationTask.verification_type];
    const failedChecks = result.checks_failed || [];

    const reasons = failedChecks.map(checkId => {
      const check = template?.postconditions.find(c => c.check_id === checkId);
      return check?.description || checkId;
    });

    const classDescription = {
      [FailureClass.TRANSIENT]: 'Temporary failure (may succeed on retry)',
      [FailureClass.PERMANENT]: 'Permanent failure (requires manual intervention)',
      [FailureClass.CONFIGURATION]: 'Configuration error (requires config change)',
      [FailureClass.DEPENDENCY]: 'External dependency unavailable'
    };

    return `${classDescription[failureClass] || 'Unknown failure'}. Failed checks: ${reasons.join(', ')}`;
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get template binding enforcement status
   * 
   * Validates that verification task matches template requirements.
   */
  validateTemplateBinding(verificationTask) {
    const template = EXTENDED_VERIFICATION_TEMPLATES[verificationTask.verification_type];
    
    if (!template) {
      return {
        valid: false,
        errors: [`Unknown verification type: ${verificationTask.verification_type}`]
      };
    }

    const errors = [];

    // Required strength check
    if (template.required_strength && 
        verificationTask.required_strength !== template.required_strength) {
      errors.push(
        `Verification strength mismatch: expected ${template.required_strength}, got ${verificationTask.required_strength}`
      );
    }

    // Timeout check
    if (template.timeout_ms && verificationTask.timeout_ms < template.timeout_ms) {
      errors.push(
        `Timeout too short: expected at least ${template.timeout_ms}ms, got ${verificationTask.timeout_ms}ms`
      );
    }

    // Required postconditions check
    const requiredChecks = template.postconditions
      .filter(c => c.required)
      .map(c => c.check_id);

    const providedChecks = verificationTask.postconditions.map(c => c.check_id);
    const missingChecks = requiredChecks.filter(id => !providedChecks.includes(id));

    if (missingChecks.length > 0) {
      errors.push(
        `Missing required checks: ${missingChecks.join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enrich verification task with template defaults
   * 
   * Merges template postconditions with runtime context.
   */
  enrichVerificationTask(verificationTask, runtimeContext = {}) {
    const template = EXTENDED_VERIFICATION_TEMPLATES[verificationTask.verification_type];
    
    if (!template) {
      return verificationTask;
    }

    // Deep clone to avoid mutation
    const enriched = JSON.parse(JSON.stringify(verificationTask));

    // Merge template postconditions
    enriched.postconditions = template.postconditions.map(templateCheck => {
      // Find matching runtime check
      const runtimeCheck = enriched.postconditions?.find(c => c.check_id === templateCheck.check_id);

      return {
        ...templateCheck,
        ...(runtimeCheck || {}),
        // Runtime overrides template only for expect values
        expect: {
          ...templateCheck.expect,
          ...(runtimeCheck?.expect || {})
        }
      };
    });

    // Apply runtime context overrides
    if (runtimeContext.target_id) {
      enriched.postconditions = enriched.postconditions.map(check => ({
        ...check,
        parameters: {
          ...(check.parameters || {}),
          ...(runtimeContext[check.check_id] || {})
        }
      }));
    }

    return enriched;
  }
}

module.exports = {
  ExtendedVerificationEngine,
  ExtendedVerificationResult,
  FailureClass
};
