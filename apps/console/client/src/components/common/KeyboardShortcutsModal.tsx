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
      { keys: ['⌘K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Toggle keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modals / Clear focus' },
    ],
  },
  {
    section: 'Approvals',
    shortcuts: [
      { keys: ['A'], description: 'Approve selected' },
      { keys: ['D'], description: 'Deny selected' },
      { keys: ['Shift+A'], description: 'Bulk approve' },
    ],
  },
  {
    section: 'Fleet',
    shortcuts: [
      { keys: ['/'], description: 'Focus search' },
    ],
  },
  {
    section: 'Lists',
    shortcuts: [
      { keys: ['↑ / ↓'], description: 'Navigate list' },
      { keys: ['Enter'], description: 'Select / Open' },
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#12131a] border border-white/[0.12] rounded-lg max-w-2xl w-full shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-white font-mono">KEYBOARD_SHORTCUTS</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/[0.05] rounded transition-colors"
          >
            <X size={18} className="text-white/55 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {SHORTCUTS.map((section) => (
              <div key={section.section}>
                <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-3 font-mono">
                  {section.section}
                </h3>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded transition-colors"
                    >
                      <span className="text-[13px] text-white/80">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="px-2.5 py-1 bg-[#1a1b26] border border-white/[0.12] rounded text-[12px] font-mono text-white/90 shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] px-6 py-3 bg-white/[0.02]">
          <p className="text-[11px] text-white/45 font-mono">
            Press <kbd className="px-1.5 py-0.5 bg-[#1a1b26] border border-white/[0.12] rounded text-[10px]">?</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 bg-[#1a1b26] border border-white/[0.12] rounded text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
