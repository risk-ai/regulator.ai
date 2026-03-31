"use strict";
/**
 * Vienna OS TypeScript SDK
 *
 * Strongly-typed SDK for Vienna OS AI Agent Governance Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViennaClient = void 0;
class ViennaClient {
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000;
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            const data = await response.json();
            return (data.data !== undefined ? data.data : data);
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }
    /**
     * Submit an intent for governance evaluation
     */
    async submitIntent(intent) {
        return this.request('POST', '/api/v1/agent/intent', intent);
    }
    /**
     * Simulate an intent without execution
     */
    async simulate(intent) {
        return this.submitIntent({ ...intent, simulation: true });
    }
    /**
     * Verify a warrant
     */
    async verifyWarrant(warrantId, signature) {
        return this.request('POST', `/api/v1/warrants/${warrantId}/verify`, {
            signature,
        });
    }
    /**
     * Approve a proposal (operator action)
     */
    async approveProposal(proposalId, params) {
        return this.request('POST', `/api/v1/proposals/${proposalId}/approve`, params);
    }
    /**
     * Reject a proposal
     */
    async rejectProposal(proposalId, params) {
        return this.request('POST', `/api/v1/proposals/${proposalId}/reject`, params);
    }
    /**
     * List agents (with pagination)
     */
    async listAgents(params) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/api/v1/agents${query ? '?' + query : ''}`);
    }
    /**
     * Get a specific agent
     */
    async getAgent(agentId) {
        return this.request('GET', `/api/v1/agents/${agentId}`);
    }
    /**
     * Register a new agent
     */
    async registerAgent(agent) {
        return this.request('POST', '/api/v1/agents', agent);
    }
    /**
     * Update an agent (partial)
     */
    async updateAgent(agentId, updates) {
        return this.request('PATCH', `/api/v1/agents/${agentId}`, updates);
    }
    /**
     * Delete an agent
     */
    async deleteAgent(agentId) {
        return this.request('DELETE', `/api/v1/agents/${agentId}`);
    }
    /**
     * List policies (with pagination)
     */
    async listPolicies(params) {
        const query = new URLSearchParams(params).toString();
        return this.request('GET', `/api/v1/policies${query ? '?' + query : ''}`);
    }
    /**
     * Get a specific policy
     */
    async getPolicy(policyId) {
        return this.request('GET', `/api/v1/policies/${policyId}`);
    }
    /**
     * Create a new policy
     */
    async createPolicy(policy) {
        return this.request('POST', '/api/v1/policies', policy);
    }
    /**
     * Update a policy (partial)
     */
    async updatePolicy(policyId, updates) {
        return this.request('PATCH', `/api/v1/policies/${policyId}`, updates);
    }
    /**
     * Delete a policy
     */
    async deletePolicy(policyId) {
        return this.request('DELETE', `/api/v1/policies/${policyId}`);
    }
    /**
     * Submit multiple intents in batch
     */
    async submitBatch(intents) {
        return this.request('POST', '/api/v1/intents/batch', { intents });
    }
    /**
     * Get system health
     */
    async health() {
        return this.request('GET', '/api/v1/health');
    }
}
exports.ViennaClient = ViennaClient;
exports.default = ViennaClient;
