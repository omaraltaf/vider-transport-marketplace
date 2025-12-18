/**
 * Error Recovery Strategies
 * Implements various recovery strategies for different error types
 */

import type { IRecoveryStrategy } from '../interfaces';
import type { ApiError, ErrorContext, ErrorResponse, RecoveryType } from '../../../types/error.types';
import { ApiErrorType } from '../../../types/error.types';
import { tokenManager } from '../TokenManager';
import { fallbackManager } from '../FallbackManager';
import { retryController } from '../RetryController';

export class NetworkRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    return error.type === ApiErrorType.NETWORK && error.isRecoverable;
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    const shouldRetry = retryController.shouldRetry(error, context.retryCount);
    
    if (shouldRetry) {
      return {
        handled: true,
        userMessage: 'Connection issue detected. Retrying...',
        shouldRetry: true,
        requiresUserAction: false
      };
    }

    // Use fallback data if available
    const fallbackData = await this.getFallback(error);
    
    return {
      handled: true,
      fallbackData,
      userMessage: fallbackData ? 
        'Using cached data due to connection issues.' :
        'Connection problem. Please check your internet and try again.',
      shouldRetry: false,
      requiresUserAction: !fallbackData
    };
  }

  async getFallback(error: ApiError): Promise<unknown> {
    const endpoint = error.context?.endpoint || '';
    const key = this.endpointToKey(endpoint);
    return fallbackManager.getFallbackData(key, 'cached');
  }

  getRecoveryType(): string {
    return 'network_retry_with_fallback';
  }

  private endpointToKey(endpoint: string): string {
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }
}

export class AuthRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    return error.type === ApiErrorType.AUTH && error.statusCode === 401;
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    try {
      // Attempt token refresh
      await tokenManager.handleTokenError(error);
      
      return {
        handled: true,
        userMessage: 'Authentication refreshed. Please try your request again.',
        shouldRetry: true,
        requiresUserAction: false,
        recoveryType: RecoveryType.REFRESH_TOKEN
      };
    } catch (refreshError) {
      return {
        handled: true,
        userMessage: 'Please log in to continue.',
        shouldRetry: false,
        requiresUserAction: true,
        recoveryType: RecoveryType.REDIRECT
      };
    }
  }

  async getFallback(error: ApiError): Promise<unknown> {
    // No fallback for auth errors - user must authenticate
    return null;
  }

  getRecoveryType(): string {
    return 'auth_refresh_or_redirect';
  }
}

export class ParsingRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    return error.type === ApiErrorType.PARSING;
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    // Parsing errors are usually not recoverable through retry
    // Use fallback data instead
    const fallbackData = await this.getFallback(error);
    
    return {
      handled: true,
      fallbackData,
      userMessage: fallbackData ?
        'Received unexpected response format. Using cached data.' :
        'Received unexpected response format. Please try again.',
      shouldRetry: false,
      requiresUserAction: !fallbackData,
      recoveryType: RecoveryType.USE_CACHE
    };
  }

  async getFallback(error: ApiError): Promise<unknown> {
    const endpoint = error.context?.endpoint || '';
    const key = this.endpointToKey(endpoint);
    
    // Try cached first, then mock, then empty state
    return fallbackManager.getFallbackData(key, 'cached') ||
           fallbackManager.getFallbackData(key, 'mock') ||
           fallbackManager.getFallbackData(key, 'empty_state');
  }

  getRecoveryType(): string {
    return 'parsing_fallback';
  }

  private endpointToKey(endpoint: string): string {
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }
}

export class ServerRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    return error.type === ApiErrorType.SERVER && error.isRecoverable;
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    const shouldRetry = retryController.shouldRetry(error, context.retryCount);
    
    if (shouldRetry) {
      // Calculate delay for exponential backoff
      const delay = retryController.calculateDelay(context.retryCount + 1, {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [ApiErrorType.SERVER],
        timeoutMs: 10000
      });
      
      return {
        handled: true,
        userMessage: `Server error. Retrying in ${Math.round(delay / 1000)} seconds...`,
        shouldRetry: true,
        requiresUserAction: false,
        retryAfter: delay,
        recoveryType: RecoveryType.RETRY
      };
    }

    // Use fallback if no more retries
    const fallbackData = await this.getFallback(error);
    
    return {
      handled: true,
      fallbackData,
      userMessage: fallbackData ?
        'Server temporarily unavailable. Using cached data.' :
        'Server temporarily unavailable. Please try again later.',
      shouldRetry: false,
      requiresUserAction: !fallbackData,
      recoveryType: RecoveryType.USE_CACHE
    };
  }

  async getFallback(error: ApiError): Promise<unknown> {
    const endpoint = error.context?.endpoint || '';
    const key = this.endpointToKey(endpoint);
    return fallbackManager.getFallbackData(key, 'default');
  }

  getRecoveryType(): string {
    return 'server_retry_with_fallback';
  }

  private endpointToKey(endpoint: string): string {
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }
}

export class TimeoutRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    return error.type === ApiErrorType.TIMEOUT;
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    const shouldRetry = context.retryCount < 2; // Limit timeout retries
    
    if (shouldRetry) {
      return {
        handled: true,
        userMessage: 'Request timed out. Trying again with extended timeout...',
        shouldRetry: true,
        requiresUserAction: false,
        recoveryType: RecoveryType.RETRY
      };
    }

    const fallbackData = await this.getFallback(error);
    
    return {
      handled: true,
      fallbackData,
      userMessage: fallbackData ?
        'Request timed out. Using cached data.' :
        'Request timed out. Please try again.',
      shouldRetry: false,
      requiresUserAction: !fallbackData,
      recoveryType: RecoveryType.USE_CACHE
    };
  }

  async getFallback(error: ApiError): Promise<unknown> {
    const endpoint = error.context?.endpoint || '';
    const key = this.endpointToKey(endpoint);
    return fallbackManager.getFallbackData(key, 'cached');
  }

  getRecoveryType(): string {
    return 'timeout_retry_with_fallback';
  }

  private endpointToKey(endpoint: string): string {
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }
}

/**
 * Recovery Strategy Manager
 * Manages and coordinates different recovery strategies
 */
export class RecoveryStrategyManager {
  private strategies: IRecoveryStrategy[] = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Registers a recovery strategy
   */
  registerStrategy(strategy: IRecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Attempts recovery for an error
   */
  async attemptRecovery(error: ApiError, context: ErrorContext): Promise<ErrorResponse | null> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          return await strategy.recover(error, context);
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.getRecoveryType()} failed:`, recoveryError);
          continue;
        }
      }
    }
    
    return null; // No suitable recovery strategy found
  }

  /**
   * Gets all available recovery strategies
   */
  getAvailableStrategies(): string[] {
    return this.strategies.map(strategy => strategy.getRecoveryType());
  }

  /**
   * Registers default recovery strategies
   */
  private registerDefaultStrategies(): void {
    this.registerStrategy(new AuthRecoveryStrategy());
    this.registerStrategy(new NetworkRecoveryStrategy());
    this.registerStrategy(new ServerRecoveryStrategy());
    this.registerStrategy(new TimeoutRecoveryStrategy());
    this.registerStrategy(new ParsingRecoveryStrategy());
  }
}

// Singleton instance
export const recoveryStrategyManager = new RecoveryStrategyManager();