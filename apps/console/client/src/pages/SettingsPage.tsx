/**
 * Settings Page — Vienna OS
 * 
 * Operator configuration, session management, simulation control, and system information.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { useAuthStore } from '../store/authStore.js';
import { apiClient } from '../api/client.js';

// ============================================================================
// Simulation Types & API
// ============================================================================

interface SimulationStatus {
  running: boolean;
  startedAt: string | null;
  actionsGenerated: number;
  alertsGenerated: number;
  tickCount: number;
  lastTickAt: string | null;
}

async function fetchSimulationStatus(): Promise<SimulationStatus> {
  return apiClient.get<SimulationStatus>('/simulation/status');
}

async function startSimulation(): Promise<void> {
  await apiClient.post('/simulation/start', {});
}

async function stopSimulation(): Promise<void> {
  await apiClient.post('/simulation/stop', {});
}

async function seedSimulation(): Promise<{ actions: number; alerts: number }> {
  return apiClient.post<{ actions: number; alerts: number; message: string }>('/simulation/seed', {});
}

async function resetSimulation(): Promise<void> {
  await apiClient.post('/simulation/reset', {});
}

// ============================================================================
// Settings Page
// ============================================================================

export function SettingsPage() {
  const { operator, logout } = useAuthStore();

  return (
    <PageLayout
      title="Settings"
      description="Operator configuration and system information"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Session */}
        <SettingsCard title="Session">
          <SettingsRow label="Operator" value={operator || 'vienna'} />
          <SettingsRow label="Status" value="Active" valueColor="#4ade80" />
          <SettingsRow label="Environment" value="Production" />
          <SettingsRow label="Tenant" value="system" />
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => { if (confirm('Logout?')) logout(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                background: 'rgba(248, 113, 113, 0.08)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Logout
            </button>
          </div>
        </SettingsCard>

        {/* Simulation Engine */}
        <SimulationCard />

        {/* System Info */}
        <SettingsCard title="System">
          <SettingsRow label="Vienna OS" value="v0.9.0" mono />
          <SettingsRow label="Runtime" value="Node 22 · Express" />
          <SettingsRow label="State Graph" value="SQLite · 15 tables" />
          <SettingsRow label="Region" value="US East (iad)" />
          <SettingsRow label="Host" value="Fly.io · 2 vCPU / 2 GB" />
        </SettingsCard>

        {/* Governance Config */}
        <SettingsCard title="Governance Configuration">
          <SettingsRow label="Risk Tiers" value="T0, T1, T2" />
          <SettingsRow label="T0 Policy" value="Auto-approve" valueColor="#4ade80" />
          <SettingsRow label="T1 Policy" value="Single operator approval" valueColor="#fbbf24" />
          <SettingsRow label="T2 Policy" value="Multi-party approval" valueColor="#f87171" />
          <SettingsRow label="Warrant TTL (T1)" value="900s" mono />
          <SettingsRow label="Warrant TTL (T2)" value="300s" mono />
          <SettingsRow label="Audit Retention" value="7 years" />
        </SettingsCard>

        {/* API Configuration */}
        <SettingsCard title="API & Integrations">
          <SettingsRow label="Intent Gateway" value="Enabled" valueColor="#4ade80" />
          <SettingsRow label="Agent Auth" value="Source-based" />
          <SettingsRow label="Rate Limit" value="60 req/min per IP" />
          <SettingsRow label="CORS Origins" value="regulator.ai, localhost" />
          <SettingsRow label="SSE Streaming" value="Enabled" valueColor="#4ade80" />
        </SettingsCard>

        {/* Links */}
        <SettingsCard title="Resources">
          <SettingsLink label="📖 Documentation" href="https://regulator.ai/docs" />
          <SettingsLink label="🔐 Security" href="https://regulator.ai/security" />
          <SettingsLink label="📋 Changelog" href="https://regulator.ai/changelog" />
          <SettingsLink label="💻 GitHub" href="https://github.com/risk-ai/regulator.ai" />
          <SettingsLink label="📧 Support" href="mailto:admin@ai.ventures" />
        </SettingsCard>

        {/* About */}
        <SettingsCard title="About">
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
            <p><strong style={{ color: 'var(--text-secondary)' }}>Vienna OS</strong> is the governance control plane for autonomous AI agents.</p>
            <p style={{ marginTop: '8px' }}>Built by <strong style={{ color: 'var(--text-secondary)' }}>Max Anderson</strong> (Cornell Law) at <strong style={{ color: 'var(--text-secondary)' }}>ai.ventures</strong>.</p>
            <p style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              © 2026 Technetwork 2 LLC dba ai.ventures
            </p>
          </div>
        </SettingsCard>
      </div>
    </PageLayout>
  );
}

