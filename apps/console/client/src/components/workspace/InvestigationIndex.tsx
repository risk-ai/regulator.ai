/**
 * Investigation Index
 * Phase 13b - Full implementation
 * 
 * Lists all investigations with filtering, status badges, entity counts,
 * and click-through to detail view.
 */

import React, { useEffect, useState } from 'react';
import { listInvestigations } from '../../api/workspace.js';
import { StatusBadge } from './StatusBadge.js';
import type { Investigation, InvestigationStatus } from '../../types/workspace.js';

interface InvestigationIndexProps {
  onSelectInvestigation?: (investigationId: string) => void;
}

export function InvestigationIndex({ onSelectInvestigation }: InvestigationIndexProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvestigationStatus | 'all'>('all');

  useEffect(() => {
    loadInvestigations();
  }, [filter]);

  const loadInvestigations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = filter === 'all' ? {} : { status: filter };
      const result = await listInvestigations(params);

      setInvestigations(result.investigations);
    } catch (err: any) {
      console.error('Failed to load investigations:', err);
      setError(err.message || 'Failed to load investigations');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigationClick = (investigationId: string) => {
    if (onSelectInvestigation) {
      onSelectInvestigation(investigationId);
    } else {
      // Fallback: navigate to detail page (Phase 13c)
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400">Loading investigations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-red-300 font-medium mb-1">Failed to Load Investigations</h3>
            <p className="text-red-400/80 text-sm">{error}</p>
            <button
              onClick={loadInvestigations}
              className="mt-3 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (investigations.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'all' ? 'No Investigations' : `No ${filter} Investigations`}
          </h3>
          <p className="text-gray-400 mb-6">
            {filter === 'all'
              ? 'No investigations have been created yet. Start an investigation to track incident analysis, evidence collection, and resolution.'
              : `No investigations with status "${filter}". Try a different filter.`}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Show all investigations
            </button>
          )}
        </div>
      </div>
    );
  }

  // Investigation list
  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'open', 'investigating', 'resolved', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded border transition-colors ${
                filter === status
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          {investigations.length} investigation{investigations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Investigation grid */}
      <div className="grid gap-4">
        {investigations.map((investigation) => (
          <div
            key={investigation.investigation_id}
            onClick={() => handleInvestigationClick(investigation.investigation_id)}
            className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 cursor-pointer transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg mb-1 truncate">
                  {investigation.name}
                </h3>
                {investigation.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {investigation.description}
                  </p>
                )}
              </div>
              <StatusBadge status={investigation.status} />
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              {/* Entity counts */}
              {investigation.objective_count !== undefined && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{investigation.objective_count} objective{investigation.objective_count !== 1 ? 's' : ''}</span>
                </div>
              )}

              {investigation.intent_count !== undefined && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{investigation.intent_count} intent{investigation.intent_count !== 1 ? 's' : ''}</span>
                </div>
              )}

              {investigation.artifact_count !== undefined && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{investigation.artifact_count} artifact{investigation.artifact_count !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Timestamps */}
              <div className="ml-auto flex items-center gap-4">
                <span>Created {formatDate(investigation.created_at)}</span>
                {investigation.updated_at !== investigation.created_at && (
                  <span>Updated {formatDate(investigation.updated_at)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
