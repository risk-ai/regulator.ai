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

import { LayeredClassifier } from '@vienna-lib/commands/classifier.js';
import { ProviderManager } from '@vienna-lib/providers/manager.js';
import type { 
  ChatResponse, 
  MessageContext,
  CommandResult,
} from '@vienna-lib/commands/types.js';
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

export class ChatService {
  private classifier: LayeredClassifier;
  private vienna: ViennaRuntimeService;
  private providerManager: ProviderManager;
  
  constructor(
    vienna: ViennaRuntimeService,
    providerManager: ProviderManager
  ) {
    this.vienna = vienna;
    this.providerManager = providerManager;
    this.classifier = new LayeredClassifier(providerManager);
    
    // Register command handlers
    this.registerHandlers();
    
    console.log('[ChatService] Initialized with layered classification');
  }
  
  /**
   * Register command handlers with deterministic parser
   */
  private registerHandlers(): void {
    // Execution control
    this.classifier.registerHandler('pauseExecution', {
      execute: async (args, context) => {
        const result = await this.vienna.pauseExecution({
          reason: 'Operator requested via chat',
          operator: context.operator,
        });
        
        return `✓ Execution paused successfully at ${result.paused_at}. ${result.queued_envelopes_paused} envelopes paused.`;
      },
    });
    
    this.classifier.registerHandler('resumeExecution', {
      execute: async (args, context) => {
        const result = await this.vienna.resumeExecution({
          operator: context.operator,
        });
        
        return `✓ Execution resumed successfully at ${result.resumed_at}. ${result.envelopes_resumed} envelopes resumed.`;
      },
    });
    
    // Status queries
    this.classifier.registerHandler('showStatus', {
      execute: async (args, context) => {
        const status = await this.vienna.getSystemStatus();
        
        return `**System Status:**
• State: ${status.system_state}
• Executor: ${status.executor_state}${status.paused ? ` (paused: ${status.pause_reason})` : ''}
• Queue depth: ${status.queue_depth}
• Active envelopes: ${status.active_envelopes}
• Blocked envelopes: ${status.blocked_envelopes}
• Dead letters: ${status.dead_letter_count}
• Trading guard: ${status.trading_guard_state}
• Integrity: ${status.integrity_state}`;
      },
    });
    
    this.classifier.registerHandler('showProviders', {
      execute: async (args, context) => {
        const providers = await this.vienna.getProviders();
        
        let response = `**Model Providers:**\n\n`;
        response += `Primary: ${providers.primary}\n`;
        response += `Fallback: ${providers.fallback.join(', ')}\n\n`;
        
        for (const [name, health] of Object.entries(providers.providers)) {
          const statusIcon = health.status === 'healthy' ? '✓' : 
                           health.status === 'degraded' ? '⚠' : '✗';
          response += `${statusIcon} **${name}**: ${health.status}`;
          
          if (health.latencyMs) {
            response += ` (${health.latencyMs}ms)`;
          }
          
          if (health.cooldownUntil) {
            response += ` [cooldown until ${health.cooldownUntil}]`;
          }
          
          response += `\n`;
        }
        
        return response;
      },
    });
    
    this.classifier.registerHandler('showServices', {
      execute: async (args, context) => {
        const services = await this.vienna.getServices();
        
        let response = `**Services:**\n\n`;
        
        for (const service of services) {
          const statusIcon = service.status === 'running' ? '✓' : 
                           service.status === 'degraded' ? '⚠' : '✗';
          response += `${statusIcon} **${service.service}**: ${service.status}`;
          
          if (service.connectivity) {
            response += ` (connectivity: ${service.connectivity})`;
          }
          
          if (service.restartable) {
            response += ` [restartable]`;
          }
          
          response += `\n`;
        }
        
        return response;
      },
    });
    
    // Objectives
    this.classifier.registerHandler('listObjectives', {
      execute: async (args, context) => {
        const objectives = await this.vienna.getObjectives({ limit: 10 });
        
        if (objectives.length === 0) {
          return 'No active objectives.';
        }
        
        let response = `**Active Objectives (${objectives.length}):**\n\n`;
        
        for (const obj of objectives) {
          response += `• **${obj.title}** (${obj.objective_id})\n`;
          response += `  Status: ${obj.status} | Risk: ${obj.risk_tier} | Envelopes: ${obj.envelope_count}\n`;
        }
        
        return response;
      },
    });
    
    this.classifier.registerHandler('showDeadLetters', {
      execute: async (args, context) => {
        const deadLetters = await this.vienna.getDeadLetters({ state: 'pending_review' });
        
        if (deadLetters.length === 0) {
          return 'No dead letters pending review.';
        }
        
        let response = `**Dead Letters (${deadLetters.length}):**\n\n`;
        
        for (const dl of deadLetters) {
          response += `• **${dl.envelope_id}**\n`;
          response += `  Reason: ${dl.reason}\n`;
          response += `  Failed at: ${dl.failed_at}\n`;
        }
        
        return response;
      },
    });
    
    // Recovery
    this.classifier.registerHandler('restartOpenClaw', {
      execute: async (args, context) => {
        const result = await this.vienna.restartService('openclaw', context.operator);
        
        if (result.status === 'preview') {
          return `**Recovery Objective Created**\n\nObjective: ${result.objective_id}\nStatus: ${result.status}\n\n${result.message}`;
        } else if (result.status === 'executing') {
          return `✓ OpenClaw restart initiated.\n\nObjective: ${result.objective_id}\n\n${result.message}`;
        } else {
          return `✗ OpenClaw restart failed.\n\n${result.message}`;
        }
      },
    });
    
    // Help
    this.classifier.registerHandler('showHelp', {
      execute: async (args, context) => {
        return this.classifier.getHelpText();
      },
    });
  }
  
