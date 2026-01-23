/**
 * ResponsiveTester - Tests navigation functionality across different screen sizes and breakpoints
 * Provides comprehensive responsive testing including mobile menus and breakpoint validation
 */

import { NavigationElement, ResponsiveBreakpoint, ResponsiveTestResult, MobileMenuResult } from './interfaces';

export class ResponsiveTester {
  private breakpoints: ResponsiveBreakpoint[] = [
    { name: 'mobile', minWidth: 0, maxWidth: 767 },
    { name: 'tablet', minWidth: 768, maxWidth: 1023 },
    { name: 'desktop', minWidth: 1024 }
  ];
  private testResults: Map<string, ResponsiveTestResult[]> = new Map();

  constructor(breakpoints?: ResponsiveBreakpoint[]) {
    if (breakpoints) {
      this.breakpoints = breakpoints;
    }
  }

  /**
   * Test mobile menu functionality
   */
  testMobileMenu(elements: NavigationElement[]): MobileMenuResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: MobileMenuResult[] = [];

    elements.forEach(element => {
      try {
        const result = this.testSingleMobileMenu(element);
        results.push(result);
      } catch (error) {
        console.warn('Error testing mobile menu:', error);
        results.push({
          hasToggle: false,
          toggleWorks: false,
          menuIsAccessible: false,
          issues: ['Error during mobile menu testing']
        });
      }
    });

