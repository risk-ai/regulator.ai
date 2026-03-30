/**
 * Workspace Selector — Vienna OS
 * 
 * Dropdown for switching between tenants/workspaces.
 * Shows current workspace and allows switching.
 */

import React, { useState, useEffect, useRef } from 'react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  agent_count: number;
}

interface WorkspaceSelectorProps {
  currentWorkspaceId?: string;
  onSwitch?: (workspaceId: string) => void;
}

export function WorkspaceSelector({ currentWorkspaceId, onSwitch }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Workspace | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/v1/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const ws = (data.data || []).map((t: any) => ({
          id: t.id,
          name: t.name || t.slug || 'Default',
          slug: t.slug || t.id?.substring(0, 8),
          plan: t.plan || 'community',
          agent_count: t.agent_count || 0,
        }));
        setWorkspaces(ws);
        setCurrent(ws.find((w: Workspace) => w.id === currentWorkspaceId) || ws[0] || null);
      })
      .catch(() => {
        setCurrent({ id: 'default', name: 'Default Workspace', slug: 'default', plan: 'community', agent_count: 8 });
      });
  }, [currentWorkspaceId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!current) return null;

  const planColors: Record<string, string> = {
    community: '#94a3b8',
    team: '#a78bfa',
    business: '#D4A520',
    enterprise: '#4ade80',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 12px', borderRadius: '8px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
          cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12px',
          color: 'var(--text-primary)', minWidth: '160px',
        }}
      >
        <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: `${planColors[current.plan] || '#94a3b8'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: planColors[current.plan] }}>
          {current.name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontWeight: 600, fontSize: '12px' }}>{current.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{current.plan}</div>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>▼</span>
      </button>

      {open && workspaces.length > 1 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: 'var(--bg-primary)', border: '1px solid var(--border-default)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 100,
          overflow: 'hidden',
        }}>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => { setCurrent(ws); setOpen(false); onSwitch?.(ws.id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: ws.id === current.id ? 'var(--bg-secondary)' : 'transparent',
                fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-primary)',
                textAlign: 'left',
              }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: `${planColors[ws.plan] || '#94a3b8'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: planColors[ws.plan] }}>
                {ws.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{ws.name}</div>
              </div>
              {ws.id === current.id && <span style={{ fontSize: '12px', color: '#4ade80' }}>✓</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 12px' }}>
            <button style={{ fontSize: '11px', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
              + Create Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
