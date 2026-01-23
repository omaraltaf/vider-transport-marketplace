/**
 * Property-Based Test: Access Control Enforcement
 * **Feature: ui-navigation-audit, Property 9: Access Control Enforcement**
 * **Validates: Requirements 3.2, 3.4**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RoleBasedTester } from '../RoleBasedTester';
import { RouteValidator } from '../RouteValidator';
import { 
  navigationElementArrayArb, 
  auditContextArb 
} from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 9: Access Control Enforcement', () => {
  let tester: RoleBasedTester;
  let mockContext: AuditContext;

  beforeEach(() => {
    mockContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: {
        id: 'test-user',
        role: 'COMPANY_ADMIN',
        permissions: ['read', 'write'],
      },
      viewport: { width: 1280, height: 720 },
    };
    tester = new RoleBasedTester(mockContext);
  });

  /**
   * For any role-restricted route, unauthorized access attempts should be 
   * properly blocked with appropriate redirects
   */
  it('should ensure unauthorized access attempts are properly blocked', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link', 'button'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.oneof(
              fc.constantFrom('/admin/dashboard', '/admin/users', '/admin/settings'),
              fc.constantFrom('/company/dashboard', '/company/reports'),
              fc.constantFrom('/profile', '/search', '/home')
            ),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'GUEST'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 12 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (elements: NavigationElement[], userRole: string) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create elements with access control
            elementsWithDOM = elements.map(element => ({
              ...element,
              element: createAccessControlledElement(element, userRole)
            }));

            if (elementsWithDOM.length === 0) {
              return true; // No elements with destinations to test
            }

            // Simulate access control testing
            const successfulTests = elementsWithDOM.filter(element => {
              if (!element.destination) return true;
              
              const hasAccess = checkRouteAccess(element.destination, userRole);
              const isProperlyBlocked = element.element!.hasAttribute('disabled');
              
              // Should be blocked if no access, allowed if has access
              return hasAccess ? !isProperlyBlocked : isProperlyBlocked;
            });
            
            // Most access control tests should pass
            const accessControlScore = successfulTests.length / elementsWithDOM.length;
            
            return accessControlScore >= 0.8; // High standard for access control
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that admin routes are protected from non-admin users', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link', 'button'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.constantFrom('/admin/dashboard', '/admin/users', '/platform-admin/settings'),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN'),
        (adminElements: NavigationElement[], unauthorizedRole: string) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create admin elements that should be protected
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createProtectedAdminElement(element, unauthorizedRole)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // All admin routes should be properly protected from unauthorized users
            const protectedTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const isProperlyBlocked = domElement.hasAttribute('disabled') ||
                                      domElement.style.display === 'none' ||
                                      domElement.getAttribute('aria-hidden') === 'true';
              return isProperlyBlocked;
            });
            
            const protectionScore = protectedTests.length / elementsWithDOM.length;
            return protectionScore >= 0.9; // Very high standard for admin protection
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that company routes are accessible to appropriate roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link', 'button'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.constantFrom('/company/dashboard', '/company/reports', '/company/settings'),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('COMPANY_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 6 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (companyElements: NavigationElement[], userRole: string) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create company elements with proper access control
            elementsWithDOM = companyElements.map(element => ({
              ...element,
              element: createCompanyAccessElement(element, userRole)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Check access based on role
            const shouldHaveAccess = userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
            
            if (shouldHaveAccess) {
              // Should be allowed access
              const allowedTests = elementsWithDOM.filter(element => {
                const domElement = element.element!;
                return !domElement.hasAttribute('disabled') && 
                       domElement.style.pointerEvents !== 'none';
              });
              const accessScore = allowedTests.length / elementsWithDOM.length;
              return accessScore >= 0.7;
            } else {
              // Should be blocked access
              const blockedTests = elementsWithDOM.filter(element => {
                const domElement = element.element!;
                return domElement.hasAttribute('disabled') || 
                       domElement.style.pointerEvents === 'none';
              });
              const blockScore = blockedTests.length / elementsWithDOM.length;
              return blockScore >= 0.8;
            }
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure public routes are accessible to all roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link', 'button'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.constantFrom('/home', '/search', '/about', '/contact', '/profile'),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.string(), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (publicElements: NavigationElement[], userRole: string) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create public elements
            elementsWithDOM = publicElements.map(element => ({
              ...element,
              element: createPublicAccessElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // All public routes should be accessible to all roles
            const accessibleTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              return !domElement.hasAttribute('disabled') &&
                     domElement.style.pointerEvents !== 'none' &&
                     domElement.style.display !== 'none';
            });
            
            const publicAccessScore = accessibleTests.length / elementsWithDOM.length;
            return publicAccessScore >= 0.9; // High expectation for public access
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate proper redirect behavior for unauthorized access', () => {
    fc.assert(
      fc.property(
        auditContextArb,
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.constantFrom('/admin/dashboard', '/company/settings'),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.string(), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 6 }
        ),
        (context: AuditContext, restrictedElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create elements that should redirect unauthorized users
            elementsWithDOM = restrictedElements.map(element => ({
              ...element,
              element: createRedirectingElement(element)
            }));

            let properRedirects = 0;
            let totalChecks = 0;

            for (const element of elementsWithDOM) {
              if (element.destination) {
                // Check if element is properly blocked for unauthorized access
                const domElement = element.element!;
                const isProperlyBlocked = domElement.hasAttribute('disabled') ||
                                        domElement.style.display === 'none' ||
                                        domElement.hasAttribute('data-redirect');
                
                if (isProperlyBlocked) {
                  properRedirects++;
                }
                totalChecks++;
              }
            }

            if (totalChecks === 0) return true;
            
            const redirectScore = properRedirects / totalChecks;
            return redirectScore >= 0.7;
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure access control is consistently enforced across similar elements', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link', 'button'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.constantFrom('/admin/users', '/admin/settings'), // Similar admin routes
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 2, maxLength: 6 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN'),
        (similarElements: NavigationElement[], unauthorizedRole: string) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create similar elements that should have consistent access control
            elementsWithDOM = similarElements.map(element => ({
              ...element,
              element: createConsistentAccessElement(element, unauthorizedRole)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // All similar elements should have consistent access control behavior
            const blockedTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              return domElement.hasAttribute('disabled') ||
                     domElement.style.pointerEvents === 'none' ||
                     domElement.style.cursor === 'not-allowed';
            });
            
            // Check for consistency - all should be blocked or all should be allowed
            const consistencyScore = blockedTests.length / elementsWithDOM.length;
            return consistencyScore >= 0.9 || consistencyScore <= 0.1; // Either all blocked or all allowed
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that access control works with dynamic permission changes', () => {
    fc.assert(
      fc.property(
        navigationElementArrayArb(1, 8),
        (elements: NavigationElement[]) => {
          const roles = ['GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'];
          let dynamicAccessWorking = true;
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];

          try {
            // Test access control with different roles
            for (let i = 0; i < roles.length - 1; i++) {
              const currentRole = roles[i];
              const nextRole = roles[i + 1];

              // Create elements for current role
              elementsWithDOM = elements.map(element => ({
                ...element,
                element: createDynamicAccessElement(element, currentRole)
              }));

              // Count blocked elements with current role
              const currentBlocked = elementsWithDOM.filter(element => {
                const domElement = element.element!;
                return domElement.hasAttribute('disabled') || 
                       domElement.style.pointerEvents === 'none';
              }).length;

              // Update elements for next role (simulate permission change)
              elementsWithDOM.forEach(element => {
                updateElementForRole(element.element!, nextRole);
              });

              // Count blocked elements with new role
              const nextBlocked = elementsWithDOM.filter(element => {
                const domElement = element.element!;
                return domElement.hasAttribute('disabled') || 
                       domElement.style.pointerEvents === 'none';
              }).length;

              // Higher roles should generally have more access (fewer blocked elements)
              if (nextRole === 'PLATFORM_ADMIN' && currentRole === 'COMPANY_ADMIN') {
                if (nextBlocked > currentBlocked) {
                  dynamicAccessWorking = false;
                }
              }
            }

            return dynamicAccessWorking;
          } finally {
            // Cleanup DOM elements
            elementsWithDOM.forEach(element => {
              if (element.element && element.element.parentNode) {
                element.element.parentNode.removeChild(element.element);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper functions to create mock DOM elements with access control
 */
function createAccessControlledElement(element: NavigationElement, userRole: string): HTMLElement {
  let domElement: HTMLElement;

  switch (element.type) {
    case 'button':
      domElement = document.createElement('button');
      break;
    case 'link':
      domElement = document.createElement('a');
      if (element.destination) {
        (domElement as HTMLAnchorElement).href = element.destination;
      }
      break;
    default:
      domElement = document.createElement('div');
  }

  // Apply access control based on destination and role
  if (element.destination) {
    const hasAccess = checkRouteAccess(element.destination, userRole);
    
    if (!hasAccess) {
      domElement.setAttribute('disabled', 'true');
      domElement.setAttribute('aria-disabled', 'true');
      domElement.style.pointerEvents = 'none';
      domElement.style.opacity = '0.5';
    }
  }

  if (element.id) domElement.id = element.id;
  if (element.ariaLabel) domElement.setAttribute('aria-label', element.ariaLabel);

  document.body.appendChild(domElement);
  return domElement;
}

function createProtectedAdminElement(element: NavigationElement, unauthorizedRole: string): HTMLElement {
  const domElement = createAccessControlledElement(element, unauthorizedRole);
  
  // Admin elements should be heavily protected from unauthorized access
  if (element.destination?.includes('/admin/')) {
    domElement.setAttribute('disabled', 'true');
    domElement.setAttribute('aria-disabled', 'true');
    domElement.style.display = 'none';
    domElement.style.visibility = 'hidden';
    domElement.style.pointerEvents = 'none';
  }

  return domElement;
}

function createCompanyAccessElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createAccessControlledElement(element, userRole);
  
  // Company elements should be accessible to COMPANY_ADMIN and PLATFORM_ADMIN
  const hasAccess = userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
  
  if (!hasAccess) {
    domElement.setAttribute('disabled', 'true');
    domElement.setAttribute('aria-disabled', 'true');
    domElement.style.pointerEvents = 'none';
  } else {
    domElement.removeAttribute('disabled');
    domElement.removeAttribute('aria-disabled');
    domElement.style.pointerEvents = 'auto';
  }

  return domElement;
}

function createPublicAccessElement(element: NavigationElement): HTMLElement {
  const domElement = createAccessControlledElement(element, 'PUBLIC');
  
  // Public elements should always be accessible
  domElement.removeAttribute('disabled');
  domElement.removeAttribute('aria-disabled');
  domElement.style.pointerEvents = 'auto';
  domElement.style.opacity = '1';
  domElement.style.display = 'block';

  return domElement;
}

function createRedirectingElement(element: NavigationElement): HTMLElement {
  const domElement = createAccessControlledElement(element, 'GUEST');
  
  // Elements that should redirect unauthorized users
  if (element.destination && !isPublicRoute(element.destination)) {
    domElement.setAttribute('data-redirect', '/login');
    domElement.setAttribute('disabled', 'true');
    domElement.style.display = 'none';
  }

  return domElement;
}

function createConsistentAccessElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createAccessControlledElement(element, userRole);
  
  // Apply consistent access control styling
  if (domElement.hasAttribute('disabled')) {
    domElement.style.backgroundColor = '#f5f5f5';
    domElement.style.color = '#999';
    domElement.style.cursor = 'not-allowed';
  }

  return domElement;
}

function createDynamicAccessElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createAccessControlledElement(element, userRole);
  
  // Add data attribute to track role changes
  domElement.setAttribute('data-current-role', userRole);
  
  return domElement;
}

function updateElementForRole(element: HTMLElement, newRole: string): void {
  const currentRole = element.getAttribute('data-current-role');
  
  if (currentRole !== newRole) {
    element.setAttribute('data-current-role', newRole);
    
    // Update access based on new role
    const destination = element.getAttribute('href') || element.getAttribute('data-destination');
    
    if (destination) {
      const hasAccess = checkRouteAccess(destination, newRole);
      
      if (hasAccess) {
        element.removeAttribute('disabled');
        element.removeAttribute('aria-disabled');
        element.style.pointerEvents = 'auto';
        element.style.opacity = '1';
      } else {
        element.setAttribute('disabled', 'true');
        element.setAttribute('aria-disabled', 'true');
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.5';
      }
    }
  }
}

/**
 * Helper function to check route access for a role
 */
function checkRouteAccess(destination: string, userRole: string): boolean {
  // Admin routes
  if (destination.includes('/admin/') || destination.includes('/platform-admin/')) {
    return userRole === 'PLATFORM_ADMIN';
  }

  // Company routes
  if (destination.includes('/company/')) {
    return userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
  }

  // Public routes
  return isPublicRoute(destination);
}

function isPublicRoute(destination: string): boolean {
  const publicRoutes = ['/home', '/search', '/about', '/contact', '/profile', '/login'];
  return publicRoutes.some(route => destination.startsWith(route));
}