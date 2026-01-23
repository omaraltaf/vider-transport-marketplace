/**
 * Navigation Audit Configuration
 * Default configuration for navigation audit system
 */

import type { AuditConfiguration } from '../interfaces';

export const defaultAuditConfig: AuditConfiguration = {
  includeAccessibility: true,
  includeRoleBased: true,
  includeResponsive: true,
  includeStateManagement: true,
  breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
  userRoles: ['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'GUEST'],
  maxTestDuration: 30000, // 30 seconds
  propertyTestIterations: 100, // Minimum 100 iterations for property-based tests
};

export const breakpointSizes = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  wide: { width: 1920, height: 1080 },
};

export const wcagGuidelines = {
  minTouchTargetSize: 44, // pixels
  minContrastRatio: 4.5,
  maxResponseTime: 1000, // milliseconds
};

export const routePatterns = {
  public: [
    '/',
    '/search',
    '/listings/:type/:id',
    '/login',
    '/register',
    '/verify-email',
  ],
  companyAdmin: [
    '/dashboard',
    '/companies/:id',
    '/companies/:id/edit',
    '/listings/vehicles',
    '/listings/vehicles/new',
    '/listings/vehicles/:id',
    '/listings/drivers',
    '/listings/drivers/new',
    '/listings/drivers/:id',
    '/listings/bulk-calendar',
    '/bookings',
    '/bookings/:id',
    '/billing',
    '/messages',
    '/notifications',
    '/settings/notifications',
    '/profile',
    '/settings/data-export',
    '/settings/delete-account',
    '/settings/audit-log',
  ],
  platformAdmin: [
    '/platform-admin',
    '/admin/users',
    '/admin/companies',
    '/admin/listings/vehicles',
    '/admin/listings/drivers',
    '/admin/bookings',
    '/admin/transactions',
    '/admin/disputes',
    '/admin/disputes/:id',
    '/admin/analytics',
    '/admin/audit-log',
  ],
};