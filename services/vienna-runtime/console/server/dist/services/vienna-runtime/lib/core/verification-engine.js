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
const { createVerificationResult, VerificationStatus, VerificationStrength } = require('./verification-schema');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const http = require('http');
const https = require('https');
const fs = require('fs');
class VerificationEngine {
    constructor() {
        this.checkHandlers = new Map();
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
            }
            catch (error) {
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
            }
            catch (error) {
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
     * @returns {Promise<Object>} VerificationResult
     */
    async runVerification(verificationTask) {
        const startedAt = Date.now();
        const timeout = verificationTask.timeout_ms || 15000;
        const stabilityWindow = verificationTask.stability_window_ms || 0;
        try {
            // Run all postcondition checks
            const checkResults = await Promise.race([
                this._runChecks(verificationTask.postconditions),
                this._timeout(timeout)
            ]);
            // Determine if all required checks passed
            const requiredChecks = checkResults.filter(r => r.required !== false);
            const allRequiredPassed = requiredChecks.every(r => r.status === 'passed');
            // If stability window required and all checks passed, wait and re-verify
            let stabilityResult = null;
            if (allRequiredPassed && stabilityWindow > 0) {
                stabilityResult = await this._verifyStability(verificationTask.postconditions, stabilityWindow);
            }
            const completedAt = Date.now();
            const objectiveAchieved = allRequiredPassed && (!stabilityResult || stabilityResult.status === 'passed');
            // Determine verification status
            let status;
            if (objectiveAchieved) {
                status = VerificationStatus.SUCCESS;
            }
            else if (stabilityResult && stabilityResult.status === 'failed') {
                status = VerificationStatus.FAILED;
            }
            else if (requiredChecks.some(r => r.status === 'failed')) {
                status = VerificationStatus.FAILED;
            }
            else {
                status = VerificationStatus.INCONCLUSIVE;
            }
            // Determine achieved verification strength
            const achievedStrength = this._determineAchievedStrength(checkResults, stabilityResult, verificationTask.verification_strength);
            // Generate summary
            const summary = this._generateSummary(verificationTask.objective, status, checkResults, stabilityResult);
            return createVerificationResult({
                verification_id: verificationTask.verification_id,
                plan_id: verificationTask.plan_id,
                execution_id: verificationTask.execution_id,
                status,
                objective_achieved: objectiveAchieved,
                verification_strength_achieved: achievedStrength,
                started_at: startedAt,
                completed_at: completedAt,
                checks: checkResults,
                stability: stabilityResult,
                summary
            });
        }
        catch (error) {
            const completedAt = Date.now();
            if (error.message === 'VERIFICATION_TIMEOUT') {
                return createVerificationResult({
                    verification_id: verificationTask.verification_id,
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
                verification_id: verificationTask.verification_id,
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
    _generateSummary(objective, status, checkResults, stabilityResult) {
        const passedCount = checkResults.filter(r => r.status === 'passed').length;
        const totalCount = checkResults.length;
        if (status === VerificationStatus.SUCCESS) {
            if (stabilityResult) {
                return `${objective} completed successfully. All postconditions verified and remained stable for ${stabilityResult.window_ms}ms.`;
            }
            return `${objective} completed successfully. All ${totalCount} postcondition checks passed.`;
        }
        if (status === VerificationStatus.FAILED) {
            const failedChecks = checkResults.filter(r => r.status === 'failed');
            const failedNames = failedChecks.map(r => r.check_id).join(', ');
            return `${objective} verification failed. ${passedCount}/${totalCount} checks passed. Failed checks: ${failedNames}.`;
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
}
module.exports = { VerificationEngine };
//# sourceMappingURL=verification-engine.js.map