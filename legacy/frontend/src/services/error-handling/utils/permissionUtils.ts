/**
 * Permission Utilities
 * Provides permission checking and validation for user operations
 */

import type { User } from '../../types';

export enum Permission {
  // Platform Admin permissions
  MANAGE_PLATFORM = 'MANAGE_PLATFORM',
  VIEW_ALL_COMPANIES = 'VIEW_ALL_COMPANIES',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  
  // Company Admin permissions
  MANAGE_COMPANY = 'MANAGE_COMPANY',
  MANAGE_LISTINGS = 'MANAGE_LISTINGS',
  MANAGE_BOOKINGS = 'MANAGE_BOOKINGS',
  VIEW_COMPANY_ANALYTICS = 'VIEW_COMPANY_ANALYTICS',
  
  // Company User permissions
  VIEW_LISTINGS = 'VIEW_LISTINGS',
  CREATE_BOOKING = 'CREATE_BOOKING',
  VIEW_OWN_BOOKINGS = 'VIEW_OWN_BOOKINGS',
}

export interface PermissionError {
  type: 'PERMISSION_DENIED';
  message: string;
  requiredPermission: Permission;
  userRole: string;
  suggestedAction?: string;
}

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  PLATFORM_ADMIN: [
    Permission.MANAGE_PLATFORM,
    Permission.VIEW_ALL_COMPANIES,
    Permission.MANAGE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_COMPANY,
    Permission.MANAGE_LISTINGS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_COMPANY_ANALYTICS,
    Permission.VIEW_LISTINGS,
    Permission.CREATE_BOOKING,
    Permission.VIEW_OWN_BOOKINGS,
  ],
  COMPANY_ADMIN: [
    Permission.MANAGE_COMPANY,
    Permission.MANAGE_LISTINGS,
    Permission.MANAGE_BOOKINGS,
    Permission.VIEW_COMPANY_ANALYTICS,
    Permission.VIEW_LISTINGS,
    Permission.CREATE_BOOKING,
    Permission.VIEW_OWN_BOOKINGS,
  ],
  COMPANY_USER: [
    Permission.VIEW_LISTINGS,
    Permission.CREATE_BOOKING,
    Permission.VIEW_OWN_BOOKINGS,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user || permissions.length === 0) {
    return false;
  }

  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user || permissions.length === 0) {
    return false;
  }

  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user's role
 */
export function getUserPermissions(user: User | null | undefined): Permission[] {
  if (!user) {
    return [];
  }

  return ROLE_PERMISSIONS[user.role] || [];
}

/**
 * Create a permission error with helpful messaging
 */
export function createPermissionError(
  requiredPermission: Permission,
  user: User | null | undefined
): PermissionError {
  const userRole = user?.role || 'UNAUTHENTICATED';
  
  const suggestedActions: Record<string, string> = {
    MANAGE_PLATFORM: 'Contact a platform administrator for access.',
    VIEW_ALL_COMPANIES: 'Contact a platform administrator for access.',
    MANAGE_USERS: 'Contact a platform administrator for access.',
    VIEW_ANALYTICS: 'Contact a platform administrator for access.',
    MANAGE_COMPANY: 'Contact your company administrator for access.',
    MANAGE_LISTINGS: 'Contact your company administrator for access.',
    MANAGE_BOOKINGS: 'Contact your company administrator for access.',
    VIEW_COMPANY_ANALYTICS: 'Contact your company administrator for access.',
  };

  return {
    type: 'PERMISSION_DENIED',
    message: `You do not have permission to perform this action. Required permission: ${requiredPermission}`,
    requiredPermission,
    userRole,
    suggestedAction: suggestedActions[requiredPermission],
  };
}

/**
 * Assert that a user has a specific permission, throwing an error if not
 */
export function assertPermission(user: User | null | undefined, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw createPermissionError(permission, user);
  }
}

/**
 * Check if a user can access a specific company's resources
 */
export function canAccessCompany(user: User | null | undefined, companyId: string): boolean {
  if (!user) {
    return false;
  }

  // Platform admins can access all companies
  if (user.role === 'PLATFORM_ADMIN') {
    return true;
  }

  // Company admins and users can only access their own company
  return user.companyId === companyId;
}
