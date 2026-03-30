/**
 * Vienna Runtime Modes (Phase 6.5)
 *
 * Manages runtime operating modes and transitions.
 *
 * Modes:
 * - normal: All providers healthy, full routing
 * - degraded: Remote providers unhealthy, local fallback active
 * - local-only: Gateway/remote broken, only local operations allowed
 * - operator-only: All AI unavailable, diagnostics/inspection only
 */
const { getAlwaysAvailableProviders, getDegradedModeProviders, } = require('../providers/registry');
/**
 * Determine appropriate runtime mode based on provider health
 *
 * @param {Map<string, object>} providerHealth
 * @param {boolean} gatewayConnected
 * @returns {string} Runtime mode
 */
function determineRuntimeMode(providerHealth, gatewayConnected) {
    const healthyProviders = new Set();
    const degradedProviders = new Set();
    const unavailableProviders = new Set();
    // Categorize providers by health
    for (const [name, health] of providerHealth.entries()) {
        if (health.status === 'healthy') {
            healthyProviders.add(name);
        }
        else if (health.status === 'degraded') {
            degradedProviders.add(name);
        }
        else if (health.status === 'unavailable') {
            unavailableProviders.add(name);
        }
    }
    // Check for always-available providers (local)
    const alwaysAvailable = getAlwaysAvailableProviders();
    const hasLocalProvider = alwaysAvailable.some(spec => healthyProviders.has(spec.id));
    // Determine mode
    // operator-only: No providers available
    if (healthyProviders.size === 0) {
        return 'operator-only';
    }
    // local-only: Gateway down
    if (!gatewayConnected) {
        return 'local-only';
    }
    // degraded: Some providers unavailable (but at least one healthy)
    if (unavailableProviders.size > 0 || degradedProviders.size > 0) {
        return 'degraded';
    }
    // If only local provider is healthy (no remote), also degraded
    const hasRemoteProvider = Array.from(healthyProviders).some(name => !alwaysAvailable.find(spec => spec.id === name));
    if (!hasRemoteProvider && hasLocalProvider) {
        return 'degraded';
    }
    if (unavailableProviders.size > 0 || degradedProviders.size > 0) {
        return 'degraded';
    }
    // normal: All providers healthy
    return 'normal';
}
/**
 * Get reasons for current runtime mode
 *
 * @param {string} mode
 * @param {Map<string, object>} providerHealth
 * @param {boolean} gatewayConnected
 * @returns {Array<string>}
 */
function getRuntimeModeReasons(mode, providerHealth, gatewayConnected) {
    const reasons = [];
    switch (mode) {
        case 'operator-only':
            reasons.push('No healthy providers available');
            if (!gatewayConnected) {
                reasons.push('Gateway disconnected');
            }
            break;
        case 'local-only':
            if (!gatewayConnected) {
                reasons.push('Gateway disconnected');
            }
            const remoteProviders = Array.from(providerHealth.entries())
                .filter(([name]) => name !== 'local');
            if (remoteProviders.length > 0 && remoteProviders.every(([, h]) => h.status === 'unavailable')) {
                reasons.push('All remote providers unavailable');
            }
            break;
        case 'degraded':
            for (const [name, health] of providerHealth.entries()) {
                if (health.status === 'unavailable') {
                    reasons.push(`Provider ${name} unavailable`);
                }
                else if (health.status === 'degraded') {
                    reasons.push(`Provider ${name} degraded`);
                }
            }
            break;
        case 'normal':
            // No reasons needed
            break;
    }
    return reasons;
}
/**
 * Get available capabilities for current runtime mode
 *
 * @param {string} mode
 * @param {Set<string>} healthyProviders
 * @returns {Array<string>}
 */