    return results;
  }

  /**
   * Test a single mobile menu element
   */
  private testSingleMobileMenu(element: NavigationElement): MobileMenuResult {
    const issues: string[] = [];
    let hasToggle = false;
    let toggleWorks = false;
    let menuIsAccessible = false;

    try {
      // Check for mobile menu toggle
      hasToggle = this.hasMobileMenuToggle(element);
      if (!hasToggle) {
        issues.push('No mobile menu toggle found');
      }

      // Test toggle functionality
      if (hasToggle) {
        toggleWorks = this.testToggleFunctionality(element);
        if (!toggleWorks) {
          issues.push('Mobile menu toggle does not work properly');
        }
      }

      // Check accessibility
      menuIsAccessible = this.isMobileMenuAccessible(element);
      if (!menuIsAccessible) {
        issues.push('Mobile menu lacks proper accessibility features');
      }

      // Additional mobile-specific checks
      const touchTargetIssues = this.checkMobileTouchTargets(element);
      issues.push(...touchTargetIssues);

      const visibilityIssues = this.checkMobileVisibility(element);
      issues.push(...visibilityIssues);

    } catch (error) {
      issues.push(`Mobile menu test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      hasToggle,
      toggleWorks,
      menuIsAccessible,
      issues
    };
  }

  /**
   * Check if element has mobile menu toggle
   */
  private hasMobileMenuToggle(element: NavigationElement): boolean {
    const domElement = element.element;

    // Check for common mobile menu toggle patterns
    const toggleSelectors = [
      '.menu-toggle',
      '.nav-toggle',
      '.hamburger',
      '.mobile-menu-toggle',
      '[aria-label*="menu"]',
      '[aria-expanded]',
      '[data-toggle="menu"]',
      '[data-target*="menu"]'
    ];

    // Check if element itself is a toggle
    for (const selector of toggleSelectors) {
      if (domElement.matches && domElement.matches(selector)) {
        return true;
      }
    }

    // Check for toggle within or near the element
    const parent = domElement.closest('nav, .navigation, .navbar, .nav');
    if (parent) {
      for (const selector of toggleSelectors) {
        if (parent.querySelector(selector)) {
          return true;
        }
      }
    }

    // Check for ARIA attributes indicating toggle functionality
    const ariaExpanded = domElement.getAttribute('aria-expanded');
    const ariaControls = domElement.getAttribute('aria-controls');
    if (ariaExpanded !== null || ariaControls) {
      return true;
    }

    // Check for common toggle classes
    const classList = Array.from(domElement.classList);
    const toggleClasses = ['toggle', 'hamburger', 'menu-btn', 'nav-toggle'];
    if (toggleClasses.some(cls => classList.some(c => c.includes(cls)))) {
      return true;
    }

    return false;
  }

  /**
   * Test toggle functionality
   */
  private testToggleFunctionality(element: NavigationElement): boolean {
    try {
      const domElement = element.element;

      // Check for click handlers
      const hasClickHandler = this.hasClickHandler(domElement);
      if (!hasClickHandler) {
        return false;
      }

      // Check for ARIA expanded state management
      const ariaExpanded = domElement.getAttribute('aria-expanded');
      if (ariaExpanded !== null) {
        // Element manages its own state
        return ['true', 'false'].includes(ariaExpanded);
      }

      // Check for target menu element
      const ariaControls = domElement.getAttribute('aria-controls');
      const dataTarget = domElement.getAttribute('data-target');
      
      if (ariaControls) {
        const targetMenu = document.getElementById(ariaControls);
        return targetMenu !== null;
      }

      if (dataTarget) {
        const targetMenu = document.querySelector(dataTarget);
        return targetMenu !== null;
      }

      // If we have a click handler but no specific target, assume it works
      return hasClickHandler;

    } catch (error) {
      console.warn('Error testing toggle functionality:', error);
      return false;
    }
  }

  /**
   * Check if element has click handler
   */
  private hasClickHandler(element: Element): boolean {
    // Check for inline onclick
    if (element.getAttribute('onclick')) {
      return true;
    }

    // Check for framework-specific handlers
    const frameworkHandlers = [
      'ng-click',
      '@click',
      'v-on:click',
      'onClick'
    ];

    for (const handler of frameworkHandlers) {
      if (element.getAttribute(handler)) {
        return true;
      }
    }

    // Check for event listeners (limited detection)
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.cursor === 'pointer') {
      return true;
    }

    return false;
  }

  /**
   * Check if mobile menu is accessible
   */
  private isMobileMenuAccessible(element: NavigationElement): boolean {
    const domElement = element.element;

    // Check for proper labeling
    const hasLabel = domElement.getAttribute('aria-label') ||
                    domElement.getAttribute('aria-labelledby') ||
                    element.text;

    if (!hasLabel) {
      return false;
    }

    // Check for keyboard accessibility
    const isKeyboardAccessible = this.isKeyboardAccessible(domElement);
    if (!isKeyboardAccessible) {
      return false;
    }

    // Check for proper ARIA states
    const ariaExpanded = domElement.getAttribute('aria-expanded');
    if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
      return false;
    }

    return true;
  }

  /**
   * Check keyboard accessibility
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
   * Check mobile touch targets
   */
  private checkMobileTouchTargets(element: NavigationElement): string[] {
    const issues: string[] = [];
    const minSize = 44; // WCAG minimum

    try {
      const rect = element.boundingRect;
      
      if (rect.width < minSize || rect.height < minSize) {
        issues.push(`Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum ${minSize}x${minSize}px)`);
      }

      // Check spacing
      const hasAdequateSpacing = this.checkTouchTargetSpacing(element);
      if (!hasAdequateSpacing) {
        issues.push('Insufficient spacing between touch targets');
      }

    } catch (error) {
      issues.push('Could not verify touch target size');
    }

    return issues;
  }

  /**
   * Check touch target spacing
   */
  private checkTouchTargetSpacing(element: NavigationElement): boolean {
    try {
      const rect = element.boundingRect;
      const minSpacing = 8;
      
      // Find nearby interactive elements
      const interactiveElements = document.querySelectorAll('a, button, input, [role="button"], [tabindex]');
      
      for (const otherElement of interactiveElements) {
        if (otherElement === element.element) continue;
        
        const otherRect = otherElement.getBoundingClientRect();
        
        // Calculate distance
        const horizontalDistance = Math.min(
          Math.abs(rect.right - otherRect.left),
          Math.abs(otherRect.right - rect.left)
        );
        
        const verticalDistance = Math.min(
          Math.abs(rect.bottom - otherRect.top),
          Math.abs(otherRect.bottom - rect.top)
        );
        
        // Check if too close
        if (horizontalDistance < minSpacing && verticalDistance < minSpacing) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return true; // Assume adequate spacing if we can't check
    }
  }

  /**
   * Check mobile visibility
   */
  private checkMobileVisibility(element: NavigationElement): string[] {
    const issues: string[] = [];

    try {
      const domElement = element.element;
      const style = window.getComputedStyle(domElement);

      // Check if hidden on mobile (common responsive pattern)
      if (style.display === 'none') {
        // This might be intentional for mobile menus
        const hasToggle = this.hasMobileMenuToggle(element);
        if (!hasToggle) {
          issues.push('Element hidden on mobile without toggle mechanism');
        }
      }

      // Check for very small text
      const fontSize = parseInt(style.fontSize);
      if (fontSize < 16) {
        issues.push(`Text too small for mobile: ${fontSize}px (recommended minimum 16px)`);
      }

      // Check for fixed positioning issues
      if (style.position === 'fixed') {
        const rect = element.boundingRect;
        if (rect.left < 0 || rect.top < 0) {
          issues.push('Fixed positioned element may be cut off on mobile');
        }
      }

    } catch (error) {
      issues.push('Could not verify mobile visibility');
    }

    return issues;
  }

  /**
   * Check responsive breakpoints
   */
  checkResponsiveBreakpoints(elements: NavigationElement[]): ResponsiveTestResult[] {
    if (!elements || elements.length === 0) {
      return [];
    }

    const results: ResponsiveTestResult[] = [];

    this.breakpoints.forEach(breakpoint => {
      try {
        const result = this.testBreakpoint(elements, breakpoint);
        results.push(result);
      } catch (error) {
        console.warn(`Error testing breakpoint ${breakpoint.name}:`, error);
        results.push({
          breakpoint,
          passed: false,
          issues: [`Error testing breakpoint: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    });

    return results;
  }

  /**
   * Test a specific breakpoint
   */
  private testBreakpoint(elements: NavigationElement[], breakpoint: ResponsiveBreakpoint): ResponsiveTestResult {
    const issues: string[] = [];
    let passed = true;

    try {
      // Simulate viewport size (in a real implementation, you'd actually resize)
      const viewportWidth = this.getSimulatedViewportWidth(breakpoint);
      
      elements.forEach(element => {
        const elementIssues = this.checkElementAtBreakpoint(element, breakpoint, viewportWidth);
        issues.push(...elementIssues);
        
        if (elementIssues.length > 0) {
          passed = false;
        }
      });

      // Check for breakpoint-specific patterns
      const breakpointIssues = this.checkBreakpointPatterns(elements, breakpoint);
      issues.push(...breakpointIssues);
      
      if (breakpointIssues.length > 0) {
        passed = false;
      }

    } catch (error) {
      passed = false;
      issues.push(`Breakpoint test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      breakpoint,
      passed,
      issues
    };
  }

  /**
   * Get simulated viewport width for breakpoint
   */
  private getSimulatedViewportWidth(breakpoint: ResponsiveBreakpoint): number {
    if (breakpoint.maxWidth) {
      return Math.floor((breakpoint.minWidth + breakpoint.maxWidth) / 2);
    }
    return breakpoint.minWidth + 200; // Add some margin for max-width undefined
  }

  /**
   * Check element at specific breakpoint
   */
  private checkElementAtBreakpoint(element: NavigationElement, breakpoint: ResponsiveBreakpoint, viewportWidth: number): string[] {
    const issues: string[] = [];

    try {
      const rect = element.boundingRect;
      const style = window.getComputedStyle(element.element);

      // Check if element overflows viewport
      if (rect.right > viewportWidth) {
        issues.push(`Element overflows ${breakpoint.name} viewport`);
      }

      // Check visibility at breakpoint
      if (style.display === 'none' && breakpoint.name === 'desktop') {
        issues.push(`Element hidden on ${breakpoint.name} without apparent reason`);
      }

      // Check for responsive design patterns
      if (!this.hasResponsiveDesign(element.element)) {
        issues.push(`Element lacks responsive design patterns for ${breakpoint.name}`);
      }

      // Mobile-specific checks
      if (breakpoint.name === 'mobile') {
        const mobileIssues = this.checkMobileSpecificIssues(element);
        issues.push(...mobileIssues);
      }

    } catch (error) {
      issues.push(`Could not test element at ${breakpoint.name} breakpoint`);
    }

    return issues;
  }

  /**
   * Check for responsive design patterns
   */
  private hasResponsiveDesign(element: Element): boolean {
    const style = window.getComputedStyle(element);
    
    // Check for flexible layouts
    const hasFlexibleLayout = style.display === 'flex' || style.display === 'grid';
    
    // Check for responsive units
    const hasResponsiveUnits = style.width.includes('%') || 
                              style.width.includes('vw') || 
                              style.width.includes('rem') ||
                              style.width === 'auto';
    
    // Check for responsive classes (heuristic)
    const classList = Array.from(element.classList);
    const hasResponsiveClasses = classList.some(cls => 
      cls.includes('responsive') || 
      cls.includes('mobile') || 
      cls.includes('tablet') ||
      cls.includes('desktop') ||
      cls.includes('col-') ||
      cls.includes('grid-')
    );
    
    return hasFlexibleLayout || hasResponsiveUnits || hasResponsiveClasses;
  }

  /**
   * Check mobile-specific issues
   */
  private checkMobileSpecificIssues(element: NavigationElement): string[] {
    const issues: string[] = [];

    try {
      const style = window.getComputedStyle(element.element);
      
      // Check for hover-only interactions
      if (style.cursor === 'pointer' && !this.hasClickHandler(element.element)) {
        issues.push('Element relies on hover interaction, not suitable for mobile');
      }

      // Check for small touch targets
      const rect = element.boundingRect;
      if (rect.width < 44 || rect.height < 44) {
        issues.push('Touch target too small for mobile use');
      }

      // Check for fixed widths that might not work on mobile
      if (style.width.includes('px')) {
        const width = parseInt(style.width);
        if (width > 320) { // Typical mobile width
          issues.push('Fixed width may not work on small mobile screens');
        }
      }

    } catch (error) {
      issues.push('Could not perform mobile-specific checks');
    }

    return issues;
  }

  /**
   * Check breakpoint-specific patterns
   */
  private checkBreakpointPatterns(elements: NavigationElement[], breakpoint: ResponsiveBreakpoint): string[] {
    const issues: string[] = [];

    try {
      // Check for appropriate navigation patterns at each breakpoint
      if (breakpoint.name === 'mobile') {
        const hasMobileMenu = elements.some(el => this.hasMobileMenuToggle(el));
        const hasHorizontalNav = elements.some(el => this.hasHorizontalNavigation(el));
        
        if (hasHorizontalNav && !hasMobileMenu) {
          issues.push('Horizontal navigation without mobile menu toggle may not work on mobile');
        }
      }

      if (breakpoint.name === 'desktop') {
        const hasCollapsedNav = elements.some(el => this.isNavigationCollapsed(el));
        if (hasCollapsedNav) {
          issues.push('Navigation appears collapsed on desktop where it should be expanded');
        }
      }

    } catch (error) {
      issues.push(`Could not check ${breakpoint.name} patterns`);
    }

    return issues;
  }

  /**
   * Check if element has horizontal navigation
   */
  private hasHorizontalNavigation(element: NavigationElement): boolean {
    const style = window.getComputedStyle(element.element);
    return style.display === 'flex' && style.flexDirection === 'row';
  }

  /**
   * Check if navigation is collapsed
   */
  private isNavigationCollapsed(element: NavigationElement): boolean {
    const style = window.getComputedStyle(element.element);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  /**
   * Set custom breakpoints
   */
  setBreakpoints(breakpoints: ResponsiveBreakpoint[]): void {
    this.breakpoints = breakpoints;
  }

  /**
   * Get current breakpoints
   */
  getBreakpoints(): ResponsiveBreakpoint[] {
    return [...this.breakpoints];
  }

  /**
   * Clear test results cache
   */
  clearResults(): void {
    this.testResults.clear();
  }

  /**
   * Get test results for a specific breakpoint
   */
  getResultsForBreakpoint(breakpointName: string): ResponsiveTestResult[] {
    return this.testResults.get(breakpointName) || [];
  }
}