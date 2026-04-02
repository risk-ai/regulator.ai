/**
 * Vienna Distributed Node Server
 *
 * HTTP server for distributed execution endpoints.
 * Receives remote execution requests and routes through governed pipeline.
 */
const express = require('express');
const { getStateGraph } = require('../state/state-graph');
const { PlanExecutionEngine } = require('../core/plan-execution-engine');
const { LockManager } = require('../distributed/lock-manager');
const { PolicyEngine } = require('../core/policy-engine');
class NodeServer {
    constructor(config = {}) {
        this.port = config.port || process.env.VIENNA_NODE_PORT || 8100;
        this.nodeId = config.nodeId || process.env.VIENNA_NODE_ID || 'node-1';
        this.app = express();
        this.stateGraph = null;
        this.executionEngine = null;
        this.lockManager = null;
        this.policyEngine = null;
        this.activeExecutions = new Map();
        this._setupMiddleware();
        this._setupRoutes();
    }
    _setupMiddleware() {
        this.app.use(express.json({ limit: '10mb' }));
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`[NodeServer] ${req.method} ${req.path}`);
            next();
        });
        // Error handling
        this.app.use((err, req, res, next) => {
            console.error('[NodeServer] Error:', err);
            res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: err.message
            });
        });
    }
    _setupRoutes() {
        // Execute remote plan
        this.app.post('/api/v1/execute', async (req, res) => {
            try {
                const { plan, context } = req.body;
                if (!plan || !plan.plan_id) {
                    return res.status(400).json({
                        error: 'INVALID_REQUEST',
                        message: 'Plan required'
                    });
                }
                const executionId = context?.execution_id || `exec_${Date.now()}`;
                // Execute through governed pipeline
                const result = await this._executeRemotePlan(plan, context);
                res.status(result.success ? 200 : 500).json({
                    execution_id: executionId,
                    status: result.success ? 'completed' : 'failed',
                    result: result.result,
                    error: result.error,
                    duration_ms: result.duration_ms
                });
            }
            catch (error) {
                console.error('[NodeServer] Execute error:', error);
                res.status(500).json({
                    error: 'EXECUTION_FAILED',
                    message: error.message
                });
            }
        });
        // Cancel execution
        this.app.post('/api/v1/cancel', async (req, res) => {
            try {
                const { execution_id, reason } = req.body;
                if (!execution_id) {
                    return res.status(400).json({
                        error: 'INVALID_REQUEST',
                        message: 'execution_id required'
                    });
                }
                const cancelled = await this._cancelExecution(execution_id, reason);
                res.json({
                    execution_id,
                    cancelled
                });
            }
            catch (error) {
                console.error('[NodeServer] Cancel error:', error);
                res.status(500).json({
                    error: 'CANCEL_FAILED',
                    message: error.message
                });
            }
        });
        // Node capabilities
        this.app.get('/api/v1/capabilities', (req, res) => {
            const capabilities = this._getCapabilities();
            res.json(capabilities);
        });
        // Health check
        this.app.get('/health', (req, res) => {
            const health = this._getHealth();
            res.json(health);
        });
    }
    async _executeRemotePlan(plan, context) {
        const startTime = Date.now();
        const executionId = context?.execution_id || `exec_${Date.now()}`;
        try {
            // Track active execution
            this.activeExecutions.set(executionId, {
                plan_id: plan.plan_id,
                start_time: startTime,
                status: 'running'
            });
            // Execute through governed pipeline
            const executionContext = {
                execution_id: executionId,
                plan_id: plan.plan_id,
                stateGraph: this.stateGraph,
                ...context
            };
            const result = await this.executionEngine.executePlan(plan, executionContext);
            // Update tracking
            this.activeExecutions.delete(executionId);
            return {
                success: result.success,
                result: result.result,
                error: result.error,
                duration_ms: Date.now() - startTime
            };
        }
        catch (error) {
            this.activeExecutions.delete(executionId);
            return {
                success: false,
                error: error.message,
                duration_ms: Date.now() - startTime
            };
        }
    }
    async _cancelExecution(executionId, reason) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return false; // Not running
        }
        // Mark as cancelled
        execution.status = 'cancelled';
        execution.cancel_reason = reason;
        // Actual cancellation would happen in execution engine
        // (implementation depends on execution mechanism)
        return true;
    }
    _getCapabilities() {
        return {
            node_id: this.nodeId,
            capabilities: {
                max_concurrent: 5,
                supported_executors: ['local', 'shell'],
                features: ['approval_handling', 'verification', 'lock_coordination']
            },
            health: this._getHealth()
        };
    }
    _getHealth() {
        return {
            status: 'healthy',
            uptime_ms: process.uptime() * 1000,
            queue_depth: this.activeExecutions.size,
            active_executions: this.activeExecutions.size
        };
    }
    async start() {
        // Initialize dependencies
        this.stateGraph = getStateGraph();
        await this.stateGraph.initialize();
        this.lockManager = new LockManager(this.stateGraph);
        this.policyEngine = new PolicyEngine(this.stateGraph);
        this.executionEngine = new PlanExecutionEngine(this.stateGraph, this.lockManager, this.policyEngine);
        // Start server
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[NodeServer] Listening on port ${this.port}`);
                console.log(`[NodeServer] Node ID: ${this.nodeId}`);
                resolve();
            });
        });
    }
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log('[NodeServer] Stopped');
                    resolve();
                });
            });
        }
    }
}
// CLI entry point
if (require.main === module) {
    const server = new NodeServer();
    server.start().catch((error) => {
        console.error('[NodeServer] Failed to start:', error);
        process.exit(1);
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('[NodeServer] SIGTERM received, shutting down...');
        await server.stop();
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        console.log('[NodeServer] SIGINT received, shutting down...');
        await server.stop();
        process.exit(0);
    });
}
module.exports = { NodeServer };
//# sourceMappingURL=node-server.js.map