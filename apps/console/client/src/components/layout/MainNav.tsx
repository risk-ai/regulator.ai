/**
 * Main Navigation — Vienna OS
 * 
 * Premier tabbed navigation with icons, clean active states, and tooltips.
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive.js';

export type NavSection = 'now' | 'runtime' | 'fleet' | 'workspace' | 'approvals' | 'policies' | 'policy-templates' | 'agent-templates' | 'activity' | 'intent' | 'action-types' | 'integrations' | 'compliance' | 'history' | 'services' | 'api-keys' | 'settings' | 'execution' | 'executions' | 'connect';

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

/* ── Primary nav: always visible in top bar ── */
const PRIMARY_NAV: NavItem[] = [
  { id: 'now', label: 'Dashboard', description: 'System posture & action center', icon: '⚡' },
  { id: 'fleet', label: 'Agents', description: 'Agent fleet management', icon: '🤖' },
  { id: 'intent', label: 'Intent', description: 'Submit governed intents', icon: '🎯' },
  { id: 'execution', label: 'Execution', description: 'Live execution pipeline', icon: '▶️' },
  { id: 'approvals', label: 'Approvals', description: 'Pending T1/T2 actions', icon: '✅' },
  { id: 'policies', label: 'Policies', description: 'Governance rules', icon: '🛡️' },
  { id: 'activity', label: 'Activity', description: 'Real-time activity feed', icon: '📊' },
  { id: 'history', label: 'Audit', description: 'Execution ledger & audit trail', icon: '📋' },
  { id: 'compliance', label: 'Compliance', description: 'Governance reports', icon: '📑' },
  { id: 'api-keys', label: 'API Keys', description: 'Programmatic access', icon: '🔑' },
  { id: 'settings', label: 'Settings', description: 'Configuration', icon: '⚙️' },
];

/* ── Secondary nav: visible in mobile menu & "More" dropdown ── */
const SECONDARY_NAV: NavItem[] = [
  { id: 'runtime', label: 'Runtime', description: 'Execution pipeline & reconciliation', icon: '⚙️' },
  { id: 'action-types', label: 'Actions', description: 'Action type registry', icon: '⚡' },
  { id: 'integrations', label: 'Integrations', description: 'External service adapters', icon: '🔌' },
  { id: 'workspace', label: 'Workspace', description: 'Files & artifacts', icon: '📁' },
  { id: 'policy-templates', label: 'Policy Templates', description: 'Pre-built policy templates', icon: '📋' },
  { id: 'agent-templates', label: 'Agent Templates', description: 'Agent integration templates', icon: '🤖' },
  { id: 'services', label: 'Services', description: 'Infrastructure health', icon: '🔧' },
];

/* ── All items combined (for mobile menu / hash validation) ── */
const ALL_NAV_ITEMS: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

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
            {[
              { heading: null, items: PRIMARY_NAV },
              { heading: 'More', items: SECONDARY_NAV },
            ].map((group, gi) => (
              <div key={gi} style={{ marginBottom: '16px' }}>
                {group.heading && (
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 6px', marginTop: '8px' }}>
                    {group.heading}
                  </div>
                )}
                <div style={{ display: 'grid', gap: '6px' }}>
                  {group.items.map((item) => {
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
                          padding: '14px 16px',
                          fontSize: '15px',
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
            ))}
          </div>
        )}
      </>
    );
  }

  const [moreOpen, setMoreOpen] = useState(false);
  const isSecondaryActive = SECONDARY_NAV.some(i => i.id === currentSection);

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
      position: 'relative',
    }}>
      {PRIMARY_NAV.map((item) => {
        const isActive = currentSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.description}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}

      {/* More dropdown for secondary items */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: isSecondaryActive ? 600 : 400,
            color: isSecondaryActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            borderBottom: isSecondaryActive ? '2px solid var(--text-primary)' : '2px solid transparent',
            borderRadius: 0,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (!isSecondaryActive) {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSecondaryActive) {
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }
          }}
        >
          More ▾
        </button>

        {moreOpen && (
          <>
            {/* Backdrop to close on click-away */}
            <div 
              onClick={() => setMoreOpen(false)} 
              style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
            />
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'var(--bg-primary, #1a1a2e)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px',
              minWidth: '220px',
              zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {SECONDARY_NAV.map((item) => {
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#a78bfa' : 'var(--text-primary)',
                      background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background 100ms',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary, rgba(255,255,255,0.05))'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <div>
                      <div>{item.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
