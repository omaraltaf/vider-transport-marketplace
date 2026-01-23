/**
 * AdminNavigationValidator - Validates administrative navigation elements and routes
 * Provides comprehensive admin navigation testing including route validation and permission checking
 */

import { NavigationElement, AdminRoute, AdminNavigationResult } from './interfaces';

export class AdminNavigationValidator {
  private adminRoutes: AdminRoute[] = [
    { path: '/admin', requiredPermissions: ['manage_system'], isProtected: true },
    { path: '/admin/users', requiredPermissions: ['manage_users'], isProtected: true },
    { path: '/admin/companies', requiredPermissions: ['manage_users'], isProtected: true },
    { path: '/admin/bookings', requiredPermissions: ['manage_system'], isProtected: true },
    { path: '/admin/analytics', requiredPermissions: ['manage_system'], isProtected: true }
  ];
  private testResults: Map<string, AdminNavigationResult[]> = new Map();

  constructor(adminRoutes?: AdminRoute[]) {
    if (adminRoutes) {
      this.adminRoutes = adminRoutes;
    }
  }

  /**
   * Validate admin routes and their protection
   */
  validateAdminRoutes(elements: NavigationElement[]): AdminNavigationResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: AdminNavigationResult[] = [];

    // Filter to admin elements
    const adminElements = this.filterAdminElements(elements);

    adminElements.forEach(element => {
      try {
        const result = this.validateSingleAdminElement(element);
        results.push(result);
      } catch (error) {
        console.warn('Error validating admin route:', error);
        const route = this.getElementRoute(element);
        results.push({
          route,
          isAccessible: false,
          hasProperProtection: false,
          issues: ['Error during admin route validation']
        });
      }
    });

