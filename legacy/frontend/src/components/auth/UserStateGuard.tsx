/**
 * UserStateGuard Component
 * Higher-order component that ensures user data availability before rendering children
 * Provides loading states and role-based access control
 */

import React, { type ReactNode } from 'react';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { Card, CardContent } from '../ui/card';
import { Loader2, AlertCircle, Lock, User } from 'lucide-react';
import { Button } from '../ui/button';
import { PermissionGuard } from './PermissionGuard';
import { Permission } from '../../services/error-handling/utils/permissionUtils';

export interface UserStateGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredPermissions?: Permission[];
  showLoadingSpinner?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function UserStateGuard({
  children,
  fallback,
  requireAuth = true,
  requiredRole,
  requiredPermissions = [],
  showLoadingSpinner = true,
  loadingMessage = "Loading user data...",
  errorMessage,
  onRetry
}: UserStateGuardProps) {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    error, 
    clearError,
    refreshUser 
  } = useEnhancedAuth();

  // Show loading state while authentication is initializing
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showLoadingSpinner) {
      return null;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              {loadingMessage}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle authentication errors
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Authentication Error</h3>
              <p className="text-sm text-muted-foreground">
                {errorMessage || error.message}
              </p>
            </div>
            {error.retryable && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearError}
                >
                  Dismiss
                </Button>
                <Button 
                  size="sm" 
                  onClick={onRetry || refreshUser}
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <User className="h-8 w-8 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Authentication Required</h3>
              <p className="text-sm text-muted-foreground">
                Please log in to access this content.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/login'}
              size="sm"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user data is available when required
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Loading user profile...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You don't have the required role ({requiredRole}) to access this content.
              </p>
              <p className="text-xs text-muted-foreground">
                Current role: {user?.role || 'None'}
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => window.history.back()}
              size="sm"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && user?.permissions) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      user.permissions?.includes(permission)
    );

    if (!hasAllPermissions) {
      if (fallback) {
        return <>{fallback}</>;
      }

      const missingPermissions = requiredPermissions.filter(permission => 
        !user.permissions?.includes(permission)
      );

      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Insufficient Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have the required permissions to access this content.
                </p>
                <p className="text-xs text-muted-foreground">
                  Missing: {missingPermissions.join(', ')}
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => window.history.back()}
                size="sm"
              >
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Higher-order component wrapper for UserStateGuard
 */
export function withUserStateGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps?: Omit<UserStateGuardProps, 'children'>
) {
  const WithUserStateGuardComponent = (props: P) => (
    <UserStateGuard {...guardProps}>
      <WrappedComponent {...props} />
    </UserStateGuard>
  );

  WithUserStateGuardComponent.displayName = 
    `withUserStateGuard(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithUserStateGuardComponent;
}

export default UserStateGuard;