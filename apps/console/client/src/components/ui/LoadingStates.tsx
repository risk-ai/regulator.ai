/**
 * Loading States Components
 * 
 * Provides consistent loading UI across the application
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`animate-spin text-amber-400 ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingCardProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export function LoadingCard({ title, description, children }: LoadingCardProps) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-6">
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-3">
          <Spinner size="lg" />
          {title && (
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  const style = {
    width: width || '100%',
    height: height || '1rem'
  };

  return (
    <div 
      className={`animate-pulse bg-[var(--bg-tertiary)] rounded ${className}`}
      style={style}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i} 
          className="h-4" 
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

interface TableLoadingProps {
  columns: number;
  rows?: number;
}

export function TableLoading({ columns, rows = 5 }: TableLoadingProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="h-8 flex-1" 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface PageLoadingProps {
  title?: string;
  description?: string;
}

export function PageLoading({ title = 'Loading...', description }: PageLoadingProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <Spinner size="lg" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
          {description && (
            <p className="text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
}

export function InlineLoading({ text = 'Loading...', size = 'sm' }: InlineLoadingProps) {
  return (
    <div className="flex items-center gap-2">
      <Spinner size={size} />
      <span className="text-[var(--text-secondary)] text-sm">{text}</span>
    </div>
  );
}