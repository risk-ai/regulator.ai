/**
 * Approval Detail Modal (Phase 17 Stage 4)
 * 
 * Detailed view of approval with context, policy, and linked entities.
 */

import React, { useState, useEffect } from 'react';
import { getApprovalDetail, type ApprovalDetail } from '../../api/approvals';
import { formatDistanceToNow } from 'date-fns';

interface ApprovalDetailModalProps {
  approval_id: string;
  onClose: () => void;
}

export function ApprovalDetailModal({ approval_id, onClose }: ApprovalDetailModalProps) {
  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getApprovalDetail(approval_id);
        setDetail(data);
      } catch (err) {
        console.error('Failed to load approval detail:', err);
        setError(err instanceof Error ? err.message : 'Failed to load detail');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [approval_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-200">
            Approval Detail
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {/* Approval info */}
              <div>
                <h3 className="text-sm font-medium text-neutral-300 mb-3">Approval</h3>
                <div className="bg-neutral-950/50 border border-neutral-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        detail.approval.tier === 'T2'
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {detail.approval.tier}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        detail.approval.status === 'pending'
                          ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30'
                          : detail.approval.status === 'approved'
                          ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                          : 'bg-red-900/30 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {detail.approval.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Action</div>
                    <div className="text-sm text-neutral-200">{detail.approval.action_summary}</div>
                  </div>

                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Target</div>
                    <div className="text-sm text-neutral-200 font-mono">{detail.approval.target_id}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-neutral-500 mb-1">Requested by</div>
                      <div className="text-neutral-300">{detail.approval.requested_by}</div>
                    </div>
                    <div>
                      <div className="text-neutral-500 mb-1">Requested</div>
                      <div className="text-neutral-300">
                        {formatDistanceToNow(detail.approval.requested_at, { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {detail.approval.expires_at && (
                    <div className="text-xs">
                      <div className="text-neutral-500 mb-1">Expires</div>
                      <div
                        className={
                          detail.approval.is_expired
                            ? 'text-red-400'
                            : detail.approval.time_until_expiry_ms && detail.approval.time_until_expiry_ms < 5 * 60 * 1000
                            ? 'text-amber-400'
                            : 'text-neutral-300'
                        }
                      >
                        {detail.approval.is_expired
                          ? 'Expired'
                          : formatDistanceToNow(detail.approval.expires_at, { addSuffix: true })}
                      </div>
                    </div>
                  )}

                  {detail.approval.reviewed_by && (
                    <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-neutral-700">
                      <div>
                        <div className="text-neutral-500 mb-1">Reviewed by</div>
                        <div className="text-neutral-300">{detail.approval.reviewed_by}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500 mb-1">Reviewed</div>
                        <div className="text-neutral-300">
                          {detail.approval.reviewed_at
                            ? formatDistanceToNow(detail.approval.reviewed_at, { addSuffix: true })
                            : '-'}
                        </div>
                      </div>
                    </div>
                  )}

                  {detail.approval.decision_reason && (
                    <div className="text-xs pt-3 border-t border-neutral-700">
                      <div className="text-neutral-500 mb-1">Decision reason</div>
                      <div className="text-neutral-300">{detail.approval.decision_reason}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan context */}
              {detail.plan && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Plan</h3>
                  <div className="bg-neutral-950/50 border border-neutral-700/50 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Plan ID</div>
                      <div className="text-sm text-neutral-300 font-mono">{detail.plan.plan_id}</div>
                    </div>

                    {detail.plan.objective && (
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Objective</div>
                        <div className="text-sm text-neutral-200">{detail.plan.objective}</div>
                      </div>
                    )}

                    {detail.plan.workflow_type && (
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Workflow</div>
                        <div className="text-sm text-neutral-300">{detail.plan.workflow_type}</div>
                      </div>
                    )}

                    {detail.plan.steps && detail.plan.steps.length > 0 && (
                      <div>
                        <div className="text-xs text-neutral-500 mb-2">Steps</div>
                        <div className="space-y-2">
                          {detail.plan.steps.map((step: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs bg-neutral-900/50 border border-neutral-700/30 rounded p-2"
                            >
                              <span className="text-neutral-500">{idx + 1}.</span>
                              <div className="flex-1">
                                <div className="text-neutral-300">{step.action_type}</div>
                                {step.target && (
                                  <div className="text-neutral-500 mt-0.5">{step.target}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Execution context */}
              {detail.execution && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Execution</h3>
                  <div className="bg-neutral-950/50 border border-neutral-700/50 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">Execution ID</div>
                      <div className="text-sm text-neutral-300 font-mono">{detail.execution.execution_id}</div>
                    </div>

                    {detail.execution.status && (
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Status</div>
                        <div className="text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              detail.execution.status === 'completed'
                                ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                                : detail.execution.status === 'failed'
                                ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                                : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {detail.execution.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {detail.approval.metadata && Object.keys(detail.approval.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Metadata</h3>
                  <div className="bg-neutral-950/50 border border-neutral-700/50 rounded-lg p-4">
                    <pre className="text-xs text-neutral-400 font-mono overflow-x-auto">
                      {JSON.stringify(detail.approval.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
