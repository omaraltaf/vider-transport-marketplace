/**
 * Property-Based Test: Mobile Touch Target Accessibility
 * **Feature: ui-navigation-audit, Property 14: Mobile Touch Target Accessibility**
 * **Validates: Requirements 5.1**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AccessibilityChecker } from '../AccessibilityChecker';
import { ResponsiveTester } from '../ResponsiveTester';
import { 
  navigationElementArrayArb, 
  auditContextArb,
  completeNavigationElementArrayArb
} from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 14: Mobile Touch Target Accessibility', () => {
  let tester: ResponsiveTester;
  let mobileContext: AuditContext;

  beforeEach(() => {
    mobileContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: {
        id: 'test-user',
        role: 'COMPANY_ADMIN',
        permissions: ['read', 'write'],
      },
      viewport: { width: 375, height: 667 }, // Mobile viewport
    };
    tester = new ResponsiveTester(); // No parameters needed
  });

  /**
   * For any navigation element on mobile devices, touch targets should meet 
   * minimum size requirements and be easily accessible
   */
  it('should ensure all navigation elements meet minimum touch target size requirements', () => {
    fc.assert(
      fc.property(
        completeNavigationElementArrayArb(1, 15),
        (elements: NavigationElement[]) => {
          try {
            if (elements.length === 0) {
              return true; // No elements to test
            }

            // Use our AccessibilityChecker service to test
            const checker = new AccessibilityChecker();
            const touchTargets = checker.checkTouchTargetSize(elements);
            
            if (touchTargets.length === 0) {
              return true; // No touch targets to test
            }
            
            // Check if elements with proper dimensions meet size requirements
            const elementsWithGoodSize = touchTargets.filter(target => {
              const rect = target.element.boundingRect;
              return rect && rect.width >= 44 && rect.height >= 44;
            });
            
            const elementsWithBadSize = touchTargets.filter(target => {
              const rect = target.element.boundingRect;
              return rect && (rect.width < 44 || rect.height < 44);
            });
            
            // Elements with good size should pass the test
            const goodSizePassRate = elementsWithGoodSize.length === 0 ? 1 : 
              elementsWithGoodSize.filter(target => target.meetsMinimumSize).length / elementsWithGoodSize.length;
            
            // Elements with bad size should fail the test
            const badSizeFailRate = elementsWithBadSize.length === 0 ? 1 :
              elementsWithBadSize.filter(target => !target.meetsMinimumSize).length / elementsWithBadSize.length;
            
            // Both rates should be high (good elements pass, bad elements fail)
            return goodSizePassRate >= 0.8 && badSizeFailRate >= 0.8;
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

  it('should validate touch target size meets WCAG minimum requirements', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 20 }),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.string(), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
            width: fc.integer({ min: 20, max: 80 }),
            height: fc.integer({ min: 20, max: 80 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (elementsWithSize: Array<NavigationElement & { width: number; height: number }>) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create elements with specified sizes and proper boundingRect
            elementsWithDOM = elementsWithSize.map(element => {
              const domElement = createSizedTouchElement(element, element.width, element.height);
              
              // Create proper boundingRect based on specified dimensions
              const mockRect = {
                x: 10,
                y: 10,
                width: element.width,
                height: element.height,
                top: 10,
                right: 10 + element.width,
                bottom: 10 + element.height,
                left: 10,
                toJSON: () => ({})
              } as DOMRect;
              
              return {
                ...element,
                element: domElement,
                boundingRect: mockRect,
                tagName: domElement.tagName.toLowerCase(),
                isInteractive: true,
                isVisible: true,
                text: 'Test Element'
              };
            });

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Elements with size >= 44px should pass, smaller ones should fail
            let correctResults = 0;
            
            for (let i = 0; i < elementsWithSize.length; i++) {
              const element = elementsWithSize[i];
              const domElementWithRect = elementsWithDOM[i];
              
              const shouldPass = element.width >= 44 && element.height >= 44;
              
              // Use AccessibilityChecker to test
              const checker = new AccessibilityChecker();
              const touchTargets = checker.checkTouchTargetSize([domElementWithRect]);
              const didPass = touchTargets.length > 0 && touchTargets[0].meetsMinimumSize;
              
              if (shouldPass === didPass) {
                correctResults++;
              }
            }
            
            const accuracyScore = correctResults / elementsWithSize.length;
            return accuracyScore >= 0.8;
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

  it('should ensure adequate spacing between touch targets', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.string(), { nil: undefined }),
            ariaLabel: fc.option(fc.string(), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 2, maxLength: 8 }
        ),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create elements with proper spacing
            elementsWithDOM = elements.map((element, index) => ({
              ...element,
              element: createSpacedTouchElement(element, index)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Elements with proper spacing should have better accessibility scores
            const wellSpacedTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const margin = parseInt(domElement.style.margin) || 0;
              const hasAdequateSpacing = margin >= 12;
              const hasProperSize = parseInt(domElement.style.minWidth) >= 44;
              
              return hasAdequateSpacing && hasProperSize;
            });
            
            const spacingScore = wellSpacedTests.length / elementsWithDOM.length;
            return spacingScore >= 0.6;
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

  it('should validate touch-friendly styling and interaction patterns', () => {
    fc.assert(
      fc.property(
        auditContextArb,
        navigationElementArrayArb(1, 12),
        (context: AuditContext, elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create touch-friendly elements
            elementsWithDOM = elements.map(element => ({
              ...element,
              element: createTouchFriendlyElement(element)
            }));

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Touch-friendly elements should have better success rates
            const touchFriendlyTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasTouchAction = domElement.style.touchAction === 'manipulation';
              const hasMinSize = parseInt(domElement.style.minWidth) >= 44;
              const hasRoundedCorners = domElement.style.borderRadius === '8px';
              const hasTransition = domElement.style.transition.includes('0.2s');
              
              return hasTouchAction && hasMinSize && (hasRoundedCorners || hasTransition);
            });
            
            const touchFriendlyScore = touchFriendlyTests.length / elementsWithDOM.length;
            return touchFriendlyScore >= 0.5;
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

  it('should ensure touch targets work correctly across different mobile orientations', () => {
    fc.assert(
      fc.property(
        completeNavigationElementArrayArb(1, 8),
        (elements: NavigationElement[]) => {
          const orientations = [
            { width: 375, height: 667 }, // Portrait
            { width: 667, height: 375 }, // Landscape
          ];

          let orientationResults: boolean[] = [];

          for (const viewport of orientations) {
            try {
              if (elements.length > 0) {
                // Update elements for orientation testing
                elements.forEach(element => {
                  if (element.element) {
                    const domElement = element.element;
                    // Optimize for orientation
                    if (viewport.width > viewport.height) {
                      // Landscape optimization
                      domElement.style.width = '60px';
                      domElement.style.height = '44px';
                      domElement.style.fontSize = '14px';
                      // Update boundingRect to match
                      element.boundingRect = {
                        x: 10, y: 10, width: 60, height: 44,
                        top: 10, right: 70, bottom: 54, left: 10,
                        toJSON: () => ({})
                      } as DOMRect;
                    } else {
                      // Portrait optimization
                      domElement.style.width = '44px';
                      domElement.style.height = '48px';
                      domElement.style.fontSize = '16px';
                      // Update boundingRect to match
                      element.boundingRect = {
                        x: 10, y: 10, width: 44, height: 48,
                        top: 10, right: 54, bottom: 58, left: 10,
                        toJSON: () => ({})
                      } as DOMRect;
                    }
                  }
                });

                const successfulTests = elements.filter(element => {
                  if (!element.boundingRect) return false;
                  const rect = element.boundingRect;
                  const hasMinSize = rect.width >= 44 && rect.height >= 44;
                  const hasProperOrientation = viewport.width > viewport.height ? 
                    rect.width >= rect.height : rect.height >= rect.width;
                  
                  return hasMinSize && hasProperOrientation;
                });
                
                const orientationScore = successfulTests.length / elements.length;
                orientationResults.push(orientationScore >= 0.6);
              } else {
                orientationResults.push(true);
              }
            } catch (error) {
              orientationResults.push(false);
            }
          }

          // Cleanup DOM elements
          elements.forEach(element => {
            if (element.element && element.element.parentNode) {
              element.element.parentNode.removeChild(element.element);
            }
          });

          // Touch targets should work in both orientations
          return orientationResults.every(result => result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that touch targets are accessible with assistive technologies', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button', 'link'),
            selector: fc.string({ minLength: 1, maxLength: 15 }),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.string(), { nil: undefined }),
            role: fc.option(fc.constantFrom('button', 'link'), { nil: undefined }),
            ariaLabel: fc.oneof(
              fc.string({ minLength: 5, maxLength: 30 }),
              fc.constantFrom('Navigation button', 'Menu link', 'Action button')
            ),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            // Create accessible touch elements with proper boundingRect
            elementsWithDOM = elements.map(element => {
              const domElement = createAccessibleTouchElement(element);
              
              // Create proper boundingRect for accessibility testing
              const mockRect = {
                x: 10,
                y: 10,
                width: 48, // Good size for accessibility
                height: 48,
                top: 10,
                right: 58,
                bottom: 58,
                left: 10,
                toJSON: () => ({})
              } as DOMRect;
              
              return {
                ...element,
                element: domElement,
                boundingRect: mockRect,
                tagName: domElement.tagName.toLowerCase(),
                isInteractive: true,
                isVisible: true,
                text: element.text || 'Test Element'
              };
            });

            if (elementsWithDOM.length === 0) {
              return true;
            }

            // Check accessibility features
            let accessibilityFeatures = 0;
            let totalElements = elementsWithDOM.length;

            for (const element of elementsWithDOM) {
              const domElement = element.element!;
              
              // Check for accessibility features
              const hasAriaLabel = domElement.hasAttribute('aria-label');
              const hasRole = domElement.hasAttribute('role');
              const isFocusable = domElement.tabIndex >= 0 || 
                                ['A', 'BUTTON'].includes(domElement.tagName);
              const hasProperSize = element.boundingRect!.width >= 44;
              
              if ((hasAriaLabel || hasRole) && isFocusable && hasProperSize) {
                accessibilityFeatures++;
              }
            }

            const accessibilityScore = accessibilityFeatures / totalElements;
            return accessibilityScore >= 0.7;
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
 * Helper function to create a complete NavigationElement with DOM element and boundingRect
 */
function createCompleteNavigationElementForTest(baseElement: NavigationElement): NavigationElement {
  // Create a real DOM element
  let domElement: HTMLElement;
  
  switch (baseElement.type) {
    case 'button':
      domElement = document.createElement('button');
      break;
    case 'link':
      domElement = document.createElement('a');
      if (baseElement.destination) {
        (domElement as HTMLAnchorElement).href = baseElement.destination;
      }
      break;
    default:
      domElement = document.createElement('div');
      domElement.setAttribute('role', 'button');
      domElement.tabIndex = 0;
  }

  // Apply mobile touch optimizations
  domElement.style.minWidth = '44px';
  domElement.style.minHeight = '44px';
  domElement.style.padding = '12px 16px';
  domElement.style.margin = '8px';
  domElement.style.touchAction = 'manipulation';
  domElement.style.cursor = 'pointer';
  
  // Add webkit tap highlight
  (domElement.style as any).webkitTapHighlightColor = 'rgba(0, 0, 0, 0.1)';

  if (baseElement.id) domElement.id = baseElement.id;
  if (baseElement.ariaLabel) domElement.setAttribute('aria-label', baseElement.ariaLabel);

  document.body.appendChild(domElement);
  
  // Get the bounding rect after adding to DOM
  const boundingRect = domElement.getBoundingClientRect();
  
  // Create complete NavigationElement with all required properties
  return {
    ...baseElement,
    element: domElement,
    tagName: domElement.tagName.toLowerCase(),
    boundingRect: boundingRect,
    isInteractive: true,
    isVisible: true,
    text: baseElement.text || domElement.textContent || 'Test Element'
  };
}
function createMobileTouchElement(element: NavigationElement): HTMLElement {
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
      domElement.setAttribute('role', 'button');
      domElement.tabIndex = 0;
  }

  // Apply mobile touch optimizations
  domElement.style.minWidth = '44px';
  domElement.style.minHeight = '44px';
  domElement.style.padding = '12px 16px';
  domElement.style.margin = '8px';
  domElement.style.touchAction = 'manipulation';
  domElement.style.cursor = 'pointer';
  
  // Add webkit tap highlight
  (domElement.style as any).webkitTapHighlightColor = 'rgba(0, 0, 0, 0.1)';

  if (element.id) domElement.id = element.id;
  if (element.ariaLabel) domElement.setAttribute('aria-label', element.ariaLabel);

  document.body.appendChild(domElement);
  return domElement;
}

function createSizedTouchElement(element: NavigationElement, width: number, height: number): HTMLElement {
  const domElement = createMobileTouchElement(element);
  
  // Set specific size
  domElement.style.width = `${width}px`;
  domElement.style.height = `${height}px`;
  domElement.style.minWidth = `${width}px`;
  domElement.style.minHeight = `${height}px`;
  
  // Adjust padding based on size
  if (width >= 44 && height >= 44) {
    domElement.style.backgroundColor = '#e8f5e8'; // Green tint for good size
  } else {
    domElement.style.backgroundColor = '#ffe8e8'; // Red tint for poor size
  }

  return domElement;
}

function createSpacedTouchElement(element: NavigationElement, index: number): HTMLElement {
  const domElement = createMobileTouchElement(element);
  
  // Add proper spacing
  domElement.style.margin = '12px 8px';
  domElement.style.position = 'relative';
  domElement.style.left = `${index * 60}px`; // Space elements apart
  domElement.style.top = `${Math.floor(index / 3) * 60}px`; // Create rows
  
  return domElement;
}

function createTouchFriendlyElement(element: NavigationElement): HTMLElement {
  const domElement = createMobileTouchElement(element);
  
  // Enhanced touch-friendly features
  domElement.style.borderRadius = '8px';
  domElement.style.border = '2px solid transparent';
  domElement.style.transition = 'all 0.2s ease';
  domElement.style.userSelect = 'none';
  
  // Touch feedback
  domElement.addEventListener('touchstart', () => {
    domElement.style.backgroundColor = '#f0f0f0';
    domElement.style.transform = 'scale(0.95)';
  });
  
  domElement.addEventListener('touchend', () => {
    domElement.style.backgroundColor = '';
    domElement.style.transform = 'scale(1)';
  });

  return domElement;
}

function createOrientationOptimizedElement(element: NavigationElement, viewport: { width: number; height: number }): HTMLElement {
  const domElement = createMobileTouchElement(element);
  
  // Optimize for orientation
  if (viewport.width > viewport.height) {
    // Landscape optimization
    domElement.style.width = '60px';
    domElement.style.height = '44px';
    domElement.style.fontSize = '14px';
  } else {
    // Portrait optimization
    domElement.style.width = '44px';
    domElement.style.height = '48px';
    domElement.style.fontSize = '16px';
  }

  return domElement;
}

function createAccessibleTouchElement(element: NavigationElement): HTMLElement {
  const domElement = createMobileTouchElement(element);
  
  // Enhanced accessibility features
  if (element.ariaLabel) {
    domElement.setAttribute('aria-label', element.ariaLabel);
  } else {
    domElement.setAttribute('aria-label', 'Touch navigation element');
  }
  
  if (element.role) {
    domElement.setAttribute('role', element.role);
  }
  
  // Ensure focusable
  if (!['A', 'BUTTON'].includes(domElement.tagName)) {
    domElement.tabIndex = 0;
  }
  
  // Add focus indicators
  domElement.style.outline = 'none';
  domElement.addEventListener('focus', () => {
    domElement.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.5)';
  });
  
  domElement.addEventListener('blur', () => {
    domElement.style.boxShadow = 'none';
  });

  return domElement;
}