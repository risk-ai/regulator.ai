/**
 * Mobile Approval Card
 * 
 * Optimized approval interface for mobile devices
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive.js';

interface MobileApprovalCardProps {
  id: string;
  title: string;
  description: string;
  tier: 'T0' | 'T1' | 'T2';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  requestedAt: string;
  estimatedDuration?: string;
  riskFactors?: string[];
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason?: string) => void;
}

const TIER_CONFIG = {
  T0: { color: '#94a3b8', label: 'Auto' },
  T1: { color: '#fbbf24', label: 'Single' },
  T2: { color: '#f87171', label: 'Multi-Party' }
};

const PRIORITY_CONFIG = {
  low: { color: '#94a3b8', icon: '●' },
  medium: { color: '#fbbf24', icon: '●' },
  high: { color: '#f97316', icon: '▲' },
  critical: { color: '#f87171', icon: '🚨' }
};

export function MobileApprovalCard({
  id,
  title,
  description,
  tier,
  priority,
  requestedBy,
  requestedAt,
  estimatedDuration,
  riskFactors = [],
  onApprove,
  onReject
}: MobileApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { isMobile } = useResponsive();

  const tierConfig = TIER_CONFIG[tier];
  const priorityConfig = PRIORITY_CONFIG[priority];

  const handleApprove = async () => {
    if (!onApprove || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onApprove(id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onReject(id, rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span 
              style={{ color: tierConfig.color }}
              className="text-xs font-mono font-bold px-2 py-1 border border-current rounded"
            >
              {tier}
            </span>
            <span 
              style={{ color: priorityConfig.color }}
              className="text-sm"
            >
              {priorityConfig.icon}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(requestedAt)}
          </div>
        </div>

        <h3 className="font-semibold text-[var(--text-primary)] mb-2 leading-tight">
          {title}
        </h3>
        
        <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-tertiary)]">
            by {requestedBy}
            {estimatedDuration && ` • ${estimatedDuration}`}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
          {riskFactors.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--warning-text)]" />
                Risk Factors
              </h4>
              <ul className="space-y-1">
                {riskFactors.map((factor, index) => (
                  <li key={index} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    <span className="w-1 h-1 bg-[var(--warning-text)] rounded-full"></span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-[var(--border-subtle)] p-4">
        {!showRejectDialog ? (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--success-text)] hover:bg-[var(--success-bright)] disabled:bg-[var(--success-text)]/50 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              {isProcessing ? 'Approving...' : 'Approve'}
            </button>
            
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-[var(--error-border)] text-[var(--error-text)] hover:bg-[var(--error-bg)] disabled:opacity-50 rounded-lg font-medium transition-colors text-sm"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-semibold text-[var(--text-primary)] text-sm">
              Reason for rejection (optional)
            </h4>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a brief explanation..."
              className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 py-2 px-4 bg-[var(--error-text)] hover:bg-[var(--error-bright)] disabled:bg-[var(--error-text)]/50 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
                disabled={isProcessing}
                className="flex-1 py-2 px-4 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 rounded-lg font-medium transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}