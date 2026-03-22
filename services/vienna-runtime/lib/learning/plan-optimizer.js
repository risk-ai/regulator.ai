/**
 * Plan Optimizer
 * 
 * Optimize remediation plans based on execution history
 * Phase 18 — Self-Correcting Loop
 */

const crypto = require('crypto');

class PlanOptimizer {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Suggest step reordering optimization
   */
  async suggestStepReordering(planTemplateId, options = {}) {
    const minExecutions = options.minExecutions || 10;
    const minImprovement = options.minImprovement || 0.1;

    // Query execution history for this plan template
    const executions = await this._getExecutionHistory(planTemplateId, { limit: 100 });

    if (executions.length < minExecutions) {
      return null;
    }

    // Analyze step execution patterns
    const stepStats = this._analyzeStepStats(executions);
    
    // Identify skippable steps
    const skippableSteps = stepStats.filter(s => 
      s.skip_rate > 0.8 && s.avg_duration_ms > 1000
    );

    if (skippableSteps.length === 0) {
      return null;
    }

    // Calculate improvement potential
    const currentAvgDuration = this._avg(executions.map(e => e.duration_ms));
    const estimatedNewDuration = currentAvgDuration - 
      skippableSteps.reduce((sum, s) => sum + s.avg_duration_ms, 0);
    
    const improvementPct = (currentAvgDuration - estimatedNewDuration) / currentAvgDuration;

    if (improvementPct < minImprovement) {
      return null;
    }

    return {
      improvement_id: this._generateId('imp'),
      plan_template_id: planTemplateId,
      improvement_type: 'step_reordering',
      proposed_change: {
        remove_steps: skippableSteps.map(s => s.step_id),
        reason: 'Steps frequently skipped or unnecessary'
      },
      expected_benefit: {
        time_reduction_pct: Math.round(improvementPct * 100),
        steps_removed: skippableSteps.length
      },
      evidence: {
        executions_analyzed: executions.length,
        avg_duration_current_ms: Math.round(currentAvgDuration),
        avg_duration_proposed_ms: Math.round(estimatedNewDuration),
        skippable_steps: skippableSteps.map(s => ({
          step_id: s.step_id,
          skip_rate: s.skip_rate,
          avg_duration_ms: s.avg_duration_ms
        }))
      },
      confidence: this._calculateConfidence(executions.length, improvementPct),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Suggest verification strength adjustment
   */
  async suggestVerificationAdjustment(planTemplateId, options = {}) {
    const minExecutions = options.minExecutions || 10;

    const executions = await this._getExecutionHistory(planTemplateId, { limit: 100 });

    if (executions.length < minExecutions) {
      return null;
    }

    // Analyze verification results
    const verificationStats = this._analyzeVerificationStats(executions);

    // Strong verification = 5+ checks, Medium = 3-4, Weak = 1-2
    const currentStrength = this._determineVerificationStrength(verificationStats);
    
    if (currentStrength === 'strong') {
      // Check if Medium would be sufficient
      const strongChecks = verificationStats.checks.filter(c => c.check_type === 'strong');
      const mediumChecks = verificationStats.checks.filter(c => c.check_type !== 'strong');
      
      const strongSuccessRate = this._avg(strongChecks.map(c => c.success_rate));
      const mediumSuccessRate = this._avg(mediumChecks.map(c => c.success_rate));

      if (Math.abs(strongSuccessRate - mediumSuccessRate) < 0.02) {
        // Strong and Medium have similar success rates
        const timeSavings = this._avg(strongChecks.map(c => c.avg_duration_ms));
        
        return {
          improvement_id: this._generateId('imp'),
          plan_template_id: planTemplateId,
          improvement_type: 'verification_adjustment',
          proposed_change: {
            from_strength: 'strong',
            to_strength: 'medium',
            remove_checks: strongChecks.map(c => c.check_id)
          },
          expected_benefit: {
            time_reduction_pct: Math.round((timeSavings / verificationStats.avg_total_duration_ms) * 100),
            success_rate_impact: strongSuccessRate - mediumSuccessRate
          },
          evidence: {
            executions_analyzed: executions.length,
            strong_success_rate: strongSuccessRate,
            medium_success_rate: mediumSuccessRate,
            avg_strong_duration_ms: Math.round(timeSavings)
          },
          confidence: this._calculateConfidence(executions.length, 0.02),
          created_at: new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Suggest retry policy tuning
   */
  async suggestRetryTuning(planTemplateId, options = {}) {
    const minExecutions = options.minExecutions || 10;

    const executions = await this._getExecutionHistory(planTemplateId, { limit: 100 });

    if (executions.length < minExecutions) {
      return null;
    }

    // Analyze retry patterns
    const retryStats = this._analyzeRetryStats(executions);

    if (!retryStats || retryStats.total_retries === 0) {
      return null;
    }

    // Calculate recovery rates by attempt
    const firstRetryRecovery = retryStats.recovery_by_attempt[1] || 0;
    const secondRetryRecovery = retryStats.recovery_by_attempt[2] || 0;
    const thirdRetryRecovery = retryStats.recovery_by_attempt[3] || 0;

    const totalRecovery = firstRetryRecovery + secondRetryRecovery + thirdRetryRecovery;

    if (totalRecovery === 0) {
      return null;
    }

    // If 85%+ recover on first retry, reduce max attempts
    if (firstRetryRecovery / totalRecovery >= 0.85) {
      return {
        improvement_id: this._generateId('imp'),
        plan_template_id: planTemplateId,
        improvement_type: 'retry_tuning',
        proposed_change: {
          from_max_attempts: retryStats.current_max_attempts,
          to_max_attempts: 2,
          reason: 'Most failures recover on first retry'
        },
        expected_benefit: {
          retry_overhead_reduction_pct: Math.round(((retryStats.avg_retry_duration_ms * 3) / retryStats.avg_total_duration_ms) * 100)
        },
        evidence: {
          executions_analyzed: executions.length,
          first_retry_recovery_rate: firstRetryRecovery / totalRecovery,
          total_retries: retryStats.total_retries
        },
        confidence: this._calculateConfidence(executions.length, firstRetryRecovery / totalRecovery),
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Suggest timeout adjustment
   */
  async suggestTimeoutAdjustment(planTemplateId, options = {}) {
    const minExecutions = options.minExecutions || 10;

    const executions = await this._getExecutionHistory(planTemplateId, { limit: 100 });

    if (executions.length < minExecutions) {
      return null;
    }

    // Analyze execution durations
    const durations = executions
      .filter(e => e.status === 'completed')
      .map(e => e.duration_ms);

    if (durations.length < minExecutions) {
      return null;
    }

    const p95 = this._percentile(durations, 0.95);
    const currentTimeout = executions[0]?.timeout_ms || 60000;

    // If 95th percentile is much lower than timeout, reduce timeout
    if (p95 < currentTimeout * 0.3) {
      const proposedTimeout = Math.round(p95 * 1.5); // 50% buffer above p95

      return {
        improvement_id: this._generateId('imp'),
        plan_template_id: planTemplateId,
        improvement_type: 'timeout_adjustment',
        proposed_change: {
          from_timeout_ms: currentTimeout,
          to_timeout_ms: proposedTimeout,
          reason: '95th percentile much lower than current timeout'
        },
        expected_benefit: {
          faster_failure_detection: true,
          timeout_reduction_pct: Math.round(((currentTimeout - proposedTimeout) / currentTimeout) * 100)
        },
        evidence: {
          executions_analyzed: executions.length,
          p95_duration_ms: Math.round(p95),
          current_timeout_ms: currentTimeout
        },
        confidence: this._calculateConfidence(executions.length, 0.8),
        created_at: new Date().toISOString()
      };
    }

    return null;
  }

  // Helper methods

  async _getExecutionHistory(planTemplateId, options = {}) {
    // Mock implementation - would query execution_ledger_summary
    return [];
  }

  _analyzeStepStats(executions) {
    // Analyze individual step execution patterns
    const steps = {};
    
    for (const exec of executions) {
      // Try to get steps from plan first, then fall back to step_results
      const plan = JSON.parse(exec.plan || '{}');
      const planSteps = plan.steps || [];
      const resultSteps = exec.step_results || [];
      
      // Use step_results as fallback if plan is empty
      const stepsToAnalyze = planSteps.length > 0 ? planSteps : resultSteps;
      
      for (const step of stepsToAnalyze) {
        const stepId = step.step_id;
        
        if (!steps[stepId]) {
          steps[stepId] = {
            step_id: stepId,
            executions: 0,
            skips: 0,
            durations: []
          };
        }
        
        steps[stepId].executions++;
        
        // Check if step was skipped
        const stepResult = resultSteps.find(r => r.step_id === stepId) || step;
        if (stepResult.skipped) {
          steps[stepId].skips++;
        }
        
        if (stepResult.duration_ms) {
          steps[stepId].durations.push(stepResult.duration_ms);
        }
      }
    }

    return Object.values(steps).map(s => ({
      step_id: s.step_id,
      skip_rate: s.skips / s.executions,
      avg_duration_ms: this._avg(s.durations)
    }));
  }

  _analyzeVerificationStats(executions) {
    const checks = {};
    let totalDuration = 0;
    let count = 0;

    for (const exec of executions) {
      const verification = JSON.parse(exec.verification_result || '{}');
      
      for (const check of verification.checks || []) {
        if (!checks[check.check_id]) {
          checks[check.check_id] = {
            check_id: check.check_id,
            check_type: check.check_type,
            successes: 0,
            failures: 0,
            durations: []
          };
        }

        if (check.result === 'pass') {
          checks[check.check_id].successes++;
        } else {
          checks[check.check_id].failures++;
        }

        if (check.duration_ms) {
          checks[check.check_id].durations.push(check.duration_ms);
        }
      }

      if (verification.total_duration_ms) {
        totalDuration += verification.total_duration_ms;
        count++;
      }
    }

    return {
      checks: Object.values(checks).map(c => ({
        check_id: c.check_id,
        check_type: c.check_type,
        success_rate: c.successes / (c.successes + c.failures),
        avg_duration_ms: this._avg(c.durations)
      })),
      avg_total_duration_ms: count > 0 ? totalDuration / count : 0
    };
  }

  _determineVerificationStrength(verificationStats) {
    // Determine strength based on check types, not just count
    const strongChecks = verificationStats.checks.filter(c => c.check_type === 'strong').length;
    const totalChecks = verificationStats.checks.length;
    
    // If any strong checks exist, consider it strong verification
    if (strongChecks > 0) return 'strong';
    if (totalChecks >= 3) return 'medium';
    return 'weak';
  }

  _analyzeRetryStats(executions) {
    const retries = executions.filter(e => e.retry_count > 0);
    
    if (retries.length === 0) return null;

    const recoveryByAttempt = {};
    let totalRetryDuration = 0;
    let totalDuration = 0;

    for (const exec of executions) {
      totalDuration += exec.duration_ms;

      if (exec.retry_count > 0) {
        if (!recoveryByAttempt[exec.retry_count]) {
          recoveryByAttempt[exec.retry_count] = 0;
        }

        if (exec.status === 'completed') {
          recoveryByAttempt[exec.retry_count]++;
        }

        totalRetryDuration += exec.retry_duration_ms || 0;
      }
    }

    return {
      total_retries: retries.length,
      recovery_by_attempt: recoveryByAttempt,
      current_max_attempts: Math.max(...executions.map(e => e.max_retry_attempts || 3)),
      avg_retry_duration_ms: retries.length > 0 ? totalRetryDuration / retries.length : 0,
      avg_total_duration_ms: executions.length > 0 ? totalDuration / executions.length : 0
    };
  }

  _avg(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  _percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index];
  }

  _calculateConfidence(sampleSize, metric) {
    // Simple confidence calculation based on sample size
    if (sampleSize < 10) return 0.5;
    if (sampleSize < 30) return 0.7;
    if (sampleSize < 50) return 0.85;
    return 0.9;
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  }
}

module.exports = PlanOptimizer;
