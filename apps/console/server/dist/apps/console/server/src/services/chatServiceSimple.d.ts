/**
 * Simple Chat Service (Day 5 + History)
 *
 * Simplified chat service that handles basic commands without complex classification.
 * Routes messages through ViennaRuntimeService.
 * Persists chat history via ChatHistoryService.
 */
import type { ViennaRuntimeService } from './viennaRuntime.js';
import type { ChatHistoryService } from './chatHistoryService.js';
export interface ChatMessageRequest {
    threadId?: string;
    message: string;
    context?: {
        page?: string;
        selectedObjectiveId?: string;
        selectedFileIds?: string[];
        selectedService?: string;
    };
    operator: string;
}
export interface ChatMessage {
    messageId: string;
    threadId: string;
    classification: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
    provider: {
        name: string;
        model?: string;
        mode: 'deterministic' | 'keyword' | 'llm' | 'fallback';
    };
    status: 'answered' | 'preview' | 'executing' | 'approval_required' | 'failed';
    content: {
        text: string;
        summary?: string;
    };
    linkedEntities?: {
        objectiveId?: string;
        envelopeId?: string;
        decisionId?: string;
        service?: string;
    };
    actionTaken?: {
        action: string;
        result: string;
    };
    auditRef?: string;
    timestamp: string;
}
export declare class ChatService {
    private vienna;
    private history;
    private providerManager?;
    constructor(vienna: ViennaRuntimeService, history: ChatHistoryService, providerManager?: any);
    /**
     * Handle message with simple command matching + persistence
     */
    handleMessage(request: ChatMessageRequest): Promise<ChatMessage>;
    private handlePauseExecution;
    private handleResumeExecution;
    private handleShowStatus;
    private handleShowServices;
    private handleShowProviders;
    getHistory(params?: {
        threadId?: string;
        limit?: number;
        before?: string;
    }): Promise<ChatMessage[]>;
    /**
     * Get list of threads
     */
    getThreads(options?: {
        status?: 'active' | 'archived';
        limit?: number;
    }): Promise<Array<{
        threadId: string;
        title: string | null;
        messageCount: number;
        createdAt: string;
        updatedAt: string;
        status: string;
    }>>;
}
//# sourceMappingURL=chatServiceSimple.d.ts.map