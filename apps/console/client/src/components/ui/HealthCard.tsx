/**
 * HealthCard Component
 * 
 * System health status card with status indicator, metrics, and health bar
 * Used in dashboard system health grid
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface HealthCardProps {
  title: string;
  icon: LucideIcon;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  metrics?: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  healthPercentage?: number; // 0-100
  loading?: boolean;
}

export function HealthCard({
  title,
  icon: Icon,
  status,
  metrics = [],
  healthPercentage,
  loading = false
}: HealthCardProps) {
  const statusConfig = {
    healthy: {
      label: 'Healthy',
      color: 'emerald-500',
      bg: 'emerald-500/10',
      border: 'emerald-500/30',
      glow: '0_0_10px_rgba(16,185,129,0.5)',
    },
    degraded: {
      label: 'Degraded',
      color: 'amber-500',
      bg: 'amber-500/10',
      border: 'amber-500/30',
      glow: '0_0_10px_rgba(245,158,11,0.5)',
    },
    critical: {
      label: 'Critical',
      color: 'red-500',
      bg: 'red-500/10',
      border: 'red-500/30',
      glow: '0_0_10px_rgba(239,68,68,0.5)',
    },
    unknown: {
      label: 'Unknown',
      color: 'gray-500',
      bg: 'gray-500/10',
      border: 'gray-500/30',
      glow: 'none',
    },
  };

  const config = statusConfig[status];

  if (loading) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 relative overflow-hidden animate-pulse">
        <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded mb-8" />
        <div className="space-y-4">
          <div className="h-4 w-full bg-[rgba(255,255,255,0.1)] rounded" />
          <div className="h-4 w-3/4 bg-[rgba(255,255,255,0.1)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 relative overflow-hidden hover:border-[rgba(255,255,255,0.12)] transition-colors">
      {/* Background Icon */}
      <Icon className={`absolute -right-4 -bottom-4 w-28 h-28 text-${config.color}/5`} />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <Icon className={`w-6 h-6 text-${config.color}`} />
          <span className="text-[16px] font-bold text-white">{title}</span>
        </div>
        <span className={`px-3 py-1 bg-${config.bg} border border-${config.border} rounded-full text-[11px] font-bold text-${config.color} uppercase tracking-widest`}>
          {config.label}
        </span>
      </div>
      
      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-8 text-[13px] mb-6 relative z-10">
          {metrics.map((metric, index) => (
            <div key={index}>
              <div className="text-[rgba(255,255,255,0.55)] mb-1">{metric.label}</div>
              <div className={`font-bold font-mono text-lg ${
                metric.highlight ? `text-${config.color}` : 'text-white'
              }`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Health Bar */}
      {healthPercentage !== undefined && (
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
          <div 
            className={`h-full bg-${config.color}`}
            style={{ 
              width: `${healthPercentage}%`,
              boxShadow: config.glow !== 'none' ? config.glow : undefined
            }}
          />
        </div>
      )}
    </div>
  );
}
