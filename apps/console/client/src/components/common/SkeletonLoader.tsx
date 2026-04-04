/**
 * SkeletonLoader — P1 Visual Polish
 * 
 * Consistent skeleton loading pattern for all pages.
 * Prevents blank white flashes during data loading.
 */

import React from 'react';

function SkeletonLine({ width = '100%', height = '12px', style }: { 
  width?: string; 
  height?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius: '4px',
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: '10px',
      padding: '20px',
      border: '1px solid var(--border-subtle)',
    }}>
      <SkeletonLine width="40%" height="16px" style={{ marginBottom: '12px' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={`${60 + Math.random() * 40}%`}
          height="12px"
          style={{ marginBottom: i < lines - 1 ? '8px' : '0' }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '16px',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width="60%" height="10px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '16px',
            padding: '12px 16px',
            borderBottom: ri < rows - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          }}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <SkeletonLine key={ci} width={`${40 + Math.random() * 50}%`} height="12px" />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Title */}
      <SkeletonLine width="200px" height="24px" style={{ marginBottom: '8px' }} />
      <SkeletonLine width="300px" height="14px" style={{ marginBottom: '24px' }} />
      
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
      
      {/* Table */}
      <SkeletonTable rows={6} cols={5} />
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export { SkeletonLine };
