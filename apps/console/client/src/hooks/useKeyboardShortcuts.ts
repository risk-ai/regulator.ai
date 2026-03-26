/**
 * Global Keyboard Shortcuts Hook
 * 
 * Handles global keyboard shortcuts including Cmd+K for search
 */

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  onOpenCommandPalette?: () => void;
}

export function useKeyboardShortcuts({ onOpenCommandPalette }: UseKeyboardShortcutsOptions = {}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K - Open command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // Additional shortcuts can be added here
      switch (event.key) {
        case '/':
          // Focus search (alternative to Cmd+K)
          event.preventDefault();
          onOpenCommandPalette?.();
          break;
        
        case 'Escape':
          // Global escape handler
          // TODO: Could close modals, clear focus, etc.
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  // Return shortcuts info for help/documentation
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'k',
      metaKey: true,
      action: () => onOpenCommandPalette?.(),
      description: 'Open command palette'
    },
    {
      key: '/',
      action: () => onOpenCommandPalette?.(),
      description: 'Open command palette (alternative)'
    },
    {
      key: 'Escape',
      action: () => {},
      description: 'Close modals and clear focus'
    }
  ];

  return { shortcuts };
}