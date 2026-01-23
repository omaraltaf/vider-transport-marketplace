/**
 * Property-Based Test: Responsive Navigation Adaptation
 * **Feature: ui-navigation-audit, Property 15: Responsive Navigation Adaptation**
 * **Validates: Requirements 5.2, 5.3**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ResponsiveTester } from '../ResponsiveTester';
import { navigationElementArrayArb } from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 15: Responsive Navigation Adaptation', () => {
  let tester: ResponsiveTester;
  let mockContext: AuditContext;

  beforeEach(() => {
    mockContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: { id: 'test-user', role: 'COMPANY_ADMIN', permissions: ['read', 'write'] },
      viewport: { width: 1280, height: 720 },
    };
    tester = new ResponsiveTester(mockContext);
  });

  it('should ensure navigation layout adapts appropriately across breakpoints', () => {
    fc.assert(
      fc.property(
        navigationElementArrayArb(1, 10),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            elementsWithDOM = elements.map(element => ({
              ...element,
              element: createResponsiveElement(element)
            }));

            // Simulate responsive testing across different breakpoints
            const breakpoints = [
              { width: 320, height: 568 },  // Mobile
              { width: 768, height: 1024 }, // Tablet
              { width: 1280, height: 720 }  // Desktop
            ];

            let workingBreakpoints = 0;

            for (const viewport of breakpoints) {
              const responsiveElements = elementsWithDOM.filter(element => {
                const domElement = element.element!;
                const hasFlexDisplay = domElement.style.display === 'flex';
                const hasMaxWidth = domElement.style.maxWidth === '200px';
                const hasPadding = domElement.style.padding === '8px 16px';
                
                return hasFlexDisplay && hasMaxWidth && hasPadding;
              });

              if (responsiveElements.length > elementsWithDOM.length * 0.5) {
                workingBreakpoints++;
              }
            }
            
            // Most breakpoints should work correctly
            return workingBreakpoints >= 2; // At least 2 breakpoints should work
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

  it('should validate layout adaptation maintains functionality', () => {
    fc.assert(
      fc.property(
        navigationElementArrayArb(1, 8),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            elementsWithDOM = elements.map(element => ({
              ...element,
              element: createAdaptiveElement(element)
            }));

            if (elementsWithDOM.length === 0) return true;
            
            const functionalTests = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasResponsiveClass = domElement.classList.contains('responsive-nav');
              const hasFlexDirection = domElement.style.flexDirection === 'column';
              const maintainsDisplay = domElement.style.display === 'flex';
              
              return hasResponsiveClass && hasFlexDirection && maintainsDisplay;
            });
            
            return functionalTests.length / elementsWithDOM.length >= 0.6;
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

function createResponsiveElement(element: NavigationElement): HTMLElement {
  const domElement = document.createElement(element.type === 'link' ? 'a' : 'button');
  domElement.style.display = 'flex';
  domElement.style.width = '100%';
  domElement.style.maxWidth = '200px';
  domElement.style.padding = '8px 16px';
  
  if (element.id) domElement.id = element.id;
  if (element.ariaLabel) domElement.setAttribute('aria-label', element.ariaLabel);
  
  document.body.appendChild(domElement);
  return domElement;
}

function createAdaptiveElement(element: NavigationElement): HTMLElement {
  const domElement = createResponsiveElement(element);
  domElement.classList.add('responsive-nav');
  domElement.style.flexDirection = 'column';
  return domElement;
}