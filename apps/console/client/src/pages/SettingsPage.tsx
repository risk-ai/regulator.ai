/**
 * Settings Page — Vienna OS
 * 
 * Operator configuration, session management, and system information.
 */

import React from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { useAuthStore } from '../store/authStore.js';

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
