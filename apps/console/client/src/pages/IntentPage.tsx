/**
 * Intent Submission Page
 * 
 * Phase 23+: Operator interface for structured intent submission
 * Distinct from conversational chat — this is the governed execution path
 */

import React, { useState } from 'react';
import { intentApi } from '../api/intent';

interface IntentResult {
  success: boolean;
  data?: {
    intent_id: string;
    tenant_id: string;
    action: string;
    execution_id?: string;
    simulation?: boolean;
    explanation?: string;
    attestation?: {
      attestation_id: string;
      status: string;
      attested_at: string;
    };
    cost?: {
      total_cost: number;
      input_tokens: number;
      output_tokens: number;
    };
    quota_state?: {
      available: number;
      utilization: number;
    };
    metadata?: any;
  };
  error?: string;
  code?: string;
  timestamp: string;
}

const INTENT_TYPES = [
  { value: 'test_execution', label: 'Test Execution', description: 'Run a test execution for validation' },
  { value: 'restore_objective', label: 'Restore Objective', description: 'Restore a failed objective' },
  { value: 'investigate_objective', label: 'Investigate Objective', description: 'Investigate objective state' },
  { value: 'set_safe_mode', label: 'Set Safe Mode', description: 'Enable/disable safe mode' },
];

const TEST_PAYLOADS = {
  success: { mode: 'success', description: 'Successful execution' },
  simulation: { mode: 'simulation', description: 'Dry run mode' },
  quota_block: { mode: 'quota_block', description: 'Quota exhaustion' },
  budget_block: { mode: 'budget_block', description: 'Budget limit exceeded' },
  failure: { mode: 'failure', description: 'Execution failure' },
};

