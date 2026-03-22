/**
 * Runtime Mode Manager
 */
export class RuntimeModeManager {
    currentState: {
        mode: string;
        reasons: any[];
        enteredAt: string;
        previousMode: any;
        fallbackProvidersActive: any[];
        availableCapabilities: any[];
    };
    transitions: any[];
    maxTransitionHistory: number;
    stateGraph: any;
    stateGraphWritesEnabled: boolean;
    /**
     * Set State Graph for persistent storage (Phase 7.2)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} writesEnabled - Enable State Graph writes (default: false)
     */
    setStateGraph(stateGraph: StateGraph, writesEnabled?: boolean): void;
    /**
     * Write mode transition to State Graph (Phase 7.2 Stage 3)
     *
     * Non-blocking: logs and continues on failure.
     * Creates state_transition record and updates runtime_context.
     *
     * @param {object} transition - Transition record
     */
    _writeModeTransition(transition: object): Promise<void>;
    /**
     * Reconcile State Graph with actual runtime mode (Phase 7.2 Stage 3)
     *
     * Called on startup to ensure State Graph matches current runtime mode.
     * Re-computes mode from provider health and writes result.
     *
     * @param {Map<string, object>} providerHealth - Provider health map
     * @param {boolean} gatewayConnected - Gateway connectivity status
     */
    reconcileStateGraph(providerHealth: Map<string, object>, gatewayConnected: boolean): Promise<void>;
    /**
     * Update runtime mode based on provider health
     *
     * @param {Map<string, object>} providerHealth
     * @param {boolean} gatewayConnected
     * @returns {object|null} Transition record or null if no change
     */
    updateMode(providerHealth: Map<string, object>, gatewayConnected: boolean): object | null;
    /**
     * Force a mode transition (operator override)
     *
     * @param {string} mode
     * @param {string} reason
     * @param {Map<string, object>} providerHealth
     * @returns {object} Transition record
     */
    forceMode(mode: string, reason: string, providerHealth: Map<string, object>): object;
    /**
     * Get current runtime mode state
     *
     * @returns {object}
     */
    getCurrentState(): object;
    /**
     * Get mode transition history
     *
     * @param {number} limit
     * @returns {Array<object>}
     */
    getTransitionHistory(limit?: number): Array<object>;
    /**
     * Check if capability is available in current mode
     *
     * @param {string} capability
     * @returns {boolean}
     */
    isCapabilityAvailable(capability: string): boolean;
}
/**
 * Determine appropriate runtime mode based on provider health
 *
 * @param {Map<string, object>} providerHealth
 * @param {boolean} gatewayConnected
 * @returns {string} Runtime mode
 */
export function determineRuntimeMode(providerHealth: Map<string, object>, gatewayConnected: boolean): string;
/**
 * Get reasons for current runtime mode
 *
 * @param {string} mode
 * @param {Map<string, object>} providerHealth
 * @param {boolean} gatewayConnected
 * @returns {Array<string>}
 */
export function getRuntimeModeReasons(mode: string, providerHealth: Map<string, object>, gatewayConnected: boolean): Array<string>;
/**
 * Get available capabilities for current runtime mode
 *
 * @param {string} mode
 * @param {Set<string>} healthyProviders
 * @returns {Array<string>}
 */
export function getAvailableCapabilities(mode: string, healthyProviders: Set<string>): Array<string>;
/**
 * Check if a mode transition is allowed
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function isTransitionAllowed(from: string, to: string): boolean;
/**
 * Get fallback providers for current mode
 *
 * @param {string} mode
 * @param {Map<string, object>} providerHealth
 * @returns {Array<string>}
 */
export function getFallbackProviders(mode: string, providerHealth: Map<string, object>): Array<string>;
//# sourceMappingURL=runtime-modes.d.ts.map