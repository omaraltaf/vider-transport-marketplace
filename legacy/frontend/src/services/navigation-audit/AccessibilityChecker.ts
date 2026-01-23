/**
 * AccessibilityChecker - Validates WCAG compliance for navigation elements
 * Provides comprehensive accessibility testing including touch targets, ARIA labels, and keyboard navigation
 */

import { NavigationElement, AccessibilityResult, TouchTarget } from './interfaces';

export class AccessibilityChecker {
  private minTouchTargetSize: number = 44; // WCAG minimum 44px
  private minSpacing: number = 8; // Minimum spacing between touch targets
  private testResults: Map<Element, AccessibilityResult> = new Map();

  constructor(minTouchTargetSize: number = 44) {
    this.minTouchTargetSize = minTouchTargetSize;
  }

  /**
   * Check touch target size compliance
   */
  checkTouchTargetSize(elements: NavigationElement[]): TouchTarget[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const touchTargets: TouchTarget[] = [];

    elements.forEach(element => {
      try {
        const touchTarget = this.analyzeTouchTarget(element);
        if (touchTarget) {
          touchTargets.push(touchTarget);
        }
      } catch (error) {
        console.warn('Error analyzing touch target:', error);
      }
    });

    return touchTargets;
  }

  /**
   * Analyze a single element as a touch target
   */
  private analyzeTouchTarget(element: NavigationElement): TouchTarget | null {
    try {
      const rect = element.boundingRect;
      const size = {
        width: rect.width,
        height: rect.height
      };

      const meetsMinimumSize = size.width >= this.minTouchTargetSize && size.height >= this.minTouchTargetSize;
      const hasAdequateSpacing = this.checkTouchTargetSpacing(element);

      return {
        element,
        size,
        meetsMinimumSize,
        hasAdequateSpacing
      };
    } catch (error) {
      console.warn('Error creating touch target:', error);
      return null;
    }
  }

