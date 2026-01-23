/**
 * VisualFeedbackValidator - Tests hover, focus, and active states for navigation elements
 * Provides comprehensive visual feedback validation including state changes and responsiveness
 */

import { NavigationElement, VisualState, VisualFeedbackResult } from './interfaces';

export class VisualFeedbackValidator {
  private responseTimeThreshold: number = 300; // 300ms threshold for responsive feedback
  private testResults: Map<Element, VisualFeedbackResult[]> = new Map();

  constructor(responseTimeThreshold: number = 300) {
    this.responseTimeThreshold = responseTimeThreshold;
  }

  /**
   * Validate hover states for navigation elements
   */
  validateHoverStates(elements: NavigationElement[]): VisualFeedbackResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: VisualFeedbackResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.testHoverState(element);
        results.push(result);
      } catch (error) {
        console.warn('Error validating hover state:', error);
        results.push({
          element,
          state: { name: 'hover', cssProperties: {} },
          hasVisualFeedback: false,
          responseTime: undefined
        });
      }
    });

    return results;
  }

  /**
   * Test hover state for a single element
   */
  private testHoverState(element: NavigationElement): VisualFeedbackResult {
    const startTime = Date.now();
    let hasVisualFeedback = false;
    const cssProperties: Record<string, string> = {};

    try {
      const domElement = element.element;
      const computedStyle = window.getComputedStyle(domElement);

      // Check cursor change
      if (computedStyle.cursor === 'pointer') {
        cssProperties.cursor = 'pointer';
        hasVisualFeedback = true;
      }

      // Check for transitions that indicate hover effects
      if (computedStyle.transition && computedStyle.transition !== 'none') {
        cssProperties.transition = computedStyle.transition;
        hasVisualFeedback = true;
      }

      // Check for transform properties
      if (computedStyle.transform && computedStyle.transform !== 'none') {
        cssProperties.transform = computedStyle.transform;
        hasVisualFeedback = true;
      }

      // Check for opacity effects
      const opacity = parseFloat(computedStyle.opacity);
      if (opacity < 1 && opacity > 0) {
        cssProperties.opacity = computedStyle.opacity;
        hasVisualFeedback = true;
      }

      // Check for box-shadow
      if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
        cssProperties.boxShadow = computedStyle.boxShadow;
        hasVisualFeedback = true;
      }

      // Check for background color changes
      if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        cssProperties.backgroundColor = computedStyle.backgroundColor;
      }

      // Check for border changes
      if (computedStyle.border && computedStyle.borderWidth !== '0px') {
        cssProperties.border = computedStyle.border;
      }

      // Test programmatic hover simulation
      const hoverTest = this.simulateHoverState(domElement);
      if (hoverTest.hasChange) {
        hasVisualFeedback = true;
        Object.assign(cssProperties, hoverTest.changedProperties);
      }

    } catch (error) {
      console.warn('Error testing hover state:', error);
    }

    const responseTime = Date.now() - startTime;

    return {
      element,
      state: {
        name: 'hover',
        cssProperties
      },
      hasVisualFeedback,
      responseTime
    };
  }

  /**
   * Simulate hover state to detect changes
   */
  private simulateHoverState(element: Element): { hasChange: boolean; changedProperties: Record<string, string> } {
    const changedProperties: Record<string, string> = {};
    let hasChange = false;

    try {
      // Create a clone to test hover styles
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      clone.style.visibility = 'hidden';
      document.body.appendChild(clone);

      // Get initial styles
      const beforeStyle = window.getComputedStyle(clone);
      const beforeProperties = {
        backgroundColor: beforeStyle.backgroundColor,
        color: beforeStyle.color,
        borderColor: beforeStyle.borderColor,
        boxShadow: beforeStyle.boxShadow,
        transform: beforeStyle.transform,
        opacity: beforeStyle.opacity
      };

      // Simulate hover by adding hover class or triggering hover event
      clone.classList.add('hover');
      
      // Trigger mouseover event
      const mouseOverEvent = new MouseEvent('mouseover', { bubbles: true });
      clone.dispatchEvent(mouseOverEvent);

      // Get styles after hover simulation
      const afterStyle = window.getComputedStyle(clone);
      const afterProperties = {
        backgroundColor: afterStyle.backgroundColor,
        color: afterStyle.color,
        borderColor: afterStyle.borderColor,
        boxShadow: afterStyle.boxShadow,
        transform: afterStyle.transform,
        opacity: afterStyle.opacity
      };

      // Compare properties
      Object.keys(beforeProperties).forEach(prop => {
        const beforeValue = beforeProperties[prop as keyof typeof beforeProperties];
        const afterValue = afterProperties[prop as keyof typeof afterProperties];
        
        if (beforeValue !== afterValue) {
          changedProperties[prop] = afterValue;
          hasChange = true;
        }
      });

      // Clean up
      document.body.removeChild(clone);

    } catch (error) {
      console.warn('Error simulating hover state:', error);
    }

    return { hasChange, changedProperties };
  }

  /**
   * Check loading states for navigation elements
   */
  checkLoadingStates(elements: NavigationElement[]): VisualFeedbackResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: VisualFeedbackResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.testLoadingState(element);
        results.push(result);
      } catch (error) {
        console.warn('Error checking loading state:', error);
        results.push({
          element,
          state: { name: 'loading', cssProperties: {} },
          hasVisualFeedback: false,
          responseTime: undefined
        });
      }
    });

    return results;
  }

  /**
   * Test loading state for a single element
   */
  private testLoadingState(element: NavigationElement): VisualFeedbackResult {
    const startTime = Date.now();
    let hasVisualFeedback = false;
    const cssProperties: Record<string, string> = {};

    try {
      const domElement = element.element;

      // Check for loading indicators
      const loadingIndicators = this.findLoadingIndicators(domElement);
      if (loadingIndicators.length > 0) {
        hasVisualFeedback = true;
        cssProperties.loadingIndicators = loadingIndicators.join(', ');
      }

      // Check for disabled state during loading
      if (domElement.hasAttribute('disabled') || domElement.getAttribute('aria-disabled') === 'true') {
        hasVisualFeedback = true;
        cssProperties.disabled = 'true';
      }

      // Check for loading classes
      const classList = Array.from(domElement.classList);
      const loadingClasses = classList.filter(cls => 
        cls.includes('loading') || 
        cls.includes('spinner') || 
        cls.includes('pending')
      );
      
      if (loadingClasses.length > 0) {
        hasVisualFeedback = true;
        cssProperties.loadingClasses = loadingClasses.join(' ');
      }

      // Check for ARIA busy state
      if (domElement.getAttribute('aria-busy') === 'true') {
        hasVisualFeedback = true;
        cssProperties.ariaBusy = 'true';
      }

      // Check for opacity changes indicating loading
      const computedStyle = window.getComputedStyle(domElement);
      const opacity = parseFloat(computedStyle.opacity);
      if (opacity < 1) {
        cssProperties.opacity = computedStyle.opacity;
      }

      // Check for cursor changes during loading
      if (computedStyle.cursor === 'wait' || computedStyle.cursor === 'progress') {
        hasVisualFeedback = true;
        cssProperties.cursor = computedStyle.cursor;
      }

    } catch (error) {
      console.warn('Error testing loading state:', error);
    }

    const responseTime = Date.now() - startTime;

    return {
      element,
      state: {
        name: 'loading',
        cssProperties
      },
      hasVisualFeedback,
      responseTime
    };
  }

  /**
   * Find loading indicators within or near an element
   */
  private findLoadingIndicators(element: Element): string[] {
    const indicators: string[] = [];

    try {
      // Check for spinner elements
      const spinners = element.querySelectorAll('.spinner, .loading-spinner, [class*="spin"]');
      if (spinners.length > 0) {
        indicators.push('spinner elements');
      }

      // Check for progress bars
      const progressBars = element.querySelectorAll('progress, .progress, .progress-bar');
      if (progressBars.length > 0) {
        indicators.push('progress bars');
      }

      // Check for loading text
      const textContent = element.textContent?.toLowerCase() || '';
      if (textContent.includes('loading') || textContent.includes('please wait')) {
        indicators.push('loading text');
      }

      // Check for loading icons
      const loadingIcons = element.querySelectorAll('[class*="loading"], [class*="spinner"], .fa-spinner, .fa-circle-o-notch');
      if (loadingIcons.length > 0) {
        indicators.push('loading icons');
      }

      // Check for CSS animations that might indicate loading
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.animation && computedStyle.animation !== 'none') {
        indicators.push('CSS animations');
      }

    } catch (error) {
      console.warn('Error finding loading indicators:', error);
    }

    return indicators;
  }

  /**
   * Validate focus states for navigation elements
   */
  validateFocusStates(elements: NavigationElement[]): VisualFeedbackResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: VisualFeedbackResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.testFocusState(element);
        results.push(result);
      } catch (error) {
        console.warn('Error validating focus state:', error);
        results.push({
          element,
          state: { name: 'focus', cssProperties: {} },
          hasVisualFeedback: false,
          responseTime: undefined
        });
      }
    });

    return results;
  }

  /**
   * Test focus state for a single element
   */
  private testFocusState(element: NavigationElement): VisualFeedbackResult {
    const startTime = Date.now();
    let hasVisualFeedback = false;
    const cssProperties: Record<string, string> = {};

    try {
      const domElement = element.element;
      const computedStyle = window.getComputedStyle(domElement);

      // Check outline
      if (computedStyle.outline && computedStyle.outline !== 'none' && computedStyle.outlineWidth !== '0px') {
        cssProperties.outline = computedStyle.outline;
        hasVisualFeedback = true;
      }

      // Check box-shadow (often used for focus rings)
      if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
        cssProperties.boxShadow = computedStyle.boxShadow;
        hasVisualFeedback = true;
      }

      // Check border changes
      if (computedStyle.border && computedStyle.borderWidth !== '0px') {
        cssProperties.border = computedStyle.border;
      }

      // Check background color changes
      if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        cssProperties.backgroundColor = computedStyle.backgroundColor;
      }

      // Test programmatic focus to see if styles change
      const focusTest = this.simulateFocusState(domElement);
      if (focusTest.hasChange) {
        hasVisualFeedback = true;
        Object.assign(cssProperties, focusTest.changedProperties);
      }

      // Check if element is focusable
      const isFocusable = this.isElementFocusable(domElement);
      if (!isFocusable) {
        cssProperties.focusable = 'false';
      }

    } catch (error) {
      console.warn('Error testing focus state:', error);
    }

    const responseTime = Date.now() - startTime;

    return {
      element,
      state: {
        name: 'focus',
        cssProperties
      },
      hasVisualFeedback,
      responseTime
    };
  }

  /**
   * Simulate focus state to detect changes
   */
  private simulateFocusState(element: Element): { hasChange: boolean; changedProperties: Record<string, string> } {
    const changedProperties: Record<string, string> = {};
    let hasChange = false;

    try {
      // Create a clone to test focus styles
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      clone.style.visibility = 'hidden';
      document.body.appendChild(clone);

      // Get styles before focus
      const beforeStyle = window.getComputedStyle(clone);
      const beforeProperties = {
        outline: beforeStyle.outline,
        boxShadow: beforeStyle.boxShadow,
        border: beforeStyle.border,
        backgroundColor: beforeStyle.backgroundColor
      };

      // Focus the clone
      clone.focus();

      // Get styles after focus
      const afterStyle = window.getComputedStyle(clone);
      const afterProperties = {
        outline: afterStyle.outline,
        boxShadow: afterStyle.boxShadow,
        border: afterStyle.border,
        backgroundColor: afterStyle.backgroundColor
      };

      // Compare properties
      Object.keys(beforeProperties).forEach(prop => {
        const beforeValue = beforeProperties[prop as keyof typeof beforeProperties];
        const afterValue = afterProperties[prop as keyof typeof afterProperties];
        
        if (beforeValue !== afterValue) {
          changedProperties[prop] = afterValue;
          hasChange = true;
        }
      });

      // Clean up
      document.body.removeChild(clone);

    } catch (error) {
      console.warn('Error simulating focus state:', error);
    }

    return { hasChange, changedProperties };
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
   * Get comprehensive visual feedback report
   */
  getVisualFeedbackReport(elements: NavigationElement[]): {
    hoverResults: VisualFeedbackResult[];
    focusResults: VisualFeedbackResult[];
    loadingResults: VisualFeedbackResult[];
    summary: {
      totalElements: number;
      elementsWithHoverFeedback: number;
      elementsWithFocusFeedback: number;
      elementsWithLoadingFeedback: number;
      averageResponseTime: number;
    };
  } {
    const hoverResults = this.validateHoverStates(elements);
    const focusResults = this.validateFocusStates(elements);
    const loadingResults = this.checkLoadingStates(elements);

    const elementsWithHoverFeedback = hoverResults.filter(r => r.hasVisualFeedback).length;
    const elementsWithFocusFeedback = focusResults.filter(r => r.hasVisualFeedback).length;
    const elementsWithLoadingFeedback = loadingResults.filter(r => r.hasVisualFeedback).length;

    const allResponseTimes = [
      ...hoverResults.map(r => r.responseTime),
      ...focusResults.map(r => r.responseTime),
      ...loadingResults.map(r => r.responseTime)
    ].filter((time): time is number => time !== undefined);

    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
      : 0;

    return {
      hoverResults,
      focusResults,
      loadingResults,
      summary: {
        totalElements: elements.length,
        elementsWithHoverFeedback,
        elementsWithFocusFeedback,
        elementsWithLoadingFeedback,
        averageResponseTime
      }
    };
  }

  /**
   * Set response time threshold
   */
  setResponseTimeThreshold(threshold: number): void {
    this.responseTimeThreshold = threshold;
  }

  /**
   * Clear test results cache
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Get test results for a specific element
   */
  getResultsForElement(element: Element): VisualFeedbackResult[] {
    return this.testResults.get(element) || [];
  }
}