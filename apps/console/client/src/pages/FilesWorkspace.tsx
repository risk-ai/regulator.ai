/**
 * Files Workspace Page
 * 
 * Three-pane layout:
 * - Left: File tree browser
 * - Center: File editor/viewer
 * - Right: Envelope visualizer (runtime truth)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileTreePanel } from '../components/files/FileTreePanel.js';
import { EditorPanel } from '../components/files/EditorPanel.js';
import { EnvelopeVisualizerPanel } from '../components/files/EnvelopeVisualizerPanel.js';
import { AICommandBar } from '../components/files/AICommandBar.js';
import { filesApi } from '../api/files.js';

export function FilesWorkspace() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedEnvelope, setSelectedEnvelope] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  
  const handleFileSaved = (envelopeId: string) => {
    // Trigger visualizer refresh when file saved
    setRefreshTrigger(prev => prev + 1);
    setSelectedEnvelope(envelopeId);
  };
  
  const handleFileDeleted = (envelopeId: string) => {
    // Trigger visualizer refresh when file deleted
    setRefreshTrigger(prev => prev + 1);
    setSelectedEnvelope(envelopeId);
    setSelectedFile(null); // Clear editor
  };
  
  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const result = await filesApi.upload(files, currentPath);
      
      // Show first envelope
      if (result.files.length > 0 && result.files[0].status === 'verified') {
        setSelectedEnvelope(result.files[0].envelope_id);
      }
      
      // Refresh file tree
      setRefreshTrigger(prev => prev + 1);
      

    } catch (error) {

      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [currentPath]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  }, [handleUpload]);
  
  const handleObjectiveCreated = useCallback((objectiveId: string) => {
    // Show objective in visualizer
    setSelectedEnvelope(objectiveId);
    setRefreshTrigger(prev => prev + 1);

  }, []);
  
  return (
    <div
      className="flex flex-col h-screen bg-[#0a0a0f] relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header Bar */}
      <div className="bg-[#12131a] border-b border-[rgba(255,255,255,0.08)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[rgba(255,255,255,0.6)] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.04)] rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </button>
          <div className="text-sm text-[rgba(255,255,255,0.4)]">|</div>
          <h1 className="text-lg font-semibold text-[#e2e8f0]">Files Workspace</h1>
        </div>
      </div>
      
      {/* AI Command Bar */}
      <AICommandBar
        currentFile={selectedFile}
        onObjectiveCreated={handleObjectiveCreated}
      />
      
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[#12131a] px-6 py-4 rounded-lg border border-[rgba(255,255,255,0.08)]">
            <p className="text-lg font-semibold text-[#e2e8f0]">Drop files to upload</p>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mt-1">Uploads to: {currentPath}</p>
          </div>
        </div>
      )}
      
      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-[#12131a] px-6 py-4 rounded-lg border border-[rgba(255,255,255,0.08)]">
            <p className="text-lg font-semibold text-[#e2e8f0]">Uploading files...</p>
          </div>
        </div>
      )}
      
      {/* Main Content: 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Tree */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.08)] bg-[#12131a] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-semibold text-[#e2e8f0]">Files</h2>
            <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Workspace Browser</p>
          </div>
          <FileTreePanel
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onPathChange={setCurrentPath}
            onUpload={handleUpload}
            refreshTrigger={refreshTrigger}
          />
        </div>
        
        {/* Center: Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <EditorPanel
            filePath={selectedFile}
            onFileSaved={handleFileSaved}
            onFileDeleted={handleFileDeleted}
          />
        </div>
        
        {/* Right: Envelope Visualizer */}
        <div className="w-96 border-l border-[rgba(255,255,255,0.08)] bg-[#12131a] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-semibold text-[#e2e8f0]">Runtime</h2>
            <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Envelope Execution</p>
          </div>
          <EnvelopeVisualizerPanel
            refreshTrigger={refreshTrigger}
            selectedEnvelope={selectedEnvelope}
            onEnvelopeSelect={setSelectedEnvelope}
          />
        </div>
      </div>
    </div>
  );
}
