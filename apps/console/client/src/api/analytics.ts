/**
 * Analytics API Client
 * Typed wrappers for /api/v1/analytics endpoints
 */

import { apiClient } from './client.js';
import type { TimeRange } from './dashboard.js';

// ── Types ────────────────────────────────────────────────────────

export interface PolicyHitRate {
  policy_name: string;
  policy_id: string;
  evaluation_count: string;
  allowed: string;
  denied: string;
  escalated: string;
  deny_rate: string | null;
}

export interface ApprovalLatencyBucket {
  latency_bucket: 'under_1min' | '1_5min' | '5_15min' | '15_60min' | 'over_1hr';
  count: string;
  avg_seconds: number;
}

export interface AgentRisk {
  agent_id: string;
  agent_name: string;
  status: string;
  total_executions: string;
  rejected_executions: string;
  warrant_count: string;
  rejection_rate: string | null;
}

export interface ExecutionVolumeBucket {
  bucket: string;
  total: string;
  completed: string;
  rejected: string;
  escalated: string;
}

export interface TopAction {
  action_type: string;
  usage_count: string;
}

export interface ComplianceScore {
  score: number;
  breakdown: Record<string, string>;
}

export interface AnalyticsData {
  policyHitRates: PolicyHitRate[];
  approvalLatency: ApprovalLatencyBucket[];
  agentRisk: AgentRisk[];
  executionVolume: ExecutionVolumeBucket[];
  topActions: TopAction[];
  complianceScore: ComplianceScore;
  timeRange: string;
  generatedAt: string;
}

export interface PolicyEffectiveness {
  id: string;
  name: string;
  enabled: number;
  priority: number;
  tier: string;
  created_at: string;
  total_evaluations: string;
  allowed: string;
  denied: string;
  escalated: string;
  last_evaluated: string | null;
}

export interface AgentPerformance {
  agent_id: string;
  display_name: string;
  status: string;
  trust_score: number | null;
  registered_at: string;
  last_heartbeat: string | null;
  executions: string;
  warrants: string;
}

export interface TrendComparison {
  current: { executions: string; completed: string; rejected: string };
  previous: { executions: string; completed: string; rejected: string };
  changes: { executions: number; completed: number; rejected: number };
  timeRange: string;
}

// ── API Functions ────────────────────────────────────────────────

export async function getAnalytics(range: TimeRange = '30d'): Promise<AnalyticsData> {
  return apiClient.get<AnalyticsData>('/analytics', { range });
}

export async function getPolicyEffectiveness(range: TimeRange = '30d'): Promise<PolicyEffectiveness[]> {
  return apiClient.get<PolicyEffectiveness[]>('/analytics/policies', { range });
}

export async function getAgentPerformance(range: TimeRange = '30d'): Promise<AgentPerformance[]> {
  return apiClient.get<AgentPerformance[]>('/analytics/agents', { range });
}

export async function getTrends(range: TimeRange = '30d'): Promise<TrendComparison> {
  return apiClient.get<TrendComparison>('/analytics/trends', { range });
}
