/**
 * Workspace Page — Premium Terminal Design
 * 
 * Investigation environment with premium tab navigation.
 */

import { useState } from 'react';
import { Search, FileText, Activity, Link, ArrowLeft } from 'lucide-react';
import { InvestigationIndex } from '../components/workspace/InvestigationIndex.js';
import { InvestigationDetail } from '../components/workspace/InvestigationDetail.js';
import { ArtifactBrowser } from '../components/workspace/ArtifactBrowser.js';
import { TraceTimelinePanel } from '../components/workspace/TraceTimelinePanel.js';
import { RelatedEntitiesPanel } from '../components/workspace/RelatedEntitiesPanel.js';

type WorkspaceView = 'index' | 'detail' | 'artifacts' | 'traces' | 'related';

export function WorkspacePage() {
  const [currentView, setCurrentView] = useState<WorkspaceView>('index');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => { setSelectedId(id); setCurrentView('detail'); };
  const handleBack = () => { setCurrentView('index'); setSelectedId(null); };

  const tabs = [
    { key: 'index' as const, label: 'Investigations', icon: Search },
    { key: 'artifacts' as const, label: 'Artifacts', icon: FileText },
    { key: 'traces' as const, label: 'Traces', icon: Activity },
    { key: 'related' as const, label: 'Related', icon: Link, disabled: !selectedId },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
          <Search className="text-blue-400" size={20} />
          Workspace
        </h1>
        <p className="text-[12px] text-white/40 mt-1 font-mono">Investigation environment</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/[0.06] pb-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => !t.disabled && setCurrentView(t.key)}
            disabled={t.disabled}
            className={`px-4 py-2.5 text-[11px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              currentView === t.key
                ? 'text-white border-blue-500'
                : t.disabled
                  ? 'text-white/15 border-transparent cursor-not-allowed'
                  : 'text-white/30 border-transparent hover:text-white/50'
            }`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}

        {currentView !== 'index' && (
          <button onClick={handleBack}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold font-mono text-white/30 hover:text-white/50 transition-colors">
            <ArrowLeft size={12} /> Back
          </button>
        )}
      </div>

      {/* View Content */}
      {currentView === 'index' && <InvestigationIndex onSelectInvestigation={handleSelect} />}
      {currentView === 'detail' && selectedId && (
        <InvestigationDetail investigationId={selectedId} onClose={handleBack} onUpdate={() => {}} />
      )}
      {currentView === 'detail' && !selectedId && (
        <div className="text-center py-16 text-white/30 text-[12px] font-mono">No investigation selected</div>
      )}
      {currentView === 'artifacts' && selectedId && <ArtifactBrowser investigationId={selectedId} />}
      {currentView === 'artifacts' && !selectedId && (
        <div className="text-center py-16 text-white/30 text-[12px] font-mono">Select an investigation first</div>
      )}
      {currentView === 'traces' && <TraceTimelinePanel investigationId={selectedId || undefined} />}
      {currentView === 'related' && selectedId && <RelatedEntitiesPanel investigationId={selectedId} />}
    </div>
  );
}
