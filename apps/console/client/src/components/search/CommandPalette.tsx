/**
 * Command Palette - Global Search (Cmd+K)
 * 
 * Provides unified search across Vienna OS entities and quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Shield, FileText, Users, CheckCircle, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
}

interface SearchResult {
  id: string;
  type: 'page' | 'action' | 'data';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Quick actions and navigation items
  const allItems: SearchResult[] = [
    // Navigation
    {
      id: 'nav-now',
      type: 'page',
      title: 'Now',
      description: 'System status and activity center',
      icon: Zap,
      action: () => onNavigate('now')
    },
    {
      id: 'nav-fleet',
      type: 'page', 
      title: 'Fleet Dashboard',
      description: 'Agent fleet governance',
      icon: Users,
      action: () => onNavigate('fleet')
    },
    {
      id: 'nav-approvals',
      type: 'page',
      title: 'Approvals',
      description: 'Pending T1/T2 actions',
      icon: CheckCircle,
      action: () => onNavigate('approvals')
    },
    {
      id: 'nav-policies',
      type: 'page',
      title: 'Policies',
      description: 'Governance rules and policy builder',
      icon: Shield,
      action: () => onNavigate('policies')
    },
    {
      id: 'nav-compliance',
      type: 'page',
      title: 'Compliance',
      description: 'Governance reports and audit',
      icon: FileText,
      action: () => onNavigate('compliance')
    },

    // Quick actions
    {
      id: 'action-create-policy',
      type: 'action',
      title: 'Create Policy',
      description: 'Build a new governance policy',
      icon: Shield,
      action: () => {
        onNavigate('policies');
        // TODO: Could trigger a "create new" state
      }
    },
    {
      id: 'action-submit-intent',
      type: 'action',
      title: 'Submit Intent',
      description: 'Request governed execution',
      icon: Zap,
      action: () => onNavigate('intent')
    },
    {
      id: 'action-view-fleet',
      type: 'action',
      title: 'View Fleet',
      description: 'Check agent status',
      icon: Users,
      action: () => onNavigate('fleet')
    },
    {
      id: 'action-check-compliance',
      type: 'action',
      title: 'Check Compliance',
      description: 'Review governance reports',
      icon: FileText,
      action: () => onNavigate('compliance')
    }
  ];

  // Filter items based on query
  const filteredItems = query
    ? allItems.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32 z-50 p-4">
      <div className="bg-[#0F1419] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl animate-in slide-in-from-top duration-200">
        {/* Search Input */}
        <div className="border-b border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, actions, or data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-transparent text-white placeholder-gray-400 text-lg focus:outline-none"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No results found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`w-full p-3 rounded-lg text-left transition flex items-center gap-3 ${
                    isSelected 
                      ? 'bg-purple-600/20 border border-purple-500/30' 
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <div className={`p-2 rounded-md ${
                    item.type === 'action' ? 'bg-purple-500/10 text-purple-400' :
                    item.type === 'page' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                  </div>

                  <div className="text-xs text-gray-500 px-2 py-1 bg-gray-700/50 rounded">
                    {item.type === 'action' ? 'Action' : 'Navigate'}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-3 text-xs text-gray-400 flex justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>⎋ Close</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs">K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}