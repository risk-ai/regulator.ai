/**
 * Chat Service
 *
 * Handles message classification and routing for Vienna operator chat.
 * Routes commands through Vienna Core (no direct execution).
 *
 * Architecture:
 * - LayeredClassifier for message classification
 * - ViennaRuntimeService for execution
 * - ChatResponse envelope for all responses
 */
import { ProviderManager } from '../../../../../services/vienna-lib/providers/manager.js';
import type { ChatResponse } from '../../../../../services/vienna-lib/commands/types.js';
import type { ViennaRuntimeService } from './viennaRuntime.js';
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
export declare class ChatService {
    private classifier;
    private vienna;
    private providerManager;
    constructor(vienna: ViennaRuntimeService, providerManager: ProviderManager);
    /**
     * Register command handlers with deterministic parser
     */
    private registerHandlers;
    /**
     * Handle incoming message
     */
    handleMessage(request: ChatMessageRequest): Promise<ChatResponse>;
    /**
     * Handle provider-backed request
     */
    private handleProviderRequest;
    /**
     * Build fallback response (no provider available)
     */
    private buildFallbackResponse;
    /**
     * Get chat history
     */
    getHistory(params: {
        threadId?: string;
        limit?: number;
        before?: string;
    }): Promise<{
        messages: Array<{
            messageId: string;
            role: 'operator' | 'vienna';
            content: string;
            timestamp: string;
        }>;
        has_more: boolean;
    }>;
}
//# sourceMappingURL=chatService.d.ts.map