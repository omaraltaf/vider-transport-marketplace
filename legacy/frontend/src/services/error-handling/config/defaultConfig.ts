/**
 * Default Configuration for Error Handling System
 * Provides sensible defaults for all error handling components
 */

import type {
  ErrorHandlingConfig,
  CacheConfig,
  LoggingConfig,
  FallbackConfig
} from '../interfaces';
import type { RetryConfig, MonitoringThresholds } from '../../../types/error.types';
import { ApiErrorType } from '../../../types/error.types';

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2.0,
  retryableErrors: [
    ApiErrorType.NETWORK,
    ApiErrorType.TIMEOUT,
    ApiErrorType.SERVER
  ],
  timeoutMs: 10000 // 10 seconds
};

/**
 * Default monitoring thresholds
 */
export const defaultMonitoringThresholds: MonitoringThresholds = {
  errorRatePerMinute: 10,
  criticalErrorsPerHour: 5,
  failureRateThreshold: 0.1, // 10%
  responseTimeThreshold: 5000 // 5 seconds
};

/**
 * Default cache configuration
 */
export const defaultCacheConfig: CacheConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  defaultTtl: 300000, // 5 minutes
  purgeInterval: 60000, // 1 minute
  compressionEnabled: true
};

/**
 * Default logging configuration
 */
export const defaultLoggingConfig: LoggingConfig = {
  level: 'INFO',
  maxEntries: 10000,
  persistToDisk: false,
  remoteLogging: false
};

/**
 * Default fallback configuration
 */
export const defaultFallbackConfig: FallbackConfig = {
  enableMockData: true,
  enableCaching: true,
  cacheStaleThreshold: 600000, // 10 minutes
  mockDataSets: {
    moderationStats: {
      content: {
        totalFlags: 1247,
        pendingReview: 23,
        resolvedToday: 45,
        approvalRate: 0.65
      },
      fraud: {
        totalAlerts: 456,
        openAlerts: 23,
        confirmedFraudRate: 0.15,
        preventedLosses: 125000
      },
      blacklist: {
        totalEntries: 2341,
        activeEntries: 2156,
        violationsToday: 12,
        hitRate: 0.15
      }
    },
    userStats: {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      verifiedUsers: 0
    },
    systemHealth: {
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        api: 'healthy'
      }
    }
  }
};

/**
 * Complete default configuration
 */
export const defaultErrorHandlingConfig: ErrorHandlingConfig = {
  retryConfig: defaultRetryConfig,
  monitoringThresholds: defaultMonitoringThresholds,
  cacheConfig: defaultCacheConfig,
  loggingConfig: defaultLoggingConfig,
  fallbackConfig: defaultFallbackConfig
};

/**
 * Environment-specific configuration overrides
 */
export const getEnvironmentConfig = (): Partial<ErrorHandlingConfig> => {
  // In frontend, we'll determine environment based on build mode
  // This should be set by the build process (Vite/Webpack)
  const env = import.meta.env?.MODE || 'development';
  
  switch (env) {
    case 'production':
      return {
        loggingConfig: {
          ...defaultLoggingConfig,
          level: 'WARN',
          persistToDisk: true,
          remoteLogging: true
        },
        fallbackConfig: {
          ...defaultFallbackConfig,
          enableMockData: false
        }
      };
    
    case 'test':
      return {
        loggingConfig: {
          ...defaultLoggingConfig,
          level: 'ERROR'
        },
        retryConfig: {
          ...defaultRetryConfig,
          maxAttempts: 1,
          baseDelay: 10
        }
      };
    
    default: // development
      return {
        loggingConfig: {
          ...defaultLoggingConfig,
          level: 'DEBUG'
        }
      };
  }
};

/**
 * Merges default config with environment-specific overrides
 */
export const createErrorHandlingConfig = (): ErrorHandlingConfig => {
  const envConfig = getEnvironmentConfig();
  
  return {
    ...defaultErrorHandlingConfig,
    ...envConfig,
    // Deep merge nested objects
    retryConfig: {
      ...defaultErrorHandlingConfig.retryConfig,
      ...envConfig.retryConfig
    },
    monitoringThresholds: {
      ...defaultErrorHandlingConfig.monitoringThresholds,
      ...envConfig.monitoringThresholds
    },
    cacheConfig: {
      ...defaultErrorHandlingConfig.cacheConfig,
      ...envConfig.cacheConfig
    },
    loggingConfig: {
      ...defaultErrorHandlingConfig.loggingConfig,
      ...envConfig.loggingConfig
    },
    fallbackConfig: {
      ...defaultErrorHandlingConfig.fallbackConfig,
      ...envConfig.fallbackConfig
    }
  };
};