/**
 * Related Entities Panel
 * Phase 13f - COMPLETE
 * 
 * Cross-link visibility panel showing:
 * - Linked objectives with status
 * - Linked intents with trace access
 * - Linked artifacts with quick preview
 * - Relationship labeling
 * - Entity counts and summaries
 */

import { useState, useEffect } from 'react';
import { getInvestigation } from '../../api/workspace.js';
import type { InvestigationDetail } from '../../types/workspace.js';

interface RelatedEntitiesPanelProps {
  investigationId: string;
  onSelectIntent?: (intentId: string) => void;
  onSelectArtifact?: (artifactId: string) => void;
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
  });
}

export function RelatedEntitiesPanel({
  investigationId,
  onSelectIntent,
  onSelectArtifact,
}: RelatedEntitiesPanelProps) {
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRelatedEntities();
  }, [investigationId]);

  async function loadRelatedEntities() {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvestigation(investigationId);
      setInvestigation(data);
    } catch (err: any) {
      console.error('Failed to load related entities:', err);
      setError(err.message || 'Failed to load related entities');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 h-32"></div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 h-32"></div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 h-32"></div>
      </div>
    );
  }

  // Error state
  if (error || !investigation) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load related entities</h3>
            <p className="text-red-400 mb-4">{error || 'Unknown error'}</p>
            <button
              onClick={loadRelatedEntities}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const objectives = investigation.objectives || [];
  const intents = investigation.intents || [];
  const artifacts = investigation.artifacts || [];
  const totalEntities = objectives.length + intents.length + artifacts.length;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Related Entities</h3>
        <span className="text-sm text-gray-500">{totalEntities} total</span>
      </div>

      {/* Objectives Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Objectives
          </h4>
          <span className="text-sm text-gray-500">{objectives.length}</span>
        </div>

        {objectives.length === 0 ? (
          <div className="text-sm text-gray-600 italic">No linked objectives</div>
        ) : (
          <div className="space-y-2">
            {objectives.map((objective: any) => (
              <div
                key={objective.objective_id || objective.id}
                className="bg-gray-900/50 border border-gray-700 rounded p-3 hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-white text-sm">
                    {objective.name || objective.objective_type || 'Unnamed objective'}
                  </div>
                  {objective.status && (
                    <span className="px-2 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded">
                      {objective.status}
                    </span>
                  )}
                </div>
                {objective.description && (
                  <div className="text-xs text-gray-400 mb-2">{objective.description}</div>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-mono">{(objective.objective_id || objective.id)?.substring(0, 12)}</span>
                  {objective.created_at && <span>{formatTimestamp(objective.created_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intents Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Intents
          </h4>
          <span className="text-sm text-gray-500">{intents.length}</span>
        </div>

        {intents.length === 0 ? (
          <div className="text-sm text-gray-600 italic">No linked intents</div>
        ) : (
          <div className="space-y-2">
            {intents.map((intent: any) => (
              <button
                key={intent.intent_id}
                onClick={() => onSelectIntent?.(intent.intent_id)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded p-3 hover:bg-gray-900 hover:border-purple-600 transition-colors text-left"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-white text-sm">
                    {intent.intent_type || 'Unknown intent'}
                  </div>
                  {intent.status && (
                    <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded">
                      {intent.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-mono">{intent.intent_id.substring(0, 12)}</span>
                  {intent.submitted_at && <span>{formatTimestamp(intent.submitted_at)}</span>}
                </div>
                {onSelectIntent && (
                  <div className="mt-2 text-xs text-purple-400">
                    Click to view trace timeline →
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Artifacts Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Artifacts
          </h4>
          <span className="text-sm text-gray-500">{artifacts.length}</span>
        </div>

        {artifacts.length === 0 ? (
          <div className="text-sm text-gray-600 italic">No linked artifacts</div>
        ) : (
          <div className="space-y-2">
            {artifacts.slice(0, 5).map((artifact) => (
              <button
                key={artifact.artifact_id}
                onClick={() => onSelectArtifact?.(artifact.artifact_id)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded p-3 hover:bg-gray-900 hover:border-green-600 transition-colors text-left"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-white text-sm truncate">{artifact.name}</div>
                  <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-300 rounded flex-shrink-0">
                    {artifact.artifact_type}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-mono">{artifact.artifact_id.substring(0, 12)}</span>
                  <span>{formatTimestamp(artifact.created_at)}</span>
                  <span>{(artifact.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                {onSelectArtifact && (
                  <div className="mt-2 text-xs text-green-400">
                    Click to preview artifact →
                  </div>
                )}
              </button>
            ))}

            {artifacts.length > 5 && (
              <div className="text-center py-2">
                <span className="text-sm text-gray-500">
                  ... and {artifacts.length - 5} more artifacts
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Relationship Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Investigation Graph
        </h4>

        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Investigation</span>
              <span className="text-white font-medium">{investigation.name}</span>
            </div>

            {objectives.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Links to objectives</span>
                <span className="text-blue-400 font-medium">{objectives.length}</span>
              </div>
            )}

            {intents.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Links to intents</span>
                <span className="text-purple-400 font-medium">{intents.length}</span>
              </div>
            )}

            {artifacts.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Contains artifacts</span>
                <span className="text-green-400 font-medium">{artifacts.length}</span>
              </div>
            )}

            {investigation.objective_id && (
              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Parent objective</span>
                <span className="text-yellow-400 font-mono text-xs">
                  {investigation.objective_id.substring(0, 12)}
                </span>
              </div>
            )}

            {investigation.incident_id && (
              <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Parent incident</span>
                <span className="text-red-400 font-mono text-xs">
                  {investigation.incident_id.substring(0, 12)}
                </span>
              </div>
            )}

            {totalEntities === 0 && !investigation.objective_id && !investigation.incident_id && (
              <div className="text-center py-6 text-gray-600 italic">
                No relationships discovered yet
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-600 italic">
              Visual graph rendering will be added in a future iteration.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State (only if truly empty) */}
      {totalEntities === 0 && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h4 className="text-white font-medium mb-2">No related entities yet</h4>
          <p className="text-sm text-gray-500">
            Entities will appear here as they are linked to this investigation.
          </p>
        </div>
      )}
    </div>
  );
}
