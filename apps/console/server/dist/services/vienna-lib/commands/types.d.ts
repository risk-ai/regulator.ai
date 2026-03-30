/**
 * Command System Types
 *
 * Core types for deterministic command parsing and classification.
 */
export type MessageClassification = 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
export type ClassificationMode = 'deterministic' | 'keyword' | 'llm' | 'fallback';
export interface ProviderInfo {
    name: 'anthropic' | 'openclaw' | 'local' | 'none';
    model?: string;
    mode: ClassificationMode;
}
export type ResponseStatus = 'answered' | 'preview' | 'executing' | 'approval_required' | 'failed';
export interface LinkedEntities {
    objectiveId?: string;
    envelopeId?: string;
    decisionId?: string;
    service?: string;
}
export interface ActionTaken {
    action: string;
    result: string;
}
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
export interface CommandResult {
    matched: boolean;
    classification: MessageClassification;
    handler?: () => Promise<string>;
    command?: string;
    args?: Record<string, string>;
}
export interface ClassificationResult {
    classification: MessageClassification;
    mode: ClassificationMode;
    confidence: number;
    provider?: string;
}
export interface MessageContext {
    operator: string;
    page?: string;
    objectiveId?: string;
    envelopeId?: string;
    threadId?: string;
}
//# sourceMappingURL=types.d.ts.map