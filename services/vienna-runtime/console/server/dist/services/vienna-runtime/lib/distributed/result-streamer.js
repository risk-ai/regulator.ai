/**
 * Result Streamer
 *
 * Handle real-time execution updates from remote nodes
 * Phase 19.1 — Remote Execution
 */
const crypto = require('crypto');
class ResultStreamer {
    constructor(stateGraph, executionCoordinator) {
        this.stateGraph = stateGraph;
        this.executionCoordinator = executionCoordinator;
        this.progressHandlers = new Map();
    }
    /**
     * Register progress handler
     */
    registerProgressHandler(executionId, handler) {
        this.progressHandlers.set(executionId, handler);
    }
    /**
     * Unregister progress handler
     */
    unregisterProgressHandler(executionId) {
        this.progressHandlers.delete(executionId);
    }
    /**
     * Handle progress event from node
     */
    async handleProgressEvent(event) {
        const { execution_id, node_id, event_type, step_id, metadata } = event;
        // Update coordination record
        await this._updateCoordinationProgress(execution_id, {
            last_progress_at: new Date().toISOString(),
            current_step: step_id
        });
        // Emit ledger event
        await this._emitProgressEvent(execution_id, node_id, event_type, metadata);
        // Forward to registered handler
        const handler = this.progressHandlers.get(execution_id);
        if (handler) {
            try {
                await handler(event);
            }
            catch (err) {
                console.error('Progress handler error:', err);
            }
        }
        return { received: true };
    }
    /**
     * Handle execution result from node
     */
    async handleExecutionResult(executionId, nodeId, result) {
        // Forward to execution coordinator
        const coordination = await this.executionCoordinator.getCoordination(executionId);
        if (!coordination) {
            throw new Error(`No coordination found for execution ${executionId}`);
        }
        await this.executionCoordinator.handleExecutionResult(coordination.coordination_id, result);
        // Unregister progress handler
        this.unregisterProgressHandler(executionId);
        return { received: true };
    }
    /**
     * Poll node for status
     */
    async pollNodeStatus(nodeId, executionId) {
        // Mock implementation - would make HTTP GET to node
        return {
            execution_id: executionId,
            status: 'executing',
            current_step: 2,
            progress_pct: 50
        };
    }
    /**
     * Set up webhook endpoint for progress updates
     */
    setupWebhook(coordinatorUrl) {
        // Mock implementation - would configure HTTP endpoint
        return {
            webhook_url: `${coordinatorUrl}/progress`,
            configured: true
        };
    }
    // Helper methods
    async _updateCoordinationProgress(executionId, updates) {
        // Would update execution_coordinations table
    }
    async _emitProgressEvent(executionId, nodeId, eventType, metadata) {
        // Would emit to execution_ledger_events
        const eventId = this._generateId('event');
        return eventId;
    }
    _generateId(prefix) {
        return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
    }
}
module.exports = ResultStreamer;
//# sourceMappingURL=result-streamer.js.map