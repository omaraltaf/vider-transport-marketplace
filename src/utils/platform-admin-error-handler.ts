import { Logger } from './logger';
import { PlatformAdminFallbackService } from '../services/platform-admin-fallback.service';

/**
 * Platform Admin Error Handler
 * 
 * Provides consistent error handling and fallback mechanisms
 * for all platform admin services.
 */
export class PlatformAdminErrorHandler {
  private static logger = new Logger('PlatformAdminErrorHandler');
  private static fallbackService = PlatformAdminFallbackService.getInstance();

  /**
   * Handle database query errors with automatic fallback
   */
  static async handleDatabaseError<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    context: {
      service: string;
      method: string;
      operation: string;
    }
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      this.logger.error(`Database error in ${context.service}.${context.method}`, {
        service: context.service,
        method: context.method,
        operation: context.operation,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Return fallback data with indicator
      return PlatformAdminFallbackService.markAsFallback(fallbackData);
    }
  }

  /**
   * Handle cache operations with fallback to database
   */
  static async handleCacheOperation<T>(
    cacheKey: string,
    cacheOperation: () => Promise<T | null>,
    databaseOperation: () => Promise<T>,
    fallbackData: T,
    context: {
      service: string;
      method: string;
      ttl?: number;
    }
  ): Promise<T> {
    try {
      // Try cache first
      const cachedResult = await cacheOperation();
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Fallback to database
      const dbResult = await databaseOperation();
      
      // Cache the result (fire and forget)
      this.cacheResult(cacheKey, dbResult, context.ttl || 1800).catch(error => {
        this.logger.warn(`Failed to cache result for ${cacheKey}`, { error: error.message });
      });

      return dbResult;
    } catch (error) {
      this.logger.error(`Cache/Database error in ${context.service}.${context.method}`, {
        service: context.service,
        method: context.method,
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      return PlatformAdminFallbackService.markAsFallback(fallbackData);
    }
  }

  /**
   * Cache result with error handling
   */
  private static async cacheResult<T>(
    key: string,
    data: T,
    ttl: number = 1800
  ): Promise<void> {
    try {
      // Import Redis dynamically to avoid circular dependencies
      const { getRedisClient } = await import('../config/redis');
      const redis = getRedisClient();
      
      if (redis) {
        await redis.setex(key, ttl, JSON.stringify(data));
      }
    } catch (error) {
      this.logger.warn(`Failed to cache data for key ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate and sanitize input parameters
   */
  static validateInput<T extends Record<string, any>>(
    input: T,
    requiredFields: (keyof T)[],
    context: { service: string; method: string }
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    for (const field of requiredFields) {
      if (input[field] === undefined || input[field] === null) {
        errors.push(`Required field '${String(field)}' is missing`);
      }
    }

    // Validate date ranges
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.push('Invalid date format');
      } else if (start > end) {
        errors.push('Start date must be before end date');
      }
    }

    // Validate pagination parameters
    if (input.page !== undefined) {
      const page = Number(input.page);
      if (isNaN(page) || page < 1) {
        errors.push('Page must be a positive number');
      }
    }

    if (input.limit !== undefined) {
      const limit = Number(input.limit);
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        errors.push('Limit must be between 1 and 1000');
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Input validation failed in ${context.service}.${context.method}`, {
        service: context.service,
        method: context.method,
        errors,
        input: JSON.stringify(input),
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle API response formatting with consistent structure
   */
  static formatResponse<T>(
    data: T,
    context: {
      service: string;
      method: string;
      success?: boolean;
      message?: string;
    }
  ) {
    const isFallback = PlatformAdminFallbackService.isFallbackData(data);
    
    return {
      success: context.success ?? true,
      data,
      message: context.message || (isFallback ? 'Data fra fallback-system' : 'Success'),
      isFallback,
      timestamp: new Date().toISOString(),
      service: context.service,
      method: context.method,
    };
  }

  /**
   * Handle service-specific errors with appropriate fallbacks
   */
  static async handleServiceError<T>(
    service: string,
    method: string,
    error: Error,
    fallbackMethod?: () => T
  ): Promise<T> {
    this.logger.error(`Service error in ${service}.${method}`, {
      service,
      method,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    if (fallbackMethod) {
      try {
        const fallbackData = fallbackMethod();
        return PlatformAdminFallbackService.markAsFallback(fallbackData);
      } catch (fallbackError) {
        this.logger.error(`Fallback method failed for ${service}.${method}`, {
          service,
          method,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      }
    }

    // Return generic error response
    throw new Error(`Service ${service}.${method} is temporarily unavailable`);
  }

  /**
   * Retry mechanism for database operations
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context: { service: string; method: string }
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          this.logger.error(`All retry attempts failed for ${context.service}.${context.method}`, {
            service: context.service,
            method: context.method,
            attempts: maxRetries,
            error: lastError.message,
          });
          throw lastError;
        }

        this.logger.warn(`Retry attempt ${attempt} failed for ${context.service}.${context.method}`, {
          service: context.service,
          method: context.method,
          attempt,
          error: lastError.message,
          nextRetryIn: delay,
        });

        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff
        delay *= 2;
      }
    }

    throw lastError!;
  }

  /**
   * Monitor service performance and log metrics
   */
  static async monitorPerformance<T>(
    operation: () => Promise<T>,
    context: { service: string; method: string }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.logger.info(`Performance metric for ${context.service}.${context.method}`, {
        service: context.service,
        method: context.method,
        duration,
        success: true,
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Performance metric for ${context.service}.${context.method} (failed)`, {
        service: context.service,
        method: context.method,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }
}

/**
 * Decorator for automatic error handling and performance monitoring
 */
export function withErrorHandling(
  service: string,
  fallbackMethod?: () => any
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await PlatformAdminErrorHandler.monitorPerformance(
          () => method.apply(this, args),
          { service, method: propertyName }
        );
      } catch (error) {
        return await PlatformAdminErrorHandler.handleServiceError(
          service,
          propertyName,
          error instanceof Error ? error : new Error(String(error)),
          fallbackMethod
        );
      }
    };

    return descriptor;
  };
}