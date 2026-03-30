/**
 * Vienna OS SDK Types
 */

export interface ViennaConfig {
  /** Vienna OS API base URL */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Agent ID to use for intents */
  agentId: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
}

export interface Intent {
  /** Action to perform (e.g., "deploy", "restart_service", "query") */
  action: string;
  /** Action payload/parameters */
  payload?: Record<string, unknown>;
  /** Run in simulation mode (no side effects) */
  simulation?: boolean;
}

export interface IntentResult {
  /** Proposal created by the pipeline */
  proposal: Proposal;
  /** Policy evaluation result */
  policy_evaluation: PolicyEvaluation;
  /** Warrant (null if pending approval or simulation) */
  warrant: Warrant | null;
  /** Whether this was a simulation */
  simulation: boolean;
  /** Pipeline outcome: "executed" | "pending_approval" | "denied" | "simulated" */
  pipeline: 'executed' | 'pending_approval' | 'denied' | 'simulated';
}

export interface Proposal {
  id: string;
  state: 'pending' | 'approved' | 'warranted' | 'denied';
  risk_tier: number | string;
}

export interface PolicyEvaluation {
  id: string;
  decision: string;
  matched_rule: string;
  tier: number | string;
}

export interface Warrant {
  id: string;
  signature: string;
  expires_at: string;
}

export interface WarrantVerification {
  valid: boolean;
  warrant_id: string;
  expires_at: string;
  revoked: boolean;
}

export interface Agent {
  id: string;
  agent_id: string;
  display_name: string;
  status: 'active' | 'idle' | 'suspended';
  trust_score: number;
  agent_type: string;
}

export interface AuditEntry {
  id: string;
  event: string;
  actor: string;
  risk_tier: number;
  proposal_id?: string;
  warrant_id?: string;
  timestamp: string;
  details?: string;
}

export interface SystemStatus {
  healthy: boolean;
  version: string;
  agents: { total: number; active: number };
  proposals: { total: number; pending: number };
  warrants: { total: number; active: number };
}
