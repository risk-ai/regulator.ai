/**
 * HTTP Transport Layer
 * 
 * Real HTTP/gRPC transport for distributed execution
 * Replaces mock in-memory communication paths
 * 
 * Phase 19 Operationalization - Step 2
 */

const http = require('http');
const https = require('https');

class HTTPTransport {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 2;
  }

  /**
   * Send execute request to remote node
   * 
   * @param {Object} node - Node metadata (node_id, base_url, auth_token)
   * @param {Object} payload - Execution payload { execution_id, plan, context }
   * @returns {Promise<Object>} Response { acknowledged, node_id, estimated_duration_ms }
   */
  async sendExecuteRequest(node, payload) {
    const url = `${node.base_url}/api/v1/execute`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${node.auth_token}`,
        'X-Execution-ID': payload.execution_id
      },
      timeout: this.timeout
    };

    const response = await this._httpRequest(url, options, payload);

    if (response.statusCode !== 200) {
      throw new Error(`Execute request failed: ${response.statusCode} ${response.body.error || 'Unknown error'}`);
    }

    return response.body;
  }

  /**
   * Send cancel request to remote node
   * 
   * @param {Object} node - Node metadata
   * @param {string} executionId - Execution to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Response { acknowledged, stopped_at_step, partial_result }
   */
  async sendCancelRequest(node, executionId, reason) {
    const url = `${node.base_url}/api/v1/execute/${executionId}/cancel`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${node.auth_token}`
      },
      timeout: this.timeout
    };

    const payload = { reason };

    const response = await this._httpRequest(url, options, payload);

    if (response.statusCode !== 200) {
      throw new Error(`Cancel request failed: ${response.statusCode}`);
    }

    return response.body;
  }

  /**
   * Stream execution results from remote node
   * 
   * @param {Object} node - Node metadata
   * @param {string} executionId - Execution to stream
   * @param {Function} onChunk - Callback for result chunks
   * @returns {Promise<void>}
   */
  async streamResults(node, executionId, onChunk) {
    const url = `${node.base_url}/api/v1/execute/${executionId}/stream`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${node.auth_token}`,
        'Accept': 'text/event-stream'
      }
    };

    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Stream failed: ${res.statusCode}`));
          return;
        }

        res.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(l => l.trim());
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.substring(6));
                onChunk(data);
                
                if (data.type === 'complete' || data.type === 'error') {
                  resolve();
                }
              }
            }
          } catch (err) {
            reject(err);
          }
        });

        res.on('end', () => resolve());
        res.on('error', (err) => reject(err));
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Stream timeout'));
      });

      req.setTimeout(this.timeout);
      req.end();
    });
  }

  /**
   * Negotiate capabilities with remote node
   * 
   * @param {Object} node - Node metadata
   * @returns {Promise<Object>} { capabilities, version, supported_features }
   */
  async negotiateCapabilities(node) {
    const url = `${node.base_url}/api/v1/capabilities`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${node.auth_token}`
      },
      timeout: 5000 // Short timeout for capability check
    };

    const response = await this._httpRequest(url, options);

    if (response.statusCode !== 200) {
      throw new Error(`Capability negotiation failed: ${response.statusCode}`);
    }

    return response.body;
  }

  /**
   * Health check for remote node
   * 
   * @param {Object} node - Node metadata
   * @returns {Promise<Object>} { status, latency_ms, version }
   */
  async healthCheck(node) {
    const url = `${node.base_url}/health`;
    const startTime = Date.now();
    
    const options = {
      method: 'GET',
      timeout: 5000
    };

    try {
      const response = await this._httpRequest(url, options);
      const latency = Date.now() - startTime;

      return {
        status: response.statusCode === 200 ? 'online' : 'degraded',
        latency_ms: latency,
        version: response.body?.version
      };
    } catch (err) {
      return {
        status: 'offline',
        latency_ms: Date.now() - startTime,
        error: err.message
      };
    }
  }

  /**
   * Internal HTTP request with retry
   */
  async _httpRequest(url, options, body = null) {
    let lastError;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        return await this._httpRequestOnce(url, options, body);
      } catch (err) {
        lastError = err;
        if (attempt < this.retries - 1 && this._isRetryable(err)) {
          await this._sleep(Math.pow(2, attempt) * 1000);
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Single HTTP request
   */
  _httpRequestOnce(url, options, body = null) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(data);
          } catch {
            parsedBody = data;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.timeout) {
        req.setTimeout(options.timeout);
      }

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Check if error is retryable
   */
  _isRetryable(err) {
    return (
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNREFUSED' ||
      err.message.includes('timeout')
    );
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { HTTPTransport };
