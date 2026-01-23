/**
 * RoleBasedTester - Validates navigation for different user roles and access control enforcement
 * Provides comprehensive role-based testing including permission validation and access control
 */

import { NavigationElement, UserRole, RoleTestResult } from './interfaces';

export class RoleBasedTester {
  private supportedRoles: UserRole[] = [
    { name: 'guest', permissions: ['view_public'] },
    { name: 'user', permissions: ['view_public', 'view_profile', 'create_booking'] },
    { name: 'admin', permissions: ['view_public', 'view_profile', 'create_booking', 'manage_users', 'manage_system'] },
    { name: 'super_admin', permissions: ['*'] }
  ];
  private testResults: Map<string, RoleTestResult[]> = new Map();

  constructor(supportedRoles?: UserRole[]) {
    if (supportedRoles) {
      this.supportedRoles = supportedRoles;
    }
  }

  /**
   * Test role-based access control
   */
  testRoleBasedAccess(elements: NavigationElement[], role: UserRole): RoleTestResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: RoleTestResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.testElementForRole(element, role);
        results.push(result);
      } catch (error) {
        console.warn('Error testing role-based access:', error);
        results.push({
          role,
          element,
          shouldBeVisible: false,
          isVisible: false,
          passed: false
        });
      }
    });

    return results;
  }

  /**
   * Test a single element for a specific role
   */
  private testElementForRole(element: NavigationElement, role: UserRole): RoleTestResult {
    let shouldBeVisible = false;
    let isVisible = false;
    let passed = false;

    try {
      // Determine if element should be visible for this role
      shouldBeVisible = this.shouldElementBeVisibleForRole(element, role);
      
      // Check if element is actually visible
      isVisible = this.isElementVisible(element);
      
      // Test passes if visibility matches expectation
      passed = shouldBeVisible === isVisible;

    } catch (error) {
      console.warn('Error testing element for role:', error);
    }

    return {
      role,
      element,
      shouldBeVisible,
      isVisible,
      passed
    };
  }

  /**
   * Determine if element should be visible for a role
   */
  private shouldElementBeVisibleForRole(element: NavigationElement, role: UserRole): boolean {
    try {
      // Check element-specific role requirements
      const requiredPermissions = this.getElementRequiredPermissions(element);
      
      if (requiredPermissions.length === 0) {
        // No specific permissions required - visible to all
        return true;
      }

      // Check if role has required permissions
      return this.hasRequiredPermissions(role, requiredPermissions);

    } catch (error) {
      console.warn('Error determining element visibility for role:', error);
      return false;
    }
  }

  /**
   * Get required permissions for an element
   */
  private getElementRequiredPermissions(element: NavigationElement): string[] {
    const permissions: string[] = [];

    try {
      const domElement = element.element;

      // Check data attributes for permission requirements
      const dataPermissions = domElement.getAttribute('data-permissions');
      if (dataPermissions) {
        permissions.push(...dataPermissions.split(',').map(p => p.trim()));
      }

      // Check data-role attribute
      const dataRole = domElement.getAttribute('data-role');
      if (dataRole) {
        permissions.push(...this.getRolePermissions(dataRole));
      }

      // Check href for admin routes
      if (element.href) {
        const adminPermissions = this.getRoutePermissions(element.href);
        permissions.push(...adminPermissions);
      }

      // Check class names for role indicators
      const classList = Array.from(domElement.classList);
      const roleClasses = classList.filter(cls => 
        cls.includes('admin') || 
        cls.includes('user') || 
        cls.includes('guest')
      );
      
      roleClasses.forEach(cls => {
        if (cls.includes('admin')) {
          permissions.push('manage_system');
        } else if (cls.includes('user')) {
          permissions.push('view_profile');
        }
      });

      // Check ARIA attributes
      const ariaLabel = domElement.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.toLowerCase().includes('admin')) {
        permissions.push('manage_system');
      }

    } catch (error) {
      console.warn('Error getting element required permissions:', error);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  /**
   * Get permissions for a role name
   */
  private getRolePermissions(roleName: string): string[] {
    const role = this.supportedRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    return role ? role.permissions : [];
  }

  /**
   * Get required permissions for a route
   */
  private getRoutePermissions(href: string): string[] {
    const permissions: string[] = [];

    try {
      // Admin routes
      if (href.includes('/admin')) {
        permissions.push('manage_system');
      }

      // User profile routes
      if (href.includes('/profile') || href.includes('/account')) {
        permissions.push('view_profile');
      }

      // Booking routes
      if (href.includes('/booking') || href.includes('/reserve')) {
        permissions.push('create_booking');
      }

      // User management routes
      if (href.includes('/users') || href.includes('/members')) {
        permissions.push('manage_users');
      }

      // Company management routes
      if (href.includes('/companies') || href.includes('/organizations')) {
        permissions.push('manage_users');
      }

    } catch (error) {
      console.warn('Error getting route permissions:', error);
    }

    return permissions;
  }

  /**
   * Check if role has required permissions
   */
  private hasRequiredPermissions(role: UserRole, requiredPermissions: string[]): boolean {
    try {
      // Super admin has all permissions
      if (role.permissions.includes('*')) {
        return true;
      }

      // Check if role has all required permissions
      return requiredPermissions.every(permission => 
        role.permissions.includes(permission)
      );

    } catch (error) {
      console.warn('Error checking required permissions:', error);
      return false;
    }
  }

  /**
   * Check if element is actually visible in DOM
   */
  private isElementVisible(element: NavigationElement): boolean {
    try {
      if (!element.element) {
        return false;
      }

      const domElement = element.element;
      const computedStyle = window.getComputedStyle(domElement);
      
      // Check CSS visibility
      if (computedStyle.display === 'none' || 
          computedStyle.visibility === 'hidden' || 
          parseFloat(computedStyle.opacity) === 0) {
        return false;
      }

      // Check if element has dimensions
      const rect = element.boundingRect;
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      // Check if element is disabled
      if (domElement.hasAttribute('disabled') || 
          domElement.getAttribute('aria-disabled') === 'true') {
        return false;
      }

      return true;

    } catch (error) {
      console.warn('Error checking element visibility:', error);
      return false;
    }
  }

  /**
   * Validate user permissions for navigation elements
   */
  validateUserPermissions(elements: NavigationElement[], userRole: UserRole): RoleTestResult[] {
    return this.testRoleBasedAccess(elements, userRole);
  }

  /**
   * Test multiple roles against elements
   */
  testMultipleRoles(elements: NavigationElement[], roles?: UserRole[]): Map<string, RoleTestResult[]> {
    const rolesToTest = roles || this.supportedRoles;
    const results = new Map<string, RoleTestResult[]>();

    rolesToTest.forEach(role => {
      try {
        const roleResults = this.testRoleBasedAccess(elements, role);
        results.set(role.name, roleResults);
        this.testResults.set(role.name, roleResults);
      } catch (error) {
        console.warn(`Error testing role ${role.name}:`, error);
        results.set(role.name, []);
      }
    });

    return results;
  }

  /**
   * Get role-based navigation report
   */
  getRoleBasedReport(elements: NavigationElement[]): {
    roleResults: Map<string, RoleTestResult[]>;
    summary: {
      totalElements: number;
      totalRoles: number;
      passedTests: number;
      failedTests: number;
      accessControlIssues: string[];
    };
  } {
    const roleResults = this.testMultipleRoles(elements);
    const accessControlIssues: string[] = [];
    let passedTests = 0;
    let failedTests = 0;

    // Analyze results for issues
    roleResults.forEach((results, roleName) => {
      results.forEach(result => {
        if (result.passed) {
          passedTests++;
        } else {
          failedTests++;
          
          // Identify specific access control issues
          if (result.shouldBeVisible && !result.isVisible) {
            accessControlIssues.push(
              `Element should be visible for ${roleName} but is hidden`
            );
          } else if (!result.shouldBeVisible && result.isVisible) {
            accessControlIssues.push(
              `Element should be hidden for ${roleName} but is visible`
            );
          }
        }
      });
    });

    return {
      roleResults,
      summary: {
        totalElements: elements.length,
        totalRoles: this.supportedRoles.length,
        passedTests,
        failedTests,
        accessControlIssues: [...new Set(accessControlIssues)] // Remove duplicates
      }
    };
  }

  /**
   * Find elements with access control violations
   */
  findAccessControlViolations(elements: NavigationElement[]): {
    element: NavigationElement;
    violations: string[];
  }[] {
    const violations: { element: NavigationElement; violations: string[] }[] = [];

    elements.forEach(element => {
      const elementViolations: string[] = [];

      try {
        // Test element against all roles
        this.supportedRoles.forEach(role => {
          const result = this.testElementForRole(element, role);
          
          if (!result.passed) {
            if (result.shouldBeVisible && !result.isVisible) {
              elementViolations.push(
                `Should be visible for ${role.name} but is hidden`
              );
            } else if (!result.shouldBeVisible && result.isVisible) {
              elementViolations.push(
                `Should be hidden for ${role.name} but is visible`
              );
            }
          }
        });

        if (elementViolations.length > 0) {
          violations.push({
            element,
            violations: elementViolations
          });
        }

      } catch (error) {
        console.warn('Error checking access control violations:', error);
        violations.push({
          element,
          violations: ['Error during access control validation']
        });
      }
    });

    return violations;
  }

  /**
   * Check if user role has specific permission
   */
  hasPermission(role: UserRole, permission: string): boolean {
    return role.permissions.includes('*') || role.permissions.includes(permission);
  }

  /**
   * Get role by name
   */
  getRoleByName(roleName: string): UserRole | undefined {
    return this.supportedRoles.find(role => role.name.toLowerCase() === roleName.toLowerCase());
  }

  /**
   * Add custom role
   */
  addRole(role: UserRole): void {
    const existingIndex = this.supportedRoles.findIndex(r => r.name === role.name);
    if (existingIndex >= 0) {
      this.supportedRoles[existingIndex] = role;
    } else {
      this.supportedRoles.push(role);
    }
  }

  /**
   * Set supported roles
   */
  setSupportedRoles(roles: UserRole[]): void {
    this.supportedRoles = roles;
  }

  /**
   * Get supported roles
   */
  getSupportedRoles(): UserRole[] {
    return [...this.supportedRoles];
  }

  /**
   * Clear test results cache
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Get test results for a specific role
   */
  getResultsForRole(roleName: string): RoleTestResult[] {
    return this.testResults.get(roleName) || [];
  }
}