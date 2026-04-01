/**
 * AI Command Bar
 * 
 * Natural language file operations with attachments.
 * Phase 2B: Commands with file attachments.
 * Phase 2C: Real execution through planner.
 */

import React, { useState } from 'react';
import { commandsApi } from '../../api/commands.js';

interface Props {
  currentFile?: string | null;
  onObjectiveCreated?: (objectiveId: string) => void;
}

export function AICommandBar({ currentFile, onObjectiveCreated }: Props) {
  const [command, setCommand] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    objectiveId?: string;
  } | null>(null);
  
  const handleAttachCurrent = () => {
    if (currentFile && !attachments.includes(currentFile)) {
      setAttachments([...attachments, currentFile]);
    }
  };
  
  const handleRemoveAttachment = (path: string) => {
    setAttachments(attachments.filter(a => a !== path));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) return;
    
    setProcessing(true);
    setResult(null);
    
    try {
      // Submit command with attachments
      const response = await commandsApi.submit({
        command: command.trim(),
        attachments,
      });
      
      setResult({
        success: true,
        message: response.message,
        objectiveId: response.objective_id,
      });
      
      // Notify parent
      if (onObjectiveCreated && response.objective_id) {
        onObjectiveCreated(response.objective_id);
      }
      
      // Clear form
      setCommand('');
      setAttachments([]);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Command failed',
      });
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="px-4 py-3 bg-[#12131a] border-b border-[rgba(255,255,255,0.08)]">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[rgba(255,255,255,0.4)] font-medium">Attachments:</span>
            {attachments.map(path => (
              <div
                key={path}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
                <span className="font-mono truncate max-w-xs" title={path}>
                  {path.split('/').pop()}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(path)}
                  className="ml-1 hover:text-blue-900"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Command Input */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          
          {/* Input */}
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={processing}
            placeholder="AI command: summarize package-lock.json, explain src/server.ts, find plannerService.ts, summarize this folder..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          
          {/* Attach Current File */}
          {currentFile && !attachments.includes(currentFile) && (
            <button
              type="button"
              onClick={handleAttachCurrent}
              disabled={processing}
              className="px-3 py-2 text-sm font-medium text-[rgba(255,255,255,0.6)] bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Attach current file"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          {/* Submit */}
          <button
            type="submit"
            disabled={!command.trim() || processing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : 'Execute'}
          </button>
        </div>
      </form>
      
      {/* Result */}
      {result && (
        <div className={`mt-2 px-4 py-2 rounded text-sm ${
          result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {result.message}
          {result.objectiveId && (
            <code className="block mt-1 text-xs font-mono">
              Objective: {result.objectiveId}
            </code>
          )}
        </div>
      )}
    </div>
  );
}
