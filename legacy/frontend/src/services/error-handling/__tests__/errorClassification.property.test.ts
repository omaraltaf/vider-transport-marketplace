/**
 * Property-Based Tests for Error Classification
 * **Feature: api-error-handling-reliability, Property 5: Comprehensive error logging**
 * **Validates: Requirements 2.1, 4.5, 7.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  errorContextArb,
  httpStatusCodeArb,
  networkErrorArb,
  authErrorArb,
  parsingErrorArb,
  createPropertyTestConfig 
} from '../utils/testGenerators';
import { 
  classifyError, 
  shouldTriggerAlert, 
  getErrorPriority, 
  areErrorsSimilar 
} from '../utils/errorClassification';
import { ApiErrorType, ErrorSeverity } from '../../../types/error.types';

// Mock logging service (to be implemented)
const mockLoggingService = {
  logs: [] as any[],
  logError: function(error: any, context: any) {
    this.logs.push({
      timestamp: new Date(),
      level: 'ERROR',
      error,
      context,
      id: Math.random().toString(36)
    });
  },
  clear: function() {
    this.logs = [];
  }
};

describe('Error Classification Properties', () => {
  beforeEach(() => {
    mockLoggingService.clear();
  });

  it('Property 5: For any error that occurs, complete context information should be logged', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          // Clear logs before each test run
          mockLoggingService.clear();
          
          // Classify the error
          const classified = classifyError(error, context, statusCode);
          
          // Log the error
          mockLoggingService.logError(classified, context);
          
          // Verify logging occurred
          expect(mockLoggingService.logs).toHaveLength(1);
          
          const logEntry = mockLoggingService.logs[0];
          
          // Should contain complete context information
          expect(logEntry.error).toBeDefined();
          expect(logEntry.context).toBeDefined();
          expect(logEntry.timestamp).toBeDefined();
          expect(logEntry.id).toBeDefined();
          
          // Context should contain all required fields
          expect(logEntry.context.endpoint).toBeDefined();
          expect(logEntry.context.method).toBeDefined();
          expect(logEntry.context.component).toBeDefined();
          expect(logEntry.context.timestamp).toBeDefined();
          expect(typeof logEntry.context.retryCount).toBe('number');
          
          // Error should contain classification information
          expect(logEntry.error.type).toBeDefined();
          expect(logEntry.error.severity).toBeDefined();
          expect(logEntry.error.message).toBeDefined();
          expect(typeof logEntry.error.isRecoverable).toBe('boolean');
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 5a: Error classification should be consistent for the same error types', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          // Classify the same error multiple times
          const classified1 = classifyError(error, context, statusCode);
          const classified2 = classifyError(error, context, statusCode);
          
          // Should produce consistent results
          expect(classified1.type).toBe(classified2.type);
          expect(classified1.severity).toBe(classified2.severity);
          expect(classified1.isRecoverable).toBe(classified2.isRecoverable);
          expect(classified1.message).toBe(classified2.message);
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 5b: Network errors should be classified correctly', () => {
    fc.assert(
      fc.property(
        networkErrorArb,
        errorContextArb,
        (error, context) => {
          const classified = classifyError(error, context);
          
          // Should be classified as network error
          expect(classified.type).toBe(ApiErrorType.NETWORK);
          
          // Should be recoverable
          expect(classified.isRecoverable).toBe(true);
          
          // Should have appropriate severity
          expect([ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]).toContain(classified.severity);
          
          // Should preserve original error
          expect(classified.originalError).toBe(error);
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 5c: Authentication errors should be classified correctly', () => {
    fc.assert(
      fc.property(
        authErrorArb,
        errorContextArb,
        fc.constantFrom(401, 403),
        (error, context, statusCode) => {
          const classified = classifyError(error, context, statusCode);
          
          // Should be classified as auth error
          expect(classified.type).toBe(ApiErrorType.AUTH);
          
          // Should have high severity
          expect(classified.severity).toBe(ErrorSeverity.HIGH);
          
          // 401 should be recoverable (token refresh), 403 should not
          if (statusCode === 401) {
            expect(classified.isRecoverable).toBe(true);
          } else {
            expect(classified.isRecoverable).toBe(false);
          }
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 5d: Parsing errors should be classified correctly', () => {
    fc.assert(
      fc.property(
        parsingErrorArb,
        errorContextArb,
        (error, context) => {
          const classified = classifyError(error, context);
          
          // Should be classified as parsing error
          expect(classified.type).toBe(ApiErrorType.PARSING);
          
          // Should not be recoverable (indicates bug)
          expect(classified.isRecoverable).toBe(false);
          
          // Should have medium severity
          expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 5e: Error priority should be consistent and logical', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          const classified = classifyError(error, context, statusCode);
          const priority = getErrorPriority(classified);
          
          // Priority should be a positive number
          expect(priority).toBeGreaterThan(0);
          expect(typeof priority).toBe('number');
          
          // Critical errors should have higher priority than high severity
          if (classified.severity === ErrorSeverity.CRITICAL) {
            const highSeverityError = { ...classified, severity: ErrorSeverity.HIGH };
            const highPriority = getErrorPriority(highSeverityError);
            expect(priority).toBeGreaterThan(highPriority);
          }
          
          // High severity should have higher priority than medium
          if (classified.severity === ErrorSeverity.HIGH) {
            const mediumSeverityError = { ...classified, severity: ErrorSeverity.MEDIUM };
            const mediumPriority = getErrorPriority(mediumSeverityError);
            expect(priority).toBeGreaterThan(mediumPriority);
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 5f: Alert triggering should be based on severity and retry count', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          const classified = classifyError(error, context, statusCode);
          const shouldAlert = shouldTriggerAlert(classified);
          
          // Critical errors should always trigger alerts
          if (classified.severity === ErrorSeverity.CRITICAL) {
            expect(shouldAlert).toBe(true);
          }
          
          // High severity with multiple retries should trigger alerts
          if (classified.severity === ErrorSeverity.HIGH && context.retryCount > 2) {
            expect(shouldAlert).toBe(true);
          }
          
          // Low severity errors should not trigger alerts
          if (classified.severity === ErrorSeverity.LOW) {
            expect(shouldAlert).toBe(false);
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 5g: Similar errors should be detected correctly', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          const classified1 = classifyError(error, context, statusCode);
          const classified2 = classifyError(error, context, statusCode);
          
          // Same errors should be considered similar
          expect(areErrorsSimilar(classified1, classified2)).toBe(true);
          
          // Different endpoints should not be similar
          const differentContext = { ...context, endpoint: '/different' };
          const classified3 = classifyError(error, differentContext, statusCode);
          expect(areErrorsSimilar(classified1, classified3)).toBe(false);
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 5h: Error metadata should contain debugging information', () => {
    fc.assert(
      fc.property(
        fc.oneof(networkErrorArb, authErrorArb, parsingErrorArb),
        errorContextArb,
        fc.option(httpStatusCodeArb),
        (error, context, statusCode) => {
          const classified = classifyError(error, context, statusCode);
          
          // Should have metadata
          expect(classified.metadata).toBeDefined();
          expect(typeof classified.metadata).toBe('object');
          
          // Should contain error name
          expect(classified.metadata?.name).toBe(error.name);
          
          // Should contain stack trace if available
          if (error.stack) {
            expect(classified.metadata?.stack).toBeDefined();
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });
});