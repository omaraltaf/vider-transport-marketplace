/**
 * Navigation Audit System Interfaces
 * Core type definitions for the navigation audit system
 */

export interface NavigationElement {
  id: string;
  type: 'link' | 'button' | 'menu-item' | 'form-submit';
  selector: string;
  destination?: string;
  handler?: string;
  role?: string;
  ariaLabel?: string;
  isAccessible: boolean;
  element?: HTMLElement;
  text?: string;
  href?: string;
  onClick?: string;
  tagName?: string;
  boundingRect?: DOMRect;
  isInteractive?: boolean;
  isVisible?: boolean;
}

export interface NavigationScanResult {
  elements: NavigationElement[];
  brokenLinks: NavigationElement[];
  missingHandlers: NavigationElement[];
  accessibilityIssues: NavigationElement[];
  totalScanned: number;
  timestamp: Date;
}

export interface RouteValidation {
  path: string;
  exists: boolean;
  accessible: boolean;
  requiredRole?: string;
  redirectsTo?: string;
  statusCode?: number;
  error?: string;
}

export interface RouteValidationResult {
  validRoutes: RouteValidation[];
  invalidRoutes: RouteValidation[];
  orphanedRoutes: RouteValidation[];
  totalRoutes: number;
  timestamp: Date;
}

export interface InteractionTest {
  element: NavigationElement;
  testType: 'click' | 'keyboard' | 'touch';
  expectedBehavior: string;
  actualBehavior: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface InteractionTestResult {
  passedTests: InteractionTest[];
  failedTests: InteractionTest[];
  coverage: number;
  totalTests: number;
  timestamp: Date;
}

export interface AccessibilityIssue {
  element: NavigationElement;
  issueType: 'missing-aria-label' | 'invalid-role' | 'poor-contrast' | 'missing-focus-indicator' | 'keyboard-inaccessible';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface AccessibilityTestResult {
  issues: AccessibilityIssue[];
  passedElements: NavigationElement[];
  score: number; // 0-100
  wcagLevel: 'A' | 'AA' | 'AAA' | 'fail';
  timestamp: Date;
}

export interface RoleNavigationMap {
  role: 'PLATFORM_ADMIN' | 'COMPANY_ADMIN' | 'GUEST';
  allowedRoutes: string[];
  navigationElements: NavigationElement[];
  restrictions: string[];
}

export interface RoleBasedTestResult {
  roleTests: Map<string, InteractionTestResult>;
  accessControlViolations: NavigationElement[];
  permissionErrors: string[];
  timestamp: Date;
}

export interface ResponsiveTestResult {
  breakpoints: Map<string, InteractionTestResult>;
  mobileIssues: NavigationElement[];
  touchTargetIssues: NavigationElement[];
  layoutIssues: string[];
  timestamp: Date;
}

export interface StateManagementTestResult {
  statePreservationTests: InteractionTest[];
  navigationTransitionTests: InteractionTest[];
  permissionChangeTests: InteractionTest[];
  errorHandlingTests: InteractionTest[];
  timestamp: Date;
}

export interface NavigationAuditReport {
  timestamp: Date;
  version: string;
  summary: {
    totalElements: number;
    workingElements: number;
    brokenElements: number;
    accessibilityScore: number;
    overallScore: number;
  };
  findings: {
    brokenLinks: NavigationElement[];
    missingHandlers: NavigationElement[];
    accessibilityIssues: AccessibilityIssue[];
    roleBasedIssues: NavigationElement[];
    responsiveIssues: NavigationElement[];
    stateManagementIssues: InteractionTest[];
  };
  recommendations: string[];
  testResults: {
    scanResult: NavigationScanResult;
    routeValidation: RouteValidationResult;
    interactionTests: InteractionTestResult;
    accessibilityTests: AccessibilityTestResult;
    roleBasedTests: RoleBasedTestResult;
    responsiveTests: ResponsiveTestResult;
    stateManagementTests: StateManagementTestResult;
  };
}

export interface AuditConfiguration {
  includeAccessibility: boolean;
  includeRoleBased: boolean;
  includeResponsive: boolean;
  includeStateManagement: boolean;
  breakpoints: string[];
  userRoles: string[];
  maxTestDuration: number;
  propertyTestIterations: number;
}

export interface AuditContext {
  baseUrl: string;
  currentUser?: {
    id: string;
    role: string;
    permissions: string[];
  };
  authToken?: string;
  viewport: {
    width: number;
    height: number;
  };
}

/**
 * Error handling interfaces for audit system
 */
export interface AuditError {
  code: string;
  message: string;
  element?: NavigationElement;
  context?: Record<string, unknown>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditErrorHandler {
  handleError(error: AuditError): void;
  getErrors(): AuditError[];
  clearErrors(): void;
}

/**
 * Performance monitoring interfaces
 */
export interface PerformanceMetrics {
  scanDuration: number;
  testDuration: number;
  totalDuration: number;
  elementsPerSecond: number;
  memoryUsage?: number;
}

/**
 * Audit progress tracking
 */
export interface AuditProgress {
  phase: 'scanning' | 'validating' | 'testing' | 'reporting' | 'complete';
  progress: number; // 0-100
  currentTask: string;
  estimatedTimeRemaining?: number;
  errors: AuditError[];
}

/**
 * Audit event system
 */
export interface AuditEvent {
  type: 'scan-start' | 'scan-complete' | 'test-start' | 'test-complete' | 'error' | 'progress';
  data: unknown;
  timestamp: Date;
}

export interface AuditEventListener {
  (event: AuditEvent): void;
}

/**
 * Plugin system for extensibility
 */
export interface AuditPlugin {
  name: string;
  version: string;
  execute(context: AuditContext, elements: NavigationElement[]): Promise<unknown>;
  validate?(config: AuditConfiguration): boolean;
}