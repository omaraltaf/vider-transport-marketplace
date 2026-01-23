/**
 * Property-Based Test Generators
 * Generators for creating test data for navigation audit property tests
 */

import * as fc from 'fast-check';
import type { NavigationElement, AuditContext } from '../interfaces';

/**
 * Generator for navigation element types
 */
export const navigationElementTypeArb = fc.constantFrom(
  'link',
  'button',
  'menu-item',
  'form-submit'
);

/**
 * Generator for user roles
 */
export const userRoleArb = fc.constantFrom(
  'PLATFORM_ADMIN',
  'COMPANY_ADMIN',
  'GUEST'
);

/**
 * Generator for route paths
 */
export const routePathArb = fc.oneof(
  fc.constant('/'),
  fc.constant('/search'),
  fc.constant('/login'),
  fc.constant('/register'),
  fc.constant('/dashboard'),
  fc.constant('/platform-admin'),
  fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s.replace(/[^a-zA-Z0-9-_]/g, '')}`),
  fc.tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 20 }))
    .map(([section, id]) => `/${section.replace(/[^a-zA-Z0-9-_]/g, '')}/${id.replace(/[^a-zA-Z0-9-_]/g, '')}`)
);

/**
 * Generator for CSS selectors
 */
export const cssSelectorArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `#${s.replace(/[^a-zA-Z0-9-_]/g, '')}`),
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `.${s.replace(/[^a-zA-Z0-9-_]/g, '')}`),
  fc.constantFrom('button', 'a', 'input[type="submit"]', '[role="button"]')
);

/**
 * Generator for ARIA labels
 */
export const ariaLabelArb = fc.oneof(
  fc.constant(undefined),
  fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0)
);

/**
 * Generator for bounding rectangles
 */
export const boundingRectArb = fc.record({
  x: fc.integer({ min: 0, max: 1920 }),
  y: fc.integer({ min: 0, max: 1080 }),
  width: fc.integer({ min: 20, max: 200 }),
  height: fc.integer({ min: 20, max: 100 }),
  top: fc.integer({ min: 0, max: 1080 }),
  right: fc.integer({ min: 20, max: 1920 }),
  bottom: fc.integer({ min: 20, max: 1080 }),
  left: fc.integer({ min: 0, max: 1920 }),
  toJSON: fc.constant(() => ({}))
}).map(rect => ({
  ...rect,
  right: rect.x + rect.width,
  bottom: rect.y + rect.height,
  top: rect.y,
  left: rect.x
})) as fc.Arbitrary<DOMRect>;

/**
 * Generator for navigation elements with complete properties
 */
export const navigationElementArb: fc.Arbitrary<NavigationElement> = fc.record({
  id: fc.uuid(),
  type: navigationElementTypeArb,
  selector: cssSelectorArb,
  destination: fc.option(routePathArb, { nil: undefined }),
  handler: fc.option(
    fc.constantFrom(
      'handleClick',
      'submitForm',
      'toggleMenu',
      'navigate',
      'openModal',
      'closeDialog'
    ),
    { nil: undefined }
  ),
  role: fc.option(userRoleArb, { nil: undefined }),
  ariaLabel: ariaLabelArb,
  isAccessible: fc.boolean(),
  text: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  href: fc.option(routePathArb, { nil: undefined }),
  onClick: fc.option(
    fc.constantFrom(
      'handleClick()',
      'submitForm()',
      'toggleMenu()',
      'navigate()',
      'console.log("clicked")',
      'return false',
      'event.preventDefault()'
    ),
    { nil: undefined }
  ),
  tagName: fc.option(fc.constantFrom('a', 'button', 'div', 'span', 'input'), { nil: undefined }),
  boundingRect: fc.option(boundingRectArb, { nil: undefined }),
  isInteractive: fc.boolean(),
  isVisible: fc.boolean(),
  element: fc.constant(undefined) // Will be populated by test helpers when needed
});

/**
 * Generator for viewport dimensions
 */
export const viewportArb = fc.record({
  width: fc.integer({ min: 320, max: 2560 }),
  height: fc.integer({ min: 240, max: 1440 }),
});

/**
 * Generator for audit context
 */
export const auditContextArb: fc.Arbitrary<AuditContext> = fc.record({
  baseUrl: fc.webUrl(),
  currentUser: fc.option(fc.record({
    id: fc.uuid(),
    role: userRoleArb,
    permissions: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
  }), { nil: undefined }),
  authToken: fc.option(fc.string({ minLength: 20, maxLength: 200 }), { nil: undefined }),
  viewport: viewportArb,
});

/**
 * Generator for interaction test scenarios
 */
export const interactionScenarioArb = fc.record({
  element: navigationElementArb,
  testType: fc.constantFrom('click', 'keyboard', 'touch'),
  expectedBehavior: fc.string({ minLength: 10, maxLength: 100 }),
});

/**
 * Generator for accessibility test scenarios
 */
