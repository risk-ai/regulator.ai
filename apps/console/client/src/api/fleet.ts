/**
 * Fleet Dashboard API
 */

import { apiClient } from './client.js';

export interface FleetAgent {
  id: string;
  agent_id: string;
  display_name: string;
  description: string;
  agent_type: 'autonomous' | 'semi-autonomous' | 'supervised';
  status: 'active' | 'idle' | 'suspended' | 'terminated';
  trust_score: number;
  last_heartbeat: string | null;
  config: Record<string, unknown>;
  tags: string[];
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  registered_at: string;
  registered_by: string;
  updated_at: string;
  actions_today: number;
  avg_latency_ms: number;
  error_rate: number;
  unresolved_alerts: number;
}

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
  topAgentsByVolume: { agent_id: string; display_name: string; count: number }[];
  agentsNeedingAttention: { agent_id: string; display_name: string; reason: string }[];
  trendData: { hour: string; count: number }[];
}

export interface FleetOverview {
  agents: FleetAgent[];
  summary: FleetSummary;
}

export interface FleetAlert {
  id: string;
  agent_id: string;
  agent_name: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  context: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
}

export interface AgentActivity {
  id: string;
  agent_id: string;
  action_type: string;
  result: string;
  latency_ms: number;
  risk_tier: string;
  error_message: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

export interface AgentDetail {
  agent: FleetAgent;
  recentActivity: AgentActivity[];
  alerts: FleetAlert[];
  metrics: AgentMetrics;
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
  trendData: { hour: string; count: number }[];
}

export const fleetApi = {
  /** Fleet overview (all agents + summary) */
  getOverview: () => apiClient.get<FleetOverview>('/fleet'),

  /** Fleet summary metrics */
  getSummary: () => apiClient.get<FleetSummary>('/fleet/summary'),

  /** Get all unresolved alerts */
  getAlerts: () => apiClient.get<FleetAlert[]>('/fleet/alerts'),

  /** Resolve an alert */
  resolveAlert: (id: string) => apiClient.post<{ id: string; resolved: boolean }>(`/fleet/alerts/${id}/resolve`, {}),

  /** Single agent detail */
  getAgent: (agentId: string) => apiClient.get<AgentDetail>(`/fleet/${agentId}`),

  /** Agent activity log (paginated) */
  getActivity: (agentId: string, limit = 50, offset = 0) =>
    apiClient.get<{ rows: AgentActivity[]; total: number; limit: number; offset: number }>(
      `/fleet/${agentId}/activity`, { limit, offset }
    ),

  /** Agent metrics */
  getMetrics: (agentId: string) => apiClient.get<AgentMetrics>(`/fleet/${agentId}/metrics`),

  /** Suspend an agent */
  suspend: (agentId: string) => apiClient.post<{ agent_id: string; status: string }>(`/fleet/${agentId}/suspend`, {}),

  /** Activate an agent */
  activate: (agentId: string) => apiClient.post<{ agent_id: string; status: string }>(`/fleet/${agentId}/activate`, {}),

  /** Adjust trust score */
  adjustTrust: (agentId: string, trust_score: number) =>
    apiClient.put<{ agent_id: string; trust_score: number }>(`/fleet/${agentId}/trust`, { trust_score }),
};
