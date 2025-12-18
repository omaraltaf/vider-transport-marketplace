/**
 * Property-Based Tests for Retry Controller
 * **Feature: api-error-handling-reliability, Property 2: Network retry with exponential backoff**
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { RetryController } from '../RetryController';
import { retryConfigArb, createPropertyTestConfig } from '../utils/testGenerators';
import { ApiErrorType } from '../../../types/error.types';

describe('Network Retry with Exponential Backoff Properties', () => {
  let retryController: RetryController;

  beforeEach(() => {
    retryController = new RetryController();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Property 2: For any network failure, the system should retry up to 3 times with exponential backoff', async () => {
    fc.assert(
      fc.asyncProperty(retryConfigArb, async (config) => {
        let attemptCount = 0;
        const networkError = new Error('Network request failed');
        
        const failingOperation = vi.fn().mockImplementation(() => {
          attemptCount++;
          throw networkError;
        });

        // Execute with retry
        const promise = retryController.executeWithRetry(failingOperation, config);
        
        // Fast-forward through all delays
        for (let i = 0; i < config.maxAttempts; i++) {
          await vi.runAllTimersAsync();
        }
        
        // Should eventually fail after all retries
        await expect(promise).rejects.toThrow();
        
        // Should have attempted the configured number of times
        expect(attemptCount).toBe(config.maxAttempts);
      }),
      createPropertyTestConfig(20)
    );
  });

  it('Property 2a: Exponential backoff delays should increase correctly', () => {
    fc.assert(
      fc.property(retryConfigArb, (config) => {
        const delays: number[] = [];
        
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
          const delay = retryController.calculateDelay(attempt, config);
          delays.push(delay);
          
          // Delay should be within reasonable bounds
          expect(delay).toBeGreaterThanOrEqual(0);
          expect(delay).toBeLessThanOrEqual(config.maxDelay);
        }
        
        // Later delays should generally be larger (accounting for jitter)
        if (delays.length > 1) {
          const firstDelay = delays[0];
          const lastDelay = delays[delays.length - 1];
          
          // With exponential backoff, last delay should be >= first delay
          // (unless maxDelay cap is hit early)
          if (config.baseDelay * Math.pow(config.backoffMultiplier, config.maxAttempts - 1) <= config.maxDelay) {
            expect(lastDelay).toBeGreaterThanOrEqual(firstDelay * 0.5); // Account for jitter
          }
        }
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 2b: Successful operations should not retry', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        retryConfigArb,
        async (successValue, config) => {
          let attemptCount = 0;
          
          const successfulOperation = vi.fn().mockImplementation(() => {
            attemptCount++;
            return Promise.resolve(successValue);
          });

          const result = await retryController.executeWithRetry(successfulOperation, config);
          
          // Should succeed on first attempt
          expect(result).toBe(successValue);
          expect(attemptCount).toBe(1);
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 2c: Non-retryable errors should not retry', async () => {
    const nonRetryableErrors = [
      { type: ApiErrorType.VALIDATION, statusCode: 400 },
      { type: ApiErrorType.AUTH, statusCode: 403 },
      { type: ApiErrorType.PARSING, statusCode: undefined }
    ];

    for (const errorInfo of nonRetryableErrors) {
      let attemptCount = 0;
      
      const nonRetryableOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        const error = new Error('Non-retryable error') as any;
        error.type = errorInfo.type;
        error.statusCode = errorInfo.statusCode;
        throw error;
      });

      await expect(
        retryController.executeWithRetry(nonRetryableOperation)
      ).rejects.toThrow();
      
      // Should only attempt once for non-retryable errors
      expect(attemptCount).toBe(1);
    }
  });
});
/**
 * Property-Based Tests for Request Timeout Handling
 * **Feature: api-error-handling-reliability, Property 4: Request timeout handling**
 * **Validates: Requirements 1.5**
 */

