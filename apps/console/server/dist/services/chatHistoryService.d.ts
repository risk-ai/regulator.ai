/**
 * Chat History Service
 *
 * Persistent storage for chat threads and messages.
 * Provides thread-based conversation history across page refreshes.
 *
 * RESPONSIBILITY:
 * - Store chat messages with full metadata
 * - Retrieve thread history
 * - Manage thread lifecycle
 * - Persist classification, provider, status, linked entities
 *
 * ARCHITECTURE:
 * - Routes call ChatService
 * - ChatService calls ChatHistoryService
 * - ChatHistoryService manages SQLite storage
 * - Never accessed directly from routes
 *
 * STORAGE:
 * - SQLite database in console/server/data/chat-history.db
 * - Thread-based model
 * - Full message envelope with metadata
 * - Graceful degradation if storage fails
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
    private db;
    private initialized;
    private dbPath;
    constructor(dataDir?: string);
    /**
     * Initialize database and create tables
     */
    initialize(): Promise<void>;
    /**
     * Create database tables
     */
    private createTables;
    /**
     * Create a new thread
     */
    createThread(options?: CreateThreadOptions): ChatThread;
    /**
     * Get thread by ID
     */
    getThread(threadId: string): ChatThread | null;
    /**
     * List all threads
     */
    listThreads(options?: {
        status?: 'active' | 'archived';
        limit?: number;
    }): ChatThread[];
    /**
     * Create a message (and thread if needed)
     */
    createMessage(options: CreateMessageOptions): {
        message: ChatMessage;
        thread: ChatThread;
    };
    /**
     * Get message by ID
     */
    getMessage(messageId: string): ChatMessage | null;
    /**
     * Get messages for a thread
     */
    getThreadMessages(threadId: string, options?: {
        limit?: number;
        before?: string;
    }): ChatMessage[];
    /**
     * Update message status
     */
    updateMessageStatus(messageId: string, status: 'pending' | 'complete' | 'error'): void;
    /**
     * Update thread title
     */
    updateThreadTitle(threadId: string, title: string): void;
    /**
     * Archive thread
     */
    archiveThread(threadId: string): void;
    /**
     * Generate unique thread ID
     */
    private generateThreadId;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Get database statistics
     */
    getStats(): {
        totalThreads: number;
        activeThreads: number;
        totalMessages: number;
    } | null;
}
//# sourceMappingURL=chatHistoryService.d.ts.map