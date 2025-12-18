/**
 * API Error Handler Service
 * Central orchestrator for all API error handling logic
 */

import type { IApiErrorHandler, IErrorTypeHandler, IFallbackStrategy } from './interfaces';
import type { ApiError, ErrorContext, ErrorResponse, ErrorMetrics } from '../../types/error.types';
import { ApiErrorType, ErrorSeverity } from '../../types/error.types';
import { tokenManager } from './TokenManager';
import { retryController } from './RetryController';
import { fallbackManager } from './FallbackManager';
import { responseValidator } from './ResponseValidator';
import { classifyError, getErrorPriority, shouldTriggerAlert } from './utils/errorClassification';

export class ApiErrorHandler implements IApiErrorHandler {
  private errorTypeHandlers = new Map<string, IErrorTypeHandler>();
  private fallbackStrategy: IFallbackStrategy | null = null;
  private errorHistory: Array<{ error: ApiError; context: ErrorContext; timestamp: Date }> = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Handles an API error with comprehensive error processing
   */
  async handleError(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    // Record error in history
    this.recordError(error, context);

    // Get appropriate handler
    const handler = this.getErrorHandler(error);
    
    if (handler) {
      try {
        const response = await handler.handle(error, context);
        
        // If handler provided a response, use it
        if (response.handled) {
          return response;
        }
      } catch (handlerError) {
        console.warn('Error handler failed:', handlerError);
      }
    }

    // Fallback to default handling
    return this.handleErrorDefault(error, context);
  }

  /**
   * Registers an error type handler
   */
  registerErrorType(type: string, handler: IErrorTypeHandler): void {
    this.errorTypeHandlers.set(type, handler);
  }

  /**
   * Sets the fallback strategy
   */
  setFallbackStrategy(strategy: IFallbackStrategy): void {
    this.fallbackStrategy = strategy;
  }

  /**
   * Gets error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(entry => entry.timestamp > oneHourAgo);

    const errorsByType: Record<ApiErrorType, number> = {
      [ApiErrorType.NETWORK]: 0,
      [ApiErrorType.AUTH]: 0,
      [ApiErrorType.PARSING]: 0,
      [ApiErrorType.TIMEOUT]: 0,
      [ApiErrorType.SERVER]: 0,
      [ApiErrorType.VALIDATION]: 0,
      [ApiErrorType.UNKNOWN]: 0
    };

    const errorsBySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    let totalResolutionTime = 0;
    let resolvedErrors = 0;
    let userImpactScore = 0;

    recentErrors.forEach(entry => {
      errorsByType[entry.error.type]++;
      errorsBySeverity[entry.error.severity]++;
      
      // Calculate user impact score
      const severityWeight = {
        [ErrorSeverity.LOW]: 1,
        [ErrorSeverity.MEDIUM]: 2,
        [ErrorSeverity.HIGH]: 4,
        [ErrorSeverity.CRITICAL]: 8
      };
      userImpactScore += severityWeight[entry.error.severity];
    });

    // Calculate recovery rate (simplified)
    const recoveryRate = recentErrors.length > 0 ? 
      recentErrors.filter(e => e.error.isRecoverable).length / recentErrors.length : 1;

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      recoveryRate,
      averageResolutionTime: resolvedErrors > 0 ? totalResolutionTime / resolvedErrors : 0,
      userImpactScore
    };
  }

  /**
   * Clears error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Gets appropriate error handler for an error type
   */
  private getErrorHandler(error: ApiError): IErrorTypeHandler | null {
    // Try specific type handler first
    const typeHandler = this.errorTypeHandlers.get(error.type);
    if (typeHandler && typeHandler.canHandle(error)) {
      return typeHandler;
    }

    // Try generic handlers
    for (const handler of this.errorTypeHandlers.values()) {
      if (handler.canHandle(error)) {
        return handler;
      }
    }

    return null;
  }

  /**
   * Default error handling logic
   */
  private async handleErrorDefault(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    let userMessage = this.generateUserMessage(error);
    let fallbackData: unknown = null;
    let shouldRetry = false;
    let requiresUserAction = false;

    // Handle different error types
    switch (error.type) {
      case ApiErrorType.AUTH:
        try {
          await tokenManager.handleTokenError(error);
          userMessage = 'Authentication refreshed. Please try again.';
          shouldRetry = true;
        } catch {
          userMessage = 'Please log in again to continue.';
          requiresUserAction = true;
        }
        break;

      case ApiErrorType.NETWORK:
      case ApiErrorType.TIMEOUT:
      case ApiErrorType.SERVER:
        shouldRetry = retryController.shouldRetry(error, context.retryCount);
        if (!shouldRetry) {
          fallbackData = await this.getFallbackData(context.endpoint);
          userMessage = fallbackData ? 
            'Using cached data. Some information may be outdated.' :
            'Service temporarily unavailable. Please try again later.';
        }
        break;

      case ApiErrorType.PARSING:
        fallbackData = await this.getFallbackData(context.endpoint);
        userMessage = 'Received unexpected response format. Using fallback data.';
        break;

      case ApiErrorType.VALIDATION:
        userMessage = 'Invalid request. Please check your input and try again.';
        requiresUserAction = true;
        break;

      default:
        fallbackData = await this.getFallbackData(context.endpoint);
        userMessage = 'An unexpected error occurred. Please try again.';
        shouldRetry = true;
    }

    // Trigger alerts for critical errors
    if (shouldTriggerAlert(error)) {
      this.triggerAlert(error, context);
    }

    return {
      handled: true,
      fallbackData,
      userMessage,
      shouldRetry,
      requiresUserAction
    };
  }

