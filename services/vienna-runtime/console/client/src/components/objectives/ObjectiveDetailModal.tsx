/**
 * Objective Detail Modal
 * 
 * Shows full detail for a single objective.
 * Displays status, timestamps, envelopes, linked replay/audit.
 * Provides action buttons (cancel, inspect) when applicable.
 */

import React, { useState, useEffect } from 'react';
import type { ObjectiveDetail } from '../../api/types';

export interface ObjectiveDetailModalProps {
  objectiveId: string;
  onClose: () => void;
}

export function ObjectiveDetailModal({ objectiveId, onClose }: ObjectiveDetailModalProps) {
  const [objective, setObjective] = useState<ObjectiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadObjective();
  }, [objectiveId]);

  async function loadObjective() {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/v1/objectives/${objectiveId}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load objective');
      }
      
      setObjective(json.data);
    } catch (err) {
      console.error('Failed to load objective:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!objective) return;
    if (!confirm(`Cancel objective ${objective.objective_id}?`)) return;
    
    try {
      setCancelling(true);
      
      const res = await fetch(`/api/v1/objectives/${objectiveId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'max',
          reason: 'Operator cancelled from detail view',
        }),
      });
      
      const json = await res.json();
      
      if (json.data.status === 'completed') {
        alert('Objective cancelled successfully');
        onClose();
      } else if (json.data.status === 'failed') {
        alert(`Cancel failed: ${json.data.message}`);
      } else {
        alert(`Cancel status: ${json.data.status} - ${json.data.message}`);
      }
    } catch (err) {
      console.error('Failed to cancel objective:', err);
      alert(`Cancel failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCancelling(false);
    }
  }

  function formatTimestamp(ts: string): string {
    try {
      const date = new Date(ts);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  const statusColor: Record<string, string> = {
    pending: '#2196f3',
    executing: '#ff9800',
    blocked: '#f44336',
    completed: '#4caf50',
    failed: '#f44336',
    cancelled: '#9e9e9e',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Objective Detail
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading objective...
          </div>
        )}
        
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}
        
        {objective && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                {objective.objective_id}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
                {objective.title}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: statusColor[objective.status] || '#999',
                  color: '#fff',
                }}>
                  {objective.status}
                </span>
                {objective.risk_tier && (
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: objective.risk_tier === 'T2' ? '#f44336' : objective.risk_tier === 'T1' ? '#ff9800' : '#9e9e9e',
                    color: '#fff',
                  }}>
                    {objective.risk_tier}
                  </span>
                )}
              </div>
            </div>
            
            {/* Metadata */}
            <div style={{ marginBottom: '16px' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Started:</td>
                    <td style={{ padding: '4px 8px' }}>{formatTimestamp(objective.started_at)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Updated:</td>
                    <td style={{ padding: '4px 8px' }}>{formatTimestamp(objective.updated_at)}</td>
                  </tr>
                  {objective.completed_at && (
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Completed:</td>
                      <td style={{ padding: '4px 8px' }}>{formatTimestamp(objective.completed_at)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Envelopes:</td>
                    <td style={{ padding: '4px 8px' }}>{objective.envelope_count}</td>
                  </tr>
                  {objective.active_count > 0 && (
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Active:</td>
                      <td style={{ padding: '4px 8px' }}>{objective.active_count}</td>
                    </tr>
                  )}
                  {objective.blocked_count > 0 && (
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Blocked:</td>
                      <td style={{ padding: '4px 8px' }}>{objective.blocked_count}</td>
                    </tr>
                  )}
                  {objective.current_step && (
                    <tr>
                      <td style={{ padding: '4px 8px', color: '#666', fontWeight: 500 }}>Current Step:</td>
                      <td style={{ padding: '4px 8px' }}>{objective.current_step}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Description */}
            {objective.description && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#666', marginBottom: '4px' }}>
                  Description
                </div>
                <div style={{ fontSize: '13px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {objective.description}
                </div>
              </div>
            )}
            
            {/* Error summary */}
            {objective.error_summary && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                fontSize: '13px',
              }}>
                <strong>Error:</strong> {objective.error_summary}
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
              <button
                onClick={handleCancel}
                disabled={cancelling || objective.status === 'completed' || objective.status === 'cancelled'}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #f44336',
                  backgroundColor: '#fff',
                  color: '#f44336',
                  borderRadius: '4px',
                  cursor: cancelling || objective.status === 'completed' || objective.status === 'cancelled' ? 'not-allowed' : 'pointer',
                  opacity: cancelling || objective.status === 'completed' || objective.status === 'cancelled' ? 0.5 : 1,
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Objective'}
              </button>
              
              <button
                onClick={() => window.open(`${window.location.origin}/?filter=objective:${objective.objective_id}`, '_blank')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #1976d2',
                  backgroundColor: '#fff',
                  color: '#1976d2',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                View Replay
              </button>
              
              <button
                onClick={() => window.open(`${window.location.origin}/?filter=audit:${objective.objective_id}`, '_blank')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #1976d2',
                  backgroundColor: '#fff',
                  color: '#1976d2',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                View Audit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
