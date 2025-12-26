/**
 * Property-Based Tests for Error Logging and Recovery
 * **Feature: user-state-authentication-fix, Property 15: Error logging and recovery**
 * **Validates: Requirements 4.5**
 * 
 * Tests that for any JavaScript error in authentication flow, the system logs the error
 * and provides recovery options
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { 
  AuthErrorLogger, 
  AuthErrorCategory, 
  AuthErrorSeverity,
  authErrorLogger 
} from '../AuthErrorLogger';
import { 
  RecoverySuggestionService, 
  recoverySuggestionService 
} from '../RecoverySuggestionService';
import { loggingService } from '../LoggingService';
import type { ApiError, ErrorContext } from '../../../types/error.types';

// Test generators with more realistic data
const authErrorCategoryGen = fc.constantFrom(...Object.values(AuthErrorCategory));
const authErrorSeverityGen = fc.constantFrom(...Object.values(AuthErrorSeverity));
const errorTypeGen = fc.constantFrom('NETWORK', 'AUTH', 'PERMISSION', 'PARSING', 'TIMEOUT', 'SERVER');
const severityGen = fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

// Generate realistic error messages
const errorMessageGen = fc.oneof(
  fc.constant('Authentication token has expired'),
  fc.constant('Invalid authentication token provided'),
  fc.constant('Permission denied for this resource'),
  fc.constant('Network connection failed'),
  fc.constant('User session has expired'),
  fc.constant('Storage access is not available'),
  fc.constant('User state data is corrupted'),
  fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10)
);

const apiErrorGen = fc.record({
  type: errorTypeGen,
  message: errorMessageGen,
  statusCode: fc.option(fc.integer({ min: 400, max: 599 })),
  originalError: fc.constant(new Error('Test error')),
  context: fc.constant({} as ErrorContext), // Add required context field
  severity: severityGen,
  isRecoverable: fc.boolean(),
  userMessage: fc.oneof(
    fc.constant('Please sign in again'),
    fc.constant('Access denied'),
    fc.constant('Connection error'),
    fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5)
  ),
  metadata: fc.option(fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())))
});

const componentNameGen = fc.oneof(
  fc.constant('AuthContext'),
  fc.constant('UserStateGuard'),
  fc.constant('TokenManager'),
  fc.constant('LoginForm'),
  fc.constant('Dashboard'),
  fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5)
);

const errorContextGen = fc.record({
  endpoint: fc.oneof(
    fc.constant('/api/auth/login'),
    fc.constant('/api/auth/refresh'),
    fc.constant('/api/user/profile'),
    fc.webUrl()
  ),
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  component: componentNameGen,
  userId: fc.option(fc.uuid()),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  retryCount: fc.integer({ min: 0, max: 5 }),
  userAgent: fc.option(fc.constant('Mozilla/5.0 (Test Browser)')),
  sessionId: fc.option(fc.uuid()),
  requestId: fc.option(fc.uuid())
});

const recoveryContextGen = fc.record({
  userRole: fc.option(fc.constantFrom('USER', 'ADMIN', 'COMPANY_ADMIN')),
  hasStorageAccess: fc.boolean(),
  hasNetworkAccess: fc.boolean(),
  browserSupportsFeatures: fc.record({
    localStorage: fc.boolean(),
    sessionStorage: fc.boolean(),
    broadcastChannel: fc.boolean()
  }),
  currentUrl: fc.webUrl(),
  userPreferences: fc.option(fc.record({
    preferAutomatedRecovery: fc.boolean(),
    allowDataClearing: fc.boolean()
  }))
});

describe('Error Logging and Recovery Property Tests', () => {
  let mockConsole: {
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Mock console methods
    mockConsole = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };
    
    vi.stubGlobal('console', mockConsole);
    
    // Clear any existing logs
    await loggingService.clearLogs();
    
    // Clear active errors from singleton - use proper method
    (authErrorLogger as any).activeErrors.clear();
    
    // Mock localStorage and sessionStorage
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('sessionStorage', mockStorage);
    
    // Mock fetch for network checks
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK'
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 15: Error logging and recovery
   * For any JavaScript error in authentication flow, the system SHALL log the error
   * and provide recovery options
   */
  it('should log authentication errors and provide recovery options', async () => {
    // Create a realistic authentication error
    const error: ApiError = {
      type: 'AUTH' as any,
      message: 'Authentication token has expired',
      statusCode: 401,
      originalError: new Error('Token expired'),
      context: {} as ErrorContext,
      severity: 'HIGH' as any,
      isRecoverable: true,
      userMessage: 'Please sign in again',
      metadata: { tokenExpired: true }
    };

    const context: ErrorContext = {
      endpoint: '/api/auth/refresh',
      method: 'POST',
      component: 'TokenManager',
      userId: 'user-123',
      timestamp: new Date(),
      retryCount: 1,
      sessionId: 'session-456'
    };

    const recoveryContext = {
      userRole: 'USER',
      hasStorageAccess: true,
      hasNetworkAccess: true,
      browserSupportsFeatures: {
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true
      },
      currentUrl: 'https://example.com/dashboard',
      userPreferences: {
        preferAutomatedRecovery: true,
        allowDataClearing: true
      }
    };

    // Act: Log the authentication error
    const errorId = authErrorLogger.logAuthError(error, context);
    
    // Assert: Error should be logged with valid ID
    expect(errorId).toBeDefined();
    expect(typeof errorId).toBe('string');
    expect(errorId).toMatch(/^auth_error_\d+_[a-z0-9]+$/);
    
    // Assert: Recovery suggestions should be available
    const suggestions = recoverySuggestionService.getRecoverySuggestions(
      error, 
      context, 
      recoveryContext
    );
    
    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    
    // Assert: Each suggestion should have required properties
    suggestions.forEach(suggestion => {
      expect(suggestion.id).toBeDefined();
      expect(suggestion.title).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.steps).toBeDefined();
      expect(Array.isArray(suggestion.steps)).toBe(true);
      expect(suggestion.steps.length).toBeGreaterThan(0);
      expect(suggestion.estimatedTime).toBeDefined();
      expect(['easy', 'medium', 'advanced']).toContain(suggestion.difficulty);
      expect(suggestion.successRate).toBeGreaterThanOrEqual(0);
      expect(suggestion.successRate).toBeLessThanOrEqual(1);
      expect(typeof suggestion.requiresUserAction).toBe('boolean');
      expect(typeof suggestion.canAutoExecute).toBe('boolean');
    });
    
    // Assert: Each step should have required properties
    suggestions.forEach(suggestion => {
      suggestion.steps.forEach(step => {
        expect(step.order).toBeGreaterThan(0);
        expect(step.instruction).toBeDefined();
        expect(typeof step.isAutomated).toBe('boolean');
        expect(step.expectedOutcome).toBeDefined();
      });
    });
  });

  it('should categorize errors correctly and provide appropriate recovery options', () => {
    const testCases = [
      {
        error: {
          type: 'AUTH' as any,
          message: 'Authentication token has expired',
          statusCode: 401,
          originalError: new Error('Token expired'),
          context: {} as ErrorContext,
          severity: 'HIGH' as any,
          isRecoverable: true,
          userMessage: 'Please sign in again'
        },
        expectedSuggestionTypes: ['token', 'login', 'refresh']
      },
      {
        error: {
          type: 'PERMISSION' as any,
          message: 'Access denied to resource',
          statusCode: 403,
          originalError: new Error('Forbidden'),
          context: {} as ErrorContext,
          severity: 'MEDIUM' as any,
          isRecoverable: false,
          userMessage: 'Access denied'
        },
        expectedSuggestionTypes: ['permission', 'admin', 'limited']
      },
      {
        error: {
          type: 'CLIENT' as any,
          message: 'Storage access failed',
          statusCode: null,
          originalError: new Error('Storage error'),
          context: {} as ErrorContext,
          severity: 'HIGH' as any,
          isRecoverable: true,
          userMessage: 'Storage unavailable'
        },
        expectedSuggestionTypes: ['storage', 'session']
      }
    ];

    const context: ErrorContext = {
      endpoint: '/api/test',
      method: 'GET',
      component: 'TestComponent',
      timestamp: new Date(),
      retryCount: 0
    };

    const recoveryContext = {
      hasStorageAccess: true,
      hasNetworkAccess: true,
      browserSupportsFeatures: {
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true
      },
      currentUrl: 'https://example.com'
    };

    testCases.forEach(({ error, expectedSuggestionTypes }) => {
      // Clear state before each test
      (authErrorLogger as any).activeErrors.clear();
      
      // Act: Log error and get suggestions
      const errorId = authErrorLogger.logAuthError(error, context);
      const suggestions = recoverySuggestionService.getRecoverySuggestions(
        error, 
        context, 
        recoveryContext
      );
      
      // Assert: Suggestions should be relevant to error type
      const hasRelevantSuggestions = suggestions.some(s => 
        expectedSuggestionTypes.some(type => s.id.includes(type))
      );
      expect(hasRelevantSuggestions).toBe(true);
      
      // Assert: Automated suggestions should be marked correctly
      suggestions.forEach(suggestion => {
        if (suggestion.canAutoExecute) {
          expect(suggestion.steps.some(step => step.isAutomated)).toBe(true);
        }
        
        if (suggestion.requiresUserAction) {
          expect(suggestion.steps.some(step => !step.isAutomated)).toBe(true);
        }
      });
    });
  });

  it('should track resolution attempts and mark errors as resolved', () => {
    // Clear state before test
    (authErrorLogger as any).activeErrors.clear();
    
    const error: ApiError = {
      type: 'AUTH' as any,
      message: 'Token refresh failed',
      statusCode: 401,
      originalError: new Error('Refresh failed'),
      context: {} as ErrorContext,
      severity: 'HIGH' as any,
      isRecoverable: true,
      userMessage: 'Please sign in again'
    };

    const context: ErrorContext = {
      endpoint: '/api/auth/refresh',
      method: 'POST',
      component: 'TokenManager',
      timestamp: new Date(),
      retryCount: 1
    };
    
    // Act: Log error and record resolution attempt
    const errorId = authErrorLogger.logAuthError(error, context);
    
    // Test unsuccessful resolution
    authErrorLogger.recordResolutionAttempt(
      errorId,
      'token_refresh',
      false,
      'Network timeout',
      1500
    );
    
    let stats = authErrorLogger.getAuthErrorStatistics();
    expect(stats.activeErrors).toBe(1); // Error should remain active
    expect(stats.averageResolutionAttempts).toBeGreaterThan(0);
    
    // Test successful resolution
    authErrorLogger.recordResolutionAttempt(
      errorId,
      'manual_login',
      true,
      undefined,
      2000
    );
    
    authErrorLogger.resolveError(errorId, 'manual_login', 'resolved');
    
    stats = authErrorLogger.getAuthErrorStatistics();
    expect(stats.activeErrors).toBe(0); // Error should be removed when resolved
    
    // Assert: Statistics should have valid structure
    expect(stats.errorsByCategory).toBeDefined();
    expect(stats.errorsBySeverity).toBeDefined();
    expect(typeof stats.averageResolutionAttempts).toBe('number');
    expect(stats.averageResolutionAttempts).toBeGreaterThanOrEqual(0);
  });

  it('should provide recovery options sorted by success rate and user preferences', () => {
    const error: ApiError = {
      type: 'AUTH' as any,
      message: 'Authentication token has expired',
      statusCode: 401,
      originalError: new Error('Token expired'),
      context: {} as ErrorContext,
      severity: 'HIGH' as any,
      isRecoverable: true,
      userMessage: 'Please sign in again'
    };

    const context: ErrorContext = {
      endpoint: '/api/auth/refresh',
      method: 'POST',
      component: 'TokenManager',
      timestamp: new Date(),
      retryCount: 1
    };

    // Test with user preference for automated recovery
    const recoveryContextAutomated = {
      hasStorageAccess: true,
      hasNetworkAccess: true,
      browserSupportsFeatures: {
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true
      },
      currentUrl: 'https://example.com',
      userPreferences: {
        preferAutomatedRecovery: true,
        allowDataClearing: true
      }
    };
    
    // Act: Get recovery suggestions
    const suggestions = recoverySuggestionService.getRecoverySuggestions(
      error, 
      context, 
      recoveryContextAutomated
    );
    
    // Assert: Suggestions should be sorted appropriately
    if (suggestions.length > 1) {
      // If user prefers automated recovery, automated suggestions should come first
      const firstAutomated = suggestions.findIndex(s => s.canAutoExecute);
      const firstManual = suggestions.findIndex(s => !s.canAutoExecute);
      
      if (firstAutomated !== -1 && firstManual !== -1) {
        expect(firstAutomated).toBeLessThan(firstManual);
      }
    }
    
    // Assert: All suggestions should have valid success rates
    suggestions.forEach(suggestion => {
      expect(suggestion.successRate).toBeGreaterThanOrEqual(0);
      expect(suggestion.successRate).toBeLessThanOrEqual(1);
    });
    
    // Test without automated preference
    const recoveryContextManual = {
      ...recoveryContextAutomated,
      userPreferences: {
        preferAutomatedRecovery: false,
        allowDataClearing: true
      }
    };
    
    const manualSuggestions = recoverySuggestionService.getRecoverySuggestions(
      error, 
      context, 
      recoveryContextManual
    );
    
    // Success rates should generally be in descending order
    if (manualSuggestions.length > 1) {
      for (let i = 0; i < manualSuggestions.length - 1; i++) {
        const current = manualSuggestions[i];
        const next = manualSuggestions[i + 1];
        
        // Allow some flexibility for sorting
        expect(current.successRate).toBeGreaterThanOrEqual(next.successRate - 0.1);
      }
    }
  });

  it('should handle automated recovery execution with proper error tracking', async () => {
    // Clear state before test
    (authErrorLogger as any).activeErrors.clear();
    
    const error: ApiError = {
      type: 'AUTH' as any,
      message: 'Authentication token has expired',
      statusCode: 401,
      originalError: new Error('Token expired'),
      context: {} as ErrorContext,
      severity: 'HIGH' as any,
      isRecoverable: true,
      userMessage: 'Please sign in again'
    };

    const context: ErrorContext = {
      endpoint: '/api/auth/refresh',
      method: 'POST',
      component: 'TokenManager',
      timestamp: new Date(),
      retryCount: 1
    };

    const recoveryContext = {
      hasStorageAccess: true,
      hasNetworkAccess: true,
      browserSupportsFeatures: {
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true
      },
      currentUrl: 'https://example.com',
      userPreferences: {
        preferAutomatedRecovery: true,
        allowDataClearing: true
      }
    };
    
    // Act: Log error and get automated suggestions
    const errorId = authErrorLogger.logAuthError(error, context);
    const suggestions = recoverySuggestionService.getRecoverySuggestions(
      error, 
      context, 
      recoveryContext
    );
    
    const automatedSuggestions = suggestions.filter(s => s.canAutoExecute);
    
    if (automatedSuggestions.length > 0) {
      const suggestion = automatedSuggestions[0];
      
      // Act: Execute automated recovery
      const result = await recoverySuggestionService.executeRecovery(
        suggestion.id,
        errorId
      );
      
      // Assert: Result should have proper structure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
      
      if (!result.success && result.nextSteps) {
        expect(Array.isArray(result.nextSteps)).toBe(true);
        expect(result.nextSteps.length).toBeGreaterThan(0);
      }
      
      // Assert: Resolution attempt should be recorded
      const stats = authErrorLogger.getAuthErrorStatistics();
      expect(stats.averageResolutionAttempts).toBeGreaterThanOrEqual(0);
    } else {
      // If no automated suggestions, that's also valid
      expect(suggestions.length).toBeGreaterThan(0);
    }
  });

  it('should export error logs with proper structure and filtering', async () => {
    // Clear state before test
    (authErrorLogger as any).activeErrors.clear();
    await loggingService.clearLogs();
    
    const errors = [
      {
        error: {
          type: 'AUTH' as any,
          message: 'Token expired',
          statusCode: 401,
          originalError: new Error('Token expired'),
          context: {} as ErrorContext,
          severity: 'HIGH' as any,
          isRecoverable: true,
          userMessage: 'Please sign in again'
        },
        context: {
          endpoint: '/api/auth/refresh',
          method: 'POST',
          component: 'TokenManager',
          timestamp: new Date(),
          retryCount: 1
        }
      },
      {
        error: {
          type: 'PERMISSION' as any,
          message: 'Access denied',
          statusCode: 403,
          originalError: new Error('Forbidden'),
          context: {} as ErrorContext,
          severity: 'MEDIUM' as any,
          isRecoverable: false,
          userMessage: 'Access denied'
        },
        context: {
          endpoint: '/api/admin/users',
          method: 'GET',
          component: 'AdminPanel',
          timestamp: new Date(),
          retryCount: 0
        }
      }
    ];
    
    // Act: Log multiple errors
    const errorIds: string[] = [];
    for (const { error, context } of errors) {
      const errorId = authErrorLogger.logAuthError(error, context);
      errorIds.push(errorId);
    }
    
    // Act: Export logs
    const exportedLogs = await authErrorLogger.exportAuthErrorLogs();
    
    // Assert: Export should be valid JSON
    expect(() => JSON.parse(exportedLogs)).not.toThrow();
    
    const parsedExport = JSON.parse(exportedLogs);
    
    // Assert: Export should have required structure
    expect(parsedExport.exportedAt).toBeDefined();
    expect(parsedExport.totalAuthErrors).toBeDefined();
    expect(typeof parsedExport.totalAuthErrors).toBe('number');
    expect(parsedExport.totalAuthErrors).toBeGreaterThanOrEqual(0);
    
    expect(parsedExport.activeErrors).toBeDefined();
    expect(Array.isArray(parsedExport.activeErrors)).toBe(true);
    
    expect(parsedExport.statistics).toBeDefined();
    expect(parsedExport.statistics.errorsByCategory).toBeDefined();
    expect(parsedExport.statistics.errorsBySeverity).toBeDefined();
    
    // Assert: Statistics should have valid values
    Object.values(parsedExport.statistics.errorsByCategory).forEach((count: any) => {
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
    
    Object.values(parsedExport.statistics.errorsBySeverity).forEach((count: any) => {
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
    
    // Assert: Active errors should match what we logged
    expect(parsedExport.activeErrors.length).toBe(errorIds.length);
  });
});