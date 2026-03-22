/**
 * Envelope Visualizer Panel v0
 * 
 * Operational runtime truth surface:
 * - Live list of envelopes (newest first)
 * - State badges
 * - Click for detail
 * - Show relation to objective
 * 
 * NOT a graph yet - just a structured live list.
 */

import React, { useState, useEffect } from 'react';
import { runtimeApi, type RuntimeEnvelope } from '../../api/runtime.js';

interface Props {
  refreshTrigger: number;
  selectedEnvelope: string | null;
  onEnvelopeSelect: (id: string) => void;
}

export function EnvelopeVisualizerPanel({ refreshTrigger, selectedEnvelope, onEnvelopeSelect }: Props) {
  const [envelopes, setEnvelopes] = useState<RuntimeEnvelope[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<RuntimeEnvelope | null>(null);
  
  useEffect(() => {
    loadEnvelopes();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(loadEnvelopes, 2000);
    
    return () => clearInterval(interval);
  }, [refreshTrigger]);
  
  useEffect(() => {
    if (selectedEnvelope) {
      loadEnvelopeDetail(selectedEnvelope);
    }
  }, [selectedEnvelope]);
  
  const loadEnvelopes = async () => {
    // Don't show loading spinner on polling refreshes
    if (envelopes.length === 0) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const result = await runtimeApi.listEnvelopes({ limit: 50 });
      setEnvelopes(result);
    } catch (err) {
      console.error('Failed to load envelopes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load envelopes');
    } finally {
      setLoading(false);
    }
  };
  
  const loadEnvelopeDetail = async (id: string) => {
    try {
      const envelope = await runtimeApi.getEnvelope(id);
      setDetailView(envelope);
    } catch (err) {
      console.error('Failed to load envelope detail:', err);
    }
  };
  
  const handleEnvelopeClick = (envelope: RuntimeEnvelope) => {
    onEnvelopeSelect(envelope.envelope_id);
    setDetailView(envelope);
  };
  
  const getStateBadgeColor = (state: string): string => {
    switch (state) {
      case 'queued': return 'bg-gray-100 text-gray-700';
      case 'executing': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'verified': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'blocked': return 'bg-yellow-100 text-yellow-700';
      case 'dead_letter': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleString();
  };
  
  if (detailView) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Detail header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <button
            onClick={() => setDetailView(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h3 className="text-sm font-semibold text-gray-900">Envelope Detail</h3>
        </div>
        
        {/* Detail content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Envelope ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Envelope ID</label>
            <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
              {detailView.envelope_id}
            </code>
          </div>
          
          {/* Objective ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Objective ID</label>
            <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
              {detailView.objective_id}
            </code>
          </div>
          
          {/* State */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStateBadgeColor(detailView.state)}`}>
              {detailView.state}
            </span>
          </div>
          
          {/* Action & Target */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <p className="text-sm text-gray-900">{detailView.action_type}</p>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Target</label>
            <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
              {detailView.target}
            </code>
          </div>
          
          {/* Warrant */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Warrant</label>
            {detailView.warrant_id ? (
              <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
                {detailView.warrant_id}
              </code>
            ) : (
              <span className="text-xs text-gray-500">None</span>
            )}
          </div>
          
          {/* Verification */}
          {detailView.verification_status && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Verification</label>
              <span className="text-xs text-gray-900">{detailView.verification_status}</span>
            </div>
          )}
          
          {/* Retry count */}
          {detailView.retry_count > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Retry Count</label>
              <span className="text-xs text-gray-900">{detailView.retry_count}</span>
            </div>
          )}
          
          {/* Parent */}
          {detailView.parent_envelope_id && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Parent Envelope</label>
              <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">
                {detailView.parent_envelope_id}
              </code>
            </div>
          )}
          
          {/* Timestamps */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Queued At</label>
            <span className="text-xs text-gray-900">{new Date(detailView.queued_at).toLocaleString()}</span>
          </div>
          
          {detailView.started_at && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Started At</label>
              <span className="text-xs text-gray-900">{new Date(detailView.started_at).toLocaleString()}</span>
            </div>
          )}
          
          {detailView.completed_at && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Completed At</label>
              <span className="text-xs text-gray-900">{new Date(detailView.completed_at).toLocaleString()}</span>
            </div>
          )}
          
          {/* Error */}
          {detailView.error && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Error</label>
              <pre className="text-xs bg-red-50 text-red-700 p-2 rounded overflow-x-auto">
                {detailView.error}
              </pre>
            </div>
          )}
          
          {/* Dead letter */}
          {detailView.dead_letter && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-xs font-medium text-red-700">Dead Letter</p>
              <p className="text-xs text-red-600 mt-1">This envelope is in the dead letter queue</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && envelopes.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm">Loading envelopes...</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {!loading && !error && envelopes.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="mt-2 text-sm">No envelopes yet</p>
            <p className="mt-1 text-xs text-gray-400">Perform file operations to see execution</p>
          </div>
        )}
        
        {!loading && !error && envelopes.map(envelope => (
          <div
            key={envelope.envelope_id}
            onClick={() => handleEnvelopeClick(envelope)}
            className={`
              px-4 py-3 border-b border-gray-100 cursor-pointer
              hover:bg-gray-50 transition-colors
              ${selectedEnvelope === envelope.envelope_id ? 'bg-blue-50 hover:bg-blue-100' : ''}
            `}
          >
            {/* State badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStateBadgeColor(envelope.state)}`}>
                {envelope.state}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(envelope.queued_at)}
              </span>
            </div>
            
            {/* Action & Target */}
            <p className="text-sm font-medium text-gray-900 truncate">
              {envelope.action_type}
            </p>
            <code className="block text-xs text-gray-600 truncate font-mono">
              {envelope.target}
            </code>
            
            {/* Metadata */}
            <div className="flex gap-2 mt-1 text-xs text-gray-500">
              {envelope.warrant_id && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  warrant
                </span>
              )}
              {envelope.verification_status && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {envelope.verification_status}
                </span>
              )}
              {envelope.retry_count > 0 && (
                <span>retry: {envelope.retry_count}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
