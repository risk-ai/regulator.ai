export class HTTPTransport {
    constructor(options?: {});
    timeout: any;
    retries: any;
    /**
     * Send execute request to remote node
     *
     * @param {Object} node - Node metadata (node_id, base_url, auth_token)
     * @param {Object} payload - Execution payload { execution_id, plan, context }
     * @returns {Promise<Object>} Response { acknowledged, node_id, estimated_duration_ms }
     */
    sendExecuteRequest(node: any, payload: any): Promise<any>;
    /**
     * Send cancel request to remote node
     *
     * @param {Object} node - Node metadata
     * @param {string} executionId - Execution to cancel
     * @param {string} reason - Cancellation reason
     * @returns {Promise<Object>} Response { acknowledged, stopped_at_step, partial_result }
     */
    sendCancelRequest(node: any, executionId: string, reason: string): Promise<any>;
    /**
     * Stream execution results from remote node
     *
     * @param {Object} node - Node metadata
     * @param {string} executionId - Execution to stream
     * @param {Function} onChunk - Callback for result chunks
     * @returns {Promise<void>}
     */
    streamResults(node: any, executionId: string, onChunk: Function): Promise<void>;
    /**
     * Negotiate capabilities with remote node
     *
     * @param {Object} node - Node metadata
     * @returns {Promise<Object>} { capabilities, version, supported_features }
     */
    negotiateCapabilities(node: any): Promise<any>;
    /**
     * Health check for remote node
     *
     * @param {Object} node - Node metadata
     * @returns {Promise<Object>} { status, latency_ms, version }
     */
    healthCheck(node: any): Promise<any>;
    /**
     * Internal HTTP request with retry
     */
    _httpRequest(url: any, options: any, body?: any): Promise<any>;
    /**
     * Single HTTP request
     */
    _httpRequestOnce(url: any, options: any, body?: any): Promise<any>;
    /**
     * Check if error is retryable
     */
    _isRetryable(err: any): any;
    /**
     * Sleep utility
     */
    _sleep(ms: any): Promise<any>;
}
//# sourceMappingURL=http-transport.d.ts.map