  /**
   * Handle incoming message
   */
  async handleMessage(request: ChatMessageRequest): Promise<ChatResponse> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const context: MessageContext = {
      operator: request.operator,
      page: request.context?.page,
      objectiveId: request.context?.selectedObjectiveId,
      threadId: request.threadId,
    };
    
    try {
      // Classify message using layered approach
      const { classification, commandResult } = await this.classifier.classify(
        request.message,
        context
      );
      
      console.log(`[ChatService] Message classified as "${classification.classification}" (mode: ${classification.mode})`);
      
      // Handle deterministic command
      if (commandResult?.matched && commandResult.handler) {
        const resultText = await commandResult.handler();
        
        return {
          messageId,
          classification: classification.classification,
          provider: {
            name: 'none',
            mode: classification.mode,
          },
          status: 'answered',
          content: {
            text: resultText,
          },
          actionTaken: commandResult.command ? {
            action: commandResult.command,
            result: 'success',
          } : undefined,
          timestamp,
        };
      }
      
      // Handle provider-backed classification
      if (classification.mode === 'llm' && classification.provider) {
        return await this.handleProviderRequest(
          request,
          classification,
          messageId,
          timestamp,
          context
        );
      }
      
      // Fallback mode (no provider, low confidence)
      if (classification.mode === 'fallback' || classification.mode === 'keyword') {
        return this.buildFallbackResponse(
          messageId,
          classification.classification,
          timestamp
        );
      }
      
      // Should not reach here
      throw new Error('Unhandled classification path');
      
    } catch (error) {
      console.error('[ChatService] Error handling message:', error);
      
      return {
        messageId,
        classification: 'informational',
        provider: { name: 'none', mode: 'fallback' },
        status: 'failed',
        content: {
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        timestamp,
      };
    }
  }
  
  /**
   * Handle provider-backed request
   */
  private async handleProviderRequest(
    request: ChatMessageRequest,
    classification: any,
    messageId: string,
    timestamp: string,
    context: MessageContext
  ): Promise<ChatResponse> {
    try {
      const provider = await this.providerManager.getHealthyProvider(request.threadId);
      
      if (!provider) {
        return this.buildFallbackResponse(messageId, classification.classification, timestamp);
      }
      
      const response = await this.providerManager.sendMessage({
        message: request.message,
        operator: context.operator,
        context: {
          system_prompt: 'You are Vienna, an AI operator assistant helping with system operations.',
          page: context.page,
          objective_id: context.objectiveId,
        },
      }, request.threadId);
      
      return {
        messageId,
        classification: classification.classification,
        provider: {
          name: response.provider as any,
          model: response.model,
          mode: 'llm',
        },
        status: 'answered',
        content: {
          text: response.content,
        },
        timestamp,
      };
    } catch (error) {
      console.error('[ChatService] Provider request failed:', error);
      return this.buildFallbackResponse(messageId, classification.classification, timestamp);
    }
  }
  
  /**
   * Build fallback response (no provider available)
   */
  private buildFallbackResponse(
    messageId: string,
    classification: string,
    timestamp: string
  ): ChatResponse {
    const helpText = this.classifier.getHelpText();
    
    return {
      messageId,
      classification: classification as any,
      provider: {
        name: 'none',
        mode: 'fallback',
      },
      status: 'answered',
      content: {
        text: `I don't have an LLM provider available for complex queries right now.\n\nHowever, these core commands still work:\n\n${helpText}`,
      },
      timestamp,
    };
  }
  
  /**
   * Get chat history
   */
  async getHistory(params: {
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
  }> {
    // Delegate to ChatHistoryService if available
    if (this.chatHistory) {
      try {
        const threadId = params.threadId || 'default';
        const limit = params.limit || 50;
        const history = await this.chatHistory.getHistory(threadId, limit + 1);
        const hasMore = history.length > limit;
        const messages = (hasMore ? history.slice(0, limit) : history).map((msg: any) => ({
          messageId: msg.messageId || msg.id,
          role: msg.role === 'user' ? 'operator' : 'vienna',
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        return { messages, has_more: hasMore };
      } catch (error) {
        console.warn('[ChatService] History retrieval failed:', error);
      }
    }
    
    // Fallback: empty history
    return {
      messages: [],
      has_more: false,
    };
  }
}
