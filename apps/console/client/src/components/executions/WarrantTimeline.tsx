/**
 * WarrantTimeline Component
 * 
 * Displays warrant lifecycle as a horizontal timeline:
 * Requested → Evaluated → Approved/Denied → Executed/Blocked
 * 
 * With color-coded connectors and timestamps.
 */

import React, { useMemo } from 'react';

interface TimelineStage {
  stage: 'requested' | 'evaluated' | 'approved' | 'denied' | 'executed' | 'blocked';
  timestamp?: string;
  actor?: string;
  status: 'complete' | 'pending' | 'failed';
}

interface WarrantTimelineProps {
  stages: TimelineStage[];
  warrantsId?: string;
  vertical?: boolean;
}

const STAGE_CONFIG = {
  requested: {
    label: 'Requested',
    icon: '📋',
    position: 0,
  },
  evaluated: {
    label: 'Evaluated',
    icon: '🔍',
    position: 1,
  },
  approved: {
    label: 'Approved',
    icon: '✓',
    position: 2,
  },
  denied: {
    label: 'Denied',
    icon: '⊘',
    position: 2,
  },
  executed: {
    label: 'Executed',
    icon: '⚡',
    position: 3,
  },
  blocked: {
    label: 'Blocked',
    icon: '🚫',
    position: 3,
  },
};

function getStageColor(status: string): string {
  switch (status) {
    case 'complete':
      return '#10b981'; // Green
    case 'failed':
      return '#ef4444'; // Red
    case 'pending':
      return '#f59e0b'; // Amber
    default:
      return '#6b7280'; // Gray
  }
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return date.toLocaleDateString();
}

export const WarrantTimeline: React.FC<WarrantTimelineProps> = ({
  stages,
  warrantsId,
  vertical = false,
}) => {
  // Build the timeline sequence: Requested → Evaluated → (Approved|Denied) → (Executed|Blocked)
  const timelineSequence = useMemo(() => {
    const sequence = [];
    
    // Always show requested → evaluated
    const requested = stages.find(s => s.stage === 'requested');
    const evaluated = stages.find(s => s.stage === 'evaluated');
    const approved = stages.find(s => s.stage === 'approved');
    const denied = stages.find(s => s.stage === 'denied');
    const executed = stages.find(s => s.stage === 'executed');
    const blocked = stages.find(s => s.stage === 'blocked');

    if (requested) sequence.push(requested);
    if (evaluated) sequence.push(evaluated);
    if (approved || denied) sequence.push(approved || denied!);
    if (executed || blocked) sequence.push(executed || blocked!);

    return sequence;
  }, [stages]);

  if (timelineSequence.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          color: 'var(--text-tertiary)',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        No warrant timeline available
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          📜 Warrant Lifecycle
        </h3>
        {warrantsId && (
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            ID: {warrantsId}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', overflowX: 'auto' }}>
        {timelineSequence.map((stage, idx) => {
          const cfg = STAGE_CONFIG[stage.stage];
          const color = getStageColor(stage.status);
          const isLast = idx === timelineSequence.length - 1;

          return (
            <div key={`${stage.stage}-${idx}`} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
              {/* Stage dot and content */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {/* Dot */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: `${color}15`,
                    border: `2px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                    animation:
                      stage.status === 'pending' ? 'pulse 2s infinite' : undefined,
                  }}
                  title={`${cfg.label} - ${stage.status}`}
                >
                  {cfg.icon}
                </div>

                {/* Label and timestamp */}
                <div style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {cfg.label}
                  </div>
                  {stage.timestamp && (
                    <div
                      style={{
                        fontSize: '9px',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}
                      title={new Date(stage.timestamp).toLocaleString()}
                    >
                      {formatTime(stage.timestamp)}
                    </div>
                  )}
                  {stage.actor && (
                    <div
                      style={{
                        fontSize: '8px',
                        color: 'var(--text-muted)',
                        marginTop: '1px',
                      }}
                    >
                      {stage.actor}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector to next stage */}
              {!isLast && (
                <div
                  style={{
                    width: '40px',
                    height: '2px',
                    backgroundColor: color,
                    margin: '0 16px',
                    opacity: 0.6,
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {/* Arrow tip */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '-6px',
                      top: '-3px',
                      width: '0',
                      height: '0',
                      borderLeft: `6px solid ${color}`,
                      borderTop: '3px solid transparent',
                      borderBottom: '3px solid transparent',
                      opacity: 0.6,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WarrantTimeline;
