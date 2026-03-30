/**
 * Vienna Recovery Copilot (Phase 6.5)
 *
 * Operator recovery assistance layer.
 *
 * Design constraints:
 * - AI explains, runtime executes, operator approves
 * - No autonomous recovery execution
 * - Recovery copilot = diagnostic intelligence + structured proposals
 */
/**
 * Recovery intent parser
 */
class RecoveryIntentParser {
    parseIntent(message) {
        const lowerMessage = message.toLowerCase().trim();
        // diagnose system
        if (lowerMessage.match(/diagnose\s+(system|runtime|state)/)) {
            return { intent: 'diagnose_system', params: {} };
        }
        // show failures
        if (lowerMessage.match(/show\s+(failures|failed|errors)/)) {
            return { intent: 'show_failures', params: {} };
        }
        // show dead letters
        if (lowerMessage.match(/show\s+(dead\s*letters?|dlq)/)) {
            return { intent: 'show_dead_letters', params: {} };
        }
        // explain blockers
        if (lowerMessage.match(/explain\s+(blockers?|blocks?|issues?)/)) {
            return { intent: 'explain_blockers', params: {} };
        }
        // test provider
        const testMatch = lowerMessage.match(/test\s+provider\s+(\w+)/);
        if (testMatch) {
            return { intent: 'test_provider', params: { provider: testMatch[1] } };
        }
        // enter local-only mode
        if (lowerMessage.match(/enter\s+local[\s-]?only/)) {
            return { intent: 'enter_local_only', params: {} };
        }
        // recovery checklist
        if (lowerMessage.match(/recovery\s+checklist/)) {
            return { intent: 'recovery_checklist', params: {} };
        }
        // show mode
        if (lowerMessage.match(/show\s+(mode|runtime\s+mode)/)) {
            return { intent: 'show_mode', params: {} };
        }
        return { intent: 'unknown', params: {} };
    }
}
/**
 * Recovery Copilot
 *
 * Provides diagnostic intelligence and recovery proposals.
 * Does NOT execute recovery actions autonomously.
 */
