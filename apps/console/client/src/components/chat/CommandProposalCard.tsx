/**
 * Command Proposal Card
 * Phase 6.8: Frontend approval workflow for system commands
 */

import React, { useState } from 'react';
import { chatApi } from '../../api/chat.js';
import type { SystemCommandProposal } from '../../api/chat.js';
import { useAuthStore } from '../../store/authStore.js';

interface CommandProposalCardProps {
  proposal: SystemCommandProposal;
  onExecuted?: (result: any) => void;
  onRejected?: () => void;
}

export function CommandProposalCard({
  proposal,
  onExecuted,
  onRejected,
}: CommandProposalCardProps) {
  const operator = useAuthStore((state) => state.operator) || 'system';
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setExecuting(true);
    setError(null);

    try {
      // Convert proposal to action format for approval endpoint
      const action = {
        instruction_type: proposal.command,
        args: proposal.args || [],
        risk_tier: proposal.risk_tier,
        proposal_id: proposal.proposal_id,
      };

      // Call approval endpoint (Phase 7.5e)
      const approvalResult = await chatApi.approveAction(
        action,
        operator
      );

      setResult(approvalResult.result);
      setExecuted(true);

      if (onExecuted) {
        onExecuted(approvalResult.result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  const handleReject = async () => {
    try {
      // Convert proposal to action format for denial endpoint
      const action = {
        instruction_type: proposal.command,
        args: proposal.args || [],
        risk_tier: proposal.risk_tier,
        proposal_id: proposal.proposal_id,
      };

      // Call denial endpoint (Phase 7.5e)
      await chatApi.denyAction(action, 'Operator rejected');

      setRejected(true);
      if (onRejected) {
        onRejected();
      }
    } catch (err) {
      console.error('[CommandProposalCard] Error denying action:', err);
      // Still mark as rejected even if API call fails
      setRejected(true);
      if (onRejected) {
        onRejected();
      }
    }
  };

  // Risk tier badge color
  const riskTierColor = {
    T0: 'bg-green-900 text-green-300',
    T1: 'bg-yellow-900 text-yellow-300',
    T2: 'bg-red-900 text-red-300',
  }[proposal.risk_tier] || 'bg-gray-700 text-gray-300';

  // Category badge color
  const categoryColor = {
    read_only: 'bg-blue-900 text-blue-300',
    side_effect: 'bg-orange-900 text-orange-300',
    dangerous: 'bg-red-900 text-red-300',
  }[proposal.category] || 'bg-gray-700 text-gray-300';

  if (rejected) {
    return (
      <div className="border border-gray-600 rounded-lg p-4 bg-gray-800 opacity-60">
        <div className="text-gray-400 text-sm">
          ✗ Command proposal rejected
        </div>
      </div>
    );
  }

  if (executed) {
    return (
      <div className="border border-green-600 rounded-lg p-4 bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-400 text-lg">✓</span>
          <span className="text-white font-semibold">Command Executed</span>
        </div>

        <div className="text-sm text-gray-300 mb-2">
          <span className="text-gray-400">Command:</span> {proposal.command_string}
        </div>

        {result?.result && (
          <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Result:</div>
            <pre className="text-sm text-green-300 whitespace-pre-wrap">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-900 bg-opacity-20 rounded border border-red-600">
            <div className="text-xs text-red-400 mb-1">Error:</div>
            <div className="text-sm text-red-300">{error}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-yellow-600 rounded-lg p-4 bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-lg">⚡</span>
          <span className="text-white font-semibold">Command Approval Required</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColor}`}>
            {proposal.category.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${riskTierColor}`}>
            {proposal.risk_tier}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-gray-300 mb-3">
        {proposal.description}
      </div>

      {/* Command string */}
      <div className="mb-3 p-3 bg-gray-900 rounded border border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Command:</div>
        <code className="text-sm text-blue-300 font-mono">
          {proposal.command_string}
        </code>
      </div>

      {/* Warrant requirement */}
      {proposal.requires_warrant && (
        <div className="mb-3 flex items-center gap-2 text-sm text-yellow-300">
          <span>⚠</span>
          <span>This command requires operator approval (warrant will be issued)</span>
        </div>
      )}

      {/* Metadata */}
      <div className="mb-4 text-xs text-gray-500">
        <div>Proposed by: {proposal.proposed_by}</div>
        <div>Proposal ID: {proposal.proposal_id}</div>
      </div>

      {/* Actions */}
      {error && (
        <div className="mb-3 p-3 bg-red-900 bg-opacity-20 rounded border border-red-600">
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={executing}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          {executing ? 'Executing...' : 'Approve & Execute'}
        </button>
        <button
          onClick={handleReject}
          disabled={executing}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
