import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Shortcut {
  key: string;
  description: string;
  context?: string;
}

const shortcuts: Shortcut[] = [
  { key: '⌘K', description: 'Open command palette', context: 'Global' },
  { key: '?', description: 'Toggle keyboard shortcuts', context: 'Global' },
  { key: 'Esc', description: 'Close modals / Clear focus', context: 'Global' },
  { key: 'A', description: 'Approve selected', context: 'Approvals' },
  { key: 'D', description: 'Deny selected', context: 'Approvals' },
  { key: 'Shift+A', description: 'Bulk approve', context: 'Approvals' },
  { key: '/', description: 'Focus search', context: 'Fleet' },
  { key: '↑ / ↓', description: 'Navigate list', context: 'Lists' },
  { key: 'Enter', description: 'Select / Open', context: 'Lists' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutOverlay({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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

        {/* Shortcuts List */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Group by context */}
            {['Global', 'Approvals', 'Fleet', 'Lists'].map(context => {
              const contextShortcuts = shortcuts.filter(s => s.context === context);
              if (contextShortcuts.length === 0) return null;

              return (
                <div key={context}>
                  <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-3 font-mono">
                    {context}
                  </h3>
                  <div className="space-y-2">
                    {contextShortcuts.map((shortcut, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded transition-colors"
                      >
                        <span className="text-[13px] text-white/80">{shortcut.description}</span>
                        <kbd className="px-2.5 py-1 bg-[#1a1b26] border border-white/[0.12] rounded text-[12px] font-mono text-white/90 shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
