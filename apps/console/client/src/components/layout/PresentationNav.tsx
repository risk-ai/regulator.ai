/**
 * Premium Presentation Navigation
 * Enhanced UI for product demonstrations
 */

import React from 'react';

export type NavSection = 'now' | 'runtime' | 'workspace' | 'history' | 'services' | 'settings';

interface PresentationNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'now',
    label: 'Now',
    icon: '🔴',
    description: 'Real-time system posture',
  },
  {
    id: 'runtime',
    label: 'Runtime',
    icon: '⚙️',
    description: 'Governed control plane',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: '📁',
    description: 'Investigation artifacts',
  },
  {
    id: 'history',
    label: 'History',
    icon: '📜',
    description: 'Execution ledger',
  },
  {
    id: 'services',
    label: 'Services',
    icon: '🔧',
    description: 'Infrastructure health',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚡',
    description: 'Operator preferences',
  },
];

export function PresentationNav({ currentSection, onNavigate }: PresentationNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-2 border-transparent" style={{
      background: 'rgba(10, 10, 15, 0.9)',
      backdropFilter: 'blur(20px)',
      borderImage: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899) 1',
    }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo / Title */}
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold gradient-text" style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}>
              Vienna OS
            </div>
            <div className="status-badge healthy" style={{ fontSize: '11px' }}>
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Operational
            </div>
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center space-x-2">
            {NAV_ITEMS.map((item) => {
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.description}
                  className={`
                    relative px-5 py-3 text-sm font-semibold rounded-xl
                    transition-all duration-300 ease-out
                    flex items-center gap-2
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                  style={{
                    background: isActive 
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                      : 'transparent',
                    border: isActive 
                      ? '1px solid rgba(99, 102, 241, 0.5)'
                      : '1px solid transparent',
                    boxShadow: isActive
                      ? '0 0 20px rgba(99, 102, 241, 0.3)'
                      : 'none',
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-500 to-pink-500"></span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* System Status Indicator */}
          <div className="flex items-center space-x-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-medium">Phase 12</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
