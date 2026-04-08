/**
 * MetricCard Component
 * 
 * KPI card with value, trend, and mini sparkline
 * Used in dashboard summary metrics row
 */

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  sparkline?: number[]; // Array of percentage heights (0-100)
  status?: 'healthy' | 'warning' | 'critical';
  loading?: boolean;
}

export function MetricCard({ 
  label, 
  value, 
  trend, 
  sparkline, 
  status = 'healthy',
  loading = false 
}: MetricCardProps) {
  const statusColors = {
    healthy: 'emerald-500',
    warning: 'amber-500',
    critical: 'red-500',
  };

  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    neutral: 'text-[rgba(255,255,255,0.55)]',
  };

  const sparklineColor = statusColors[status];

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 flex flex-col gap-6 shadow-lg animate-pulse">
        <div className="h-3 w-24 bg-[rgba(255,255,255,0.1)] rounded" />
        <div className="h-12 w-32 bg-[rgba(255,255,255,0.1)] rounded" />
        <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 flex flex-col gap-6 shadow-lg hover:border-violet-500/30 transition-colors">
      {/* Label */}
      <div className="text-[12px] font-bold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.1em]">
        {label}
      </div>
      
      {/* Value */}
      <div className="text-[48px] font-bold text-white font-mono leading-none">
        {value}
      </div>
      
      {/* Trend (if provided) */}
      {trend && (
        <div className="flex items-center gap-3 text-[13px]">
          <span className={`font-bold ${trendColors[trend.direction]}`}>
            {trend.value}
          </span>
          <span className="text-[rgba(255,255,255,0.55)]">vs last hour</span>
        </div>
      )}
      
      {/* Sparkline */}
      <div className="flex gap-[3px] items-end h-10">
        {sparkline && sparkline.length > 0 ? (
          sparkline.map((height, index) => (
            <div
              key={index}
              className={`flex-1 bg-${sparklineColor} rounded-sm`}
              style={{ 
                height: `${height}%`,
                opacity: 0.5 + (height / 200) // Variable opacity based on height
              }}
            />
          ))
        ) : (
          // Empty state: show flat line
          <div className="flex-1 h-2 bg-[rgba(255,255,255,0.06)] rounded" />
        )}
      </div>
    </div>
  );
}
