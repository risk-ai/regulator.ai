/**
 * Current Work View Component
 * Phase 5E: Operator "Now" View
 * 
 * Shows all currently executing envelopes with runtime info.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { CurrentWorkItem } from '../api/system.js';
import './CurrentWorkView.css';

interface CurrentWorkViewProps {
  work: CurrentWorkItem[];
}

export const CurrentWorkView: React.FC<CurrentWorkViewProps> = ({ work }) => {
  const navigate = useNavigate();
  
  /**
   * Format runtime duration
   */
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  /**
   * Get status indicator class
   */
  const getStatusClass = (item: CurrentWorkItem): string => {
    if (item.blocked) return 'status-blocked';
    if (item.stalled) return 'status-stalled';
    return 'status-running';
  };
  
  /**
   * Get status label
   */
  const getStatusLabel = (item: CurrentWorkItem): string => {
    if (item.blocked) return 'Blocked';
    if (item.stalled) return 'Stalled';
    return 'Running';
  };
  
  /**
   * Navigate to objective timeline
   */
  const handleObjectiveClick = (objectiveId: string) => {
    navigate(`/objectives/${objectiveId}/timeline`);
  };
  
  /**
   * Navigate to envelope detail (if available)
   */
  const handleEnvelopeClick = (envelopeId: string, objectiveId: string) => {
    // For now, navigate to objective timeline
    // Future: could have dedicated envelope detail view
    navigate(`/objectives/${objectiveId}/timeline`);
  };
  
  if (work.length === 0) {
    return (
      <div className="current-work-view">
        <div className="work-header">
          <h3>Current Work</h3>
        </div>
        <div className="work-empty">
          <p>No active executions</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="current-work-view">
      <div className="work-header">
        <h3>Current Work</h3>
        <span className="work-count">{work.length} active</span>
      </div>
      
      <div className="work-list">
        {work.map((item) => (
          <div key={item.envelopeId} className={`work-item ${getStatusClass(item)}`}>
            <div className="work-item-header">
              <div className="work-item-status">
                <span className={`status-badge ${getStatusClass(item)}`}>
                  {getStatusLabel(item)}
                </span>
              </div>
              
              <div className="work-item-runtime">
                {formatDuration(item.runtimeMs)}
              </div>
            </div>
            
            <div className="work-item-body">
              <div className="work-item-objective">
                <button
                  className="objective-link"
                  onClick={() => handleObjectiveClick(item.objectiveId)}
                  title="View objective timeline"
                >
                  🎯 {item.objectiveName}
                </button>
              </div>
              
              <div className="work-item-envelope">
                <button
                  className="envelope-link"
                  onClick={() => handleEnvelopeClick(item.envelopeId, item.objectiveId)}
                  title="View envelope detail"
                >
                  📦 {item.envelopeId.substring(0, 16)}...
                </button>
              </div>
              
              <div className="work-item-meta">
                {item.provider && (
                  <span className="meta-tag provider">
                    Provider: {item.provider}
                  </span>
                )}
                
                {item.adapter && (
                  <span className="meta-tag adapter">
                    Adapter: {item.adapter}
                  </span>
                )}
                
                <span className="meta-tag attempts">
                  Attempt {item.attempt}/{item.maxAttempts}
                </span>
              </div>
            </div>
            
            {(item.stalled || item.blocked) && (
              <div className="work-item-warning">
                {item.blocked && <span>⚠️ Execution blocked</span>}
                {item.stalled && <span>⏱️ Running longer than expected</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
