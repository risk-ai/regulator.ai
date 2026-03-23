/**
 * Main Navigation
 * 
 * Top-level navigation for Vienna OS operator console
 */

import React from 'react';

export type NavSection = 'overview' | 'now' | 'approvals' | 'executions' | 'runtime' | 'workspace' | 'services' | 'settings';

interface MainNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  description: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'System health and capabilities',
  },
  {
    id: 'now',
    label: 'Now',
    description: 'Current activity and chat',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    description: 'Review and approve T1/T2 actions',
  },
  {
    id: 'executions',
    label: 'Executions',
    description: 'Execution history and audit trail',
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description: 'Control plane and reconciliation',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Investigation files and artifacts',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Infrastructure monitoring',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Operator preferences',
  },
];

export function MainNav({ currentSection, onNavigate }: MainNavProps) {
  return (
    <nav className="border-b border-gray-700 bg-gray-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div>
                <div className="text-base font-semibold text-white leading-tight">
                  Vienna OS
                </div>
                <div className="text-xs text-gray-400 leading-tight">
                  Operator Console
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.description}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md
                    transition-colors duration-150
                    ${isActive
                      ? 'text-white bg-gray-700'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
