/**
 * Execution Pipeline Status
 * 
 * Phase 10.5: Visual representation of Vienna's execution pipeline
 * Shows: Intent → Plan → Policy → Warrant → Execution → Verification
 */

import React, { useState, useEffect } from 'react';
import { statusApi } from '../../api/status.js';
import './ExecutionPipelineStatus.css';

interface PipelineStage {
  name: string;
  count: number | null;
  status: 'active' | 'idle' | 'unknown';
}

export function ExecutionPipelineStatus() {
  const [stages, setStages] = useState<PipelineStage[]>([
    { name: 'Intent', count: null, status: 'unknown' },
    { name: 'Plan', count: null, status: 'unknown' },
    { name: 'Policy', count: null, status: 'unknown' },
    { name: 'Warrant', count: null, status: 'unknown' },
    { name: 'Execution', count: null, status: 'unknown' },
    { name: 'Verification', count: null, status: 'unknown' },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Fetch pipeline status every 10 seconds
  useEffect(() => {
    fetchPipelineStatus();

    const interval = setInterval(fetchPipelineStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineStatus = async () => {
    try {
      const systemStatus = await statusApi.getStatus();

      // Map available data to pipeline stages
      const updatedStages: PipelineStage[] = [
        {
          name: 'Intent',
          count: null, // Not tracked yet
          status: 'unknown',
        },
        {
          name: 'Plan',
          count: null, // Could query plans table
          status: 'unknown',
        },
        {
          name: 'Policy',
          count: null, // Not directly tracked
          status: 'unknown',
        },
        {
          name: 'Warrant',
          count: null, // Not directly tracked
          status: 'unknown',
        },
        {
          name: 'Execution',
          count: systemStatus.active_envelopes || 0,
          status: systemStatus.active_envelopes > 0 ? 'active' : 'idle',
        },
        {
          name: 'Verification',
          count: null, // Not directly tracked
          status: 'unknown',
        },
      ];

      setStages(updatedStages);
      setError(null);
    } catch (err) {
      console.error('[ExecutionPipeline] Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStageClass = (status: string): string => {
    switch (status) {
      case 'active': return 'active';
      case 'idle': return 'idle';
      default: return 'unknown';
    }
  };

  if (error) {
    return (
      <div className="execution-pipeline-status">
        <div className="panel-header">
          <h3>Execution Pipeline</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="execution-pipeline-status">
      <div className="panel-header">
        <h3>Execution Pipeline</h3>
      </div>

      <div className="panel-body">
        <div className="pipeline-container">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.name}>
              <div className={`pipeline-stage ${getStageClass(stage.status)}`}>
                <div className="stage-name">{stage.name}</div>
                <div className="stage-value">
                  {stage.count !== null ? stage.count : '—'}
                </div>
              </div>
              {index < stages.length - 1 && (
                <div className="pipeline-arrow">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
