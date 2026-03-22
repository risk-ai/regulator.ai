/**
 * Recovery Copilot
 *
 * Provides diagnostic intelligence and recovery proposals.
 * Does NOT execute recovery actions autonomously.
 */
export class RecoveryCopilot {
    intentParser: RecoveryIntentParser;
    /**
     * Process recovery intent
     *
     * @param {string} message
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {Promise<string>}
     */
    processIntent(message: string, runtimeState: object, providerHealth: Map<string, object>): Promise<string>;
    /**
     * Diagnose system state
     *
     * @param {object} runtimeState - Extended runtime state with executor/queue/DLQ data
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    diagnoseSystem(runtimeState: object, providerHealth: Map<string, object>): string;
    /**
     * Show recent failures
     *
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    showFailures(providerHealth: Map<string, object>): string;
    /**
     * Show dead letters (stub - needs DLQ integration)
     *
     * @returns {string}
     */
    showDeadLetters(): string;
    /**
     * Explain blockers
     *
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    explainBlockers(runtimeState: object, providerHealth: Map<string, object>): string;
    /**
     * Test provider health
     *
     * @param {string} provider
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    testProvider(provider: string, providerHealth: Map<string, object>): string;
    /**
     * Propose local-only mode transition
     *
     * @param {object} runtimeState
     * @returns {string}
     */
    proposeLocalOnly(runtimeState: object): string;
    /**
     * Get recovery checklist
     *
     * @param {object} runtimeState
     * @param {Map<string, object>} providerHealth
     * @returns {string}
     */
    getRecoveryChecklist(runtimeState: object, providerHealth: Map<string, object>): string;
    /**
     * Show current runtime mode
     *
     * @param {object} runtimeState
     * @returns {string}
     */
    showMode(runtimeState: object): string;
    /**
     * Propose recovery actions
     *
     * @param {object} runtimeState - Extended runtime state with executor/queue/DLQ data
     * @param {Map<string, object>} providerHealth
     * @returns {Array<object>}
     */
    proposeRecoveryActions(runtimeState: object, providerHealth: Map<string, object>): Array<object>;
}
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
export class RecoveryIntentParser {
    parseIntent(message: any): {
        intent: string;
        params: {
            provider?: undefined;
        };
    } | {
        intent: string;
        params: {
            provider: any;
        };
    };
}
//# sourceMappingURL=recovery-copilot.d.ts.map