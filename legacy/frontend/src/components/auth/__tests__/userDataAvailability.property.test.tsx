/**
 * Property-Based Test: User data availability before rendering
 * **Feature: user-state-authentication-fix, Property 1: User data availability before rendering**
 * **Validates: Requirements 1.1, 2.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { UserStateGuard } from '../UserStateGuard';
import { EnhancedAuthProvider, type User, type AuthContextValue } from '../../../contexts/EnhancedAuthContext';

// Mock the enhanced auth context
const mockAuthContext = vi.fn<[], Partial<AuthContextValue>>();

vi.mock('../../../contexts/EnhancedAuthContext', async () => {
  const actual = await vi.importActual('../../../contexts/EnhancedAuthContext');
  return {
    ...actual,
    useEnhancedAuth: () => mockAuthContext(),
  };
});

// Test component that requires user data
const TestComponent = ({ userId }: { userId?: string }) => {
  return (
    <div data-testid="test-component">
      <span data-testid="user-id">{userId || 'no-user'}</span>
    </div>
  );
};

// Generators for property-based testing
const userGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
  companyId: fc.string({ minLength: 1, maxLength: 50 }),
  profile: fc.option(fc.record({
    firstName: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
    lastName: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
  })),
  permissions: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 })),
});

const authStateGenerator = fc.record({
  user: fc.option(userGenerator),
  isLoading: fc.boolean(),
  isAuthenticated: fc.boolean(),
  error: fc.option(fc.record({
    type: fc.constantFrom('NETWORK', 'UNAUTHORIZED', 'FORBIDDEN', 'TOKEN_EXPIRED', 'UNKNOWN'),
    message: fc.string({ minLength: 1, maxLength: 100 }),
    retryable: fc.boolean(),
  })),
  token: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
  lastUpdated: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
});

describe('Property Test: User data availability before rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render children when user data is required but not available', () => {
    fc.assert(
      fc.property(
        authStateGenerator,
        (authState) => {
          // Only test cases where authentication is required but user is not available
          const shouldHaveUser = authState.isAuthenticated && !authState.isLoading && !authState.error;
          if (!shouldHaveUser || authState.user) {
            return; // Skip this test case
          }

          mockAuthContext.mockReturnValue({
            ...authState,
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
          });

          const { container, unmount } = render(
            <UserStateGuard requireAuth={true}>
              <TestComponent userId="test-user-123" />
            </UserStateGuard>
          );

          try {
            // Should not render the test component when user data is not available
            expect(screen.queryByTestId('test-component')).toBeNull();
            
            // Should show loading or error state instead
            const hasLoadingOrError = container.textContent?.includes('Loading') || 
                                     container.textContent?.includes('Authentication') ||
                                     container.textContent?.includes('Error');
            expect(hasLoadingOrError).toBe(true);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should render children only when user data is available and valid', () => {
    fc.assert(
      fc.property(
        userGenerator,
        fc.string({ minLength: 10, maxLength: 200 }),
        (user, token) => {
          // Skip invalid user data (empty strings, etc.)
          if (!user.id.trim() || !user.email.trim()) {
            return;
          }

          mockAuthContext.mockReturnValue({
            user,
            isLoading: false,
            isAuthenticated: true,
            error: null,
            token,
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
          });

          const { unmount } = render(
            <UserStateGuard requireAuth={true}>
              <TestComponent userId={user.id} />
            </UserStateGuard>
          );

          try {
            // Should render the test component when user data is available
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.getByTestId('user-id')).toHaveTextContent(user.id.trim());
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should show loading state when authentication is in progress', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.option(userGenerator),
        (isAuthenticated, user) => {
          mockAuthContext.mockReturnValue({
            user,
            isLoading: true, // Always loading
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
          });

          const { container, unmount } = render(
            <UserStateGuard requireAuth={true}>
              <TestComponent />
            </UserStateGuard>
          );

          try {
            // Should not render the test component when loading
            expect(screen.queryByTestId('test-component')).toBeNull();
            
            // Should show loading state
            expect(container.textContent?.includes('Loading')).toBe(true);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle error states gracefully without rendering children', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('NETWORK', 'UNAUTHORIZED', 'FORBIDDEN', 'TOKEN_EXPIRED', 'UNKNOWN'),
          message: fc.string({ minLength: 1, maxLength: 100 }),
          retryable: fc.boolean(),
        }),
        fc.option(userGenerator),
        (error, user) => {
          mockAuthContext.mockReturnValue({
            user,
            isLoading: false,
            isAuthenticated: false,
            error,
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
          });

          const { container, unmount } = render(
            <UserStateGuard requireAuth={true}>
              <TestComponent />
            </UserStateGuard>
          );

          try {
            // Should not render the test component when there's an error
            expect(screen.queryByTestId('test-component')).toBeNull();
            
            // Should show error state
            const hasError = container.textContent?.includes('Error') || 
                             container.textContent?.includes('Authentication');
            expect(hasError).toBe(true);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect requireAuth=false and render children regardless of auth state', () => {
    fc.assert(
      fc.property(
        authStateGenerator,
        (authState) => {
          // Skip cases with errors or loading when requireAuth is false - the component should still show error/loading UI
          if (authState.error || authState.isLoading) {
            return;
          }

          mockAuthContext.mockReturnValue({
            ...authState,
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
          });

          const { unmount } = render(
            <UserStateGuard requireAuth={false}>
              <TestComponent userId="test-user" />
            </UserStateGuard>
          );

          try {
            // Should always render children when requireAuth is false and no error
            expect(screen.getByTestId('test-component')).toBeInTheDocument();
            expect(screen.getByTestId('user-id')).toHaveTextContent('test-user');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});