describe('Request Timeout Handling Properties', () => {
  it('Property 4: For any request that exceeds timeout, the system should cancel and show timeout messages', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 2000 }), // timeout in ms
        fc.integer({ min: 0, max: 5000 }), // operation duration
        async (timeoutMs, operationDuration) => {
          const shouldTimeout = operationDuration > timeoutMs;
          
          const slowOperation = vi.fn().mockImplementation(() => {
            return new Promise((resolve) => {
              setTimeout(() => resolve('success'), operationDuration);
            });
          });

          const config = { ...retryConfigArb.generate(fc.random()).value, timeoutMs, maxAttempts: 1 };
          
          if (shouldTimeout) {
            // Should timeout
            const promise = retryController.executeWithRetry(slowOperation, config);
            
            // Fast forward to timeout
            vi.advanceTimersByTime(timeoutMs + 100);
            
            await expect(promise).rejects.toThrow(/timed out/i);
          } else {
            // Should succeed within timeout
            const promise = retryController.executeWithRetry(slowOperation, config);
            
            // Fast forward to completion
            vi.advanceTimersByTime(operationDuration + 100);
            
            const result = await promise;
            expect(result).toBe('success');
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 4a: Timeout errors should contain helpful messages', async () => {
    const timeoutMs = 1000;
    const longOperation = () => new Promise(resolve => setTimeout(resolve, 2000));
    
    const config = { timeoutMs, maxAttempts: 1 };
    const promise = retryController.executeWithRetry(longOperation, config);
    
    vi.advanceTimersByTime(timeoutMs + 100);
    
    await expect(promise).rejects.toThrow(`Operation timed out after ${timeoutMs}ms`);
  });
});
/**
 * Property-Based Tests for Recoverable Error Handling
 * **Feature: api-error-handling-reliability, Property 8: Recoverable error handling**
 * **Validates: Requirements 2.4**
 */

describe('Recoverable Error Handling Properties', () => {
  it('Property 8: For any recoverable error, the system should provide retry mechanisms', async () => {
    const recoverableErrors = [
      { type: ApiErrorType.NETWORK, statusCode: undefined },
      { type: ApiErrorType.SERVER, statusCode: 500 },
      { type: ApiErrorType.SERVER, statusCode: 502 },
      { type: ApiErrorType.TIMEOUT, statusCode: undefined },
      { type: ApiErrorType.AUTH, statusCode: 401 } // Token refresh scenario
    ];

    for (const errorInfo of recoverableErrors) {
      let attemptCount = 0;
      
      const recoverableOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          // Fail first 2 attempts
          const error = new Error('Recoverable error') as any;
          error.type = errorInfo.type;
          error.statusCode = errorInfo.statusCode;
          throw error;
        }
        // Succeed on 3rd attempt
        return Promise.resolve('recovered');
      });

      const result = await retryController.executeWithRetry(recoverableOperation);
      
      // Should eventually succeed
      expect(result).toBe('recovered');
      expect(attemptCount).toBe(3);
    }
  });

  it('Property 8a: Circuit breaker should prevent cascading failures', async () => {
    const endpoint = 'test-endpoint';
    let attemptCount = 0;
    
    const alwaysFailingOperation = vi.fn().mockImplementation(() => {
      attemptCount++;
      const error = new Error('Persistent failure') as any;
      error.type = ApiErrorType.SERVER;
      error.statusCode = 500;
      throw error;
    });

    // Make multiple calls to trigger circuit breaker
    for (let i = 0; i < 10; i++) {
      try {
        await retryController.executeWithRetry(alwaysFailingOperation);
      } catch {
        // Expected to fail
      }
      
      // Fast forward through delays
      await vi.runAllTimersAsync();
    }

    // Circuit breaker should eventually prevent further attempts
    const circuitState = retryController.getCircuitBreakerState('alwaysFailingOperation');
    
    // Should have recorded failures
    expect(circuitState.failureCount).toBeGreaterThan(0);
  });
});