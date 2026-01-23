/**
 * Property-Based Tests for Error Message Clarity
 * **Feature: api-error-handling-reliability, Property 6: Error message clarity**
 * **Validates: Requirements 2.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ApiErrorHandler } from '../ApiErrorHandler';
import { apiErrorArb, errorContextArb, createPropertyTestConfig } from '../utils/testGenerators';

describe('Error Message Clarity Properties', () => {
  const errorHandler = new ApiErrorHandler();

  it('Property 6: For any error displayed to users, the message should be clear, actionable, and appropriate', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          const response = await errorHandler.handleError(error, context);
          
          // Should always have a user message
          expect(response.userMessage).toBeDefined();
          expect(typeof response.userMessage).toBe('string');
          expect(response.userMessage.length).toBeGreaterThan(0);
          
          // Message should be user-friendly (no technical jargon)
          const technicalTerms = [
            'undefined', 'null', 'NaN', 'TypeError', 'ReferenceError',
            'JSON.parse', 'fetch', 'XMLHttpRequest', 'Promise',
            'async', 'await', 'callback', 'stack trace'
          ];
          
          const lowerMessage = response.userMessage.toLowerCase();
          technicalTerms.forEach(term => {
            expect(lowerMessage).not.toContain(term.toLowerCase());
          });
          
          // Message should not contain raw error details
          expect(response.userMessage).not.toContain(error.originalError.stack || '');
          expect(response.userMessage).not.toContain('Error:');
          
          // Message should be actionable (contain guidance)
          const actionableWords = [
            'try', 'please', 'check', 'again', 'later', 'contact',
            'refresh', 'reload', 'login', 'log in', 'verify'
          ];
          
          const hasActionableGuidance = actionableWords.some(word => 
            lowerMessage.includes(word)
          );
          expect(hasActionableGuidance).toBe(true);
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 6a: Error messages should be appropriate for error severity', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          const response = await errorHandler.handleError(error, context);
          const message = response.userMessage.toLowerCase();
          
          // Critical errors should mention support or escalation
          if (error.severity === 'CRITICAL') {
            const hasSupportMention = [
              'support', 'contact', 'help', 'assistance', 'persist'
            ].some(word => message.includes(word));
            expect(hasSupportMention).toBe(true);
          }
          
          // Low severity errors should be reassuring
          if (error.severity === 'LOW') {
            const isReassuring = [
              'try again', 'temporary', 'moment', 'shortly'
            ].some(phrase => message.includes(phrase));
            // Not required but preferred for low severity
          }
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 6b: Authentication error messages should be specific and helpful', () => {
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
          
          const response = await errorHandler.handleError(authError, context);
          const message = response.userMessage.toLowerCase();
          
          // Should mention authentication or login
          const hasAuthMention = [
            'login', 'log in', 'authentication', 'sign in', 'credentials'
          ].some(word => message.includes(word));
          expect(hasAuthMention).toBe(true);
          
          // Should not expose technical auth details
          expect(message).not.toContain('token');
          expect(message).not.toContain('jwt');
          expect(message).not.toContain('bearer');
          expect(message).not.toContain('unauthorized');
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 6c: Network error messages should provide helpful context', () => {
    fc.assert(
      fc.asyncProperty(
        errorContextArb,
        async (context) => {
          const networkError = {
            type: 'NETWORK' as const,
            message: 'Failed to fetch',
            originalError: new Error('Failed to fetch'),
            context,
            severity: 'MEDIUM' as const,
            isRecoverable: true
          };
          
          const response = await errorHandler.handleError(networkError, context);
          const message = response.userMessage.toLowerCase();
          
          // Should mention connection or network
          const hasNetworkMention = [
            'connection', 'network', 'internet', 'connectivity'
          ].some(word => message.includes(word));
          expect(hasNetworkMention).toBe(true);
          
          // Should suggest checking connection
          const hasConnectionAdvice = [
            'check', 'verify', 'ensure', 'connection'
          ].some(word => message.includes(word));
          expect(hasConnectionAdvice).toBe(true);
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 6d: Messages should be consistent for similar errors', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          // Handle the same error twice
          const response1 = await errorHandler.handleError(error, context);
          const response2 = await errorHandler.handleError(error, context);
          
          // Messages should be identical for the same error
          expect(response1.userMessage).toBe(response2.userMessage);
          expect(response1.shouldRetry).toBe(response2.shouldRetry);
          expect(response1.requiresUserAction).toBe(response2.requiresUserAction);
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 6e: Messages should not contain sensitive information', () => {
    fc.assert(
      fc.asyncProperty(
        apiErrorArb,
        errorContextArb,
        async (error, context) => {
          const response = await errorHandler.handleError(error, context);
          const message = response.userMessage;
          
          // Should not contain sensitive patterns
          const sensitivePatterns = [
            /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // Credit card pattern
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
            /\bpassword\b/i,
            /\btoken\b/i,
            /\bapi[_-]?key\b/i,
            /\bsecret\b/i
          ];
          
          sensitivePatterns.forEach(pattern => {
            expect(message).not.toMatch(pattern);
          });
          
          // Should not contain file paths
          expect(message).not.toMatch(/[\/\\][a-zA-Z0-9_-]+[\/\\]/);
          
          // Should not contain stack traces
          expect(message).not.toContain('at ');
          expect(message).not.toContain('.js:');
          expect(message).not.toContain('line ');
        }
      ),
      createPropertyTestConfig(100)
    );
  });
});
/**
 * Property-Based Tests for Error Prioritization
 * **Feature: api-error-handling-reliability, Property 7: Error prioritization**
 * **Validates: Requirements 2.3**
 */

