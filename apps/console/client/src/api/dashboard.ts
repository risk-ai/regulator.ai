/**
 * Dashboard API Client
 * Typed wrappers for /api/v1/dashboard endpoints
 */

import { apiClient } from './client.js';

// ── Types ────────────────────────────────────────────────────────

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d';

export interface DashboardOverview {
  total_warrants: string;
  active_warrants: string;
  active_policies: string;
  total_agents: string;
  online_agents: string;
  executions_period: string;
  pending_approvals: string;
  evaluations_period: string;
  audit_events_period: string;
  open_incidents: string;
}

export interface AgentBreakdown {
  status: string;
  count: string;
  avg_seconds_since_heartbeat: number;
}

export interface ApprovalMetrics {
  pending: string;
  approved: string;
  denied: string;
  expired: string;
  avg_resolution_seconds: number | null;
  new_this_period: string;
}

export interface PolicyEvalMetrics {
  total_evaluations: string;
  allowed: string;
  denied: string;
  require_approval: string;
  allow_rate: string | null;
}

export interface ExecutionTrendBucket {
  bucket: string;
  executions: string;
  completed: string;
  rejected: string;
}

export interface RiskDistribution {
  risk_tier: string;
  count: string;
}

export interface ActivityItem {
  id: string;
  event_type: string;
  actor: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemHealth {
  active_integrations: string;
  active_webhooks: string;
  failed_webhooks_1h: string;
  active_api_keys: string;
}

export interface DashboardData {
  overview: DashboardOverview;
  agents: AgentBreakdown[];
  approvals: ApprovalMetrics;
  policyEvaluations: PolicyEvalMetrics;
  executionTrend: ExecutionTrendBucket[];
  riskDistribution: RiskDistribution[];
  recentActivity: ActivityItem[];
  systemHealth: SystemHealth;
  timeRange: string;
  generatedAt: string;
}

export interface HealthCheck {
  status: 'operational' | 'degraded' | 'warning';
  checks: Record<string, {
    status: 'operational' | 'degraded' | 'warning';
    latencyMs?: number;
    recent5min?: number;
    pending?: number;
    oldestPending?: string | null;
    error?: string;
  }>;
  totalMs: number;
  checkedAt: string;
}

// ── API Functions ────────────────────────────────────────────────

export async function getDashboardMetrics(range: TimeRange = '24h'): Promise<DashboardData> {
  return apiClient.get<DashboardData>('/dashboard', { range });
}

export async function getSparklineData(
  metric: 'executions' | 'evaluations' | 'approvals' | 'audit',
  range: TimeRange = '24h',
  points: number = 24
): Promise<{ metric: string; points: number[] }> {
  return apiClient.get('/dashboard/sparklines', { metric, range, points: String(points) });
}

export async function getDashboardHealth(): Promise<HealthCheck> {
  return apiClient.get<HealthCheck>('/dashboard/health');
}
