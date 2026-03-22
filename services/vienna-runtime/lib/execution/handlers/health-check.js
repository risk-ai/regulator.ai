/**
 * Phase 9.7.3 — Health Check Handler
 * 
 * Check service health via systemctl is-active.
 * 
 * GUARDRAIL: This handler OBSERVES health, it does NOT decide objective satisfaction.
 * Verification/evaluation owns truth decisions.
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const { createSuccessResult, createFailureResult } = require('../action-result');

const execFileAsync = promisify(execFile);

/**
 * Check service health via systemctl
 * @param {import('../action-types').HealthCheckAction} action
 * @returns {Promise<import('../action-result').ActionResult>}
 */
async function healthCheck(action) {
  const startedAt = new Date().toISOString();
  const target = action.target;
  const timeoutMs = action.timeoutMs || 10000;

  try {
    const { stdout, stderr } = await execFileAsync(
      'systemctl',
      ['--user', 'is-active', target],
      { timeout: timeoutMs }
    );

    const status = stdout.trim();
    const healthy = status === 'active';

    return createSuccessResult(
      action.type,
      startedAt,
      {
        target,
        details: {
          healthy,
          status,
          source: 'systemctl is-active'
        }
      }
    );

  } catch (err) {
    // systemctl is-active returns non-zero for inactive services
    // This is still a successful check, just unhealthy result
    const status = err.stdout?.trim() || 'unknown';
    
    return createSuccessResult(
      action.type,
      startedAt,
      {
        target,
        details: {
          healthy: false,
          status,
          source: 'systemctl is-active',
          error: err.message
        }
      }
    );
  }
}

module.exports = { healthCheck };
