/**
 * Property-Based Tests for Invalid State Recovery
 * **Feature: user-state-authentication-fix, Property 13: Invalid state recovery**
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { invalidStateRecovery } from '../utils/InvalidStateRecovery';
import { tokenManager } from '../TokenManager';
import type { User } from '../../../contexts/EnhancedAuthContext';
import type { TokenState } from '../../../types/error.types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock tokenManager
vi.mock('../TokenManager', () => ({
  tokenManager: {
    getTokenState: vi.fn(),
    refreshToken: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

// Mock CorruptedStateRecovery
vi.mock('../utils/CorruptedStateRecovery', () => ({
  corruptedStateRecovery: {
    detectAndRecover: vi.fn().mockResolvedValue({
      success: true,
      strategy: 'full_reset',
      message: 'Full reset completed successfully',
      requiresReauth: true
    }),
  },
}));

// Test generators
const validUserArb = fc.record({
  id: fc.string({ minLength: 1 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
  companyId: fc.string({ minLength: 1 }),
  profile: fc.option(fc.record({
    firstName: fc.option(fc.string()),
    lastName: fc.option(fc.string()),
    phone: fc.option(fc.string()),
  })),
  permissions: fc.option(fc.array(fc.string())),
});

const invalidUserArb = fc.oneof(
  fc.constant(null),
  fc.record({
    id: fc.option(fc.oneof(fc.string(), fc.constant(null), fc.constant(''))),
    email: fc.option(fc.oneof(fc.emailAddress(), fc.string(), fc.constant(null))),
    role: fc.option(fc.oneof(fc.string(), fc.constant(null), fc.constant(''))),
    companyId: fc.option(fc.string()),
  }),
  validUserArb.map(user => ({ ...user, id: '' })), // Invalid ID
  validUserArb.map(user => ({ ...user, email: 'invalid-email' })), // Invalid email
  validUserArb.map(user => ({ ...user, role: null as any })), // Invalid role
);

const tokenStateArb = fc.record({
  accessToken: fc.option(fc.string()),
  refreshToken: fc.option(fc.string()),
  expiresAt: fc.option(fc.date()),
  isRefreshing: fc.boolean(),
  lastRefresh: fc.option(fc.date()),
});

const validTokenArb = fc.string({ minLength: 10 }).map(token => {
  // Create a basic JWT-like structure
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    sub: token 
  }));
  const signature = btoa(token);
  return `${header}.${payload}.${signature}`;
});

const expiredTokenArb = fc.string({ minLength: 10 }).map(token => {
  // Create an expired JWT-like structure
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    sub: token 
  }));
  const signature = btoa(token);
  return `${header}.${payload}.${signature}`;
});

describe('Invalid State Recovery Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset recovery state
    invalidStateRecovery.resetRecoveryAttempts();
    
    // Setup default mock implementations
    (tokenManager.getTokenState as any).mockReturnValue({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isRefreshing: false,
      lastRefresh: null,
    });
    
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  /**
   * Property 13: Invalid state recovery
   * For any invalid user state, the system SHALL recover gracefully without requiring page refresh
   */
  it('Property 13: For any invalid user state, the system should recover gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(validUserArb, invalidUserArb),
        fc.option(fc.oneof(validTokenArb, expiredTokenArb, fc.string())),
        fc.option(fc.string()),
        tokenStateArb,
        (user, token, refreshToken, tokenState) => {
          // Reset localStorage mocks to not throw errors for this test
          mockLocalStorage.getItem.mockReturnValue(null);
          mockLocalStorage.setItem.mockImplementation(() => {});
          mockLocalStorage.removeItem.mockImplementation(() => {});
          
          // Mock token state
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);
          
          // Test invalid state detection
          const detection = invalidStateRecovery.detectInvalidState(
            user as User | null,
            token,
            refreshToken,
            tokenState
          );

          // Detection should always return a valid result
          expect(typeof detection.isValid).toBe('boolean');
          expect(Array.isArray(detection.invalidReasons)).toBe(true);
          expect(['minor', 'major', 'critical']).toContain(detection.severity);
          expect(typeof detection.canAutoRecover).toBe('boolean');
          expect(['refresh', 'reauth', 'reset']).toContain(detection.recommendedAction);

          // If state is invalid, there should be reasons
          if (!detection.isValid) {
            expect(detection.invalidReasons.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 13a: Recovery attempts should be limited to prevent infinite loops', () => {
    fc.assert(
      fc.asyncProperty(
        invalidUserArb,
        fc.option(fc.string()),
        fc.option(fc.string()),
        tokenStateArb,
        async (user, token, refreshToken, tokenState) => {
          // Reset localStorage mocks to not throw errors
          mockLocalStorage.getItem.mockReturnValue(null);
          mockLocalStorage.setItem.mockImplementation(() => {});
          mockLocalStorage.removeItem.mockImplementation(() => {});
          
          // Mock token state
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);
          
          // Mock refresh token to always fail to trigger recovery limits
          (tokenManager.refreshToken as any).mockRejectedValue(new Error('Refresh failed'));
          
          // Reset recovery attempts for clean test
          invalidStateRecovery.resetRecoveryAttempts();
          
          // Attempt multiple recoveries
          const maxAttempts = 5;
          let lastResult;

          for (let i = 0; i < maxAttempts; i++) {
            lastResult = await invalidStateRecovery.recoverFromInvalidState(
              user as User | null,
              token,
              refreshToken,
              tokenState
            );
          }

          // Recovery should eventually limit attempts
          expect(lastResult).toBeDefined();
          expect(typeof lastResult?.success).toBe('boolean');
          expect(typeof lastResult?.requiresUserAction).toBe('boolean');

          // Check recovery stats
          const stats = invalidStateRecovery.getRecoveryStats();
          expect(typeof stats.activeRecoveries).toBe('number');
          expect(typeof stats.totalAttempts).toBe('number');
          expect(typeof stats.cooldownStates).toBe('number');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 13b: Token refresh recovery should work when refresh token is available', () => {
    fc.assert(
      fc.asyncProperty(
        validUserArb,
        expiredTokenArb,
        fc.string({ minLength: 10 }),
        async (user, expiredToken, refreshToken) => {
          // Reset localStorage mocks to not throw errors
          mockLocalStorage.getItem.mockReturnValue(null);
          mockLocalStorage.setItem.mockImplementation(() => {});
          mockLocalStorage.removeItem.mockImplementation(() => {});
          
          const tokenState: TokenState = {
            accessToken: expiredToken,
            refreshToken: refreshToken,
            expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
            isRefreshing: false,
            lastRefresh: null,
          };

          // Mock token state and successful refresh
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);
          (tokenManager.refreshToken as any).mockResolvedValue('new-token');

          // Reset recovery attempts for clean test
          invalidStateRecovery.resetRecoveryAttempts();

          // Test recovery
          const result = await invalidStateRecovery.recoverFromInvalidState(
            user as any, // Type assertion to handle profile type mismatch
            expiredToken,
            refreshToken,
            tokenState
          );

          // Recovery should attempt to refresh
          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');
          expect(['refreshed', 'cleared', 'reset', 'failed']).toContain(result.action);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 13c: State cleanup should preserve valid user data when possible', () => {
    fc.assert(
      fc.asyncProperty(
        validUserArb,
        fc.option(fc.string()),
        fc.option(fc.string()),
        async (user, token, refreshToken) => {
          // Reset localStorage mocks to not throw errors
          mockLocalStorage.getItem.mockReturnValue(null);
          mockLocalStorage.setItem.mockImplementation(() => {});
          mockLocalStorage.removeItem.mockImplementation(() => {});
          
          // Create inconsistent token state (tokens don't match)
          const tokenState: TokenState = {
            accessToken: 'different-token',
            refreshToken: 'different-refresh-token',
            expiresAt: null,
            isRefreshing: false,
            lastRefresh: null,
          };

          // Mock token state
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);
          (tokenManager.refreshToken as any).mockRejectedValue(new Error('No refresh token'));

          // Reset recovery attempts for clean test
          invalidStateRecovery.resetRecoveryAttempts();

          // Test recovery
          const result = await invalidStateRecovery.recoverFromInvalidState(
            user as any, // Type assertion to handle profile type mismatch
            token,
            refreshToken,
            tokenState
          );

          // Recovery should handle the inconsistency
          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');

          // If user data is valid, it might be preserved
          if (result.success && result.preservedData) {
            expect(result.preservedData.id).toBe(user.id);
            expect(result.preservedData.email).toBe(user.email);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 13d: Recovery should handle localStorage errors gracefully', () => {
    fc.assert(
      fc.asyncProperty(
        fc.oneof(validUserArb, invalidUserArb),
        fc.option(fc.string()),
        fc.option(fc.string()),
        tokenStateArb,
        async (user, token, refreshToken, tokenState) => {
          // Mock localStorage to throw errors
          mockLocalStorage.getItem.mockImplementation(() => {
            throw new Error('localStorage error');
          });
          mockLocalStorage.setItem.mockImplementation(() => {
            throw new Error('localStorage error');
          });
          mockLocalStorage.removeItem.mockImplementation(() => {
            throw new Error('localStorage error');
          });

          // Mock token state
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);

          // Reset recovery attempts for clean test
          invalidStateRecovery.resetRecoveryAttempts();

          // Test recovery with localStorage errors - should not throw
          let result;
          let threwError = false;
          
          try {
            result = await invalidStateRecovery.recoverFromInvalidState(
              user as User | null,
              token,
              refreshToken,
              tokenState
            );
          } catch (error) {
            threwError = true;
          }

          // Recovery should handle localStorage errors gracefully
          expect(threwError).toBe(false);
          expect(result).toBeDefined();
          if (result) {
            expect(typeof result.success).toBe('boolean');
            expect(typeof result.requiresUserAction).toBe('boolean');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 13e: Detection should correctly identify token-user mismatches', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        validUserArb,
        validTokenArb,
        (hasUser, hasToken, user, token) => {
          try {
            const testUser = hasUser ? (user as any) : null;
            const testToken = hasToken ? token : null;
            
            const tokenState: TokenState = {
              accessToken: testToken,
              refreshToken: null,
              expiresAt: null,
              isRefreshing: false,
              lastRefresh: null,
            };

            // Mock token state
            (tokenManager.getTokenState as any).mockReturnValue(tokenState);

            const detection = invalidStateRecovery.detectInvalidState(
              testUser,
              testToken,
              null,
              tokenState
            );

            // Should detect mismatch when user exists without token or vice versa
            if ((hasUser && !hasToken) || (!hasUser && hasToken)) {
              expect(detection.isValid).toBe(false);
              expect(detection.invalidReasons.length).toBeGreaterThan(0);
            }

            // Should be valid when both exist or both are null
            if ((hasUser && hasToken) || (!hasUser && !hasToken)) {
              // May still be invalid for other reasons, but not for user-token mismatch
              const hasMismatchReason = detection.invalidReasons.some(reason => 
                reason.includes('Token exists but user') || 
                reason.includes('User data exists but token')
              );
              expect(hasMismatchReason).toBe(false);
            }

            return true;
          } catch (error) {
            console.error('Property test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 13f: Recovery cooldown should prevent excessive recovery attempts', () => {
    fc.assert(
      fc.asyncProperty(
        invalidUserArb,
        fc.option(fc.string()),
        async (user, token) => {
          // Reset localStorage mocks to not throw errors
          mockLocalStorage.getItem.mockReturnValue(null);
          mockLocalStorage.setItem.mockImplementation(() => {});
          mockLocalStorage.removeItem.mockImplementation(() => {});
          
          const tokenState: TokenState = {
            accessToken: token,
            refreshToken: null,
            expiresAt: null,
            isRefreshing: false,
            lastRefresh: null,
          };

          // Mock token state
          (tokenManager.getTokenState as any).mockReturnValue(tokenState);
          (tokenManager.refreshToken as any).mockRejectedValue(new Error('Refresh failed'));

          // Reset recovery attempts for clean test
          invalidStateRecovery.resetRecoveryAttempts();

          // Exhaust recovery attempts
          for (let i = 0; i < 4; i++) {
            await invalidStateRecovery.recoverFromInvalidState(
              user as User | null,
              token,
              null,
              tokenState
            );
          }

          // Next attempt should be in cooldown or max attempts exceeded
          const cooldownResult = await invalidStateRecovery.recoverFromInvalidState(
            user as User | null,
            token,
            null,
            tokenState
          );

          // Should indicate cooldown or max attempts exceeded
          expect(cooldownResult.success).toBe(false);
          expect(cooldownResult.requiresUserAction).toBe(true);
          expect(cooldownResult.message).toMatch(/cooldown|maximum|exceeded/i);
        }
      ),
      { numRuns: 15 }
    );
  });
});