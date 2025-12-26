/**
 * Navigation Scanner
 * Discovers and catalogs all navigation elements across the application
 */

import type { 
  NavigationElement, 
  NavigationScanResult, 
  AuditContext,
  AuditError 
} from './interfaces';
import { 
  hasValidEventHandler, 
  extractDestination, 
  hasProperAriaLabels,
  generateSelector,
  generateAccessibilityIssues 
} from './utils/helpers';

export class NavigationScanner {
  private context: AuditContext;
  private errors: AuditError[] = [];

  constructor(context: AuditContext) {
    this.context = context;
  }

  /**
   * Scan the current page for all navigation elements
   */
  async scanCurrentPage(): Promise<NavigationScanResult> {
    const startTime = Date.now();
    const elements: NavigationElement[] = [];
    const brokenLinks: NavigationElement[] = [];
    const missingHandlers: NavigationElement[] = [];
    const accessibilityIssues: NavigationElement[] = [];

    try {
      // Find all potential navigation elements
      const candidates = this.findNavigationCandidates();
      
      for (const element of candidates) {
        const navElement = await this.analyzeElement(element);
        elements.push(navElement);

        // Check for issues
        if (this.isBrokenLink(navElement, element)) {
          brokenLinks.push(navElement);
        }

        if (this.hasMissingHandler(navElement, element)) {
          missingHandlers.push(navElement);
        }

        if (!navElement.isAccessible) {
          accessibilityIssues.push(navElement);
        }
      }

      return {
        elements,
        brokenLinks,
        missingHandlers,
        accessibilityIssues,
        totalScanned: elements.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.handleError({
        code: 'SCAN_ERROR',
        message: `Failed to scan navigation elements: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        severity: 'high',
      });
      
      throw error;
    }
  }

  /**
   * Scan multiple pages for navigation elements
   */
  async scanMultiplePages(urls: string[]): Promise<NavigationScanResult[]> {
    const results: NavigationScanResult[] = [];

    for (const url of urls) {
      try {
        // Navigate to URL (in a real implementation, this would use a browser automation tool)
        await this.navigateToUrl(url);
        const result = await this.scanCurrentPage();
        results.push(result);
      } catch (error) {
        this.handleError({
          code: 'PAGE_SCAN_ERROR',
          message: `Failed to scan page ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context: { url },
          timestamp: new Date(),
          severity: 'medium',
        });
      }
    }

    return results;
  }

