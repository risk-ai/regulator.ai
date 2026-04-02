/**
 * Provider Health Bridge
 *
 * Connects ProviderHealthManager to RuntimeModeManager with automatic updates.
 */
export class ProviderHealthBridge {
    constructor(providerHealthManager: any, runtimeModeManager: any, options?: {});
    providerHealthManager: any;
    runtimeModeManager: any;
    updateIntervalMs: any;
    gatewayCheckIntervalMs: any;
    updateTimer: NodeJS.Timeout;
    gatewayCheckTimer: NodeJS.Timeout;
    gatewayConnected: boolean;
    running: boolean;
    eventEmitter: any;
    logger: any;
    /**
     * Start automatic runtime mode updates
     */
    start(): void;
    /**
     * Stop automatic runtime mode updates
     */
    stop(): void;
    /**
     * Update runtime mode based on current provider health
     */
    updateRuntimeMode(): Promise<void>;
    /**
     * Check gateway connectivity
     */
    checkGateway(): Promise<void>;
    /**
     * Get current provider health (in RuntimeModeManager format)
     *
     * @returns {Map<string, object>}
     */
    getProviderHealth(): Map<string, object>;
    /**
     * Get current runtime mode state
     *
     * @returns {object}
     */
    getRuntimeModeState(): object;
    /**
     * Force runtime mode (operator override)
     *
     * @param {string} mode - Target mode
     * @param {string} reason - Reason for override
     * @returns {object} Transition record
     */
    forceMode(mode: string, reason: string): object;
}
/**
 * Provider Health Bridge (Phase 6.5)
 *
 * Bridges ProviderHealthManager (Phase 6B) to RuntimeModeManager (Phase 6.5).
 *
 * Responsibilities:
 * - Convert ProviderHealthManager state to RuntimeModeManager format
 * - Trigger runtime mode updates on provider health changes
 * - Maintain gateway connectivity awareness
 */
/**
 * Convert ProviderHealthManager state to RuntimeModeManager format
 *
 * @param {Map} providerHealthManagerState - State from ProviderHealthManager
 * @returns {Map<string, object>} Provider health in RuntimeModeManager format
 */
export function convertProviderHealth(providerHealthManagerState: Map<any, any>): Map<string, object>;
/**
 * Check if gateway is connected
 *
 * @returns {Promise<boolean>} True if gateway connected
 */
export function checkGatewayConnected(): Promise<boolean>;
//# sourceMappingURL=provider-health-bridge.d.ts.map