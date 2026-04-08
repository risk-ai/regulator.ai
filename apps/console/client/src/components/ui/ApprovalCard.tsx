/**
 * ApprovalCard Component
 * 
 * Approval request card with tier-based styling, countdown, and quick actions
 */

import React from 'react';
import { Bot, CheckCircle, XCircle } from 'lucide-react';

export interface ApprovalRequest {
  id: string;
  tier: 'T1' | 'T2' | 'T3';
  action: string;
  title: string;
  description: string;
  expiresInSeconds: number;
  requestedAgo: string;
  agent: string;
  target?: string;
  details?: Record<string, string>;
}

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function ApprovalCard({ request, onApprove, onDeny, selected, onSelect }: ApprovalCardProps) {
  const tierConfig = {
    T1: { 
      label: 'Tier 1', 
      bg: 'bg-amber-900/40', 
      text: 'text-amber-400', 
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      cardBorder: 'border-amber-500/20',
      timerColor: 'text-amber-500',
    },
    T2: { 
      label: 'Tier 2', 
      bg: 'bg-red-900/40', 
      text: 'text-red-400', 
      border: 'border-red-500/40',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
      cardBorder: 'border-red-500/30',
      timerColor: 'text-red-500',
    },
    T3: { 
      label: 'Tier 3', 
      bg: 'bg-red-900/50', 
      text: 'text-red-500', 
      border: 'border-red-500/50',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.7)]',
      cardBorder: 'border-red-500/40',
      timerColor: 'text-red-600',
    },
  };

  const tier = tierConfig[request.tier];
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex gap-4">
      {/* Checkbox */}
      <div className="pt-6">
        <input 
          type="checkbox" 
          checked={selected}
          onChange={(e) => onSelect?.(request.id, e.target.checked)}
          className={`w-5 h-5 rounded cursor-pointer accent-${request.tier === 'T1' ? 'amber' : 'red'}-500`}
        />
      </div>
      
      {/* Card */}
      <div className={`flex-1 bg-[#12131a] border-2 ${tier.cardBorder} ${tier.glow} rounded-xl p-6 transition-all hover:bg-[#1a1b26]`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 ${tier.bg} ${tier.text} border ${tier.border} rounded text-[11px] font-bold tracking-widest uppercase`}>
                {tier.label}
              </span>
              <span className="text-[rgba(255,255,255,0.35)] text-xs font-mono uppercase tracking-tighter">
                Action: {request.action}
              </span>
            </div>
            <h4 className="text-lg font-bold text-white">{request.title}</h4>
            {request.description && (
              <p className="mt-2 text-[14px] text-[rgba(255,255,255,0.55)] leading-relaxed">
                {request.description}
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-[10px] text-[rgba(255,255,255,0.35)] font-bold uppercase mb-1">Expires In</div>
            <div className={`text-2xl font-mono ${tier.timerColor} font-bold`}>
              {formatTime(request.expiresInSeconds)}
            </div>
          </div>
        </div>
        
        {/* Details */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-xs text-[rgba(255,255,255,0.55)]">
          {request.target && (
            <div className="flex flex-col gap-1">
              <span className="uppercase font-bold tracking-tighter text-[10px]">Target</span>
              <span className="text-white font-mono">{request.target}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="uppercase font-bold tracking-tighter text-[10px]">Requested</span>
            <span className="text-white">{request.requestedAgo}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="uppercase font-bold tracking-tighter text-[10px]">Agent</span>
            <span className="text-white font-mono flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {request.agent}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onApprove?.(request.id)}
            className="flex-[2] h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
            <span className="ml-auto text-[10px] opacity-70">A</span>
          </button>
          <button
            onClick={() => onDeny?.(request.id)}
            className="flex-1 h-10 bg-[#1a1b26] border border-white/10 hover:bg-white/10 text-[rgba(255,255,255,0.7)] rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <XCircle className="w-4 h-4" />
            Deny
            <span className="ml-auto text-[10px] opacity-70">D</span>
          </button>
        </div>
      </div>
    </div>
  );
}
