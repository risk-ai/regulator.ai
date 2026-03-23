/**
 * Replay & Audit Panel
 * 
 * Minimal but real replay/audit visibility.
 * Requirements:
 * - List recent replay events
 * - List recent audit records
 * - Click/expand to inspect one item
 * - Chat messages with audit/objective linkage should show affordance
 * 
 * Prioritize inspectability over styling.
 */

import React, { useState, useEffect } from 'react';
import type { ReplayEvent, AuditRecord } from '../../api/types';

export interface ReplayPanelProps {
  className?: string;
}

export function ReplayPanel({ className = '' }: ReplayPanelProps) {
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [selectedReplay, setSelectedReplay] = useState<ReplayEvent | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'replay' | 'audit'>('replay');

  useEffect(() => {
    loadReplayAndAudit();
    
    // Poll every 10 seconds
    const interval = setInterval(loadReplayAndAudit, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadReplayAndAudit() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch replay events
      const replayRes = await fetch('/api/v1/replay?limit=10');
      if (!replayRes.ok) {
        throw new Error(`Failed to fetch replay: ${replayRes.statusText}`);
      }
      const replayData = await replayRes.json();
      
      // Fetch audit records
      const auditRes = await fetch('/api/v1/audit?limit=10');
      if (!auditRes.ok) {
        throw new Error(`Failed to fetch audit: ${auditRes.statusText}`);
      }
      const auditData = await auditRes.json();
      
      setReplayEvents(replayData.data?.events || []);
      setAuditRecords(auditData.data?.records || []);
    } catch (err) {
      console.error('Failed to load replay/audit:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  function renderReplayEvent(event: ReplayEvent, index: number) {
    const isSelected = selectedReplay?.event_id === event.event_id;
    
    return (
      <div
        key={event.event_id || index}
        className={`replay-event ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedReplay(isSelected ? null : event)}
        style={{
          padding: '8px',
          marginBottom: '4px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e3f2fd' : '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ fontWeight: 500 }}>{event.event_type}</span>
          <span style={{ color: '#666' }}>{formatTimestamp(event.timestamp)}</span>
        </div>
        
        {event.envelope_id && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            Envelope: {event.envelope_id}
          </div>
        )}
        
        {event.objective_id && (
          <div style={{ fontSize: '11px', color: '#666' }}>
            Objective: {event.objective_id}
          </div>
        )}
        
        {isSelected && (
          <div style={{ marginTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
            <div><strong>Actor:</strong> {event.actor}</div>
            {event.warrant_id && <div><strong>Warrant:</strong> {event.warrant_id}</div>}
            <details style={{ marginTop: '4px' }}>
              <summary style={{ cursor: 'pointer', color: '#1976d2' }}>Payload</summary>
              <pre style={{
                marginTop: '4px',
                padding: '8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
              }}>
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details style={{ marginTop: '4px' }}>
                <summary style={{ cursor: 'pointer', color: '#1976d2' }}>Metadata</summary>
                <pre style={{
                  marginTop: '4px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}>
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderAuditRecord(record: AuditRecord, index: number) {
    const isSelected = selectedAudit?.id === record.id;
    
    const resultColor: Record<string, string> = {
      completed: '#4caf50',
      failed: '#f44336',
      executing: '#ff9800',
      preview: '#2196f3',
      requested: '#9e9e9e',
    };
    
    return (
      <div
        key={record.id || index}
        className={`audit-record ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedAudit(isSelected ? null : record)}
        style={{
          padding: '8px',
          marginBottom: '4px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e3f2fd' : '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ fontWeight: 500 }}>{record.action}</span>
          <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: resultColor[record.result] || '#999',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 600,
          }}>
            {record.result}
          </span>
        </div>
        
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
          {formatTimestamp(record.timestamp)}
          {record.operator && ` • ${record.operator}`}
        </div>
        
        {record.objective_id && (
          <div style={{ fontSize: '11px', color: '#666' }}>
            Objective: {record.objective_id}
          </div>
        )}
        
        {record.envelope_id && (
          <div style={{ fontSize: '11px', color: '#666' }}>
            Envelope: {record.envelope_id}
          </div>
        )}
        
        {record.thread_id && (
          <div style={{ fontSize: '11px', color: '#666' }}>
            Thread: {record.thread_id}
          </div>
        )}
        
        {isSelected && record.metadata && Object.keys(record.metadata).length > 0 && (
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#1976d2', fontSize: '11px' }}>
              Metadata
            </summary>
            <pre style={{
              marginTop: '4px',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px',
            }}>
              {JSON.stringify(record.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className={className} style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Replay & Audit
        </h3>
        <button
          onClick={() => loadReplayAndAudit()}
          disabled={loading}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '8px',
      }}>
        <button
          onClick={() => setActiveTab('replay')}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: activeTab === 'replay' ? 600 : 400,
            border: 'none',
            borderBottom: activeTab === 'replay' ? '2px solid #1976d2' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'replay' ? '#1976d2' : '#666',
          }}
        >
          Replay ({replayEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            fontWeight: activeTab === 'audit' ? 600 : 400,
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid #1976d2' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'audit' ? '#1976d2' : '#666',
          }}
        >
          Audit ({auditRecords.length})
        </button>
      </div>
      
      {error && (
        <div style={{
          padding: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '12px',
        }}>
          {error}
        </div>
      )}
      
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {activeTab === 'replay' && (
          <div>
            {replayEvents.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px' }}>
                No replay events yet
              </div>
            )}
            {replayEvents.map((event, i) => renderReplayEvent(event, i))}
          </div>
        )}
        
        {activeTab === 'audit' && (
          <div>
            {auditRecords.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '20px' }}>
                No audit records yet
              </div>
            )}
            {auditRecords.map((record, i) => renderAuditRecord(record, i))}
          </div>
        )}
      </div>
    </div>
  );
}
