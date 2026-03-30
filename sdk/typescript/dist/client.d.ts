/**
 * Vienna OS TypeScript Client
 */
import type { ExecutionResult, Approval, Warrant, Policy, Agent, ExecutionOptions, ApprovalFilter, PolicyFilter } from './types';
export declare class ViennaClient {
    private baseUrl;
    private token?;
    private apiKey?;
    constructor(options: {
        baseUrl?: string;
        apiKey?: string;
        email?: string;
        password?: string;
    });
    private request;
    login(email: string, password: string): Promise<{
        token: string;
        user: any;
    }>;
    execute(options: ExecutionOptions): Promise<ExecutionResult>;
    getExecutions(filters?: {
        limit?: number;
        offset?: number;
        status?: string;
        tier?: string;
    }): Promise<any[]>;
    getExecution(executionId: string): Promise<any>;
    getExecutionStats(): Promise<any>;
    getApprovals(filters?: ApprovalFilter): Promise<Approval[]>;
    approve(approvalId: string, reviewerId: string, notes?: string): Promise<any>;
    reject(approvalId: string, reviewerId: string, reason: string): Promise<any>;
    getWarrants(limit?: number): Promise<Warrant[]>;
    verifyWarrant(warrantId: string, signature: string): Promise<any>;
    getPolicies(filters?: PolicyFilter): Promise<Policy[]>;
    createPolicy(policy: Partial<Policy>): Promise<Policy>;
    updatePolicy(policyId: string, updates: Partial<Policy>): Promise<any>;
    deletePolicy(policyId: string): Promise<boolean>;
    getAgents(filters?: {
        status?: string;
        tier?: string;
    }): Promise<Agent[]>;
    registerAgent(agent: Partial<Agent>): Promise<Agent>;
    updateAgent(agentId: string, updates: Partial<Agent>): Promise<any>;
    deleteAgent(agentId: string): Promise<boolean>;
    health(): Promise<any>;
    createEventStream(onEvent: (event: any) => void, onError?: (error: Error) => void): EventSource;
}
