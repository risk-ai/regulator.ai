/**
 * Editor Panel
 * 
 * View/edit file contents.
 * Save creates envelope - immediately surface envelope ID.
 */

import React, { useState, useEffect } from 'react';
import { filesApi } from '../../api/files.js';

interface Props {
  filePath: string | null;
  onFileSaved: (envelopeId: string) => void;
  onFileDeleted: (envelopeId: string) => void;
}

export function EditorPanel({ filePath, onFileSaved, onFileDeleted }: Props) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    success: boolean;
    envelopeId: string;
    message: string;
  } | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    size: number;
    modified: string;
  } | null>(null);
  
  const isDirty = content !== originalContent;
  
  useEffect(() => {
    if (filePath) {
      loadFile(filePath);
    } else {
      setContent('');
      setOriginalContent('');
      setFileInfo(null);
      setSaveStatus(null);
      setError(null);
    }
  }, [filePath]);
  
  const loadFile = async (path: string) => {
    setLoading(true);
    setError(null);
    setSaveStatus(null);
    
    try {
      const result = await filesApi.read(path);
      setContent(result.content);
      setOriginalContent(result.content);
      setFileInfo({
        size: result.size,
        modified: result.modified,
      });
    } catch (err) {
      console.error('Failed to load file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setContent('');
      setOriginalContent('');
      setFileInfo(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!filePath) return;
    
    setSaving(true);
    setError(null);
    setSaveStatus(null);
    
    try {
      const result = await filesApi.write(filePath, content);
      
      setOriginalContent(content);
      setSaveStatus({
        success: true,
        envelopeId: result.envelope_id,
        message: `Saved (envelope: ${result.envelope_id})`,
      });
      
      // Notify parent to refresh visualizer
      onFileSaved(result.envelope_id);
      
      // Reload file info
      await loadFile(filePath);
    } catch (err) {
      console.error('Failed to save file:', err);
      const message = err instanceof Error ? err.message : 'Failed to save file';
      setError(message);
      setSaveStatus({
        success: false,
        envelopeId: '',
        message: `Save failed: ${message}`,
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!filePath) return;
    
    if (!confirm(`Delete ${filePath}?`)) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      const result = await filesApi.delete(filePath);
      
      // Notify parent
      onFileDeleted(result.envelope_id);
    } catch (err) {
      console.error('Failed to delete file:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };
  
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };
  
  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString();
  };
  
  if (!filePath) {
    return (
      <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.4)]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-sm">Select a file to view or edit</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#12131a]">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#e2e8f0] truncate">
              {filePath}
            </h3>
            {fileInfo && (
              <div className="flex gap-3 mt-1 text-xs text-[rgba(255,255,255,0.4)]">
                <span>{formatSize(fileInfo.size)}</span>
                <span>Modified: {formatDate(fileInfo.modified)}</span>
                {isDirty && <span className="text-orange-600 font-medium">● Unsaved changes</span>}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
        
        {/* Save status */}
        {saveStatus && (
          <div className={`mt-2 p-2 rounded text-xs ${
            saveStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveStatus.message}
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="mt-2 p-2 rounded text-xs bg-red-50 text-red-700">
            {error}
          </div>
        )}
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-[rgba(255,255,255,0.4)]">Loading file...</p>
            </div>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
            placeholder="File content..."
          />
        )}
      </div>
    </div>
  );
}