export function IntentPage() {
  const [intentType, setIntentType] = useState('test_execution');
  const [payload, setPayload] = useState(JSON.stringify(TEST_PAYLOADS.success, null, 2));
  const [simulation, setSimulation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntentResult | null>(null);

  const handleQuickLoad = (testCase: keyof typeof TEST_PAYLOADS) => {
    setPayload(JSON.stringify(TEST_PAYLOADS[testCase], null, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setResult(null);

    try {
      const parsedPayload = JSON.parse(payload);
      
      const response = await intentApi.submitIntent({
        intent_type: intentType,
        payload: parsedPayload,
        simulation,
      });

      setResult(response);
    } catch (error) {
      console.error('[IntentPage] Submission error:', error);
      
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUBMISSION_ERROR',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedIntent = INTENT_TYPES.find(t => t.value === intentType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Intent Submission</h1>
        <p className="text-gray-400 text-sm">
          Submit structured intents to Vienna OS through the governed execution path.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Submit Intent</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Intent Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Intent Type
              </label>
              <select
                value={intentType}
                onChange={(e) => setIntentType(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                disabled={loading}
              >
                {INTENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {selectedIntent && (
                <p className="text-xs text-gray-400 mt-1">{selectedIntent.description}</p>
              )}
            </div>

            {/* Quick Load Test Cases */}
            {intentType === 'test_execution' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quick Load Test Case
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TEST_PAYLOADS).map(([key, payload]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleQuickLoad(key as keyof typeof TEST_PAYLOADS)}
                      className="text-xs px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 hover:border-blue-500 transition"
                      disabled={loading}
                    >
                      {payload.description}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payload JSON */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payload (JSON)
              </label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 font-mono text-sm"
                rows={8}
                disabled={loading}
                placeholder='{"mode": "success"}'
              />
            </div>

            {/* Simulation Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="simulation"
                checked={simulation}
                onChange={(e) => setSimulation(e.target.checked)}
                className="w-4 h-4"
                disabled={loading}
              />
              <label htmlFor="simulation" className="text-sm text-gray-300">
                Simulation Mode (Dry Run)
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Intent'}
            </button>
          </form>
        </div>

        {/* Result Panel */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Result</h2>
          
          {!result && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No result yet. Submit an intent to see the response.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded text-sm font-medium ${
                  result.success 
                    ? 'bg-green-900 text-green-200 border border-green-700'
                    : 'bg-red-900 text-red-200 border border-red-700'
                }`}>
                  {result.success ? 'Success' : 'Failed'}
                </div>
                {result.code && (
                  <div className="text-xs text-gray-400">
                    {result.code}
                  </div>
                )}
              </div>

              {/* Error */}
              {!result.success && result.error && (
                <div className="bg-red-900 border border-red-700 rounded p-3">
                  <p className="text-sm text-red-200 font-medium mb-1">Error</p>
                  <p className="text-xs text-red-300">{result.error}</p>
                </div>
              )}

              {/* Success Data */}
              {result.success && result.data && (
                <>
                  {/* Core IDs */}
                  <div className="space-y-2">
                    <ResultRow label="Intent ID" value={result.data.intent_id} />
                    <ResultRow label="Tenant ID" value={result.data.tenant_id} />
                    {result.data.execution_id && (
                      <ResultRow label="Execution ID" value={result.data.execution_id} />
                    )}
                    <ResultRow label="Action" value={result.data.action} />
                    {result.data.simulation && (
                      <ResultRow label="Simulation" value="true" highlight="blue" />
                    )}
                  </div>

                  {/* Explanation */}
                  {result.data.explanation && (
                    <div className="bg-blue-900 border border-blue-700 rounded p-3">
                      <p className="text-sm text-blue-200 font-medium mb-1">Explanation</p>
                      <p className="text-xs text-blue-300">{result.data.explanation}</p>
                    </div>
                  )}

                  {/* Attestation */}
                  {result.data.attestation && (
                    <div className="bg-purple-900 border border-purple-700 rounded p-3">
                      <p className="text-sm text-purple-200 font-medium mb-2">Attestation</p>
                      <div className="space-y-1 text-xs">
                        <ResultRow 
                          label="ID" 
                          value={result.data.attestation.attestation_id} 
                          compact 
                        />
                        <ResultRow 
                          label="Status" 
                          value={result.data.attestation.status} 
                          compact 
                        />
                        <ResultRow 
                          label="Attested At" 
                          value={new Date(result.data.attestation.attested_at).toLocaleString()} 
                          compact 
                        />
                      </div>
                    </div>
                  )}

                  {/* Cost */}
                  {result.data.cost && (
                    <div className="bg-yellow-900 border border-yellow-700 rounded p-3">
                      <p className="text-sm text-yellow-200 font-medium mb-2">Cost</p>
                      <div className="space-y-1 text-xs">
                        <ResultRow 
                          label="Total" 
                          value={`$${result.data.cost.total_cost.toFixed(6)}`} 
                          compact 
                        />
                        <ResultRow 
                          label="Input Tokens" 
                          value={result.data.cost.input_tokens.toString()} 
                          compact 
                        />
                        <ResultRow 
                          label="Output Tokens" 
                          value={result.data.cost.output_tokens.toString()} 
                          compact 
                        />
                      </div>
                    </div>
                  )}

                  {/* Quota State */}
                  {result.data.quota_state && (
                    <div className="bg-orange-900 border border-orange-700 rounded p-3">
                      <p className="text-sm text-orange-200 font-medium mb-2">Quota State</p>
                      <div className="space-y-1 text-xs">
                        <ResultRow 
                          label="Available" 
                          value={`${result.data.quota_state.available.toFixed(2)} units`} 
                          compact 
                        />
                        <ResultRow 
                          label="Utilization" 
                          value={`${(result.data.quota_state.utilization * 100).toFixed(1)}%`} 
                          compact 
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {result.data.metadata && Object.keys(result.data.metadata).length > 0 && (
                    <div className="bg-gray-700 border border-gray-600 rounded p-3">
                      <p className="text-sm text-gray-300 font-medium mb-2">Metadata</p>
                      <pre className="text-xs text-gray-400 overflow-x-auto">
                        {JSON.stringify(result.data.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-md font-semibold text-white mb-3">Architecture</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <strong className="text-gray-300">Governed Execution Path:</strong> This interface submits structured intents 
            directly to <code className="text-blue-400">POST /api/v1/intent</code> through Vienna's Intent Gateway.
          </p>
          <p>
            <strong className="text-gray-300">Distinct from Chat:</strong> The conversational chat interface (Ollama/LLM) 
            is for operator guidance and help. This is for explicit, governed execution.
          </p>
          <p>
            <strong className="text-gray-300">Agent Connectivity:</strong> External agents can submit intents through 
            the same endpoint with proper authentication and tenant context.
          </p>
          <p>
            <strong className="text-gray-300">Governance:</strong> All submissions pass through quota enforcement, 
            cost tracking, policy evaluation, and attestation generation.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  compact?: boolean;
  highlight?: 'blue' | 'green' | 'yellow';
}

function ResultRow({ label, value, compact = false, highlight }: ResultRowProps) {
  const highlightClasses = {
    blue: 'text-blue-300',
    green: 'text-green-300',
    yellow: 'text-yellow-300',
  };

  return (
    <div className={`flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className="text-gray-400 min-w-[100px]">{label}:</span>
      <span className={`text-gray-200 break-all ${highlight ? highlightClasses[highlight] : ''}`}>
        {value}
      </span>
    </div>
  );
}
