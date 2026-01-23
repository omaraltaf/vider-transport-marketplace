/**
 * usePermissions Hook
 * Provides permission checking utilities for React components
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/EnhancedAuthContext';
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  canAccessCompany,
  createPermissionError,
} from '../services/error-handling/utils/permissionUtils';

export interface UsePermissionsReturn {
  // Permission checking functions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessCompany: (companyId: string) => boolean;
  
  // User permissions
  userPermissions: Permission[];
  
  // Utility functions
  createPermissionError: (permission: Permission) => ReturnType<typeof createPermissionError>;
  
  // Role checks
  isPlatformAdmin: boolean;
  isCompanyAdmin: boolean;
  isCompanyUser: boolean;
}

/**
 * Hook for checking user permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();

  const permissionCheckers = useMemo(() => ({
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canAccessCompany: (companyId: string) => canAccessCompany(user, companyId),
    createPermissionError: (permission: Permission) => createPermissionError(permission, user),
  }), [user]);

  const userPermissions = useMemo(() => getUserPermissions(user), [user]);

  const roleChecks = useMemo(() => ({
    isPlatformAdmin: user?.role === 'PLATFORM_ADMIN',
    isCompanyAdmin: user?.role === 'COMPANY_ADMIN',
    isCompanyUser: user?.role === 'COMPANY_USER',
  }), [user?.role]);

  return {
    ...permissionCheckers,
    userPermissions,
    ...roleChecks,
  };
}

/**
 * Hook for checking a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuth();
  return useMemo(() => hasPermission(user, permission), [user, permission]);
}

/**
 * Hook for checking if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return useMemo(() => hasAnyPermission(user, permissions), [user, permissions]);
}

/**
 * Hook for checking if user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return useMemo(() => hasAllPermissions(user, permissions), [user, permissions]);
}

/**
 * Hook for checking company access
 */
export function useCanAccessCompany(companyId: string): boolean {
  const { user } = useAuth();
  return useMemo(() => canAccessCompany(user, companyId), [user, companyId]);
}

export default usePermissions;