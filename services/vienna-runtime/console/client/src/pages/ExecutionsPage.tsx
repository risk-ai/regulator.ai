/**
 * Executions Page
 * 
 * Execution history with ledger browser and audit trail
 */

import React, { useEffect, useState } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';

interface Execution {
  execution_id: string;
  intent: string;
  risk_tier: string;
  status: string;
  created_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');
  
  useEffect(() => {
    const loadExecutions = async () => {
      try {
        // In a real implementation, this would call the execution ledger API
        // For now, we'll show the structure
        setExecutions([]);
      } catch (error) {
        console.error('Failed to load executions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadExecutions();
  }, [filter]);
  
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'T0':
        return 'bg-gray-700 text-gray-300 border-gray-600';
      case 'T1':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'T2':
        return 'bg-red-900/50 text-red-300 border-red-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/50 text-green-300 border-green-700';
      case 'failed':
        return 'bg-red-900/50 text-red-300 border-red-700';
      case 'pending':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };
  
  if (loading) {
    return (
      <PageLayout title="Executions" description="Execution history and audit trail">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading execution history...</p>
          </div>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout title="Executions" description="Execution history and audit trail">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'failed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Failed
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
        
        {/* Execution Pipeline Diagram */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Governed Execution Pipeline</h2>
          
          <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Intent</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Plan</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Policy</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-blue-900/50 rounded-lg px-4 py-2 whitespace-nowrap border border-blue-700">
              <span className="text-blue-300">Approval</span>
              <span className="text-xs text-blue-400 ml-2">(T1/T2)</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Warrant</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Execution</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Verification</span>
            </div>
            <span className="text-gray-600">→</span>
            <div className="bg-gray-900 rounded-lg px-4 py-2 whitespace-nowrap border border-gray-700">
              <span className="text-gray-300">Ledger</span>
            </div>
          </div>
        </div>
        
        {/* Execution List */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-white">Recent Executions</h2>
          
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">No executions found</div>
              <p className="text-sm text-gray-500">
                Executed actions will appear here with full audit trail
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <div
                  key={execution.execution_id}
                  className="bg-gray-900/50 rounded-lg p-4 hover:bg-gray-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadge(execution.risk_tier)}`}>
                          {execution.risk_tier}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadge(execution.status)}`}>
                          {execution.status}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {execution.execution_id}
                        </span>
                      </div>
                      <div className="text-sm text-white mb-1">{execution.intent}</div>
                      <div className="text-xs text-gray-400">
                        Started: {new Date(execution.created_at).toLocaleString()}
                        {execution.duration_ms && ` · Duration: ${execution.duration_ms}ms`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
