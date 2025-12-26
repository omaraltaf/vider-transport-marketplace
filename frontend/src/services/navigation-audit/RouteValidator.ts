/**
 * Route Validator
 * Validates route existence, accessibility, and role-based restrictions
 */

import type { 
  RouteValidation, 
  RouteValidationResult, 
  NavigationElement,
  AuditContext,
  AuditError 
} from './interfaces';
import { routePatterns } from './config/auditConfig';
import { matchesRoutePattern, extractRouteParams } from './utils/helpers';

export class RouteValidator {
  private context: AuditContext;
  private errors: AuditError[] = [];
  private knownRoutes: Set<string> = new Set();

  constructor(context: AuditContext) {
    this.context = context;
    this.initializeKnownRoutes();
  }

  /**
   * Validate all routes found in navigation elements
   */
  async validateRoutes(elements: NavigationElement[]): Promise<RouteValidationResult> {
    const validRoutes: RouteValidation[] = [];
    const invalidRoutes: RouteValidation[] = [];
    const orphanedRoutes: RouteValidation[] = [];
    const processedPaths = new Set<string>();

    // Extract unique paths from navigation elements
    const paths = this.extractPathsFromElements(elements);

    for (const path of paths) {
      if (processedPaths.has(path)) continue;
      processedPaths.add(path);

      try {
        const validation = await this.validateSingleRoute(path);
        
        if (validation.exists && validation.accessible) {
          validRoutes.push(validation);
        } else if (!validation.exists) {
          invalidRoutes.push(validation);
        } else {
          // Route exists but not accessible
          invalidRoutes.push(validation);
        }
      } catch (error) {
        this.handleError({
          code: 'ROUTE_VALIDATION_ERROR',
          message: `Failed to validate route ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context: { path },
          timestamp: new Date(),
          severity: 'medium',
        });

        invalidRoutes.push({
          path,
          exists: false,
          accessible: false,
          error: error instanceof Error ? error.message : 'Validation failed',
        });
      }
    }

    // Find orphaned routes (defined but not referenced in navigation)
    const referencedPaths = new Set(paths);
    for (const knownRoute of this.knownRoutes) {
      if (!referencedPaths.has(knownRoute)) {
        orphanedRoutes.push({
          path: knownRoute,
          exists: true,
          accessible: true,
        });
      }
    }

    return {
      validRoutes,
      invalidRoutes,
      orphanedRoutes,
      totalRoutes: validRoutes.length + invalidRoutes.length,
      timestamp: new Date(),
    };
  }

  /**
   * Validate a single route (alias for validateSingleRoute)
   */
  async validateRoute(path: string): Promise<RouteValidation> {
    return this.validateSingleRoute(path);
  }

  /**
   * Validate a single route
   */
  async validateSingleRoute(path: string): Promise<RouteValidation> {
    const validation: RouteValidation = {
      path,
      exists: false,
      accessible: false,
    };

    try {
      // Check if route exists in known routes
      validation.exists = this.routeExists(path);

      if (validation.exists) {
        // Check accessibility based on user role
        const accessCheck = this.checkRouteAccess(path);
        validation.accessible = accessCheck.accessible;
        validation.requiredRole = accessCheck.requiredRole;
        validation.redirectsTo = accessCheck.redirectsTo;

        // Simulate HTTP check (in real implementation, would make actual request)
        const httpCheck = await this.performHttpCheck(path);
        validation.statusCode = httpCheck.statusCode;
        
        if (httpCheck.statusCode >= 400) {
          validation.accessible = false;
          validation.error = `HTTP ${httpCheck.statusCode}`;
        }
      } else {
        validation.error = 'Route not found in application routes';
      }

    } catch (error) {
      validation.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return validation;
  }

  /**
   * Check if route exists in the application
   */
  private routeExists(path: string): boolean {
    // Check exact match first
    if (this.knownRoutes.has(path)) {
      return true;
    }

    // Check pattern matches
    const allPatterns = [
      ...routePatterns.public,
      ...routePatterns.companyAdmin,
      ...routePatterns.platformAdmin,
    ];

    return allPatterns.some(pattern => matchesRoutePattern(path, pattern));
  }

  /**
   * Check route access based on user role
   */
  private checkRouteAccess(path: string): {
    accessible: boolean;
    requiredRole?: string;
    redirectsTo?: string;
  } {
    const currentUser = this.context.currentUser;

    // Public routes are always accessible
    if (routePatterns.public.some(pattern => matchesRoutePattern(path, pattern))) {
      return { accessible: true };
    }

    // Check platform admin routes
    if (routePatterns.platformAdmin.some(pattern => matchesRoutePattern(path, pattern))) {
      if (currentUser?.role === 'PLATFORM_ADMIN') {
        return { accessible: true, requiredRole: 'PLATFORM_ADMIN' };
      }
      return { 
        accessible: false, 
        requiredRole: 'PLATFORM_ADMIN',
        redirectsTo: '/login'
      };
    }

    // Check company admin routes
    if (routePatterns.companyAdmin.some(pattern => matchesRoutePattern(path, pattern))) {
      if (currentUser?.role === 'COMPANY_ADMIN' || currentUser?.role === 'PLATFORM_ADMIN') {
        return { accessible: true, requiredRole: 'COMPANY_ADMIN' };
      }
      return { 
        accessible: false, 
        requiredRole: 'COMPANY_ADMIN',
        redirectsTo: '/login'
      };
    }

    // Unknown route pattern
    return { accessible: false };
  }

  /**
   * Perform HTTP check for route (simulated)
   */
  private async performHttpCheck(path: string): Promise<{ statusCode: number }> {
    // In a real implementation, this would make an actual HTTP request
    // For now, we'll simulate based on known patterns
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check for obviously invalid paths
      if (path.includes('..') || path.includes('<script>')) {
        return { statusCode: 400 };
      }

      // Check for authentication requirements
      const accessCheck = this.checkRouteAccess(path);
      if (!accessCheck.accessible && accessCheck.requiredRole) {
        return { statusCode: 401 };
      }

      // Simulate 404 for unknown routes
      if (!this.routeExists(path)) {
        return { statusCode: 404 };
      }

      // Default to success
      return { statusCode: 200 };

    } catch (error) {
      return { statusCode: 500 };
    }
  }

  /**
   * Extract paths from navigation elements
   */
  private extractPathsFromElements(elements: NavigationElement[]): string[] {
    const paths: string[] = [];

    for (const element of elements) {
      // Extract from href
      if (element.href) {
        const path = this.normalizePath(element.href);
        if (path) paths.push(path);
      }

      // Extract from destination
      if (element.destination) {
        const path = this.normalizePath(element.destination);
        if (path) paths.push(path);
      }

      // Extract from React Router Link (if detectable)
      if (element.element) {
        const reactPath = this.extractReactRouterPath(element.element);
        if (reactPath) paths.push(reactPath);
      }
    }

    return [...new Set(paths)]; // Remove duplicates
  }

  /**
   * Normalize path for validation
   */
  private normalizePath(path: string): string | null {
    if (!path) return null;

    // Skip external URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return null;
    }

    // Skip javascript: and mailto: links
    if (path.startsWith('javascript:') || path.startsWith('mailto:')) {
      return null;
    }

    // Skip hash-only links
    if (path === '#' || path.startsWith('#')) {
      return null;
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Remove query parameters and hash for validation
    const url = new URL(path, 'http://localhost');
    return url.pathname;
  }

  /**
   * Extract React Router path from element (simplified)
   */
  private extractReactRouterPath(element: HTMLElement): string | null {
    // In a real implementation, this would inspect React internals
    // For now, we'll check data attributes that might contain paths
    const dataTo = element.getAttribute('data-to');
    if (dataTo) {
      return this.normalizePath(dataTo);
    }

    return null;
  }

  /**
   * Initialize known routes from configuration
   */
  private initializeKnownRoutes(): void {
    const allRoutes = [
      ...routePatterns.public,
      ...routePatterns.companyAdmin,
      ...routePatterns.platformAdmin,
    ];

    allRoutes.forEach(route => this.knownRoutes.add(route));

    // Add some common dynamic routes
    const dynamicRoutes = [
      '/companies/123',
      '/companies/123/edit',
      '/listings/vehicles/456',
      '/listings/drivers/789',
      '/bookings/101',
      '/admin/disputes/202',
    ];

    dynamicRoutes.forEach(route => this.knownRoutes.add(route));
  }

  /**
   * Add a known route to the validator
   */
  addKnownRoute(path: string): void {
    this.knownRoutes.add(path);
  }

  /**
   * Remove a known route from the validator
   */
  removeKnownRoute(path: string): void {
    this.knownRoutes.delete(path);
  }

  /**
   * Get all known routes
   */
  getKnownRoutes(): string[] {
    return Array.from(this.knownRoutes);
  }

  /**
   * Handle validation errors
   */
  private handleError(error: AuditError): void {
    this.errors.push(error);
    console.warn(`Route Validator Error [${error.code}]:`, error.message);
  }

  /**
   * Get all errors encountered during validation
   */
  getErrors(): AuditError[] {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}