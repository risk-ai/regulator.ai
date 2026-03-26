/**
 * Main Navigation — Vienna OS
 * 
 * Premier tabbed navigation with icons, clean active states, and tooltips.
 */

import React from 'react';

export type NavSection = 'now' | 'runtime' | 'fleet' | 'workspace' | 'approvals' | 'policies' | 'intent' | 'action-types' | 'integrations' | 'compliance' | 'history' | 'services' | 'settings';

interface MainNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  description: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'now', label: 'Now', description: 'System posture & action center', icon: '⚡' },
  { id: 'runtime', label: 'Runtime', description: 'Execution pipeline & reconciliation', icon: '⚙️' },
  { id: 'fleet', label: 'Fleet', description: 'Agent fleet governance dashboard', icon: '🤖' },
  { id: 'approvals', label: 'Approvals', description: 'Pending T1/T2 actions', icon: '✅' },
  { id: 'policies', label: 'Policies', description: 'Governance rules & policy builder', icon: '🛡️' },
  { id: 'intent', label: 'Intent', description: 'Submit governed intents', icon: '🎯' },
  { id: 'action-types', label: 'Actions', description: 'Action type registry', icon: '⚡' },
  { id: 'integrations', label: 'Integrations', description: 'External service adapters', icon: '🔌' },
  { id: 'compliance', label: 'Compliance', description: 'Governance reports & compliance', icon: '📊' },
  { id: 'history', label: 'History', description: 'Execution ledger & audit', icon: '📋' },
  { id: 'workspace', label: 'Workspace', description: 'Files & artifacts', icon: '📁' },
  { id: 'services', label: 'Services', description: 'Infrastructure health', icon: '🔧' },
  { id: 'settings', label: 'Settings', description: 'Configuration', icon: '⚙️' },
];

export function MainNav({ currentSection, onNavigate }: MainNavProps) {
  return (
    <nav style={{
      background: 'var(--bg-app)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'end',
      gap: '2px',
      height: '44px',
      fontFamily: 'var(--font-sans)',
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = currentSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#a78bfa' : 'var(--text-tertiary)',
              background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
