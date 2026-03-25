/**
 * History Page — Vienna OS
 * 
 * Execution ledger & audit trail. Shows the value of governed execution
 * through a beautiful timeline of every action, warrant, and verification.
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';

interface AuditEntry {
  id: string;
  type: 'intent' | 'warrant' | 'execution' | 'verification' | 'policy' | 'anomaly';
  action: string;
  status: 'success' | 'failed' | 'pending' | 'rejected';
  timestamp: string;
  tenant_id?: string;
  execution_id?: string;
  details?: string;
}

const typeConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  intent: { icon: '🎯', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.08)', label: 'Intent' },
  warrant: { icon: '🔐', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', label: 'Warrant' },
  execution: { icon: '⚡', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)', label: 'Execution' },
  verification: { icon: '🔍', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)', label: 'Verification' },
  policy: { icon: '📋', color: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', label: 'Policy' },
  anomaly: { icon: '⚠️', color: '#f87171', bg: 'rgba(248, 113, 113, 0.08)', label: 'Anomaly' },
};

const statusColors: Record<string, { color: string; bg: string }> = {
  success: { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
  failed: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
  pending: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
  rejected: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
};

export function HistoryPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [filterType, setFilterType] = useState('all');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [timeRange, filterType]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/audit/recent?limit=50', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.data?.entries || []);
      }
    } catch {
      // API may not be available yet
    }
    setLoading(false);
  };

  return (
    <PageLayout
      title="History"
      description="Execution ledger — every action, warrant, and verification"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <FilterSelect
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: '1h', label: 'Last hour' },
              { value: '6h', label: 'Last 6 hours' },
              { value: '24h', label: 'Last 24 hours' },
              { value: '7d', label: 'Last 7 days' },
            ]}
          />
          <FilterSelect
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'intent', label: 'Intents' },
              { value: 'execution', label: 'Executions' },
              { value: 'warrant', label: 'Warrants' },
              { value: 'verification', label: 'Verifications' },
              { value: 'policy', label: 'Policy decisions' },
            ]}
          />
        </div>
      }
    >
      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        /* Premium empty state */
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}>
            {loading ? 'Loading audit trail…' : 'Audit trail is empty'}
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-tertiary)',
            maxWidth: '400px',
            margin: '0 auto 24px',
            lineHeight: 1.6,
          }}>
            Every governance action will appear here — intents, warrants,
            executions, verifications, and policy decisions.
          </p>
          
          {/* Pipeline visualization */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            {['🎯 Intent', '📋 Policy', '🔐 Warrant', '⚡ Execute', '🔍 Verify', '📋 Audit'].map((step, i) => (
              <React.Fragment key={step}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}>
                  {step}
                </div>
                {i < 5 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            Submit an intent from the Intent page to see your first audit entry.
          </p>
        </div>
      )}
    </PageLayout>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const config = typeConfig[entry.type] || typeConfig.intent;
  const status = statusColors[entry.status] || statusColors.success;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'var(--bg-primary)',
      borderRadius: '8px',
      border: '1px solid var(--border-subtle)',
      transition: 'all 150ms',
      cursor: 'pointer',
    }}>
      {/* Type icon */}
      <span style={{ fontSize: '16px' }}>{config.icon}</span>
      
      {/* Type badge */}
      <div style={{
        padding: '2px 8px',
        borderRadius: '100px',
        background: config.bg,
        fontSize: '11px',
        fontWeight: 600,
        color: config.color,
        minWidth: '80px',
        textAlign: 'center',
      }}>
        {config.label}
      </div>
      
      {/* Action */}
      <div style={{
        flex: 1,
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
      }}>
        {entry.action}
      </div>
      
      {/* Status */}
      <div style={{
        padding: '2px 8px',
        borderRadius: '100px',
        background: status.bg,
        fontSize: '11px',
        fontWeight: 600,
        color: status.color,
      }}>
        {entry.status}
      </div>
      
      {/* Execution ID */}
      {entry.execution_id && (
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {entry.execution_id.slice(0, 12)}…
        </div>
      )}
      
      {/* Timestamp */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)',
        minWidth: '80px',
        textAlign: 'right',
      }}>
        {new Date(entry.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
