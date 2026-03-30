/**
 * Chat History Service (Postgres)
 *
 * Persistent storage for chat threads and messages.
 * Migrated from SQLite (better-sqlite3) to Postgres (@vercel/postgres).
 */
export interface ChatThread {
    threadId: string;
    createdAt: string;
    updatedAt: string;
    title: string | null;
    pageContext: string | null;
    status: 'active' | 'archived';
    messageCount: number;
}
export interface ChatMessage {
    messageId: string;
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    classification: string | null;
    provider: string | null;
    providerMode: string | null;
    status: 'pending' | 'complete' | 'error';
    timestamp: string;
    linkedObjectiveId: string | null;
    linkedEnvelopeId: string | null;
    linkedDecisionId: string | null;
    linkedServiceId: string | null;
    auditRef: string | null;
    actionTaken: string | null;
    selectedObjectiveId: string | null;
    selectedFileIds: string | null;
    selectedService: string | null;
    currentPage: string | null;
}
export interface CreateThreadOptions {
    title?: string;
    pageContext?: string;
}
export interface CreateMessageOptions {
    threadId?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    classification?: string;
    provider?: string;
    providerMode?: string;
    status?: 'pending' | 'complete' | 'error';
    linkedObjectiveId?: string;
    linkedEnvelopeId?: string;
    linkedDecisionId?: string;
    linkedServiceId?: string;
    auditRef?: string;
    actionTaken?: string;
    selectedObjectiveId?: string;
    selectedFileIds?: string[];
    selectedService?: string;
    currentPage?: string;
}
export declare class ChatHistoryService {
    private initialized;
    constructor();
    /**
     * Initialize database and create tables
     */
    initialize(): Promise<void>;
    /**
     * Create a new thread
     */
    createThread(options?: CreateThreadOptions): Promise<ChatThread>;
    /**
     * Get thread by ID
     */
    getThread(threadId: string): Promise<ChatThread | null>;
    /**
     * Get all active threads (sorted by most recent)
     */
    getActiveThreads(limit?: number): Promise<ChatThread[]>;
    /**
     * Create a message
     */
    createMessage(options: CreateMessageOptions): Promise<ChatMessage>;
    /**
     * Get messages for a thread
     */
    getThreadMessages(threadId: string, limit?: number): Promise<ChatMessage[]>;
    /**
     * Update message status
     */
    updateMessageStatus(messageId: string, status: 'pending' | 'complete' | 'error'): Promise<void>;
    /**
     * Archive a thread
     */
    archiveThread(threadId: string): Promise<void>;
    /**
     * Delete a thread and all its messages
     */
    deleteThread(threadId: string): Promise<void>;
    /**
     * Generate unique thread ID
     */
    private generateThreadId;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
}
//# sourceMappingURL=chatHistoryService.postgres.d.ts.map