/**
 * Reusable state handler components
 * Use these for quick page-level loading/error/empty states without HOC overhead
 */

import React from 'react';
import { RefreshCw, AlertTriangle, Inbox } from 'lucide-react';

// ===== Loading State =====

export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div
          className="inline-block w-8 h-8 border-2 rounded-full animate-spin mb-3"
          style={{
            borderColor: 'var(--border-subtle)',
            borderTopColor: 'var(--accent-primary, #f59e0b)',
          }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ===== Error State =====

export function PageError({
  error,
  onRetry,
  title = 'Error Loading Data',
}: {
  error: string | Error;
  onRetry?: () => void;
  title?: string;
}) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-md">
        <AlertTriangle
          className="mx-auto mb-4"
          size={48}
          style={{ color: '#ef4444' }}
        />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
          {errorMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: 'var(--accent-primary, #f59e0b)',
              color: '#000',
            }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Empty State =====

export function PageEmpty({
  icon,
  title = 'No Data',
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-md">
        {icon || <Inbox className="mx-auto mb-4" size={48} style={{ color: 'var(--text-muted)' }} />}
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: 'var(--accent-primary, #f59e0b)',
              color: '#000',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
