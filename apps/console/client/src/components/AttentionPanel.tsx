/**
 * Attention Panel Component
 * Phase 5E: Operator "Now" View
 * 
 * Surfaces items requiring operator attention.
 * Critical alerts, stalled executions, degraded providers.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AttentionItem } from '../api/system.js';
import './AttentionPanel.css';

interface AttentionPanelProps {
  items: AttentionItem[];
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({ items }) => {
  const navigate = useNavigate();
  
  /**
   * Get icon for attention item type
   */
  const getItemIcon = (type: AttentionItem['type']): string => {
    switch (type) {
      case 'alert': return '🚨';
      case 'stalled': return '⏱️';
      case 'retry_loop': return '🔄';
      case 'dead_letter': return '💀';
      case 'degraded_provider': return '🔌';
      case 'queue_capacity': return '📊';
      default: return '⚠️';
    }
  };
  
  /**
   * Get severity class
   */
  const getSeverityClass = (severity: string): string => {
    return `severity-${severity}`;
  };
  
  /**
   * Format time since
   */
  const formatSince = (sinceStr: string): string => {
    const since = new Date(sinceStr).getTime();
    const now = Date.now();
    const diffMs = now - since;
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };
  
  /**
   * Handle item click - navigate to relevant detail
   */
  const handleItemClick = (item: AttentionItem) => {
    if (!item.actionable) return;
    
    // Route to appropriate detail view
    if (item.objectiveId) {
      navigate(`/objectives/${item.objectiveId}/timeline`);
    } else if (item.provider) {
      // Future: navigate to provider health detail
    } else if (item.type === 'dead_letter') {
      navigate('/deadletters');
    } else if (item.type === 'queue_capacity') {
      navigate('/runtime');
    }
  };
  
  // Separate critical from warnings
  const critical = items.filter(i => i.severity === 'critical');
  const warnings = items.filter(i => i.severity === 'warning');
  const info = items.filter(i => i.severity === 'info');
  
  if (items.length === 0) {
    return (
      <div className="attention-panel">
        <div className="panel-header">
          <h3>Attention</h3>
          <span className="status-badge status-healthy">✓ All Clear</span>
        </div>
        <div className="panel-empty">
          <p>No items requiring attention</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="attention-panel">
      <div className="panel-header">
        <h3>Attention</h3>
        <div className="alert-counts">
          {critical.length > 0 && (
            <span className="count-badge critical">{critical.length} critical</span>
          )}
          {warnings.length > 0 && (
            <span className="count-badge warning">{warnings.length} warning</span>
          )}
        </div>
      </div>
      
      <div className="panel-list">
        {/* Critical items first */}
        {critical.map((item, index) => (
          <div
            key={`critical-${index}`}
            className={`attention-item ${getSeverityClass(item.severity)} ${item.actionable ? 'actionable' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="item-icon">{getItemIcon(item.type)}</div>
            
            <div className="item-content">
              <div className="item-title">{item.title}</div>
              <div className="item-message">{item.message}</div>
              
              <div className="item-footer">
                <span className="item-since">{formatSince(item.since)}</span>
                
                {item.count !== undefined && (
                  <span className="item-count">{item.count} items</span>
                )}
                
                {item.actionable && (
                  <span className="item-action">Click to view →</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Warning items */}
        {warnings.map((item, index) => (
          <div
            key={`warning-${index}`}
            className={`attention-item ${getSeverityClass(item.severity)} ${item.actionable ? 'actionable' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="item-icon">{getItemIcon(item.type)}</div>
            
            <div className="item-content">
              <div className="item-title">{item.title}</div>
              <div className="item-message">{item.message}</div>
              
              <div className="item-footer">
                <span className="item-since">{formatSince(item.since)}</span>
                
                {item.count !== undefined && (
                  <span className="item-count">{item.count} items</span>
                )}
                
                {item.actionable && (
                  <span className="item-action">Click to view →</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Info items (rarely shown) */}
        {info.slice(0, 3).map((item, index) => (
          <div
            key={`info-${index}`}
            className={`attention-item ${getSeverityClass(item.severity)} ${item.actionable ? 'actionable' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="item-icon">{getItemIcon(item.type)}</div>
            
            <div className="item-content">
              <div className="item-title">{item.title}</div>
              <div className="item-message">{item.message}</div>
              
              <div className="item-footer">
                <span className="item-since">{formatSince(item.since)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
