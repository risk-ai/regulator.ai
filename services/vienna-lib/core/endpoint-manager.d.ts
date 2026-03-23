export class EndpointManager {
    stateGraph: any;
    stateGraphWritesEnabled: boolean;
    endpoints: Map<any, any>;
    heartbeatIntervals: Map<any, any>;
    instructionQueue: InstructionQueue;
    /**
     * Set State Graph instance (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} enabled - Whether to enable writes
     */
    setStateGraph(stateGraph: StateGraph, enabled?: boolean): void;
    /**
     * Register an endpoint
     *
     * @param {Object} endpoint - Endpoint configuration
     * @returns {Promise<void>}
     */
    registerEndpoint(endpoint: any): Promise<void>;
    /**
     * Get endpoint metadata
     *
     * @param {string} endpoint_id - Endpoint ID
     * @returns {Object|null} Endpoint metadata
     */
    getEndpoint(endpoint_id: string): any | null;
    /**
     * List all endpoints
     *
     * @returns {Array} All endpoints
     */
    listEndpoints(): any[];
    /**
     * Update endpoint status
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {Object} updates - Status updates
     * @returns {Promise<void>}
     */
    updateEndpointStatus(endpoint_id: string, updates: any): Promise<void>;
    /**
     * Record heartbeat
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {Object} health - Health status
     * @returns {Promise<void>}
     */
    recordHeartbeat(endpoint_id: string, health?: any): Promise<void>;
    /**
     * Start heartbeat monitoring for remote endpoint
     *
     * @param {string} endpoint_id - Endpoint ID
     * @param {number} interval_ms - Heartbeat interval
     */
    startHeartbeat(endpoint_id: string, interval_ms: number): void;
    /**
     * Stop heartbeat monitoring
     *
     * @param {string} endpoint_id - Endpoint ID
     */
    stopHeartbeat(endpoint_id: string): void;
    /**
     * Check endpoint health (override per endpoint type)
     *
     * @param {string} endpoint_id - Endpoint ID
     * @returns {Promise<Object>} Health status
     */
    _checkEndpointHealth(endpoint_id: string): Promise<any>;
    /**
     * Dispatch instruction to endpoint
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result envelope
     */
    dispatchInstruction(instruction: any, ...args: any[]): Promise<any>;
    /**
     * Dispatch instruction to local endpoint
     *
     * @param {Object} instruction - Instruction envelope
     * @param {number} timeout_ms - Timeout
     * @returns {Promise<Object>} Result
     */
    _dispatchLocal(instruction: any, timeout_ms: number): Promise<any>;
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
    _dispatchRemote(instruction: any, timeout_ms: number): Promise<any>;
    /**
     * Record instruction result in State Graph
     *
     * @param {string} instruction_id - Instruction ID
     * @param {string} status - Status
     * @param {Object} result - Result
     * @param {string} error - Error message
     * @returns {Promise<void>}
     */
    _recordInstructionResult(instruction_id: string, status: string, result?: any, error?: string): Promise<void>;
    /**
     * Shutdown (cleanup heartbeats)
     */
    shutdown(): void;
}
import { InstructionQueue } from "./instruction-queue";
//# sourceMappingURL=endpoint-manager.d.ts.map