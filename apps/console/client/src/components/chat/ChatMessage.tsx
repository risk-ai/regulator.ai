/**
 * Chat Message Component
 * Phase 10.5: Chat Cleanup
 * 
 * Structured message rendering with classification badges and relative timestamps
 */

import React from 'react';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/time.js';
import type { ChatHistoryItem } from '../../api/chat.js';

interface ChatMessageProps {
  message: ChatHistoryItem;
  className?: string;
}

type MessageType = 'command' | 'informational' | 'approval' | 'error' | 'recovery' | 'result';

interface ClassificationBadge {
  icon: string;
  label: string;
  cssClass: string;
}

const badges: Record<MessageType, ClassificationBadge> = {
  command: { icon: '🔵', label: 'COMMAND', cssClass: 'type-command' },
  informational: { icon: 'ℹ️', label: 'INFO', cssClass: 'type-informational' },
  approval: { icon: '⚠️', label: 'APPROVAL', cssClass: 'type-approval' },
  error: { icon: '❌', label: 'ERROR', cssClass: 'type-error' },
  recovery: { icon: '🔧', label: 'RECOVERY', cssClass: 'type-recovery' },
  result: { icon: '✅', label: 'RESULT', cssClass: 'type-result' },
};

/**
 * Map chat history classification to message type
 */
function getMessageType(message: ChatHistoryItem): MessageType {
  // Map from chat history classification
  switch (message.classification) {
    case 'command':
      return 'command';
    case 'approval':
      return 'approval';
    case 'recovery':
      return 'recovery';
    case 'informational':
    default:
      // Check if status indicates error
      if (message.status === 'failed') {
        return 'error';
      }
      // Check if this is a result message (has execution_id in content)
      if (message.content && 'execution_id' in message.content) {
        return 'result';
      }
      return 'informational';
  }
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, className = '' }) => {
  const messageType = getMessageType(message);
  const badge = badges[messageType];
  const timestamp = message.timestamp || new Date().toISOString();
  
  return (
    <div className={`chat-message ${className}`}>
      <div className="message-header">
        <span className={`classification-badge ${badge.cssClass}`}>
          {badge.icon} {badge.label}
        </span>
        <span
          className="message-timestamp"
          title={formatAbsoluteTime(timestamp, 'full')}
        >
          {formatRelativeTime(timestamp)}
        </span>
      </div>
      
      <div className="message-content">
        {message.content?.text || '(no content)'}
      </div>
      
      {/* Execution ID (if present) */}
      {message.content && 'execution_id' in message.content && (
        <div className="message-meta">
          <span className="meta-label">execution_id:</span>{' '}
          <a
            href={`#/executions/${(message.content as any).execution_id}`}
            className="meta-link"
          >
            {(message.content as any).execution_id}
          </a>
        </div>
      )}
    </div>
  );
};
