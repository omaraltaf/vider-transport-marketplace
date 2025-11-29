import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { logError, logOperation, createRequestContext } from './logging.utils';
import { logger } from '../config/logger';
import { Request } from 'express';

/**
 * Property-Based Tests for Logging Utilities
 */

vi.mock('../config/logger');

describe('Logging Utils Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: vider-transport-marketplace, Property 38: Error logging completeness
   * Validates: Requirements 24.1
   * 
   * Property: For any error that occurs during request processing, the system must log
   * the error with timestamp, stack trace, request context, and user information.
   */
  describe('Property 38: Error logging completeness', () => {
    it('should log all required error fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // error message
          fc.string({ minLength: 10, maxLength: 500 }), // stack trace
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // userId
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // companyId
          async (errorMessage, stackTrace, userId, companyId) => {
            // Clear mocks for this iteration
            vi.clearAllMocks();

            // Create error with stack trace
            const error = new Error(errorMessage);
            error.stack = stackTrace;

            // Create mock request
            const mockRequest = {
              method: 'POST',
              path: '/api/test',
              query: { param: 'value' },
              ip: '127.0.0.1',
              get: vi.fn().mockReturnValue('Mozilla/5.0'),
              body: { data: 'test' },
              params: { id: '123' },
            } as unknown as Request;

            // Log the error
            logError({
              error,
              request: mockRequest,
              userId,
              companyId,
              additionalContext: { custom: 'data' },
            });

            // Verify logger.error was called
            expect(logger.error).toHaveBeenCalledTimes(1);

            // Get the logged data
            const logCall = vi.mocked(logger.error).mock.calls[0];
            expect(logCall[0]).toBe('Error occurred');
            const logData = logCall[1];

            // Verify all required fields are present
            expect(logData).toHaveProperty('message', errorMessage);
            expect(logData).toHaveProperty('stack', stackTrace);
            expect(logData).toHaveProperty('errorName', 'Error');
            expect(logData).toHaveProperty('timestamp');

            // Verify timestamp is valid ISO string
            expect(() => new Date(logData.timestamp)).not.toThrow();
            expect(new Date(logData.timestamp).toISOString()).toBe(logData.timestamp);

            // Verify request context is included
            expect(logData).toHaveProperty('request');
            expect(logData.request).toHaveProperty('method', 'POST');
            expect(logData.request).toHaveProperty('path', '/api/test');
            expect(logData.request).toHaveProperty('query', { param: 'value' });
            expect(logData.request).toHaveProperty('ip', '127.0.0.1');
            expect(logData.request).toHaveProperty('userAgent', 'Mozilla/5.0');

            // Verify user context if provided
            if (userId) {
              expect(logData).toHaveProperty('userId', userId);
            }

            if (companyId) {
              expect(logData).toHaveProperty('companyId', companyId);
            }

            // Verify additional context
            expect(logData).toHaveProperty('additionalContext', { custom: 'data' });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log errors without request context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // error message
          async (errorMessage) => {
            // Clear mocks for this iteration
            vi.clearAllMocks();

            const error = new Error(errorMessage);

            // Log error without request
            logError({ error });

            // Verify logger.error was called
            expect(logger.error).toHaveBeenCalledTimes(1);

            const logCall = vi.mocked(logger.error).mock.calls[0];
            const logData = logCall[1];

            // Should still have core error fields
            expect(logData).toHaveProperty('message', errorMessage);
            expect(logData).toHaveProperty('stack');
            expect(logData).toHaveProperty('errorName', 'Error');
            expect(logData).toHaveProperty('timestamp');

            // Should not have request field
            expect(logData).not.toHaveProperty('request');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include stack trace for all errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // error message
          async (errorMessage) => {
            const error = new Error(errorMessage);

            logError({ error });

            const logCall = vi.mocked(logger.error).mock.calls[0];
            const logData = logCall[1];

            // Stack trace must be present
            expect(logData).toHaveProperty('stack');
            expect(typeof logData.stack).toBe('string');
            expect(logData.stack.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log operation context for critical actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }), // operation name
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // userId
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // companyId
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // entityType
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }), // entityId
          async (operation, userId, companyId, entityType, entityId) => {
            // Clear mocks for this iteration
            vi.clearAllMocks();

            const changes = { field: 'value' };
            const metadata = { reason: 'test' };

            logOperation({
              operation,
              userId,
              companyId,
              entityType,
              entityId,
              changes,
              metadata,
            });

            // Verify logger.info was called
            expect(logger.info).toHaveBeenCalledTimes(1);

            const logCall = vi.mocked(logger.info).mock.calls[0];
            expect(logCall[0]).toBe('Critical operation performed');
            const logData = logCall[1];

            // Verify required fields
            expect(logData).toHaveProperty('operation', operation);
            expect(logData).toHaveProperty('timestamp');

            // Verify timestamp is valid
            expect(() => new Date(logData.timestamp)).not.toThrow();

            // Verify optional fields if provided
            if (userId) {
              expect(logData).toHaveProperty('userId', userId);
            }

            if (companyId) {
              expect(logData).toHaveProperty('companyId', companyId);
            }

            if (entityType) {
              expect(logData).toHaveProperty('entityType', entityType);
            }

            if (entityId) {
              expect(logData).toHaveProperty('entityId', entityId);
            }

            expect(logData).toHaveProperty('changes', changes);
            expect(logData).toHaveProperty('metadata', metadata);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create complete request context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), // HTTP method
          fc.string({ minLength: 1, maxLength: 100 }), // path
          fc.string({ minLength: 7, maxLength: 15 }), // IP address
          fc.string({ minLength: 10, maxLength: 100 }), // user agent
          async (method, path, ip, userAgent) => {
            const mockRequest = {
              method,
              path,
              query: { test: 'value' },
              ip,
              get: vi.fn().mockReturnValue(userAgent),
            } as unknown as Request;

            const context = createRequestContext(mockRequest);

            // Verify all fields are present
            expect(context).toHaveProperty('method', method);
            expect(context).toHaveProperty('path', path);
            expect(context).toHaveProperty('query', { test: 'value' });
            expect(context).toHaveProperty('ip', ip);
            expect(context).toHaveProperty('userAgent', userAgent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle errors with different error types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }), // error message
          fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'SyntaxError'), // error type
          async (errorMessage, errorType) => {
            // Clear mocks for this iteration
            vi.clearAllMocks();

            let error: Error;
            switch (errorType) {
              case 'TypeError':
                error = new TypeError(errorMessage);
                break;
              case 'ReferenceError':
                error = new ReferenceError(errorMessage);
                break;
              case 'SyntaxError':
                error = new SyntaxError(errorMessage);
                break;
              default:
                error = new Error(errorMessage);
            }

            logError({ error });

            const logCall = vi.mocked(logger.error).mock.calls[0];
            const logData = logCall[1];

            // Should log correct error type
            expect(logData).toHaveProperty('errorName', errorType);
            expect(logData).toHaveProperty('message', errorMessage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
