/**
 * Navigation Audit Helper Utilities
 * Common utility functions for navigation audit system
 */

import type { NavigationElement, AccessibilityIssue } from '../interfaces';

/**
 * Check if an element has a valid event handler
 */
export function hasValidEventHandler(element: HTMLElement): boolean {
  // Check for onclick attribute
  if (element.hasAttribute('onclick')) {
    return true;
  }

  // Check for React event listeners (they're attached to the root)
  const hasReactProps = Object.keys(element).some(key => key.startsWith('__react'));
  if (hasReactProps) {
    return true;
  }

  // Check for href on links
  if (element.tagName === 'A' && element.hasAttribute('href')) {
    const href = element.getAttribute('href');
    return href !== null && href !== '' && href !== '#';
  }

  // Check for form submit buttons
  if (element.tagName === 'BUTTON' || element.getAttribute('type') === 'submit') {
    const form = element.closest('form');
    return form !== null;
  }

  return false;
}

/**
 * Extract destination from navigation element
 */
export function extractDestination(element: HTMLElement): string | undefined {
  // Check href attribute
  const href = element.getAttribute('href');
  if (href && href !== '#') {
    return href;
  }

  // Check data-to attribute (React Router Link)
  const dataTo = element.getAttribute('data-to');
  if (dataTo) {
    return dataTo;
  }

  // Check for React Router Link props
  const reactProps = Object.keys(element).find(key => key.startsWith('__react'));
  if (reactProps) {
    // This is a simplified check - in real implementation would need to access React internals
    return undefined;
  }

  return undefined;
}

/**
 * Check if element meets WCAG touch target size requirements
 */
export function meetsTouchTargetSize(element: HTMLElement, minSize = 44): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Check if element has proper ARIA labels
 */
export function hasProperAriaLabels(element: HTMLElement): boolean {
  // Check for aria-label
  if (element.hasAttribute('aria-label')) {
    const label = element.getAttribute('aria-label');
    return label !== null && label.trim().length > 0;
  }

  // Check for aria-labelledby
  if (element.hasAttribute('aria-labelledby')) {
    const labelId = element.getAttribute('aria-labelledby');
    if (labelId) {
      const labelElement = document.getElementById(labelId);
      return labelElement !== null && labelElement.textContent?.trim().length > 0;
    }
  }

  // Check for text content
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 0) {
    return true;
  }

  // Check for alt text on images
  if (element.tagName === 'IMG') {
    return element.hasAttribute('alt');
  }

  return false;
}

/**
 * Check if element is keyboard accessible
 */
export function isKeyboardAccessible(element: HTMLElement): boolean {
  // Check if element is focusable
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex && parseInt(tabIndex) < 0) {
    return false;
  }

  // Check if element is naturally focusable
  const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableElements.includes(element.tagName)) {
    return !element.hasAttribute('disabled');
  }

  // Check if element has role="button" and tabindex
  if (element.getAttribute('role') === 'button') {
    return tabIndex !== null && parseInt(tabIndex) >= 0;
  }

  return false;
}

/**
 * Calculate accessibility score for an element
 */
export function calculateAccessibilityScore(element: HTMLElement): number {
  let score = 0;
  const maxScore = 5;

  // Has proper ARIA labels (1 point)
  if (hasProperAriaLabels(element)) score++;

  // Is keyboard accessible (1 point)
  if (isKeyboardAccessible(element)) score++;

  // Meets touch target size (1 point)
  if (meetsTouchTargetSize(element)) score++;

  // Has valid role (1 point)
  const role = element.getAttribute('role');
  if (role && ['button', 'link', 'menuitem'].includes(role)) score++;

  // Has focus indicator (1 point)
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.outlineWidth !== '0px' || computedStyle.outlineStyle !== 'none') {
    score++;
  }

  return (score / maxScore) * 100;
}

/**
 * Generate accessibility issues for an element
 */
export function generateAccessibilityIssues(
  navElement: NavigationElement,
  element: HTMLElement
): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for missing ARIA labels
  if (!hasProperAriaLabels(element)) {
    issues.push({
      element: navElement,
      issueType: 'missing-aria-label',
      severity: 'high',
      description: 'Navigation element lacks proper ARIA label or text content',
      recommendation: 'Add aria-label attribute or ensure element has descriptive text content',
    });
  }

  // Check for keyboard accessibility
  if (!isKeyboardAccessible(element)) {
    issues.push({
      element: navElement,
      issueType: 'keyboard-inaccessible',
      severity: 'critical',
      description: 'Navigation element is not keyboard accessible',
      recommendation: 'Ensure element is focusable and has appropriate tabindex',
    });
  }

  // Check touch target size
  if (!meetsTouchTargetSize(element)) {
    issues.push({
      element: navElement,
      issueType: 'missing-focus-indicator',
      severity: 'medium',
      description: 'Touch target size is below WCAG minimum (44x44 pixels)',
      recommendation: 'Increase element size or padding to meet minimum touch target requirements',
    });
  }

  // Check for invalid role
  const role = element.getAttribute('role');
  if (role && !['button', 'link', 'menuitem', 'navigation'].includes(role)) {
    issues.push({
      element: navElement,
      issueType: 'invalid-role',
      severity: 'medium',
      description: `Invalid ARIA role: ${role}`,
      recommendation: 'Use appropriate ARIA role for navigation elements',
    });
  }

  return issues;
}

/**
 * Check if route path matches pattern
 */
export function matchesRoutePattern(path: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
    .replace(/\*/g, '.*'); // Replace * with regex

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Extract route parameters from path
 */
export function extractRouteParams(path: string, pattern: string): Record<string, string> {
  const params: Record<string, string> = {};
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      params[paramName] = pathParts[index] || '';
    }
  });

  return params;
}

/**
 * Generate unique selector for element
 */
export function generateSelector(element: HTMLElement): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try unique class combination
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }

  // Generate path-based selector
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    const siblings = current.parentElement?.children;
    if (siblings && siblings.length > 1) {
      const index = Array.from(siblings).indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}