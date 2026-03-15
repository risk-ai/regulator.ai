// Vienna Runtime API Types
// Shared response contracts for HTTP API

export interface Investigation {
  id: string
  name: string
  description?: string
  status: 'open' | 'investigating' | 'resolved' | 'archived'
  objective_id?: string
  created_by: string
  created_at: string
  resolved_at?: string
  workspace_path: string
  artifact_count?: number
  trace_count?: number
}

export interface InvestigationListResponse {
  investigations: Investigation[]
  total: number
  limit: number
  offset: number
}

export interface Artifact {
  id: string
  artifact_type: 'trace' | 'execution_graph' | 'timeline_export' | 'investigation' | 'incident'
  file_path: string
  content?: string
  mime_type?: string
  size_bytes: number
  content_hash: string
  investigation_id?: string
  intent_id?: string
  execution_id?: string
  created_by: string
  created_at: string
}

export interface ArtifactListResponse {
  artifacts: Artifact[]
  total: number
  limit: number
  offset: number
}

export interface Incident {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved'
  service_id: string
  detected_by: string
  detected_at: string
  resolved_at?: string
  resolution_summary?: string
}

export interface IncidentListResponse {
  incidents: Incident[]
  total: number
  limit: number
  offset: number
}

export interface TraceEvent {
  timestamp: string
  event_type: string
  actor: string
  details: Record<string, unknown>
}

export interface TraceTimeline {
  intent_id: string
  timeline: TraceEvent[]
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime_seconds: number
  components: {
    state_graph: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      type: 'memory' | 'sqlite' | 'postgres'
    }
    artifact_storage: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      disk_usage?: string
    }
  }
}

export interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, unknown>
}
