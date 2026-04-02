/**
 * Startup Validator
 * Phase 6A: System Hardening
 *
 * Ensures Vienna refuses to start in a broken state.
 *
 * Validates:
 * - Executor initialized
 * - Execution queue available
 * - Dead-letter queue available
 * - Event emitter initialized
 * - Provider registry loaded
 * - Runtime services wired
 *
 * If any critical component fails:
 * - systemState = failed
 * - startup aborted
 * - clear error surfaced
 */
class StartupValidator {
    constructor() {
        this.validationResults = [];
        this.criticalFailures = [];
    }
    /**
     * Validate a Vienna Core instance
     *
     * @param {object} viennaCore - Vienna Core instance
     * @returns {object} Validation result
     */
    validate(viennaCore) {
        this.validationResults = [];
        this.criticalFailures = [];
        // Reset validation state
        const result = {
            valid: true,
            timestamp: new Date().toISOString(),
            checks: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                critical: 0
            }
        };
        // Run all validation checks
        this._checkInitialized(viennaCore, result);
        this._checkExecutor(viennaCore, result);
        this._checkQueuedExecutor(viennaCore, result);
        this._checkExecutionQueue(viennaCore, result);
        this._checkDeadLetterQueue(viennaCore, result);
        this._checkEventEmitter(viennaCore, result);
        this._checkProviderHealthManager(viennaCore, result);
        this._checkCrashRecoveryManager(viennaCore, result);
        this._checkStructuredLogger(viennaCore, result);
        this._checkRuntimeIntegrityGuard(viennaCore, result);
        this._checkGovernanceModules(viennaCore, result);
        this._checkAdapters(viennaCore, result);
        // Calculate summary
        result.summary.total = result.checks.length;
        result.summary.passed = result.checks.filter(c => c.passed).length;
        result.summary.failed = result.checks.filter(c => !c.passed).length;
        result.summary.critical = result.checks.filter(c => !c.passed && c.critical).length;
        // Overall validity
        result.valid = result.summary.critical === 0;
        return result;
    }
    /**
     * Check if Vienna Core is initialized
     */
    _checkInitialized(viennaCore, result) {
        const check = {
            component: 'core',
            name: 'Initialized',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            if (!viennaCore) {
                check.message = 'Vienna Core instance is null or undefined';
            }
            else if (!viennaCore.isInitialized()) {
                check.message = 'Vienna Core not initialized (init() not called)';
            }
            else {
                check.passed = true;
                check.message = 'Vienna Core initialized successfully';
            }
        }
        catch (error) {
            check.message = `Initialization check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check executor availability
     */
    _checkExecutor(viennaCore, result) {
        const check = {
            component: 'executor',
            name: 'Base Executor',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            if (!viennaCore.executor) {
                check.message = 'Executor not initialized';
            }
            else if (typeof viennaCore.executor.execute !== 'function') {
                check.message = 'Executor missing execute() method';
            }
            else {
                check.passed = true;
                check.message = 'Base executor operational';
            }
        }
        catch (error) {
            check.message = `Executor check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check queued executor availability
     */
    _checkQueuedExecutor(viennaCore, result) {
        const check = {
            component: 'executor',
            name: 'Queued Executor',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            if (!viennaCore.queuedExecutor) {
                check.message = 'Queued executor not initialized';
            }
            else if (typeof viennaCore.queuedExecutor.submit !== 'function') {
                check.message = 'Queued executor missing submit() method';
            }
            else if (typeof viennaCore.queuedExecutor.getQueueState !== 'function') {
                check.message = 'Queued executor missing getQueueState() method';
            }
            else {
                check.passed = true;
                check.message = 'Queued executor operational';
            }
        }
        catch (error) {
            check.message = `Queued executor check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check execution queue availability
     */
    _checkExecutionQueue(viennaCore, result) {
        const check = {
            component: 'queue',
            name: 'Execution Queue',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            if (!viennaCore.executionQueue) {
                check.message = 'Execution queue not initialized';
            }
            else if (typeof viennaCore.executionQueue.enqueue !== 'function') {
                check.message = 'Execution queue missing enqueue() method';
            }
            else if (typeof viennaCore.executionQueue.next !== 'function') {
                check.message = 'Execution queue missing next() method';
            }
            else {
                // Check if queue has internal state
                const loaded = viennaCore.executionQueue.loaded;
                const queueSize = viennaCore.executionQueue.queue?.size || 0;
                check.passed = true;
                check.message = `Execution queue operational (${queueSize} items, loaded: ${loaded})`;
            }
        }
        catch (error) {
            check.message = `Execution queue check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check dead-letter queue availability
     */
    _checkDeadLetterQueue(viennaCore, result) {
        const check = {
            component: 'queue',
            name: 'Dead Letter Queue',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            // Dead letter queue is in queuedExecutor
            const dlq = viennaCore.queuedExecutor?.deadLetterQueue;
            if (!dlq) {
                check.message = 'Dead letter queue not initialized';
            }
            else if (typeof dlq.deadLetter !== 'function') {
                check.message = 'Dead letter queue missing deadLetter() method';
            }
            else if (typeof dlq.getEntries !== 'function') {
                check.message = 'Dead letter queue missing getEntries() method';
            }
            else {
                const items = dlq.getEntries();
                const loaded = dlq.loaded;
                check.passed = true;
                check.message = `Dead letter queue operational (${items.length} items, loaded: ${loaded})`;
            }
        }
        catch (error) {
            check.message = `Dead letter queue check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check event emitter availability
     */
    _checkEventEmitter(viennaCore, result) {
        const check = {
            component: 'events',
            name: 'Event Emitter',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            // Event emitter is in queued executor
            const emitter = viennaCore.queuedExecutor?.eventEmitter;
            if (!emitter) {
                check.message = 'Event emitter not initialized';
            }
            else if (typeof emitter.emitEnvelopeEvent !== 'function') {
                check.message = 'Event emitter missing emitEnvelopeEvent() method';
            }
            else if (typeof emitter.emitObjectiveEvent !== 'function') {
                check.message = 'Event emitter missing emitObjectiveEvent() method';
            }
            else if (typeof emitter.emitAlert !== 'function') {
                check.message = 'Event emitter missing emitAlert() method';
            }
            else {
                const status = emitter.enabled ? 'enabled' : 'disabled';
                check.passed = true;
                check.message = `Event emitter operational (${status})`;
            }
        }
        catch (error) {
            check.message = `Event emitter check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check provider health manager (Phase 6B)
     */
    _checkProviderHealthManager(viennaCore, result) {
        const check = {
            component: 'providers',
            name: 'Provider Health Manager',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            const manager = viennaCore.providerHealthManager;
            if (!manager) {
                check.message = 'Provider health manager not initialized';
            }
            else if (typeof manager.checkAvailability !== 'function') {
                check.message = 'Provider health manager missing checkAvailability() method';
            }
            else if (typeof manager.recordSuccess !== 'function') {
                check.message = 'Provider health manager missing recordSuccess() method';
            }
            else if (typeof manager.recordFailure !== 'function') {
                check.message = 'Provider health manager missing recordFailure() method';
            }
            else {
                const running = manager.running;
                const providerCount = manager.providers.size;
                check.passed = true;
                check.message = `Provider health manager operational (${providerCount} providers, ${running ? 'running' : 'stopped'})`;
            }
        }
        catch (error) {
            check.message = `Provider health manager check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check crash recovery manager (Phase 6C)
     */
    _checkCrashRecoveryManager(viennaCore, result) {
        const check = {
            component: 'recovery',
            name: 'Crash Recovery Manager',
            critical: true,
            passed: false,
            message: ''
        };
        try {
            const manager = viennaCore.crashRecoveryManager;
            if (!manager) {
                check.message = 'Crash recovery manager not initialized';
            }
            else if (typeof manager.runRecovery !== 'function') {
                check.message = 'Crash recovery manager missing runRecovery() method';
            }
            else if (typeof manager.validateQueueConsistency !== 'function') {
                check.message = 'Crash recovery manager missing validateQueueConsistency() method';
            }
            else {
                const stats = manager.getStats();
                const lastRun = stats.last_run ? 'yes' : 'never';
                check.passed = true;
                check.message = `Crash recovery manager operational (last run: ${lastRun}, ${stats.total_runs} total runs)`;
            }
        }
        catch (error) {
            check.message = `Crash recovery manager check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check structured logger (Phase 6D)
     */
    _checkStructuredLogger(viennaCore, result) {
        const check = {
            component: 'logging',
            name: 'Structured Logger',
            critical: false,
            passed: false,
            message: ''
        };
        try {
            const logger = viennaCore.logger;
            if (!logger) {
                check.message = 'Structured logger not initialized';
            }
            else if (typeof logger.log !== 'function') {
                check.message = 'Structured logger missing log() method';
            }
            else if (typeof logger.logExecutionStarted !== 'function') {
                check.message = 'Structured logger missing logExecutionStarted() method';
            }
            else {
                const stats = logger.getStats();
                check.passed = true;
                check.message = `Structured logger operational (${stats.total_logs_created} logs, ${stats.min_level} level)`;
            }
        }
        catch (error) {
            check.message = `Structured logger check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check runtime integrity guard (Phase 6E)
     */
    _checkRuntimeIntegrityGuard(viennaCore, result) {
        const check = {
            component: 'integrity',
            name: 'Runtime Integrity Guard',
            critical: false,
            passed: false,
            message: ''
        };
        try {
            const guard = viennaCore.runtimeIntegrityGuard;
            if (!guard) {
                check.message = 'Runtime integrity guard not initialized';
            }
            else if (typeof guard.runChecks !== 'function') {
                check.message = 'Runtime integrity guard missing runChecks() method';
            }
            else if (typeof guard.getRuntimeStatus !== 'function') {
                check.message = 'Runtime integrity guard missing getRuntimeStatus() method';
            }
            else {
                const stats = guard.getStats();
                const status = stats.runtime_status || 'unknown';
                const running = stats.running ? 'running' : 'stopped';
                check.passed = true;
                check.message = `Runtime integrity guard operational (${status}, ${running})`;
            }
        }
        catch (error) {
            check.message = `Runtime integrity guard check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Check governance modules
     */
    _checkGovernanceModules(viennaCore, result) {
        const modules = [
            { name: 'Warrant', key: 'warrant' },
            { name: 'Risk Tier', key: 'riskTier' },
            { name: 'Trading Guard', key: 'tradingGuard' },
            { name: 'Audit', key: 'audit' }
        ];
        for (const module of modules) {
            const check = {
                component: 'governance',
                name: module.name,
                critical: true,
                passed: false,
                message: ''
            };
            try {
                if (!viennaCore[module.key]) {
                    check.message = `${module.name} not initialized`;
                }
                else {
                    check.passed = true;
                    check.message = `${module.name} loaded`;
                }
            }
            catch (error) {
                check.message = `${module.name} check failed: ${error.message}`;
            }
            result.checks.push(check);
        }
    }
    /**
     * Check adapter registration
     */
    _checkAdapters(viennaCore, result) {
        const check = {
            component: 'adapters',
            name: 'Adapter Registry',
            critical: false,
            passed: false,
            message: ''
        };
        try {
            const executor = viennaCore.queuedExecutor;
            if (!executor) {
                check.message = 'Executor not available for adapter check';
            }
            else {
                const requiredAdapters = [
                    'read_file',
                    'write_file',
                    'edit_file',
                    'delete_file',
                    'exec_command'
                ];
                const missing = [];
                for (const adapterType of requiredAdapters) {
                    if (!executor._adapters || !executor._adapters.has(adapterType)) {
                        missing.push(adapterType);
                    }
                }
                if (missing.length > 0) {
                    check.message = `Missing adapters: ${missing.join(', ')}`;
                }
                else {
                    check.passed = true;
                    check.message = `All core adapters registered (${requiredAdapters.length} types)`;
                }
            }
        }
        catch (error) {
            check.message = `Adapter check failed: ${error.message}`;
        }
        result.checks.push(check);
    }
    /**
     * Format validation result as human-readable report
     */
    formatReport(result) {
        const lines = [];
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('Vienna Core Startup Validation');
        lines.push('═══════════════════════════════════════════════════════════');
        lines.push('');
        lines.push(`Timestamp: ${result.timestamp}`);
        lines.push(`Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
        lines.push('');
        lines.push('Summary:');
        lines.push(`  Total checks: ${result.summary.total}`);
        lines.push(`  Passed: ${result.summary.passed}`);
        lines.push(`  Failed: ${result.summary.failed}`);
        lines.push(`  Critical failures: ${result.summary.critical}`);
        lines.push('');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push('Component Checks:');
        lines.push('───────────────────────────────────────────────────────────');
        lines.push('');
        // Group by component
        const byComponent = {};
        for (const check of result.checks) {
            if (!byComponent[check.component]) {
                byComponent[check.component] = [];
            }
            byComponent[check.component].push(check);
        }
        for (const [component, checks] of Object.entries(byComponent)) {
            lines.push(`${component.toUpperCase()}:`);
            for (const check of checks) {
                const icon = check.passed ? '✅' : (check.critical ? '❌' : '⚠️');
                const critical = check.critical ? ' [CRITICAL]' : '';
                lines.push(`  ${icon} ${check.name}${critical}`);
                lines.push(`     ${check.message}`);
            }
            lines.push('');
        }
        if (!result.valid) {
            lines.push('═══════════════════════════════════════════════════════════');
            lines.push('❌ STARTUP BLOCKED');
            lines.push('═══════════════════════════════════════════════════════════');
            lines.push('');
            lines.push('Vienna Core cannot start due to critical component failures.');
            lines.push('Fix the errors above before attempting to start the runtime.');
            lines.push('');
        }
        return lines.join('\n');
    }
}
module.exports = { StartupValidator };
//# sourceMappingURL=startup-validator.js.map