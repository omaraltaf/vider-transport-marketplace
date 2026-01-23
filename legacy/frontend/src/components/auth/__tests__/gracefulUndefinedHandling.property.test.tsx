/**
 * Property-Based Test: Graceful undefined/null handling
 * **Feature: user-state-authentication-fix, Property 3: Graceful undefined/null handling**
 * **Validates: Requirements 1.3, 2.2**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { UserStateGuard } from '../UserStateGuard';
import type { AuthContextValue } from '../../../contexts/EnhancedAuthContext';

// Mock the enhanced auth context
vi.mock('../../../contexts/EnhancedAuthContext', () => ({
  useEnhancedAuth: vi.fn(),
}));

import { useEnhancedAuth } from '../../../contexts/EnhancedAuthContext';
const mockUseEnhancedAuth = vi.mocked(useEnhancedAuth);

// Test component that accesses user properties
const UserPropertyAccessComponent = ({ testId }: { testId: string }) => {
  const { user, isLoading, isAuthenticated } = mockUseEnhancedAuth();
  
  // This component should handle undefined/null user gracefully
  const userId = user?.id || 'no-user';
  const userEmail = user?.email || 'no-email';
  const userRole = user?.role || 'no-role';
  const companyId = user?.companyId || 'no-company';
  const firstName = user?.profile?.firstName || 'no-first-name';
  const permissions = user?.permissions?.join(',') || 'no-permissions';
  
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-user-id`}>{userId}</span>
      <span data-testid={`${testId}-email`}>{userEmail}</span>
      <span data-testid={`${testId}-role`}>{userRole}</span>
      <span data-testid={`${testId}-company`}>{companyId}</span>
      <span data-testid={`${testId}-first-name`}>{firstName}</span>
      <span data-testid={`${testId}-permissions`}>{permissions}</span>
      <span data-testid={`${testId}-loading`}>{isLoading.toString()}</span>
      <span data-testid={`${testId}-authenticated`}>{isAuthenticated.toString()}</span>
    </div>
  );
};

describe('Property Test: Graceful undefined/null handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle null user gracefully without throwing runtime errors', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isLoading, isAuthenticated) => {
          const mockAuthValue: Partial<AuthContextValue> = {
            user: null,
            isLoading,
            isAuthenticated,
            error: null,
            token: null,
            lastUpdated: Date.now(),
            refreshUser: vi.fn(),
            clearError: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            refreshAccessToken: vi.fn(),
            clearPasswordChangeRequirement: vi.fn(),
            getValidToken: vi.fn(),
            handleTokenError: vi.fn(),
            isTokenValid: vi.fn(),
            requiresPasswordChange: false,
            refreshToken: null,
          };

          mockUseEnhancedAuth.mockReturnValue(mockAuthValue as AuthContextValue);

          const { unmount } = render(<UserPropertyAccessComponent testId="null-user-test" />);

          try {
            // Component should render without throwing errors
            expect(screen.getByTestId('null-user-test')).toBeInTheDocument();
            
            // Should show fallback values for null user
            expect(screen.getByTestId('null-user-test-user-id')).toHaveTextContent('no-user');
            expect(screen.getByTestId('null-user-test-email')).toHaveTextContent('no-email');
            expect(screen.getByTestId('null-user-test-role')).toHaveTextContent('no-role');
            expect(screen.getByTestId('null-user-test-company')).toHaveTextContent('no-company');
            expect(screen.getByTestId('null-user-test-first-name')).toHaveTextContent('no-first-name');
            expect(screen.getByTestId('null-user-test-permissions')).toHaveTextContent('no-permissions');
            
            // Should still show correct loading and auth states
            expect(screen.getByTestId('null-user-test-loading')).toHaveTextContent(isLoading.toString());
            expect(screen.getByTestId('null-user-test-authenticated')).toHaveTextContent(isAuthenticated.toString());
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle undefined user gracefully without throwing runtime errors', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (isLoading, isAuthenticated) => {
          const mockAuthValue: Partial<AuthContextValue> = {
            user: undefined,
            isLoading,
            isAuthenticated,
            error: null,
            token: null,
            lastUpdated: Date.now(),
            refreshUser: vi.fn(),
            clearError: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            refreshAccessToken: vi.fn(),
            clearPasswordChangeRequirement: vi.fn(),
            getValidToken: vi.fn(),
            handleTokenError: vi.fn(),
            isTokenValid: vi.fn(),
            requiresPasswordChange: false,
            refreshToken: null,
          };

          mockUseEnhancedAuth.mockReturnValue(mockAuthValue as AuthContextValue);

          const { unmount } = render(<UserPropertyAccessComponent testId="undefined-user-test" />);

          try {
            // Component should render without throwing errors
            expect(screen.getByTestId('undefined-user-test')).toBeInTheDocument();
            
            // Should show fallback values for undefined user
            expect(screen.getByTestId('undefined-user-test-user-id')).toHaveTextContent('no-user');
            expect(screen.getByTestId('undefined-user-test-email')).toHaveTextContent('no-email');
            expect(screen.getByTestId('undefined-user-test-role')).toHaveTextContent('no-role');
            expect(screen.getByTestId('undefined-user-test-company')).toHaveTextContent('no-company');
            expect(screen.getByTestId('undefined-user-test-first-name')).toHaveTextContent('no-first-name');
            expect(screen.getByTestId('undefined-user-test-permissions')).toHaveTextContent('no-permissions');
            
            // Should still show correct loading and auth states
            expect(screen.getByTestId('undefined-user-test-loading')).toHaveTextContent(isLoading.toString());
            expect(screen.getByTestId('undefined-user-test-authenticated')).toHaveTextContent(isAuthenticated.toString());
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle UserStateGuard with null/undefined user gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        fc.boolean(),
        fc.boolean(),
        (user, isLoading, isAuthenticated) => {
          const mockAuthValue: Partial<AuthContextValue> = {
            user,
            isLoading,
            isAuthenticated,
            error: null,
            token: null,
            lastUpdated: Date.now(),
            refreshUser: vi.fn(),
            clearError: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            refreshAccessToken: vi.fn(),
            clearPasswordChangeRequirement: vi.fn(),
            getValidToken: vi.fn(),
            handleTokenError: vi.fn(),
            isTokenValid: vi.fn(),
            requiresPasswordChange: false,
            refreshToken: null,
          };

          mockUseEnhancedAuth.mockReturnValue(mockAuthValue as AuthContextValue);

          const { container, unmount } = render(
            <UserStateGuard requireAuth={false}>
              <UserPropertyAccessComponent testId="guarded-test" />
            </UserStateGuard>
          );

          try {
            // Should not throw runtime errors regardless of user state
            // When requireAuth is false, component should render even with null/undefined user
            if (!isLoading) {
              expect(screen.getByTestId('guarded-test')).toBeInTheDocument();
            } else {
              // Should show loading state
              const hasLoading = container.textContent?.includes('Loading');
              expect(hasLoading).toBe(true);
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle deeply nested property access gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        (user) => {
          const DeepAccessComponent = () => {
            const { user } = mockUseEnhancedAuth();
            
            // Test deeply nested optional chaining
            const theme = user?.profile?.settings?.preferences?.theme || 'default-theme';
            const userId = user?.id || 'no-user';
            
            return (
              <div data-testid="deep-access-test">
                <span data-testid="theme">{theme}</span>
                <span data-testid="user-id">{userId}</span>
              </div>
            );
          };

          const mockAuthValue: Partial<AuthContextValue> = {
            user,
            isLoading: false,
            isAuthenticated: false,
            error: null,
            token: null,
            lastUpdated: Date.now(),
            refreshUser: vi.fn(),
            clearError: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            refreshAccessToken: vi.fn(),
            clearPasswordChangeRequirement: vi.fn(),
            getValidToken: vi.fn(),
            handleTokenError: vi.fn(),
            isTokenValid: vi.fn(),
            requiresPasswordChange: false,
            refreshToken: null,
          };

          mockUseEnhancedAuth.mockReturnValue(mockAuthValue as AuthContextValue);

          const { unmount } = render(<DeepAccessComponent />);

          try {
            // Should render without throwing errors
            expect(screen.getByTestId('deep-access-test')).toBeInTheDocument();
            
            // Should show fallback values for deeply nested properties
            expect(screen.getByTestId('theme')).toHaveTextContent('default-theme');
            expect(screen.getByTestId('user-id')).toHaveTextContent('no-user');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});