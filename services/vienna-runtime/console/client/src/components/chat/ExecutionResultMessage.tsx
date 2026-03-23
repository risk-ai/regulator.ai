/**
 * Execution Result Message Component
 * Phase 10.5: Chat Cleanup
 * 
 * Structured display of execution results after approvals
 */

import React from 'react';

export interface ExecutionResult {
  success: boolean;
  status: 'success' | 'failure';
  message: string;
  execution_id?: string;
  details?: any;
  attestation?: {
    attestation_id: string;
    status: string;
    attested_at: string;
    execution_id: string;
  };
}

interface ExecutionResultMessageProps {
  result: ExecutionResult;
}

export const ExecutionResultMessage: React.FC<ExecutionResultMessageProps> = ({ result }) => {
  return (
    <div className={`execution-result-message result-${result.status}`}>
      <div className="result-message-header">
        <span className="result-message-icon">
          {result.status === 'success' ? '✅' : '❌'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          {result.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
        </span>
      </div>
      
      <div className="result-message-content">
        {result.message}
      </div>
      
      {result.execution_id && (
        <div className="result-message-meta">
          <span>execution_id: </span>
          <a
            href={`#/executions/${result.execution_id}`}
            className="result-message-link"
          >
            {result.execution_id}
          </a>
          <span style={{ marginLeft: '0.5rem', color: 'rgb(75, 85, 99)' }}>•</span>
          <span style={{ marginLeft: '0.5rem' }}>View Details</span>
        </div>
      )}
      
      {result.attestation && (
        <div className="result-message-meta" style={{ marginTop: '0.375rem' }}>
          <span style={{ fontWeight: 500 }}>Attestation: </span>
          <span style={{ 
            padding: '0.125rem 0.375rem',
            backgroundColor: result.attestation.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {result.attestation.status}
          </span>
          <span style={{ marginLeft: '0.5rem', color: 'rgb(156, 163, 175)', fontSize: '0.75rem' }}>
            {new Date(result.attestation.attested_at).toLocaleString()}
          </span>
        </div>
      )}
      
      {result.details && (
        <div className="result-message-meta" style={{ marginTop: '0.375rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
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
