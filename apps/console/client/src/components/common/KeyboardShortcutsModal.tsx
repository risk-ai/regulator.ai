/**
 * Keyboard Shortcuts Overlay
 * 
 * Global modal showing all available keyboard shortcuts.
 * Triggered by ? key, terminal aesthetic.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutSection {
  section: string;
  shortcuts: Array<{ keys: string[]; description: string }>;
}

const SHORTCUTS: ShortcutSection[] = [
  {
    section: 'Global',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modals/overlays' },
    ],
  },
  {
    section: 'Navigation',
    shortcuts: [
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'f'], description: 'Go to Fleet' },
      { keys: ['g', 'a'], description: 'Go to Approvals' },
      { keys: ['g', 'p'], description: 'Go to Policies' },
    ],
  },
  {
    section: 'Approvals',
    shortcuts: [
      { keys: ['A'], description: 'Approve first pending warrant' },
      { keys: ['D'], description: 'Deny first pending warrant' },
      { keys: ['E'], description: 'Escalate first pending warrant' },
    ],
  },
  {
    section: 'Fleet',
    shortcuts: [
      { keys: ['r'], description: 'Refresh agent list' },
      { keys: ['c'], description: 'Connect new agent' },
    ],
  },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Esc or ?
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 p-6 flex items-center justify-between"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Keyboard Shortcuts
            </h2>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
              Press ? or Esc to close
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-app)' }}
          >
            <X size={20} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3
                className="text-xs font-bold uppercase tracking-wider mb-3 pb-2"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded"
                    style={{ background: 'var(--bg-app)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          {keyIdx > 0 && (
                            <span
                              className="text-xs font-mono mx-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              then
                            </span>
                          )}
                          <kbd
                            className="px-2 py-1 rounded text-xs font-mono font-semibold min-w-[28px] text-center"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 p-4 text-center"
          style={{
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            More shortcuts coming soon. Submit feedback via the widget in the bottom-right corner.
          </p>
        </div>
      </div>
    </div>
  );
}
