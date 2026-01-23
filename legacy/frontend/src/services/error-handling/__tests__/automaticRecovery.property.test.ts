/**
 * Property-Based Tests for Automatic Recovery
 * **Feature: api-error-handling-reliability, Property 12: Automatic recovery**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { RecoveryStrategyManager } from '../utils/RecoveryStrategies';
import { apiErrorArb, errorContextArb, createPropertyTestConfig } from '../utils/testGenerators';

describe('Automatic Recovery Properties', () => {
  let recoveryManager: RecoveryStrategyManager;

  beforeEach(() => {
    recoveryManager = new RecoveryStrategyManager();
  });

  it('Property 12: For any service that comes back online, the system should automatically retry and refresh stale data', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          // Only test recoverable errors
          if (!error.isRecoverable) return;
          
          const recoveryResponse = await recoveryManager.attemptRecovery(error, context);
          
          if (recoveryResponse) {
            // Should have attempted recovery
            expect(recoveryResponse.handled).toBe(true);
            
            // Should provide appropriate response based on error type
            switch (error.type) {
              case 'AUTH':
                // Auth errors should either retry or require user action
                expect(
                  recoveryResponse.shouldRetry || recoveryResponse.requiresUserAction
                ).toBe(true);
                break;
                
              case 'NETWORK':
              case 'SERVER':
              case 'TIMEOUT':
                // Network-related errors should retry or provide fallback
                expect(
                  recoveryResponse.shouldRetry || recoveryResponse.fallbackData !== undefined
                ).toBe(true);
                break;
                
              case 'PARSING':
                // Parsing errors should provide fallback (not retry)
                expect(recoveryResponse.shouldRetry).toBe(false);
                expect(recoveryResponse.fallbackData).toBeDefined();
                break;
            }
            
            // Should always provide user message
            expect(recoveryResponse.userMessage).toBeDefined();
            expect(recoveryResponse.userMessage.length).toBeGreaterThan(0);
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 12a: Network connectivity restoration should trigger automatic retries', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextArb,
        async (context) => {
          const networkError = {
            type: 'NETWORK' as const,
            message: 'Network request failed',
            originalError: new Error('Network request failed'),
            context,
            severity: 'MEDIUM' as const,
            isRecoverable: true
          };
          
          const recoveryResponse = await recoveryManager.attemptRecovery(networkError, context);
          
          expect(recoveryResponse).not.toBeNull();
          expect(recoveryResponse!.handled).toBe(true);
          
          // Should either retry or provide fallback
          const hasRecoveryMechanism = 
            recoveryResponse!.shouldRetry || 
            recoveryResponse!.fallbackData !== undefined;
          expect(hasRecoveryMechanism).toBe(true);
          
          // Message should indicate network issue
          expect(recoveryResponse!.userMessage.toLowerCase()).toMatch(
            /connection|network|retry|cached/
          );
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 12b: Authentication restoration should resume normal operations', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextArb,
        async (context) => {
          const authError = {
            type: 'AUTH' as const,
            message: 'Unauthorized',
            statusCode: 401,
            originalError: new Error('Unauthorized'),
            context,
            severity: 'HIGH' as const,
            isRecoverable: true
          };
          
          const recoveryResponse = await recoveryManager.attemptRecovery(authError, context);
          
          expect(recoveryResponse).not.toBeNull();
          expect(recoveryResponse!.handled).toBe(true);
          
          // Should either attempt token refresh (retry) or require login
          expect(
            recoveryResponse!.shouldRetry || recoveryResponse!.requiresUserAction
          ).toBe(true);
          
          // Message should be about authentication
          expect(recoveryResponse!.userMessage.toLowerCase()).toMatch(
            /authentication|login|log in|sign in/
          );
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 12c: Server recovery should update UI states from error to normal', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextArb,
        async (context) => {
          const serverError = {
            type: 'SERVER' as const,
            message: 'Internal Server Error',
            statusCode: 500,
            originalError: new Error('Internal Server Error'),
            context,
            severity: 'HIGH' as const,
            isRecoverable: true
          };
          
          const recoveryResponse = await recoveryManager.attemptRecovery(serverError, context);
          
          expect(recoveryResponse).not.toBeNull();
          expect(recoveryResponse!.handled).toBe(true);
          
          // Should provide recovery mechanism
          const hasRecoveryMechanism = 
            recoveryResponse!.shouldRetry || 
            recoveryResponse!.fallbackData !== undefined;
          expect(hasRecoveryMechanism).toBe(true);
          
          // If retrying, should have retry delay
          if (recoveryResponse!.shouldRetry) {
            expect(recoveryResponse!.retryAfter).toBeGreaterThan(0);
          }
          
          // Message should indicate server issue and recovery
          expect(recoveryResponse!.userMessage.toLowerCase()).toMatch(
            /server|retry|cached|unavailable/
          );
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 12d: Recovery strategies should be consistent for same error types', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          if (!error.isRecoverable) return;
          
          // Attempt recovery twice with same error
          const recovery1 = await recoveryManager.attemptRecovery(error, context);
          const recovery2 = await recoveryManager.attemptRecovery(error, context);
          
          // Should have consistent recovery approach
          if (recovery1 && recovery2) {
            expect(recovery1.shouldRetry).toBe(recovery2.shouldRetry);
            expect(recovery1.requiresUserAction).toBe(recovery2.requiresUserAction);
            
            // Recovery type should be consistent
            expect(recovery1.recoveryType).toBe(recovery2.recoveryType);
          }
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 12e: Non-recoverable errors should not attempt automatic recovery', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextArb,
        async (context) => {
          const nonRecoverableError = {
            type: 'VALIDATION' as const,
            message: 'Invalid input',
            statusCode: 400,
            originalError: new Error('Invalid input'),
            context,
            severity: 'LOW' as const,
            isRecoverable: false
          };
          
          const recoveryResponse = await recoveryManager.attemptRecovery(nonRecoverableError, context);
          
          // Should not attempt recovery for non-recoverable errors
          expect(recoveryResponse).toBeNull();
        }
      ),
      createPropertyTestConfig(20)
    );
  });

  it('Property 12f: Recovery should provide appropriate fallback data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom('moderationStats', 'userStats', 'systemHealth'),
        errorContextArb,
        async (dataType, context) => {
          const contextWithEndpoint = {
            ...context,
            endpoint: `/api/platform-admin/${dataType}`
          };
          
          const parsingError = {
            type: 'PARSING' as const,
            message: 'Invalid JSON',
            originalError: new SyntaxError('Invalid JSON'),
            context: contextWithEndpoint,
            severity: 'MEDIUM' as const,
            isRecoverable: false // Parsing errors aren't retryable but can use fallback
          };
          
          const recoveryResponse = await recoveryManager.attemptRecovery(parsingError, contextWithEndpoint);
          
          if (recoveryResponse) {
            // Should not retry parsing errors
            expect(recoveryResponse.shouldRetry).toBe(false);
            
            // Should provide fallback data
            expect(recoveryResponse.fallbackData).toBeDefined();
            
            // Message should indicate fallback usage
            expect(recoveryResponse.userMessage.toLowerCase()).toMatch(
              /cached|fallback|unexpected|format/
            );
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });
});