export const accessibilityScenarioArb = fc.record({
  element: navigationElementArb,
  checkType: fc.constantFrom(
    'aria-labels',
    'keyboard-navigation',
    'focus-indicators',
    'color-contrast',
    'touch-targets'
  ),
});

/**
 * Generator for responsive breakpoints
 */
export const breakpointArb = fc.constantFrom('mobile', 'tablet', 'desktop', 'wide');

/**
 * Generator for error scenarios
 */
export const errorScenarioArb = fc.record({
  errorType: fc.constantFrom('network', 'permission', 'validation', 'timeout'),
  shouldRecover: fc.boolean(),
  expectedMessage: fc.string({ minLength: 10, maxLength: 100 }),
});

/**
 * Generator for state management scenarios
 */
export const stateManagementScenarioArb = fc.record({
  initialState: fc.record({
    user: fc.option(fc.record({
      id: fc.uuid(),
      role: userRoleArb,
    })),
    route: routePathArb,
    permissions: fc.array(fc.string({ minLength: 3, maxLength: 20 })),
  }),
  action: fc.constantFrom('navigate', 'login', 'logout', 'permission-change'),
  expectedStateChange: fc.boolean(),
});

/**
 * Helper function to create arrays of navigation elements
 */
export const navigationElementArrayArb = (minLength = 1, maxLength = 20) =>
  fc.array(navigationElementArb, { minLength, maxLength });

/**
 * Helper function to create role-based test scenarios
 */
export const roleBasedScenarioArb = fc.record({
  userRole: userRoleArb,
  targetRoute: routePathArb,
  shouldHaveAccess: fc.boolean(),
  navigationElements: navigationElementArrayArb(1, 10),
});

/**
 * Helper function to create a complete NavigationElement with DOM element
 */
export function createCompleteNavigationElement(baseElement: NavigationElement): NavigationElement {
  // Create a real DOM element
  let domElement: HTMLElement;
  
  switch (baseElement.type) {
    case 'button':
      domElement = document.createElement('button');
      break;
    case 'link':
      domElement = document.createElement('a');
      if (baseElement.href) {
        (domElement as HTMLAnchorElement).href = baseElement.href;
      }
      break;
    default:
      domElement = document.createElement('div');
      domElement.setAttribute('role', 'button');
      domElement.tabIndex = 0;
  }

  // Set basic properties
  if (baseElement.id) domElement.id = baseElement.id;
  if (baseElement.ariaLabel) domElement.setAttribute('aria-label', baseElement.ariaLabel);
  if (baseElement.text) domElement.textContent = baseElement.text;
  
  // Set dimensions for testing - ensure element is visible and has proper size
  domElement.style.width = '60px';
  domElement.style.height = '40px';
  domElement.style.minWidth = '60px';
  domElement.style.minHeight = '40px';
  domElement.style.position = 'absolute';
  domElement.style.left = '10px';
  domElement.style.top = '10px';
  domElement.style.visibility = 'visible';
  domElement.style.display = 'block';
  domElement.style.padding = '8px';
  domElement.style.margin = '4px';
  domElement.style.border = '1px solid #ccc';
  domElement.style.backgroundColor = '#f9f9f9';
  
  // Add to DOM temporarily to get bounding rect
  document.body.appendChild(domElement);
  
  // Force layout calculation
  domElement.offsetHeight; // This forces a layout calculation
  
  let boundingRect = domElement.getBoundingClientRect();
  
  // If getBoundingClientRect returns zeros (common in test environments),
  // create a mock DOMRect with realistic dimensions
  if (boundingRect.width === 0 || boundingRect.height === 0) {
    const mockRect = {
      x: 10,
      y: 10,
      width: 60,
      height: 40,
      top: 10,
      right: 70,
      bottom: 50,
      left: 10,
      toJSON: () => ({})
    } as DOMRect;
    boundingRect = mockRect;
  }
  
  // Create complete NavigationElement
  const completeElement: NavigationElement = {
    ...baseElement,
    element: domElement,
    tagName: domElement.tagName.toLowerCase(),
    boundingRect: boundingRect,
    isInteractive: baseElement.isInteractive ?? true,
    isVisible: baseElement.isVisible ?? true,
    text: baseElement.text || domElement.textContent || 'Test Element'
  };

  return completeElement;
}

/**
 * Helper function to cleanup DOM elements created during testing
 */
export function cleanupNavigationElement(element: NavigationElement): void {
  if (element.element && element.element.parentNode) {
    element.element.parentNode.removeChild(element.element);
  }
}

/**
 * Generator for complete navigation elements with DOM elements
 */
export const completeNavigationElementArb: fc.Arbitrary<NavigationElement> = 
  navigationElementArb.map(createCompleteNavigationElement);

/**
 * Helper function to create arrays of complete navigation elements
 */
export const completeNavigationElementArrayArb = (minLength = 1, maxLength = 20) =>
  fc.array(completeNavigationElementArb, { minLength, maxLength });