function getAvailableCapabilities(mode, healthyProviders) {
    const capabilities = new Set();
    // In operator-only mode, no AI capabilities available
    if (mode === 'operator-only') {
        return ['diagnostics_manual', 'inspection', 'status_queries'];
    }
    // Get capabilities from healthy providers
    const alwaysAvailable = getAlwaysAvailableProviders();
    const degradedEligible = getDegradedModeProviders();
    for (const providerId of healthyProviders) {
        const spec = alwaysAvailable.find(s => s.id === providerId) ||
            degradedEligible.find(s => s.id === providerId);
        if (spec) {
            spec.capabilities.forEach(cap => capabilities.add(cap));
        }
    }
    return Array.from(capabilities);
}
/**
 * Check if a mode transition is allowed
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
function isTransitionAllowed(from, to) {
    // All transitions allowed for now
    // Future: Add policy constraints
    return true;
}
/**
 * Get fallback providers for current mode
 *
 * @param {string} mode
 * @param {Map<string, object>} providerHealth
 * @returns {Array<string>}
 */
function getFallbackProviders(mode, providerHealth) {
    if (mode === 'normal') {
        return [];
    }
    const fallbackProviders = [];
    for (const [name, health] of providerHealth.entries()) {
        if (health.status === 'healthy') {
            const alwaysAvailable = getAlwaysAvailableProviders();
            if (alwaysAvailable.some(spec => spec.id === name)) {
                fallbackProviders.push(name);
            }
        }
    }
    return fallbackProviders;
}
/**
 * Runtime Mode Manager
 */
