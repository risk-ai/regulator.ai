import { useAuthStore } from '../../store/authStore.js';
/**
 * Objectives Panel
 * 
 * Displays Vienna's governed work: active objectives, blocked work, dead letters.
 * Provides retry/cancel operator actions.
 */

import React, { useState, useEffect } from 'react';
import { ObjectiveDetailModal } from './ObjectiveDetailModal.js';

interface ObjectiveSummary {
  objectiveId: string;
  title: string | null;
  status: 'active' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  riskTier?: string | null;
  currentStep?: string | null;
  envelopeCount?: number;
  blockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DeadLetterSummary {
  id: string;
  objectiveId: string | null;
  envelopeId: string | null;
  reason: string;
  createdAt: string;
  retryable: boolean;
  retryCount: number;
}

export function ObjectivesPanel() {
  const [objectives, setObjectives] = useState<ObjectiveSummary[]>([]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadData = async () => {
    try {
      // Load objectives
      const objectivesResponse = await fetch('/api/v1/objectives');
      
      // Safely handle response
      if (!objectivesResponse.ok) {
        throw new Error(`HTTP ${objectivesResponse.status}: ${objectivesResponse.statusText}`);
      }
      
      const contentType = objectivesResponse.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Expected JSON response');
      }
      
      const objectivesText = await objectivesResponse.text();
      const objectivesData = objectivesText ? JSON.parse(objectivesText) : { success: true, data: { objectives: [] } };
      
      if (objectivesData.success) {
        setObjectives(objectivesData.data.objectives || []);
      }
      
      // Load dead letters
      const deadLettersResponse = await fetch('/api/v1/deadletters');
      
      if (!deadLettersResponse.ok) {
        throw new Error(`HTTP ${deadLettersResponse.status}: ${deadLettersResponse.statusText}`);
      }
      
      const deadLettersText = await deadLettersResponse.text();
      const deadLettersData = deadLettersText ? JSON.parse(deadLettersText) : { success: true, data: { deadLetters: [] } };
      
      if (deadLettersData.success) {
        setDeadLetters(deadLettersData.data.deadLetters || []);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load objectives/dead letters:', err);
      setError(err instanceof Error ? err.message : 'Unable to load objectives');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRetry = async (deadLetterId: string) => {
    try {
      const response = await fetch(`/api/v1/deadletters/${deadLetterId}/requeue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: useAuthStore((state) => state.operator) || 'system', // TODO: Get from auth
          reason: 'Operator requested retry',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Retry ${data.data.status}: ${data.data.message}`);
        loadData(); // Reload
      } else {
        alert(`Retry failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to retry dead letter:', err);
      alert(`Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Objectives & Work</h3>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Objectives & Work</h3>
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Objectives & Work</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Active Objectives</div>
          <div className="text-2xl font-bold text-white">
            {objectives.filter(o => o.status === 'active').length}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Blocked</div>
          <div className="text-2xl font-bold text-yellow-400">
            {objectives.filter(o => o.status === 'blocked').length}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Dead Letters</div>
          <div className="text-2xl font-bold text-red-400">
            {deadLetters.length}
          </div>
        </div>
      </div>
      
      {/* Dead Letters List */}
      {deadLetters.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-white mb-2">Dead Letters</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deadLetters.slice(0, 10).map(dl => (
              <DeadLetterItem key={dl.id} deadLetter={dl} onRetry={handleRetry} />
            ))}
          </div>
        </div>
      )}
      
      {/* Objectives List */}
      {objectives.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-white mb-2">Recent Objectives</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {objectives.slice(0, 10).map(obj => (
              <ObjectiveItem 
                key={obj.objectiveId} 
                objective={obj}
                onClick={() => setSelectedObjectiveId(obj.objectiveId)}
              />
            ))}
          </div>
        </div>
      )}
      
      {objectives.length === 0 && deadLetters.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No active objectives or dead letters
        </div>
      )}
      
      {/* Objective Detail Modal */}
      {selectedObjectiveId && (
        <ObjectiveDetailModal
          objectiveId={selectedObjectiveId}
          onClose={() => {
            setSelectedObjectiveId(null);
            loadData(); // Reload data after closing modal
          }}
        />
      )}
    </div>
  );
}

function DeadLetterItem({ 
  deadLetter, 
  onRetry 
}: { 
  deadLetter: DeadLetterSummary; 
  onRetry: (id: string) => void;
}) {
  const [retrying, setRetrying] = useState(false);
  
  const handleRetry = async () => {
    setRetrying(true);
    await onRetry(deadLetter.id);
    setRetrying(false);
  };
  
  return (
    <div className="bg-gray-700 rounded p-3 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-300">{deadLetter.envelopeId}</span>
          {!deadLetter.retryable && (
            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded">
              Not retryable
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">{deadLetter.reason}</div>
        {deadLetter.objectiveId && (
          <div className="text-xs text-gray-500 mt-1">
            Objective: {deadLetter.objectiveId}
          </div>
        )}
      </div>
      
      {deadLetter.retryable && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
}

function ObjectiveItem({ 
  objective,
  onClick
}: { 
  objective: ObjectiveSummary;
  onClick?: () => void;
}) {
  const statusColor = {
    active: 'bg-blue-900 text-blue-300',
    blocked: 'bg-yellow-900 text-yellow-300',
    completed: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
    cancelled: 'bg-gray-700 text-gray-400',
  }[objective.status] || 'bg-gray-700 text-gray-300';
  
  return (
    <div 
      className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-300">{objective.objectiveId}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${statusColor}`}>
              {objective.status}
            </span>
          </div>
          
          {objective.title && (
            <div className="text-sm text-white mt-1">{objective.title}</div>
          )}
          
          {objective.blockedReason && (
            <div className="text-xs text-yellow-400 mt-1">
              Blocked: {objective.blockedReason}
            </div>
          )}
          
          {objective.envelopeCount !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              {objective.envelopeCount} envelope(s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