    return results;
  }

  /**
   * Validate a single admin element
   */
  private validateSingleAdminElement(element: NavigationElement): AdminNavigationResult {
    const route = this.getElementRoute(element);
    const issues: string[] = [];
    let isAccessible = false;
    let hasProperProtection = false;

    try {
      // Check if element is accessible
      isAccessible = this.isElementAccessible(element);

      // Check if route has proper protection
      hasProperProtection = this.hasProperRouteProtection(element, route);

      // Validate admin-specific requirements
      const adminIssues = this.validateAdminRequirements(element, route);
      issues.push(...adminIssues);

      // Check permission enforcement
      const permissionIssues = this.checkPermissionEnforcement(element, route);
      issues.push(...permissionIssues);

      // Validate route configuration
      const configIssues = this.validateRouteConfiguration(route);
      issues.push(...configIssues);

    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      route,
      isAccessible,
      hasProperProtection,
      issues
    };
  }

  /**
   * Get route information from element
   */
  private getElementRoute(element: NavigationElement): AdminRoute {
    const path = element.href || element.element?.getAttribute('href') || '';
    
    // Find matching admin route or create default
    const existingRoute = this.adminRoutes.find(route => path.startsWith(route.path));
    
    if (existingRoute) {
      return existingRoute;
    }

    // Create default admin route
    return {
      path,
      requiredPermissions: this.inferRequiredPermissions(path),
      isProtected: this.shouldBeProtected(path)
    };
  }

  /**
   * Infer required permissions from path
   */
  private inferRequiredPermissions(path: string): string[] {
    const permissions: string[] = [];

    if (path.includes('/admin')) {
      permissions.push('manage_system');
    }

    if (path.includes('/users') || path.includes('/members')) {
      permissions.push('manage_users');
    }

    if (path.includes('/companies') || path.includes('/organizations')) {
      permissions.push('manage_users');
    }

    if (path.includes('/analytics') || path.includes('/reports')) {
      permissions.push('manage_system');
    }

    if (path.includes('/settings') || path.includes('/config')) {
      permissions.push('manage_system');
    }

    return permissions.length > 0 ? permissions : ['manage_system'];
  }

  /**
   * Check if path should be protected
   */
  private shouldBeProtected(path: string): boolean {
    const protectedPaths = ['/admin', '/management', '/dashboard/admin', '/platform'];
    return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
  }

  /**
   * Check if element is accessible
   */
  private isElementAccessible(element: NavigationElement): boolean {
    try {
      if (!element.element) {
        return false;
      }

      const domElement = element.element;
      const computedStyle = window.getComputedStyle(domElement);

      // Check visibility
      if (computedStyle.display === 'none' || 
          computedStyle.visibility === 'hidden' || 
          parseFloat(computedStyle.opacity) === 0) {
        return false;
      }

      // Check if disabled
      if (domElement.hasAttribute('disabled') || 
          domElement.getAttribute('aria-disabled') === 'true') {
        return false;
      }

      // Check if element has valid href or handler
      const hasHref = element.href || domElement.getAttribute('href');
      const hasHandler = this.hasClickHandler(domElement);
      
      return !!(hasHref || hasHandler);

    } catch (error) {
      console.warn('Error checking element accessibility:', error);
      return false;
    }
  }

  /**
   * Check if element has click handler
   */
  private hasClickHandler(element: Element): boolean {
    // Check for inline handlers
    if (element.getAttribute('onclick')) {
      return true;
    }

    // Check for framework handlers
    const frameworkHandlers = ['ng-click', '@click', 'v-on:click', 'onClick'];
    for (const handler of frameworkHandlers) {
      if (element.getAttribute(handler)) {
        return true;
      }
    }

    // Check for cursor pointer (heuristic)
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.cursor === 'pointer') {
      return true;
    }

    return false;
  }

  /**
   * Check if route has proper protection
   */
  private hasProperRouteProtection(element: NavigationElement, route: AdminRoute): boolean {
    try {
      if (!route.isProtected) {
        return true; // No protection required
      }

      // Check for protection indicators
      const protectionIndicators = this.findProtectionIndicators(element);
      
      return protectionIndicators.length > 0;

    } catch (error) {
      console.warn('Error checking route protection:', error);
      return false;
    }
  }

  /**
   * Find protection indicators on element
   */
  private findProtectionIndicators(element: NavigationElement): string[] {
    const indicators: string[] = [];

    try {
      const domElement = element.element;

      // Check data attributes
      if (domElement.hasAttribute('data-protected')) {
        indicators.push('data-protected attribute');
      }

      if (domElement.hasAttribute('data-permissions')) {
        indicators.push('data-permissions attribute');
      }

      if (domElement.hasAttribute('data-role')) {
        indicators.push('data-role attribute');
      }

      // Check ARIA attributes
      if (domElement.getAttribute('aria-label')?.includes('admin')) {
        indicators.push('admin ARIA label');
      }

      // Check classes
      const classList = Array.from(domElement.classList);
      const protectedClasses = classList.filter(cls => 
        cls.includes('protected') || 
        cls.includes('admin') || 
        cls.includes('secure')
      );
      
      if (protectedClasses.length > 0) {
        indicators.push('protection classes');
      }

      // Check parent elements for protection
      const protectedParent = domElement.closest('[data-protected], [data-admin], .admin-only');
      if (protectedParent) {
        indicators.push('protected parent element');
      }

    } catch (error) {
      console.warn('Error finding protection indicators:', error);
    }

    return indicators;
  }

  /**
   * Validate admin-specific requirements
   */
  private validateAdminRequirements(element: NavigationElement, route: AdminRoute): string[] {
    const issues: string[] = [];

    try {
      // Check proper labeling
      if (!this.hasProperAdminLabeling(element)) {
        issues.push('Missing proper admin labeling');
      }

      // Check accessibility
      if (!this.hasAdminAccessibility(element)) {
        issues.push('Missing admin accessibility features');
      }

      // Check security indicators
      if (route.isProtected && !this.hasSecurityIndicators(element)) {
        issues.push('Missing security indicators for protected route');
      }

      // Check admin styling
      if (!this.hasAdminStyling(element)) {
        issues.push('Missing admin-specific styling');
      }

    } catch (error) {
      issues.push('Error validating admin requirements');
    }

    return issues;
  }

  /**
   * Check proper admin labeling
   */
  private hasProperAdminLabeling(element: NavigationElement): boolean {
    const text = element.text || '';
    const ariaLabel = element.ariaLabel || '';
    const title = element.element?.getAttribute('title') || '';

    const adminKeywords = ['admin', 'manage', 'dashboard', 'settings', 'control'];
    const allText = `${text} ${ariaLabel} ${title}`.toLowerCase();

    return adminKeywords.some(keyword => allText.includes(keyword));
  }

  /**
   * Check admin accessibility
   */
  private hasAdminAccessibility(element: NavigationElement): boolean {
    if (!element.element) return false;

    const hasAriaLabel = element.element.hasAttribute('aria-label');
    const hasRole = element.element.hasAttribute('role');
    const isFocusable = this.isElementFocusable(element.element);

    return (hasAriaLabel || hasRole) && isFocusable;
  }

  /**
   * Check if element is focusable
   */
  private isElementFocusable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // Naturally focusable elements
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
      return !element.hasAttribute('disabled');
    }
    
    // Elements with tabindex
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex !== null) {
      const tabIndexValue = parseInt(tabIndex);
      return !isNaN(tabIndexValue) && tabIndexValue >= 0;
    }
    
    return false;
  }

  /**
   * Check security indicators
   */
  private hasSecurityIndicators(element: NavigationElement): boolean {
    if (!element.element) return false;

    const domElement = element.element;

    // Check for security-related attributes
    const hasSecurityAttrs = domElement.hasAttribute('data-secure') ||
                            domElement.hasAttribute('data-protected') ||
                            domElement.hasAttribute('data-admin');

    // Check for security classes
    const classList = Array.from(domElement.classList);
    const hasSecurityClasses = classList.some(cls => 
      cls.includes('secure') || 
      cls.includes('protected') || 
      cls.includes('admin-only')
    );

    return hasSecurityAttrs || hasSecurityClasses;
  }

  /**
   * Check admin styling
   */
  private hasAdminStyling(element: NavigationElement): boolean {
    if (!element.element) return false;

    const classList = Array.from(element.element.classList);
    const adminClasses = classList.filter(cls => 
      cls.includes('admin') || 
      cls.includes('dashboard') || 
      cls.includes('management')
    );

    return adminClasses.length > 0;
  }

  /**
   * Check permission enforcement
   */
  private checkPermissionEnforcement(element: NavigationElement, route: AdminRoute): string[] {
    const issues: string[] = [];

    try {
      // Check if required permissions are documented
      if (route.requiredPermissions.length === 0) {
        issues.push('No required permissions specified');
      }

      // Check if element indicates permission requirements
      const hasPermissionIndicators = this.hasPermissionIndicators(element, route.requiredPermissions);
      if (!hasPermissionIndicators) {
        issues.push('Element does not indicate permission requirements');
      }

      // Check for role-based visibility
      const hasRoleBasedVisibility = this.hasRoleBasedVisibility(element);
      if (!hasRoleBasedVisibility) {
        issues.push('Element lacks role-based visibility controls');
      }

    } catch (error) {
      issues.push('Error checking permission enforcement');
    }

    return issues;
  }

  /**
   * Check permission indicators
   */
  private hasPermissionIndicators(element: NavigationElement, requiredPermissions: string[]): boolean {
    if (!element.element) return false;

    const domElement = element.element;

    // Check data-permissions attribute
    const dataPermissions = domElement.getAttribute('data-permissions');
    if (dataPermissions) {
      const elementPermissions = dataPermissions.split(',').map(p => p.trim());
      return requiredPermissions.some(perm => elementPermissions.includes(perm));
    }

    // Check data-role attribute
    const dataRole = domElement.getAttribute('data-role');
    if (dataRole && requiredPermissions.includes('manage_system')) {
      return dataRole.includes('admin');
    }

    return false;
  }

  /**
   * Check role-based visibility
   */
  private hasRoleBasedVisibility(element: NavigationElement): boolean {
    if (!element.element) return false;

    const domElement = element.element;

    // Check for role-based classes
    const classList = Array.from(domElement.classList);
    const hasRoleClasses = classList.some(cls => 
      cls.includes('role-') || 
      cls.includes('admin-') || 
      cls.includes('user-')
    );

    // Check for conditional visibility attributes
    const hasConditionalAttrs = domElement.hasAttribute('data-show-for-role') ||
                               domElement.hasAttribute('data-hide-for-role') ||
                               domElement.hasAttribute('v-if') ||
                               domElement.hasAttribute('ng-if');

    return hasRoleClasses || hasConditionalAttrs;
  }

  /**
   * Validate route configuration
   */
  private validateRouteConfiguration(route: AdminRoute): string[] {
    const issues: string[] = [];

    try {
      // Check path validity
      if (!route.path || route.path.length === 0) {
        issues.push('Invalid or empty route path');
      }

      // Check permission validity
      if (route.isProtected && route.requiredPermissions.length === 0) {
        issues.push('Protected route without required permissions');
      }

      // Check path format
      if (route.path && !route.path.startsWith('/')) {
        issues.push('Route path should start with /');
      }

      // Check for common admin path patterns
      if (route.path.includes('/admin') && !route.isProtected) {
        issues.push('Admin path should be protected');
      }

    } catch (error) {
      issues.push('Error validating route configuration');
    }

    return issues;
  }

  /**
   * Filter elements to admin-specific ones
   */
  private filterAdminElements(elements: NavigationElement[]): NavigationElement[] {
    return elements.filter(element => this.isAdminElement(element));
  }

  /**
   * Check if element is admin-specific
   */
  private isAdminElement(element: NavigationElement): boolean {
    // Check href
    if (element.href && this.isAdminPath(element.href)) {
      return true;
    }

    // Check element attributes
    if (element.element) {
      const href = element.element.getAttribute('href');
      if (href && this.isAdminPath(href)) {
        return true;
      }
    }

    // Check text content
    const text = element.text || '';
    if (this.hasAdminKeywords(text)) {
      return true;
    }

    // Check ARIA label
    const ariaLabel = element.ariaLabel || '';
    if (this.hasAdminKeywords(ariaLabel)) {
      return true;
    }

    // Check classes
    if (element.element) {
      const classList = Array.from(element.element.classList);
      if (classList.some(cls => this.hasAdminKeywords(cls))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if path is admin path
   */
  private isAdminPath(path: string): boolean {
    const adminPaths = ['/admin', '/management', '/dashboard/admin', '/platform', '/settings/admin'];
    return adminPaths.some(adminPath => path.startsWith(adminPath));
  }

  /**
   * Check if text has admin keywords
   */
  private hasAdminKeywords(text: string): boolean {
    const adminKeywords = ['admin', 'manage', 'dashboard', 'settings', 'control', 'configure'];
    const lowerText = text.toLowerCase();
    return adminKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check admin permissions for current user
   */
  checkAdminPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Get admin navigation report
   */
  getAdminNavigationReport(elements: NavigationElement[]): {
    results: AdminNavigationResult[];
    summary: {
      totalAdminElements: number;
      accessibleElements: number;
      protectedElements: number;
      totalIssues: number;
      commonIssues: string[];
    };
  } {
    const results = this.validateAdminRoutes(elements);
    const accessibleElements = results.filter(r => r.isAccessible).length;
    const protectedElements = results.filter(r => r.hasProperProtection).length;
    
    const allIssues = results.flatMap(r => r.issues);
    const issueCount = new Map<string, number>();
    
    allIssues.forEach(issue => {
      issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
    });
    
    const commonIssues = Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      results,
      summary: {
        totalAdminElements: results.length,
        accessibleElements,
        protectedElements,
        totalIssues: allIssues.length,
        commonIssues
      }
    };
  }

  /**
   * Set admin routes
   */
  setAdminRoutes(routes: AdminRoute[]): void {
    this.adminRoutes = routes;
  }

  /**
   * Get admin routes
   */
  getAdminRoutes(): AdminRoute[] {
    return [...this.adminRoutes];
  }

  /**
   * Add admin route
   */
  addAdminRoute(route: AdminRoute): void {
    const existingIndex = this.adminRoutes.findIndex(r => r.path === route.path);
    if (existingIndex >= 0) {
      this.adminRoutes[existingIndex] = route;
    } else {
      this.adminRoutes.push(route);
    }
  }

  /**
   * Clear test results cache
   */
  clearResults(): void {
    this.testResults.clear();
  }
}