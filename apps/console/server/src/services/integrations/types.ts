/**
 * Integration Adapter Types — Vienna OS
 * 
 * Core interfaces for the integration adapter framework.
 */

export interface IntegrationEvent {
  type: string; // 'approval_required', 'approval_resolved', 'action_executed', 'action_failed', 'policy_violation', 'alert'
  data: {
    intent_id?: string;
    agent_id?: string;
    action_type?: string;
    risk_tier?: string;
    summary?: string;
    details?: Record<string, any>;
    approval_id?: string;
    timestamp: string;
  };
}

export interface IntegrationAdapter {
  type: string;
  validateConfig(config: Record<string, any>): { valid: boolean; errors?: string[] };
  sendNotification(event: IntegrationEvent, config: Record<string, any>): Promise<{ success: boolean; response?: any; error?: string }>;
  testConnection(config: Record<string, any>): Promise<{ success: boolean; message: string }>;
  handleCallback?(payload: any): Promise<{ action: string; data: any }>;
}

export interface IntegrationRecord {
  id: string;
  type: string;
  name: string;
  description: string | null;
  config: Record<string, any>;
  event_types: string[];
  filters: Record<string, any>;
  enabled: boolean;
  last_success: string | null;
  last_failure: string | null;
  last_error: string | null;
  consecutive_failures: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationEventRecord {
  id: string;
  integration_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ConfigSchema {
  type: string;
  label: string;
  description: string;
  icon: string;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'select' | 'multi-text';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
}
