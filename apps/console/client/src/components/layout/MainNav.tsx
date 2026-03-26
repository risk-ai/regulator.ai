/**
 * Main Navigation — Vienna OS
 * 
 * Premier tabbed navigation with icons, clean active states, and tooltips.
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive.js';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <>
        <nav style={{
          background: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--text-primary)' 
          }}>
            Vienna<span style={{ color: '#7c3aed' }}>OS</span>
          </span>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-primary)',
            zIndex: 1000,
            padding: '16px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              {NAV_ITEMS.map((item) => {
                const isActive = currentSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#a78bfa' : 'var(--text-primary)',
                      background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                      border: isActive ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <div>
                      <div>{item.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  }

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
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
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
