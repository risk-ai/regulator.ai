/**
 * Chat Empty State Component
 * Phase 10.5: Chat Cleanup
 * 
 * Helpful empty state with Vienna-specific example commands
 */

import React from 'react';

interface ChatEmptyStateProps {
  onExampleClick: (example: string) => void;
}

const examples = [
  { icon: '🔍', text: 'show objectives in cooldown' },
  { icon: '⚙️', text: 'what reconciliations are active?' },
  { icon: '🏥', text: 'why is gateway-health degraded?' },
  { icon: '⏱️', text: 'show recent timeout events' },
  { icon: '📊', text: 'show execution ledger for last hour' },
  { icon: '🎯', text: 'what objectives need attention?' },
];

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ onExampleClick }) => {
  return (
    <div className="chat-empty-state">
      <div className="empty-state-title">Vienna Operator Assistant</div>
      <div className="empty-state-message">
        Ask questions, issue commands, or investigate system state.
      </div>
      
      <div className="empty-state-examples">
        <div style={{ fontSize: '0.75rem', color: 'rgb(156, 163, 175)', marginBottom: '0.5rem', textAlign: 'left' }}>
          Example commands:
        </div>
        {examples.map((example, i) => (
          <div
            key={i}
            className="empty-state-example"
            onClick={() => onExampleClick(example.text)}
          >
            <span className="empty-state-example-icon">{example.icon}</span>
            {example.text}
          </div>
        ))}
      </div>
    </div>
  );
};
