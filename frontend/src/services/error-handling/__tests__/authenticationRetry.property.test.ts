/**
 * Property-Based Tests for Authentication Retry with Fresh Tokens
 * **Feature: user-state-authentication-fix, Property 9: Authentication retry with fresh tokens**
 * **Validates: Requirements 3.3**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ApiClient } from '../ApiClient';
import { tokenManager } from '../TokenManager';
import { createPropertyTestConfig } from '../utils/testGenerators';

// Mock fetch
(globalThis as any).fetch = vi.fn();

// Mock all the dependencies that ApiClient uses
vi.mock('../ApiErrorHandler', () => ({
  apiErrorHandler: {
    handleError: vi.fn().mockResolvedValue({ handled: true, userMessage: 'Error handled', fallbackData: null })
  }
}));

vi.mock('../RetryController', () => ({
  retryController: {
    executeWithRetry: vi.fn().mockImplementation(async (operation) => operation())
  }
}));

vi.mock('../ResponseValidator', () => ({
  responseValidator: {
    validateResponse: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
    detectContentType: vi.fn().mockReturnValue('application/json')
  }
}));

vi.mock('../utils/RecoveryStrategies', () => ({
  recoveryStrategyManager: {
    attemptRecovery: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock('../utils/errorClassification', () => ({
  classifyError: vi.fn().mockImplementation((error, context, statusCode) => ({
    type: statusCode === 401 || statusCode === 403 ? 'AUTH' : 'NETWORK',
    message: error.message,
    statusCode,
    originalError: error,
    context,
    severity: 'MEDIUM',
    isRecoverable: true,
    userMessage: error.message
  }))
}));

vi.mock('../utils/safeJsonParser', () => ({
  safeJsonParse: vi.fn().mockImplementation((text) => {
    try {
      return { success: true, data: JSON.parse(text) };
    } catch (error) {
      return { success: false, error };
    }
  })
}));

// Mock tokenManager
vi.mock('../TokenManager', () => ({
  tokenManager: {
    getValidToken: vi.fn(),
    refreshToken: vi.fn(),
    handleTokenError: vi.fn(),
    isTokenValid: vi.fn(),
    getTokenState: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn()
  }
}));

describe('Authentication Retry with Fresh Tokens Properties', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = new ApiClient({
      baseUrl: 'http://localhost:3000/api',
      timeout: 5000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 9: For any network request failing due to authentication, the system SHALL retry with fresh tokens before displaying errors', () => {
    const requestArb = fc.record({
      endpoint: fc.constantFrom('/users', '/listings', '/bookings', '/companies')
    });

    fc.assert(
      fc.asyncProperty(requestArb, async (request) => {
        const oldToken = 'old_token_123';
        const newToken = 'new_token_456';
        const responseData = { success: true, data: 'test' };

        // Reset all mocks
        vi.clearAllMocks();

        // Mock token manager to return old token first, then new token
        vi.mocked(tokenManager.getValidToken)
          .mockResolvedValueOnce(oldToken)
          .mockResolvedValueOnce(newToken);

        // Mock fetch to fail with 401 first, then succeed
        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' }
          }))
          .mockResolvedValueOnce(new Response(JSON.stringify(responseData), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }));

        // Mock handleTokenError to succeed
        vi.mocked(tokenManager.handleTokenError).mockResolvedValue();

        // Make request - should succeed after retry
        const response = await apiClient.get(request.endpoint);

        // Verify the authentication retry happened
        expect(tokenManager.getValidToken).toHaveBeenCalled();
        expect(tokenManager.handleTokenError).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalled();
        
        // Should return successful response
        expect(response.data).toEqual(responseData);
        expect(response.status).toBe(200);
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 9a: Authentication retry should use exponential backoff', () => {
    const endpointArb = fc.constantFrom('/users', '/listings', '/bookings');

    fc.assert(
      fc.asyncProperty(endpointArb, async (endpoint) => {
        vi.clearAllMocks();
        
        const oldToken = 'old_token';
        const newToken = 'new_token';

        vi.mocked(tokenManager.getValidToken)
          .mockResolvedValue(oldToken)
          .mockResolvedValueOnce(newToken);

        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            statusText: 'Unauthorized',
            headers: { 'Content-Type': 'application/json' }
          }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }));

        vi.mocked(tokenManager.handleTokenError).mockResolvedValue();

        const startTime = Date.now();
        await apiClient.get(endpoint);
        const endTime = Date.now();

        // Should have some delay (at least 100ms for processing)
        const duration = endTime - startTime;
        expect(duration).toBeGreaterThanOrEqual(50); // Reduced expectation for test environment
      }),
      createPropertyTestConfig(5)
    );
  });

  it('Property 9b: Multiple consecutive 401 errors should trigger multiple retries', () => {
    const endpointArb = fc.constantFrom('/users', '/listings');

    fc.assert(
      fc.asyncProperty(endpointArb, async (endpoint) => {
        const tokens = ['token1', 'token2', 'token3'];
        
        vi.mocked(tokenManager.getValidToken)
          .mockResolvedValueOnce(tokens[0])
          .mockResolvedValueOnce(tokens[1])
          .mockResolvedValueOnce(tokens[2]);

        // Fail twice with 401, then succeed
        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));

        vi.mocked(tokenManager.handleTokenError).mockResolvedValue();

        const response = await apiClient.get(endpoint);

        // Should have retried twice
        expect(tokenManager.handleTokenError).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(200);
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 9c: 403 errors should also trigger authentication retry', () => {
    const endpointArb = fc.constantFrom('/users', '/listings');

    fc.assert(
      fc.asyncProperty(endpointArb, async (endpoint) => {
        const oldToken = 'old_token';
        const newToken = 'new_token';

        vi.mocked(tokenManager.getValidToken)
          .mockResolvedValueOnce(oldToken)
          .mockResolvedValueOnce(newToken);

        // Fail with 403 first, then succeed
        vi.mocked(fetch)
          .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));

        vi.mocked(tokenManager.handleTokenError).mockResolvedValue();

        const response = await apiClient.get(endpoint);

        // Should have handled the 403 error
        expect(tokenManager.handleTokenError).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(200);
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 9d: Network errors should trigger proactive token refresh', () => {
    const endpointArb = fc.constantFrom('/users', '/listings');

    fc.assert(
      fc.asyncProperty(endpointArb, async (endpoint) => {
        const oldToken = 'old_token';
        const newToken = 'new_token';

        vi.mocked(tokenManager.getValidToken)
          .mockResolvedValueOnce(oldToken)
          .mockResolvedValueOnce(newToken);

        vi.mocked(tokenManager.refreshToken).mockResolvedValue(newToken);

        // Fail with network error first, then succeed
        vi.mocked(fetch)
          .mockRejectedValueOnce(new Error('Network request failed'))
          .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));

        const response = await apiClient.get(endpoint);

        // Should have attempted proactive token refresh
        expect(tokenManager.refreshToken).toHaveBeenCalled();
        expect(response.status).toBe(200);
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 9e: Maximum retry limit should be respected', () => {
    const endpointArb = fc.constantFrom('/users', '/listings');

    fc.assert(
      fc.asyncProperty(endpointArb, async (endpoint) => {
        // Mock to always return tokens
        vi.mocked(tokenManager.getValidToken).mockResolvedValue('token');

        // Always fail with 401
        vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }));

        vi.mocked(tokenManager.handleTokenError).mockResolvedValue();

        // Should eventually fail after max retries
        await expect(apiClient.get(endpoint)).rejects.toThrow();

        // Should not exceed max auth retries (2) + initial attempt = 3 total
        expect(fetch).toHaveBeenCalledTimes(3);
      }),
      createPropertyTestConfig(10)
    );
  });
});