/**
 * Approvals Page — Vienna OS
 * 
 * The approval queue is where governance becomes tangible.
 * T1/T2 actions wait here for operator authorization.
 */

import React, { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { PendingApprovalsList } from '../components/approvals/PendingApprovalsList';
import { ApprovalHistory } from '../components/approvals/ApprovalHistory';
import { useResponsive } from '../hooks/useResponsive.js';
import { ErrorBoundary } from '../components/ui/ErrorBoundary.js';

export function ApprovalsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [focusedApprovalId, setFocusedApprovalId] = useState<string | null>(null);
  const [showExpandedDetails, setShowExpandedDetails] = useState(false);
  const { isMobile } = useResponsive();
  const pendingApprovalsRef = useRef<any>(null);

  const handleApprovalChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when on pending tab and not in input fields
      if (activeTab !== 'pending' || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (focusedApprovalId) {
            setShowExpandedDetails(prev => !prev);
          }
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          if (focusedApprovalId && pendingApprovalsRef.current) {
            pendingApprovalsRef.current.approveApproval(focusedApprovalId);
          }
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (focusedApprovalId && pendingApprovalsRef.current) {
            pendingApprovalsRef.current.denyApproval(focusedApprovalId);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowExpandedDetails(false);
          setFocusedApprovalId(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, focusedApprovalId]);

  const handleApprovalFocus = (approvalId: string | null) => {
    setFocusedApprovalId(approvalId);
    if (approvalId) {
      setShowExpandedDetails(false);
    }
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
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
              borderRadius: 0,
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
            ref={pendingApprovalsRef}
            key={refreshKey}
            onApprovalChange={handleApprovalChange}
            focusedApprovalId={focusedApprovalId}
            onApprovalFocus={handleApprovalFocus}
            showExpandedDetails={showExpandedDetails}
          />
        </ErrorBoundary>
      )}

      {activeTab === 'history' && (
        <ErrorBoundary>
          <ApprovalHistory limit={100} />
        </ErrorBoundary>
      )}

      {/* Keyboard shortcut hint bar */}
      {activeTab === 'pending' && (
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '8px 16px',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          zIndex: 1000,
          fontFamily: 'var(--font-mono)'
        }}>
          ⌨️ Space: expand · A: approve · D: deny · Esc: close
        </div>
      )}

      {/* Risk tier reference */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '12px',
        marginTop: '24px',
        marginBottom: activeTab === 'pending' ? '40px' : '0'
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
          color="#f59e0b"
        />
        <TierCard
          tier="T2"
          label="Multi-Party"
          desc="Deployments, payments, data deletion"
          color="#ef4444"
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
      background: 'var(--bg-primary)',
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
