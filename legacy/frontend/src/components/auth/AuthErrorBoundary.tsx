/**
 * Authentication Error Boundary
 * Specialized error boundary for catching and handling authentication-related errors
 */

import React, { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertTriangle, RefreshCw, LogOut, User, Shield } from 'lucide-react';

export interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onAuthError?: (error: Error) => void;
  maxRetries?: number;
  showDetails?: boolean;
  component?: string;
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `auth_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, onAuthError, component = 'AuthErrorBoundary' } = this.props;
    
    // Update state with error info
    this.setState({ errorInfo });

    // Log detailed error information
    console.group('🔐 Authentication Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error ID:', this.state.errorId);
    console.error('Component:', component);
    console.groupEnd();

    // Check if this is an authentication-related error
    if (this.isAuthenticationError(error)) {
      console.warn('Authentication error detected:', error.message);
      if (onAuthError) {
        onAuthError(error);
      }
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Store error in session storage for debugging
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        component,
        retryCount: this.state.retryCount
      };
      sessionStorage.setItem('last_auth_error', JSON.stringify(errorData));
    } catch (storageError) {
      console.warn('Failed to store error data:', storageError);
    }
  }

  private isAuthenticationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Check for common authentication error patterns
    return (
      message.includes('user') ||
      message.includes('auth') ||
      message.includes('token') ||
      message.includes('login') ||
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      stack.includes('authcontext') ||
      stack.includes('userstateguard') ||
      stack.includes('auth')
    );
  }

  private getAuthErrorType(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('token') || message.includes('expired')) {
      return 'Token Error';
    }
    
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'Permission Error';
    }
    
    if (message.includes('user') || message.includes('undefined')) {
      return 'User State Error';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    
    return 'Authentication Error';
  }

  private getErrorSeverityColor(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('token') || message.includes('expired')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    if (message.includes('network')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    return 'bg-red-100 text-red-800 border-red-200';
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

  handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_requires_password_change');
    
    // Redirect to login
    window.location.href = '/login';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearError = () => {
    // Clear stored error data
    sessionStorage.removeItem('last_auth_error');
    
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  render() {
    const { children, fallback, showDetails = false, maxRetries = 3 } = this.props;
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const errorType = this.getAuthErrorType(error);
      const isAuthError = this.isAuthenticationError(error);
      const canRetry = retryCount < maxRetries;
      const severityColor = this.getErrorSeverityColor(error);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  {isAuthError ? (
                    <Shield className="h-6 w-6 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {isAuthError ? 'Authentication Error' : 'Application Error'}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    {isAuthError 
                      ? 'An error occurred with user authentication or authorization.'
                      : 'We encountered an unexpected error in the authentication system.'
                    }
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Type Badge */}
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={severityColor}>
                  {isAuthError ? (
                    <Shield className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
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

              {/* Authentication-specific guidance */}
              {isAuthError && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Suggested Actions:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Try refreshing the page to reload your session</li>
                    <li>• Log out and log back in to refresh your authentication</li>
                    <li>• Check if you have the required permissions for this action</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>
              )}

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
                
                {isAuthError && (
                  <Button onClick={this.handleLogout} variant="outline" className="flex-1">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out & Retry
                  </Button>
                )}
                
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button onClick={this.handleClearError} variant="ghost" className="flex-1">
                  <User className="h-4 w-4 mr-2" />
                  Clear Error
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
 * Higher-order component to wrap components with authentication error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<AuthErrorBoundaryProps, 'children'>
) {
  const WithAuthErrorBoundaryComponent = (props: P) => (
    <AuthErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </AuthErrorBoundary>
  );

  WithAuthErrorBoundaryComponent.displayName = 
    `withAuthErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthErrorBoundaryComponent;
}

export default AuthErrorBoundary;