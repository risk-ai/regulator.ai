/**
 * Loading Skeleton Components
 * Content-aware loading states for better perceived performance
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base skeleton shimmer effect
 */
export function Skeleton({ className = '', style = {} }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style
      }}
    />
  );
}

/**
 * Approval Card Skeleton
 * Matches ApprovalCard layout
 */
export function ApprovalCardSkeleton() {
  return (
    <div 
      className="rounded-lg border p-4 mb-3"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      {/* Header with tier badge and action type */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton style={{ width: '32px', height: '20px' }} />
            <Skeleton style={{ width: '80px', height: '16px' }} />
          </div>
          <Skeleton style={{ width: '100%', height: '18px', marginBottom: '8px' }} />
        </div>
      </div>

      {/* Target */}
      <Skeleton style={{ width: '60%', height: '14px', marginBottom: '12px' }} />

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Skeleton style={{ width: '100%', height: '14px' }} />
        <Skeleton style={{ width: '100%', height: '14px' }} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <Skeleton style={{ width: '50%', height: '36px' }} />
        <Skeleton style={{ width: '50%', height: '36px' }} />
      </div>
    </div>
  );
}

/**
 * Approval List Skeleton
 * Shows 3 approval cards loading
 */
export function ApprovalListSkeleton() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <ApprovalCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Agent Card Skeleton (Fleet page)
 */
export function AgentCardSkeleton() {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton style={{ width: '8px', height: '8px', borderRadius: '50%' }} />
          <Skeleton style={{ width: '120px', height: '16px' }} />
        </div>
        <Skeleton style={{ width: '60px', height: '20px' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '18px', marginBottom: '12px' }} />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton style={{ width: '100%', height: '14px' }} />
        <Skeleton style={{ width: '100%', height: '14px' }} />
        <Skeleton style={{ width: '100%', height: '14px' }} />
        <Skeleton style={{ width: '100%', height: '14px' }} />
      </div>
    </div>
  );
}

/**
 * Fleet Grid Skeleton
 */
export function FleetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AgentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Fleet Table Skeleton (Desktop)
 */
export function FleetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
          <Skeleton style={{ width: '60px', height: '16px' }} />
          <Skeleton style={{ width: '120px', height: '16px' }} />
          <Skeleton style={{ width: '150px', height: '16px' }} />
          <Skeleton style={{ width: '60px', height: '16px' }} />
          <Skeleton style={{ width: '80px', height: '16px' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Execution Card Skeleton
 */
export function ExecutionCardSkeleton() {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton style={{ width: '40px', height: '20px' }} />
          <Skeleton style={{ width: '60px', height: '20px' }} />
        </div>
        <Skeleton style={{ width: '80px', height: '14px' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '16px', marginBottom: '12px' }} />
      <div className="flex items-center gap-4">
        <Skeleton style={{ width: '80px', height: '14px' }} />
        <Skeleton style={{ width: '60px', height: '14px' }} />
        <Skeleton style={{ width: '70px', height: '14px' }} />
      </div>
    </div>
  );
}

/**
 * Execution List Skeleton
 */
export function ExecutionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ExecutionCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Policy Card Skeleton
 */
export function PolicyCardSkeleton() {
  return (
    <div 
      className="p-6 rounded-lg border"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton style={{ width: '40px', height: '24px' }} />
        <Skeleton style={{ width: '60px', height: '20px' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '20px', marginBottom: '8px' }} />
      <Skeleton style={{ width: '80%', height: '16px', marginBottom: '16px' }} />
      <div className="space-y-2">
        <Skeleton style={{ width: '100%', height: '14px' }} />
        <Skeleton style={{ width: '90%', height: '14px' }} />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton style={{ width: '60px', height: '32px' }} />
        <Skeleton style={{ width: '60px', height: '32px' }} />
      </div>
    </div>
  );
}

/**
 * Policy Grid Skeleton
 */
export function PolicyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PolicyCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Integration Card Skeleton
 */
export function IntegrationCardSkeleton() {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <div className="flex items-center gap-4 mb-3">
        <Skeleton style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
        <div className="flex-1">
          <Skeleton style={{ width: '120px', height: '18px', marginBottom: '4px' }} />
          <Skeleton style={{ width: '80px', height: '14px' }} />
        </div>
        <Skeleton style={{ width: '40px', height: '20px', borderRadius: '12px' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '14px', marginBottom: '8px' }} />
      <Skeleton style={{ width: '70%', height: '14px' }} />
    </div>
  );
}

/**
 * Integration List Skeleton
 */
export function IntegrationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <IntegrationCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Metric Card Skeleton (Dashboard)
 */
export function MetricCardSkeleton() {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        background: 'var(--bg-secondary)', 
        borderColor: 'var(--border-subtle)' 
      }}
    >
      <Skeleton style={{ width: '80px', height: '12px', marginBottom: '8px' }} />
      <Skeleton style={{ width: '120px', height: '32px', marginBottom: '8px' }} />
      <Skeleton style={{ width: '100%', height: '40px' }} />
    </div>
  );
}

/**
 * Dashboard Grid Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts/content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <Skeleton style={{ width: '150px', height: '20px', marginBottom: '16px' }} />
          <Skeleton style={{ width: '100%', height: '200px' }} />
        </div>
        <div 
          className="p-6 rounded-lg border"
          style={{ 
            background: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <Skeleton style={{ width: '150px', height: '20px', marginBottom: '16px' }} />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} style={{ width: '100%', height: '40px' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Table Skeleton (Generic)
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} style={{ width: '100px', height: '14px' }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} style={{ width: '100px', height: '16px' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Add shimmer animation to global styles if not already present
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}
