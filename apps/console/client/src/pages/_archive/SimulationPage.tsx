/**
 * Simulation/Sandbox Page — Vienna OS
 * 
 * Test proposals against policies without real execution.
 * Safe environment to validate governance rules before deploying.
 * 
 * Features:
 * - Test intent submission
 * - Policy evaluation preview
 * - Risk tier calculation
 * - Approval requirements simulation
 * - No real execution (dry-run mode)
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { addToast } from '../store/toastStore.js';
import { Play, AlertCircle, CheckCircle, XCircle, FileText, Zap } from 'lucide-react';

interface SimulationRequest {
  agent_id: string;
  action_type: string;
  payload: Record<string, unknown>;
}

interface SimulationResult {
  success: boolean;
  intent_id?: string;
  policy_evaluations: Array<{
    policy_id: string;
    policy_name: string;
    result: 'allow' | 'deny' | 'require_approval';
    conditions_matched: string[];
    risk_tier: string;
  }>;
  final_decision: 'auto_approve' | 'requires_approval' | 'denied';
  risk_tier: string;
  approval_requirements?: {
    required_tier: string;
    approvers_needed: number;
    suggested_approvers: string[];
  };
  estimated_duration?: string;
  warnings: string[];
}

const SAMPLE_AGENTS = [
  { id: 'agent-001', name: 'Marketing Bot', type: 'autonomous' },
  { id: 'agent-002', name: 'Finance Agent', type: 'semi-autonomous' },
  { id: 'agent-003', name: 'Data Processor', type: 'supervised' },
];

const SAMPLE_ACTIONS = [
  'send_email',
  'update_database',
  'deploy_code',
  'charge_card',
  'access_pii',
  'delete_resource',
  'modify_permissions',
];

export function SimulationPage() {
  const [agentId, setAgentId] = useState('');
  const [actionType, setActionType] = useState('');
  const [payload, setPayload] = useState('{\n  "example": "data"\n}');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    if (!agentId || !actionType) {
      addToast('Please select agent and action type', 'warning');
      return;
    }

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (err) {
      addToast('Invalid JSON payload', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentId,
          action_type: actionType,
          payload: parsedPayload,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        addToast('Simulation complete', 'success');
      } else {
        setError(data.error || 'Simulation failed');
        addToast(data.error || 'Simulation failed', 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Simulation & Sandbox" description="Test proposals against policies without real execution">
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Input Panel */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} className="text-amber-500" />
            Simulation Input
          </h2>

          {/* Agent Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Agent
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              <option value="">Select an agent...</option>
              {SAMPLE_AGENTS.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.type})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              <option value="">Select action type...</option>
              {SAMPLE_ACTIONS.map(action => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Payload */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              style={{
                width: '100%',
                height: '200px',
                padding: '12px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Run Button */}
          <button
            onClick={handleRunSimulation}
            disabled={loading || !agentId || !actionType}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Play size={16} />
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {/* Right: Results Panel */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-blue-500" />
            Simulation Results
          </h2>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-tertiary)' }}>
              <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>Configure and run a simulation to see results</p>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Final Decision */}
              <div style={{
                padding: '16px',
                background: result.final_decision === 'auto_approve' ? 'rgba(16, 185, 129, 0.1)' : 
                           result.final_decision === 'denied' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: result.final_decision === 'auto_approve' ? '1px solid rgba(16, 185, 129, 0.3)' :
                       result.final_decision === 'denied' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {result.final_decision === 'auto_approve' && <CheckCircle size={20} className="text-green-500" />}
                  {result.final_decision === 'denied' && <XCircle size={20} className="text-red-500" />}
                  {result.final_decision === 'requires_approval' && <AlertCircle size={20} className="text-amber-500" />}
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Final Decision: {result.final_decision.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Risk Tier: <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{result.risk_tier}</span>
                </div>
              </div>

              {/* Policy Evaluations */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Policy Evaluations ({result.policy_evaluations.length})
                </h3>
                {result.policy_evaluations.map((evaluation, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {evaluation.policy_name}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: evaluation.result === 'allow' ? 'rgba(16, 185, 129, 0.2)' :
                                   evaluation.result === 'deny' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: evaluation.result === 'allow' ? '#6ee7b7' :
                              evaluation.result === 'deny' ? '#fca5a5' : '#fcd34d',
                      }}>
                        {evaluation.result.toUpperCase()}
                      </span>
                    </div>
                    {evaluation.conditions_matched.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                        Matched: {evaluation.conditions_matched.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Approval Requirements */}
              {result.approval_requirements && (
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Approval Requirements
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    <div>Required Tier: <strong>{result.approval_requirements.required_tier}</strong></div>
                    <div>Approvers Needed: <strong>{result.approval_requirements.approvers_needed}</strong></div>
                    {result.approval_requirements.suggested_approvers.length > 0 && (
                      <div>Suggested: {result.approval_requirements.suggested_approvers.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fcd34d', marginBottom: '8px' }}>
                    Warnings
                  </h3>
                  <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default SimulationPage;
