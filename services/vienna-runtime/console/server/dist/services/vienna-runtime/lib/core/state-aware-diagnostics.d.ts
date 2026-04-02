/**
 * State-Aware Diagnostics
 *
 * Read-path integration for State Graph diagnostics and recovery.
 * Phase 7.3: State-Aware Reads
 *
 * Design:
 * - State Graph is the source of truth for historical data
 * - Live checks provide real-time validation
 * - Stale state detection based on timestamp comparison
 * - Graceful fallback when State Graph unavailable
 */
export class StateAwareDiagnostics {
    stateGraph: any;
    serviceManager: any;
    providerHealthManager: any;
    runtimeModeManager: any;
    staleLimitMs: number;
    /**
     * Set dependencies (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {ServiceManager} serviceManager - Service Manager instance
     * @param {ProviderHealthManager} providerHealthManager - Provider Health Manager
     * @param {RuntimeModeManager} runtimeModeManager - Runtime Mode Manager
     */
    setDependencies(stateGraph: StateGraph, serviceManager: ServiceManager, providerHealthManager: ProviderHealthManager, runtimeModeManager: RuntimeModeManager): void;
    /**
     * Get service status with staleness detection
     *
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Service status with freshness metadata
     */
    getServiceStatus(serviceId: string): Promise<any>;
    /**
     * Get all services with staleness detection
     *
     * @returns {Promise<Array>} All service statuses with freshness metadata
     */
    getAllServices(): Promise<any[]>;
    /**
     * Get provider health history
     *
     * @param {string} providerId - Provider ID
     * @param {number} limit - Max transitions to return
     * @returns {Promise<Array>} Provider health transitions
     */
    getProviderHealthHistory(providerId: string, limit?: number): Promise<any[]>;
    /**
     * Get runtime mode history
     *
     * @param {number} limit - Max transitions to return
     * @returns {Promise<Array>} Runtime mode transitions
     */
    getRuntimeModeHistory(limit?: number): Promise<any[]>;
    /**
     * Get open incidents
     *
     * @returns {Promise<Array>} Open incidents
     */
    getOpenIncidents(): Promise<any[]>;
    /**
     * Get active objectives
     *
     * @returns {Promise<Array>} Active objectives
     */
    getActiveObjectives(): Promise<any[]>;
    /**
     * Detect stale state across all entities
     *
     * @returns {Promise<Object>} Stale state report
     */
    detectStaleState(): Promise<any>;
    /**
     * Live service check (fallback when State Graph unavailable)
     *
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Live service status
     */
    _liveServiceCheck(serviceId: string): Promise<any>;
    /**
     * Live all services check (fallback when State Graph unavailable)
     *
     * @returns {Promise<Array>} Live service statuses
     */
    _liveAllServicesCheck(): Promise<any[]>;
    /**
     * Get unified system truth snapshot (Phase 7.3)
     *
     * Pulls together authoritative state from State Graph:
     * - Services (status, health, dependencies)
     * - Providers (health, credentials, rate limits)
     * - Runtime mode (current mode, transition history)
     * - Endpoints (registered endpoints, instruction history)
     * - Incidents (open incidents, recent resolutions)
     * - Objectives (active objectives, completion status)
     *
     * @returns {Promise<Object>} Unified system snapshot
     */
    getSystemSnapshot(): Promise<any>;
}
//# sourceMappingURL=state-aware-diagnostics.d.ts.map