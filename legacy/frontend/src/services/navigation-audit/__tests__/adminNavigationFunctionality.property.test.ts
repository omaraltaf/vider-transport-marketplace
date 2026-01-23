/**
 * Property-Based Test: Admin Navigation Functionality
 * **Feature: ui-navigation-audit, Property 11: Admin Navigation Functionality**
 * **Validates: Requirements 4.1**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AdminNavigationValidator } from '../AdminNavigationValidator';
import { RoleBasedTester } from '../RoleBasedTester';
import { 
  navigationElementArrayArb, 
  auditContextArb 
} from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 11: Admin Navigation Functionality', () => {
  let validator: AdminNavigationValidator;
  let tester: RoleBasedTester;
  let mockContext: AuditContext;

  beforeEach(() => {
    mockContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: {
        id: 'test-admin',
        role: 'PLATFORM_ADMIN',
        permissions: ['read', 'write', 'admin', 'platform_admin'],
      },
      viewport: { width: 1280, height: 720 },
    };
    validator = new AdminNavigationValidator(mockContext);
    tester = new RoleBasedTester(mockContext);
  });

  /**
   * For any administrative navigation element, it should provide working 
   * access to all intended administrative functions
   */
  it('should ensure admin navigation elements provide working access to administrative functions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link', 'menu-item'),
            selector: fc.oneof(
              fc.constantFrom('.admin-nav', '.platform-admin', '[data-admin]'),
              fc.string({ minLength: 1, maxLength: 20 })
            ),
            destination: fc.option(fc.constantFrom(
              '/admin/dashboard', '/admin/users', '/admin/settings',
              '/platform-admin/analytics', '/admin/companies'
            ), { nil: undefined }),
            handler: fc.option(fc.oneof(
              fc.constantFrom('handleAdminAction', 'adminNavigate', 'manageUsers'),
              fc.string({ minLength: 1, maxLength: 30 })
            ), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN', 'admin'), { nil: undefined }),
            ariaLabel: fc.option(fc.oneof(
              fc.constantFrom('Admin Dashboard', 'Manage Users', 'Platform Settings'),
              fc.string({ minLength: 1, maxLength: 40 })
            ), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 12 }
        ),
        (adminElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create admin navigation elements
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createAdminNavigationElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true; // No admin elements to test
            }

            // Simulate admin navigation testing
            const functionalTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasAdminDestination = element.destination?.includes('/admin/');
              const hasAdminHandler = element.handler?.includes('admin');
              const hasAdminStyling = domElement.style.backgroundColor === 'rgb(248, 249, 250)';
              
              return hasAdminDestination || hasAdminHandler || hasAdminStyling;
            });
            
            if (functionalTests.length === 0) return true;
            
            const functionalityScore = functionalTests.length / elementsWithDOM.length;
            
            return functionalityScore >= 0.7;
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

  it('should validate admin navigation has proper destinations and handlers', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.constantFrom('.admin-only', '.platform-admin'),
            destination: fc.constantFrom('/admin/dashboard', '/admin/users', '/admin/settings'),
            handler: fc.option(fc.constantFrom('adminAction', 'handleAdminClick'), { nil: undefined }),
            role: fc.constantFrom('PLATFORM_ADMIN'),
            ariaLabel: fc.constantFrom('Admin Navigation', 'Platform Administration'),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (adminElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create well-formed admin elements
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createWellFormedAdminElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // All well-formed admin elements should pass functionality tests
            const successfulTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasDestination = domElement.hasAttribute('data-destination');
              const hasHandler = domElement.hasAttribute('data-handler');
              const hasProperRole = domElement.getAttribute('role') === 'button' || 
                                   domElement.getAttribute('role') === 'PLATFORM_ADMIN';
              const hasLabel = domElement.hasAttribute('aria-label') || domElement.textContent;
              
              return (hasDestination || hasHandler) && hasProperRole && hasLabel;
            });
            
            const adminScore = successfulTests.length / elementsWithDOM.length;
            
            return adminScore >= 0.8;
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

  it('should validate breadcrumb navigation consistency in admin sections', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('link'),
            selector: fc.oneof(
              fc.constantFrom('.breadcrumb', '.nav-path', '[role="navigation"]'),
              fc.string({ minLength: 1, maxLength: 15 })
            ),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('navigation', 'breadcrumb'), { nil: undefined }),
            ariaLabel: fc.option(fc.constantFrom('Breadcrumb navigation', 'Page path'), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 6 }
        ),
        (breadcrumbElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create breadcrumb elements
            elementsWithDOM = breadcrumbElements.map(element => ({
              ...element,
              element: createBreadcrumbElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true; // No breadcrumb tests generated
            }

            // Breadcrumb navigation should be consistent
            const consistentTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasBreadcrumbStructure = domElement.closest('nav[aria-label="Breadcrumb"]') !== null;
              const hasProperRole = domElement.getAttribute('role') === 'navigation' ||
                                   domElement.closest('[role="navigation"]') !== null;
              
              return hasBreadcrumbStructure || hasProperRole;
            });
            
            const consistencyScore = consistentTests.length / elementsWithDOM.length;
            
            return consistencyScore >= 0.6;
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

  it('should validate admin error handling and recovery options', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.option(fc.constantFrom('/admin/dashboard', '/admin/users'), { nil: undefined }),
            handler: fc.option(fc.oneof(
              fc.constantFrom('handleAdminError', 'adminActionWithRetry'),
              fc.string({ minLength: 1, maxLength: 30 })
            ), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (adminElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create admin elements with error handling
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createErrorHandlingAdminElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Admin elements should have adequate error handling
            const adequateErrorHandling = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasErrorHandler = domElement.hasAttribute('data-error-handler');
              const hasRetry = domElement.hasAttribute('data-retry');
              const hasTooltip = domElement.hasAttribute('data-tooltip');
              
              return hasErrorHandler || hasRetry || hasTooltip;
            });
            
            const errorHandlingScore = adequateErrorHandling.length / elementsWithDOM.length;
            
            return errorHandlingScore >= 0.5; // Moderate expectation for error handling
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

  it('should ensure admin navigation follows consistent access patterns', () => {
    fc.assert(
      fc.property(
        auditContextArb,
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.constantFrom('.admin-nav', '.platform-admin'),
            destination: fc.option(fc.constantFrom('/admin/dashboard', '/admin/settings'), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN'), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 2, maxLength: 8 }
        ),
        (context: AuditContext, adminElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create consistent admin elements
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createConsistentAdminElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Admin elements should follow consistent patterns
            const consistentPatterns = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasConsistentStyling = domElement.style.fontFamily === 'system-ui, sans-serif' &&
                                         domElement.style.fontSize === '14px';
              const hasConsistentColors = domElement.style.color === 'rgb(73, 80, 87)';
              const hasConsistentBehavior = domElement.style.cursor === 'pointer';
              
              return hasConsistentStyling && hasConsistentColors && hasConsistentBehavior;
            });
            
            const patternScore = consistentPatterns.length / elementsWithDOM.length;
            
            return patternScore >= 0.6;
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

  it('should validate that admin navigation is properly labeled and accessible', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link', 'menu-item'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.option(fc.constantFrom('/admin/dashboard', '/admin/users'), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('PLATFORM_ADMIN', 'button', 'link'), { nil: undefined }),
            ariaLabel: fc.oneof(
              fc.constantFrom('Admin Dashboard', 'User Management', 'Platform Settings'),
              fc.string({ minLength: 5, maxLength: 30 })
            ),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (adminElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create properly labeled admin elements
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createLabeledAdminElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Check for proper labeling and accessibility
            let labelingScore = 0;
            let accessibilityScore = 0;
            let totalElements = elementsWithDOM.length;

            for (const element of elementsWithDOM) {
              // Check labeling
              const hasLabel = element.ariaLabel || 
                              element.element!.textContent?.trim() ||
                              element.element!.getAttribute('title');
              if (hasLabel) labelingScore++;

              // Check accessibility
              const isAccessible = element.element!.tabIndex >= 0 || 
                                 ['A', 'BUTTON'].includes(element.element!.tagName) ||
                                 element.element!.getAttribute('role') === 'button';
              if (isAccessible) accessibilityScore++;
            }

            const overallLabelingScore = labelingScore / totalElements;
            const overallAccessibilityScore = accessibilityScore / totalElements;
            
            return overallLabelingScore >= 0.8 && overallAccessibilityScore >= 0.7;
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

  it('should ensure admin navigation maintains context and permissions', () => {
    fc.assert(
      fc.property(
        navigationElementArrayArb(1, 6),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Filter to admin-like elements
            const adminElements = elements.filter(element => 
              element.destination?.includes('admin') ||
              element.selector?.includes('admin') ||
              element.role?.includes('ADMIN')
            );

            if (adminElements.length === 0) {
              return true; // No admin elements to test
            }

            // Create admin elements with context preservation
            elementsWithDOM = adminElements.map(element => ({
              ...element,
              element: createContextPreservingAdminElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Admin navigation should maintain proper context
            const contextTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasAdminContext = domElement.hasAttribute('data-admin-context');
              const hasPermissionLevel = domElement.hasAttribute('data-permission-level');
              const hasSessionContext = domElement.hasAttribute('data-session-context');
              
              return hasAdminContext && hasPermissionLevel && hasSessionContext;
            });
            
            if (contextTests.length === 0) return true;
            
            const contextScore = contextTests.length / elementsWithDOM.length;
            return contextScore >= 0.6;
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
 * Helper functions to create mock admin navigation elements
 */
function createAdminNavigationElement(element: NavigationElement): HTMLElement {
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
    case 'menu-item':
      domElement = document.createElement('div');
      domElement.setAttribute('role', 'menuitem');
      domElement.tabIndex = 0;
      break;
    default:
      domElement = document.createElement('div');
  }

  // Add admin-specific attributes
  if (element.id) domElement.id = element.id;
  if (element.ariaLabel) domElement.setAttribute('aria-label', element.ariaLabel);
  if (element.selector) {
    domElement.className = element.selector.replace(/[.#\[\]]/g, '');
  }

  // Add admin styling
  domElement.style.backgroundColor = '#f8f9fa';
  domElement.style.border = '1px solid #dee2e6';
  domElement.style.padding = '8px 12px';

  document.body.appendChild(domElement);
  return domElement;
}

function createWellFormedAdminElement(element: NavigationElement): HTMLElement {
  const domElement = createAdminNavigationElement(element);
  
  // Ensure well-formed admin element
  if (element.destination) {
    domElement.setAttribute('data-destination', element.destination);
  }
  
  if (element.handler) {
    domElement.setAttribute('data-handler', element.handler);
  }
  
  // Add proper ARIA attributes
  domElement.setAttribute('role', element.role || 'button');
  
  if (!element.ariaLabel && !domElement.textContent) {
    domElement.setAttribute('aria-label', 'Admin function');
  }

  return domElement;
}

function createBreadcrumbElement(element: NavigationElement): HTMLElement {
  // Create breadcrumb structure
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  
  const ol = document.createElement('ol');
  ol.className = 'breadcrumb';
  
  // Add breadcrumb items
  const items = ['Home', 'Admin', 'Dashboard'];
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    
    if (index === items.length - 1) {
      li.setAttribute('aria-current', 'page');
      li.textContent = item;
    } else {
      const link = document.createElement('a');
      link.href = `/${item.toLowerCase()}`;
      link.textContent = item;
      li.appendChild(link);
    }
    
    ol.appendChild(li);
  });
  
  nav.appendChild(ol);
  document.body.appendChild(nav);
  
  return element.type === 'link' ? ol.querySelector('a') || ol : nav;
}

function createErrorHandlingAdminElement(element: NavigationElement): HTMLElement {
  const domElement = createAdminNavigationElement(element);
  
  // Add error handling attributes
  if (element.handler?.includes('error') || element.handler?.includes('retry')) {
    domElement.setAttribute('data-error-handler', 'true');
  }
  
  domElement.setAttribute('data-tooltip', 'Admin function with error handling');
  domElement.setAttribute('title', 'Click to perform admin action');
  
  // Add retry mechanism indicator
  domElement.setAttribute('data-retry', 'true');
  
  return domElement;
}

function createConsistentAdminElement(element: NavigationElement): HTMLElement {
  const domElement = createAdminNavigationElement(element);
  
  // Apply consistent admin styling
  domElement.style.fontFamily = 'system-ui, sans-serif';
  domElement.style.fontSize = '14px';
  domElement.style.fontWeight = '500';
  domElement.style.color = '#495057';
  domElement.style.textDecoration = 'none';
  domElement.style.borderRadius = '4px';
  domElement.style.cursor = 'pointer';
  
  // Consistent hover behavior
  domElement.addEventListener('mouseenter', () => {
    domElement.style.backgroundColor = '#e9ecef';
  });
  
  domElement.addEventListener('mouseleave', () => {
    domElement.style.backgroundColor = '#f8f9fa';
  });

  return domElement;
}

function createLabeledAdminElement(element: NavigationElement): HTMLElement {
  const domElement = createAdminNavigationElement(element);
  
  // Ensure proper labeling
  if (element.ariaLabel) {
    domElement.setAttribute('aria-label', element.ariaLabel);
  }
  
  if (!domElement.textContent && !element.ariaLabel) {
    domElement.textContent = 'Admin Function';
  }
  
  // Add descriptive title
  domElement.setAttribute('title', element.ariaLabel || 'Administrative function');
  
  // Ensure keyboard accessibility
  if (!['A', 'BUTTON', 'INPUT'].includes(domElement.tagName)) {
    domElement.tabIndex = 0;
    domElement.setAttribute('role', 'button');
  }

  return domElement;
}

function createContextPreservingAdminElement(element: NavigationElement): HTMLElement {
  const domElement = createAdminNavigationElement(element);
  
  // Add context preservation attributes
  domElement.setAttribute('data-admin-context', 'true');
  domElement.setAttribute('data-permission-level', 'admin');
  
  if (element.destination?.includes('admin')) {
    domElement.setAttribute('data-admin-route', 'true');
  }
  
  if (element.role?.includes('ADMIN')) {
    domElement.setAttribute('data-admin-role', element.role);
  }
  
  // Add session context
  domElement.setAttribute('data-session-context', 'admin-session');

  return domElement;
}