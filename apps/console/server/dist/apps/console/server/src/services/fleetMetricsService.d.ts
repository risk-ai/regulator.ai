/**
 * Fleet Metrics Service
 *
 * Computes real-time fleet metrics from agent_registry, agent_activity, and agent_alerts tables.
 */
export interface FleetSummary {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    suspendedAgents: number;
    actionsToday: number;
    actionsThisHour: number;
    actionsThisMinute: number;
    avgLatencyMs: number;
    violationsCount: number;
    unresolvedAlerts: number;
    actionsByResult: Record<string, number>;
    topAgentsByVolume: {
        agent_id: string;
        display_name: string;
        count: number;
    }[];
    agentsNeedingAttention: {
        agent_id: string;
        display_name: string;
        reason: string;
    }[];
    trendData: {
        hour: string;
        count: number;
    }[];
}
export interface AgentMetrics {
    actionsToday: number;
    actionsThisWeek: number;
    avgLatencyMs: number;
    approvalRate: number;
    errorRate: number;
    deniedRate: number;
    actionsByType: Record<string, number>;
    actionsByResult: Record<string, number>;
    trendData: {
        hour: string;
        count: number;
    }[];
}
export declare class FleetMetricsService {
    /**
     * Get aggregate fleet summary
     */
    getFleetSummary(): Promise<FleetSummary>;
    /**
     * Get metrics for a specific agent
     */
    getAgentMetrics(agentId: string): Promise<AgentMetrics>;
}
//# sourceMappingURL=fleetMetricsService.d.ts.map