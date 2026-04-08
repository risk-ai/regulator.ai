/**
 * Artifact Browser
 * Phase 13d - COMPLETE
 * 
 * Evidence inspection panel for investigations with:
 * - Real backend data loading
 * - Artifact grouping by type
 * - Selection and detail preview
 * - Metadata display
 * - Content preview for text/JSON artifacts
 * - Linked entity visibility
 */

import { useState, useEffect } from 'react';
import { listArtifacts, getArtifactContent } from '../../api/workspace.js';
import type { Artifact } from '../../types/workspace.js';

interface ArtifactBrowserProps {
  investigationId: string;
  selectedArtifactId?: string | null;
  onSelectArtifact?: (artifactId: string | null) => void;
}

// Artifact type groups with canonical ordering
const ARTIFACT_TYPE_GROUPS = [
  {
    id: 'investigation',
    label: 'Investigation',
    icon: '📋',
    types: ['investigation_workspace', 'investigation_notes', 'investigation_report'],
  },
  {
    id: 'trace',
    label: 'Traces',
    icon: '🔍',
    types: ['trace', 'intent_trace', 'execution_graph', 'timeline_export'],
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: '⚙️',
    types: ['execution_output', 'execution_stdout', 'execution_stderr', 'verification_report'],
  },
  {
    id: 'objective',
    label: 'Objectives',
    icon: '🎯',
    types: ['objective_history', 'objective_analysis'],
  },
  {
    id: 'incident',
    label: 'Incidents',
    icon: '🚨',
    types: ['incident_timeline', 'incident_postmortem'],
  },
  {
    id: 'system',
    label: 'System',
    icon: '🖥️',
    types: ['state_snapshot', 'config_snapshot', 'system_snapshot'],
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

function isPreviewable(mimeType: string): boolean {
  const previewableMimes = [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/html',
    'text/csv',
  ];
  return previewableMimes.some(mime => mimeType.startsWith(mime));
}

function getGroupForType(artifactType: string): typeof ARTIFACT_TYPE_GROUPS[0] | null {
  for (const group of ARTIFACT_TYPE_GROUPS) {
    if (group.types.includes(artifactType)) {
      return group;
    }
  }
  return null;
}

export function ArtifactBrowser({ investigationId, selectedArtifactId, onSelectArtifact }: ArtifactBrowserProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedArtifactId || null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load artifacts when investigation changes
  useEffect(() => {
    loadArtifacts();
  }, [investigationId]);

  // Load artifact detail when selection changes
  useEffect(() => {
    if (selectedId) {
      loadArtifactDetail(selectedId);
    } else {
      setSelectedArtifact(null);
      setArtifactContent(null);
    }
  }, [selectedId]);

  async function loadArtifacts() {
    try {
      setLoading(true);
      setError(null);
      const response = await listArtifacts({ investigation_id: investigationId, limit: 200 });
      setArtifacts(response.artifacts);
      
      // Clear selection if selected artifact no longer exists
      if (selectedId && !response.artifacts.find(a => a.artifact_id === selectedId)) {
        setSelectedId(null);
        onSelectArtifact?.(null);
      }
    } catch (err: any) {
      console.error('Failed to load artifacts:', err);
      setError(err.message || 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  }

  async function loadArtifactDetail(artifactId: string) {
    const artifact = artifacts.find(a => a.artifact_id === artifactId);
    if (!artifact) return;

    setSelectedArtifact(artifact);

    // Load content if previewable
    if (isPreviewable(artifact.mime_type)) {
      try {
        setContentLoading(true);
        const content = await getArtifactContent(artifactId);
        setArtifactContent(content);
      } catch (err: any) {
        console.error('Failed to load artifact content:', err);
        setArtifactContent(`[Error loading content: ${err.message}]`);
      } finally {
        setContentLoading(false);
      }
    } else {
      setArtifactContent(null);
    }
  }

  function handleSelectArtifact(artifactId: string) {
    setSelectedId(artifactId);
    onSelectArtifact?.(artifactId);
  }

  // Group artifacts by type
  const artifactsByGroup = new Map<string, Artifact[]>();
  for (const artifact of artifacts) {
    const group = getGroupForType(artifact.artifact_type);
    const groupId = group?.id || 'other';
    
    if (!artifactsByGroup.has(groupId)) {
      artifactsByGroup.set(groupId, []);
    }
    artifactsByGroup.get(groupId)!.push(artifact);
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse h-96"></div>
        </div>
        <div className="col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse h-96"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to load artifacts</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadArtifacts}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (artifacts.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-12">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No artifacts yet</h3>
          <p className="text-gray-400">No artifacts are linked to this investigation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Artifact List */}
      <div className="col-span-1 space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Artifacts</h3>
            <span className="text-sm text-gray-500">{artifacts.length} total</span>
          </div>

          {/* Grouped by type */}
          <div className="space-y-6">
            {ARTIFACT_TYPE_GROUPS.map((group) => {
              const groupArtifacts = artifactsByGroup.get(group.id) || [];
              if (groupArtifacts.length === 0) return null;

              return (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-400">
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                    <span className="ml-auto text-gray-600">{groupArtifacts.length}</span>
                  </div>

                  <div className="space-y-1">
                    {groupArtifacts.map((artifact) => (
                      <button
                        key={artifact.artifact_id}
                        onClick={() => handleSelectArtifact(artifact.artifact_id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedId === artifact.artifact_id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium truncate">{artifact.name}</div>
                        <div className={`text-xs mt-0.5 ${selectedId === artifact.artifact_id ? 'text-blue-200' : 'text-gray-500'}`}>
                          {formatTimestamp(artifact.created_at)} · {formatBytes(artifact.size_bytes)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized artifacts */}
            {artifactsByGroup.has('other') && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-400">
                  <span>📦</span>
                  <span>Other</span>
                  <span className="ml-auto text-gray-600">{artifactsByGroup.get('other')!.length}</span>
                </div>

                <div className="space-y-1">
                  {artifactsByGroup.get('other')!.map((artifact) => (
                    <button
                      key={artifact.artifact_id}
                      onClick={() => handleSelectArtifact(artifact.artifact_id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedId === artifact.artifact_id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium truncate">{artifact.name}</div>
                      <div className={`text-xs mt-0.5 ${selectedId === artifact.artifact_id ? 'text-blue-200' : 'text-gray-500'}`}>
                        {formatTimestamp(artifact.created_at)} · {formatBytes(artifact.size_bytes)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Detail Pane */}
      <div className="col-span-2">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-h-[600px] overflow-y-auto">
          {!selectedArtifact ? (
            // Unselected state
            <div className="flex items-center justify-center h-full min-h-[400px] text-gray-600">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base">Select an artifact to inspect its metadata and preview</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Artifact Header */}
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{selectedArtifact.name}</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">{selectedArtifact.artifact_type}</span>
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded">{selectedArtifact.mime_type}</span>
                  {isPreviewable(selectedArtifact.mime_type) && (
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded">Previewable</span>
                  )}
                </div>
              </div>

              {/* Metadata Section */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Metadata</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">ID</div>
                    <div className="text-gray-300 font-mono text-xs break-all">{selectedArtifact.artifact_id}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Created</div>
                    <div className="text-gray-300">{formatTimestamp(selectedArtifact.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Size</div>
                    <div className="text-gray-300">{formatBytes(selectedArtifact.size_bytes)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Created By</div>
                    <div className="text-gray-300">{selectedArtifact.created_by}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1">Integrity Hash</div>
                    <div className="text-gray-300 font-mono text-xs break-all">{selectedArtifact.content_hash}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1">Path</div>
                    <div className="text-gray-300 font-mono text-xs break-all">{selectedArtifact.file_path}</div>
                  </div>
                </div>
              </div>

              {/* Linked Entities Section */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Linked Entities</h4>
                <div className="space-y-2 text-sm">
                  {selectedArtifact.investigation_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Investigation:</span>
                      <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded font-mono text-xs">
                        {selectedArtifact.investigation_id}
                      </span>
                    </div>
                  )}
                  {selectedArtifact.intent_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Intent:</span>
                      <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded font-mono text-xs">
                        {selectedArtifact.intent_id}
                      </span>
                    </div>
                  )}
                  {selectedArtifact.execution_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Execution:</span>
                      <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded font-mono text-xs">
                        {selectedArtifact.execution_id}
                      </span>
                    </div>
                  )}
                  {selectedArtifact.objective_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Objective:</span>
                      <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded font-mono text-xs">
                        {selectedArtifact.objective_id}
                      </span>
                    </div>
                  )}
                  {!selectedArtifact.investigation_id && 
                   !selectedArtifact.intent_id && 
                   !selectedArtifact.execution_id && 
                   !selectedArtifact.objective_id && (
                    <div className="text-gray-600 italic">No linked entities</div>
                  )}
                </div>
              </div>

              {/* Content Preview Section */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Content Preview</h4>
                
                {contentLoading ? (
                  <div className="bg-gray-950 border border-gray-800 rounded p-4 text-center text-gray-500">
                    <div className="animate-pulse">Loading content...</div>
                  </div>
                ) : !isPreviewable(selectedArtifact.mime_type) ? (
                  <div className="bg-gray-950 border border-gray-800 rounded p-6 text-center">
                    <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-sm text-gray-500 mb-1">Preview unavailable</p>
                    <p className="text-xs text-gray-600">Content type: {selectedArtifact.mime_type}</p>
                  </div>
                ) : artifactContent ? (
                  <div className="bg-gray-950 border border-gray-800 rounded p-4 max-h-[400px] overflow-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {artifactContent.length > 10000 
                        ? artifactContent.substring(0, 10000) + '\n\n[Content truncated - showing first 10KB]'
                        : artifactContent
                      }
                    </pre>
                  </div>
                ) : (
                  <div className="bg-gray-950 border border-gray-800 rounded p-4 text-center text-gray-500">
                    No content available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
