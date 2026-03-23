/**
 * Error Boundary Component
 * 
 * Catches React errors in child component tree.
 * Prevents one failing panel from crashing the entire dashboard.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.componentName || 'Component'} error:`, error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {this.props.componentName || 'Component'} Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="font-mono text-xs">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40 bg-red-100 p-2 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="mt-4">
                <button
                  onClick={this.handleReset}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Panel Error Boundary
 * 
 * Specialized error boundary for dashboard panels.
 */
interface PanelErrorBoundaryProps {
  children: ReactNode;
  panelName: string;
}

export function PanelErrorBoundary({ children, panelName }: PanelErrorBoundaryProps) {
  return (
    <ErrorBoundary
      componentName={panelName}
      fallback={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            {panelName} Unavailable
          </h3>
          <p className="text-xs text-gray-500">
            This panel encountered an error. The rest of the dashboard is still functional.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
