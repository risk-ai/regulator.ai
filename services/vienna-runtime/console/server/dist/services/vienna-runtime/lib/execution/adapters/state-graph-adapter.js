/**
 * State Graph Adapter
 *
 * Executor adapter for State Graph updates.
 * Enforces envelope-based writes with warrant authorization.
 *
 * Design: Agents read State Graph directly (no warrant).
 *         Agents propose updates via envelopes.
 *         Vienna executes through this adapter with warrant.
 */
const { getStateGraph } = require('../../state/state-graph');
class StateGraphAdapter {
    constructor() {
        this.stateGraph = null;
    }
    async initialize() {
        this.stateGraph = getStateGraph();
        await this.stateGraph.initialize();
    }
    /**
     * Execute state update action
     *
     * @param {Object} action - State update action from envelope
     * @param {Object} warrant - Execution warrant
     * @returns {Object} Result { success, entity_id, changes, error }
     */
    async execute(action, warrant) {
        if (!this.stateGraph) {
            await this.initialize();
        }
        const { action_type, entity_type, entity_id, updates, entity_data } = action;
        try {
            let result;
            switch (action_type) {
                case 'create':
                    result = this._create(entity_type, entity_data);
                    break;
                case 'update':
                    result = this._update(entity_type, entity_id, updates, warrant.issued_by);
                    break;
                case 'delete':
                    result = this._delete(entity_type, entity_id);
                    break;
                default:
                    throw new Error(`Unknown action type: ${action_type}`);
            }
            return {
                success: true,
                entity_type,
                entity_id: entity_id || result.entity_id,
                changes: result.changes,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                entity_type,
                entity_id,
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Create entity
     */
    _create(entity_type, entity_data) {
        switch (entity_type) {
            case 'service':
                const serviceResult = this.stateGraph.createService(entity_data);
                return { entity_id: serviceResult.service_id, changes: serviceResult.changes };
            case 'provider':
                const providerResult = this.stateGraph.createProvider(entity_data);
                return { entity_id: providerResult.provider_id, changes: providerResult.changes };
            case 'incident':
                const incidentResult = this.stateGraph.createIncident(entity_data);
                return { entity_id: incidentResult.incident_id, changes: incidentResult.changes };
            case 'objective':
                const objectiveResult = this.stateGraph.createObjective(entity_data);
                return { entity_id: objectiveResult.objective_id, changes: objectiveResult.changes };
            case 'runtime_context':
                const contextResult = this.stateGraph.setRuntimeContext(entity_data.context_key, entity_data.context_value, entity_data);
                return { entity_id: contextResult.context_key, changes: contextResult.changes };
            default:
                throw new Error(`Unknown entity type: ${entity_type}`);
        }
    }
    /**
     * Update entity
     */
    _update(entity_type, entity_id, updates, changed_by) {
        switch (entity_type) {
            case 'service':
                return this.stateGraph.updateService(entity_id, updates, changed_by);
            case 'provider':
                return this.stateGraph.updateProvider(entity_id, updates, changed_by);
            case 'incident':
                return this.stateGraph.updateIncident(entity_id, updates, changed_by);
            case 'objective':
                return this.stateGraph.updateObjective(entity_id, updates, changed_by);
            case 'runtime_context':
                const result = this.stateGraph.setRuntimeContext(entity_id, updates.context_value, updates);
                return { changes: result.changes };
            default:
                throw new Error(`Unknown entity type: ${entity_type}`);
        }
    }
    /**
     * Delete entity
     */
    _delete(entity_type, entity_id) {
        switch (entity_type) {
            case 'service':
                return this.stateGraph.deleteService(entity_id);
            case 'provider':
                return this.stateGraph.deleteProvider(entity_id);
            case 'incident':
                return this.stateGraph.deleteIncident(entity_id);
            case 'objective':
                return this.stateGraph.deleteObjective(entity_id);
            case 'runtime_context':
                return this.stateGraph.deleteRuntimeContext(entity_id);
            default:
                throw new Error(`Unknown entity type: ${entity_type}`);
        }
    }
    /**
     * Validate action before execution
     *
     * @param {Object} action - State update action
     * @returns {Object} { valid, error }
     */
    validate(action) {
        const { action_type, entity_type, entity_id, updates, entity_data } = action;
        // Validate action_type
        if (!['create', 'update', 'delete'].includes(action_type)) {
            return { valid: false, error: `Invalid action_type: ${action_type}` };
        }
        // Validate entity_type
        const validEntityTypes = ['service', 'provider', 'incident', 'objective', 'runtime_context'];
        if (!validEntityTypes.includes(entity_type)) {
            return { valid: false, error: `Invalid entity_type: ${entity_type}` };
        }
        // Validate create action
        if (action_type === 'create') {
            if (!entity_data) {
                return { valid: false, error: 'create action requires entity_data' };
            }
            // Entity-specific validation
            if (entity_type === 'service' && !entity_data.service_id) {
                return { valid: false, error: 'service requires service_id' };
            }
            if (entity_type === 'provider' && !entity_data.provider_id) {
                return { valid: false, error: 'provider requires provider_id' };
            }
            if (entity_type === 'incident' && !entity_data.incident_id) {
                return { valid: false, error: 'incident requires incident_id' };
            }
            if (entity_type === 'objective' && !entity_data.objective_id) {
                return { valid: false, error: 'objective requires objective_id' };
            }
            if (entity_type === 'runtime_context' && !entity_data.context_key) {
                return { valid: false, error: 'runtime_context requires context_key' };
            }
        }
        // Validate update/delete actions
        if ((action_type === 'update' || action_type === 'delete') && !entity_id) {
            return { valid: false, error: `${action_type} action requires entity_id` };
        }
        // Validate update action
        if (action_type === 'update' && !updates) {
            return { valid: false, error: 'update action requires updates' };
        }
        return { valid: true };
    }
    /**
     * Determine risk tier for action
     *
     * @param {Object} action - State update action
     * @returns {string} 'T0' | 'T1' | 'T2'
     */
    getRiskTier(action) {
        const { entity_type, updates } = action;
        // T2: Trading-critical changes (service status, runtime flags)
        if (entity_type === 'service' && updates?.status) {
            return 'T2'; // Service status changes could affect trading
        }
        if (entity_type === 'runtime_context') {
            // Check if this is autonomous window or trading flag
            const tradingFlags = ['autonomous_window_active', 'trading_enabled', 'risk_kill_switch'];
            if (tradingFlags.includes(action.entity_id) || tradingFlags.includes(action.entity_data?.context_key)) {
                return 'T2'; // Trading configuration
            }
        }
        // T1: Moderate risk (provider changes, incident resolution)
        if (entity_type === 'provider' && updates?.status) {
            return 'T1'; // Provider status changes
        }
        if (entity_type === 'incident' && action.action_type === 'create') {
            if (action.entity_data?.severity === 'critical') {
                return 'T1'; // Critical incident logging
            }
        }
        // T0: Low risk (objectives, non-critical updates, reads)
        return 'T0';
    }
    /**
     * Check if action affects trading
     *
     * @param {Object} action - State update action
     * @returns {boolean}
     */
    affectsTrading(action) {
        const { entity_type, entity_id, entity_data } = action;
        // Service changes that affect trading
        if (entity_type === 'service') {
            const tradingServices = ['kalshi-cron', 'kalshi-api', 'nba-data-feed'];
            return tradingServices.includes(entity_id) ||
                tradingServices.includes(entity_data?.service_id);
        }
        // Runtime context changes that affect trading
        if (entity_type === 'runtime_context') {
            const tradingFlags = ['autonomous_window_active', 'trading_enabled', 'risk_kill_switch'];
            return tradingFlags.includes(entity_id) ||
                tradingFlags.includes(entity_data?.context_key);
        }
        return false;
    }
}
module.exports = { StateGraphAdapter };
//# sourceMappingURL=state-graph-adapter.js.map