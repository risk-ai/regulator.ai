/**
 * Governance Chain API Client
 * Typed wrappers for /api/v1/governance endpoints
 */

import { apiClient } from './client.js';
import type { TimeRange } from './dashboard.js';

// ── Types ────────────────────────────────────────────────────────

export interface ChainStats {
  total_intents: string;
  completed_chains: string;
  rejected_chains: string;
  pending_chains: string;
}

export interface GovernanceChainSummary {
  intent_id: string;
  action_type: string;
  agent_id: string;
  intent_status: string;
  created_at: string;
  evaluations: Array<{
    id: string;
    rule_id: string;
    result: string;
    evaluated_at: string;
  }> | null;
  warrants: Array<{
    id: string;
    status: string;
    risk_tier: string | number;
    created_at: string;
  }> | null;
  executions: Array<{
    execution_id: string;
    event_type: string;
    timestamp: string;
  }> | null;
}

export interface PolicyViolation {
  policy_id: string;
  policy_name: string;
  result: string;
  intent_id: string;
  conditions_checked: unknown;
  evaluated_at: string;
  action_type: string;
  agent_id: string;
}

export interface WarrantStatusGroup {
  status: string;
  risk_tier: string | number;
  count: string;
  most_recent: string;
}

export interface EscalationPath {
  tier: string | number;
  total: string;
  approved: string;
  denied: string;
  pending: string;
  expired: string;
  avg_resolution_seconds: number | null;
}

export interface GovernanceOverview {
  chainStats: ChainStats;
  recentChains: GovernanceChainSummary[];
  policyViolations: PolicyViolation[];
  warrantStatus: WarrantStatusGroup[];
  escalationPaths: EscalationPath[];
  timeRange: string;
  generatedAt: string;
}

export interface GovernanceChainFull {
  intent: Record<string, unknown> | null;
  policyEvaluations: Array<Record<string, unknown>>;
  warrants: Array<Record<string, unknown>>;
  approvals: Array<Record<string, unknown>>;
  executions: Array<Record<string, unknown>>;
  auditTrail: Array<Record<string, unknown>>;
}

export interface SearchResult {
  entity_type: 'intent' | 'warrant' | 'execution' | 'agent';
  id: string;
  action_type?: string;
  agent_id?: string;
  display_name?: string;
  status?: string;
  risk_tier?: string | number;
  trust_score?: number;
  created_at: string;
}

// ── API Functions ────────────────────────────────────────────────

export async function getGovernanceOverview(range: TimeRange = '24h'): Promise<GovernanceOverview> {
  return apiClient.get<GovernanceOverview>('/governance', { range });
}

export async function getGovernanceChain(
  entityId: string, 
  type?: 'intent' | 'warrant' | 'execution' | 'auto'
): Promise<GovernanceChainFull> {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  return apiClient.get<GovernanceChainFull>(`/governance/chain/${entityId}`, params);
}

export async function searchGovernance(
  q: string,
  type?: 'intent' | 'warrant' | 'execution' | 'agent',
  limit?: number
): Promise<SearchResult[]> {
  const params: Record<string, string | number> = { q };
  if (type) params.type = type;
  if (limit) params.limit = limit;
  return apiClient.get<SearchResult[]>('/governance/search', params);
}
