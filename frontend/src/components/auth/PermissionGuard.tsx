/**
 * Permission Guard Component
 * Higher-order component that protects routes and components based on user permissions
 */

import React from 'react';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { PermissionDenied } from '../error-handling/PermissionDenied';
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  createPermissionError,
} from '../../services/error-handling/utils/permissionUtils';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  anyPermissions?: Permission[];
  allPermissions?: Permission[];
  fallback?: React.ReactNode;
  onPermissionDenied?: () => void;
}

/**
 * Component that guards content based on user permissions
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback,
  onPermissionDenied,
}) => {
  const { user } = useAuth();

  // Determine if user has required permissions
  const hasRequiredPermission = React.useMemo(() => {
    if (permission) {
      return hasPermission(user, permission);
    }

    if (anyPermissions && anyPermissions.length > 0) {
      return hasAnyPermission(user, anyPermissions);
    }

    if (allPermissions && allPermissions.length > 0) {
      return hasAllPermissions(user, allPermissions);
    }

    // If no permissions specified, allow access
    return true;
  }, [user, permission, anyPermissions, allPermissions]);

  // Call callback if permission denied
  React.useEffect(() => {
    if (!hasRequiredPermission && onPermissionDenied) {
      onPermissionDenied();
    }
  }, [hasRequiredPermission, onPermissionDenied]);

  // If user has permission, render children
  if (hasRequiredPermission) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Otherwise, show permission denied message
  const permissionError = createPermissionError(
    permission || anyPermissions?.[0] || allPermissions?.[0] || Permission.VIEW_LISTINGS,
    user
  );

  return (
    <PermissionDenied
      error={permissionError}
      onGoBack={() => window.history.back()}
    />
  );
};

/**
 * Higher-order component that wraps a component with permission checking
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission
): React.FC<P> {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Higher-order component that requires any of the specified permissions
 */
export function withAnyPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[]
): React.FC<P> {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard anyPermissions={permissions}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

/**
 * Higher-order component that requires all of the specified permissions
 */
export function withAllPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[]
): React.FC<P> {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard allPermissions={permissions}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

export default PermissionGuard;
