/**
 * Remote Dispatcher
 *
 * Send execution requests to remote nodes
 * Phase 19.1 — Remote Execution
 * Phase 19 Operationalization — Real HTTP transport integration
 */
const crypto = require('crypto');
const { HTTPTransport } = require('./http-transport');
class RemoteDispatcher {
    constructor(stateGraph, nodeRegistry, lockManager, options = {}) {
        this.stateGraph = stateGraph;
        this.nodeRegistry = nodeRegistry;
        this.lockManager = lockManager;
        this.maxRetries = options.maxRetries || 2;
        this.acknowledgmentTimeout = options.acknowledgmentTimeout || 10000;
        // Real transport (can be swapped for testing)
        this.transport = options.transport || new HTTPTransport({
            timeout: 30000,
            retries: 2
        });
    }
    /**
     * Dispatch execution with retry
     */
    async dispatchWithRetry(executionId, plan, context, options = {}) {
        const failedNodes = [];
        let attempt = 0;
        while (attempt < this.maxRetries) {
            try {
                const node = await this._selectNode(plan, context, { excludeNodes: failedNodes });
                if (!node) {
                    throw new Error('No capable nodes available');
                }
                const result = await this.dispatchToNode(node.node_id, executionId, plan, context);
                return result;
            }
            catch (err) {
                if (err.code === 'NODE_UNREACHABLE' || err.code === 'TIMEOUT') {
                    failedNodes.push(err.node_id);
                    attempt++;
                    if (attempt >= this.maxRetries) {
                        throw new Error(`Execution failed after ${this.maxRetries} attempts: ${err.message}`);
                    }
                }
                else {
                    throw err;
                }
            }
        }
    }
    /**
     * Dispatch to specific node
     */
    async dispatchToNode(nodeId, executionId, plan, context) {
        const node = await this.nodeRegistry.getNode(nodeId);
        if (!node || node.status !== 'online') {
            throw new Error(`Node ${nodeId} not available`);
        }
        // Pre-flight capability check
        const requiredCapabilities = this._extractCapabilities(plan);
        const missing = this._checkCapabilities(node, requiredCapabilities);
        if (missing.length > 0) {
            throw new Error(`Node ${nodeId} missing capabilities: ${missing.join(', ')}`);
        }
        // Serialize plan + context
        const payload = {
            execution_id: executionId,
            plan: plan,
            context: context
        };
        // Send execute request
        const result = await this._sendExecuteRequest(node, payload);
        return result;
    }
    /**
     * Cancel remote execution
     */
    async cancelExecution(nodeId, executionId, reason) {
        const node = await this.nodeRegistry.getNode(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        // Send cancel request
        const result = await this._sendCancelRequest(node, executionId, reason);
        return result;
    }
    // Helper methods
    async _selectNode(plan, context, options = {}) {
        const capableNodes = await this.nodeRegistry.findCapableNodes(plan);
        const available = capableNodes.filter(n => !options.excludeNodes || !options.excludeNodes.includes(n.node_id));
        if (available.length === 0) {
            return null;
        }
        // Simple selection - first available
        return available[0];
    }
    _extractCapabilities(plan) {
        const capabilities = [];
        for (const step of plan.steps || []) {
            capabilities.push({
                action_type: step.action_type,
                target_id: step.target_id
            });
        }
        return capabilities;
    }
    _checkCapabilities(node, requiredCapabilities) {
        const missing = [];
        for (const req of requiredCapabilities) {
            const hasCapability = node.capabilities.some(cap => cap.action_type === req.action_type &&
                (cap.supported_targets.includes('*') || cap.supported_targets.includes(req.target_id)));
            if (!hasCapability) {
                missing.push(req.action_type);
            }
        }
        return missing;
    }
    async _sendExecuteRequest(node, payload) {
        // Real HTTP transport implementation
        try {
            const response = await this.transport.sendExecuteRequest(node, payload);
            return response;
        }
        catch (err) {
            throw new Error(`Failed to send execute request to ${node.node_id}: ${err.message}`);
        }
    }
    async _sendCancelRequest(node, executionId, reason) {
        // Real HTTP transport implementation
        try {
            const response = await this.transport.sendCancelRequest(node, executionId, reason);
            return response;
        }
        catch (err) {
            console.error(`Failed to cancel execution ${executionId} on ${node.node_id}:`, err.message);
            // Don't throw - cancellation is best-effort
            return {
                acknowledged: false,
                error: err.message
            };
        }
    }
    _generateId(prefix) {
        return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
    }
}
module.exports = RemoteDispatcher;
//# sourceMappingURL=remote-dispatcher.js.map