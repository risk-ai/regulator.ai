/**
 * Investigation Detail
 * Phase 13c - COMPLETE
 * 
 * Production-quality investigation detail view with:
 * - Real backend data loading
 * - Investigation header with metadata
 * - Summary/notes display (read-only initially)
 * - Action bar with status transitions
 * - Entity summary strip with linked counts
 * - Layout slots for subpanels
 */

import { useState, useEffect } from 'react';
import { StatusBadge } from './StatusBadge.js';
import { ArtifactBrowser } from './ArtifactBrowser.js';
import { TraceTimelinePanel } from './TraceTimelinePanel.js';
import { RelatedEntitiesPanel } from './RelatedEntitiesPanel.js';
import { getInvestigation, updateInvestigation, archiveInvestigation } from '../../api/workspace.js';
import type { InvestigationDetail as InvestigationDetailType } from '../../types/workspace.js';

interface InvestigationDetailProps {
  investigationId: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

export function InvestigationDetail({ investigationId, onClose, onUpdate }: InvestigationDetailProps) {
  const [investigation, setInvestigation] = useState<InvestigationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadInvestigation();
  }, [investigationId]);

  async function loadInvestigation() {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvestigation(investigationId);
      setInvestigation(data);
    } catch (err: any) {
      console.error('Failed to load investigation:', err);
      setError(err.message || 'Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus: 'open' | 'investigating' | 'resolved' | 'archived') {
    if (!investigation) return;

    try {
      setActionLoading(true);
      await updateInvestigation(investigation.investigation_id, { status: newStatus });
      await loadInvestigation();
      onUpdate?.();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchive() {
    if (!investigation) return;
    
    if (!confirm('Archive this investigation? It can be restored later.')) {
      return;
    }

    try {
      setActionLoading(true);
      await archiveInvestigation(investigation.investigation_id);
      onUpdate?.();
      onClose?.();
    } catch (err: any) {
      console.error('Failed to archive investigation:', err);
      setError(err.message || 'Failed to archive investigation');
    } finally {
      setActionLoading(false);
    }
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-48"></div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-32"></div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-64"></div>
      </div>
    );
  }

  // Error state
  if (error && !investigation) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load investigation</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadInvestigation}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!investigation) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Investigation not found</h3>
            <p className="text-gray-400">The requested investigation could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const canMarkInvestigating = investigation.status === 'open';
  const canResolve = investigation.status === 'investigating';
  const canReopen = investigation.status === 'resolved';

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {investigation.name}
            </h2>
            {investigation.description && (
              <p className="text-gray-400 text-base leading-relaxed">
                {investigation.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <StatusBadge status={investigation.status} />
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Created {formatTimestamp(investigation.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Updated {formatTimestamp(investigation.updated_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {investigation.created_by}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            {investigation.investigation_id}
          </span>
        </div>
      </div>

      {/* Entity Summary Strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-400">Objectives</div>
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{investigation.objective_count || 0}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-400">Intents</div>
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{investigation.intent_count || 0}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-400">Artifacts</div>
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{investigation.artifact_count || 0}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-400">Traces</div>
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{investigation.intent_count || 0}</div>
        </div>
      </div>

      {/* Notes Area */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Investigation Notes</h3>
          <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">READ-ONLY</span>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          {investigation.description ? (
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {investigation.description}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">No notes recorded yet.</p>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Note: Markdown editor integration will be added in a future update.
        </p>
      </div>

      {/* Subpanel Slots */}
      <div className="space-y-4">
        {/* Artifact Browser - Phase 13d INTEGRATED */}
        <div>
          <ArtifactBrowser investigationId={investigation.investigation_id} />
        </div>

        {/* Trace Timeline - Phase 13e INTEGRATED */}
        <div>
          {investigation.intents && investigation.intents.length > 0 ? (
            <TraceTimelinePanel 
              investigationId={investigation.investigation_id}
              intentId={investigation.intents[0]?.intent_id}
            />
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2">No trace timeline available</h3>
                <p className="text-gray-400">No intents are linked to this investigation yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Related Entities - Phase 13f INTEGRATED */}
        <div>
          <RelatedEntitiesPanel investigationId={investigation.investigation_id} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 flex-wrap">
        {canMarkInvestigating && (
          <button
            onClick={() => handleStatusUpdate('investigating')}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Mark Investigating
          </button>
        )}
        
        {canResolve && (
          <button
            onClick={() => handleStatusUpdate('resolved')}
            disabled={actionLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Mark Resolved
          </button>
        )}
        
        {canReopen && (
          <button
            onClick={() => handleStatusUpdate('investigating')}
            disabled={actionLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reopen Investigation
          </button>
        )}

        <button
          onClick={handleArchive}
          disabled={actionLoading || investigation.status === 'archived'}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Archive
        </button>

        <button
          onClick={loadInvestigation}
          disabled={actionLoading}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
