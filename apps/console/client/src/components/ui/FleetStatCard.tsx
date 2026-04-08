/**
 * FleetStatCard Component
 * 
 * Compact stat card for fleet overview metrics
 * Used in fleet stats row
 */

import React from 'react';

interface FleetStatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  statusBar?: {
    segments: Array<{ value: number; color: string; label: string }>;
  };
  variant?: 'default' | 'success' | 'warning' | 'critical';
  loading?: boolean;
}

export function FleetStatCard({
  label,
  value,
  unit,
  subtext,
  statusBar,
  variant = 'default',
  loading = false
}: FleetStatCardProps) {
  const variantColors = {
    default: 'text-white',
    success: 'text-[#10b981]',
    warning: 'text-[#f59e0b]',
    critical: 'text-[#ef4444]',
  };

  const variantBg = {
    default: 'bg-[#12131a]',
    success: 'bg-[#12131a]',
    warning: 'bg-[#12131a]',
    critical: 'bg-gradient-to-br from-[#12131a] to-[#201010]',
  };

  if (loading) {
    return (
      <div className={`${variantBg[variant]} border border-[rgba(255,255,255,0.06)] rounded-[6px] p-4 flex flex-col gap-2 animate-pulse`}>
        <div className="h-3 w-24 bg-[rgba(255,255,255,0.1)] rounded" />
        <div className="h-6 w-16 bg-[rgba(255,255,255,0.1)] rounded" />
        <div className="h-2 w-full bg-[rgba(255,255,255,0.1)] rounded mt-auto" />
      </div>
    );
  }

  return (
    <div className={`${variantBg[variant]} border border-[rgba(255,255,255,0.06)] rounded-[6px] p-4 flex flex-col gap-2`}>
      {/* Label */}
      <div className="text-[10px] font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.05em]">
        {label}
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-[24px] font-bold ${variantColors[variant]}`}>
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[11px] text-[rgba(255,255,255,0.7)] font-medium">
            {unit}
          </span>
        )}
      </div>
      
      {/* Subtext or Status Bar */}
      <div className="mt-auto">
        {statusBar ? (
          <>
            {/* Multi-segment bar */}
            <div className="flex h-1 rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)] mb-2">
              {statusBar.segments.map((segment, index) => (
                <div
                  key={index}
                  className={`bg-${segment.color}`}
                  style={{ width: `${segment.value}%` }}
                  title={segment.label}
                />
              ))}
            </div>
            {/* Labels */}
            <div className="flex gap-4 text-[9px] font-mono">
              {statusBar.segments.map((segment, index) => (
                <span key={index} className={`text-${segment.color}`}>
                  ● {segment.label}
                </span>
              ))}
            </div>
          </>
        ) : subtext ? (
          <div className={`text-[10px] uppercase tracking-tighter ${
            variant === 'success' ? 'text-[rgba(255,255,255,0.55)]' :
            variant === 'warning' ? 'text-[rgba(255,255,255,0.55)]' :
            variant === 'critical' ? 'text-[#ef4444] font-semibold' :
            'text-[rgba(255,255,255,0.55)]'
          }`}>
            {subtext}
          </div>
        ) : null}
      </div>
    </div>
  );
}
