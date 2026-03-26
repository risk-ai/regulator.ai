/**
 * Approvals Page — Vienna OS
 * 
 * The approval queue is where governance becomes tangible.
 * T1/T2 actions wait here for operator authorization.
 */

import React, { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { PendingApprovalsList } from '../components/approvals/PendingApprovalsList';
import { useResponsive } from '../hooks/useResponsive.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';

export function ApprovalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const { isMobile } = useResponsive();

  const handleApprovalChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <PageLayout
      title="Approvals"
      description="Review and authorize pending T1/T2 agent actions"
    >
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0',
      }}>
        {(['pending', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#a78bfa' : 'var(--text-tertiary)',
              background: activeTab === tab ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 150ms',
            }}
          >
            {tab === 'pending' ? '⏳ Pending' : '📜 History'}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
        <ErrorBoundary>
          <PendingApprovalsList
            key={refreshKey}
            onApprovalChange={handleApprovalChange}
          />
        </ErrorBoundary>
      )}

      {activeTab === 'history' && (
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📜</div>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Approval history will appear here as actions are approved or rejected.
          </p>
        </div>
      )}

      {/* Risk tier reference */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '12px',
        marginTop: '24px',
      }}>
        <TierCard
          tier="T0"
          label="Auto-Approve"
          desc="Read-only, status checks, internal queries"
          color="#94a3b8"
        />
        <TierCard
          tier="T1"
          label="Single Approval"
          desc="Config changes, service restarts, data writes"
          color="#fbbf24"
        />
        <TierCard
          tier="T2"
          label="Multi-Party"
          desc="Deployments, payments, data deletion"
          color="#f87171"
        />
      </div>
    </PageLayout>
  );
}

function TierCard({ tier, label, desc, color }: {
  tier: string;
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}20`,
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: 700,
          color: color,
          fontFamily: 'var(--font-mono)',
        }}>
          {tier}
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          {label}
        </span>
      </div>
      <p style={{
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        lineHeight: 1.5,
      }}>
        {desc}
      </p>
    </div>
  );
}
