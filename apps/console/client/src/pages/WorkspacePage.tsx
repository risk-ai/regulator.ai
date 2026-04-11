/**
 * Workspace Page
 * Phase 13b - Investigation Workspace
 * 
 * Operator investigation environment with:
 * - Investigation index (full implementation)
 * - Investigation detail (skeleton)
 * - Artifact browser (skeleton)
 * - Trace timeline (skeleton)
 * - Related entities (skeleton)
 */

import { useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { InvestigationIndex } from '../components/workspace/InvestigationIndex.js';
import { InvestigationDetail } from '../components/workspace/InvestigationDetail.js';
import { ArtifactBrowser } from '../components/workspace/ArtifactBrowser.js';
import { TraceTimelinePanel } from '../components/workspace/TraceTimelinePanel.js';
import { RelatedEntitiesPanel } from '../components/workspace/RelatedEntitiesPanel.js';

type WorkspaceView = 'index' | 'detail' | 'artifacts' | 'traces' | 'related';

export function WorkspacePage() {
  const [currentView, setCurrentView] = useState<WorkspaceView>('index');
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null);

  const handleSelectInvestigation = (investigationId: string) => {
    setSelectedInvestigationId(investigationId);
    setCurrentView('detail');
  };

  const handleBackToIndex = () => {
    setCurrentView('index');
    setSelectedInvestigationId(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'index':
        return <InvestigationIndex onSelectInvestigation={handleSelectInvestigation} />;

      case 'detail':
        return selectedInvestigationId ? (
          <InvestigationDetail
            investigationId={selectedInvestigationId}
            onClose={handleBackToIndex}
            onUpdate={() => {
              // Re-render investigation detail after updates
              // The component will reload its own data
            }}
          />
        ) : (
          <div className="text-gray-500">No investigation selected</div>
        );

      case 'artifacts':
        return selectedInvestigationId ? (
          <ArtifactBrowser investigationId={selectedInvestigationId} />
        ) : (
          <div className="text-gray-500">No investigation selected</div>
        );

      case 'traces':
        return <TraceTimelinePanel investigationId={selectedInvestigationId || undefined} />;

      case 'related':
        return selectedInvestigationId ? (
          <RelatedEntitiesPanel investigationId={selectedInvestigationId} />
        ) : (
          <div className="text-gray-500">No investigation selected</div>
        );

      default:
        return <InvestigationIndex onSelectInvestigation={handleSelectInvestigation} />;
    }
  };

  return (
    <PageLayout
      title="Workspace"
      description="Investigation environment"
    >
      {/* Secondary Navigation */}
      <div className="mb-6 flex items-center gap-4 border-b border-gray-700 pb-4">
        <button
          onClick={() => setCurrentView('index')}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            currentView === 'index'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Investigations
        </button>

        <button
          onClick={() => setCurrentView('artifacts')}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            currentView === 'artifacts'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Artifacts
        </button>

        <button
          onClick={() => setCurrentView('traces')}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            currentView === 'traces'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Traces
        </button>

        <button
          onClick={() => setCurrentView('related')}
          disabled={!selectedInvestigationId}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            currentView === 'related'
              ? 'bg-blue-600 text-white'
              : selectedInvestigationId
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          Related
        </button>

        {/* Back to Index (when in detail view) */}
        {currentView !== 'index' && (
          <button
            onClick={handleBackToIndex}
            className="ml-auto text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Index
          </button>
        )}
      </div>

      {/* View Content */}
      {renderView()}
    </PageLayout>
  );
}