  /**
   * Find all potential navigation elements on the page
   */
  private findNavigationCandidates(): HTMLElement[] {
    const selectors = [
      'a[href]',                    // Links with href
      'button',                     // Buttons
      'input[type="submit"]',       // Submit buttons
      'input[type="button"]',       // Input buttons
      '[role="button"]',            // Elements with button role
      '[role="link"]',              // Elements with link role
      '[role="menuitem"]',          // Menu items
      'nav a',                      // Navigation links
      '.nav a',                     // Navigation class links
      '[data-testid*="nav"]',       // Test ID navigation elements
      '[data-testid*="button"]',    // Test ID buttons
      '[data-testid*="link"]',      // Test ID links
      '[onclick]',                  // Elements with onclick handlers
      'form button',                // Form buttons
      'form input[type="submit"]',  // Form submit inputs
    ];

    const elements: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(element => {
          if (element instanceof HTMLElement && !seen.has(element)) {
            seen.add(element);
            elements.push(element);
          }
        });
      } catch (error) {
        this.handleError({
          code: 'SELECTOR_ERROR',
          message: `Invalid selector: ${selector}`,
          context: { selector },
          timestamp: new Date(),
          severity: 'low',
        });
      }
    }

    return elements;
  }

  /**
   * Analyze a single element and create NavigationElement
   */
  private async analyzeElement(element: HTMLElement): Promise<NavigationElement> {
    const id = this.generateElementId(element);
    const type = this.determineElementType(element);
    const selector = generateSelector(element);
    const destination = extractDestination(element);
    const handler = this.extractHandler(element);
    const role = element.getAttribute('role') || undefined;
    const ariaLabel = element.getAttribute('aria-label') || undefined;
    const text = element.textContent?.trim() || undefined;
    const href = element.getAttribute('href') || undefined;
    const onClick = element.getAttribute('onclick') || undefined;
    const isAccessible = this.checkAccessibility(element);

    return {
      id,
      type,
      selector,
      destination,
      handler,
      role,
      ariaLabel,
      isAccessible,
      element,
      text,
      href,
      onClick,
    };
  }

  /**
   * Generate unique ID for element
   */
  private generateElementId(element: HTMLElement): string {
    if (element.id) {
      return element.id;
    }

    // Generate ID based on element characteristics
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim().slice(0, 20) || '';
    const href = element.getAttribute('href') || '';
    const className = element.className || '';
    
    const hash = this.simpleHash(`${tagName}-${text}-${href}-${className}`);
    return `nav-element-${hash}`;
  }

  /**
   * Determine the type of navigation element
   */
  private determineElementType(element: HTMLElement): NavigationElement['type'] {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    if (tagName === 'a' || role === 'link') {
      return 'link';
    }

    if (tagName === 'button' || role === 'button' || type === 'button') {
      return 'button';
    }

    if (type === 'submit' || (tagName === 'input' && type === 'submit')) {
      return 'form-submit';
    }

    if (role === 'menuitem' || element.closest('[role="menu"]')) {
      return 'menu-item';
    }

    // Default to button for interactive elements
    return 'button';
  }

  /**
   * Extract event handler information
   */
  private extractHandler(element: HTMLElement): string | undefined {
    // Check onclick attribute
    const onclick = element.getAttribute('onclick');
    if (onclick) {
      return `onclick: ${onclick.slice(0, 50)}`;
    }

    // Check for React event listeners (simplified)
    const reactProps = Object.keys(element).find(key => key.startsWith('__react'));
    if (reactProps) {
      return 'React event handler';
    }

    // Check for form submission
    if (element.closest('form')) {
      return 'form submission';
    }

    return undefined;
  }

  /**
   * Check element accessibility
   */
  private checkAccessibility(element: HTMLElement): boolean {
    const hasAriaLabel = hasProperAriaLabels(element);
    const hasValidHandler = hasValidEventHandler(element);
    const isKeyboardAccessible = this.isKeyboardAccessible(element);

    return hasAriaLabel && (hasValidHandler || element.tagName === 'A') && isKeyboardAccessible;
  }

  /**
   * Check if element is keyboard accessible
   */
  private isKeyboardAccessible(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex && parseInt(tabIndex) < 0) {
      return false;
    }

    const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (focusableElements.includes(element.tagName)) {
      return !element.hasAttribute('disabled');
    }

    if (element.getAttribute('role') === 'button') {
      return tabIndex !== null && parseInt(tabIndex) >= 0;
    }

    return false;
  }

  /**
   * Check if element is a broken link
   */
  private isBrokenLink(navElement: NavigationElement, element: HTMLElement): boolean {
    if (navElement.type !== 'link') {
      return false;
    }

    const href = navElement.href || navElement.destination;
    if (!href) {
      return true; // Link without destination is broken
    }

    // Check for obviously broken patterns
    if (href === '#' || href === 'javascript:void(0)' || href === '') {
      return !navElement.handler && !navElement.onClick; // Only broken if no JS handler
    }

    // Check for malformed URLs
    if (href.startsWith('http')) {
      try {
        new URL(href);
        return false;
      } catch {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if element has missing handler
   */
  private hasMissingHandler(navElement: NavigationElement, element: HTMLElement): boolean {
    if (navElement.type === 'link' && navElement.href) {
      return false; // Links with href are OK
    }

    if (navElement.type === 'form-submit' && element.closest('form')) {
      return false; // Form submit buttons are OK
    }

    return !hasValidEventHandler(element);
  }

  /**
   * Navigate to URL (placeholder for browser automation)
   */
  private async navigateToUrl(url: string): Promise<void> {
    // In a real implementation, this would use Playwright, Puppeteer, or similar
    // For now, we'll just update the context
    this.context.baseUrl = url;
  }

  /**
   * Handle errors during scanning
   */
  private handleError(error: AuditError): void {
    this.errors.push(error);
    console.warn(`Navigation Scanner Error [${error.code}]:`, error.message);
  }

  /**
   * Get all errors encountered during scanning
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

  /**
   * Simple hash function for generating IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}