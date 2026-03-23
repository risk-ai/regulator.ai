/**
 * Execution Result Message Component
 * Phase 10.5: Chat Cleanup
 * Phase 21-30: Enhanced with tenant/quota/attestation/cost/explanation
 * 
 * Structured display of execution results after approvals
 */

import React from 'react';
import { Shield, DollarSign, FlaskConical, AlertCircle } from 'lucide-react';

export interface ExecutionResult {
  success: boolean;
  status: 'success' | 'failure' | 'blocked';
  message: string;
  execution_id?: string;
  details?: any;
  // Phase 21-30 fields
  tenant_id?: string;
  simulation?: boolean;
  explanation?: string;
  attestation?: {
    status: string;
    attestation_id: string;
    timestamp: string;
  };
  cost?: {
    amount: number;
    currency: string;
    breakdown?: any;
    blocked?: boolean;
  };
  quota_state?: {
    used: number;
    limit: number;
    available: number;
    utilization: number;
    blocked?: boolean;
  };
}

interface ExecutionResultMessageProps {
  result: ExecutionResult;
}

export const ExecutionResultMessage: React.FC<ExecutionResultMessageProps> = ({ result }) => {
  const isBlocked = result.status === 'blocked' || result.quota_state?.blocked || result.cost?.blocked;
  const isSimulation = result.simulation;

  return (
    <div className={`execution-result-message result-${result.status}`}>
      <div className="result-message-header">
        <span className="result-message-icon">
          {isBlocked ? '🚫' : isSimulation ? '🔵' : result.status === 'success' ? '✅' : '❌'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {isBlocked
            ? 'Execution Blocked'
            : isSimulation
            ? 'Simulation Result'
            : result.status === 'success'
            ? 'Execution Successful'
            : 'Execution Failed'}
        </span>
        {isSimulation && (
          <span className="simulation-badge" style={{
            marginLeft: '0.5rem',
            padding: '0.125rem 0.5rem',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: 'rgb(147, 197, 253)',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            <FlaskConical size={12} style={{ display: 'inline-block', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            DRY RUN
          </span>
        )}
      </div>
      
      <div className="result-message-content">
        {result.message}
      </div>

      {/* Phase 27: Explanation */}
      {result.explanation && (
        <div className="result-explanation" style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '0.25rem',
          fontSize: '0.8125rem',
          color: 'rgb(209, 213, 219)'
        }}>
          <strong>Explanation:</strong> {result.explanation}
        </div>
      )}

      {/* Phase 23: Attestation */}
      {result.attestation && (
        <div className="result-attestation" style={{
          marginTop: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          color: 'rgb(156, 163, 175)'
        }}>
          <Shield size={12} style={{ color: 'rgb(34, 197, 94)' }} />
          <span>Attested: {result.attestation.attestation_id.substring(0, 12)}...</span>
        </div>
      )}

      {/* Phase 29: Cost */}
      {result.cost && !isSimulation && (
        <div className="result-cost" style={{
          marginTop: '0.375rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          color: 'rgb(156, 163, 175)'
        }}>
          <DollarSign size={12} />
          <span>Cost: {result.cost.currency} {result.cost.amount.toFixed(4)}</span>
        </div>
      )}

      {/* Phase 22: Quota Warning */}
      {result.quota_state && result.quota_state.utilization >= 0.8 && (
        <div className="result-quota-warning" style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: result.quota_state.blocked
            ? 'rgba(220, 38, 38, 0.1)'
            : 'rgba(250, 204, 21, 0.1)',
          border: `1px solid ${result.quota_state.blocked ? 'rgba(220, 38, 38, 0.3)' : 'rgba(250, 204, 21, 0.3)'}`,
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          <AlertCircle size={14} style={{ color: result.quota_state.blocked ? 'rgb(239, 68, 68)' : 'rgb(250, 204, 21)' }} />
          <span>
            {result.quota_state.blocked
              ? `Quota exceeded: ${result.quota_state.used}/${result.quota_state.limit} units (${Math.round(result.quota_state.utilization * 100)}%)`
              : `Quota warning: ${result.quota_state.used}/${result.quota_state.limit} units (${Math.round(result.quota_state.utilization * 100)}%)`}
          </span>
        </div>
      )}
      
      {result.execution_id && (
        <div className="result-message-meta" style={{ marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgb(107, 114, 128)' }}>execution_id: </span>
          <a
            href={`#/executions/${result.execution_id}`}
            className="result-message-link"
            style={{ fontSize: '0.75rem', color: 'rgb(96, 165, 250)' }}
          >
            {result.execution_id}
          </a>
        </div>
      )}
      
      {result.details && (
        <div className="result-message-meta" style={{ marginTop: '0.375rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.75rem', color: 'rgb(156, 163, 175)' }}>
              Technical Details
            </summary>
            <pre style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '0.25rem',
              fontSize: '0.6875rem',
              overflow: 'auto',
              maxHeight: '200px',
            }}>
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
