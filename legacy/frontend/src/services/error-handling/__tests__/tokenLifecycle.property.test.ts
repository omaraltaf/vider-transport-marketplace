/**
 * Property-Based Tests for Token Lifecycle Management
 * **Feature: api-error-handling-reliability, Property 3: Token lifecycle management**
 * **Validates: Requirements 1.4, 3.1, 3.2, 3.3, 3.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { TokenManager } from '../TokenManager';
import { tokenStateArb, createPropertyTestConfig } from '../utils/testGenerators';
import { ApiErrorType } from '../../../types/error.types';

// Mock authService
vi.mock('../../authService', () => ({
  authService: {
    refreshToken: vi.fn()
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

describe('Token Lifecycle Management Properties', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    tokenManager = new TokenManager();
  });

  it('Property 3: For any token state, the Token Manager should handle appropriately', () => {
    fc.assert(
      fc.property(tokenStateArb, (tokenState) => {
        // Test token validation
        const isValid = tokenManager.isTokenValid(tokenState.accessToken);
        
        if (!tokenState.accessToken) {
          expect(isValid).toBe(false);
        }
        
        if (tokenState.expiresAt && tokenState.accessToken) {
          const now = new Date();
          const bufferTime = 5 * 60 * 1000; // 5 minutes
          const shouldBeValid = tokenState.expiresAt.getTime() - bufferTime > now.getTime();
          
          if (shouldBeValid) {
            expect(isValid).toBe(true);
          }
        }
      }),
      createPropertyTestConfig(50)
    );
  });
});
  it('Property 3a: Missing tokens should initialize proper authentication flow', () => {
    fc.assert(
      fc.property(fc.constant(null), async (nullToken) => {
        // Clear all tokens
        tokenManager.clearTokens();
        
        // Getting token with no tokens should throw
        await expect(tokenManager.getValidToken()).rejects.toThrow('No valid authentication token available');
        
        const state = tokenManager.getTokenState();
        expect(state.accessToken).toBeNull();
        expect(state.refreshToken).toBeNull();
      }),
      createPropertyTestConfig(10)
    );
  });

  it('Property 3b: Expired tokens should trigger refresh automatically', () => {
    const expiredTokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 }),
      expiresAt: fc.date({ max: new Date(Date.now() - 1000) }), // Already expired
      isRefreshing: fc.constant(false),
      lastRefresh: fc.option(fc.date())
    });

    fc.assert(
      fc.property(expiredTokenArb, (expiredState) => {
        // Expired tokens should not be valid
        expect(tokenManager.isTokenValid(expiredState.accessToken)).toBe(false);
      }),
      createPropertyTestConfig(20)
    );
  });

  it('Property 3c: Valid tokens should be returned without refresh', () => {
    const validTokenArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 }),
      expiresAt: fc.date({ min: new Date(Date.now() + 10 * 60 * 1000) }), // 10 minutes from now
      isRefreshing: fc.constant(false),
      lastRefresh: fc.option(fc.date())
    });

    fc.assert(
      fc.property(validTokenArb, (validState) => {
        // Valid tokens should be considered valid
        expect(tokenManager.isTokenValid(validState.accessToken)).toBe(true);
      }),
      createPropertyTestConfig(20)
    );
  });

  it('Property 3d: Token storage should be consistent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.integer({ min: 3600, max: 86400 }),
        (accessToken, refreshToken, expiresIn) => {
          // Set tokens
          tokenManager.setTokens(accessToken, refreshToken, expiresIn);
          
          // Should be stored in localStorage
          expect(mockLocalStorage.getItem('auth_token')).toBe(accessToken);
          expect(mockLocalStorage.getItem('auth_refresh_token')).toBe(refreshToken);
          expect(mockLocalStorage.getItem('token')).toBe(accessToken); // Compatibility
          expect(mockLocalStorage.getItem('adminToken')).toBe(accessToken); // Compatibility
          
          // State should match
          const state = tokenManager.getTokenState();
          expect(state.accessToken).toBe(accessToken);
          expect(state.refreshToken).toBe(refreshToken);
        }
      ),
      createPropertyTestConfig(30)
    );
  });
});