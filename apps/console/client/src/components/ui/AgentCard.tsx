/**
 * AgentCard Component
 * 
 * Individual agent card with profile, status, metrics, sparkline, and controls
 * Used in fleet dashboard grid
 */

import React from 'react';
import { Bot, Brain, Cpu, Server } from 'lucide-react';

export interface Agent {
  id: string;
  name: string;
  shortId: string; // e.g., "a8f-2219-c901"
  status: 'active' | 'idle' | 'suspended' | 'error';
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  trustScore: number; // 0-100
  executions24h: number;
  heartbeatRelative: string; // e.g., "4s ago"
  sparklineData?: number[]; // Array of values for SVG path
}

interface AgentCardProps {
  agent: Agent;
  onSuspend?: (agentId: string) => void;
  onAdjust?: (agentId: string) => void;
  loading?: boolean;
}

export function AgentCard({ agent, onSuspend, onAdjust, loading = false }: AgentCardProps) {
  // Status configuration
  const statusConfig = {
    active: {
      label: 'Active',
      color: '#10b981',
      bgColor: 'rgba(16,185,129,0.08)',
      borderColor: 'rgba(16,185,129,0.2)',
      pulse: true,
      barColor: '#10b981',
      sparklineColor: '#7c3aed',
    },
    idle: {
      label: 'Idle',
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.08)',
      borderColor: 'rgba(245,158,11,0.2)',
      pulse: false,
      barColor: '#f59e0b',
      sparklineColor: '#fbbf24',
    },
    suspended: {
      label: 'Suspended',
      color: '#ef4444',
      bgColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.2)',
      pulse: false,
      barColor: '#ef4444',
      sparklineColor: '#ef4444',
    },
    error: {
      label: 'Error',
      color: '#ef4444',
      bgColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.2)',
      pulse: false,
      barColor: '#ef4444',
      sparklineColor: '#ef4444',
    },
  };

  const tierConfig = {
    T0: { label: 'T0', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', text: '#10b981', subtext: 'MAX CLEARANCE' },
    T1: { label: 'T1', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', subtext: 'HIGH CLEARANCE' },
    T2: { label: 'T2', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', text: '#fbbf24', subtext: 'MODERATE RISK' },
    T3: { label: 'T3', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', subtext: 'HIGH RISK' },
  };

  const status = statusConfig[agent.status];
  const tier = tierConfig[agent.tier];

  // Icon selection based on tier
  const AgentIcon = agent.tier === 'T0' ? Bot : agent.tier === 'T1' ? Brain : agent.tier === 'T2' ? Cpu : Server;

  // Generate SVG path from sparkline data
  const generateSparklinePath = (data?: number[]) => {
    if (!data || data.length === 0) {
      return 'M0,10 L100,10'; // Flat line
    }
    
    const maxValue = Math.max(...data);
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 20 - ((value / maxValue) * 15); // Scale to fit in 20px height
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  };

  if (loading) {
    return (
      <div className="bg-[#12131a] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-5 flex flex-col gap-5 animate-pulse pb-6">
        <div className="flex justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.1)]" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-[rgba(255,255,255,0.1)] rounded" />
              <div className="h-3 w-24 bg-[rgba(255,255,255,0.1)] rounded" />
            </div>
          </div>
        </div>
        <div className="h-12 w-full bg-[rgba(255,255,255,0.1)] rounded" />
        <div className="h-8 w-full bg-[rgba(255,255,255,0.1)] rounded" />
      </div>
    );
  }

  return (
    <div 
      className="bg-[#12131a] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-5 flex flex-col gap-5 pb-6 relative hover:bg-[#1a1b26] hover:border-[rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200"
      style={{ borderLeft: `4px solid ${status.barColor}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#1a1b26] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
            <AgentIcon className="w-6 h-6" style={{ color: tier.text }} />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white leading-tight">{agent.name}</div>
            <div className="font-mono text-[10px] text-[rgba(255,255,255,0.55)] tracking-tight uppercase">
              ID: {agent.shortId}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
            style={{ 
              background: tier.bg, 
              border: `1px solid`, 
              borderColor: tier.border, 
              color: tier.text 
            }}
          >
            {tier.label}
          </span>
          <span className="font-mono text-[8px] text-[rgba(255,255,255,0.35)] uppercase tracking-tight">
            {tier.subtext}
          </span>
        </div>
      </div>

      {/* Status & Execution Count */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full"
          style={{ background: status.bgColor, border: `1px solid ${status.borderColor}` }}
        >
          <div 
            className={`w-2.5 h-2.5 rounded-full ${status.pulse ? 'animate-pulse' : ''}`}
            style={{ background: status.color }}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-[rgba(255,255,255,0.35)] uppercase mb-1">Executions (24h)</div>
          <div className="font-mono text-[13px] font-bold text-white">
            {agent.executions24h.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-12 w-full bg-[rgba(255,255,255,0.02)] rounded p-2 border border-[rgba(255,255,255,0.04)]">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
          <path 
            d={generateSparklinePath(agent.sparklineData)}
            fill="none" 
            stroke={status.sparklineColor}
            strokeWidth="1.5" 
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 4px ${status.sparklineColor}30)` }}
          />
        </svg>
      </div>

      {/* Trust Score */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.05em]">
              Trust Integrity
            </span>
            <span className="font-mono text-[11px] font-bold" style={{ color: status.color }}>
              {agent.trustScore}%
            </span>
          </div>
          <div className="h-[6px] w-full bg-[rgba(255,255,255,0.08)] rounded-full">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${agent.trustScore}%`,
                background: status.color,
                boxShadow: `0 0 8px ${status.color}66`
              }}
            />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.05em]">
            Heartbeat
          </span>
          <span className="font-mono text-[11px] text-[rgba(255,255,255,0.7)]">
            {agent.heartbeatRelative}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onSuspend?.(agent.id)}
          className="flex-1 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] rounded text-[11px] font-bold hover:bg-[rgba(239,68,68,0.15)] transition-colors uppercase"
        >
          ⏸ Suspend
        </button>
        <button
          onClick={() => onAdjust?.(agent.id)}
          className="flex-1 py-2 bg-transparent border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)] rounded text-[11px] font-bold hover:bg-[rgba(255,255,255,0.03)] transition-colors uppercase"
        >
          🎚 Adjust
        </button>
      </div>

      {/* Bottom Health Bar */}
      <div 
        className="h-[3px] w-full absolute bottom-0 left-0"
        style={{ background: status.barColor }}
      />
    </div>
  );
}
