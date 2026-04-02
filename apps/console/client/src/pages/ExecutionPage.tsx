/**
 * Execution Page
 * 
 * Dedicated execution page for the Vienna Console
 * Shows live execution pipeline, active executions, and execution controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ExecutionPipelineStatus } from '../components/reconciliation/ExecutionPipelineStatus.js';
import { executionApi } from '../api/execution.js';
import type { EnvelopeExecution, QueueSnapshot, ExecutionMetrics } from '../api/types.js';

interface ExecutionRecord {
  id: string;
  intent_id: string;
  action: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  mode: 'vienna_direct' | 'agent_passback';
  risk_tier: 'T0' | 'T1' | 'T2' | 'T3';
  warrant_id?: string;
  created_at: string;
  completed_at?: string;
  agent_id: string;
  operator?: string;
}

export function ExecutionPage() {
  const [activeExecutions, setActiveExecutions] = useState<EnvelopeExecution[]>([]);
  const [queueSnapshot, setQueueSnapshot] = useState<QueueSnapshot | null>(null);
  const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics | null>(null);
  const [executionRecords, setExecutionRecords] = useState<ExecutionRecord[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch execution data
  const fetchExecutionData = useCallback(async () => {
    try {
      const [active, queue, metrics] = await Promise.all([
        executionApi.getActive(),
        executionApi.getQueue(),
        executionApi.getMetrics(),
      ]);

      setActiveExecutions(active);
      setQueueSnapshot(queue);
      setExecutionMetrics(metrics);
      setError(null);
    } catch (err) {
      console.error('[ExecutionPage] Failed to fetch execution data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Fetch execution records
  const fetchExecutionRecords = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/execution-records?limit=20');
      if (response.ok) {
        const records = await response.json();
        setExecutionRecords(records);
      }
    } catch (err) {
      console.warn('[ExecutionPage] Failed to fetch execution records:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    setLoading(true);
    
    Promise.all([
      fetchExecutionData(),
      fetchExecutionRecords(),
    ]).finally(() => {
      setLoading(false);
    });

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchExecutionData();
      fetchExecutionRecords();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchExecutionData, fetchExecutionRecords]);

  // Control actions
  const handlePause = async () => {
    try {
      await executionApi.pause('console-operator', 'Manual pause from console');
      setIsPaused(true);
      fetchExecutionData();
    } catch (err) {
      console.error('[ExecutionPage] Failed to pause execution:', err);
    }
  };

  const handleResume = async () => {
    try {
      await executionApi.resume('console-operator');
      setIsPaused(false);
      fetchExecutionData();
    } catch (err) {
      console.error('[ExecutionPage] Failed to resume execution:', err);
    }
  };

  const handleEmergencyOverride = async () => {
    const confirmed = window.confirm(
      'EMERGENCY OVERRIDE: This will bypass all governance for 15 minutes. Are you sure?'
    );
    
    if (!confirmed) return;

    try {
      await executionApi.emergencyOverride(
        'console-operator',
        'Emergency override from console',
        15,
        'console-emergency'
      );
      fetchExecutionData();
    } catch (err) {
      console.error('[ExecutionPage] Failed to activate emergency override:', err);
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.floor(duration / 1000)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing': return 'text-blue-400';
      case 'completed': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'approved': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getModeDisplay = (mode: string) => {
    return mode === 'vienna_direct' ? 'Vienna Direct' : 'Agent Passback';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'T0': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'T1': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'T2': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'T3': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading execution pipeline...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            ▶️ Execution Pipeline
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-tertiary)', 
            margin: '4px 0 0 0' 
          }}>
            Live execution pipeline visualization and controls
          </p>
        </div>

        {/* Execution Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isPaused ? (
            <button
              onClick={handlePause}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              ⏸️ Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              style={{
                background: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'white',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              ▶️ Resume
            </button>
          )}
          
          <button
            onClick={handleEmergencyOverride}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            🚨 Emergency Override
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          color: '#f87171',
          fontSize: '14px',
        }}>
          Error: {error}
        </div>
      )}

      {/* Live Pipeline Visualization */}
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <ExecutionPipelineStatus />
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Active Executions */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: 'var(--text-primary)', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔄 Active Executions
              <span style={{
                background: 'var(--accent-primary)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
              }}>
                {activeExecutions.length}
              </span>
            </h3>
          </div>
          
          <div style={{ padding: '20px' }}>
            {activeExecutions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                No active executions
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {activeExecutions.slice(0, 5).map((execution) => (
                  <div 
                    key={execution.envelope_id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {execution.action_type || execution.envelope_id.slice(0, 8)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {execution.envelope_id}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                      }}>
                        {execution.status}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      <span>Started: {new Date(execution.started_at).toLocaleTimeString()}</span>
                      <span>{formatDuration(execution.started_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue Status */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: 'var(--text-primary)', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Queue Status
            </h3>
          </div>
          
          <div style={{ padding: '20px' }}>
            {!queueSnapshot ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
                Loading queue status...
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '4px' }}>
                      {queueSnapshot.queue_depth}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      Queued
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, color: '#f87171', marginBottom: '4px' }}>
                      {queueSnapshot.blocked_count || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      Blocked
                    </div>
                  </div>
                </div>

                {executionMetrics && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
                      Pipeline Throughput
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{executionMetrics.total_processed || 0}</div>
                        <div>Processed</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{executionMetrics.success_rate || '0%'}</div>
                        <div>Success Rate</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{executionMetrics.avg_processing_time || '0ms'}</div>
                        <div>Avg Time</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Execution History */}
      <div style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📜 Recent Execution History
          </h3>
        </div>
        
        <div style={{ padding: '20px' }}>
          {executionRecords.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No execution records found
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {executionRecords.slice(0, 10).map((record) => (
                <div 
                  key={record.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {record.action}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {record.agent_id} • {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid',
                      fontFamily: 'var(--font-mono)',
                    }} className={getTierColor(record.risk_tier)}>
                      {record.risk_tier}
                    </span>
                    
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: record.mode === 'vienna_direct' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: record.mode === 'vienna_direct' ? '#a78bfa' : '#60a5fa',
                    }}>
                      {getModeDisplay(record.mode)}
                    </span>
                    
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: getStatusColor(record.status),
                    }}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}