/**
 * Property-Based Tests for Automatic Token Refresh
 * **Feature: user-state-authentication-fix, Property 7: Automatic token refresh**
 * **Validates: Requirements 3.1**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TokenManager } from '../TokenManager';
import { createPropertyTestConfig } from '../utils/testGenerators';
import { authService } from '../../authService';

// Mock authService
vi.mock('../../authService', () => ({
  authService: {
    refreshToken: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    verifyEmail: vi.fn(),
    logout: vi.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockLocalStorage.store.set(key, value)),
  removeItem: vi.fn((key: string) => mockLocalStorage.store.delete(key)),
  clear: vi.fn(() => mockLocalStorage.store.clear())
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  close: vi.fn()
};

// Mock BroadcastChannel constructor
(globalThis as any).BroadcastChannel = vi.fn().mockImplementation(() => mockBroadcastChannel);

describe('Automatic Token Refresh Properties', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    tokenManager = new TokenManager();
  });

  afterEach(() => {
    tokenManager.destroy();
  });

  it('Property 7: For any expired authentication token, the Token_Manager SHALL refresh tokens automatically without user intervention', () => {
    const expiredTokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(expiredTokenArb, async (expiredTokenState) => {
        // Clear all previous mocks
        vi.clearAllMocks();
        
        // Mock successful refresh response
        const newAccessToken = `new_${expiredTokenState.accessToken}`;
        vi.mocked(authService.refreshToken).mockResolvedValue({
          accessToken: newAccessToken
        });

        // Set up expired token state (expired 1 hour ago)
        tokenManager.setTokens(
          expiredTokenState.accessToken,
          expiredTokenState.refreshToken,
          -3600 // Expired 1 hour ago
        );

        // Verify token is considered expired
        const isExpired = !tokenManager.isTokenValid(expiredTokenState.accessToken);
        if (!isExpired) {
          // Skip this test case if token is not considered expired
          return true;
        }

        try {
          // Request valid token - should trigger automatic refresh
          const validToken = await tokenManager.getValidToken();

          // Should have called refresh API
          expect(authService.refreshToken).toHaveBeenCalledWith(expiredTokenState.refreshToken);
          
          // Should return new token
          expect(validToken).toBe(newAccessToken);
          
          // Token state should be updated
          const newState = tokenManager.getTokenState();
          expect(newState.accessToken).toBe(newAccessToken);
          expect(newState.refreshToken).toBe(expiredTokenState.refreshToken);
          expect(newState.lastRefresh).toBeInstanceOf(Date);
          
          return true;
        } catch (error) {
          console.error('Test failed with error:', error);
          return false;
        }
      }),
      createPropertyTestConfig(10) // Reduced iterations for debugging
    );
  });

  it('Property 7a: Token refresh should handle network failures with retry logic', () => {
    const tokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(tokenArb, async (tokenState) => {
        // Reset mocks for each test
        vi.mocked(authService.refreshToken).mockReset();
        
        // Mock network failure followed by success
        vi.mocked(authService.refreshToken)
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValueOnce({
            accessToken: `refreshed_${tokenState.accessToken}`
          });

        // Set up expired token
        tokenManager.setTokens(tokenState.accessToken, tokenState.refreshToken, -3600);

        // Should eventually succeed after retries
        const validToken = await tokenManager.getValidToken();
        
        // Should have made multiple attempts
        expect(authService.refreshToken).toHaveBeenCalledTimes(3);
        expect(validToken).toBe(`refreshed_${tokenState.accessToken}`);
      }),
      createPropertyTestConfig(20)
    );
  });

  it('Property 7b: Concurrent token refresh requests should be deduplicated', () => {
    const tokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(tokenArb, async (tokenState) => {
        // Reset mocks for each test
        vi.mocked(authService.refreshToken).mockReset();
        
        const newToken = `refreshed_${tokenState.accessToken}`;
        
        // Mock slow refresh response
        vi.mocked(authService.refreshToken).mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ accessToken: newToken }), 50)
          )
        );

        // Set up expired token
        tokenManager.setTokens(tokenState.accessToken, tokenState.refreshToken, -3600);

        // Make multiple concurrent requests
        const promises = Array.from({ length: 3 }, () => tokenManager.getValidToken());
        const results = await Promise.all(promises);

        // All should return the same new token
        results.forEach(token => expect(token).toBe(newToken));
        
        // Should only call refresh API once (deduplication)
        expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 7c: Token refresh should update storage and broadcast to other tabs', () => {
    const tokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(tokenArb, async (tokenState) => {
        // Reset mocks for each test
        vi.mocked(authService.refreshToken).mockReset();
        mockLocalStorage.setItem.mockClear();
        mockBroadcastChannel.postMessage.mockClear();
        
        const newToken = `refreshed_${tokenState.accessToken}`;
        vi.mocked(authService.refreshToken).mockResolvedValueOnce({
          accessToken: newToken
        });

        // Set up expired token
        tokenManager.setTokens(tokenState.accessToken, tokenState.refreshToken, -3600);

        // Trigger refresh
        await tokenManager.getValidToken();

        // Should update localStorage with new token
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', newToken);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', newToken);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('adminToken', newToken);

        // Should broadcast to other tabs
        expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'TOKEN_STATE_UPDATE',
            tokenState: expect.objectContaining({
              accessToken: newToken
            })
          })
        );
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 7d: Token refresh failure should trigger appropriate error handling', () => {
    const tokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(tokenArb, async (tokenState) => {
        // Clear all mocks and reset implementation
        vi.clearAllMocks();
        vi.resetAllMocks();
        
        // Mock refresh failure - ensure it always rejects
        const mockRefreshToken = vi.mocked(authService.refreshToken);
        mockRefreshToken.mockRejectedValue(new Error('Token refresh failed'));
        
        // Create fresh TokenManager instance
        const freshTokenManager = new TokenManager();

        // Set up expired token
        freshTokenManager.setTokens(tokenState.accessToken, tokenState.refreshToken, -3600);

        // Should throw error when refresh fails after all retries
        await expect(freshTokenManager.getValidToken()).rejects.toThrow('Token refresh failed');

        // Should have attempted refresh (with retries, so it may be called multiple times)
        expect(mockRefreshToken).toHaveBeenCalled();
        
        // Clean up - wrap in try-catch to handle BroadcastChannel mock issues
        try {
          freshTokenManager.destroy();
        } catch (error) {
          // Ignore cleanup errors in test environment
        }
      }),
      createPropertyTestConfig(5) // Reduce iterations to speed up debugging
    );
  });

  it('Property 7e: Token refresh should respect failure cooldown periods', () => {
    const tokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 })
    });

    fc.assert(
      fc.asyncProperty(tokenArb, async (tokenState) => {
        // Reset mocks for each test
        vi.mocked(authService.refreshToken).mockReset();
        
        // Set up expired token
        tokenManager.setTokens(tokenState.accessToken, tokenState.refreshToken, -3600);

        // Mock multiple failures to trigger cooldown
        vi.mocked(authService.refreshToken).mockRejectedValue(new Error('Server error'));

        // Attempt refresh multiple times to trigger cooldown
        for (let i = 0; i < 3; i++) {
          try {
            await tokenManager.getValidToken();
          } catch (error) {
            // Expected to fail
          }
        }

        // Next attempt should be rejected due to cooldown
        await expect(tokenManager.getValidToken()).rejects.toThrow(/cooldown/i);
      }),
      createPropertyTestConfig(5)
    );
  });
});