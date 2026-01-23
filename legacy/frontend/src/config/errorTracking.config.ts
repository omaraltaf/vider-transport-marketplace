/**
 * Error Tracking Configuration
 * Centralized configuration for production error tracking and monitoring
 */

import type { ProductionErrorConfig } from '../services/error-handling/ProductionErrorTracker';

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const isTest = import.meta.env.MODE === 'test';

export const errorTrackingConfig: ProductionErrorConfig = {
  // Sentry configuration (if using Sentry)
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  sentryEnvironment: import.meta.env.MODE,
  
  // Custom error tracking endpoint
  errorTrackingEndpoint: import.meta.env.VITE_ERROR_TRACKING_ENDPOINT || '/api/errors/track',
  
  // Feature flags
  enableSentryIntegration: isProduction && !!import.meta.env.VITE_SENTRY_DSN,
  enableCustomTracking: !isTest,
  enableConsoleLogging: isDevelopment,
  enableLocalStorage: !isProduction, // Only store locally in dev/staging
  
  // Sampling rates
  errorSampleRate: isProduction ? 0.1 : 1.0, // Sample 10% of errors in production
  performanceSampleRate: isProduction ? 0.01 : 0.1, // Sample 1% of performance metrics in production
  
  // User context
  includeUserContext: true,
  includeBreadcrumbs: true,
  
  // Privacy settings
  scrubSensitiveData: true,
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    import.meta.env.VITE_DOMAIN,
    import.meta.env.VITE_API_DOMAIN
  ].filter(Boolean) as string[]
};

// Authentication-specific monitoring configuration
export const authMonitoringConfig = {
  // Performance thresholds (in milliseconds)
  loginTimeThreshold: 3000, // Alert if login takes longer than 3 seconds
  tokenRefreshThreshold: 1000, // Alert if token refresh takes longer than 1 second
  
  // Error rate thresholds
  loginErrorRateThreshold: 0.1, // Alert if login error rate exceeds 10%
  tokenRefreshErrorRateThreshold: 0.05, // Alert if token refresh error rate exceeds 5%
  
  // Monitoring intervals
  metricsUpdateInterval: 30000, // Update metrics every 30 seconds
  healthCheckInterval: 60000, // Check health every minute
  
  // Alert thresholds
  criticalErrorThreshold: 5, // Escalate after 5 critical errors in 5 minutes
  highErrorThreshold: 10, // Escalate after 10 high-severity errors in 10 minutes
  
  // Dashboard refresh settings
  dashboardRefreshInterval: 30000, // Refresh dashboard every 30 seconds
  autoRefreshEnabled: true
};

// Error classification rules
export const errorClassificationRules = {
  // Critical errors that require immediate attention
  criticalPatterns: [
    /authentication.*failed.*repeatedly/i,
    /token.*refresh.*failed.*permanently/i,
    /user.*session.*corrupted/i,
    /security.*breach/i,
    /unauthorized.*access.*attempt/i
  ],
  
  // High-priority errors
  highPriorityPatterns: [
    /login.*failed/i,
    /token.*expired/i,
    /permission.*denied/i,
    /authentication.*error/i,
    /session.*invalid/i
  ],
  
  // Medium-priority errors
  mediumPriorityPatterns: [
    /network.*timeout/i,
    /connection.*failed/i,
    /api.*error/i,
    /validation.*failed/i
  ],
  
  // Low-priority errors (informational)
  lowPriorityPatterns: [
    /user.*cancelled/i,
    /form.*validation/i,
    /client.*side.*error/i
  ]
};

// Notification channels configuration
export const notificationConfig = {
  // Email notifications
  email: {
    enabled: isProduction,
    recipients: [
      import.meta.env.VITE_ALERT_EMAIL,
      import.meta.env.VITE_ADMIN_EMAIL
    ].filter(Boolean) as string[],
    templates: {
      critical: 'critical-auth-error',
      high: 'high-auth-error',
      summary: 'auth-error-summary'
    }
  },
  
  // Slack notifications
  slack: {
    enabled: isProduction && !!import.meta.env.VITE_SLACK_WEBHOOK,
    webhookUrl: import.meta.env.VITE_SLACK_WEBHOOK,
    channels: {
      critical: '#alerts-critical',
      high: '#alerts-high',
      general: '#alerts-general'
    }
  },
  
  // SMS notifications (for critical alerts only)
  sms: {
    enabled: isProduction && !!import.meta.env.VITE_SMS_API_KEY,
    apiKey: import.meta.env.VITE_SMS_API_KEY,
    recipients: [
      import.meta.env.VITE_ONCALL_PHONE
    ].filter(Boolean) as string[]
  }
};

// Dashboard configuration
export const dashboardConfig = {
  // Chart settings
  charts: {
    maxDataPoints: 100,
    timeWindows: [
      { label: '1 Hour', minutes: 60 },
      { label: '6 Hours', minutes: 360 },
      { label: '24 Hours', minutes: 1440 },
      { label: '7 Days', minutes: 10080 }
    ],
    refreshInterval: 30000
  },
  
  // Metrics to display
  metrics: {
    showLoginMetrics: true,
    showTokenMetrics: true,
    showErrorBreakdown: true,
    showPerformanceTrends: true,
    showHealthScore: true
  },
  
  // Alert display settings
  alerts: {
    maxVisible: 10,
    autoHide: false,
    showTimestamps: true,
    groupSimilar: true
  }
};

// Export all configurations
export default {
  errorTracking: errorTrackingConfig,
  authMonitoring: authMonitoringConfig,
  errorClassification: errorClassificationRules,
  notifications: notificationConfig,
  dashboard: dashboardConfig
};