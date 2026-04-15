/**
 * Higher-Order Component for Page State Management
 * Wraps a page component with loading/error/empty state handling
 * 
 * Usage:
 * export default withPageStates(MyPage, {
 *   loadingMessage: 'Loading data...',
 *   emptyConfig: {
 *     title: 'No Data',
 *     description: 'No data available',
 *     actionLabel: 'Refresh'
 *   }
 * });
 */

import React from 'react';
import { LoadingState, EmptyState, ErrorState } from './PageStates';

export interface PageStateConfig {
  loadingMessage?: string;
  emptyConfig?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    secondaryLabel?: string;
  };
  errorMessage?: string;
}

export interface PageStateProps {
  loading?: boolean;
  error?: string | Error | null;
  empty?: boolean;
  onRetry?: () => void;
  onEmptyAction?: () => void;
  onEmptySecondary?: () => void;
}

export function withPageStates<P extends object>(
  Component: React.ComponentType<P>,
  config: PageStateConfig = {}
) {
  return function PageWithStates(props: P & PageStateProps) {
    const {
      loading,
      error,
      empty,
      onRetry,
      onEmptyAction,
      onEmptySecondary,
      ...componentProps
    } = props as any;

    if (loading) {
      return <LoadingState message={config.loadingMessage || 'Loading...'} />;
    }

    if (error) {
      return (
        <ErrorState
          error={error}
          onRetry={onRetry}
        />
      );
    }

    if (empty && config.emptyConfig) {
      return (
        <EmptyState
          icon={config.emptyConfig.icon}
          title={config.emptyConfig.title}
          description={config.emptyConfig.description}
          actionLabel={config.emptyConfig.actionLabel}
          onAction={onEmptyAction}
          secondaryLabel={config.emptyConfig.secondaryLabel}
          onSecondary={onEmptySecondary}
        />
      );
    }

    return <Component {...(componentProps as P)} />;
  };
}
