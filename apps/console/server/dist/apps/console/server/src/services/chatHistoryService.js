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
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ============================================================================
// Chat History Service
// ============================================================================
export class ChatHistoryService {
    db = null;
    initialized = false;
    dbPath;
    constructor(dataDir) {
        // Default to console/server/data
        const defaultDataDir = path.join(__dirname, '../../data');
        this.dbPath = path.join(dataDir || defaultDataDir, 'chat-history.db');
    }
    /**
     * Initialize database and create tables
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            // Open database
            this.db = new Database(this.dbPath);
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            // Create tables
            this.createTables();
            console.log(`[ChatHistoryService] Initialized with database: ${this.dbPath}`);
            this.initialized = true;
        }
        catch (error) {
            console.error('[ChatHistoryService] Failed to initialize:', error);
            throw error;
        }
    }
    /**
     * Create database tables
     */
    createTables() {
        if (!this.db)
            throw new Error('Database not initialized');
        // Threads table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        threadId TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        title TEXT,
        pageContext TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        messageCount INTEGER NOT NULL DEFAULT 0
      )
    `);
        // Messages table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        threadId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        classification TEXT,
        provider TEXT,
        providerMode TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        timestamp TEXT NOT NULL,
        
        linkedObjectiveId TEXT,
        linkedEnvelopeId TEXT,
        linkedDecisionId TEXT,
        linkedServiceId TEXT,
        auditRef TEXT,
        
        actionTaken TEXT,
        
        selectedObjectiveId TEXT,
        selectedFileIds TEXT,
        selectedService TEXT,
        currentPage TEXT,
        
        FOREIGN KEY (threadId) REFERENCES threads(threadId)
      )
    `);
        // Indexes
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_threadId 
      ON messages(threadId);
      
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
      ON messages(timestamp);
      
      CREATE INDEX IF NOT EXISTS idx_threads_status 
      ON threads(status);
      
      CREATE INDEX IF NOT EXISTS idx_threads_updatedAt 
      ON threads(updatedAt);
    `);
    }
    /**
     * Create a new thread
     */
    createThread(options = {}) {
        if (!this.db)
            throw new Error('Database not initialized');
        const threadId = this.generateThreadId();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO threads (threadId, createdAt, updatedAt, title, pageContext, status, messageCount)
      VALUES (?, ?, ?, ?, ?, 'active', 0)
    `);
        stmt.run(threadId, now, now, options.title || null, options.pageContext || null);
        return {
            threadId,
            createdAt: now,
            updatedAt: now,
            title: options.title || null,
            pageContext: options.pageContext || null,
            status: 'active',
            messageCount: 0,
        };
    }
    /**
     * Get thread by ID
     */
    getThread(threadId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      SELECT * FROM threads WHERE threadId = ?
    `);
        return stmt.get(threadId);
    }
    /**
     * List all threads
     */
    listThreads(options = {}) {
        if (!this.db)
            throw new Error('Database not initialized');
        let query = 'SELECT * FROM threads';
        const params = [];
        if (options.status) {
            query += ' WHERE status = ?';
            params.push(options.status);
        }
        query += ' ORDER BY updatedAt DESC';
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Create a message (and thread if needed)
     */
    createMessage(options) {
        if (!this.db)
            throw new Error('Database not initialized');
        // Get or create thread
        let thread;
        if (options.threadId) {
            const existing = this.getThread(options.threadId);
            if (!existing) {
                throw new Error(`Thread not found: ${options.threadId}`);
            }
            thread = existing;
        }
        else {
            // Create new thread
            thread = this.createThread({
                pageContext: options.currentPage,
            });
        }
        // Create message
        const messageId = this.generateMessageId();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      INSERT INTO messages (
        messageId, threadId, role, content, classification, provider, providerMode,
        status, timestamp, linkedObjectiveId, linkedEnvelopeId, linkedDecisionId,
        linkedServiceId, auditRef, actionTaken, selectedObjectiveId, selectedFileIds,
        selectedService, currentPage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(messageId, thread.threadId, options.role, options.content, options.classification || null, options.provider || null, options.providerMode || null, options.status || 'pending', now, options.linkedObjectiveId || null, options.linkedEnvelopeId || null, options.linkedDecisionId || null, options.linkedServiceId || null, options.auditRef || null, options.actionTaken || null, options.selectedObjectiveId || null, options.selectedFileIds ? JSON.stringify(options.selectedFileIds) : null, options.selectedService || null, options.currentPage || null);
        // Update thread
        const updateStmt = this.db.prepare(`
      UPDATE threads 
      SET updatedAt = ?, messageCount = messageCount + 1
      WHERE threadId = ?
    `);
        updateStmt.run(now, thread.threadId);
        // Get updated thread
        thread = this.getThread(thread.threadId);
        // Get created message
        const message = this.getMessage(messageId);
        return { message, thread };
    }
    /**
     * Get message by ID
     */
    getMessage(messageId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE messageId = ?
    `);
        return stmt.get(messageId);
    }
    /**
     * Get messages for a thread
     */
    getThreadMessages(threadId, options = {}) {
        if (!this.db)
            throw new Error('Database not initialized');
        let query = 'SELECT * FROM messages WHERE threadId = ?';
        const params = [threadId];
        if (options.before) {
            // Get timestamp of before message
            const beforeMsg = this.getMessage(options.before);
            if (beforeMsg) {
                query += ' AND timestamp < ?';
                params.push(beforeMsg.timestamp);
            }
        }
        query += ' ORDER BY timestamp ASC';
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Update message status
     */
    updateMessageStatus(messageId, status) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE messages SET status = ? WHERE messageId = ?
    `);
        stmt.run(status, messageId);
    }
    /**
     * Update thread title
     */
    updateThreadTitle(threadId, title) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE threads SET title = ?, updatedAt = ? WHERE threadId = ?
    `);
        stmt.run(title, new Date().toISOString(), threadId);
    }
    /**
     * Archive thread
     */
    archiveThread(threadId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE threads SET status = 'archived', updatedAt = ? WHERE threadId = ?
    `);
        stmt.run(new Date().toISOString(), threadId);
    }
    /**
     * Generate unique thread ID
     */
    generateThreadId() {
        return `thread_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('[ChatHistoryService] Database closed');
        }
    }
    /**
     * Get database statistics
     */
    getStats() {
        if (!this.db)
            return null;
        const totalThreads = this.db.prepare('SELECT COUNT(*) as count FROM threads').get();
        const activeThreads = this.db.prepare('SELECT COUNT(*) as count FROM threads WHERE status = "active"').get();
        const totalMessages = this.db.prepare('SELECT COUNT(*) as count FROM messages').get();
        return {
            totalThreads: totalThreads.count,
            activeThreads: activeThreads.count,
            totalMessages: totalMessages.count,
        };
    }
}
//# sourceMappingURL=chatHistoryService.js.map