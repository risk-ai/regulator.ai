/**
 * Command System Types
 * 
 * Core types for deterministic command parsing and classification.
 */

// Message classifications (6 types)
export type MessageClassification = 
  | 'informational' 
  | 'reasoning' 
  | 'directive' 
  | 'command' 
  | 'approval' 
  | 'recovery';

// Classification mode (how was the message classified)
export type ClassificationMode = 
  | 'deterministic'  // Pattern-matched command
  | 'keyword'        // Keyword/rule-based
  | 'llm'            // Provider-assisted
  | 'fallback';      // Degraded mode

// Provider information
export interface ProviderInfo {
  name: 'anthropic' | 'openclaw' | 'local' | 'none';
  model?: string;
  mode: ClassificationMode;
}

// Response status
export type ResponseStatus = 
  | 'answered'           // Query answered
  | 'preview'            // Directive preview shown
  | 'executing'          // Command executing
  | 'approval_required'  // T2 approval needed
  | 'failed';            // Failed

// Linked entities
export interface LinkedEntities {
  objectiveId?: string;
  envelopeId?: string;
  decisionId?: string;
  service?: string;
}

// Action taken
export interface ActionTaken {
  action: string;
  result: string;
}

// Chat response envelope (locked shape)
export interface ChatResponse {
  messageId: string;
  classification: MessageClassification;
  provider: ProviderInfo;
  status: ResponseStatus;
  content: {
    text: string;
    summary?: string;
  };
  linkedEntities?: LinkedEntities;
  actionTaken?: ActionTaken;
  auditRef?: string;
  timestamp: string;
}

// Deterministic command result
export interface CommandResult {
  matched: boolean;
  classification: MessageClassification;
  handler?: () => Promise<string>;
  command?: string;
  args?: Record<string, string>;
}

// Classification result
export interface ClassificationResult {
  classification: MessageClassification;
  mode: ClassificationMode;
  confidence: number;
  provider?: string;
}

// Message context
export interface MessageContext {
  operator: string;
  page?: string;
  objectiveId?: string;
  envelopeId?: string;
  threadId?: string;
}
