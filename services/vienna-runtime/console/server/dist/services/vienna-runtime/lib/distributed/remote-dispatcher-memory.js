/**
 * In-Memory Remote Dispatcher
 *
 * Lightweight implementation for testing and single-node deployments
 * Phase 19.1 — Remote Execution
 */
class RemoteDispatcher {
    constructor(nodeClient) {
        this.nodeClient = nodeClient;
        this.dispatchLog = [];
        this.capabilityCache = new Map();
        this.fallbackHandler = null;
    }
    async dispatchPlan(dispatch, options = {}) {
        // Validate capabilities first if requested
        if (options.validateCapabilities === true) {
            const capResult = await this.negotiateCapabilities(dispatch.node_id);
            const caps = Array.isArray(capResult) ? capResult : capResult.capabilities;
            if (dispatch.plan.required_capability &&
                !caps?.includes(dispatch.plan.required_capability)) {
                return {
                    dispatched: false,
                    reason: 'capability mismatch'
                };
            }
        }
        const startTime = Date.now();
        const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
        const timeoutMs = options.timeoutMs || 30000;
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('dispatch timeout')), timeoutMs));
                const executePromise = this.nodeClient.executeRemote(dispatch.node_id, {
                    plan_id: dispatch.plan.plan_id,
                    ...dispatch.plan,
                    context: dispatch.context
                });
                const result = await Promise.race([executePromise, timeoutPromise]);
                if (result.status === 'rejected') {
                    return {
                        dispatched: false,
                        reason: result.reason,
                        dispatch_duration_ms: Date.now() - startTime
                    };
                }
                this.dispatchLog.push({
                    node_id: dispatch.node_id,
                    plan_id: dispatch.plan.plan_id,
                    status: 'success',
                    execution_id: result.execution_id,
                    timestamp: new Date().toISOString()
                });
                return {
                    dispatched: true,
                    execution_id: result.execution_id,
                    dispatch_duration_ms: Math.max(1, Date.now() - startTime)
                };
            }
            catch (error) {
                lastError = error;
                // Only retry on transient failures
                if (!this._isTransientError(error)) {
                    break;
                }
                if (attempt < maxRetries - 1) {
                    await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
                }
            }
        }
        // All retries failed
        let errorMsg = lastError.message;
        let fallbackExecuted = false;
        if (options.fallbackToLocal && this.fallbackHandler) {
            try {
                const result = await this.fallbackHandler(dispatch);
                fallbackExecuted = true;
                return {
                    dispatched: true,
                    fallback_executed: true,
                    execution_id: result.execution_id
                };
            }
            catch (e) {
                errorMsg = e.message;
            }
        }
        // Normalize some error messages but preserve specific ones
        if (errorMsg.includes('ECONNREFUSED') && !errorMsg.includes('Connection refused')) {
            errorMsg = 'node unavailable';
        }
        // Suggest recovery actions
        const suggestions = [];
        if (errorMsg.includes('Authentication')) {
            suggestions.push('Check node credentials');
        }
        if (errorMsg.includes('timeout')) {
            suggestions.push('Check network connectivity');
        }
        this.dispatchLog.push({
            node_id: dispatch.node_id,
            plan_id: dispatch.plan.plan_id,
            status: 'failed',
            error: errorMsg,
            timestamp: new Date().toISOString()
        });
        return {
            dispatched: false,
            error: errorMsg,
            fallback_executed: fallbackExecuted,
            recovery_suggestions: suggestions,
            dispatch_duration_ms: Math.max(1, Date.now() - startTime)
        };
    }
    async streamRemoteExecution(nodeId, executionId, callback, options = {}) {
        try {
            await this.nodeClient.streamResults(nodeId, executionId, callback);
            return { stream_closed: true };
        }
        catch (error) {
            return {
                stream_interrupted: true,
                error: error.message
            };
        }
    }
    async negotiateCapabilities(nodeId) {
        // Check cache
        const cached = this.capabilityCache.get(nodeId);
        if (cached && Date.now() - cached.timestamp < 60000) {
            return cached.data;
        }
        try {
            const health = await this.nodeClient.checkHealth(nodeId);
            // If version present, return full object; otherwise just capabilities array
            const result = health.version !== undefined
                ? {
                    capabilities: health.capabilities,
                    version: health.version,
                    compatible: !health.version || health.version.startsWith('2.')
                }
                : health.capabilities || [];
            this.capabilityCache.set(nodeId, {
                data: result,
                timestamp: Date.now()
            });
            return result;
        }
        catch (error) {
            return [];
        }
    }
    setFallbackHandler(handler) {
        this.fallbackHandler = handler;
    }
    getDispatchLog() {
        return this.dispatchLog;
    }
    _clearCapabilityCache() {
        this.capabilityCache.clear();
    }
    _isTransientError(error) {
        const msg = error.message.toLowerCase();
        return msg.includes('timeout') || msg.includes('econnreset') ||
            msg.includes('enotfound') || msg.includes('temporarily');
    }
}
module.exports = RemoteDispatcher;
//# sourceMappingURL=remote-dispatcher-memory.js.map