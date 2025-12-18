/**
 * Retry Controller Service
 * Manages retry logic with exponential backoff and circuit breaker patterns
 */

import type { IRetryController } from './interfaces';
import type { ApiError, RetryConfig, CircuitBreakerState } from '../../types/error.types';
import { ApiErrorType } from '../../types/error.types';
import { defaultRetryConfig } from './config/defaultConfig';

export class RetryController implements IRetryController {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly defaultConfig: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.defaultConfig = { ...defaultRetryConfig, ...config };
  }

  /**
   * Executes an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.defaultConfig
  ): Promise<T> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
      try {
        // Check circuit breaker before attempting
        const circuitKey = this.getCircuitKey(operation);
        if (this.isCircuitOpen(circuitKey)) {
          throw new Error('Circuit breaker is open - too many failures');
        }

        // Execute with timeout
        const result = await this.executeWithTimeout(operation, mergedConfig.timeoutMs);
        
        // Success - reset circuit breaker
        this.recordSuccess(circuitKey);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Record failure for circuit breaker
        const circuitKey = this.getCircuitKey(operation);
        this.recordFailure(circuitKey);
        
        // Check if we should retry
        if (attempt === mergedConfig.maxAttempts) {
          break; // Last attempt, don't retry
        }
        
        const apiError = this.convertToApiError(lastError);
        if (!this.shouldRetry(apiError, attempt)) {
          break; // Error is not retryable
        }
        
        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, mergedConfig);
        await this.sleep(delay);
      }
    }
    
    // All retries failed
    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Determines if an error should trigger a retry
   */
  shouldRetry(error: ApiError, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.defaultConfig.maxAttempts) {
      return false;
    }
    
    // Check if error type is retryable
    if (!this.defaultConfig.retryableErrors.includes(error.type)) {
      return false;
    }
    
    // Don't retry client errors (4xx except 401, 408, 429)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const retryableClientErrors = [401, 408, 429];
      return retryableClientErrors.includes(error.statusCode);
    }
    
    return true;
  }

  /**
   * Calculates delay for exponential backoff
   */
  calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, config.maxDelay);
  }

  /**
   * Gets circuit breaker state for an endpoint
   */
  getCircuitBreakerState(endpoint: string): CircuitBreakerState {
    return this.circuitBreakers.get(endpoint) || {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
      successCount: 0
    };
  }

  /**
   * Executes operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Converts generic error to ApiError
   */
  private convertToApiError(error: Error): ApiError {
    // If it's already an ApiError, return as-is
    if ('type' in error && 'context' in error) {
      return error as ApiError;
    }

    // Determine error type based on error characteristics
    let type = ApiErrorType.UNKNOWN;
    let statusCode: number | undefined;

    if (error.message.includes('timeout')) {
      type = ApiErrorType.TIMEOUT;
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      type = ApiErrorType.NETWORK;
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      type = ApiErrorType.PARSING;
    }

    return {
      type,
      message: error.message,
      statusCode,
      originalError: error,
      context: {
        endpoint: 'unknown',
        method: 'unknown',
        component: 'RetryController',
        timestamp: new Date(),
        retryCount: 0
      },
      severity: 'MEDIUM',
      isRecoverable: true
    } as ApiError;
  }

  /**
   * Gets circuit breaker key for an operation
   */
  private getCircuitKey(operation: () => Promise<unknown>): string {
    // Use function name or a default key
    return operation.name || 'default';
  }

  /**
   * Checks if circuit breaker is open
   */
  private isCircuitOpen(key: string): boolean {
    const circuit = this.circuitBreakers.get(key);
    if (!circuit || circuit.state === 'CLOSED') {
      return false;
    }

    if (circuit.state === 'OPEN') {
      // Check if we should transition to half-open
      const now = new Date();
      if (circuit.nextAttemptTime && now >= circuit.nextAttemptTime) {
        circuit.state = 'HALF_OPEN';
        circuit.successCount = 0;
        this.circuitBreakers.set(key, circuit);
        return false;
      }
      return true;
    }

    // HALF_OPEN state - allow limited requests
    return false;
  }

  /**
   * Records a successful operation
   */
  private recordSuccess(key: string): void {
    const circuit = this.getCircuitBreakerState(key);
    
    if (circuit.state === 'HALF_OPEN') {
      circuit.successCount++;
      if (circuit.successCount >= 3) { // 3 successful requests to close
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        circuit.lastFailureTime = null;
        circuit.nextAttemptTime = null;
      }
    } else if (circuit.state === 'CLOSED') {
      circuit.failureCount = Math.max(0, circuit.failureCount - 1); // Gradually reduce failure count
    }
    
    this.circuitBreakers.set(key, circuit);
  }

  /**
   * Records a failed operation
   */
  private recordFailure(key: string): void {
    const circuit = this.getCircuitBreakerState(key);
    const now = new Date();
    
    circuit.failureCount++;
    circuit.lastFailureTime = now;
    
    // Open circuit if failure threshold exceeded
    if (circuit.failureCount >= 5) { // 5 failures to open
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = new Date(now.getTime() + 60000); // 1 minute timeout
    } else if (circuit.state === 'HALF_OPEN') {
      // Failed in half-open state, go back to open
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = new Date(now.getTime() + 60000);
    }
    
    this.circuitBreakers.set(key, circuit);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resets circuit breaker for a specific key
   */
  resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }

  /**
   * Gets all circuit breaker states
   */
  getAllCircuitStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Creates a retry wrapper for a specific function
   */
  createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    config?: Partial<RetryConfig>
  ): T {
    const retryConfig = { ...this.defaultConfig, ...config };
    
    return ((...args: Parameters<T>) => {
      return this.executeWithRetry(() => fn(...args), retryConfig);
    }) as T;
  }
}

// Singleton instance
export const retryController = new RetryController();