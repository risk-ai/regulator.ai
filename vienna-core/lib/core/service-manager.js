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

class ServiceManager {
  constructor() {
    this.stateGraph = null;
    this.stateGraphWritesEnabled = false;
    this.env = process.env.VIENNA_ENV || 'prod';
  }

  /**
   * Set State Graph instance (dependency injection)
   * 
   * @param {StateGraph} stateGraph - State Graph instance
   * @param {boolean} enabled - Whether to enable writes
   */
  setStateGraph(stateGraph, enabled = true) {
    this.stateGraph = stateGraph;
    this.stateGraphWritesEnabled = enabled;
  }

  /**
   * Get all services with live status checks
   * 
   * @returns {Promise<Array>} Service status array
   */
  async getServices() {
    const services = [];
    
    // Check OpenClaw Gateway
    const gatewayStatus = await this._checkOpenClawGateway();
    services.push(gatewayStatus);
    
    // Check Vienna Executor (internal)
    const executorStatus = await this._checkViennaExecutor();
    services.push(executorStatus);
    
    // Write to State Graph (fire-and-forget)
    if (this.stateGraphWritesEnabled && this.stateGraph) {
      for (const service of services) {
        this._writeServiceStatus(service).catch(err => {
          // Already logged in _writeServiceStatus, prevent unhandled rejection
        });
      }
    }
    
    return services;
  }

  /**
   * Check OpenClaw Gateway status
   * 
   * @returns {Promise<Object>} Service status
   */
  async _checkOpenClawGateway() {
    try {
      const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || '18789';
      const response = await fetch(`http://localhost:${gatewayPort}/health`, {
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      const healthy = response.ok;
      
      return {
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: healthy ? 'running' : 'degraded',
        health: healthy ? 'healthy' : 'unhealthy',
        last_check_at: new Date().toISOString(),
        metadata: {
          port: gatewayPort,
          connectivity: healthy ? 'healthy' : 'degraded'
        }
      };
    } catch (error) {
      return {
        service_id: 'openclaw-gateway',
        service_name: 'OpenClaw Gateway',
        service_type: 'api',
        status: 'stopped',
        health: 'unhealthy',
        last_check_at: new Date().toISOString(),
        metadata: {
          error: error.message,
          connectivity: 'offline'
        }
      };
    }
  }

  /**
   * Check Vienna Executor status (internal)
   * 
   * @returns {Promise<Object>} Service status
   */
  async _checkViennaExecutor() {
    // Note: This requires executor reference to be injected
    // For now, return unknown status
    return {
      service_id: 'vienna-executor',
      service_name: 'Vienna Executor',
      service_type: 'worker',
      status: 'unknown',
      health: 'unknown',
      last_check_at: new Date().toISOString(),
      metadata: {}
    };
  }

  /**
   * Restart service (creates recovery objective)
   * 
   * @param {string} serviceId - Service ID
   * @param {string} operator - Operator name
   * @returns {Promise<Object>} Restart result
   */
  async restartService(serviceId, operator) {
    // Placeholder for Phase 7.2 Stage 4
    // In future: create recovery objective, execute restart, update State Graph
    
    const result = {
      objective_id: '',
      status: 'preview',
      message: `Restart ${serviceId} requires governance approval. Recovery objectives not yet implemented.`,
      service_id: serviceId,
      operator
    };
    
    // Write attempt to State Graph (fire-and-forget)
    if (this.stateGraphWritesEnabled && this.stateGraph) {
      this._writeRestartAttempt(serviceId, operator, result).catch(err => {
        // Already logged, prevent unhandled rejection
      });
    }
    
    return result;
  }

  /**
   * Write service status to State Graph (non-blocking)
   * 
   * @param {Object} service - Service status object
   * @returns {Promise<void>}
   */
  async _writeServiceStatus(service) {
    if (!this.stateGraph || !this.stateGraphWritesEnabled) {
      return;
    }
    
    try {
      // Check if service exists
      const existing = this.stateGraph.getService(service.service_id);
      
      if (existing) {
        // Update existing service
        await this.stateGraph.updateService(
          service.service_id,
          {
            status: service.status,
            health: service.health,
            last_check_at: service.last_check_at,
            metadata: service.metadata
          },
          'service_manager'
        );
      } else {
        // Create new service
        await this.stateGraph.createService({
          service_id: service.service_id,
          service_name: service.service_name,
          service_type: service.service_type,
          status: service.status,
          health: service.health,
          last_check_at: service.last_check_at,
          metadata: service.metadata
        });
      }
    } catch (error) {
      console.error(`[ServiceManager] Failed to write service status for ${service.service_id}:`, error.message);
      // Continue operation (DB failure does not block service checks)
    }
  }

  /**
   * Write restart attempt to State Graph (non-blocking)
   * 
   * @param {string} serviceId - Service ID
   * @param {string} operator - Operator name
   * @param {Object} result - Restart result
   * @returns {Promise<void>}
   */
  async _writeRestartAttempt(serviceId, operator, result) {
    if (!this.stateGraph || !this.stateGraphWritesEnabled) {
      return;
    }
    
    try {
      const now = new Date().toISOString();
      
      // Update service with restart attempt
      await this.stateGraph.updateService(
        serviceId,
        {
          last_restart_at: now,
          metadata: {
            last_restart_status: result.status,
            last_restart_operator: operator,
            last_restart_objective: result.objective_id
          }
        },
        operator
      );
    } catch (error) {
      console.error(`[ServiceManager] Failed to write restart attempt for ${serviceId}:`, error.message);
      // Continue operation (DB failure does not block restart logic)
    }
  }

  /**
   * Reconcile State Graph with live service status (startup)
   * 
   * @returns {Promise<void>}
   */
  async reconcileStateGraph() {
    if (!this.stateGraph || !this.stateGraphWritesEnabled) {
      return;
    }
    
    try {
      console.log('[ServiceManager] Reconciling State Graph with live service status...');
      
      // Get live service status
      const services = await this.getServices();
      
      // Write each service (will update or create)
      for (const service of services) {
        await this._writeServiceStatus(service);
      }
      
      console.log(`[ServiceManager] Reconciled ${services.length} service(s) to State Graph`);
    } catch (error) {
      console.error('[ServiceManager] State Graph reconciliation failed:', error.message);
      // Continue operation (DB failure does not block startup)
    }
  }
}

module.exports = { ServiceManager };
