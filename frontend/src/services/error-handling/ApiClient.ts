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

    // Create the request operation
    const requestOperation = async (): Promise<ApiResponse<T>> => {
      return this.executeRequest<T>(fullUrl, options, context);
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
   * Executes the actual HTTP request
   */
  private async executeRequest<T>(
    url: string, 
    options: ApiRequestOptions, 
    context: ErrorContext
  ): Promise<ApiResponse<T>> {
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
      
      // Classify and throw the error for retry controller to handle
      const apiError = classifyError(error as Error, context);
      throw apiError;
    }
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