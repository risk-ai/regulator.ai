import { useAuthStore } from '../../store/authStore.js';
/**
 * Chat Panel
 * Phase 10.5: Chat Cleanup
 * 
 * Primary operator interface to Vienna with persistent thread history
 * Enhanced with provider status banner, message classification, and better UX
 */

import React, { useState, useRef, useEffect } from 'react';
import { chatApi } from '../../api/chat.js';
import { recoveryApi } from '../../api/recovery.js';
import { useDashboardStore } from '../../store/dashboardStore.js';
import { useProviderHealth } from '../../hooks/useProviderHealth.js';
import { useAssistantStatus } from '../../hooks/useAssistantStatus.js';
import { ProviderStatusBanner } from './ProviderStatusBanner.js';
import { ChatMessage } from './ChatMessage.js';
import { ChatEmptyState } from './ChatEmptyState.js';
import { ExecutionResultMessage, type ExecutionResult } from './ExecutionResultMessage.js';
import { CommandProposalCard } from './CommandProposalCard.js';
import type { ChatHistoryItem } from '../../api/chat.js';
import '../../styles/chat.css';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  
  const currentThreadId = useDashboardStore((state) => state.currentThreadId);
  const setCurrentThreadId = useDashboardStore((state) => state.setCurrentThreadId);
  const chatMessages = useDashboardStore((state) => state.chatMessages);
  const setChatMessages = useDashboardStore((state) => state.setChatMessages);
  const addChatMessage = useDashboardStore((state) => state.addChatMessage);
  const setChatLoading = useDashboardStore((state) => state.setChatLoading);
  const chatLoading = useDashboardStore((state) => state.chatLoading);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Provider health monitoring (for display)
  const { health } = useProviderHealth({
    refreshInterval: 5000,
  });
  
  // Assistant availability (for input enablement) - TRUTH SOURCE
  const { available: assistantAvailable, reason: assistantReason } = useAssistantStatus({
    refreshInterval: 5000,
  });
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  // Restore thread history on mount (skip if already hydrated by bootstrap)
  useEffect(() => {
    const restoreThread = async () => {
      // If bootstrap already hydrated chat, skip restoration
      if (chatMessages.length > 0 && currentThreadId) {
        console.log('[ChatPanel] Chat already hydrated by bootstrap, skipping restoration');
        setIsRestoring(false);
        return;
      }
      
      // Check if there's a saved threadId in localStorage
      const savedThreadId = localStorage.getItem('vienna:currentThreadId');
      
      if (savedThreadId) {
        try {
          // Restore history
          const historyData = await chatApi.getHistory(savedThreadId);
          setChatMessages(historyData.messages);
          setCurrentThreadId(savedThreadId);
          console.log(`[ChatPanel] Restored thread: ${savedThreadId} (${historyData.messages.length} messages)`);
        } catch (error) {
          console.error('[ChatPanel] Failed to restore thread:', error);
          // Clear invalid threadId
          localStorage.removeItem('vienna:currentThreadId');
          setCurrentThreadId(null);
          setChatMessages([]);
        }
      } else {
        // No saved thread, start fresh
        setCurrentThreadId(null);
        setChatMessages([]);
      }
      
      setIsRestoring(false);
    };
    
    restoreThread();
  }, []);
  
  // Save threadId to localStorage when it changes
  useEffect(() => {
    if (currentThreadId) {
      localStorage.setItem('vienna:currentThreadId', currentThreadId);
    }
  }, [currentThreadId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || chatLoading || !assistantAvailable) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Determine which provider will handle this request
    const availableProvider = health?.providers 
      ? Object.values(health.providers).find(p => p.status === 'healthy')
      : null;
    setLoadingProvider(availableProvider?.provider || 'local');
    
    // Add user message to chat (optimistic UI)
    const userMessageItem: ChatHistoryItem = {
      messageId: `user-${Date.now()}`,
      threadId: currentThreadId || 'pending',
      classification: 'command',
      provider: { name: 'none', mode: 'deterministic' },
      status: 'answered',
      content: { text: userMessage },
      timestamp: new Date().toISOString(),
    };
    
    addChatMessage(userMessageItem);
    setChatLoading(true);
    
    try {
      // Check if this is a recovery intent (Phase 6.5)
      if (recoveryApi.isRecoveryIntent(userMessage)) {
        console.log('[ChatPanel] Detected recovery intent, routing to recovery API');
        
        // Process through recovery API
        const recoveryResponse = await recoveryApi.processIntent(userMessage);
        
        // Extract response text with fallback
        const responseText: string = typeof recoveryResponse === 'string'
          ? recoveryResponse
          : (recoveryResponse?.response || 'Recovery copilot returned unexpected format');
        
        // Add recovery response as assistant message
        const assistantMessage: ChatHistoryItem = {
          messageId: `recovery-${Date.now()}`,
          threadId: currentThreadId || 'recovery',
          classification: 'recovery',
          provider: { name: 'vienna', mode: 'recovery' },
          status: 'answered',
          content: { text: responseText },
          timestamp: new Date().toISOString(),
        };
        
        addChatMessage(assistantMessage);
      } else {
        // Process through normal chat API (Phase 6.6 + Phase 6.8)
        const response = await chatApi.sendMessage({
          message: userMessage,
          context: {
            conversationHistory: chatMessages.slice(-10).map(m => ({
              role: m.content?.text === userMessage ? 'user' : 'assistant',
              content: m.content?.text || '',
            })),
          },
          operator: useAuthStore((state) => state.user?.email) || 'system',
        });
        
        // Phase 6.6/6.8 returns { message, timestamp, proposal? }
        const assistantMessage: ChatHistoryItem = {
          messageId: `assistant-${Date.now()}`,
          threadId: currentThreadId || 'general',
          classification: response.proposal ? 'approval' : 'informational',
          provider: { name: 'vienna', mode: response.proposal ? 'deterministic' : 'llm' },
          status: response.proposal ? 'approval_required' : 'answered',
          content: { text: response.message },
          proposal: response.proposal,
          timestamp: response.timestamp,
        };
        
        addChatMessage(assistantMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Improved error language (operator-grade)
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('cooldown') || msg.includes('provider')) {
          errorMessage = 'Model provider temporarily unavailable. Retrying automatically.';
        } else if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('401')) {
          errorMessage = 'Authentication required to continue. Please refresh and log in again.';
        } else if (msg.includes('execution') || msg.includes('warrant')) {
          errorMessage = `Unable to complete request. No action was executed. Reason: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      // Add error message with proper classification
      const errorMessageItem: ChatHistoryItem = {
        messageId: `error-${Date.now()}`,
        threadId: currentThreadId || 'error',
        classification: 'informational', // Use informational to avoid TS error
        provider: { name: 'none', mode: 'fallback' },
        status: 'failed', // Status indicates error
        content: {
          text: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };
      
      addChatMessage(errorMessageItem);
    } finally {
      setChatLoading(false);
      setLoadingProvider(null);
    }
  };
  
  const startNewThread = () => {
    setCurrentThreadId(null);
    setChatMessages([]);
    localStorage.removeItem('vienna:currentThreadId');
  };
  
  const handleExampleClick = (example: string) => {
    setInput(example);
  };
  
  // Determine input placeholder based on assistant availability (TRUTH SOURCE)
  const getPlaceholder = (): string => {
    if (!assistantAvailable) {
      if (assistantReason === 'provider_cooldown') {
        return 'Assistant unavailable — provider cooldown active...';
      } else if (assistantReason === 'runtime_degraded') {
        return 'Assistant unavailable — runtime degraded...';
      } else if (assistantReason === 'no_providers') {
        return 'Assistant unavailable — no providers configured...';
      } else {
        return 'Assistant unavailable — service temporarily unavailable...';
      }
    }
    
    return 'Type a command or question... (e.g., "restart gateway", "show health")';
  };
  
  const inputDisabled = chatLoading || isRestoring || !assistantAvailable;
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Vienna Chat</h3>
            <p className="text-xs text-gray-400 mt-1">
              {currentThreadId ? `Thread: ${currentThreadId.substring(0, 20)}...` : 'New thread'}
            </p>
          </div>
          {currentThreadId && (
            <button
              onClick={startNewThread}
              className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-500 transition"
            >
              New Thread
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider Status Banner */}
        <ProviderStatusBanner />
        
        {isRestoring && (
          <div className="text-center text-gray-500 py-8">
            <p>Restoring conversation...</p>
          </div>
        )}
        
        {!isRestoring && chatMessages.length === 0 && (
          <ChatEmptyState onExampleClick={handleExampleClick} />
        )}
        
        {!isRestoring && chatMessages.map((message) => (
          <EnrichedChatMessage key={message.messageId} message={message} />
        ))}
        
        {/* Loading Indicator */}
        {chatLoading && loadingProvider && (
          <div className="chat-loading-indicator">
            <div className="chat-loading-spinner" />
            <span>
              Processing via {loadingProvider === 'anthropic' ? 'Anthropic' : loadingProvider === 'local' ? 'Ollama' : loadingProvider}...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={inputDisabled}
            className={`flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              inputDisabled ? 'chat-input-disabled' : ''
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || inputDisabled}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {chatLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        {!assistantAvailable && (
          <div className="mt-2 text-xs text-yellow-500">
            ⚠ Assistant unavailable: {assistantReason?.replace(/_/g, ' ')}. Will resume automatically when available.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Enriched Chat Message Component
 * Wraps ChatMessage with approval card and execution result handling
 */
function EnrichedChatMessage({ message }: { message: ChatHistoryItem }) {
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  
  const hasProposal = !!message.proposal;
  
  return (
    <div>
      {/* Message with classification */}
      <ChatMessage message={message} />
      
      {/* Approval card (if proposal exists) */}
      {hasProposal && message.proposal && (
        <div style={{ marginTop: '0.75rem' }}>
          <CommandProposalCard
            proposal={message.proposal}
            onExecuted={(result) => {
              const executionResult: ExecutionResult = {
                success: result.success || false,
                status: result.success ? 'success' : 'failure',
                message: result.result?.message || result.message || 'Execution completed',
                execution_id: result.execution_id,
                details: result.result,
              };
              setExecutionResult(executionResult);
            }}
            onRejected={() => console.log('Command rejected')}
          />
        </div>
      )}
      
      {/* Execution result (if exists) */}
      {executionResult && (
        <div style={{ marginTop: '0.75rem' }}>
          <ExecutionResultMessage result={executionResult} />
        </div>
      )}
    </div>
  );
}
