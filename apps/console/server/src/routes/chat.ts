/**
 * Chat Routes
 * 
 * Operator chat interface to Vienna.
 * Phase 6.6: Routes general chat through LLM providers.
 * 
 * AUTHORITY BOUNDARY:
 * - This route calls ViennaRuntimeService directly for Phase 6.6
 * - ViennaRuntimeService calls Vienna Core
 * - Never import adapters here
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { ChatHistoryService } from '../services/chatHistoryService.js';

export function createChatRouter(
  vienna: ViennaRuntimeService,
  providerHealthService?: any,
  chatHistoryService?: ChatHistoryService
): Router {
  const router = Router();
  
  /**
   * POST /api/v1/chat/message
   * Send message to Vienna (Phase 6.6: with LLM provider routing + Phase 6.8: command proposals)
   */
  router.post('/message', async (req: Request, res: Response) => {
    try {
      const message = req.body.message as string;
      const context = req.body.context as {
        systemPrompt?: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        model?: string;
      } | undefined;
      
      // Validate required fields
      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: message',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Check provider availability (graceful degradation)
      if (providerHealthService) {
        try {
          const providers = await providerHealthService.getProviderHealth();
          const anthropic = providers.anthropic || { status: 'unknown' };
          const local = providers.local || { status: 'unknown' };
          
          // Provider is available if healthy OR unknown (untested but usable)
          // Only unavailable if status is explicitly "unavailable"
          const anyProviderAvailable = 
            anthropic.status === 'healthy' || local.status === 'healthy' ||
            anthropic.status === 'unknown' || local.status === 'unknown';
          
          if (!anyProviderAvailable) {
            res.status(503).json({
              success: false,
              error: 'AI chat temporarily unavailable (all LLM providers in cooldown)',
              code: 'NO_PROVIDERS_AVAILABLE',
              details: {
                providers: {
                  anthropic: {
                    status: anthropic.status,
                    reason: anthropic.status === 'unavailable' ? 'cooldown' : 'unknown',
                  },
                  local: {
                    status: local.status,
                    reason: local.status === 'unavailable' ? 'connection_refused' : 'unknown',
                  },
                },
                retry_after: 60, // Suggest retry after 60s
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        } catch (error) {
          console.warn('[ChatRoute] Failed to check provider health:', error);
          // Continue anyway (don't block chat on health check failure)
        }
      }
      
      // Check if this is a command-related request (Phase 6.8)
      const commandPatterns = [
        /restart.*service/i,
        /stop.*service/i,
        /start.*service/i,
        /check.*port/i,
        /kill.*process/i,
      ];
      
      let proposal = null;
      const isCommandRequest = commandPatterns.some(p => p.test(message));
      
      if (isCommandRequest) {
        // Extract command intent and generate proposal
        try {
          // Simple pattern matching for common commands
          if (/restart.*gateway/i.test(message)) {
            proposal = await vienna.proposeSystemCommand('restart_service', ['openclaw-gateway'], {
              operator: 'chat-handler',
              reason: `User requested: ${message}`,
            });
          } else if (/check.*port.*(\d+)/i.test(message)) {
            const portMatch = message.match(/(\d+)/);
            if (portMatch) {
              proposal = await vienna.proposeSystemCommand('check_port', [parseInt(portMatch[1])], {
                operator: 'chat-handler',
                reason: `User requested: ${message}`,
              });
            }
          }
        } catch (error) {
          console.warn('[ChatRoute] Failed to generate command proposal:', error);
        }
      }
      
      // Route through Vienna (handles recovery vs general chat classification)
      const response = await vienna.processChatMessage(message, context);
      
      res.json({
        success: true,
        data: {
          message: response,
          proposal: proposal || undefined,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ChatRoute] Error handling message:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CHAT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/chat/history
   * Get chat history for a thread
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const threadId = req.query.threadId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const before = req.query.before as string | undefined;
      
      if (!threadId) {
        res.status(400).json({
          success: false,
          error: 'Missing required query parameter: threadId',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Get history from ChatHistoryService if available
      let messages = [];
      let hasMore = false;
      
      if (chatHistoryService) {
        // Request one extra to check if there are more
        const history = await chatHistoryService.getHistory(threadId, limit + 1);
        hasMore = history.length > limit;
        
        // Return only the requested limit
        const messagesToReturn = hasMore ? history.slice(0, limit) : history;
        
        messages = messagesToReturn.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
      }
      
      res.json({
        success: true,
        data: {
          threadId,
          messages,
          hasMore,
          nextBefore: hasMore && messages.length > 0 ? messages[messages.length - 1].timestamp : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ChatRoute] Error fetching history:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HISTORY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/chat/threads
   * Get list of chat threads
   */
  router.get('/threads', async (req: Request, res: Response) => {
    try {
      const status = req.query.status as 'active' | 'archived' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      // Get threads from ChatHistoryService if available
      let threads: any[] = [];
      if (chatHistoryService) {
        const allThreads = await chatHistoryService.listThreads();
        threads = allThreads
          .filter((t: any) => !status || t.status === status)
          .slice(0, limit)
          .map((t: any) => ({
            id: t.id,
            status: t.status || 'active',
            lastMessage: t.lastMessage,
            messageCount: t.messageCount || 0,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }));
      }
      
      res.json({
        success: true,
        data: {
          threads,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[ChatRoute] Error fetching threads:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'THREADS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
