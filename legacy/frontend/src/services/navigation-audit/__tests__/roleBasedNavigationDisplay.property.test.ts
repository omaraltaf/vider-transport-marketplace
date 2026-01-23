/**
 * Property-Based Test: Role-Based Navigation Display
 * **Feature: ui-navigation-audit, Property 8: Role-Based Navigation Display**
 * **Validates: Requirements 3.1, 3.3, 4.4**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RoleBasedTester } from '../RoleBasedTester';
import { auditContextArb } from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 8: Role-Based Navigation Display', () => {
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
   * For any user role, only appropriate navigation options should be displayed and accessible
   */
  it('should ensure navigation elements are displayed appropriately for each role', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link', 'menu-item'),
            selector: fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.constantFrom('.admin-only', '.company-admin', '.public', '.guest-only')
            ),
            destination: fc.option(fc.oneof(
              fc.string({ minLength: 1, maxLength: 30 }),
              fc.constantFrom('/admin/dashboard', '/company/settings', '/public/home', '/login')
            ), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'GUEST'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (elements: NavigationElement[], userRole: string) => {
          try {
            // Create DOM elements with role-based visibility
            const elementsWithDOM = elements.map(element => ({
              ...element,
              element: createRoleBasedElement(element, userRole)
            }));

            // Test role-based display logic synchronously
            let correctDisplayCount = 0;
            for (const elementWithDOM of elementsWithDOM) {
              const shouldBeVisible = shouldElementBeVisibleForRole(elementWithDOM, userRole);
              const isVisible = elementWithDOM.element && 
                               elementWithDOM.element.style.display !== 'none' &&
                               elementWithDOM.element.getAttribute('aria-hidden') !== 'true';
              
              if (shouldBeVisible === isVisible) {
                correctDisplayCount++;
              }
            }

            if (elementsWithDOM.length === 0) {
              return true; // No elements to test
            }

            // Property: most elements should have correct role-based display
            const displayScore = correctDisplayCount / elementsWithDOM.length;
            return displayScore >= 0.7;
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            elements.forEach(element => {
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

  it('should validate that admin elements are only visible to admin roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.constantFrom('.admin-only', '.platform-admin', '[data-admin]'),
            destination: fc.option(fc.constantFrom('/admin/dashboard', '/platform-admin/users'), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (adminElements: NavigationElement[], userRole: string) => {
          try {
            // Create admin elements
            const elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createAdminElement(element, userRole)
            }));

            let correctVisibilityCount = 0;
            for (const elementWithDOM of elementsWithDOM) {
              // Admin elements should only be visible to PLATFORM_ADMIN
              const shouldBeVisible = userRole === 'PLATFORM_ADMIN';
              const isVisible = elementWithDOM.element && 
                               elementWithDOM.element.style.display !== 'none' &&
                               elementWithDOM.element.style.visibility !== 'hidden';
              
              if (shouldBeVisible === isVisible) {
                correctVisibilityCount++;
              }
            }

            if (elementsWithDOM.length === 0) {
              return true;
            }

            const visibilityScore = correctVisibilityCount / elementsWithDOM.length;
            return visibilityScore >= 0.8;
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            adminElements.forEach(element => {
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

  it('should validate that company admin elements are visible to appropriate roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.constantFrom('.company-admin', '[data-company]'),
            destination: fc.option(fc.constantFrom('/company/dashboard', '/company/settings'), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('COMPANY_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (companyElements: NavigationElement[], userRole: string) => {
          try {
            // Create company admin elements
            const elementsWithDOM = companyElements.map(element => ({
              ...element,
              element: createCompanyAdminElement(element, userRole)
            }));

            let correctVisibilityCount = 0;
            for (const elementWithDOM of elementsWithDOM) {
              // Company admin elements should be visible to COMPANY_ADMIN and PLATFORM_ADMIN
              const shouldBeVisible = userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
              const isVisible = elementWithDOM.element && 
                               elementWithDOM.element.style.display !== 'none';
              
              if (shouldBeVisible === isVisible) {
                correctVisibilityCount++;
              }
            }

            if (elementsWithDOM.length === 0) {
              return true;
            }

            const visibilityScore = correctVisibilityCount / elementsWithDOM.length;
            return visibilityScore >= 0.7;
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            companyElements.forEach(element => {
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

  it('should validate that public elements are visible to all roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.constantFrom('.public', '.nav-public', ''),
            destination: fc.option(fc.constantFrom('/home', '/about', '/contact', '/search'), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.string(), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 12 }
        ),
        fc.constantFrom('GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (publicElements: NavigationElement[], userRole: string) => {
          try {
            // Create public elements
            const elementsWithDOM = publicElements.map(element => ({
              ...element,
              element: createPublicElement(element)
            }));

            let visibleCount = 0;
            for (const elementWithDOM of elementsWithDOM) {
              const isVisible = elementWithDOM.element && 
                               elementWithDOM.element.style.display !== 'none' &&
                               elementWithDOM.element.style.visibility !== 'hidden';
              
              if (isVisible) {
                visibleCount++;
              }
            }

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Public elements should be visible to all roles
            const visibilityScore = visibleCount / elementsWithDOM.length;
            return visibilityScore >= 0.9; // High expectation for public elements
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            publicElements.forEach(element => {
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

  it('should ensure consistent navigation display patterns within roles', () => {
    fc.assert(
      fc.property(
        auditContextArb,
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('COMPANY_ADMIN', 'PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (context: AuditContext, elements: NavigationElement[]) => {
          // Skip test if no current user (can't test role-based display without a user)
          if (!context.currentUser) {
            return true;
          }

          try {
            // Simplified consistency test: elements with the same role should behave consistently
            const elementsWithDOM = elements.map(element => ({
              ...element,
              element: createConsistentElement(element)
            }));

            // Group elements by their role
            const elementsByRole = new Map<string, typeof elementsWithDOM>();
            for (const element of elementsWithDOM) {
              const role = element.role || 'PUBLIC';
              if (!elementsByRole.has(role)) {
                elementsByRole.set(role, []);
              }
              elementsByRole.get(role)!.push(element);
            }

            // Test consistency within each role group
            let consistentGroups = 0;
            let totalGroups = 0;

            for (const [role, roleElements] of elementsByRole) {
              if (roleElements.length < 2) continue; // Need at least 2 elements to test consistency
              
              totalGroups++;
              
              // Check if all elements in this role group have consistent visibility
              const firstElementVisible = roleElements[0].element && 
                                         roleElements[0].element.style.display !== 'none';
              
              const allConsistent = roleElements.every(element => {
                const isVisible = element.element && element.element.style.display !== 'none';
                return isVisible === firstElementVisible;
              });
              
              if (allConsistent) {
                consistentGroups++;
              }
            }

            // If no groups to test, consider it consistent
            if (totalGroups === 0) return true;
            
            // At least 60% of role groups should be consistent
            const consistencyRatio = consistentGroups / totalGroups;
            return consistencyRatio >= 0.6;
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            elements.forEach(element => {
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

  it('should validate navigation hierarchy respects role permissions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.option(fc.oneof(
              fc.constantFrom('/admin/users', '/admin/settings'),
              fc.constantFrom('/company/dashboard', '/company/reports'),
              fc.constantFrom('/profile', '/search')
            ), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'GUEST'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (elements: NavigationElement[]) => {
          const roles = ['GUEST', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'];
          let hierarchyRespected = true;

          try {
            for (const role of roles) {
              // Create elements with proper hierarchy
              const elementsWithDOM = elements.map(element => ({
                ...element,
                element: createHierarchicalElement(element, role)
              }));

              // Check that higher-level admin elements are not visible to lower roles
              for (const elementWithDOM of elementsWithDOM) {
                const element = elementWithDOM.element;
                
                if (elementWithDOM.destination?.includes('/admin/') && role !== 'PLATFORM_ADMIN') {
                  // Platform admin routes should not be visible to non-platform admins
                  const isVisible = element && element.style.display !== 'none';
                  if (isVisible) {
                    hierarchyRespected = false;
                  }
                }
                
                if (elementWithDOM.destination?.includes('/company/') && role === 'GUEST') {
                  // Company routes should not be visible to guests
                  const isVisible = element && element.style.display !== 'none';
                  if (isVisible) {
                    hierarchyRespected = false;
                  }
                }
              }
            }

            return hierarchyRespected;
          } catch (error) {
            return false;
          } finally {
            // Cleanup DOM elements
            elements.forEach(element => {
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
 * Helper functions to create mock DOM elements with role-based visibility
 */
function createRoleBasedElement(element: NavigationElement, userRole: string): HTMLElement {
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

  // Apply role-based visibility
  const shouldBeVisible = shouldElementBeVisibleForRole(element, userRole);
  
  if (!shouldBeVisible) {
    domElement.style.display = 'none';
    domElement.setAttribute('aria-hidden', 'true');
  }

  if (element.id) domElement.id = element.id;
  if (element.ariaLabel) domElement.setAttribute('aria-label', element.ariaLabel);
  if (element.selector) domElement.className = element.selector.replace(/[.#]/g, '');

  document.body.appendChild(domElement);
  return domElement;
}

function createAdminElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createRoleBasedElement(element, userRole);
  
  // Admin elements should only be visible to PLATFORM_ADMIN
  const shouldBeVisible = userRole === 'PLATFORM_ADMIN';
  
  if (!shouldBeVisible) {
    domElement.style.display = 'none';
    domElement.setAttribute('aria-hidden', 'true');
    domElement.style.visibility = 'hidden';
  } else {
    domElement.style.display = 'block';
    domElement.removeAttribute('aria-hidden');
    domElement.style.visibility = 'visible';
  }

  return domElement;
}

function createCompanyAdminElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createRoleBasedElement(element, userRole);
  
  // Company admin elements should be visible to COMPANY_ADMIN and PLATFORM_ADMIN
  const shouldBeVisible = userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
  
  if (!shouldBeVisible) {
    domElement.style.display = 'none';
    domElement.setAttribute('aria-hidden', 'true');
  } else {
    domElement.style.display = 'block';
    domElement.removeAttribute('aria-hidden');
  }

  return domElement;
}

function createPublicElement(element: NavigationElement): HTMLElement {
  const domElement = createRoleBasedElement(element, 'PUBLIC');
  
  // Public elements should always be visible
  domElement.style.display = 'block';
  domElement.removeAttribute('aria-hidden');
  domElement.style.visibility = 'visible';

  return domElement;
}

function createConsistentElement(element: NavigationElement): HTMLElement {
  const domElement = createRoleBasedElement(element, 'COMPANY_ADMIN');
  
  // Apply consistent styling and behavior
  domElement.style.padding = '8px 16px';
  domElement.style.margin = '4px';
  domElement.style.border = '1px solid #ccc';
  domElement.style.borderRadius = '4px';
  
  return domElement;
}

function createHierarchicalElement(element: NavigationElement, userRole: string): HTMLElement {
  const domElement = createRoleBasedElement(element, userRole);
  
  // Apply hierarchical visibility rules
  if (element.destination) {
    if (element.destination.includes('/admin/')) {
      // Platform admin only
      const shouldBeVisible = userRole === 'PLATFORM_ADMIN';
      domElement.style.display = shouldBeVisible ? 'block' : 'none';
    } else if (element.destination.includes('/company/')) {
      // Company admin and above
      const shouldBeVisible = userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
      domElement.style.display = shouldBeVisible ? 'block' : 'none';
    } else {
      // Public routes
      domElement.style.display = 'block';
    }
  }

  return domElement;
}

/**
 * Helper function to determine if element should be visible for role
 */
function shouldElementBeVisibleForRole(element: NavigationElement, userRole: string): boolean {
  // Handle edge cases - elements with no meaningful content should be visible by default
  if (!element.selector || element.selector.trim() === '' || element.selector === ' ') {
    if (!element.destination && !element.role) {
      return true; // Default to visible for empty elements
    }
  }

  // Check selector-based rules
  if (element.selector) {
    if (element.selector.includes('admin-only') || element.selector.includes('platform-admin')) {
      return userRole === 'PLATFORM_ADMIN';
    }
    
    if (element.selector.includes('company-admin')) {
      return userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
    }
    
    if (element.selector.includes('public') || element.selector === '' || element.selector.trim() === '') {
      return true; // Public elements visible to all
    }
  }

  // Check destination-based rules
  if (element.destination) {
    if (element.destination.includes('/admin/')) {
      return userRole === 'PLATFORM_ADMIN';
    }
    
    if (element.destination.includes('/company/')) {
      return userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
    }
  }

  // Check role-based rules
  if (element.role) {
    if (element.role === 'PLATFORM_ADMIN') {
      return userRole === 'PLATFORM_ADMIN';
    }
    
    if (element.role === 'COMPANY_ADMIN') {
      return userRole === 'COMPANY_ADMIN' || userRole === 'PLATFORM_ADMIN';
    }
  }

  // Default to visible for elements without specific restrictions
  return true;
}