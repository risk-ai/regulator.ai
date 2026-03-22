/**
 * Trace Timeline Panel
 * Phase 13e - COMPLETE
 * 
 * Temporal execution visibility panel that answers:
 * - What happened?
 * - Why did Vienna allow it?
 * 
 * Features:
 * - Chronological event timeline
 * - Governance reasoning summary
 * - Decision explanation surface
 * - Execution graph preview
 * - Current state summary
 */

import { useState, useEffect } from 'react';
import {
  getIntentTimeline,
  getIntentGraph,
  getIntentExplanation,
} from '../../api/workspace.js';
import type {
  IntentTimeline,
  IntentGraph,
  IntentExplanation,
  TimelineEvent,
} from '../../types/workspace.js';

interface TraceTimelinePanelProps {
  investigationId?: string;
  intentId?: string;
  traceId?: string;
  className?: string;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventKindIcon(kind: string): string {
  const icons: Record<string, string> = {
    intent: '📥',
    normalization: '⚙️',
    resolution: '🔧',
    policy: '📋',
    governance: '⚖️',
    reconciliation: '🔄',
    execution: '▶️',
    verification: '✓',
    outcome: '🎯',
    artifact_export: '📦',
    other: '•',
  };
  return icons[kind] || '•';
}

function getStatusColor(status?: string): string {
  const colors: Record<string, string> = {
    allowed: 'text-green-400 bg-green-900/30',
    succeeded: 'text-green-400 bg-green-900/30',
    denied: 'text-red-400 bg-red-900/30',
    failed: 'text-red-400 bg-red-900/30',
    started: 'text-blue-400 bg-blue-900/30',
    pending: 'text-yellow-400 bg-yellow-900/30',
    partial: 'text-orange-400 bg-orange-900/30',
    unknown: 'text-gray-400 bg-gray-800',
  };
  return status ? (colors[status] || colors.unknown) : colors.unknown;
}

function getDecisionIcon(decision: string): string {
  const icons: Record<string, string> = {
    allowed: '✓',
    denied: '✗',
    partial: '⚠',
    unknown: '?',
  };
  return icons[decision] || '?';
}

function getDecisionColor(decision: string): string {
  const colors: Record<string, string> = {
    allowed: 'text-green-400 bg-green-900/50 border-green-700',
    denied: 'text-red-400 bg-red-900/50 border-red-700',
    partial: 'text-orange-400 bg-orange-900/50 border-orange-700',
    unknown: 'text-gray-400 bg-gray-900/50 border-gray-700',
  };
  return colors[decision] || colors.unknown;
}

export function TraceTimelinePanel({
  investigationId,
  intentId,
  traceId,
  className = '',
}: TraceTimelinePanelProps) {
  const [timeline, setTimeline] = useState<IntentTimeline | null>(null);
  const [graph, setGraph] = useState<IntentGraph | null>(null);
  const [explanation, setExplanation] = useState<IntentExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which intent to load
  const effectiveIntentId = intentId || traceId;

  useEffect(() => {
    if (effectiveIntentId) {
      loadTraceData(effectiveIntentId);
    } else if (investigationId) {
      // TODO: Load first intent for investigation
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [effectiveIntentId, investigationId]);

  async function loadTraceData(intentIdToLoad: string) {
    try {
      setLoading(true);
      setError(null);

      // Load timeline, graph, and explanation in parallel
      const [timelineData, graphData, explanationData] = await Promise.allSettled([
        getIntentTimeline(intentIdToLoad),
        getIntentGraph(intentIdToLoad),
        getIntentExplanation(intentIdToLoad),
      ]);

      if (timelineData.status === 'fulfilled') {
        setTimeline(timelineData.value);
      }

      if (graphData.status === 'fulfilled') {
        setGraph(graphData.value);
      }

      if (explanationData.status === 'fulfilled') {
        setExplanation(explanationData.value);
      }

      // If all failed, show error
      if (
        timelineData.status === 'rejected' &&
        graphData.status === 'rejected' &&
        explanationData.status === 'rejected'
      ) {
        throw new Error('Failed to load trace data');
      }
    } catch (err: any) {
      console.error('Failed to load trace data:', err);
      setError(err.message || 'Failed to load trace timeline');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse h-32"></div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse h-64"></div>
      </div>
    );
  }

  // Error state
  if (error && !timeline) {
    return (
      <div className={`bg-red-900/20 border border-red-700/50 rounded-lg p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load trace timeline</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => effectiveIntentId && loadTraceData(effectiveIntentId)}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No intent selected state
  if (!effectiveIntentId && !timeline) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-12 ${className}`}>
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No trace timeline available</h3>
          <p className="text-gray-400">No trace timeline is available for this investigation yet.</p>
        </div>
      </div>
    );
  }

  // Empty timeline state
  if (timeline && timeline.events.length === 0) {
    return (
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-12 ${className}`}>
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">Partial timeline</h3>
          <p className="text-gray-400">Trace found but no timeline events were reconstructed.</p>
        </div>
      </div>
    );
  }

  const events = timeline?.events || [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current State Summary */}
      {timeline && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Current Status</div>
              <div className="flex items-center gap-2">
                {lastEvent?.status && (
                  <span className={`px-2 py-1 text-xs rounded ${getStatusColor(lastEvent.status)}`}>
                    {lastEvent.status}
                  </span>
                )}
                <span className="text-white font-medium">
                  {lastEvent?.title || timeline.summary?.status || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Events</div>
              <div className="text-white font-medium">{events.length}</div>
            </div>
            {timeline.summary?.last_event && (
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Last Activity</div>
                <div className="text-white font-medium">{formatTimestamp(timeline.summary.last_event)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Governance Reasoning Summary */}
      {explanation && (
        <div className={`border-2 rounded-lg p-5 ${getDecisionColor(explanation.decision)}`}>
          <div className="flex items-start gap-3 mb-4">
            <div className="text-3xl">{getDecisionIcon(explanation.decision)}</div>
            <div>
              <h3 className="text-lg font-bold mb-1">Why Vienna {explanation.decision} it</h3>
              <p className="text-sm opacity-90">{explanation.summary}</p>
            </div>
          </div>

          {(explanation.policy_evaluation || explanation.governance_decision || explanation.bounded_authority) && (
            <div className="mt-4 space-y-2 text-sm border-t border-current/20 pt-4">
              {explanation.policy_evaluation && (
                <div>
                  <span className="font-semibold">Policy: </span>
                  <span className="opacity-80">{explanation.policy_evaluation}</span>
                </div>
              )}
              {explanation.governance_decision && (
                <div>
                  <span className="font-semibold">Governance: </span>
                  <span className="opacity-80">{explanation.governance_decision}</span>
                </div>
              )}
              {explanation.bounded_authority && (
                <div>
                  <span className="font-semibold">Authority: </span>
                  <span className="opacity-80">{explanation.bounded_authority}</span>
                </div>
              )}
              {explanation.safe_mode_status && (
                <div>
                  <span className="font-semibold">Safe Mode: </span>
                  <span className="opacity-80">{explanation.safe_mode_status}</span>
                </div>
              )}
            </div>
          )}

          {explanation.reasons && explanation.reasons.length > 0 && (
            <div className="mt-4 border-t border-current/20 pt-4">
              <div className="text-sm font-semibold mb-2">Decision Factors:</div>
              <ul className="space-y-1 text-sm opacity-80">
                {explanation.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Timeline Events */}
      {timeline && events.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Execution Timeline</h3>

          <div className="space-y-3">
            {events.map((event, idx) => (
              <div
                key={event.id || idx}
                className="border-l-2 border-gray-700 pl-4 py-2 hover:border-blue-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{getEventKindIcon(event.kind)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white">{event.title}</h4>
                      {event.status && (
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                        {event.kind}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                    )}

                    {event.explanation && (
                      <div className="bg-gray-900/50 border border-gray-700 rounded p-3 mb-2">
                        <div className="text-xs text-gray-500 mb-1">Explanation:</div>
                        <p className="text-sm text-gray-300">{event.explanation}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      {event.timestamp && (
                        <span>{formatTimestamp(event.timestamp)}</span>
                      )}
                      {event.actor && (
                        <span>Actor: {event.actor}</span>
                      )}
                      {event.source && (
                        <span>Source: {event.source}</span>
                      )}
                    </div>

                    {/* Linked IDs */}
                    {(event.intent_id || event.execution_id || event.objective_id || event.artifact_id) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.intent_id && (
                          <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded font-mono">
                            intent:{event.intent_id.substring(0, 8)}
                          </span>
                        )}
                        {event.execution_id && (
                          <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-300 rounded font-mono">
                            exec:{event.execution_id.substring(0, 8)}
                          </span>
                        )}
                        {event.objective_id && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-900/50 text-yellow-300 rounded font-mono">
                            obj:{event.objective_id.substring(0, 8)}
                          </span>
                        )}
                        {event.artifact_id && (
                          <span className="px-2 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded font-mono">
                            artifact:{event.artifact_id.substring(0, 8)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Preview */}
      {graph && graph.nodes.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Execution Graph</h3>

          <div className="bg-gray-900 border border-gray-700 rounded p-4">
            <div className="space-y-3">
              {graph.nodes.map((node) => (
                <div key={node.id} className="flex items-center gap-3 text-sm">
                  <div className="w-32 flex-shrink-0">
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                      {node.kind}
                    </span>
                  </div>
                  <div className="flex-1 font-mono text-gray-400">{node.label}</div>
                  {node.status && (
                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(node.status)}`}>
                      {node.status}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {graph.edges.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-2">Flow:</div>
                <div className="space-y-1 text-xs text-gray-600">
                  {graph.edges.map((edge, idx) => (
                    <div key={idx} className="font-mono">
                      {edge.from} → {edge.to}
                      {edge.label && <span className="ml-2 text-gray-500">({edge.label})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-600 italic">
                Full graph visualization will be added in a future iteration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Graph Fallback */}
      {(!graph || graph.nodes.length === 0) && timeline && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Execution Graph</h3>
          <div className="bg-gray-900/50 border border-gray-700 rounded p-8 text-center">
            <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-gray-500">Graph preview unavailable for this trace</p>
          </div>
        </div>
      )}
    </div>
  );
}