  /**
   * Generates user-friendly error messages
   */
  private generateUserMessage(error: ApiError): string {
    const baseMessages = {
      [ApiErrorType.NETWORK]: 'Connection problem. Please check your internet connection.',
      [ApiErrorType.AUTH]: 'Authentication required. Please log in.',
      [ApiErrorType.PARSING]: 'Received unexpected response. Please try again.',
      [ApiErrorType.TIMEOUT]: 'Request timed out. Please try again.',
      [ApiErrorType.SERVER]: 'Server error. Please try again later.',
      [ApiErrorType.VALIDATION]: 'Invalid request. Please check your input.',
      [ApiErrorType.UNKNOWN]: 'An unexpected error occurred.'
    };

    let message = baseMessages[error.type] || baseMessages[ApiErrorType.UNKNOWN];

    // Add context based on severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      message += ' If this problem persists, please contact support.';
    }

    return message;
  }

  /**
   * Gets fallback data for an endpoint
   */
  private async getFallbackData(endpoint: string): Promise<unknown> {
    if (this.fallbackStrategy && this.fallbackStrategy.shouldUseFallback) {
      // Use custom fallback strategy
      const mockError = { type: ApiErrorType.UNKNOWN } as ApiError;
      if (this.fallbackStrategy.shouldUseFallback(mockError)) {
        const fallbackType = this.fallbackStrategy.getFallbackType(mockError);
        return this.fallbackStrategy.getFallbackData(endpoint, fallbackType);
      }
    }

    // Default fallback logic
    const key = this.endpointToKey(endpoint);
    return fallbackManager.getFallbackData(key, 'default');
  }

  /**
   * Converts endpoint to cache key
   */
  private endpointToKey(endpoint: string): string {
    // Extract meaningful key from endpoint
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }

  /**
   * Records error in history
   */
  private recordError(error: ApiError, context: ErrorContext): void {
    this.errorHistory.push({
      error,
      context,
      timestamp: new Date()
    });

    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Triggers alert for critical errors
   */
  private triggerAlert(error: ApiError, context: ErrorContext): void {
    console.error('CRITICAL ERROR ALERT:', {
      type: error.type,
      message: error.message,
      endpoint: context.endpoint,
      component: context.component,
      timestamp: new Date().toISOString()
    });

    // In a real application, this would send alerts to monitoring systems
    // For now, we'll just log to console
  }

  /**
   * Registers default error handlers
   */
  private registerDefaultHandlers(): void {
    // Network error handler
    this.registerErrorType(ApiErrorType.NETWORK, {
      canHandle: (error) => error.type === ApiErrorType.NETWORK,
      handle: async (error, context) => {
        const shouldRetry = retryController.shouldRetry(error, context.retryCount);
        
        return {
          handled: true,
          userMessage: 'Connection issue detected. ' + (shouldRetry ? 'Retrying...' : 'Please try again later.'),
          shouldRetry,
          requiresUserAction: false,
          fallbackData: shouldRetry ? null : await this.getFallbackData(context.endpoint)
        };
      },
      getPriority: () => 100
    });

    // Authentication error handler
    this.registerErrorType(ApiErrorType.AUTH, {
      canHandle: (error) => error.type === ApiErrorType.AUTH,
      handle: async (error, context) => {
        try {
          await tokenManager.handleTokenError(error);
          return {
            handled: true,
            userMessage: 'Authentication refreshed. Please try your request again.',
            shouldRetry: true,
            requiresUserAction: false
          };
        } catch {
          return {
            handled: true,
            userMessage: 'Please log in to continue.',
            shouldRetry: false,
            requiresUserAction: true
          };
        }
      },
      getPriority: () => 200
    });

    // Parsing error handler
    this.registerErrorType(ApiErrorType.PARSING, {
      canHandle: (error) => error.type === ApiErrorType.PARSING,
      handle: async (error, context) => {
        const fallbackData = await this.getFallbackData(context.endpoint);
        
        return {
          handled: true,
          userMessage: 'Received unexpected response format.' + (fallbackData ? ' Using cached data.' : ''),
          shouldRetry: false,
          requiresUserAction: false,
          fallbackData
        };
      },
      getPriority: () => 150
    });
  }
}

// Singleton instance
export const apiErrorHandler = new ApiErrorHandler();