/**
 * Intent Submission Page — Vienna OS
 * 
 * The governed execution interface. Submit agent intents through the
 * full governance pipeline: policy → risk tier → approval → warrant → execute → verify.
 */

import React, { useState } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

interface IntentAction {
  id: string;
  label: string;
  desc: string;
  tier: string;
  tierColor: string;
  params?: { key: string; label: string; placeholder: string; required?: boolean }[];
}

const INTENT_ACTIONS: IntentAction[] = [
  // T0 — Auto-approve
  {
    id: 'check_health',
    label: 'Health Check',
    desc: 'Verify system health through the governance pipeline',
    tier: 'T0',
    tierColor: '#94a3b8',
  },
  {
    id: 'list_objectives',
    label: 'List Objectives',
    desc: 'Query active governance objectives and their states',
    tier: 'T0',
    tierColor: '#94a3b8',
  },
  {
    id: 'check_system_status',
    label: 'System Status',
    desc: 'Full system posture check — runtime, providers, state graph',
    tier: 'T0',
    tierColor: '#94a3b8',
  },
  {
    id: 'list_recent_executions',
    label: 'Recent Executions',
    desc: 'View the execution audit trail with outcomes',
    tier: 'T0',
    tierColor: '#94a3b8',
    params: [
      { key: 'limit', label: 'Limit', placeholder: '10' },
    ],
  },
  {
    id: 'run_diagnostic',
    label: 'Run Diagnostic',
    desc: 'Execute system diagnostics — checks all governance engines',
    tier: 'T0',
    tierColor: '#94a3b8',
  },
  {
    id: 'check_execution_status',
    label: 'Check Execution Status',
    desc: 'Query status of a specific execution by ID',
    tier: 'T0',
    tierColor: '#94a3b8',
    params: [
      { key: 'execution_id', label: 'Execution ID', placeholder: 'exec-xxxxx-xxxx-xxxx', required: true },
    ],
  },
  {
    id: 'query_state_graph',
    label: 'Query State Graph',
    desc: 'Query the canonical state graph for entities',
    tier: 'T0',
    tierColor: '#94a3b8',
    params: [
      { key: 'entity_type', label: 'Entity Type', placeholder: 'execution | objective | proposal' },
    ],
  },
  // T1 — Operator approval
  {
    id: 'restart_service',
    label: 'Restart Service',
    desc: 'Restart a specific service — requires operator approval',
    tier: 'T1',
    tierColor: '#f59e0b',
    params: [
      { key: 'service', label: 'Service Name', placeholder: 'api-gateway', required: true },
    ],
  },
  {
    id: 'trigger_backup',
    label: 'Trigger Backup',
    desc: 'Initiate a state graph backup',
    tier: 'T1',
    tierColor: '#f59e0b',
  },
  {
    id: 'update_configuration',
    label: 'Update Configuration',
    desc: 'Modify a runtime configuration value',
    tier: 'T1',
    tierColor: '#f59e0b',
    params: [
      { key: 'key', label: 'Config Key', placeholder: 'rate_limit.max_requests', required: true },
      { key: 'value', label: 'New Value', placeholder: '100', required: true },
    ],
  },
  {
    id: 'check_service_logs',
    label: 'Check Service Logs',
    desc: 'Retrieve recent logs for a specific service',
    tier: 'T1',
    tierColor: '#f59e0b',
    params: [
      { key: 'service', label: 'Service Name', placeholder: 'intent-gateway', required: true },
    ],
  },
];

export function IntentPage() {
  const [selectedAction, setSelectedAction] = useState('check_health');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState<{ id: string; display_name: string; status: string }[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [simulation, setSimulation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const { isMobile } = useResponsive();

  // Fetch registered agents on mount
  React.useEffect(() => {
    fetch('/api/v1/agents', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const agentList = (data.data || data.agents || []).filter((a: any) => a.status === 'active');
        setAgents(agentList);
        if (agentList.length > 0 && !selectedAgent) {
          setSelectedAgent(agentList[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const action = INTENT_ACTIONS.find(a => a.id === selectedAction)!;

  const handleSubmit = async () => {
    if (!selectedAgent) {
      setResult({ success: false, error: 'Please select an agent' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = {
        agent_id: selectedAgent,
        action: selectedAction,
        source: 'openclaw',
        tenant_id: 'system',
        simulation,
      };

      // Add params to context
      if (action.params && action.params.length > 0) {
        const context: Record<string, string> = {};
        for (const p of action.params) {
          if (params[p.key]) {
            context[p.key] = params[p.key];
            // Also add at top level for backend compatibility
            body[p.key] = params[p.key];
          }
        }
        body.context = context;
      }

      const res = await fetch('/api/v1/agent/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      });
    }

    setLoading(false);
  };

  const isSuccess = result && (result as Record<string, unknown>).success === true;

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Intent Submission
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Submit agent intents through the governed execution pipeline. Every action flows through policy → risk tier → warrant → execute → verify.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
        {/* Left: Intent Selector + Params */}
        <div>
          {/* Agent Selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Acting Agent
            </div>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {agents.length === 0 && <option value="">Loading agents...</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name} ({a.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>

          {/* Action Grid */}
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Select Action
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
            {INTENT_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => { setSelectedAction(a.id); setParams({}); setResult(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: selectedAction === a.id ? '1px solid rgba(212, 165, 32, 0.3)' : '1px solid var(--border-subtle)',
                  background: selectedAction === a.id ? 'rgba(212, 165, 32, 0.06)' : 'var(--bg-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                }}
              >
                <div style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: a.tierColor,
                  background: `${a.tierColor}12`,
                  border: `1px solid ${a.tierColor}20`,
                  flexShrink: 0,
                }}>
                  {a.tier}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: selectedAction === a.id ? '#D4A520' : 'var(--text-primary)' }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                    {a.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Parameters */}
          {action.params && action.params.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {action.params.map((p) => (
                  <div key={p.key}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                      {p.label} {p.required && <span style={{ color: '#D4A520' }}>*</span>}
                    </label>
                    <input
                      value={params[p.key] || ''}
                      onChange={(e) => setParams({ ...params, [p.key]: e.target.value })}
                      placeholder={p.placeholder}
                      style={{
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulation toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="sim"
              checked={simulation}
              onChange={(e) => setSimulation(e.target.checked)}
              style={{ accentColor: '#D4A520' }}
            />
            <label htmlFor="sim" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Simulation mode (dry run — no side effects)
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? 'var(--bg-tertiary)' : '#B8860B',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            {loading ? 'Executing...' : `Submit ${action.tier} Intent: ${action.label}`}
          </button>
        </div>

        {/* Right: Result */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Governance Response
          </div>

          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '500px',
          }}>
            {result ? (
              <div>
                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isSuccess ? '#10b981' : '#ef4444',
                    background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  }}>
                    {isSuccess ? '✓ Executed' : '✗ Failed'}
                  </div>
                  {result.status && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {String(result.status)}
                    </span>
                  )}
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {String(result.explanation)}
                  </div>
                )}

                {/* Full JSON */}
                <div style={{
                  background: 'var(--bg-app)',
                  borderRadius: '8px',
                  padding: '12px',
                  overflow: 'auto',
                  maxHeight: '360px',
                }}>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Select an intent and execute
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', maxWidth: '300px', lineHeight: 1.6 }}>
                  Every submission flows through the full governance pipeline: policy check → risk tier → warrant → execution → verification → audit trail.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
