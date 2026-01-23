/**
 * Production Error Tracker
 * Integrates with external error tracking services and provides production-ready error monitoring
 */

import type { ApiError, ErrorContext } from '../../types/error.types';
import { ApiErrorType, ErrorSeverity } from '../../types/error.types';
import { errorMonitor } from './ErrorMonitor';

export interface ProductionErrorConfig {
  // Sentry configuration
  sentryDsn?: string;
  sentryEnvironment?: string;
  
  // Custom error tracking endpoint
  errorTrackingEndpoint?: string;
  
  // Feature flags
  enableSentryIntegration: boolean;
  enableCustomTracking: boolean;
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  
  // Sampling rates
  errorSampleRate: number;
  performanceSampleRate: number;
  
  // User context
  includeUserContext: boolean;
  includeBreadcrumbs: boolean;
  
  // Privacy settings
  scrubSensitiveData: boolean;
  allowedDomains: string[];
}

export interface AuthenticationMetrics {
  loginAttempts: number;
  loginSuccesses: number;
  loginFailures: number;
  tokenRefreshAttempts: number;
  tokenRefreshSuccesses: number;
  tokenRefreshFailures: number;
  averageLoginTime: number;
  averageTokenRefreshTime: number;
  authErrorsByType: Record<string, number>;
  lastUpdated: Date;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  context?: Record<string, unknown>;
}

export class ProductionErrorTracker {
  private config: ProductionErrorConfig;
  private authMetrics: AuthenticationMetrics;
  private performanceMetrics: PerformanceMetric[] = [];
  private maxPerformanceMetrics = 1000;
  private isInitialized = false;

  constructor(config: Partial<ProductionErrorConfig> = {}) {
    this.config = {
      enableSentryIntegration: false,
      enableCustomTracking: true,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableLocalStorage: true,
      errorSampleRate: 1.0,
      performanceSampleRate: 0.1,
      includeUserContext: true,
      includeBreadcrumbs: true,
      scrubSensitiveData: true,
      allowedDomains: [],
      ...config
    };

    this.authMetrics = this.initializeAuthMetrics();
    this.initialize();
  }

  /**
   * Initializes the error tracker
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry if configured
      if (this.config.enableSentryIntegration && this.config.sentryDsn) {
        await this.initializeSentry();
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      this.isInitialized = true;
      console.info('Production error tracker initialized');
    } catch (error) {
      console.error('Failed to initialize production error tracker:', error);
    }
  }

  /**
   * Tracks an authentication-related error
   */
  trackAuthError(error: ApiError, context: ErrorContext & { operation?: string }): void {
    // Update authentication metrics
    this.updateAuthMetrics(error, context);

    // Track with error monitor
    errorMonitor.recordError(error, context);

    // Track with external services
    this.trackError(error, {
      ...context,
      category: 'authentication',
      tags: {
        operation: context.operation,
        errorType: error.type,
        severity: error.severity
      }
    });
  }

  /**
   * Tracks authentication performance metrics
   */
  trackAuthPerformance(operation: string, startTime: number, success: boolean, context?: Record<string, unknown>): void {
    const duration = Date.now() - startTime;
    
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      success,
      context
    };

    this.performanceMetrics.push(metric);
    
