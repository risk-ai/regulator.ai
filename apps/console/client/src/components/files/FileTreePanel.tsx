/**
 * File Tree Panel
 * 
 * Minimal viable file browser:
 * - Browse directories
 * - Click file to load
 * - Refresh current directory
 * - Show metadata (name, type, size)
 */

import React, { useState, useEffect } from 'react';
import { filesApi } from '../../api/files.js';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

interface Props {
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onPathChange?: (path: string) => void;
  onUpload?: (files: File[]) => void;
  refreshTrigger?: number;
}

export function FileTreePanel({ selectedFile, onFileSelect, onPathChange, onUpload, refreshTrigger }: Props) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);
  
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadDirectory(currentPath);
    }
  }, [refreshTrigger]);
  
  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await filesApi.list(path);
      setFiles(result.files);
    } catch (err) {
      console.error('Failed to load directory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClick = (file: FileEntry) => {
    if (file.type === 'directory') {
      const newPath = file.path;
      setCurrentPath(newPath);
      onPathChange?.(newPath);
    } else {
      onFileSelect(file.path);
    }
  };
  
  const goUp = () => {
    if (currentPath === '/') return;
    
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    setCurrentPath(newPath);
    onPathChange?.(newPath);
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload?.(files);
    }
    // Reset input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };
  
  // Filter files based on search query
  const filteredFiles = searchQuery
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.08)]">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-2.5 top-2.5 w-4 h-4 text-[rgba(255,255,255,0.35)] pointer-events-none"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 p-0.5 text-[rgba(255,255,255,0.35)] hover:text-gray-600"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Path breadcrumb */}
      <div className="px-4 py-2 bg-[#0f1015] border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2">
        <button
          onClick={goUp}
          disabled={currentPath === '/'}
          className="p-1 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)] disabled:text-gray-300 disabled:cursor-not-allowed"
          title="Go up"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <span className="text-sm font-mono text-[rgba(255,255,255,0.6)] truncate">
          {currentPath || '/'}
        </span>
        {onUpload && (
          <>
            <button
              onClick={handleUploadClick}
              className="ml-auto p-1 text-[rgba(255,255,255,0.4)] hover:text-blue-600"
              title="Upload files"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </>
        )}
        <button
          onClick={() => loadDirectory(currentPath)}
          className={`${onUpload ? '' : 'ml-auto'} p-1 text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)]`}
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-[rgba(255,255,255,0.4)]">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm">Loading...</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {!loading && !error && files.length === 0 && (
          <div className="p-4 text-center text-[rgba(255,255,255,0.4)]">
            <p className="text-sm">Empty directory</p>
          </div>
        )}
        
        {!loading && !error && files.length > 0 && filteredFiles.length === 0 && (
          <div className="p-4 text-center text-[rgba(255,255,255,0.4)]">
            <p className="text-sm">No files match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          </div>
        )}
        
        {!loading && !error && filteredFiles.map(file => (
          <div
            key={file.path}
            onClick={() => handleClick(file)}
            className={`
              px-4 py-2 border-b border-gray-100 cursor-pointer
              hover:bg-[#0f1015] transition-colors
              ${selectedFile === file.path ? 'bg-blue-50 hover:bg-blue-100' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              {/* Icon */}
              {file.type === 'directory' ? (
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[rgba(255,255,255,0.35)] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              )}
              
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e2e8f0] truncate">
                  {file.name}
                </p>
                <div className="flex gap-2 text-xs text-[rgba(255,255,255,0.4)]">
                  {file.size !== undefined && (
                    <span>{formatSize(file.size)}</span>
                  )}
                </div>
              </div>
              
              {/* Directory indicator */}
              {file.type === 'directory' && (
                <svg className="w-4 h-4 text-[rgba(255,255,255,0.35)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