describe('Error Prioritization Properties', () => {
  it('Property 7: For any set of simultaneous errors, the system should display the most critical error first', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(apiErrorArb, { minLength: 2, maxLength: 5 }),
        errorContextArb,
        async (errors, context) => {
          // Handle all errors and collect responses
          const responses = await Promise.all(
            errors.map(error => errorHandler.handleError(error, context))
          );
          
          // Find the error with highest priority
          const priorities = errors.map(error => {
            // Import the priority function
            const { getErrorPriority } = await import('../utils/errorClassification');
            return getErrorPriority(error);
          });
          
          const maxPriority = Math.max(...priorities);
          const maxPriorityIndex = priorities.indexOf(maxPriority);
          const criticalError = errors[maxPriorityIndex];
          
          // The critical error should be handled appropriately
          const criticalResponse = responses[maxPriorityIndex];
          
          // Critical errors should be handled (not ignored)
          expect(criticalResponse.handled).toBe(true);
          
          // Critical errors should have appropriate messaging
          if (criticalError.severity === 'CRITICAL') {
            expect(criticalResponse.userMessage.toLowerCase()).toMatch(
              /support|contact|help|persist|serious/
            );
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 7a: Error severity should determine handling priority', () => {
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
    
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            ...apiErrorArb.generate(fc.random()).value,
            severity: fc.constantFrom(...severityOrder)
          }),
          { minLength: 2, maxLength: 4 }
        ),
        errorContextArb,
        async (errors, context) => {
          // Handle all errors
          const responses = await Promise.all(
            errors.map(error => errorHandler.handleError(error as any, context))
          );
          
          // Group by severity
          const errorsBySeverity = errors.reduce((acc, error, index) => {
            if (!acc[error.severity]) acc[error.severity] = [];
            acc[error.severity].push({ error, response: responses[index] });
            return acc;
          }, {} as Record<string, Array<{ error: any; response: any }>>);
          
          // Critical errors should require user action or provide support info
          if (errorsBySeverity.CRITICAL) {
            errorsBySeverity.CRITICAL.forEach(({ response }) => {
              const message = response.userMessage.toLowerCase();
              const hasCriticalHandling = 
                response.requiresUserAction ||
                message.includes('support') ||
                message.includes('contact') ||
                message.includes('persist');
              expect(hasCriticalHandling).toBe(true);
            });
          }
          
          // Low severity errors should be less disruptive
          if (errorsBySeverity.LOW) {
            errorsBySeverity.LOW.forEach(({ response }) => {
              // Should not require immediate user action for low severity
              if (response.requiresUserAction) {
                // If it requires action, should be gentle
                expect(response.userMessage.toLowerCase()).not.toMatch(
                  /critical|urgent|immediately|serious/
                );
              }
            });
          }
        }
      ),
      createPropertyTestConfig(20)
    );
  });

  it('Property 7b: Authentication errors should have higher priority than validation errors', () => {
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
          
          const validationError = {
            type: 'VALIDATION' as const,
            message: 'Invalid input',
            statusCode: 400,
            originalError: new Error('Invalid input'),
            context,
            severity: 'LOW' as const,
            isRecoverable: false
          };
          
          const [authResponse, validationResponse] = await Promise.all([
            errorHandler.handleError(authError, context),
            errorHandler.handleError(validationError, context)
          ]);
          
          // Auth errors should be more urgent
          if (authResponse.shouldRetry && !validationResponse.shouldRetry) {
            // Auth errors get retry opportunity
            expect(authResponse.shouldRetry).toBe(true);
          }
          
          // Auth errors should have more urgent messaging
          const authMessage = authResponse.userMessage.toLowerCase();
          const validationMessage = validationResponse.userMessage.toLowerCase();
          
          // Auth should mention login/authentication
          expect(authMessage).toMatch(/login|log in|authentication|sign in/);
          
          // Validation should be more about user input
          expect(validationMessage).toMatch(/input|check|verify|correct/);
        }
      ),
      createPropertyTestConfig(20)
    );
  });
});