/**
 * Error Monitor Service
 * Handles error analytics, pattern detection, and escalation
 */

import type { IErrorMonitor } from './interfaces';
import type { ApiError, ErrorContext, ErrorPattern, EscalationRule } from '../../types/error.types';
import { ApiErrorType, ErrorSeverity } from '../../types/error.types';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<ApiErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByEndpoint: Record<string, number>;
  errorsByComponent: Record<string, number>;
  averageResolutionTime: number;
  escalationCount: number;
  lastUpdated: Date;
}

export interface ErrorTrend {
  timeWindow: string;
  errorCount: number;
  errorRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: ErrorSeverity;
}

export interface EscalationEvent {
  id: string;
  triggeredAt: Date;
  rule: EscalationRule;
  errors: ApiError[];
  context: ErrorContext;
  status: 'pending' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  resolvedAt?: Date;
}

export class ErrorMonitor implements IErrorMonitor {
  private errorHistory: ApiError[] = [];
  private escalationEvents: EscalationEvent[] = [];
  private escalationRules: EscalationRule[] = [];
  private metrics: ErrorMetrics;
  private maxHistorySize = 10000;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.setupDefaultEscalationRules();
    this.startMetricsUpdater();
  }

  /**
   * Records an error for monitoring and analysis
   */
  recordError(error: ApiError, context: ErrorContext): void {
    // Add to history
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Update metrics
    this.updateMetrics(error, context);

    // Check for escalation triggers
    this.checkEscalationRules(error, context);

    // Detect patterns
    this.detectErrorPatterns();
  }

  /**
   * Gets current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets error trends for a specific time window
   */
  getErrorTrends(timeWindowMinutes: number = 60): ErrorTrend[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    const recentErrors = this.errorHistory.filter(
      error => error.context.timestamp >= windowStart
    );

    const trends: ErrorTrend[] = [];
    const timeWindows = this.createTimeWindows(windowStart, now, 5); // 5-minute windows

    for (let i = 0; i < timeWindows.length; i++) {
      const window = timeWindows[i];
      const windowErrors = recentErrors.filter(
        error => error.context.timestamp >= window.start && error.context.timestamp < window.end
      );

      const errorCount = windowErrors.length;
      const errorRate = errorCount / (5 * 60); // errors per second
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (i > 0) {
        const prevWindow = trends[i - 1];
        if (errorCount > prevWindow.errorCount * 1.2) {
          trend = 'increasing';
        } else if (errorCount < prevWindow.errorCount * 0.8) {
          trend = 'decreasing';
        }
      }

      const severity = this.calculateWindowSeverity(windowErrors);

      trends.push({
        timeWindow: `${window.start.toISOString()}-${window.end.toISOString()}`,
        errorCount,
        errorRate,
        trend,
        severity
      });
    }

    return trends;
  }

  /**
   * Gets detected error patterns
   */
  detectErrorPatterns(): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];
    const recentErrors = this.getRecentErrors(60); // Last hour

    // Pattern 1: Repeated errors from same endpoint
    const endpointGroups = this.groupErrorsByEndpoint(recentErrors);
    for (const [endpoint, errors] of Object.entries(endpointGroups)) {
      if (errors.length >= 5) {
        patterns.push({
          type: 'repeated_endpoint_errors',
          description: `Multiple errors from endpoint: ${endpoint}`,
          frequency: errors.length,
          severity: this.calculatePatternSeverity(errors),
          firstOccurrence: errors[0].context.timestamp,
          lastOccurrence: errors[errors.length - 1].context.timestamp,
          affectedEndpoints: [endpoint],
          suggestedAction: 'Check endpoint health and dependencies'
        });
      }
    }

    // Pattern 2: Authentication failures spike
    const authErrors = recentErrors.filter(error => error.type === ApiErrorType.AUTH);
    if (authErrors.length >= 10) {
      patterns.push({
        type: 'auth_failure_spike',
        description: 'High number of authentication failures',
        frequency: authErrors.length,
        severity: ErrorSeverity.HIGH,
        firstOccurrence: authErrors[0].context.timestamp,
        lastOccurrence: authErrors[authErrors.length - 1].context.timestamp,
        affectedEndpoints: [...new Set(authErrors.map(e => e.context.endpoint))],
        suggestedAction: 'Check authentication service and token validity'
      });
    }

    // Pattern 3: Network timeout cluster
    const timeoutErrors = recentErrors.filter(error => error.type === ApiErrorType.TIMEOUT);
    if (timeoutErrors.length >= 3) {
      patterns.push({
        type: 'timeout_cluster',
        description: 'Cluster of timeout errors detected',
        frequency: timeoutErrors.length,
        severity: ErrorSeverity.MEDIUM,
        firstOccurrence: timeoutErrors[0].context.timestamp,
        lastOccurrence: timeoutErrors[timeoutErrors.length - 1].context.timestamp,
        affectedEndpoints: [...new Set(timeoutErrors.map(e => e.context.endpoint))],
        suggestedAction: 'Check network connectivity and server performance'
      });
    }

    return patterns;
  }

  /**
   * Gets escalation events
   */
  getEscalationEvents(): EscalationEvent[] {
    return [...this.escalationEvents];
  }

  /**
   * Acknowledges an escalation event
   */
  acknowledgeEscalation(eventId: string, assignedTo: string): boolean {
    const event = this.escalationEvents.find(e => e.id === eventId);
    if (event && event.status === 'pending') {
      event.status = 'acknowledged';
      event.assignedTo = assignedTo;
      return true;
    }
    return false;
  }

  /**
   * Resolves an escalation event
   */
  resolveEscalation(eventId: string): boolean {
    const event = this.escalationEvents.find(e => e.id === eventId);
    if (event && event.status !== 'resolved') {
      event.status = 'resolved';
      event.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Adds a custom escalation rule
   */
  addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.push(rule);
  }

  /**
   * Collects user context for error reporting
   */
  collectUserContext(): Record<string, unknown> {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null,
      connection: typeof navigator !== 'undefined' && 'connection' in navigator ? {
        effectiveType: (navigator as any).connection?.effectiveType,
        downlink: (navigator as any).connection?.downlink
      } : null,
      memory: typeof performance !== 'undefined' && 'memory' in performance ? {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize
      } : null
    };
  }

  /**
   * Initializes default metrics
   */
  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByType: {
        [ApiErrorType.NETWORK]: 0,
        [ApiErrorType.AUTH]: 0,
        [ApiErrorType.PERMISSION]: 0,
        [ApiErrorType.PARSING]: 0,
        [ApiErrorType.VALIDATION]: 0,
        [ApiErrorType.SERVER]: 0,
        [ApiErrorType.CLIENT]: 0,
        [ApiErrorType.TIMEOUT]: 0,
        [ApiErrorType.RATE_LIMIT]: 0,
        [ApiErrorType.UNKNOWN]: 0
      },
      errorsBySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      errorsByEndpoint: {},
      errorsByComponent: {},
      averageResolutionTime: 0,
      escalationCount: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Sets up default escalation rules
   */
  private setupDefaultEscalationRules(): void {
    this.escalationRules = [
      {
        id: 'critical_error_immediate',
        name: 'Critical Error Immediate Escalation',
        condition: {
          severity: ErrorSeverity.CRITICAL,
          count: 1,
          timeWindowMinutes: 1
        },
        action: {
          type: 'immediate',
          notificationChannels: ['email', 'slack'],
          assignTo: 'on-call-engineer'
        }
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate Escalation',
        condition: {
          severity: ErrorSeverity.HIGH,
          count: 5,
          timeWindowMinutes: 5
        },
        action: {
          type: 'escalate',
          notificationChannels: ['email'],
          assignTo: 'team-lead'
        }
      },
      {
        id: 'auth_failure_spike',
        name: 'Authentication Failure Spike',
        condition: {
          errorType: ApiErrorType.AUTH,
          count: 10,
          timeWindowMinutes: 10
        },
        action: {
          type: 'alert',
          notificationChannels: ['slack'],
          assignTo: 'security-team'
        }
      }
    ];
  }

  /**
   * Updates metrics with new error
   */
  private updateMetrics(error: ApiError, context: ErrorContext): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByType[error.type]++;
    this.metrics.errorsBySeverity[error.severity]++;
    
    if (context.endpoint) {
      this.metrics.errorsByEndpoint[context.endpoint] = 
        (this.metrics.errorsByEndpoint[context.endpoint] || 0) + 1;
    }
    
    if (context.component) {
      this.metrics.errorsByComponent[context.component] = 
        (this.metrics.errorsByComponent[context.component] || 0) + 1;
    }
    
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Checks escalation rules against current error
   */
  private checkEscalationRules(error: ApiError, context: ErrorContext): void {
    for (const rule of this.escalationRules) {
      if (this.shouldTriggerEscalation(rule, error, context)) {
        this.triggerEscalation(rule, error, context);
      }
    }
  }

  /**
   * Determines if escalation should be triggered
   */
  private shouldTriggerEscalation(rule: EscalationRule, error: ApiError, context: ErrorContext): boolean {
    const condition = rule.condition;
    const timeWindow = new Date(Date.now() - condition.timeWindowMinutes * 60 * 1000);
    
    const relevantErrors = this.errorHistory.filter(e => {
      if (e.context.timestamp < timeWindow) return false;
      if (condition.severity && e.severity !== condition.severity) return false;
      if (condition.errorType && e.type !== condition.errorType) return false;
      if (condition.endpoint && e.context.endpoint !== condition.endpoint) return false;
      return true;
    });

    return relevantErrors.length >= condition.count;
  }

  /**
   * Triggers an escalation event
   */
  private triggerEscalation(rule: EscalationRule, error: ApiError, context: ErrorContext): void {
    const eventId = `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const escalationEvent: EscalationEvent = {
      id: eventId,
      triggeredAt: new Date(),
      rule,
      errors: [error],
      context,
      status: 'pending'
    };

    this.escalationEvents.push(escalationEvent);
    this.metrics.escalationCount++;

    // In a real implementation, you would send notifications here
    console.warn('Escalation triggered:', {
      rule: rule.name,
      eventId,
      error: error.message
    });
  }

  /**
   * Gets recent errors within time window
   */
  private getRecentErrors(minutes: number): ApiError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errorHistory.filter(error => error.context.timestamp >= cutoff);
  }

  /**
   * Groups errors by endpoint
   */
  private groupErrorsByEndpoint(errors: ApiError[]): Record<string, ApiError[]> {
    return errors.reduce((groups, error) => {
      const endpoint = error.context.endpoint || 'unknown';
      if (!groups[endpoint]) {
        groups[endpoint] = [];
      }
      groups[endpoint].push(error);
      return groups;
    }, {} as Record<string, ApiError[]>);
  }

  /**
   * Calculates severity for a pattern based on errors
   */
  private calculatePatternSeverity(errors: ApiError[]): ErrorSeverity {
    const severities = errors.map(e => e.severity);
    if (severities.includes(ErrorSeverity.CRITICAL)) return ErrorSeverity.CRITICAL;
    if (severities.includes(ErrorSeverity.HIGH)) return ErrorSeverity.HIGH;
    if (severities.includes(ErrorSeverity.MEDIUM)) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Calculates severity for a time window based on errors
   */
  private calculateWindowSeverity(errors: ApiError[]): ErrorSeverity {
    if (errors.length === 0) return ErrorSeverity.LOW;
    return this.calculatePatternSeverity(errors);
  }

  /**
   * Creates time windows for trend analysis
   */
  private createTimeWindows(start: Date, end: Date, intervalMinutes: number): Array<{start: Date, end: Date}> {
    const windows = [];
    let current = new Date(start);
    
    while (current < end) {
      const windowEnd = new Date(current.getTime() + intervalMinutes * 60 * 1000);
      windows.push({
        start: new Date(current),
        end: windowEnd > end ? end : windowEnd
      });
      current = windowEnd;
    }
    
    return windows;
  }

  /**
   * Starts periodic metrics updates
   */
  private startMetricsUpdater(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.metrics.lastUpdated = new Date();
    }, 60000); // Update every minute
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();