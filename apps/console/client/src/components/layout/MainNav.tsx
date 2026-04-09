/**
 * Main Navigation — Vienna OS
 * 
 * A+ Revision: Consolidated 19 items → 5 groups with flyout sub-navigation.
 * Uses React Router for navigation instead of hash-based routing.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive.js';

/* ── Navigation structure: 5 groups ── */

interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
  /** If set, clicking the group label navigates here directly */
  defaultPath?: string;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '⚡',
    defaultPath: '/',
    items: [
      { path: '/', label: 'Overview', description: 'System posture & action center', icon: '⚡' },
      { path: '/activity', label: 'Activity Feed', description: 'Real-time event stream', icon: '📊' },
      { path: '/analytics', label: 'Analytics', description: 'Metrics, leaderboard & costs', icon: '📈' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: '🛡️',
    defaultPath: '/approvals',
    items: [
      { path: '/intent', label: 'Submit Intent', description: 'Request governed action', icon: '🎯' },
      { path: '/approvals', label: 'Approvals', description: 'Pending T1/T2 actions', icon: '✅' },
      { path: '/execution', label: 'Execution', description: 'Live execution pipeline', icon: '▶️' },
      { path: '/executions', label: 'Execution Log', description: 'Past execution records', icon: '📋' },
      { path: '/governance-chain', label: 'Governance Chain', description: 'Warrant chain visualization', icon: '⛓️' },
      { path: '/governance-live', label: 'Live Governance', description: 'Real-time governance flow', icon: '🎬' },
      { path: '/policies', label: 'Policy Builder', description: 'Create governance rules', icon: '🛡️' },
      { path: '/policy-templates', label: 'Policy Templates', description: 'Pre-built policies', icon: '📋' },
      { path: '/compliance', label: 'Compliance', description: 'Governance reports', icon: '📑' },
      { path: '/history', label: 'Audit Trail', description: 'Execution ledger', icon: '🔍' },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet',
    icon: '🤖',
    defaultPath: '/fleet',
    items: [
      { path: '/fleet', label: 'Agent Dashboard', description: 'Fleet overview & status', icon: '🤖' },
      { path: '/connect', label: 'Connect Agent', description: 'Register a new agent', icon: '🔗' },
      { path: '/agent-templates', label: 'Agent Templates', description: 'Integration templates', icon: '📦' },
      { path: '/action-types', label: 'Action Registry', description: 'Action type definitions', icon: '⚡' },
    ],
  },
  {
    id: 'infra',
    label: 'Infrastructure',
    icon: '🔧',
    defaultPath: '/api-keys',
    items: [
      { path: '/api-keys', label: 'API Keys', description: 'Programmatic access', icon: '🔑' },
      { path: '/integrations', label: 'Integrations', description: 'External services', icon: '🔌' },
      { path: '/runtime', label: 'Runtime', description: 'Pipeline & reconciliation', icon: '⚙️' },
      { path: '/workspace', label: 'Workspace', description: 'Files & artifacts', icon: '📁' },
      { path: '/services', label: 'Services', description: 'Infrastructure health', icon: '🔧' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    defaultPath: '/settings',
    items: [
      { path: '/settings', label: 'Organization', description: 'Team, security & billing', icon: '⚙️' },
    ],
  },
];

/** All navigable paths for matching */
const ALL_PATHS = NAV_GROUPS.flatMap(g => g.items.map(i => i.path));

function pathMatchesGroup(pathname: string, group: NavGroup): boolean {
  if (group.id === 'dashboard' && (pathname === '/' || pathname === '/now')) return true;
  return group.items.some(item => pathname === item.path);
}

export function MainNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <nav className="flex items-center justify-between h-14 px-4"
          style={{
            background: 'var(--bg-app)',
            borderBottom: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-sans)',
          }}>
          <span className="text-sm font-bold" style={{ 
            color: '#fbbf24',
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.05em',
          }}>
            VIENNA_OS
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile bottom nav */}
        {!mobileMenuOpen && (
          <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center z-50"
            style={{
              background: 'var(--bg-primary)',
              borderTop: '1px solid var(--border-subtle)',
              padding: '6px 0 env(safe-area-inset-bottom, 6px)',
            }}>
            {[
              { path: '/', icon: '⚡', label: 'Home' },
              { path: '/fleet', icon: '🤖', label: 'Fleet' },
              { path: '/approvals', icon: '✅', label: 'Approve' },
              { path: '/executions', icon: '▶️', label: 'Exec' },
              { path: '/analytics', icon: '📊', label: 'Stats' },
            ].map(item => {
              const isActive = location.pathname === item.path || 
                (item.path === '/' && location.pathname === '/now');
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] px-3 py-1"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
                  }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto"
            style={{ top: '56px', background: 'var(--bg-primary)', padding: '16px' }}>
            {NAV_GROUPS.map(group => (
              <div key={group.id} className="mb-4">
                <div className="text-xs font-semibold uppercase mb-2 px-1"
                  style={{ color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
                  {group.icon} {group.label}
                </div>
                <div className="grid gap-1.5">
                  {group.items.length > 0 ? group.items.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                        className="flex items-center gap-3 w-full text-left rounded-none px-4 py-3.5 transition-colors"
                        style={{
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--accent-secondary)' : 'var(--text-primary)',
                          background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                          border: isActive ? '1px solid rgba(251, 191, 36, 0.2)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <div>{item.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.description}</div>
                        </div>
                      </button>
                    );
                  }) : (
                    <button
                      onClick={() => { navigate(group.defaultPath || '/'); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full text-left rounded-none px-4 py-3.5 transition-colors"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <span className="text-lg">{group.icon}</span>
                      <div>{group.label}</div>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Desktop navigation
  return (
    <nav className="flex items-end h-11 px-6 relative"
      style={{
        background: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-sans)',
        gap: '2px',
      }}>
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center mr-4 pb-2"
        style={{ 
          background: 'none', border: 'none', cursor: 'pointer', 
          color: '#fbbf24', fontWeight: 700, fontSize: '13px',
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.05em',
        }}
      >
        VIENNA_OS
      </button>

      {NAV_GROUPS.map(group => (
        <NavGroupButton key={group.id} group={group} />
      ))}
    </nav>
  );
}

/** Desktop nav group with flyout */
function NavGroupButton({ group }: { group: NavGroup }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isActive = pathMatchesGroup(location.pathname, group);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    if (group.items.length > 0) setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  const handleClick = () => {
    if (group.items.length === 0 && group.defaultPath) {
      navigate(group.defaultPath);
    } else if (group.defaultPath) {
      navigate(group.defaultPath);
      setOpen(false);
    }
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 whitespace-nowrap transition-colors"
        style={{
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
          background: 'transparent',
          border: 'none',
          borderBottom: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
          borderRadius: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '13px' }}>{group.icon}</span>
        {group.label}
        {group.items.length > 0 && (
          <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '2px' }}>▾</span>
        )}
      </button>

      {/* Flyout submenu */}
      {open && group.items.length > 0 && (
        <div
          className="absolute left-0 mt-0 z-50"
          style={{
            top: '100%',
            paddingTop: '4px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '0',
              padding: '6px',
              minWidth: '260px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {group.items.map(item => {
              const isItemActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className="flex items-center gap-2.5 w-full text-left rounded-none transition-colors"
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    fontWeight: isItemActive ? 600 : 400,
                    color: isItemActive ? 'var(--accent-secondary)' : 'var(--text-primary)',
                    background: isItemActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isItemActive) e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isItemActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                  <div>
                    <div>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
