/**
 * Error Boundary Components
 * 
 * Provides robust error handling and recovery UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private hashChangeListener?: () => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Reset error state when route changes (hash-based routing)
    this.hashChangeListener = () => {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      }
    };
    window.addEventListener('hashchange', this.hashChangeListener);
  }

  componentWillUnmount() {
    if (this.hashChangeListener) {
      window.removeEventListener('hashchange', this.hashChangeListener);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  showDetails?: boolean;
}

export function ErrorFallback({ error, onRetry, showDetails = false }: ErrorFallbackProps) {
  const [showDetailedError, setShowDetailedError] = React.useState(false);

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--error-border)] rounded-xl p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[var(--error-text)]" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Something went wrong
          </h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-md">
            An unexpected error occurred. This has been logged and will be investigated.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-secondary)] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          
          <button
            onClick={() => window.location.hash = 'now'}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {(showDetails || error) && (
          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => setShowDetailedError(!showDetailedError)}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {showDetailedError ? 'Hide' : 'Show'} Error Details
            </button>
            
            {showDetailedError && error && (
              <div className="mt-3 p-4 bg-[var(--bg-tertiary)] rounded-lg text-left overflow-auto">
                <div className="text-xs font-mono text-[var(--text-secondary)]">
                  <div className="font-semibold text-[var(--error-text)] mb-2">
                    {error.name}: {error.message}
                  </div>
                  <pre className="whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Panel-specific error boundary with consistent styling
interface PanelErrorBoundaryProps {
  children: ReactNode;
  panelName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function PanelErrorBoundary({ children, panelName, onError }: PanelErrorBoundaryProps) {
  const fallback = (
    <div className="bg-[var(--bg-primary)] border border-[var(--error-border)] rounded-xl p-4">
      <div className="text-center space-y-3">
        <AlertTriangle className="w-6 h-6 text-[var(--error-text)] mx-auto" />
        <div className="space-y-1">
          <h4 className="font-semibold text-[var(--text-primary)]">
            {panelName || 'Panel'} Error
          </h4>
          <p className="text-sm text-[var(--text-secondary)]">
            Unable to load this section
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded-md hover:bg-[var(--accent-secondary)] transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}