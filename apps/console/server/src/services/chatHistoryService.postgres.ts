/**
 * Chat History Service (Postgres)
 * 
 * Persistent storage for chat threads and messages.
 * Migrated from SQLite (better-sqlite3) to Postgres (@vercel/postgres).
 */

import * as db from '../db/postgres.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types
// ============================================================================

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
  
  // Linked entities
  linkedObjectiveId: string | null;
  linkedEnvelopeId: string | null;
  linkedDecisionId: string | null;
  linkedServiceId: string | null;
  auditRef: string | null;
  
  // Action metadata
  actionTaken: string | null;
  
  // Context
  selectedObjectiveId: string | null;
  selectedFileIds: string | null; // JSON array
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

// ============================================================================
// Chat History Service (Postgres)
// ============================================================================

export class ChatHistoryService {
  private initialized = false;

  constructor() {
    // No file path needed for Postgres
  }

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load schema
      const schemaPath = path.join(__dirname, 'chatHistorySchema.postgres.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split schema into individual statements (simple split on semicolon)
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      // Execute each statement
      for (const statement of statements) {
        await db.raw(statement);
      }
      
      console.log('[ChatHistoryService] Initialized with Postgres');
      this.initialized = true;
    } catch (error) {
      console.error('[ChatHistoryService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create a new thread
   */
  async createThread(options: CreateThreadOptions = {}): Promise<ChatThread> {
    const threadId = this.generateThreadId();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO threads (threadId, createdAt, updatedAt, title, pageContext, status, messageCount)
       VALUES ($1, $2, $3, $4, $5, 'active', 0)`,
      [threadId, now, now, options.title || null, options.pageContext || null]
    );

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
  async getThread(threadId: string): Promise<ChatThread | null> {
    return await db.queryOne<ChatThread>(
      'SELECT * FROM threads WHERE threadId = $1',
      [threadId]
    );
  }

  /**
   * Get all active threads (sorted by most recent)
   */
  async getActiveThreads(limit: number = 50): Promise<ChatThread[]> {
    return await db.query<ChatThread>(
      `SELECT * FROM threads 
       WHERE status = 'active' 
       ORDER BY updatedAt DESC 
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * Create a message
   */
  async createMessage(options: CreateMessageOptions): Promise<ChatMessage> {
    const messageId = this.generateMessageId();
    const timestamp = new Date().toISOString();
    
    // If no threadId provided, create new thread
    let threadId = options.threadId;
    if (!threadId) {
      const thread = await this.createThread();
      threadId = thread.threadId;
    }

    // Insert message
    await db.execute(
      `INSERT INTO messages (
        messageId, threadId, role, content, classification, provider, providerMode,
        status, timestamp, linkedObjectiveId, linkedEnvelopeId, linkedDecisionId,
        linkedServiceId, auditRef, actionTaken, selectedObjectiveId, selectedFileIds,
        selectedService, currentPage
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )`,
      [
        messageId,
        threadId,
        options.role,
        options.content,
        options.classification || null,
        options.provider || null,
        options.providerMode || null,
        options.status || 'pending',
        timestamp,
        options.linkedObjectiveId || null,
        options.linkedEnvelopeId || null,
        options.linkedDecisionId || null,
        options.linkedServiceId || null,
        options.auditRef || null,
        options.actionTaken || null,
        options.selectedObjectiveId || null,
        options.selectedFileIds ? JSON.stringify(options.selectedFileIds) : null,
        options.selectedService || null,
        options.currentPage || null,
      ]
    );

    // Update thread message count and updatedAt
    await db.execute(
      `UPDATE threads 
       SET messageCount = messageCount + 1, updatedAt = $1 
       WHERE threadId = $2`,
      [timestamp, threadId]
    );

    return {
      messageId,
      threadId,
      role: options.role,
      content: options.content,
      classification: options.classification || null,
      provider: options.provider || null,
      providerMode: options.providerMode || null,
      status: options.status || 'pending',
      timestamp,
      linkedObjectiveId: options.linkedObjectiveId || null,
      linkedEnvelopeId: options.linkedEnvelopeId || null,
      linkedDecisionId: options.linkedDecisionId || null,
      linkedServiceId: options.linkedServiceId || null,
      auditRef: options.auditRef || null,
      actionTaken: options.actionTaken || null,
      selectedObjectiveId: options.selectedObjectiveId || null,
      selectedFileIds: options.selectedFileIds ? JSON.stringify(options.selectedFileIds) : null,
      selectedService: options.selectedService || null,
      currentPage: options.currentPage || null,
    };
  }

  /**
   * Get messages for a thread
   */
  async getThreadMessages(threadId: string, limit: number = 100): Promise<ChatMessage[]> {
    return await db.query<ChatMessage>(
      `SELECT * FROM messages 
       WHERE threadId = $1 
       ORDER BY timestamp ASC 
       LIMIT $2`,
      [threadId, limit]
    );
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: 'pending' | 'complete' | 'error'
  ): Promise<void> {
    await db.execute(
      'UPDATE messages SET status = $1 WHERE messageId = $2',
      [status, messageId]
    );
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<void> {
    await db.execute(
      'UPDATE threads SET status = $1, updatedAt = $2 WHERE threadId = $3',
      ['archived', new Date().toISOString(), threadId]
    );
  }

  /**
   * Delete a thread and all its messages
   */
  async deleteThread(threadId: string): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM messages WHERE threadId = $1', [threadId]);
      await db.execute('DELETE FROM threads WHERE threadId = $1', [threadId]);
    });
  }

  /**
   * Generate unique thread ID
   */
  private generateThreadId(): string {
    return `thread_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}
