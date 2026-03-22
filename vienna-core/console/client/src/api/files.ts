/**
 * Files API Client
 * 
 * Workspace file operations.
 */

import { apiClient } from './client.js';

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export interface FileListResponse {
  path: string;
  files: FileEntry[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  size: number;
  modified: string;
}

export interface FileWriteResponse {
  envelope_id: string;
  objective_id: string;
  status: 'queued' | 'executing' | 'completed' | 'failed';
  path: string;
}

export interface FileDeleteResponse {
  envelope_id: string;
  objective_id: string;
  status: 'queued' | 'executing' | 'completed' | 'failed';
  path: string;
}

export interface FileSearchResult {
  path: string;
  name: string;
  type: 'file' | 'directory';
  match: 'name' | 'content';
  snippet?: string;
}

export interface FileSearchResponse {
  query: string;
  path: string;
  results: FileSearchResult[];
}

export interface FileUploadResult {
  name: string;
  path: string;
  size: number;
  envelope_id: string;
  status: 'verified' | 'failed';
  error?: string;
}

export interface FileUploadResponse {
  files: FileUploadResult[];
}

/**
 * List files in directory
 */
export async function list(path: string): Promise<FileListResponse> {
  return apiClient.get<FileListResponse>('/files/list', { path });
}

/**
 * Read file contents
 */
export async function read(path: string): Promise<FileReadResponse> {
  return apiClient.get<FileReadResponse>('/files/read', { path });
}

/**
 * Write file contents
 */
export async function write(path: string, content: string, createOnly?: boolean): Promise<FileWriteResponse> {
  return apiClient.post<FileWriteResponse, { path: string; content: string; createOnly?: boolean }>(
    '/files/write',
    { path, content, createOnly }
  );
}

/**
 * Delete file
 */
export async function deleteFile(path: string): Promise<FileDeleteResponse> {
  return apiClient.delete<FileDeleteResponse>('/files/delete?path=' + encodeURIComponent(path));
}

/**
 * Search files
 */
export async function search(query: string, path: string, contentSearch: boolean): Promise<FileSearchResponse> {
  return apiClient.post<FileSearchResponse, { query: string; path: string; contentSearch: boolean }>(
    '/files/search',
    { query, path, contentSearch }
  );
}

/**
 * Upload files
 */
export async function upload(files: File[], targetPath: string): Promise<FileUploadResponse> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('targetPath', targetPath);
  
  const response = await fetch('/api/v1/files/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  const result = await response.json();
  return result.data;
}

export const filesApi = {
  list,
  read,
  write,
  delete: deleteFile,
  search,
  upload,
};
