/**
 * Enhanced API Client with Comprehensive Error Handling
 * Provides a unified interface for all API calls with built-in error handling, retry logic, and fallback strategies
 */

import { tokenManager } from './TokenManager';
import { apiErrorHandler } from './ApiErrorHandler';
import { retryController } from './RetryController';
import { responseValidator } from './ResponseValidator';
import { recoveryStrategyManager } from './utils/RecoveryStrategies';
import { classifyError } from './utils/errorClassification';
import { safeJsonParse } from './utils/safeJsonParser';
import type { ApiError, ErrorContext, RetryConfig } from '../../types/error.types';

export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  enableFallback?: boolean;
  enableRecovery?: boolean;
}

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  fallbackKey?: string;
  skipErrorHandling?: boolean;
  component?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  fromCache?: boolean;
  recoveryUsed?: boolean;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;
  
  // Circuit breaker state for repeated failures
  private circuitBreaker: Map<string, {
    failureCount: number;
    lastFailureTime: Date | null;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    nextAttemptTime: Date | null;
  }> = new Map();
  
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before opening circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute before trying again
  private readonly CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT = 30000; // 30 seconds in half-open state

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 10000,
      retryConfig: config.retryConfig || {},
      enableFallback: config.enableFallback ?? true,
      enableRecovery: config.enableRecovery ?? true
    };
  }

  /**
   * Makes a GET request with comprehensive error handling
   */
  async get<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Makes a POST request with comprehensive error handling
   */
  async post<T = unknown>(url: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * Makes a PUT request with comprehensive error handling
   */
  async put<T = unknown>(url: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * Makes a DELETE request with comprehensive error handling
   */
  async delete<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * Makes a PATCH request with comprehensive error handling
   */
  async patch<T = unknown>(url: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * Core request method with comprehensive error handling
   */
  async request<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const context: ErrorContext = {
      endpoint: fullUrl,
      method: options.method || 'GET',
      component: options.component || 'ApiClient',
      timestamp: new Date(),
      retryCount: 0
    };

    // Check circuit breaker
    const circuitKey = this.getCircuitBreakerKey(fullUrl, context.method);
    if (!this.canMakeRequest(circuitKey)) {
      const circuitError = new Error(`Circuit breaker is open for ${circuitKey}. Too many recent failures.`);
      const apiError = classifyError(circuitError, context, 503);
      throw apiError;
    }

    // Create the request operation
    const requestOperation = async (): Promise<ApiResponse<T>> => {
      try {
        const response = await this.executeRequest<T>(fullUrl, options, context);
        // Record success for circuit breaker
        this.recordSuccess(circuitKey);
        return response;
      } catch (error) {
        // Record failure for circuit breaker
        this.recordFailure(circuitKey);
        throw error;
      }
    };

    // Execute with retry logic if not disabled
    if (!options.skipErrorHandling) {
      const retryConfig: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [],
        timeoutMs: this.config.timeout,
        ...this.config.retryConfig,
        ...options.retryConfig
      };
      
      try {
        return await retryController.executeWithRetry(requestOperation, retryConfig);
      } catch (error) {
        // Handle the error through our error handling system
        return this.handleRequestError<T>(error as Error, context, options);
      }
    } else {
      return requestOperation();
    }
  }

  /**
   * Executes the actual HTTP request with authentication retry logic
   */
  private async executeRequest<T>(
    url: string, 
    options: ApiRequestOptions, 
    context: ErrorContext
  ): Promise<ApiResponse<T>> {
    return this.executeRequestWithAuthRetry<T>(url, options, context, 0);
  }

  /**
   * Executes HTTP request with automatic authentication retry logic
   */
  private async executeRequestWithAuthRetry<T>(
    url: string, 
    options: ApiRequestOptions, 
    context: ErrorContext,
    authRetryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const maxAuthRetries = 2; // Maximum number of authentication retries
    
    // Get valid token
    let token: string | null = null;
    try {
      token = await tokenManager.getValidToken();
    } catch (tokenError) {
      // Handle token error
      const apiError = classifyError(tokenError as Error, context);
      throw apiError;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Execute request with timeout
    const timeoutMs = options.timeout || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for authentication errors and retry with fresh token
      if ((response.status === 401 || response.status === 403) && authRetryCount < maxAuthRetries) {
        console.log(`Authentication error (${response.status}), attempting retry ${authRetryCount + 1}/${maxAuthRetries}`);
        
        try {
          // Handle token error to refresh token
          const authError = classifyError(
            new Error(`Authentication failed: ${response.status}`), 
            context, 
            response.status
          );
          await tokenManager.handleTokenError(authError);
          
          // Retry with fresh token after exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, authRetryCount), 5000); // Max 5 seconds
          await this.sleep(backoffDelay);
          
          return this.executeRequestWithAuthRetry<T>(url, options, context, authRetryCount + 1);
        } catch (tokenRefreshError) {
          console.error('Token refresh failed during auth retry:', tokenRefreshError);
          // If token refresh fails, proceed with original error handling
        }
      }

      // Validate response
      const validationResult = await responseValidator.validateResponse(response);
      
      if (!validationResult.isValid) {
        const validationError = new Error(`Response validation failed: ${validationResult.errors[0]?.message}`);
        const apiError = classifyError(validationError, context, response.status);
        throw apiError;
      }

      // Parse response data
      let data: T;
      const contentType = responseValidator.detectContentType(response);
      
      if (contentType === 'application/json') {
        const responseText = await response.text();
        const parseResult = safeJsonParse<T>(responseText);
        
        if (!parseResult.success) {
          const parseError = parseResult.error || new Error('JSON parsing failed');
          const apiError = classifyError(parseError, context, response.status);
          throw apiError;
        }
        
        data = parseResult.data!;
      } else {
        data = (await response.text()) as unknown as T;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      // For network errors, check if we should retry with fresh token
      if (error instanceof Error && error.name !== 'AbortError' && authRetryCount < maxAuthRetries) {
        // Check if this might be a token-related network error
        if (error.message.includes('fetch') || error.message.includes('network')) {
          console.log(`Network error during request, attempting auth retry ${authRetryCount + 1}/${maxAuthRetries}`);
          
          try {
            // Try to refresh token proactively
            await tokenManager.refreshToken();
            
            // Retry with fresh token after exponential backoff
            const backoffDelay = Math.min(1000 * Math.pow(2, authRetryCount), 5000);
            await this.sleep(backoffDelay);
            
            return this.executeRequestWithAuthRetry<T>(url, options, context, authRetryCount + 1);
          } catch (tokenRefreshError) {
            console.error('Proactive token refresh failed:', tokenRefreshError);
            // Continue with original error handling
          }
        }
      }
      
      // Classify and throw the error for retry controller to handle
      const apiError = classifyError(error as Error, context);
      throw apiError;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets circuit breaker key for an endpoint
   */
  private getCircuitBreakerKey(url: string, method: string): string {
    // Extract base path without query parameters for circuit breaker grouping
    const urlObj = new URL(url);
    return `${method}:${urlObj.pathname}`;
  }

  /**
   * Checks if circuit breaker allows the request
   */
  private canMakeRequest(key: string): boolean {
    const circuit = this.circuitBreaker.get(key);
    if (!circuit) return true;

    const now = new Date();

    switch (circuit.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (circuit.nextAttemptTime && now >= circuit.nextAttemptTime) {
          // Transition to half-open
          circuit.state = 'HALF_OPEN';
          circuit.nextAttemptTime = new Date(now.getTime() + this.CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT);
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Records a successful request for circuit breaker
   */
  private recordSuccess(key: string): void {
    const circuit = this.circuitBreaker.get(key);
    if (circuit) {
      if (circuit.state === 'HALF_OPEN') {
        // Success in half-open state, close the circuit
        circuit.state = 'CLOSED';
        circuit.failureCount = 0;
        circuit.lastFailureTime = null;
        circuit.nextAttemptTime = null;
      } else if (circuit.state === 'CLOSED') {
        // Reset failure count on success
        circuit.failureCount = Math.max(0, circuit.failureCount - 1);
      }
    }
  }

  /**
   * Records a failed request for circuit breaker
   */
  private recordFailure(key: string): void {
    const now = new Date();
    let circuit = this.circuitBreaker.get(key);
    
    if (!circuit) {
      circuit = {
        failureCount: 0,
        lastFailureTime: null,
        state: 'CLOSED',
        nextAttemptTime: null
      };
      this.circuitBreaker.set(key, circuit);
    }

    circuit.failureCount++;
    circuit.lastFailureTime = now;

    if (circuit.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      // Open the circuit
      circuit.state = 'OPEN';
      circuit.nextAttemptTime = new Date(now.getTime() + this.CIRCUIT_BREAKER_TIMEOUT);
      console.warn(`Circuit breaker opened for ${key} after ${circuit.failureCount} failures`);
    }
  }

  /**
   * Gets circuit breaker state for monitoring
   */
  getCircuitBreakerState(endpoint: string): {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: Date | null;
    nextAttemptTime: Date | null;
  } | null {
    const circuit = this.circuitBreaker.get(endpoint);
    return circuit ? { ...circuit } : null;
  }

  /**
   * Handles request errors through the error handling system
   */
  private async handleRequestError<T>(
    error: Error, 
    context: ErrorContext, 
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const apiError = 'type' in error ? (error as unknown as ApiError) : classifyError(error, context);
    
    // Try recovery first if enabled
    if (this.config.enableRecovery) {
      const recoveryResponse = await recoveryStrategyManager.attemptRecovery(apiError, context);
      
      if (recoveryResponse && recoveryResponse.handled) {
        if (recoveryResponse.shouldRetry) {
          // Retry the request
          context.retryCount++;
          return this.executeRequest<T>(context.endpoint, options, context);
        }
        
        if (recoveryResponse.fallbackData) {
          // Return fallback data
          return {
            data: recoveryResponse.fallbackData as T,
            status: 200,
            statusText: 'OK (Fallback)',
            headers: new Headers(),
            fromCache: true,
            recoveryUsed: true
          };
        }
      }
    }

    // Handle through main error handler
    const errorResponse = await apiErrorHandler.handleError(apiError, context);
    
    if (errorResponse.fallbackData) {
      return {
        data: errorResponse.fallbackData as T,
        status: 200,
        statusText: 'OK (Fallback)',
        headers: new Headers(),
        fromCache: true
      };
    }

    // If no fallback available, throw the original error
    throw new Error(errorResponse.userMessage);
  }

  /**
   * Builds full URL from base URL and path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Creates a wrapper for a specific API endpoint
   */
  createEndpointWrapper<T = unknown>(
    endpoint: string,
    defaultOptions: ApiRequestOptions = {}
  ) {
    return {
      get: (options?: ApiRequestOptions) => 
        this.get<T>(endpoint, { ...defaultOptions, ...options }),
      
      post: (data?: unknown, options?: ApiRequestOptions) => 
        this.post<T>(endpoint, data, { ...defaultOptions, ...options }),
      
      put: (data?: unknown, options?: ApiRequestOptions) => 
        this.put<T>(endpoint, data, { ...defaultOptions, ...options }),
      
      delete: (options?: ApiRequestOptions) => 
        this.delete<T>(endpoint, { ...defaultOptions, ...options }),
      
      patch: (data?: unknown, options?: ApiRequestOptions) => 
        this.patch<T>(endpoint, data, { ...defaultOptions, ...options })
    };
  }

  /**
   * Updates client configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): ApiClientConfig {
    return { ...this.config };
  }
}

// Create default API client instance
export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  enableFallback: true,
  enableRecovery: true
});

// Export convenience methods
export const api = {
  get: <T = unknown>(url: string, options?: ApiRequestOptions) => apiClient.get<T>(url, options),
  post: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) => apiClient.post<T>(url, data, options),
  put: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) => apiClient.put<T>(url, data, options),
  delete: <T = unknown>(url: string, options?: ApiRequestOptions) => apiClient.delete<T>(url, options),
  patch: <T = unknown>(url: string, data?: unknown, options?: ApiRequestOptions) => apiClient.patch<T>(url, data, options)
};