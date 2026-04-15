/**
 * Reusable Page State Components
 * Loading, Empty, Error states with consistent UX
 */

import React from 'react';
import { AlertCircle, RefreshCw, Inbox, Search, Database } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export function LoadingState({ message = 'Loading...', fullPage = false }: LoadingStateProps) {
  const containerClass = fullPage 
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-24';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ 
            borderColor: 'var(--border-subtle)', 
            borderTopColor: 'var(--accent-primary)' 
          }} 
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary
}: EmptyStateProps) {
  const defaultIcon = <Inbox className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />;

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-md">
        <div className="mb-4 flex justify-center opacity-50">
          {icon || defaultIcon}
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
        <div className="flex gap-3 justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: 'var(--accent-primary)',
                color: '#000000',
              }}
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
  fullPage?: boolean;
}

export function ErrorState({ error, onRetry, fullPage = false }: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const containerClass = fullPage 
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-24';

  return (
    <div className={containerClass}>
      <div className="text-center max-w-md">
        <div className="mb-4 flex justify-center">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-red-500">
          Something Went Wrong
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          {errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 mx-auto"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

interface SkeletonProps {
  count?: number;
  className?: string;
  height?: string;
}

export function Skeleton({ count = 1, className = '', height = '20px' }: SkeletonProps) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded ${className}`}
          style={{
            background: 'var(--border-subtle)',
            height,
            marginBottom: '12px',
          }}
        />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(columns)].map((_, j) => (
            <div
              key={j}
              className="flex-1 h-12 rounded animate-pulse"
              style={{ background: 'var(--border-subtle)' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-lg animate-pulse"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="h-6 w-24 rounded mb-4" style={{ background: 'var(--border-subtle)' }} />
          <div className="h-4 w-full rounded mb-2" style={{ background: 'var(--border-subtle)' }} />
          <div className="h-4 w-3/4 rounded" style={{ background: 'var(--border-subtle)' }} />
        </div>
      ))}
    </div>
  );
}
