"use strict";
/**
 * Vienna OS TypeScript Client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViennaClient = void 0;
const errors_1 = require("./errors");
class ViennaClient {
    constructor(options) {
        this.baseUrl = (options.baseUrl || 'https://console.regulator.ai/api/v1').replace(/\/$/, '');
        this.apiKey = options.apiKey;
        // Auto-login if credentials provided
        if (options.email && options.password) {
            this.login(options.email, options.password);
        }
    }
    async request(method, endpoint, data, params) {
        const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, '')}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        else if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        try {
            const response = await fetch(url.toString(), {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
            });
            const result = await response.json();
            if (response.status === 401) {
                throw new errors_1.AuthenticationError('Authentication failed');
            }
            else if (response.status === 400) {
                throw new errors_1.ValidationError(result.error || 'Validation error');
            }
            else if (response.status === 404) {
                throw new errors_1.NotFoundError(result.error || 'Not found');
            }
            else if (response.status >= 400) {
                throw new errors_1.ViennaError(`API error: ${response.status} - ${result.error || response.statusText}`);
            }
            return result;
        }
        catch (error) {
            if (error instanceof errors_1.ViennaError)
                throw error;
            throw new errors_1.ViennaError(`Request failed: ${error}`);
        }
    }
    async login(email, password) {
        const result = await this.request('POST', '/auth/login', {
            email,
            password,
        });
        if (result.success && result.token) {
            this.token = result.token;
            return { token: result.token, user: result.user };
        }
        else {
            throw new errors_1.AuthenticationError(result.error || 'Login failed');
        }
    }
    // Execution API
    async execute(options) {
        const result = await this.request('POST', '/execute', {
            action: options.action,
            agent_id: options.agentId,
            context: options.context || {},
            tier: options.tier || 'T0',
        });
        if (!result.success) {
            throw new errors_1.ViennaError(result.error || 'Execution failed');
        }
        return result.data;
    }
    async getExecutions(filters) {
        const params = {};
        if (filters?.limit)
            params.limit = filters.limit.toString();
        if (filters?.offset)
            params.offset = filters.offset.toString();
        if (filters?.status)
            params.status = filters.status;
        if (filters?.tier)
            params.tier = filters.tier;
        const result = await this.request('GET', '/executions', undefined, params);
        return result.data || [];
    }
    async getExecution(executionId) {
        const result = await this.request('GET', `/executions/${executionId}`);
        return result.data;
    }
    async getExecutionStats() {
        const result = await this.request('GET', '/executions/stats');
        return result.data;
    }
    // Approvals API
    async getApprovals(filters) {
        const params = {};
        if (filters?.status)
            params.status = filters.status;
        if (filters?.tier)
            params.tier = filters.tier;
        const result = await this.request('GET', '/approvals', undefined, params);
        return result.data || [];
    }
    async approve(approvalId, reviewerId, notes) {
        const result = await this.request('POST', `/approvals/${approvalId}/approve`, {
            reviewer_id: reviewerId,
            notes,
        });
        return result.data;
    }
    async reject(approvalId, reviewerId, reason) {
        const result = await this.request('POST', `/approvals/${approvalId}/reject`, {
            reviewer_id: reviewerId,
            reason,
        });
        return result.data;
    }
    // Warrants API
    async getWarrants(limit = 50) {
        const result = await this.request('GET', '/warrants', undefined, {
            limit: limit.toString(),
        });
        return result.data || [];
    }
    async verifyWarrant(warrantId, signature) {
        const result = await this.request('POST', '/warrants/verify', {
            warrant_id: warrantId,
            signature,
        });
        return result.data;
    }
    // Policies API
    async getPolicies(filters) {
        const params = {};
        if (filters?.enabled !== undefined)
            params.enabled = filters.enabled.toString();
        if (filters?.tier)
            params.tier = filters.tier;
        const result = await this.request('GET', '/policies', undefined, params);
        return result.data || [];
    }
    async createPolicy(policy) {
        const result = await this.request('POST', '/policies', policy);
        return result.data;
    }
    async updatePolicy(policyId, updates) {
        const result = await this.request('PUT', `/policies/${policyId}`, updates);
        return result.data;
    }
    async deletePolicy(policyId) {
        const result = await this.request('DELETE', `/policies/${policyId}`);
        return result.success || false;
    }
    // Agents API
    async getAgents(filters) {
        const params = {};
        if (filters?.status)
            params.status = filters.status;
        if (filters?.tier)
            params.tier = filters.tier;
        const result = await this.request('GET', '/agents', undefined, params);
        return result.data || [];
    }
    async registerAgent(agent) {
        const result = await this.request('POST', '/agents', agent);
        return result.data;
    }
    async updateAgent(agentId, updates) {
        const result = await this.request('PUT', `/agents/${agentId}`, updates);
        return result.data;
    }
    async deleteAgent(agentId) {
        const result = await this.request('DELETE', `/agents/${agentId}`);
        return result.success || false;
    }
    // Health API
    async health() {
        const result = await this.request('GET', '/health');
        return result;
    }
    // Event Stream (SSE)
    createEventStream(onEvent, onError) {
        const url = `${this.baseUrl}/events`;
        const eventSource = new EventSource(url);
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onEvent(data);
            }
            catch (error) {
                if (onError)
                    onError(new Error('Failed to parse event'));
            }
        };
        eventSource.onerror = (error) => {
            if (onError)
                onError(new Error('EventSource error'));
        };
        return eventSource;
    }
}
exports.ViennaClient = ViennaClient;
