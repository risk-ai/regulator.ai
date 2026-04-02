/**
 * Endpoint Manager
 *
 * Manages execution endpoints (local, OpenClaw, etc.)
 * Tracks endpoint health, dispatches instructions, handles results.
 *
 * Design:
 * - Vienna OS is the control plane
 * - Endpoints are governed execution backends
 * - All instructions require appropriate governance
 */
const { InstructionQueue } = require('./instruction-queue');
class EndpointManager {
    constructor() {
        this.stateGraph = null;
        this.stateGraphWritesEnabled = false;
        this.endpoints = new Map(); // endpoint_id → endpoint metadata
        this.heartbeatIntervals = new Map(); // endpoint_id → interval handle
        this.instructionQueue = new InstructionQueue(); // File-based instruction queue
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
     * Register an endpoint
     *
     * @param {Object} endpoint - Endpoint configuration
     * @returns {Promise<void>}
     */
    async registerEndpoint(endpoint) {
        const { endpoint_id, endpoint_type, endpoint_name, capabilities = [], metadata = {}, heartbeat_interval_ms = null } = endpoint;
        // Validate required fields
        if (!endpoint_id || !endpoint_type || !endpoint_name) {
            throw new Error('endpoint_id, endpoint_type, and endpoint_name required');
        }
        // Store in memory
        this.endpoints.set(endpoint_id, {
            endpoint_id,
            endpoint_type,
            endpoint_name,
            status: 'active',
            health: 'unknown',
            connectivity: endpoint_type === 'local' ? 'connected' : 'unknown',
            last_heartbeat: null,
            last_successful_action: null,
            capabilities,
            version: metadata.version || null,
            metadata
        });
        // Write to State Graph
        if (this.stateGraphWritesEnabled && this.stateGraph) {
            try {
                await this.stateGraph.createEndpoint({
                    endpoint_id,
                    endpoint_type,
                    endpoint_name,
                    status: 'active',
                    health: 'unknown',
                    connectivity: endpoint_type === 'local' ? 'connected' : 'unknown',
                    capabilities: JSON.stringify(capabilities),
                    metadata: JSON.stringify(metadata)
                });
            }
            catch (error) {
                console.error(`[EndpointManager] Failed to register endpoint ${endpoint_id} in State Graph:`, error.message);
                // Continue (non-blocking)
            }
        }
        // Start heartbeat if remote endpoint
        if (endpoint_type === 'remote' && heartbeat_interval_ms) {
            this.startHeartbeat(endpoint_id, heartbeat_interval_ms);
        }
        console.log(`[EndpointManager] Registered endpoint: ${endpoint_id} (${endpoint_type})`);
    }
    /**
     * Get endpoint metadata
     *
     * @param {string} endpoint_id - Endpoint ID
     * @returns {Object|null} Endpoint metadata
     */
    getEndpoint(endpoint_id) {
        return this.endpoints.get(endpoint_id) || null;
    }
    /**
     * List all endpoints
     *
     * @returns {Array} All endpoints
     */
    listEndpoints() {
        return Array.from(this.endpoints.values());
    }
    /**
     * Update endpoint status
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {Object} updates - Status updates
     * @returns {Promise<void>}
     */
    async updateEndpointStatus(endpoint_id, updates) {
        const endpoint = this.endpoints.get(endpoint_id);
        if (!endpoint) {
            console.warn(`[EndpointManager] Endpoint ${endpoint_id} not found`);
            return;
        }
        // Update in memory
        Object.assign(endpoint, updates, { updated_at: new Date().toISOString() });
        // Write to State Graph
        if (this.stateGraphWritesEnabled && this.stateGraph) {
            try {
                await this.stateGraph.updateEndpoint(endpoint_id, updates, 'endpoint_manager');
            }
            catch (error) {
                console.error(`[EndpointManager] Failed to update endpoint ${endpoint_id}:`, error.message);
                // Continue (non-blocking)
            }
        }
    }
    /**
     * Record heartbeat
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {Object} health - Health status
     * @returns {Promise<void>}
     */
    async recordHeartbeat(endpoint_id, health = {}) {
        const now = new Date().toISOString();
        await this.updateEndpointStatus(endpoint_id, {
            last_heartbeat: now,
            health: health.healthy ? 'healthy' : 'unhealthy',
            connectivity: health.reachable ? 'connected' : 'disconnected',
            status: health.healthy && health.reachable ? 'active' : 'degraded'
        });
    }
    /**
     * Start heartbeat monitoring for remote endpoint
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {number} interval_ms - Heartbeat interval
     */
    startHeartbeat(endpoint_id, interval_ms) {
        // Clear existing interval if any
        this.stopHeartbeat(endpoint_id);
        const intervalHandle = setInterval(async () => {
            try {
                const health = await this._checkEndpointHealth(endpoint_id);
                await this.recordHeartbeat(endpoint_id, health);
            }
            catch (error) {
                console.error(`[EndpointManager] Heartbeat check failed for ${endpoint_id}:`, error.message);
                await this.recordHeartbeat(endpoint_id, { healthy: false, reachable: false });
            }
        }, interval_ms);
        this.heartbeatIntervals.set(endpoint_id, intervalHandle);
    }
    /**
     * Stop heartbeat monitoring
     *
     * @param {string} endpoint_id - Endpoint ID
     */
    stopHeartbeat(endpoint_id) {
        const intervalHandle = this.heartbeatIntervals.get(endpoint_id);
        if (intervalHandle) {
            clearInterval(intervalHandle);
            this.heartbeatIntervals.delete(endpoint_id);
        }
    }
    /**
     * Check endpoint health (override per endpoint type)
     *
     * @param {string} endpoint_id - Endpoint ID
     * @returns {Promise<Object>} Health status
     */
    async _checkEndpointHealth(endpoint_id) {
        const endpoint = this.endpoints.get(endpoint_id);
        if (!endpoint) {
            return { healthy: false, reachable: false };
        }
        // Local endpoint always healthy
        if (endpoint.endpoint_type === 'local') {
            return { healthy: true, reachable: true };
        }
        // Remote endpoint: check gateway URL
        if (endpoint.endpoint_type === 'remote' && endpoint.metadata.gateway_url) {
            try {
                const response = await fetch(`${endpoint.metadata.gateway_url}/health`, {
                    signal: AbortSignal.timeout(5000)
                });
                return {
                    healthy: response.ok,
                    reachable: true
                };
            }
            catch (error) {
                return { healthy: false, reachable: false };
            }
        }
        return { healthy: false, reachable: false };
    }
    /**
     * Dispatch instruction to endpoint
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result envelope
     */
    async dispatchInstruction(instruction) {
        const { instruction_id, instruction_type, target_endpoint, action, arguments: args, risk_tier, warrant_id, issued_by, timeout_ms = 30000 } = instruction;
        const endpoint = this.endpoints.get(target_endpoint);
        if (!endpoint) {
            throw new Error(`Endpoint ${target_endpoint} not found`);
        }
        const issued_at = new Date().toISOString();
        // Record instruction in State Graph
        if (this.stateGraphWritesEnabled && this.stateGraph) {
            try {
                await this.stateGraph.createEndpointInstruction({
                    instruction_id,
                    endpoint_id: target_endpoint,
                    instruction_type,
                    action,
                    risk_tier,
                    warrant_id,
                    issued_by,
                    issued_at,
                    status: 'pending'
                });
            }
            catch (error) {
                console.error(`[EndpointManager] Failed to record instruction:`, error.message);
                // Continue (non-blocking)
            }
        }
        // Dispatch based on endpoint type
        let result;
        try {
            if (endpoint.endpoint_type === 'local') {
                result = await this._dispatchLocal(instruction, timeout_ms);
            }
            else if (endpoint.endpoint_type === 'remote') {
                result = await this._dispatchRemote(instruction, timeout_ms);
            }
            else {
                throw new Error(`Unknown endpoint type: ${endpoint.endpoint_type}`);
            }
            // Record success
            await this._recordInstructionResult(instruction_id, 'success', result);
            await this.updateEndpointStatus(target_endpoint, {
                last_successful_action: new Date().toISOString()
            });
            return result;
        }
        catch (error) {
            // Record failure
            await this._recordInstructionResult(instruction_id, 'failure', null, error.message);
            throw error;
        }
    }
    /**
     * Dispatch instruction to local endpoint
     *
     * @param {Object} instruction - Instruction envelope
     * @param {number} timeout_ms - Timeout
     * @returns {Promise<Object>} Result
     */
    async _dispatchLocal(instruction, timeout_ms) {
        // Local endpoint dispatches to Vienna Core executor
        // This is a placeholder; actual implementation routes through QueuedExecutor
        throw new Error('Local endpoint dispatch not yet implemented');
    }
    /**
     * Dispatch instruction to remote endpoint
     *
     * Uses file-based instruction queue for reliable bidirectional communication.
     * Vienna writes instruction → OpenClaw agent polls → processes → writes result → Vienna polls result.
     *
     * @param {Object} instruction - Instruction envelope
     * @param {number} timeout_ms - Timeout
     * @returns {Promise<Object>} Result
     */
    async _dispatchRemote(instruction, timeout_ms) {
        const endpoint = this.endpoints.get(instruction.target_endpoint);
        if (!endpoint) {
            throw new Error('Remote endpoint not found');
        }
        // Use file-based instruction queue
        try {
            console.log(`[EndpointManager] Dispatching ${instruction.instruction_type} to ${instruction.target_endpoint}`);
            const result = await this.instructionQueue.enqueueInstruction(instruction);
            console.log(`[EndpointManager] Result received for ${instruction.instruction_id}`);
            return result;
        }
        catch (error) {
            if (error.message.includes('timeout')) {
                throw new Error('Instruction timeout');
            }
            throw error;
        }
    }
    /**
     * Record instruction result in State Graph
     *
     * @param {string} instruction_id - Instruction ID
     * @param {string} status - Status
     * @param {Object} result - Result
     * @param {string} error - Error message
     * @returns {Promise<void>}
     */
    async _recordInstructionResult(instruction_id, status, result = null, error = null) {
        if (!this.stateGraphWritesEnabled || !this.stateGraph) {
            return;
        }
        try {
            const completed_at = new Date().toISOString();
            await this.stateGraph.updateEndpointInstruction(instruction_id, {
                status,
                completed_at,
                result: result ? JSON.stringify(result) : null,
                error
            });
        }
        catch (err) {
            console.error(`[EndpointManager] Failed to record instruction result:`, err.message);
            // Continue (non-blocking)
        }
    }
    /**
     * Shutdown (cleanup heartbeats)
     */
    shutdown() {
        for (const [endpoint_id, intervalHandle] of this.heartbeatIntervals.entries()) {
            clearInterval(intervalHandle);
        }
        this.heartbeatIntervals.clear();
    }
}
module.exports = { EndpointManager };
//# sourceMappingURL=endpoint-manager.js.map