    // Maintain metrics size limit
    if (this.performanceMetrics.length > this.maxPerformanceMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxPerformanceMetrics);
    }

    // Update authentication metrics
    this.updateAuthPerformanceMetrics(operation, duration, success);

    // Track performance with external services
    if (Math.random() < this.config.performanceSampleRate) {
      this.trackPerformance(operation, duration, success, context);
    }
  }

  /**
   * Gets current authentication metrics
   */
  getAuthMetrics(): AuthenticationMetrics {
    return { ...this.authMetrics };
  }

  /**
   * Gets performance metrics for a specific operation
   */
  getPerformanceMetrics(operation?: string, timeWindowMinutes: number = 60): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    return this.performanceMetrics.filter(metric => {
      if (metric.timestamp < cutoff) return false;
      if (operation && metric.operation !== operation) return false;
      return true;
    });
  }

  /**
   * Creates an authentication dashboard data
   */
  getAuthDashboardData(): {
    metrics: AuthenticationMetrics;
    recentErrors: ApiError[];
    performanceTrends: Array<{
      operation: string;
      averageDuration: number;
      successRate: number;
      count: number;
    }>;
    healthStatus: 'healthy' | 'warning' | 'critical';
  } {
    const recentErrors = errorMonitor.getMetrics();
    const performanceData = this.calculatePerformanceTrends();
    const healthStatus = this.calculateHealthStatus();

    return {
      metrics: this.authMetrics,
      recentErrors: [], // Would be populated from error monitor
      performanceTrends: performanceData,
      healthStatus
    };
  }

  /**
   * Tracks a general error
   */
  private trackError(error: ApiError, context: ErrorContext & { category?: string; tags?: Record<string, unknown> }): void {
    // Sample errors based on configuration
    if (Math.random() > this.config.errorSampleRate) {
      return;
    }

    const errorData = {
      message: error.message,
      type: error.type,
      severity: error.severity,
      stack: error.stack,
      context: this.scrubSensitiveData(context),
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      console.error('Authentication Error:', errorData);
    }

    // Local storage for debugging
    if (this.config.enableLocalStorage) {
      this.storeErrorLocally(errorData);
    }

    // Custom tracking endpoint
    if (this.config.enableCustomTracking && this.config.errorTrackingEndpoint) {
      this.sendToCustomEndpoint(errorData);
    }

    // Sentry integration
    if (this.config.enableSentryIntegration && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: context.tags,
        extra: context,
        level: this.mapSeverityToSentryLevel(error.severity)
      });
    }
  }

  /**
   * Tracks performance metrics
   */
  private trackPerformance(operation: string, duration: number, success: boolean, context?: Record<string, unknown>): void {
    const performanceData = {
      operation,
      duration,
      success,
      context: this.scrubSensitiveData(context || {}),
      timestamp: new Date().toISOString()
    };

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      console.info('Auth Performance:', performanceData);
    }

    // Custom tracking endpoint
    if (this.config.enableCustomTracking && this.config.errorTrackingEndpoint) {
      this.sendPerformanceToCustomEndpoint(performanceData);
    }

    // Sentry performance monitoring
    if (this.config.enableSentryIntegration && typeof window !== 'undefined' && (window as any).Sentry) {
      const transaction = (window as any).Sentry.startTransaction({
        name: operation,
        op: 'auth'
      });
      
      transaction.setData('duration', duration);
      transaction.setData('success', success);
      transaction.setStatus(success ? 'ok' : 'internal_error');
      transaction.finish();
    }
  }

  /**
   * Initializes Sentry integration
   */
  private async initializeSentry(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check if Sentry is already loaded globally (e.g., via CDN)
      if ((window as any).Sentry) {
        const Sentry = (window as any).Sentry;
        
        Sentry.init({
          dsn: this.config.sentryDsn,
          environment: this.config.sentryEnvironment || process.env.NODE_ENV,
          sampleRate: this.config.errorSampleRate,
          tracesSampleRate: this.config.performanceSampleRate,
          beforeSend: (event: any) => {
            // Scrub sensitive data
            if (this.config.scrubSensitiveData) {
              return this.scrubSentryEvent(event);
            }
            return event;
          }
        });
        
        console.info('Sentry initialized successfully');
      } else {
        console.info('Sentry not available, error tracking will use custom endpoint only');
      }
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Sets up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error: ApiError = {
        type: ApiErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        context: {
          timestamp: new Date(),
          component: 'global',
          operation: 'unhandled_rejection'
        }
      };

      this.trackError(error, {
        timestamp: new Date(),
        component: 'global',
        category: 'unhandled_error'
      });
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      const error: ApiError = {
        type: ApiErrorType.CLIENT,
        severity: ErrorSeverity.MEDIUM,
        message: event.message,
        stack: event.error?.stack,
        context: {
          timestamp: new Date(),
          component: 'global',
          operation: 'javascript_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      };

      this.trackError(error, {
        timestamp: new Date(),
        component: 'global',
        category: 'javascript_error'
      });
    });
  }

  /**
   * Sets up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.trackPerformance('page_load', navigation.loadEventEnd - navigation.fetchStart, true, {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstPaint: navigation.responseEnd - navigation.fetchStart
          });
        }
      }, 0);
    });
  }

  /**
   * Updates authentication metrics
   */
  private updateAuthMetrics(error: ApiError, context: ErrorContext & { operation?: string }): void {
    const operation = context.operation;

    if (operation === 'login') {
      this.authMetrics.loginFailures++;
    } else if (operation === 'token_refresh') {
      this.authMetrics.tokenRefreshFailures++;
    }

    const errorKey = `${error.type}_${operation || 'unknown'}`;
    this.authMetrics.authErrorsByType[errorKey] = (this.authMetrics.authErrorsByType[errorKey] || 0) + 1;
    this.authMetrics.lastUpdated = new Date();
  }

  /**
   * Updates authentication performance metrics
   */
  private updateAuthPerformanceMetrics(operation: string, duration: number, success: boolean): void {
    if (operation === 'login') {
      this.authMetrics.loginAttempts++;
      if (success) {
        this.authMetrics.loginSuccesses++;
        this.authMetrics.averageLoginTime = this.calculateMovingAverage(
          this.authMetrics.averageLoginTime,
          duration,
          this.authMetrics.loginSuccesses
        );
      }
    } else if (operation === 'token_refresh') {
      this.authMetrics.tokenRefreshAttempts++;
      if (success) {
        this.authMetrics.tokenRefreshSuccesses++;
        this.authMetrics.averageTokenRefreshTime = this.calculateMovingAverage(
          this.authMetrics.averageTokenRefreshTime,
          duration,
          this.authMetrics.tokenRefreshSuccesses
        );
      }
    }

    this.authMetrics.lastUpdated = new Date();
  }

  /**
   * Calculates performance trends
   */
  private calculatePerformanceTrends(): Array<{
    operation: string;
    averageDuration: number;
    successRate: number;
    count: number;
  }> {
    const recentMetrics = this.getPerformanceMetrics(undefined, 60);
    const operationGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(operationGroups).map(([operation, metrics]) => {
      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const successCount = metrics.filter(m => m.success).length;

      return {
        operation,
        averageDuration: totalDuration / metrics.length,
        successRate: successCount / metrics.length,
        count: metrics.length
      };
    });
  }

  /**
   * Calculates overall health status
   */
  private calculateHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const recentMetrics = this.getPerformanceMetrics(undefined, 10);
    const errorRate = recentMetrics.filter(m => !m.success).length / Math.max(recentMetrics.length, 1);
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / Math.max(recentMetrics.length, 1);

    if (errorRate > 0.5 || avgDuration > 5000) {
      return 'critical';
    } else if (errorRate > 0.2 || avgDuration > 2000) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Initializes authentication metrics
   */
  private initializeAuthMetrics(): AuthenticationMetrics {
    return {
      loginAttempts: 0,
      loginSuccesses: 0,
      loginFailures: 0,
      tokenRefreshAttempts: 0,
      tokenRefreshSuccesses: 0,
      tokenRefreshFailures: 0,
      averageLoginTime: 0,
      averageTokenRefreshTime: 0,
      authErrorsByType: {},
      lastUpdated: new Date()
    };
  }

  /**
   * Calculates moving average
   */
  private calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * Scrubs sensitive data from context
   */
  private scrubSensitiveData(data: any): any {
    if (!this.config.scrubSensitiveData) return data;

    const sensitiveKeys = ['password', 'token', 'authorization', 'cookie', 'session', 'key', 'secret'];
    
    const scrub = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const scrubbed: any = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          scrubbed[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          scrubbed[key] = scrub(value);
        } else {
          scrubbed[key] = value;
        }
      }
      
      return scrubbed;
    };

    return scrub(data);
  }

  /**
   * Stores error locally for debugging
   */
  private storeErrorLocally(errorData: any): void {
    try {
      const key = `auth_error_${Date.now()}`;
      const errors = JSON.parse(localStorage.getItem('auth_errors') || '[]');
      errors.push({ key, ...errorData });
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('auth_errors', JSON.stringify(errors));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  /**
   * Sends error to custom endpoint
   */
  private async sendToCustomEndpoint(errorData: any): Promise<void> {
    if (!this.config.errorTrackingEndpoint) return;

    try {
      await fetch(this.config.errorTrackingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'error',
          data: errorData
        })
      });
    } catch (error) {
      console.warn('Failed to send error to custom endpoint:', error);
    }
  }

  /**
   * Sends performance data to custom endpoint
   */
  private async sendPerformanceToCustomEndpoint(performanceData: any): Promise<void> {
    if (!this.config.errorTrackingEndpoint) return;

    try {
      await fetch(this.config.errorTrackingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'performance',
          data: performanceData
        })
      });
    } catch (error) {
      console.warn('Failed to send performance data to custom endpoint:', error);
    }
  }

  /**
   * Maps error severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Scrubs sensitive data from Sentry events
   */
  private scrubSentryEvent(event: any): any {
    // This would implement Sentry-specific data scrubbing
    return this.scrubSensitiveData(event);
  }
}

import { errorTrackingConfig } from '../../config/errorTracking.config';

// Singleton instance
export const productionErrorTracker = new ProductionErrorTracker(errorTrackingConfig);