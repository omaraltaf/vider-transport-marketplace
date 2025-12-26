/**
 * Error Recovery Strategies
 * Implements various recovery strategies for different error types
 */

import type { IRecoveryStrategy } from '../interfaces';
import type { ApiError, ErrorContext, ErrorResponse } from '../../../types/error.types';
import { ApiErrorType, RecoveryType, FallbackType } from '../../../types/error.types';
import { tokenManager } from '../TokenManager';
import { fallbackManager } from '../FallbackManager';
import { retryController } from '../RetryController';
import { corruptedStateRecovery } from './CorruptedStateRecovery';

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
    return fallbackManager.getFallbackData(key, FallbackType.CACHED);
  }

  getRecoveryType(error: ApiError): string {
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

  getRecoveryType(error: ApiError): string {
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
    return fallbackManager.getFallbackData(key, FallbackType.CACHED) ||
           fallbackManager.getFallbackData(key, FallbackType.MOCK) ||
           fallbackManager.getFallbackData(key, FallbackType.EMPTY_STATE);
  }

  getRecoveryType(error: ApiError): string {
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
    return fallbackManager.getFallbackData(key, FallbackType.DEFAULT);
  }

  getRecoveryType(error: ApiError): string {
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
    return fallbackManager.getFallbackData(key, FallbackType.CACHED);
  }

  getRecoveryType(error: ApiError): string {
    return 'timeout_retry_with_fallback';
  }

  private endpointToKey(endpoint: string): string {
    if (endpoint.includes('moderation')) return 'moderationStats';
    if (endpoint.includes('users')) return 'userStats';
    if (endpoint.includes('health')) return 'systemHealth';
    return 'generic';
  }
}

export class CorruptedStateRecoveryStrategy implements IRecoveryStrategy {
  canRecover(error: ApiError): boolean {
    // This strategy handles state corruption errors
    return error.type === ApiErrorType.UNKNOWN && 
           (error.message.includes('corrupted') || 
            error.message.includes('invalid state') ||
            error.message.includes('parse') ||
            error.context?.component === 'auth');
  }

  async recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    try {
      // Attempt to detect and recover from corrupted state
      // Note: In a real scenario, we'd need access to current auth state
      // For now, we'll trigger a recovery check
      const recoveryStats = corruptedStateRecovery.getRecoveryStats();
      
      if (recoveryStats.isSessionOnly) {
        return {
          handled: true,
          userMessage: 'Running in session-only mode due to storage issues. Some features may be limited.',
          shouldRetry: false,
          requiresUserAction: false,
          recoveryType: RecoveryType.SHOW_FALLBACK
        };
      }

      // If we've had too many recovery attempts, suggest full reset
      if (recoveryStats.recoveryAttempts >= 3) {
        return {
          handled: true,
          userMessage: 'Authentication state corruption detected. Please log out and log back in.',
          shouldRetry: false,
          requiresUserAction: true,
          recoveryType: RecoveryType.REDIRECT
        };
      }

      // Suggest a retry for minor corruption
      return {
        handled: true,
        userMessage: 'Authentication state issue detected. Attempting recovery...',
        shouldRetry: true,
        requiresUserAction: false,
        recoveryType: RecoveryType.RETRY
      };
    } catch (recoveryError) {
      console.error('Corrupted state recovery failed:', recoveryError);
      
      return {
        handled: true,
        userMessage: 'Authentication system error. Please refresh the page or log in again.',
        shouldRetry: false,
        requiresUserAction: true,
        recoveryType: RecoveryType.REDIRECT
      };
    }
  }

  async getFallback(error: ApiError): Promise<unknown> {
    // For corrupted state, we don't have meaningful fallback data
    // The recovery is handled through the authentication system
    return null;
  }

  getRecoveryType(error: ApiError): string {
    return 'corrupted_state_recovery';
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
          console.warn(`Recovery strategy ${strategy.getRecoveryType(error)} failed:`, recoveryError);
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
    // Create a dummy error for getting strategy types
    const dummyError: ApiError = {
      type: ApiErrorType.UNKNOWN,
      message: 'dummy',
      originalError: new Error('dummy'),
      context: {
        endpoint: '',
        method: 'GET',
        component: 'test',
        timestamp: new Date(),
        retryCount: 0
      },
      severity: 'LOW' as any,
      isRecoverable: false,
      userMessage: 'dummy'
    };
    return this.strategies.map(strategy => strategy.getRecoveryType(dummyError));
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
    this.registerStrategy(new CorruptedStateRecoveryStrategy());
  }
}

// Singleton instance
export const recoveryStrategyManager = new RecoveryStrategyManager();