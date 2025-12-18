/**
 * Property Tests for Error Monitoring and Escalation
 * Tests error analytics, pattern detection, and escalation logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ErrorMonitor } from '../ErrorMonitor';
import { ApiErrorType, ErrorSeverity } from '../../../types/error.types';
import type { ApiError, ErrorContext, EscalationRule } from '../../../types/error.types';

describe('Error Monitoring and Escalation Properties', () => {
  let errorMonitor: ErrorMonitor;

  beforeEach(() => {
    errorMonitor = new ErrorMonitor();
    // Clear any existing escalation rules for clean testing
    (errorMonitor as any).escalationRules = [];
    (errorMonitor as any).escalationEvents = [];
    (errorMonitor as any).errorHistory = [];
  });

  /**
   * Property 13: Error monitoring and escalation
   * Validates: Requirements 7.2, 7.3
   */
  it('should properly track error metrics and trigger escalations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom(...Object.values(ApiErrorType)),
            severity: fc.constantFrom(...Object.values(ErrorSeverity)),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            endpoint: fc.webUrl(),
            component: fc.string({ minLength: 1, maxLength: 20 }),
            timestamp: fc.date({ min: new Date(Date.now() - 3600000), max: new Date() })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (errorData) => {
          const initialMetrics = errorMonitor.getMetrics();
          const initialEscalations = errorMonitor.getEscalationEvents().length;

          // Record all errors
          errorData.forEach(data => {
            const error: ApiError = {
              type: data.type,
              severity: data.severity,
              message: data.message,
              originalError: new Error(data.message),
              context: {
                endpoint: data.endpoint,
                method: 'GET',
                component: data.component,
                timestamp: data.timestamp,
                retryCount: 0
              },
              statusCode: 500,
              isRecoverable: true,
              userMessage: data.message
            };

            const context: ErrorContext = {
              endpoint: data.endpoint,
              method: 'GET',
              component: data.component,
              timestamp: data.timestamp,
              retryCount: 0
            };

            errorMonitor.recordError(error, context);
          });

          const finalMetrics = errorMonitor.getMetrics();
          const finalEscalations = errorMonitor.getEscalationEvents().length;

          // Verify metrics are updated
          expect(finalMetrics.totalErrors).toBe(initialMetrics.totalErrors + errorData.length);
          expect(finalMetrics.lastUpdated).toBeInstanceOf(Date);

          // Verify error type counts
          const typeCounts = errorData.reduce((acc, error) => {
            acc[error.type] = (acc[error.type] || 0) + 1;
            return acc;
          }, {} as Record<ApiErrorType, number>);

          Object.entries(typeCounts).forEach(([type, count]) => {
            expect(finalMetrics.errorsByType[type as ApiErrorType])
              .toBe(initialMetrics.errorsByType[type as ApiErrorType] + count);
          });

          // Verify severity counts
          const severityCounts = errorData.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
          }, {} as Record<ErrorSeverity, number>);

          Object.entries(severityCounts).forEach(([severity, count]) => {
            expect(finalMetrics.errorsBySeverity[severity as ErrorSeverity])
              .toBe(initialMetrics.errorsBySeverity[severity as ErrorSeverity] + count);
          });

          // Since we cleared escalation rules, no escalations should be triggered
          expect(finalEscalations).toBe(initialEscalations);

          // Verify endpoint tracking
          const endpointCounts = errorData.reduce((acc, error) => {
            acc[error.endpoint] = (acc[error.endpoint] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          Object.entries(endpointCounts).forEach(([endpoint, count]) => {
            expect(finalMetrics.errorsByEndpoint[endpoint])
              .toBe((initialMetrics.errorsByEndpoint[endpoint] || 0) + count);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: User context collection
   * Validates: Requirements 7.4
   */
  it('should collect comprehensive user context', () => {
    fc.assert(
      fc.property(
        fc.record({
          userAgent: fc.string({ minLength: 10, maxLength: 200 }),
          url: fc.webUrl(),
          viewport: fc.record({
            width: fc.integer({ min: 320, max: 3840 }),
            height: fc.integer({ min: 240, max: 2160 })
          })
        }),
        (mockContext) => {
          // Mock browser environment
          const originalNavigator = global.navigator;
          const originalWindow = global.window;

          global.navigator = {
            userAgent: mockContext.userAgent
          } as any;

          global.window = {
            location: { href: mockContext.url },
            innerWidth: mockContext.viewport.width,
            innerHeight: mockContext.viewport.height
          } as any;

          const context = errorMonitor.collectUserContext();

          // Verify required context fields
          expect(context).toHaveProperty('userAgent');
          expect(context).toHaveProperty('url');
          expect(context).toHaveProperty('timestamp');
          expect(context).toHaveProperty('viewport');

          // Verify context values
          expect(context.userAgent).toBe(mockContext.userAgent);
          expect(context.url).toBe(mockContext.url);
          expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          
          if (context.viewport) {
            expect((context.viewport as any).width).toBe(mockContext.viewport.width);
            expect((context.viewport as any).height).toBe(mockContext.viewport.height);
          }

          // Restore original globals
          global.navigator = originalNavigator;
          global.window = originalWindow;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect error patterns correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.webUrl(),
          errorCount: fc.integer({ min: 5, max: 20 }),
          timeSpread: fc.integer({ min: 1, max: 30 }) // minutes
        }),
        (testData) => {
          const now = new Date();
          
          // Create multiple errors for the same endpoint
          for (let i = 0; i < testData.errorCount; i++) {
            const timestamp = new Date(now.getTime() - (testData.timeSpread * 60 * 1000 * Math.random()));
            
            const error: ApiError = {
              type: ApiErrorType.SERVER,
              severity: ErrorSeverity.MEDIUM,
              message: `Server error ${i}`,
              originalError: new Error(`Server error ${i}`),
              context: {
                endpoint: testData.endpoint,
                method: 'GET',
                component: 'TestComponent',
                timestamp,
                retryCount: 0
              },
              statusCode: 500,
              isRecoverable: true,
              userMessage: `Server error ${i}`
            };

            const context: ErrorContext = {
              endpoint: testData.endpoint,
              method: 'GET',
              component: 'TestComponent',
              timestamp,
              retryCount: 0
            };

            errorMonitor.recordError(error, context);
          }

          const patterns = errorMonitor.detectErrorPatterns();
          
          // Should detect repeated endpoint errors pattern
          const endpointPattern = patterns.find(p => 
            p.type === 'repeated_endpoint_errors' && 
            p.affectedEndpoints.includes(testData.endpoint)
          );

          if (testData.errorCount >= 5) {
            expect(endpointPattern).toBeDefined();
            expect(endpointPattern!.frequency).toBe(testData.errorCount);
            expect(endpointPattern!.affectedEndpoints).toContain(testData.endpoint);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle escalation lifecycle correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          assignee: fc.string({ minLength: 3, maxLength: 20 }),
          criticalErrorCount: fc.integer({ min: 1, max: 5 })
        }),
        (testData) => {
          // Add a test escalation rule for critical errors
          const testRule: EscalationRule = {
            id: 'test_critical_rule',
            name: 'Test Critical Error Rule',
            condition: {
              severity: ErrorSeverity.CRITICAL,
              count: 1,
              timeWindowMinutes: 5
            },
            action: {
              type: 'immediate',
              notificationChannels: ['email'],
              assignTo: 'test-team'
            }
          };
          
          errorMonitor.addEscalationRule(testRule);
          const initialEscalations = errorMonitor.getEscalationEvents().length;

          // Create critical errors to trigger escalation
          for (let i = 0; i < testData.criticalErrorCount; i++) {
            const error: ApiError = {
              type: ApiErrorType.SERVER,
              severity: ErrorSeverity.CRITICAL,
              message: `Critical error ${i}`,
              originalError: new Error(`Critical error ${i}`),
              context: {
                endpoint: '/api/critical',
                method: 'POST',
                component: 'CriticalComponent',
                timestamp: new Date(),
                retryCount: 0
              },
              statusCode: 500,
              isRecoverable: false,
              userMessage: `Critical error ${i}`
            };

            const context: ErrorContext = {
              endpoint: '/api/critical',
              method: 'POST',
              component: 'CriticalComponent',
              timestamp: new Date(),
              retryCount: 0
            };

            errorMonitor.recordError(error, context);
          }

          const escalations = errorMonitor.getEscalationEvents();
          expect(escalations.length).toBeGreaterThan(initialEscalations);

          // Test escalation acknowledgment
          const latestEscalation = escalations[escalations.length - 1];
          expect(latestEscalation.status).toBe('pending');

          const acknowledged = errorMonitor.acknowledgeEscalation(latestEscalation.id, testData.assignee);
          expect(acknowledged).toBe(true);
          expect(latestEscalation.status).toBe('acknowledged');
          expect(latestEscalation.assignedTo).toBe(testData.assignee);

          // Test escalation resolution
          const resolved = errorMonitor.resolveEscalation(latestEscalation.id);
          expect(resolved).toBe(true);
          expect(latestEscalation.status).toBe('resolved');
          expect(latestEscalation.resolvedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should generate accurate error trends', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            timestamp: fc.date({ min: new Date(Date.now() - 3600000), max: new Date() }),
            severity: fc.constantFrom(...Object.values(ErrorSeverity))
          }),
          { minLength: 5, maxLength: 30 }
        ),
        (errorData) => {
          // Record errors with specific timestamps
          errorData.forEach((data, index) => {
            const error: ApiError = {
              type: ApiErrorType.NETWORK,
              severity: data.severity,
              message: `Network error ${index}`,
              originalError: new Error(`Network error ${index}`),
              context: {
                endpoint: '/api/test',
                method: 'GET',
                component: 'TestComponent',
                timestamp: data.timestamp,
                retryCount: 0
              },
              statusCode: 500,
              isRecoverable: true,
              userMessage: `Network error ${index}`
            };

            const context: ErrorContext = {
              endpoint: '/api/test',
              method: 'GET',
              component: 'TestComponent',
              timestamp: data.timestamp,
              retryCount: 0
            };

            errorMonitor.recordError(error, context);
          });

          const trends = errorMonitor.getErrorTrends(60); // 1 hour window
          
          // Verify trends structure
          expect(Array.isArray(trends)).toBe(true);
          
          trends.forEach(trend => {
            expect(trend).toHaveProperty('timeWindow');
            expect(trend).toHaveProperty('errorCount');
            expect(trend).toHaveProperty('errorRate');
            expect(trend).toHaveProperty('trend');
            expect(trend).toHaveProperty('severity');
            
            expect(typeof trend.errorCount).toBe('number');
            expect(trend.errorCount).toBeGreaterThanOrEqual(0);
            expect(typeof trend.errorRate).toBe('number');
            expect(trend.errorRate).toBeGreaterThanOrEqual(0);
            expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
            expect(Object.values(ErrorSeverity)).toContain(trend.severity);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle custom escalation rules', () => {
    fc.assert(
      fc.property(
        fc.record({
          ruleName: fc.string({ minLength: 5, maxLength: 50 }),
          errorType: fc.constantFrom(...Object.values(ApiErrorType)),
          threshold: fc.integer({ min: 2, max: 10 }),
          timeWindow: fc.integer({ min: 1, max: 30 })
        }),
        (ruleData) => {
          const customRule: EscalationRule = {
            id: `custom_${Date.now()}`,
            name: ruleData.ruleName,
            condition: {
              errorType: ruleData.errorType,
              count: ruleData.threshold,
              timeWindowMinutes: ruleData.timeWindow
            },
            action: {
              type: 'alert',
              notificationChannels: ['email'],
              assignTo: 'test-team'
            }
          };

          errorMonitor.addEscalationRule(customRule);
          const initialEscalations = errorMonitor.getEscalationEvents().length;

          // Create errors that should trigger the custom rule
          for (let i = 0; i < ruleData.threshold; i++) {
            const error: ApiError = {
              type: ruleData.errorType,
              severity: ErrorSeverity.MEDIUM,
              message: `Custom rule test error ${i}`,
              originalError: new Error(`Custom rule test error ${i}`),
              context: {
                endpoint: '/api/custom-test',
                method: 'GET',
                component: 'CustomTestComponent',
                timestamp: new Date(),
                retryCount: 0
              },
              statusCode: 400,
              isRecoverable: true,
              userMessage: `Custom rule test error ${i}`
            };

            const context: ErrorContext = {
              endpoint: '/api/custom-test',
              method: 'GET',
              component: 'CustomTestComponent',
              timestamp: new Date(),
              retryCount: 0
            };

            errorMonitor.recordError(error, context);
          }

          const finalEscalations = errorMonitor.getEscalationEvents();
          
          // Should have triggered escalation based on custom rule
          expect(finalEscalations.length).toBeGreaterThan(initialEscalations);
          
          const triggeredEscalation = finalEscalations.find(e => 
            e.rule.name === ruleData.ruleName
          );
          
          expect(triggeredEscalation).toBeDefined();
          expect(triggeredEscalation!.rule.id).toBe(customRule.id);
        }
      ),
      { numRuns: 15 }
    );
  });
});