// ============================================================================
// Simulation Card
// ============================================================================

function SimulationCard() {
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchSimulationStatus();
      setStatus(s);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [refresh]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (status?.running) {
        await stopSimulation();
        setActionLabel('Stopped');
      } else {
        await startSimulation();
        setActionLabel('Started');
      }
      await refresh();
    } catch (err) {
      setActionLabel('Error');
    }
    setLoading(false);
    setTimeout(() => setActionLabel(null), 2000);
  };

  const handleSeed = async () => {
    setLoading(true);
    setActionLabel('Seeding...');
    try {
      const result = await seedSimulation();
      setActionLabel(`Seeded ${result.actions} actions`);
      await refresh();
    } catch {
      setActionLabel('Seed failed');
    }
    setLoading(false);
    setTimeout(() => setActionLabel(null), 3000);
  };

  const handleReset = async () => {
    if (!confirm('Reset all simulation data? This will clear generated activity, alerts, and evaluations.')) return;
    setLoading(true);
    setActionLabel('Resetting...');
    try {
      await resetSimulation();
      setActionLabel('Data cleared');
      await refresh();
    } catch {
      setActionLabel('Reset failed');
    }
    setLoading(false);
    setTimeout(() => setActionLabel(null), 3000);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDuration = (iso: string | null) => {
    if (!iso) return '—';
    const start = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const running = status?.running ?? false;

  return (
    <SettingsCard title="Simulation Engine">
      {/* Status indicator + toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: running ? '#4ade80' : '#6b7280',
            boxShadow: running ? '0 0 6px rgba(74, 222, 128, 0.5)' : 'none',
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Status</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: `1px solid ${running ? 'rgba(248, 113, 113, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`,
            background: running ? 'rgba(248, 113, 113, 0.08)' : 'rgba(74, 222, 128, 0.08)',
            color: running ? '#f87171' : '#4ade80',
            fontSize: '11px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Stats */}
      <SettingsRow
        label="Actions Generated"
        value={status?.actionsGenerated?.toLocaleString() ?? '—'}
        mono
      />
      <SettingsRow
        label="Alerts Generated"
        value={status?.alertsGenerated?.toLocaleString() ?? '—'}
        mono
      />
      <SettingsRow
        label="Ticks"
        value={status?.tickCount?.toLocaleString() ?? '—'}
        mono
      />
      <SettingsRow
        label="Running Since"
        value={running ? formatDuration(status?.startedAt ?? null) : 'Stopped'}
        valueColor={running ? '#4ade80' : '#6b7280'}
      />
      <SettingsRow
        label="Last Tick"
        value={formatTime(status?.lastTickAt ?? null)}
        mono
      />

      {/* Action buttons */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={handleSeed}
          disabled={loading}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            background: 'rgba(99, 102, 241, 0.08)',
            color: '#818cf8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Seed 24h Data
        </button>
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            background: 'rgba(248, 113, 113, 0.08)',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Reset Data
        </button>
      </div>

      {/* Action feedback */}
      {actionLabel && (
        <div style={{
          marginTop: '8px',
          padding: '6px 10px',
          borderRadius: '4px',
          background: 'rgba(99, 102, 241, 0.06)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          fontSize: '11px',
          color: '#a5b4fc',
          textAlign: 'center',
        }}>
          {actionLabel}
        </div>
      )}
    </SettingsCard>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <h3 style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '14px',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingsRow({ label, value, valueColor, mono }: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{
        fontSize: '12px',
        fontWeight: 600,
        color: valueColor || 'var(--text-secondary)',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  );
}

function SettingsLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        marginBottom: '4px',
        transition: 'all 150ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212, 165, 32, 0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      {label}
    </a>
  );
}
