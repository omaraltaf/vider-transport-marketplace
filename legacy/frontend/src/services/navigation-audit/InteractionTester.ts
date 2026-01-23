/**
 * Interaction Tester
 * Validates button and element functionality through click, keyboard, and touch interactions
 */

import type { 
  NavigationElement, 
  InteractionTest, 
  InteractionTestResult,
  AuditContext,
  AuditError 
} from './interfaces';
import { hasValidEventHandler, isKeyboardAccessible } from './utils/helpers';

export class InteractionTester {
  private context: AuditContext;
  private errors: AuditError[] = [];

  constructor(context: AuditContext) {
    this.context = context;
  }

  /**
   * Test all interactions for given navigation elements
   */
  async testInteractions(elements: NavigationElement[]): Promise<InteractionTestResult> {
    const passedTests: InteractionTest[] = [];
    const failedTests: InteractionTest[] = [];
    let totalTests = 0;

    for (const element of elements) {
      if (!element.element) {
        // Skip elements without DOM reference
        continue;
      }

      // Test click interactions
      const clickTests = await this.testClickInteraction(element);
      totalTests += clickTests.length;
      clickTests.forEach(test => {
        if (test.success) {
          passedTests.push(test);
        } else {
          failedTests.push(test);
        }
      });

      // Test keyboard interactions
      const keyboardTests = await this.testKeyboardInteraction(element);
      totalTests += keyboardTests.length;
      keyboardTests.forEach(test => {
        if (test.success) {
          passedTests.push(test);
        } else {
          failedTests.push(test);
        }
      });

      // Test touch interactions (if mobile viewport)
      if (this.isMobileViewport()) {
        const touchTests = await this.testTouchInteraction(element);
        totalTests += touchTests.length;
        touchTests.forEach(test => {
          if (test.success) {
            passedTests.push(test);
          } else {
            failedTests.push(test);
          }
        });
      }
    }

    const coverage = totalTests > 0 ? (passedTests.length / totalTests) * 100 : 0;

    return {
      passedTests,
      failedTests,
      coverage,
      totalTests,
      timestamp: new Date(),
    };
  }

