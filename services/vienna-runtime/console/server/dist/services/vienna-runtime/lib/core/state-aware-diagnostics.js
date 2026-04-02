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
class StateAwareDiagnostics {
    constructor() {
        this.stateGraph = null;
        this.serviceManager = null;
        this.providerHealthManager = null;
        this.runtimeModeManager = null;
        this.staleLimitMs = 5 * 60 * 1000; // 5 minutes
    }
    /**
     * Set dependencies (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {ServiceManager} serviceManager - Service Manager instance
     * @param {ProviderHealthManager} providerHealthManager - Provider Health Manager
     * @param {RuntimeModeManager} runtimeModeManager - Runtime Mode Manager
     */
    setDependencies(stateGraph, serviceManager, providerHealthManager, runtimeModeManager) {
        this.stateGraph = stateGraph;
        this.serviceManager = serviceManager;
        this.providerHealthManager = providerHealthManager;
        this.runtimeModeManager = runtimeModeManager;
    }
    /**
     * Get service status with staleness detection
     *
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Service status with freshness metadata
     */
    async getServiceStatus(serviceId) {
        if (!this.stateGraph) {
            // Fallback: live check only
            return await this._liveServiceCheck(serviceId);
        }
        try {
            // Read from State Graph
            const stored = this.stateGraph.getService(serviceId);
            if (!stored) {
                // Not in State Graph, perform live check
                return await this._liveServiceCheck(serviceId);
            }
            // Check staleness
            const lastCheckMs = new Date(stored.last_check_at).getTime();
            const nowMs = Date.now();
            const ageMs = nowMs - lastCheckMs;
            const isStale = ageMs > this.staleLimitMs;
            if (isStale) {
                // Stale: perform live check and compare
                const live = await this._liveServiceCheck(serviceId);
                return {
                    ...live,
                    _metadata: {
                        source: 'live',
                        reason: 'stale_state_detected',
                        stored_age_ms: ageMs,
                        stored_status: stored.status,
                        stored_health: stored.health,
                        state_drift: live.status !== stored.status || live.health !== stored.health
                    }
                };
            }
            // Fresh: return stored state
            return {
                service_id: stored.service_id,
                service_name: stored.service_name,
                service_type: stored.service_type,
                status: stored.status,
                health: stored.health,
                last_check_at: stored.last_check_at,
                last_restart_at: stored.last_restart_at,
                metadata: stored.metadata ? JSON.parse(stored.metadata) : {},
                _metadata: {
                    source: 'state_graph',
                    age_ms: ageMs,
                    fresh: true
                }
            };
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get service status from State Graph:', error.message);
            // Fallback: live check
            return await this._liveServiceCheck(serviceId);
        }
    }
    /**
     * Get all services with staleness detection
     *
     * @returns {Promise<Array>} All service statuses with freshness metadata
     */
    async getAllServices() {
        if (!this.stateGraph) {
            // Fallback: live checks only
            return await this._liveAllServicesCheck();
        }
        try {
            // Read from State Graph
            const stored = this.stateGraph.listServices();
            if (stored.length === 0) {
                // Empty State Graph, perform live checks
                return await this._liveAllServicesCheck();
            }
            // Check staleness for each service
            const services = [];
            for (const storedService of stored) {
                const lastCheckMs = new Date(storedService.last_check_at).getTime();
                const nowMs = Date.now();
                const ageMs = nowMs - lastCheckMs;
                const isStale = ageMs > this.staleLimitMs;
                if (isStale) {
                    // Stale: perform live check
                    const live = await this._liveServiceCheck(storedService.service_id);
                    services.push({
                        ...live,
                        _metadata: {
                            source: 'live',
                            reason: 'stale_state_detected',
                            stored_age_ms: ageMs,
                            stored_status: storedService.status,
                            stored_health: storedService.health,
                            state_drift: live.status !== storedService.status || live.health !== storedService.health
                        }
                    });
                }
                else {
                    // Fresh: use stored state
                    services.push({
                        service_id: storedService.service_id,
                        service_name: storedService.service_name,
                        service_type: storedService.service_type,
                        status: storedService.status,
                        health: storedService.health,
                        last_check_at: storedService.last_check_at,
                        last_restart_at: storedService.last_restart_at,
                        metadata: storedService.metadata ? JSON.parse(storedService.metadata) : {},
                        _metadata: {
                            source: 'state_graph',
                            age_ms: ageMs,
                            fresh: true
                        }
                    });
                }
            }
            return services;
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get all services from State Graph:', error.message);
            // Fallback: live checks
            return await this._liveAllServicesCheck();
        }
    }
    /**
     * Get provider health history
     *
     * @param {string} providerId - Provider ID
     * @param {number} limit - Max transitions to return
     * @returns {Promise<Array>} Provider health transitions
     */
    async getProviderHealthHistory(providerId, limit = 10) {
        if (!this.stateGraph) {
            return [];
        }
        try {
            // Query state transitions for provider
            const transitions = this.stateGraph.listTransitions({
                entity_type: 'provider',
                entity_id: providerId
            });
            // Filter to health/status transitions
            const healthTransitions = transitions
                .filter(t => t.field_name === 'health' || t.field_name === 'status')
                .slice(0, limit);
            return healthTransitions.map(t => ({
                field: t.field_name,
                old_value: t.old_value,
                new_value: t.new_value,
                changed_by: t.changed_by,
                changed_at: t.changed_at,
                metadata: t.metadata ? JSON.parse(t.metadata) : {}
            }));
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get provider health history:', error.message);
            return [];
        }
    }
    /**
     * Get runtime mode history
     *
     * @param {number} limit - Max transitions to return
     * @returns {Promise<Array>} Runtime mode transitions
     */
    async getRuntimeModeHistory(limit = 10) {
        if (!this.stateGraph) {
            return [];
        }
        try {
            // Query state transitions for runtime_mode
            const transitions = this.stateGraph.listTransitions({
                entity_type: 'runtime_context'
            });
            // Filter to runtime_mode transitions
            const modeTransitions = transitions
                .filter(t => t.entity_id === 'runtime_mode')
                .slice(0, limit);
            return modeTransitions.map(t => ({
                old_mode: t.old_value,
                new_mode: t.new_value,
                changed_by: t.changed_by,
                changed_at: t.changed_at,
                metadata: t.metadata ? JSON.parse(t.metadata) : {}
            }));
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get runtime mode history:', error.message);
            return [];
        }
    }
    /**
     * Get open incidents
     *
     * @returns {Promise<Array>} Open incidents
     */
    async getOpenIncidents() {
        if (!this.stateGraph) {
            return [];
        }
        try {
            const incidents = this.stateGraph.listIncidents({ status: 'open' });
            return incidents.map(i => ({
                incident_id: i.incident_id,
                incident_type: i.incident_type,
                severity: i.severity,
                status: i.status,
                affected_services: i.affected_services ? JSON.parse(i.affected_services) : [],
                detected_at: i.detected_at,
                detected_by: i.detected_by,
                root_cause: i.root_cause,
                action_taken: i.action_taken
            }));
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get open incidents:', error.message);
            return [];
        }
    }
    /**
     * Get active objectives
     *
     * @returns {Promise<Array>} Active objectives
     */
    async getActiveObjectives() {
        if (!this.stateGraph) {
            return [];
        }
        try {
            const objectives = this.stateGraph.listObjectives({ status: 'active' });
            return objectives.map(o => ({
                objective_id: o.objective_id,
                objective_name: o.objective_name,
                objective_type: o.objective_type,
                status: o.status,
                priority: o.priority,
                assigned_to: o.assigned_to,
                progress_pct: o.progress_pct,
                started_at: o.started_at,
                due_at: o.due_at
            }));
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get active objectives:', error.message);
            return [];
        }
    }
    /**
     * Detect stale state across all entities
     *
     * @returns {Promise<Object>} Stale state report
     */
    async detectStaleState() {
        if (!this.stateGraph) {
            return { stale_detected: false, reason: 'State Graph unavailable' };
        }
        const report = {
            stale_detected: false,
            stale_services: [],
            stale_providers: [],
            total_stale: 0
        };
        try {
            // Check services
            const services = this.stateGraph.listServices();
            for (const service of services) {
                const lastCheckMs = new Date(service.last_check_at).getTime();
                const ageMs = Date.now() - lastCheckMs;
                if (ageMs > this.staleLimitMs) {
                    report.stale_services.push({
                        service_id: service.service_id,
                        age_ms: ageMs,
                        last_check_at: service.last_check_at
                    });
                    report.stale_detected = true;
                }
            }
            // Check providers
            const providers = this.stateGraph.listProviders();
            for (const provider of providers) {
                const lastCheckMs = new Date(provider.last_health_check).getTime();
                const ageMs = Date.now() - lastCheckMs;
                if (ageMs > this.staleLimitMs) {
                    report.stale_providers.push({
                        provider_id: provider.provider_id,
                        age_ms: ageMs,
                        last_health_check: provider.last_health_check
                    });
                    report.stale_detected = true;
                }
            }
            report.total_stale = report.stale_services.length + report.stale_providers.length;
            return report;
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to detect stale state:', error.message);
            return { stale_detected: false, reason: 'Detection failed', error: error.message };
        }
    }
    /**
     * Live service check (fallback when State Graph unavailable)
     *
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Live service status
     */
    async _liveServiceCheck(serviceId) {
        if (!this.serviceManager) {
            return {
                service_id: serviceId,
                status: 'unknown',
                health: 'unknown',
                last_check_at: new Date().toISOString(),
                _metadata: { source: 'fallback', reason: 'service_manager_unavailable' }
            };
        }
        const services = await this.serviceManager.getServices();
        const service = services.find(s => s.service_id === serviceId);
        if (!service) {
            return {
                service_id: serviceId,
                status: 'unknown',
                health: 'unknown',
                last_check_at: new Date().toISOString(),
                _metadata: { source: 'fallback', reason: 'service_not_found' }
            };
        }
        return {
            ...service,
            _metadata: { source: 'live', reason: 'state_graph_unavailable' }
        };
    }
    /**
     * Live all services check (fallback when State Graph unavailable)
     *
     * @returns {Promise<Array>} Live service statuses
     */
    async _liveAllServicesCheck() {
        if (!this.serviceManager) {
            return [];
        }
        const services = await this.serviceManager.getServices();
        return services.map(s => ({
            ...s,
            _metadata: { source: 'live', reason: 'state_graph_unavailable' }
        }));
    }
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
    async getSystemSnapshot() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            source: 'state_graph',
            services: [],
            providers: [],
            runtime_mode: null,
            endpoints: [],
            incidents: [],
            objectives: [],
            state_graph_available: this.stateGraph !== null
        };
        if (!this.stateGraph) {
            // Fallback: live checks only
            snapshot.source = 'live_only';
            snapshot.services = await this._liveAllServicesCheck();
            snapshot.runtime_mode = this.runtimeModeManager ?
                await this.runtimeModeManager.getCurrentMode() :
                { mode: 'unknown', reason: 'runtime_mode_manager_unavailable' };
            return snapshot;
        }
        try {
            // Services
            snapshot.services = await this.getAllServices();
            // Providers
            try {
                const providers = this.stateGraph.listProviders();
                snapshot.providers = providers.map(p => ({
                    provider_id: p.provider_id,
                    provider_name: p.provider_name,
                    provider_type: p.provider_type,
                    status: p.status,
                    health: p.health,
                    last_check_at: p.last_check_at,
                    metadata: p.metadata ? JSON.parse(p.metadata) : {}
                }));
            }
            catch (error) {
                console.error('[StateAwareDiagnostics] Failed to get providers:', error.message);
                snapshot.providers = [];
            }
            // Runtime mode
            try {
                const modeContext = this.stateGraph.getRuntimeContext('runtime_mode');
                if (modeContext) {
                    snapshot.runtime_mode = {
                        mode: modeContext.context_value,
                        type: modeContext.context_type,
                        metadata: modeContext.metadata ? JSON.parse(modeContext.metadata) : {},
                        updated_at: modeContext.updated_at
                    };
                }
                else {
                    snapshot.runtime_mode = { mode: 'unknown', reason: 'not_in_state_graph' };
                }
            }
            catch (error) {
                console.error('[StateAwareDiagnostics] Failed to get runtime mode:', error.message);
                snapshot.runtime_mode = { mode: 'error', reason: error.message };
            }
            // Endpoints
            try {
                const endpoints = this.stateGraph.listEndpoints();
                snapshot.endpoints = endpoints.map(e => ({
                    endpoint_id: e.endpoint_id,
                    endpoint_type: e.endpoint_type,
                    endpoint_name: e.endpoint_name,
                    status: e.status,
                    last_heartbeat_at: e.last_heartbeat_at,
                    capabilities: e.capabilities ? JSON.parse(e.capabilities) : [],
                    metadata: e.metadata ? JSON.parse(e.metadata) : {}
                }));
            }
            catch (error) {
                console.error('[StateAwareDiagnostics] Failed to get endpoints:', error.message);
                snapshot.endpoints = [];
            }
            // Incidents (open only)
            try {
                const incidents = this.stateGraph.listIncidents({ status: 'open' });
                snapshot.incidents = incidents.map(i => ({
                    incident_id: i.incident_id,
                    incident_type: i.incident_type,
                    severity: i.severity,
                    status: i.status,
                    description: i.description,
                    detected_at: i.detected_at,
                    metadata: i.metadata ? JSON.parse(i.metadata) : {}
                }));
            }
            catch (error) {
                console.error('[StateAwareDiagnostics] Failed to get incidents:', error.message);
                snapshot.incidents = [];
            }
            // Objectives (active only)
            try {
                const objectives = this.stateGraph.listObjectives({ status: 'active' });
                snapshot.objectives = objectives.map(o => ({
                    objective_id: o.objective_id,
                    objective_name: o.objective_name,
                    status: o.status,
                    priority: o.priority,
                    created_at: o.created_at,
                    metadata: o.metadata ? JSON.parse(o.metadata) : {}
                }));
            }
            catch (error) {
                console.error('[StateAwareDiagnostics] Failed to get objectives:', error.message);
                snapshot.objectives = [];
            }
        }
        catch (error) {
            console.error('[StateAwareDiagnostics] Failed to get system snapshot:', error.message);
            snapshot.source = 'error';
            snapshot.error = error.message;
        }
        return snapshot;
    }
}
module.exports = { StateAwareDiagnostics };
//# sourceMappingURL=state-aware-diagnostics.js.map