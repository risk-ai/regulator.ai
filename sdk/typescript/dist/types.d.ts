/**
 * Vienna OS TypeScript Types
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    token?: string;
    user?: any;
}
export interface ExecutionOptions {
    action: string;
    agentId: string;
    context?: Record<string, any>;
    tier?: 'T0' | 'T1' | 'T2' | 'T3';
}
export interface ExecutionResult {
    execution_id: string;
    warrant_id?: string;
    status: string;
    tier: string;
    policies_applied: string[];
    requires_approval: boolean;
    timestamp?: string;
}
export interface Approval {
    approval_id: string;
    execution_id: string;
    required_tier: string;
    status: string;
    action_summary: string;
    risk_summary?: string;
    requested_at?: string;
    requested_by?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    reviewer_notes?: string;
    expires_at?: string;
}
export interface ApprovalFilter {
    status?: 'pending' | 'approved' | 'rejected';
    tier?: 'T0' | 'T1' | 'T2' | 'T3';
}
export interface Warrant {
    warrant_id: string;
    execution_id: string;
    issued_at: string;
    signature?: string;
    expired?: boolean;
}
export interface Policy {
    id: string;
    name: string;
    tier: string;
    description?: string;
    rules?: Record<string, any>;
    enabled?: boolean;
    priority?: number;
    created_at?: string;
    updated_at?: string;
}
export interface PolicyFilter {
    enabled?: boolean;
    tier?: 'T0' | 'T1' | 'T2' | 'T3';
}
export interface Agent {
    id: string;
    name: string;
    type: string;
    description?: string;
    default_tier?: string;
    capabilities?: string[];
    config?: Record<string, any>;
    status?: string;
    created_at?: string;
    updated_at?: string;
}
export interface HealthCheck {
    success: boolean;
    status: string;
    timestamp: string;
    version: string;
    checks: {
        database: {
            status: string;
            latency_ms: number;
        };
        cache?: {
            status: string;
            size: number;
        };
    };
    uptime_seconds?: number;
    memory?: {
        used_mb: number;
        total_mb: number;
    };
    metrics?: Record<string, any>;
}
//# sourceMappingURL=types.d.ts.map