  /**
   * Test click interaction for an element
   */
  private async testClickInteraction(navElement: NavigationElement): Promise<InteractionTest[]> {
    const tests: InteractionTest[] = [];
    const element = navElement.element!;

    try {
      // Test basic click functionality
      const clickTest: InteractionTest = {
        element: navElement,
        testType: 'click',
        expectedBehavior: 'Element should respond to click events',
        actualBehavior: '',
        success: false,
      };

      const startTime = Date.now();

      // Check if element is disabled
      if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
        clickTest.expectedBehavior = 'Disabled element should not respond to clicks';
        clickTest.actualBehavior = 'Element is properly disabled';
        clickTest.success = true;
      } else {
        // Test click event handling
        const hasHandler = hasValidEventHandler(element);
        const hasHref = element.tagName === 'A' && element.hasAttribute('href');
        const isFormSubmit = element.tagName === 'BUTTON' && element.closest('form');

        if (hasHandler || hasHref || isFormSubmit) {
          clickTest.actualBehavior = 'Element has valid click handling mechanism';
          clickTest.success = true;
        } else {
          clickTest.actualBehavior = 'Element lacks proper click handling';
          clickTest.success = false;
        }
      }

      clickTest.duration = Date.now() - startTime;
      tests.push(clickTest);

      // Test visual feedback on click
      const feedbackTest = await this.testVisualFeedback(navElement, 'click');
      tests.push(feedbackTest);

    } catch (error) {
      this.handleError({
        code: 'CLICK_TEST_ERROR',
        message: `Failed to test click interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: navElement,
        timestamp: new Date(),
        severity: 'medium',
      });

      tests.push({
        element: navElement,
        testType: 'click',
        expectedBehavior: 'Element should respond to click events',
        actualBehavior: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return tests;
  }

  /**
   * Test keyboard interaction for an element
   */
  private async testKeyboardInteraction(navElement: NavigationElement): Promise<InteractionTest[]> {
    const tests: InteractionTest[] = [];
    const element = navElement.element!;

    try {
      // Test keyboard accessibility
      const keyboardTest: InteractionTest = {
        element: navElement,
        testType: 'keyboard',
        expectedBehavior: 'Element should be keyboard accessible',
        actualBehavior: '',
        success: false,
      };

      const startTime = Date.now();

      if (isKeyboardAccessible(element)) {
        keyboardTest.actualBehavior = 'Element is keyboard accessible';
        keyboardTest.success = true;

        // Test Enter key activation
        const enterTest = await this.testKeyActivation(navElement, 'Enter');
        tests.push(enterTest);

        // Test Space key activation (for buttons)
        if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
          const spaceTest = await this.testKeyActivation(navElement, 'Space');
          tests.push(spaceTest);
        }
      } else {
        keyboardTest.actualBehavior = 'Element is not keyboard accessible';
        keyboardTest.success = false;
      }

      keyboardTest.duration = Date.now() - startTime;
      tests.push(keyboardTest);

      // Test focus indicators
      const focusTest = await this.testFocusIndicators(navElement);
      tests.push(focusTest);

    } catch (error) {
      this.handleError({
        code: 'KEYBOARD_TEST_ERROR',
        message: `Failed to test keyboard interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: navElement,
        timestamp: new Date(),
        severity: 'medium',
      });

      tests.push({
        element: navElement,
        testType: 'keyboard',
        expectedBehavior: 'Element should be keyboard accessible',
        actualBehavior: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return tests;
  }

  /**
   * Test touch interaction for an element
   */
  private async testTouchInteraction(navElement: NavigationElement): Promise<InteractionTest[]> {
    const tests: InteractionTest[] = [];
    const element = navElement.element!;

    try {
      // Test touch target size
      const touchTest: InteractionTest = {
        element: navElement,
        testType: 'touch',
        expectedBehavior: 'Element should meet minimum touch target size (44x44px)',
        actualBehavior: '',
        success: false,
      };

      const startTime = Date.now();
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG minimum touch target size

      if (rect.width >= minSize && rect.height >= minSize) {
        touchTest.actualBehavior = `Touch target size: ${rect.width}x${rect.height}px (meets minimum)`;
        touchTest.success = true;
      } else {
        touchTest.actualBehavior = `Touch target size: ${rect.width}x${rect.height}px (below minimum)`;
        touchTest.success = false;
      }

      touchTest.duration = Date.now() - startTime;
      tests.push(touchTest);

      // Test touch event handling
      const touchEventTest = await this.testTouchEvents(navElement);
      tests.push(touchEventTest);

    } catch (error) {
      this.handleError({
        code: 'TOUCH_TEST_ERROR',
        message: `Failed to test touch interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        element: navElement,
        timestamp: new Date(),
        severity: 'medium',
      });

      tests.push({
        element: navElement,
        testType: 'touch',
        expectedBehavior: 'Element should support touch interactions',
        actualBehavior: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return tests;
  }

  /**
   * Test visual feedback for interactions
   */
  private async testVisualFeedback(navElement: NavigationElement, interactionType: string): Promise<InteractionTest> {
    const element = navElement.element!;
    
    const test: InteractionTest = {
      element: navElement,
      testType: interactionType as any,
      expectedBehavior: 'Element should provide visual feedback on interaction',
      actualBehavior: '',
      success: false,
    };

    try {
      const startTime = Date.now();
      const computedStyle = window.getComputedStyle(element);
      
      // Check for hover styles (by checking if cursor changes)
      const hasCursor = computedStyle.cursor === 'pointer';
      
      // Check for focus styles
      const hasFocusStyles = this.checkFocusStyles(element);
      
      // Check for active/pressed styles
      const hasActiveStyles = this.checkActiveStyles(element);

      const feedbackMechanisms = [];
      if (hasCursor) feedbackMechanisms.push('pointer cursor');
      if (hasFocusStyles) feedbackMechanisms.push('focus styles');
      if (hasActiveStyles) feedbackMechanisms.push('active styles');

      if (feedbackMechanisms.length > 0) {
        test.actualBehavior = `Visual feedback: ${feedbackMechanisms.join(', ')}`;
        test.success = true;
      } else {
        test.actualBehavior = 'No visual feedback mechanisms detected';
        test.success = false;
      }

      test.duration = Date.now() - startTime;

    } catch (error) {
      test.actualBehavior = `Failed to test visual feedback: ${error instanceof Error ? error.message : 'Unknown error'}`;
      test.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return test;
  }

  /**
   * Test key activation (Enter/Space)
   */
  private async testKeyActivation(navElement: NavigationElement, key: string): Promise<InteractionTest> {
    const test: InteractionTest = {
      element: navElement,
      testType: 'keyboard',
      expectedBehavior: `Element should activate on ${key} key press`,
      actualBehavior: '',
      success: false,
    };

    try {
      const element = navElement.element!;
      const startTime = Date.now();

      // Check if element can receive focus
      const canFocus = element.tabIndex >= 0 || ['A', 'BUTTON', 'INPUT'].includes(element.tagName);
      
      if (canFocus) {
        // Simulate key event (in a real implementation, would dispatch actual events)
        const hasHandler = hasValidEventHandler(element);
        const isLink = element.tagName === 'A' && element.hasAttribute('href');
        const isButton = element.tagName === 'BUTTON' || element.getAttribute('role') === 'button';

        if ((key === 'Enter' && (hasHandler || isLink || isButton)) ||
            (key === 'Space' && (isButton || element.getAttribute('role') === 'button'))) {
          test.actualBehavior = `Element responds to ${key} key activation`;
          test.success = true;
        } else {
          test.actualBehavior = `Element does not respond to ${key} key`;
          test.success = false;
        }
      } else {
        test.actualBehavior = 'Element cannot receive keyboard focus';
        test.success = false;
      }

      test.duration = Date.now() - startTime;

    } catch (error) {
      test.actualBehavior = `Failed to test ${key} key activation: ${error instanceof Error ? error.message : 'Unknown error'}`;
      test.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return test;
  }

  /**
   * Test focus indicators
   */
  private async testFocusIndicators(navElement: NavigationElement): Promise<InteractionTest> {
    const test: InteractionTest = {
      element: navElement,
      testType: 'keyboard',
      expectedBehavior: 'Element should have visible focus indicators',
      actualBehavior: '',
      success: false,
    };

    try {
      const element = navElement.element!;
      const startTime = Date.now();

      const hasFocusStyles = this.checkFocusStyles(element);
      
      if (hasFocusStyles) {
        test.actualBehavior = 'Element has visible focus indicators';
        test.success = true;
      } else {
        test.actualBehavior = 'Element lacks visible focus indicators';
        test.success = false;
      }

      test.duration = Date.now() - startTime;

    } catch (error) {
      test.actualBehavior = `Failed to test focus indicators: ${error instanceof Error ? error.message : 'Unknown error'}`;
      test.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return test;
  }

  /**
   * Test touch events
   */
  private async testTouchEvents(navElement: NavigationElement): Promise<InteractionTest> {
    const test: InteractionTest = {
      element: navElement,
      testType: 'touch',
      expectedBehavior: 'Element should handle touch events appropriately',
      actualBehavior: '',
      success: false,
    };

    try {
      const element = navElement.element!;
      const startTime = Date.now();

      // Check for touch event handling
      const hasClickHandler = hasValidEventHandler(element);
      const isInteractive = ['A', 'BUTTON', 'INPUT'].includes(element.tagName) || 
                           element.getAttribute('role') === 'button';

      if (hasClickHandler || isInteractive) {
        test.actualBehavior = 'Element supports touch interactions';
        test.success = true;
      } else {
        test.actualBehavior = 'Element may not handle touch events properly';
        test.success = false;
      }

      test.duration = Date.now() - startTime;

    } catch (error) {
      test.actualBehavior = `Failed to test touch events: ${error instanceof Error ? error.message : 'Unknown error'}`;
      test.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return test;
  }

  /**
   * Check if element has focus styles
   */
  private checkFocusStyles(element: HTMLElement): boolean {
    try {
      // Create a temporary clone to test focus styles
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '-9999px';
      document.body.appendChild(clone);

      // Get styles before and after focus
      const normalStyle = window.getComputedStyle(clone);
      const normalOutline = normalStyle.outline;
      const normalBoxShadow = normalStyle.boxShadow;

      // Simulate focus (check CSS rules)
      clone.focus();
      const focusStyle = window.getComputedStyle(clone);
      const focusOutline = focusStyle.outline;
      const focusBoxShadow = focusStyle.boxShadow;

      document.body.removeChild(clone);

      // Check if focus styles are different from normal styles
      return (focusOutline !== normalOutline && focusOutline !== 'none') ||
             (focusBoxShadow !== normalBoxShadow && focusBoxShadow !== 'none');

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if element has active/pressed styles
   */
  private checkActiveStyles(element: HTMLElement): boolean {
    try {
      const computedStyle = window.getComputedStyle(element);
      
      // Check for common active state indicators
      const hasTransition = computedStyle.transition !== 'none';
      const hasTransform = computedStyle.transform !== 'none';
      const hasActiveSelector = this.hasActiveStateCSS(element);

      return hasTransition || hasTransform || hasActiveSelector;

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if element has CSS rules for active state
   */
  private hasActiveStateCSS(element: HTMLElement): boolean {
    try {
      // This is a simplified check - in a real implementation would inspect CSS rules
      const classList = Array.from(element.classList);
      return classList.some(className => 
        className.includes('hover') || 
        className.includes('active') || 
        className.includes('pressed')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if current viewport is mobile size
   */
  private isMobileViewport(): boolean {
    return this.context.viewport.width <= 768;
  }

  /**
   * Test disabled element protection
   */
  async testDisabledElementProtection(elements: NavigationElement[]): Promise<InteractionTest[]> {
    const tests: InteractionTest[] = [];

    for (const element of elements) {
      if (!element.element) continue;

      const domElement = element.element;
      const isDisabled = domElement.hasAttribute('disabled') || 
                        domElement.getAttribute('aria-disabled') === 'true';

      if (isDisabled) {
        const test: InteractionTest = {
          element,
          testType: 'click',
          expectedBehavior: 'Disabled element should not respond to interactions',
          actualBehavior: '',
          success: false,
        };

        try {
          // Check if disabled element is properly protected
          const hasPointerEvents = window.getComputedStyle(domElement).pointerEvents !== 'none';
          const hasTabIndex = domElement.tabIndex >= 0;

          if (!hasPointerEvents && !hasTabIndex) {
            test.actualBehavior = 'Disabled element is properly protected from interactions';
            test.success = true;
          } else {
            test.actualBehavior = 'Disabled element may still be interactive';
            test.success = false;
          }

        } catch (error) {
          test.actualBehavior = `Failed to test disabled protection: ${error instanceof Error ? error.message : 'Unknown error'}`;
          test.error = error instanceof Error ? error.message : 'Unknown error';
        }

        tests.push(test);
      }
    }

    return tests;
  }

  /**
   * Handle errors during testing
   */
  private handleError(error: AuditError): void {
    this.errors.push(error);
    console.warn(`Interaction Tester Error [${error.code}]:`, error.message);
  }

  /**
   * Get all errors encountered during testing
   */
  getErrors(): AuditError[] {
    return [...this.errors];
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}