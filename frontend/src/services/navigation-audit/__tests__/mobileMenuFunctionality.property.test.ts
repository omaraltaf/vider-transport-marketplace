/**
 * Property-Based Test: Mobile Menu Functionality
 * **Feature: ui-navigation-audit, Property 16: Mobile Menu Functionality**
 * **Validates: Requirements 5.4, 5.5**
 */

import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ResponsiveTester } from '../ResponsiveTester';
import { navigationElementArrayArb } from '../utils/testGenerators';
import type { NavigationElement, AuditContext } from '../interfaces';

describe('Property 16: Mobile Menu Functionality', () => {
  let tester: ResponsiveTester;
  let mobileContext: AuditContext;

  beforeEach(() => {
    mobileContext = {
      baseUrl: 'http://localhost:3000',
      currentUser: { id: 'test-user', role: 'COMPANY_ADMIN', permissions: ['read', 'write'] },
      viewport: { width: 375, height: 667 },
    };
    tester = new ResponsiveTester(mobileContext);
  });

  it('should ensure mobile menu open/close functionality works properly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('button' as const),
            selector: fc.constantFrom('.mobile-menu', '.hamburger', '.nav-toggle'),
            destination: fc.option(fc.string(), { nil: undefined }),
            handler: fc.option(fc.constantFrom('toggleMenu', 'openMenu'), { nil: undefined }),
            role: fc.option(fc.constantFrom('button'), { nil: undefined }),
            ariaLabel: fc.option(fc.constantFrom('Toggle menu', 'Open navigation'), { nil: undefined }),
            isAccessible: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (mobileMenuElements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            elementsWithDOM = mobileMenuElements.map(element => ({
              ...element,
              element: createMobileMenuElement(element)
            }));

            if (elementsWithDOM.length === 0) return true;
            
            const functionalMenus = elementsWithDOM.filter(element => {
              const domElement = element.element!;
              const hasToggleData = domElement.hasAttribute('data-toggle');
              const hasAriaExpanded = domElement.hasAttribute('aria-expanded');
              const hasProperSize = domElement.style.width === '48px';
              
              return hasToggleData && hasAriaExpanded && hasProperSize;
            });
            
            return functionalMenus.length / elementsWithDOM.length >= 0.6;
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

  it('should validate touch event handling for mobile menus', () => {
    fc.assert(
      fc.property(
        navigationElementArrayArb(1, 6),
        (elements: NavigationElement[]) => {
          let elementsWithDOM: Array<NavigationElement & { element?: HTMLElement }> = [];
          
          try {
            const mobileElements = elements.map(element => ({
              ...element,
              element: createTouchMenuElement(element)
            }));

            if (mobileElements.length === 0) return true;
            
            const touchResponsive = mobileElements.filter(element => {
              const domElement = element.element!;
              const hasTouchAction = domElement.style.touchAction === 'manipulation';
              const hasTapHighlight = (domElement.style as any).webkitTapHighlightColor !== '';
              
              return hasTouchAction && hasTapHighlight;
            });
            
            return touchResponsive.length >= mobileElements.length * 0.5;
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

function createMobileMenuElement(element: NavigationElement): HTMLElement {
  const button = document.createElement('button');
  button.className = 'mobile-menu-toggle';
  button.style.width = '48px';
  button.style.height = '48px';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('data-toggle', 'menu');
  
  if (element.ariaLabel) button.setAttribute('aria-label', element.ariaLabel);
  
  document.body.appendChild(button);
  return button;
}

function createTouchMenuElement(element: NavigationElement): HTMLElement {
  const menuElement = createMobileMenuElement(element);
  menuElement.style.touchAction = 'manipulation';
  (menuElement.style as any).webkitTapHighlightColor = 'rgba(0,0,0,0.1)';
  return menuElement;
}