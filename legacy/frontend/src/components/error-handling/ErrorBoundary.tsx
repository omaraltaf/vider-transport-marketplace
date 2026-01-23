/**
 * React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays fallback UI
 */

import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { apiErrorHandler } from '../../services/error-handling/ApiErrorHandler';
import { errorMonitor } from '../../services/error-handling/ErrorMonitor';
import { classifyError } from '../../services/error-handling/utils/errorClassification';
import type { ApiError, ErrorContext } from '../../types/error.types';


interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  maxRetries?: number;
  component?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, component = 'ErrorBoundary' } = this.props;
    
    // Update state with error info
    this.setState({ errorInfo });

    // Create error context
    const context: ErrorContext = {
      endpoint: 'client-side-error',
      method: 'RENDER',
      component,
      timestamp: new Date(),
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    // Classify the error
    const apiError: ApiError = classifyError(error, context);
    
    // Record error for monitoring
    errorMonitor.recordError(apiError, context);

    // Handle through error handler
    apiErrorHandler.handleError(apiError, context).catch(handlerError => {
      console.error('Error handler failed:', handlerError);
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Log detailed error information
    console.group('🚨 React Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error ID:', this.state.errorId);
    console.groupEnd();
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error_session_id', sessionId);
    }
    return sessionId;
  }

  private getErrorSeverityColor(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    return 'bg-red-100 text-red-800 border-red-200';
  }

  private getErrorType(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'Loading Error';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    
    if (error.name === 'TypeError') {
      return 'Type Error';
    }
    
    if (error.name === 'ReferenceError') {
      return 'Reference Error';
    }
    
    return 'Runtime Error';
  }

  render() {
    const { children, fallback, showDetails = false, maxRetries = 3 } = this.props;
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const errorType = this.getErrorType(error);
      const canRetry = retryCount < maxRetries;
      const severityColor = this.getErrorSeverityColor(error);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Something went wrong</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    We encountered an unexpected error while rendering this component.
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Type Badge */}
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={severityColor}>
                  <Bug className="h-3 w-3 mr-1" />
                  {errorType}
                </Badge>
                {errorId && (
                  <Badge variant="secondary">
                    ID: {errorId.slice(-8)}
                  </Badge>
                )}
                {retryCount > 0 && (
                  <Badge variant="outline">
                    Retry {retryCount}/{maxRetries}
                  </Badge>
                )}
              </div>

              {/* Error Message */}
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-900 mb-1">Error Details:</p>
                <p className="text-sm text-gray-700 font-mono">{error.message}</p>
              </div>

              {/* Detailed Error Info (Development) */}
              {showDetails && errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Technical Details (Click to expand)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-xs font-mono text-gray-600 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                    </div>
                    <div>
                      <strong>Error Stack:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                If this problem persists, please contact support with error ID: {errorId?.slice(-8)}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook to manually trigger error boundary (for testing)
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    throw error;
  };
}

export default ErrorBoundary;