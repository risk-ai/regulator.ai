/**
 * Service Manager
 *
 * Manages system service status and health tracking.
 * Integrates with State Graph (Phase 7.2 Stage 4).
 *
 * Design:
 * - Runtime truth from live checks overrides stored state
 * - State Graph writes are fire-and-forget (non-blocking)
 * - DB failure does not affect service operations
 * - Idempotent writes (use updateService, not create)
 */
export class ServiceManager {
    stateGraph: any;
    stateGraphWritesEnabled: boolean;
    env: string;
    /**
     * Set State Graph instance (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} enabled - Whether to enable writes
     */
    setStateGraph(stateGraph: StateGraph, enabled?: boolean): void;
    /**
     * Get all services with live status checks
     *
     * @returns {Promise<Array>} Service status array
     */
    getServices(): Promise<any[]>;
    /**
     * Check OpenClaw Gateway status
     *
     * @returns {Promise<Object>} Service status
     */
    _checkOpenClawGateway(): Promise<any>;
    /**
     * Check Vienna Executor status (internal)
     *
     * @returns {Promise<Object>} Service status
     */
    _checkViennaExecutor(): Promise<any>;
    /**
     * Restart service (creates recovery objective)
     *
     * @param {string} serviceId - Service ID
     * @param {string} operator - Operator name
     * @returns {Promise<Object>} Restart result
     */
    restartService(serviceId: string, operator: string): Promise<any>;
    /**
     * Write service status to State Graph (non-blocking)
     *
     * @param {Object} service - Service status object
     * @returns {Promise<void>}
     */
    _writeServiceStatus(service: any): Promise<void>;
    /**
     * Write restart attempt to State Graph (non-blocking)
     *
     * @param {string} serviceId - Service ID
     * @param {string} operator - Operator name
     * @param {Object} result - Restart result
     * @returns {Promise<void>}
     */
    _writeRestartAttempt(serviceId: string, operator: string, result: any): Promise<void>;
    /**
     * Reconcile State Graph with live service status (startup)
     *
     * @returns {Promise<void>}
     */
    reconcileStateGraph(): Promise<void>;
}
//# sourceMappingURL=service-manager.d.ts.map