class RecoveryCopilot {
    constructor() {
        this.intentParser = new RecoveryIntentParser();
    }
    /**
     * Process recovery intent
     *
     * @param {string} message
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {Promise<string>}
     */
    async processIntent(message, runtimeState, providerHealth) {
        const { intent, params } = this.intentParser.parseIntent(message);
        switch (intent) {
            case 'diagnose_system':
                return this.diagnoseSystem(runtimeState, providerHealth);
            case 'show_failures':
                return this.showFailures(providerHealth);
            case 'show_dead_letters':
                return this.showDeadLetters();
            case 'explain_blockers':
                return this.explainBlockers(runtimeState, providerHealth);
            case 'test_provider':
                return this.testProvider(params.provider, providerHealth);
            case 'enter_local_only':
                return this.proposeLocalOnly(runtimeState);
            case 'recovery_checklist':
                return this.getRecoveryChecklist(runtimeState, providerHealth);
            case 'show_mode':
                return this.showMode(runtimeState);
            default:
                return 'Unknown recovery command. Try: diagnose system, show failures, explain blockers';
        }
    }
    /**
     * Diagnose system state
     *
     * @param {object} runtimeState - Extended runtime state with executor/queue/DLQ data
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    diagnoseSystem(runtimeState, providerHealth) {
        const diagnosis = [];
        diagnosis.push(`**System Diagnosis**`);
        diagnosis.push(``);
        // System state (authoritative from executor)
        diagnosis.push(`**System State:** ${runtimeState.systemState || 'unknown'}`);
        diagnosis.push(`**Runtime Mode:** ${runtimeState.mode}`);
        if (runtimeState.paused) {
            diagnosis.push(`**Status:** PAUSED${runtimeState.pauseReason ? ` (${runtimeState.pauseReason})` : ''}`);
        }
        else if (runtimeState.executorState) {
            diagnosis.push(`**Executor:** ${runtimeState.executorState}`);
        }
        diagnosis.push(``);
        // Runtime state degradation reasons
        if (runtimeState.reasons && runtimeState.reasons.length > 0) {
            diagnosis.push(`**Degraded reasons:**`);
            runtimeState.reasons.forEach(reason => {
                diagnosis.push(`- ${reason}`);
            });
            diagnosis.push(``);
        }
        // Queue state (authoritative from executor)
        if (runtimeState.queueDepth !== undefined || runtimeState.executing !== undefined) {
            diagnosis.push(`**Queue State:**`);
            if (runtimeState.queueDepth !== undefined) {
                diagnosis.push(`- Queued: ${runtimeState.queueDepth}`);
            }
            if (runtimeState.executing !== undefined) {
                diagnosis.push(`- Executing: ${runtimeState.executing}`);
            }
            if (runtimeState.blocked !== undefined && runtimeState.blocked > 0) {
                diagnosis.push(`- ⚠ Blocked: ${runtimeState.blocked}`);
            }
            if (runtimeState.deadLetterCount !== undefined && runtimeState.deadLetterCount > 0) {
                diagnosis.push(`- ✗ Dead Letters: ${runtimeState.deadLetterCount}`);
            }
            if (runtimeState.activeObjectives !== undefined) {
                diagnosis.push(`- Active Objectives: ${runtimeState.activeObjectives}`);
            }
            diagnosis.push(``);
        }
        // Provider health
        const healthy = [];
        const degraded = [];
        const unavailable = [];
        for (const [name, health] of providerHealth.entries()) {
            if (health.status === 'healthy') {
                healthy.push(name);
            }
            else if (health.status === 'degraded') {
                degraded.push(name);
            }
            else if (health.status === 'unavailable') {
                unavailable.push(name);
            }
        }
        diagnosis.push(`**Provider Health:**`);
        if (providerHealth.size === 0) {
            diagnosis.push(`✗ No providers registered`);
        }
        else {
            if (healthy.length > 0) {
                diagnosis.push(`✓ Healthy: ${healthy.join(', ')}`);
            }
            if (degraded.length > 0) {
                diagnosis.push(`⚠ Degraded: ${degraded.join(', ')}`);
            }
            if (unavailable.length > 0) {
                diagnosis.push(`✗ Unavailable: ${unavailable.join(', ')}`);
            }
        }
        diagnosis.push(``);
        // Available capabilities
        if (runtimeState.availableCapabilities && runtimeState.availableCapabilities.length > 0) {
            diagnosis.push(`**Available capabilities:**`);
            diagnosis.push(runtimeState.availableCapabilities.join(', '));
            diagnosis.push(``);
        }
        // Proposed actions
        const actions = this.proposeRecoveryActions(runtimeState, providerHealth);
        if (actions.length > 0) {
            diagnosis.push(`**Recommended actions:**`);
            actions.forEach(action => {
                diagnosis.push(`- ${action.description}`);
            });
        }
        else {
            diagnosis.push(`**No recovery actions needed.**`);
        }
        return diagnosis.join('\n');
    }
    /**
     * Show recent failures
     *
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    showFailures(providerHealth) {
        const failures = [];
        failures.push(`**Recent Provider Failures**`);
        failures.push(``);
        for (const [name, health] of providerHealth.entries()) {
            if (health.lastFailureAt) {
                failures.push(`**${name}:**`);
                failures.push(`- Last failure: ${health.lastFailureAt}`);
                failures.push(`- Consecutive failures: ${health.consecutiveFailures}`);
                if (health.cooldownUntil) {
                    failures.push(`- Cooldown until: ${health.cooldownUntil}`);
                }
                failures.push(``);
            }
        }
        if (failures.length === 2) {
            return 'No recent provider failures.';
        }
        return failures.join('\n');
    }
    /**
     * Show dead letters (stub - needs DLQ integration)
     *
     * @returns {string}
     */
    showDeadLetters() {
        // TODO: Integrate with actual DLQ
        return '**Dead Letter Queue**\n\nDLQ integration pending. Use `show failures` for provider issues.';
    }
    /**
     * Explain blockers
     *
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    explainBlockers(runtimeState, providerHealth) {
        const blockers = [];
        blockers.push(`**Current Blockers**`);
        blockers.push(``);
        if (runtimeState.mode === 'operator-only') {
            blockers.push(`**CRITICAL:** No AI providers available`);
            blockers.push(`- System is in operator-only mode`);
            blockers.push(`- Only manual diagnostics and inspection available`);
            blockers.push(``);
        }
        else if (runtimeState.mode === 'local-only') {
            blockers.push(`**WARNING:** Operating in local-only mode`);
            blockers.push(`- Remote providers unavailable or gateway disconnected`);
            blockers.push(`- Only local operations allowed`);
            blockers.push(``);
        }
        else if (runtimeState.mode === 'degraded') {
            blockers.push(`**DEGRADED:** Some providers unavailable`);
            for (const reason of runtimeState.reasons) {
                blockers.push(`- ${reason}`);
            }
            blockers.push(``);
        }
        // Provider-specific blockers
        for (const [name, health] of providerHealth.entries()) {
            if (health.status === 'unavailable') {
                blockers.push(`**${name} unavailable:**`);
                if (health.cooldownUntil) {
                    blockers.push(`- In cooldown until ${health.cooldownUntil}`);
                }
                if (health.consecutiveFailures > 0) {
                    blockers.push(`- ${health.consecutiveFailures} consecutive failures`);
                }
                blockers.push(``);
            }
        }
        if (blockers.length === 2) {
            return 'No blockers detected. System is healthy.';
        }
        return blockers.join('\n');
    }
    /**
     * Test provider health
     *
     * @param {string} provider
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    testProvider(provider, providerHealth) {
        const health = providerHealth.get(provider);
        if (!health) {
            return `Provider "${provider}" not found. Available providers: ${Array.from(providerHealth.keys()).join(', ')}`;
        }
        const report = [];
        report.push(`**Provider: ${provider}**`);
        report.push(``);
        report.push(`Status: ${health.status}`);
        report.push(`Last checked: ${health.lastCheckedAt}`);
        if (health.lastSuccessAt) {
            report.push(`Last success: ${health.lastSuccessAt}`);
        }
        if (health.lastFailureAt) {
            report.push(`Last failure: ${health.lastFailureAt}`);
        }
        if (health.latencyMs !== null) {
            report.push(`Latency: ${health.latencyMs}ms`);
        }
        if (health.consecutiveFailures > 0) {
            report.push(`Consecutive failures: ${health.consecutiveFailures}`);
        }
        if (health.cooldownUntil) {
            report.push(`Cooldown until: ${health.cooldownUntil}`);
        }
        return report.join('\n');
    }
    /**
     * Propose local-only mode transition
     *
     * @param {object} runtimeState
     * @returns {string}
     */
    proposeLocalOnly(runtimeState) {
        if (runtimeState.mode === 'local-only') {
            return 'System is already in local-only mode.';
        }
        return `**Propose mode transition: ${runtimeState.mode} → local-only**

This will:
- Restrict operations to local provider only
- Disable remote provider access
- Allow only degraded-mode safe operations

**This is a proposal only. Operator must approve mode transition through runtime governance.**

To execute, use the runtime mode transition API (not via chat).`;
    }
    /**
     * Get recovery checklist
     *
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    getRecoveryChecklist(runtimeState, providerHealth) {
        const checklist = [];
        checklist.push(`**Recovery Checklist**`);
        checklist.push(``);
        if (runtimeState.mode === 'operator-only') {
            checklist.push(`**Critical Recovery (Operator-Only Mode)**`);
            checklist.push(`1. Check gateway connectivity`);
            checklist.push(`2. Verify Tailscale status`);
            checklist.push(`3. Check systemd service status`);
            checklist.push(`4. Inspect provider logs`);
            checklist.push(`5. Test local provider manually`);
            checklist.push(``);
        }
        else if (runtimeState.mode === 'local-only') {
            checklist.push(`**Gateway Recovery (Local-Only Mode)**`);
            checklist.push(`1. Test gateway connectivity`);
            checklist.push(`2. Check remote provider health`);
            checklist.push(`3. Verify network connectivity`);
            checklist.push(`4. Review recent transitions`);
            checklist.push(``);
        }
        else if (runtimeState.mode === 'degraded') {
            checklist.push(`**Degraded Mode Recovery**`);
            for (const [name, health] of providerHealth.entries()) {
                if (health.status !== 'healthy') {
                    checklist.push(`- Diagnose ${name} provider`);
                    if (health.cooldownUntil) {
                        checklist.push(`  Wait for cooldown: ${health.cooldownUntil}`);
                    }
                }
            }
            checklist.push(``);
        }
        else {
            checklist.push(`System is healthy. No recovery needed.`);
            return checklist.join('\n');
        }
        checklist.push(`**General Steps:**`);
        checklist.push(`- Review provider health (show failures)`);
        checklist.push(`- Check DLQ for stuck tasks (show dead letters)`);
        checklist.push(`- Verify runtime mode matches expectations`);
        checklist.push(`- Test provider connections individually`);
        return checklist.join('\n');
    }
    /**
     * Show current runtime mode
     *
     * @param {object} runtimeState
     * @returns {string}
     */
    showMode(runtimeState) {
        const info = [];
        info.push(`**Runtime Mode: ${runtimeState.mode}**`);
        info.push(``);
        info.push(`Entered at: ${runtimeState.enteredAt}`);
        if (runtimeState.previousMode) {
            info.push(`Previous mode: ${runtimeState.previousMode}`);
        }
        if (runtimeState.reasons.length > 0) {
            info.push(``);
            info.push(`**Reasons:**`);
            runtimeState.reasons.forEach(r => info.push(`- ${r}`));
        }
        if (runtimeState.fallbackProvidersActive.length > 0) {
            info.push(``);
            info.push(`**Fallback providers active:**`);
            info.push(runtimeState.fallbackProvidersActive.join(', '));
        }
        if (runtimeState.availableCapabilities.length > 0) {
            info.push(``);
            info.push(`**Available capabilities:**`);
            info.push(runtimeState.availableCapabilities.join(', '));
        }
        return info.join('\n');
    }
    /**
     * Propose recovery actions
     *
     * @param {object} runtimeState - Extended runtime state with executor/queue/DLQ data
     * @param {Map<string, object>} providerHealth
     * @returns {Array<object>}
     */
    proposeRecoveryActions(runtimeState, providerHealth) {
        const actions = [];
        // Check for dead letters (high priority)
        if (runtimeState.deadLetterCount > 0) {
            actions.push({
                id: 'inspect_dead_letters',
                type: 'inspection',
                description: `Inspect ${runtimeState.deadLetterCount} dead letter(s) for retry or cancellation`,
                priority: 'high',
                safeToExecute: true,
                requiresApproval: false,
            });
        }
        // Check for blocked envelopes
        if (runtimeState.blocked > 0) {
            actions.push({
                id: 'inspect_blocked',
                type: 'inspection',
                description: `Inspect ${runtimeState.blocked} blocked envelope(s) for resolution`,
                priority: 'high',
                safeToExecute: true,
                requiresApproval: false,
            });
        }
        // System paused
        if (runtimeState.paused) {
            actions.push({
                id: 'resume_execution',
                type: 'resume',
                description: `Resume execution (currently paused: ${runtimeState.pauseReason || 'unknown reason'})`,
                priority: 'critical',
                safeToExecute: false,
                requiresApproval: true,
            });
        }
        // Executor degraded
        if (runtimeState.executorState === 'WARNING' || runtimeState.executorState === 'CRITICAL') {
            actions.push({
                id: 'diagnose_executor',
                type: 'diagnostics',
                description: 'Run executor diagnostics to identify degradation cause',
                priority: 'high',
                safeToExecute: true,
                requiresApproval: false,
            });
        }
        // Suggest health checks for unavailable providers
        for (const [name, health] of providerHealth.entries()) {
            if (health.status === 'unavailable' && !health.cooldownUntil) {
                actions.push({
                    id: `health_check_${name}`,
                    type: 'health_check',
                    description: `Test ${name} provider connectivity`,
                    targetProvider: name,
                    priority: 'medium',
                    safeToExecute: true,
                    requiresApproval: false,
                });
            }
        }
        // Suggest mode transitions
        if (runtimeState.mode === 'degraded' && runtimeState.fallbackProvidersActive && runtimeState.fallbackProvidersActive.length > 0) {
            actions.push({
                id: 'enter_local_only',
                type: 'mode_transition',
                description: 'Enter local-only mode (restrict to local provider)',
                targetMode: 'local-only',
                priority: 'low',
                safeToExecute: true,
                requiresApproval: true,
            });
        }
        // Empty provider registry (critical)
        if (providerHealth.size === 0) {
            actions.push({
                id: 'diagnose_provider_registry',
                type: 'diagnostics',
                description: 'No providers registered - diagnose provider configuration',
                priority: 'critical',
                safeToExecute: true,
                requiresApproval: false,
            });
        }
        // Sort by priority (critical > high > medium > low)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        actions.sort((a, b) => (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999));
        return actions;
    }
}
module.exports = {
    RecoveryCopilot,
    RecoveryIntentParser,
};
//# sourceMappingURL=recovery-copilot.js.map