  /**
   * Check spacing around touch target
   */
  private checkTouchTargetSpacing(element: NavigationElement): boolean {
    try {
      const rect = element.boundingRect;
      const allElements = document.querySelectorAll('a, button, input, [role="button"], [tabindex]');
      
      for (const otherElement of allElements) {
        if (otherElement === element.element) continue;
        
        const otherRect = otherElement.getBoundingClientRect();
        
        // Check if elements are close enough to interfere
        const horizontalDistance = Math.min(
          Math.abs(rect.right - otherRect.left),
          Math.abs(otherRect.right - rect.left)
        );
        
        const verticalDistance = Math.min(
          Math.abs(rect.bottom - otherRect.top),
          Math.abs(otherRect.bottom - rect.top)
        );
        
        // If elements overlap or are too close
        if (horizontalDistance < this.minSpacing && verticalDistance < this.minSpacing) {
          // Check if they actually overlap
          const overlap = !(rect.right < otherRect.left || 
                          otherRect.right < rect.left || 
                          rect.bottom < otherRect.top || 
                          otherRect.bottom < rect.top);
          
          if (overlap || (horizontalDistance < this.minSpacing && verticalDistance < this.minSpacing)) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.warn('Error checking touch target spacing:', error);
      return true; // Assume adequate spacing if we can't check
    }
  }

  /**
   * Validate ARIA labels and accessibility properties
   */
  validateAriaLabels(elements: NavigationElement[]): AccessibilityResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: AccessibilityResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.validateElementAria(element);
        results.push(result);
      } catch (error) {
        console.warn('Error validating ARIA labels:', error);
        results.push({
          element,
          violations: ['Error during ARIA validation'],
          recommendations: ['Manual review required due to validation error']
        });
      }
    });

    return results;
  }

  /**
   * Validate ARIA properties for a single element
   */
  private validateElementAria(element: NavigationElement): AccessibilityResult {
    const violations: string[] = [];
    const recommendations: string[] = [];
    const domElement = element.element;

    // Check for accessible name
    const accessibleName = this.getAccessibleName(element);
    if (!accessibleName) {
      violations.push('Missing accessible name');
      recommendations.push('Add aria-label, aria-labelledby, or descriptive text content');
    }

    // Check role appropriateness
    const role = domElement.getAttribute('role');
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'div' || tagName === 'span') {
      if (!role) {
        violations.push('Non-semantic element without role');
        recommendations.push('Add appropriate role attribute (e.g., role="button", role="link")');
      } else if (!this.isValidRole(role)) {
        violations.push(`Invalid role: ${role}`);
        recommendations.push('Use a valid ARIA role');
      }
    }

    // Check ARIA state attributes
    this.validateAriaStates(domElement, violations, recommendations);

    // Check keyboard accessibility
    if (element.isInteractive && !this.isKeyboardAccessible(domElement)) {
      violations.push('Interactive element not keyboard accessible');
      recommendations.push('Ensure element is focusable with tabindex="0" or use semantic HTML');
    }

    // Check focus indicator
    if (element.isInteractive && !this.hasVisibleFocusIndicator(domElement)) {
      violations.push('Missing visible focus indicator');
      recommendations.push('Add CSS focus styles with outline or box-shadow');
    }

    // Check color contrast (basic check)
    const contrastIssue = this.checkBasicColorContrast(domElement);
    if (contrastIssue) {
      violations.push(contrastIssue);
      recommendations.push('Ensure sufficient color contrast (4.5:1 for normal text, 3:1 for large text)');
    }

    return {
      element,
      violations,
      recommendations
    };
  }

  /**
   * Get accessible name for an element
   */
  private getAccessibleName(element: NavigationElement): string {
    const domElement = element.element;

    // Check aria-label
    const ariaLabel = domElement.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    // Check aria-labelledby
    const ariaLabelledby = domElement.getAttribute('aria-labelledby');
    if (ariaLabelledby) {
      const labelElement = document.getElementById(ariaLabelledby);
      if (labelElement) {
        return labelElement.textContent?.trim() || '';
      }
    }

    // Check title attribute
    const title = domElement.getAttribute('title');
    if (title && title.trim()) {
      return title.trim();
    }

    // Check text content
    const textContent = element.text;
    if (textContent && textContent !== 'Unlabeled element') {
      return textContent;
    }

    // Check alt text for images
    const img = domElement.querySelector('img');
    if (img) {
      const alt = img.getAttribute('alt');
      if (alt && alt.trim()) {
        return alt.trim();
      }
    }

    return '';
  }

  /**
   * Check if role is valid
   */
  private isValidRole(role: string): boolean {
    const validRoles = [
      'button', 'link', 'menuitem', 'tab', 'tabpanel', 'option', 'checkbox',
      'radio', 'slider', 'spinbutton', 'textbox', 'combobox', 'listbox',
      'tree', 'grid', 'navigation', 'banner', 'main', 'complementary',
      'contentinfo', 'search', 'form', 'region', 'article', 'section',
      'heading', 'list', 'listitem', 'table', 'row', 'cell', 'columnheader',
      'rowheader', 'group', 'presentation', 'none'
    ];
    
    return validRoles.includes(role.toLowerCase());
  }

  /**
   * Validate ARIA state attributes
   */
  private validateAriaStates(element: Element, violations: string[], recommendations: string[]): void {
    // Check aria-expanded
    const ariaExpanded = element.getAttribute('aria-expanded');
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      violations.push(`Invalid aria-expanded value: ${ariaExpanded}`);
      recommendations.push('Use "true" or "false" for aria-expanded');
    }

    // Check aria-pressed
    const ariaPressed = element.getAttribute('aria-pressed');
    if (ariaPressed && !['true', 'false', 'mixed'].includes(ariaPressed)) {
      violations.push(`Invalid aria-pressed value: ${ariaPressed}`);
      recommendations.push('Use "true", "false", or "mixed" for aria-pressed');
    }

    // Check aria-selected
    const ariaSelected = element.getAttribute('aria-selected');
    if (ariaSelected && !['true', 'false'].includes(ariaSelected)) {
      violations.push(`Invalid aria-selected value: ${ariaSelected}`);
      recommendations.push('Use "true" or "false" for aria-selected');
    }

    // Check aria-hidden on interactive elements
    const ariaHidden = element.getAttribute('aria-hidden');
    if (ariaHidden === 'true' && this.isInteractiveElement(element)) {
      violations.push('Interactive element hidden from screen readers');
      recommendations.push('Remove aria-hidden="true" from interactive elements');
    }
  }

  /**
   * Check if element is keyboard accessible
   */
  private isKeyboardAccessible(element: Element): boolean {
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
   * Check if element has visible focus indicator
   */
  private hasVisibleFocusIndicator(element: Element): boolean {
    try {
      // Create a temporary clone to test focus styles
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      document.body.appendChild(clone);
      
      // Focus the clone
      clone.focus();
      
      const style = window.getComputedStyle(clone);
      const hasOutline = style.outline !== 'none' && style.outlineWidth !== '0px';
      const hasBoxShadow = style.boxShadow !== 'none';
      const hasBorder = style.borderWidth !== '0px' && style.borderStyle !== 'none';
      
      // Clean up
      document.body.removeChild(clone);
      
      return hasOutline || hasBoxShadow || hasBorder;
    } catch (error) {
      // Fallback: check computed style of original element
      const style = window.getComputedStyle(element);
      return style.outline !== 'none' && style.outlineWidth !== '0px';
    }
  }

  /**
   * Basic color contrast check
   */
  private checkBasicColorContrast(element: Element): string | null {
    try {
      const style = window.getComputedStyle(element);
      const color = style.color;
      const backgroundColor = style.backgroundColor;
      
      // This is a very basic check - in a real implementation,
      // you would use a proper color contrast calculation
      if (color === backgroundColor) {
        return 'Text and background colors are identical';
      }
      
      // Check for transparent backgrounds with light text
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        if (color.includes('255, 255, 255') || color.includes('#fff')) {
          return 'Light text on transparent background may have contrast issues';
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tagName)) {
      return true;
    }
    
    const role = element.getAttribute('role');
    if (role && ['button', 'link', 'menuitem', 'tab', 'option'].includes(role)) {
      return true;
    }
    
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex !== null && parseInt(tabIndex) >= 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Get comprehensive accessibility report
   */
  getAccessibilityReport(elements: NavigationElement[]): {
    touchTargets: TouchTarget[];
    ariaResults: AccessibilityResult[];
    summary: {
      totalElements: number;
      passedElements: number;
      failedElements: number;
      touchTargetIssues: number;
      ariaIssues: number;
    };
  } {
    const touchTargets = this.checkTouchTargetSize(elements);
    const ariaResults = this.validateAriaLabels(elements);
    
    const touchTargetIssues = touchTargets.filter(
      target => !target.meetsMinimumSize || !target.hasAdequateSpacing
    ).length;
    
    const ariaIssues = ariaResults.filter(
      result => result.violations.length > 0
    ).length;
    
    const failedElements = new Set();
    touchTargets.forEach(target => {
      if (!target.meetsMinimumSize || !target.hasAdequateSpacing) {
        failedElements.add(target.element.element);
      }
    });
    ariaResults.forEach(result => {
      if (result.violations.length > 0) {
        failedElements.add(result.element.element);
      }
    });
    
    return {
      touchTargets,
      ariaResults,
      summary: {
        totalElements: elements.length,
        passedElements: elements.length - failedElements.size,
        failedElements: failedElements.size,
        touchTargetIssues,
        ariaIssues
      }
    };
  }

  /**
   * Set minimum touch target size
   */
  setMinTouchTargetSize(size: number): void {
    this.minTouchTargetSize = size;
  }

  /**
   * Set minimum spacing between touch targets
   */
  setMinSpacing(spacing: number): void {
    this.minSpacing = spacing;
  }

  /**
   * Clear test results cache
   */
  clearResults(): void {
    this.testResults.clear();
  }
}