class RuntimeModeManager {
    constructor() {
        this.currentState = {
            mode: 'normal',
            reasons: [],
            enteredAt: new Date().toISOString(),
            previousMode: null,
            fallbackProvidersActive: [],
            availableCapabilities: [],
        };
        this.transitions = [];
        this.maxTransitionHistory = 100;
        // Phase 7.2: State Graph integration
        this.stateGraph = null; // Set by ViennaCore
        this.stateGraphWritesEnabled = false; // Set via setStateGraph
    }
    /**
     * Set State Graph for persistent storage (Phase 7.2)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} writesEnabled - Enable State Graph writes (default: false)
     */
    setStateGraph(stateGraph, writesEnabled = false) {
        this.stateGraph = stateGraph;
        this.stateGraphWritesEnabled = writesEnabled && stateGraph !== null;
        if (this.stateGraphWritesEnabled) {
            console.log('[RuntimeModeManager] State Graph writes enabled');
        }
    }
    /**
     * Write mode transition to State Graph (Phase 7.2 Stage 3)
     *
     * Non-blocking: logs and continues on failure.
     * Creates state_transition record and updates runtime_context.
     *
     * @param {object} transition - Transition record
     */
    async _writeModeTransition(transition) {
        if (!this.stateGraphWritesEnabled)
            return;
        try {
            // Update current mode in runtime_context
            await this.stateGraph.setRuntimeContext('runtime_mode', transition.to, {
                context_type: 'mode',
                metadata: {
                    previous_mode: transition.from,
                    transition_reason: transition.reason,
                    transition_timestamp: transition.timestamp,
                    automatic: transition.automatic
                }
            });
            // Note: state_transitions record created automatically by setRuntimeContext
        }
        catch (error) {
            // Non-blocking: log and continue
            console.warn(`[RuntimeModeManager] Failed to write mode transition to State Graph:`, error.message);
        }
    }
    /**
     * Reconcile State Graph with actual runtime mode (Phase 7.2 Stage 3)
     *
     * Called on startup to ensure State Graph matches current runtime mode.
     * Re-computes mode from provider health and writes result.
     *
     * @param {Map<string, object>} providerHealth - Provider health map
     * @param {boolean} gatewayConnected - Gateway connectivity status
     */
    async reconcileStateGraph(providerHealth, gatewayConnected) {
        if (!this.stateGraphWritesEnabled)
            return;
        console.log('[RuntimeModeManager] Reconciling State Graph with runtime mode');
        try {
            // Recompute current mode from actual runtime state
            const computedMode = determineRuntimeMode(providerHealth, gatewayConnected);
            const reasons = getRuntimeModeReasons(computedMode, providerHealth, gatewayConnected);
            // Update State Graph to match current reality
            await this.stateGraph.setRuntimeContext('runtime_mode', computedMode, {
                context_type: 'mode',
                metadata: {
                    previous_mode: this.currentState.mode,
                    transition_reason: 'Startup reconciliation',
                    transition_timestamp: new Date().toISOString(),
                    automatic: true,
                    reasons: reasons
                }
            });
            console.log(`[RuntimeModeManager] State Graph reconciled to mode: ${computedMode}`);
        }
        catch (error) {
            console.warn(`[RuntimeModeManager] State Graph reconciliation failed:`, error.message);
        }
    }
    /**
     * Update runtime mode based on provider health
     *
     * @param {Map<string, object>} providerHealth
     * @param {boolean} gatewayConnected
     * @returns {object|null} Transition record or null if no change
     */
    updateMode(providerHealth, gatewayConnected) {
        const newMode = determineRuntimeMode(providerHealth, gatewayConnected);
        if (newMode === this.currentState.mode) {
            return null; // No transition
        }
        // Create transition
        const transition = {
            from: this.currentState.mode,
            to: newMode,
            timestamp: new Date().toISOString(),
            reason: getRuntimeModeReasons(newMode, providerHealth, gatewayConnected).join('; '),
            automatic: true,
        };
        // Update state
        const healthyProviders = new Set(Array.from(providerHealth.entries())
            .filter(([, h]) => h.status === 'healthy')
            .map(([name]) => name));
        this.currentState = {
            mode: newMode,
            reasons: getRuntimeModeReasons(newMode, providerHealth, gatewayConnected),
            enteredAt: new Date().toISOString(),
            previousMode: this.currentState.mode,
            fallbackProvidersActive: getFallbackProviders(newMode, providerHealth),
            availableCapabilities: getAvailableCapabilities(newMode, healthyProviders),
        };
        // Record transition
        this.transitions.push(transition);
        if (this.transitions.length > this.maxTransitionHistory) {
            this.transitions.shift();
        }
        console.log(`[RuntimeMode] Transitioned ${transition.from} → ${transition.to}: ${transition.reason}`);
        // Phase 7.2 Stage 3: Write to State Graph (fire-and-forget, non-blocking)
        this._writeModeTransition(transition).catch(err => {
            // Already logged in _writeModeTransition, but catch to prevent unhandled rejection
        });
        return transition;
    }
    /**
     * Force a mode transition (operator override)
     *
     * @param {string} mode
     * @param {string} reason
     * @param {Map<string, object>} providerHealth
     * @returns {object} Transition record
     */
    forceMode(mode, reason, providerHealth) {
        const transition = {
            from: this.currentState.mode,
            to: mode,
            timestamp: new Date().toISOString(),
            reason,
            automatic: false,
        };
        const healthyProviders = new Set(Array.from(providerHealth.entries())
            .filter(([, h]) => h.status === 'healthy')
            .map(([name]) => name));
        this.currentState = {
            mode,
            reasons: [reason],
            enteredAt: new Date().toISOString(),
            previousMode: this.currentState.mode,
            fallbackProvidersActive: getFallbackProviders(mode, providerHealth),
            availableCapabilities: getAvailableCapabilities(mode, healthyProviders),
        };
        this.transitions.push(transition);
        if (this.transitions.length > this.maxTransitionHistory) {
            this.transitions.shift();
        }
        console.log(`[RuntimeMode] Operator override ${transition.from} → ${transition.to}: ${transition.reason}`);
        // Phase 7.2 Stage 3: Write to State Graph (fire-and-forget, non-blocking)
        this._writeModeTransition(transition).catch(err => {
            // Already logged in _writeModeTransition, but catch to prevent unhandled rejection
        });
        return transition;
    }
    /**
     * Get current runtime mode state
     *
     * @returns {object}
     */
    getCurrentState() {
        return { ...this.currentState };
    }
    /**
     * Get mode transition history
     *
     * @param {number} limit
     * @returns {Array<object>}
     */
    getTransitionHistory(limit = 10) {
        return this.transitions.slice(-limit);
    }
    /**
     * Check if capability is available in current mode
     *
     * @param {string} capability
     * @returns {boolean}
     */
    isCapabilityAvailable(capability) {
        return this.currentState.availableCapabilities.includes(capability);
    }
}
module.exports = {
    RuntimeModeManager,
    determineRuntimeMode,
    getRuntimeModeReasons,
    getAvailableCapabilities,
    isTransitionAllowed,
    getFallbackProviders,
};
//# sourceMappingURL=runtime-modes.js.map