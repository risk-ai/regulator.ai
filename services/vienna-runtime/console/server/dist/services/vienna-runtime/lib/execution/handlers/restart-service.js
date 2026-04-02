/**
 * Phase 9.7.3 — Restart Service Handler
 *
 * Executes systemctl restart for allowed services only.
 *
 * Design constraint: Allowlist is HARD CODED. No dynamic service discovery.
 */
const { execFile } = require('child_process');
const { promisify } = require('util');
const { createSuccessResult, createFailureResult } = require('../action-result');
const execFileAsync = promisify(execFile);
// ALLOWLIST: Only these services can be restarted via remediation
const ALLOWED_SERVICES = new Set([
    'openclaw-gateway'
    // Add more services only after explicit governance approval
]);
/**
 * Restart a system service via systemctl
 * @param {import('../action-types').SystemServiceRestartAction} action
 * @returns {Promise<import('../action-result').ActionResult>}
 */
async function restartService(action) {
    const startedAt = new Date().toISOString();
    const target = action.target;
    const timeoutMs = action.timeoutMs || 30000;
    // GUARDRAIL 1: Allowlist enforcement
    if (!ALLOWED_SERVICES.has(target)) {
        return createFailureResult(action.type, startedAt, `Service not allowed: ${target}`, { target });
    }
    // TEST MODE: Simulate restart without executing (prevent test disruption)
    if (process.env.VIENNA_ENV === 'test' && process.env.VIENNA_TEST_STUB_ACTIONS === 'true') {
        // Simulate 1s restart delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return createSuccessResult(action.type, startedAt, {
            target,
            stdout: '[TEST MODE] Service restart simulated',
            stderr: '',
            exitCode: 0,
            stubbed: true
        });
    }
    try {
        // Execute systemctl restart with timeout
        const { stdout, stderr } = await execFileAsync('systemctl', ['--user', 'restart', target], { timeout: timeoutMs });
        return createSuccessResult(action.type, startedAt, {
            target,
            stdout: stdout?.trim() || '',
            stderr: stderr?.trim() || '',
            exitCode: 0
        });
    }
    catch (err) {
        return createFailureResult(action.type, startedAt, err.message, {
            target,
            stderr: err.stderr?.trim() || '',
            exitCode: err.code || -1
        });
    }
}
module.exports = { restartService, ALLOWED_SERVICES };
//# sourceMappingURL=restart-service.js.map