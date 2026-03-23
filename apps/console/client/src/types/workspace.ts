/**
 * Workspace Types
 * Phase 13b - Investigation Index + Skeletons
 * Phase 13e - Timeline + Graph + Explanation
 */

export type InvestigationStatus = 'open' | 'investigating' | 'resolved' | 'archived';

export interface Investigation {
  investigation_id: string;
  name: string;
  description: string;
  status: InvestigationStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  objective_id?: string;
  incident_id?: string;
  
  // Enriched fields (from list endpoint)
  objective_count?: number;
  intent_count?: number;
  artifact_count?: number;
}

export interface InvestigationDetail extends Investigation {
  objectives: any[]; // Phase 13c: proper type
  intents: any[];    // Phase 13c: proper type
  artifacts: Artifact[];
}

export interface Artifact {
  artifact_id: string;
  artifact_type: string;
  name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  content_hash: string;
  created_at: string;
  created_by: string;
  
  // Context linking
  investigation_id?: string;
  intent_id?: string;
  execution_id?: string;
  objective_id?: string;
  incident_id?: string;
}

export interface ListInvestigationsParams {
  status?: InvestigationStatus;
  limit?: number;
  offset?: number;
}

export interface ListArtifactsParams {
  investigation_id?: string;
  artifact_type?: string;
  intent_id?: string;
  execution_id?: string;
  objective_id?: string;
  limit?: number;
  offset?: number;
}

// Phase 13e: Timeline and Trace Types

export type TimelineEventKind =
  | 'intent'
  | 'normalization'
  | 'resolution'
  | 'policy'
  | 'governance'
  | 'reconciliation'
  | 'execution'
  | 'verification'
  | 'outcome'
  | 'artifact_export'
  | 'other';

export type TimelineEventStatus =
  | 'pending'
  | 'allowed'
  | 'denied'
  | 'started'
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'unknown';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  timestamp?: string;
  title: string;
  description?: string;
  status?: TimelineEventStatus;
  actor?: string;
  source?: string;
  explanation?: string;
  intent_id?: string;
  execution_id?: string;
  objective_id?: string;
  artifact_id?: string;
  raw?: unknown;
}

export interface IntentTrace {
  intent_id: string;
  intent_type: string;
  source: any;
  submitted_at: string;
  status: string;
  payload?: any;
}

export interface IntentTimeline {
  intent_id: string;
  events: TimelineEvent[];
  summary?: {
    total_events: number;
    first_event?: string;
    last_event?: string;
    status?: string;
  };
}

export interface TraceGraphNode {
  id: string;
  label: string;
  kind: string;
  status?: string;
}

export interface TraceGraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface IntentGraph {
  intent_id: string;
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
}

export interface IntentExplanation {
  intent_id: string;
  decision: 'allowed' | 'denied' | 'partial' | 'unknown';
  summary: string;
  policy_evaluation?: string;
  governance_decision?: string;
  safe_mode_status?: string;
  bounded_authority?: string;
  reasons?: string[];
}
