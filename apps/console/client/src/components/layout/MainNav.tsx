/**
 * Main Navigation
 * Phase 2: Information Architecture
 * 
 * Top-level navigation for Vienna OS operator shell
 */

import React from 'react';

export type NavSection = 'now' | 'runtime' | 'workspace' | 'approvals' | 'intent' | 'history' | 'services' | 'settings';

interface MainNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'now',
    label: 'Now',
    description: 'Current system posture and actionable summary',
  },
  {
    id: 'runtime',
    label: 'Runtime',
    description: 'Governed reconciliation control plane',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Files, artifacts, and documentation',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    description: 'Review and approve pending T1/T2 actions',
  },
  {
    id: 'intent',
    label: 'Intent',
    description: 'Submit structured intents for governed execution',
  },
  {
    id: 'history',
    label: 'History',
    description: 'Execution ledger and audit trail',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Infrastructure monitoring and health',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Operator preferences and configuration',
  },
];

export function MainNav({ currentSection, onNavigate }: MainNavProps) {
  return (
    <nav className="border-b border-gray-700 bg-gray-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold text-white">
              Vienna OS
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
