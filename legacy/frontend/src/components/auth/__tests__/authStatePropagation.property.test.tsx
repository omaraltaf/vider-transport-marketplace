/**
 * Property-Based Test: Authentication state propagation
 * **Feature: user-state-authentication-fix, Property 2: Authentication state propagation**
 * **Validates: Requirements 1.2, 2.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { UserStateGuard } from '../UserStateGuard';
import { useEnhancedAuth, type User, type AuthContextValue } from '../../../contexts/EnhancedAuthContext';

// Mock the enhanced auth context
const mockAuthContext = vi.fn<[], Partial<AuthContextValue>>();

vi.mock('../../../contexts/EnhancedAuthContext', async () => {
  const actual = await vi.importActual('../../../contexts/EnhancedAuthContext');
  return {
    ...actual,
    useEnhancedAuth: () => mockAuthContext(),
  };
});

// Test components that consume auth state
const AuthStateDisplay = ({ testId }: { testId: string }) => {
  const { user, isLoading, isAuthenticated } = useEnhancedAuth();
  
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-user-id`}>{user?.id || 'no-user'}</span>
      <span data-testid={`${testId}-role`}>{user?.role || 'no-role'}</span>
      <span data-testid={`${testId}-loading`}>{isLoading.toString()}</span>
      <span data-testid={`${testId}-authenticated`}>{isAuthenticated.toString()}</span>
    </div>
  );
};

const MultipleConsumers = () => {
  return (
    <div>
      <AuthStateDisplay testId="consumer-1" />
      <AuthStateDisplay testId="consumer-2" />
      <AuthStateDisplay testId="consumer-3" />
    </div>
  );
};

// Generators for property-based testing
const userGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
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

const authErrorGenerator = fc.record({
  type: fc.constantFrom('NETWORK', 'UNAUTHORIZED', 'FORBIDDEN', 'TOKEN_EXPIRED', 'UNKNOWN'),
  message: fc.string({ minLength: 1, maxLength: 100 }),
  retryable: fc.boolean(),
});

describe('Property Test: Authentication state propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should propagate user state consistently to all consuming components', () => {
    fc.assert(
      fc.property(
        userGenerator,
        (user) => {
          // Skip invalid user data
          if (!user.id.trim() || !user.email.trim()) {
            return;
          }

          mockAuthContext.mockReturnValue({
            user,
            isLoading: false,
            isAuthenticated: true,
            error: null,
            token: 'mock-token',
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

          const { unmount } = render(<MultipleConsumers />);

          try {
            // All consumers should show the same user data
            expect(screen.getByTestId('consumer-1-user-id')).toHaveTextContent(user.id.trim());
            expect(screen.getByTestId('consumer-2-user-id')).toHaveTextContent(user.id.trim());
            expect(screen.getByTestId('consumer-3-user-id')).toHaveTextContent(user.id.trim());

            // All consumers should show the same role
            expect(screen.getByTestId('consumer-1-role')).toHaveTextContent(user.role);
            expect(screen.getByTestId('consumer-2-role')).toHaveTextContent(user.role);
            expect(screen.getByTestId('consumer-3-role')).toHaveTextContent(user.role);

            // All consumers should show the same authentication state
            expect(screen.getByTestId('consumer-1-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('consumer-2-authenticated')).toHaveTextContent('true');
            expect(screen.getByTestId('consumer-3-authenticated')).toHaveTextContent('true');
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should propagate loading state consistently to all consuming components', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.option(userGenerator),
        (isLoading, user) => {
          mockAuthContext.mockReturnValue({
            user,
            isLoading,
            isAuthenticated: !isLoading && !!user,
            error: null,
            token: user ? 'mock-token' : null,
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

          const { unmount } = render(<MultipleConsumers />);

          try {
            // All consumers should show the same loading state
            expect(screen.getByTestId('consumer-1-loading')).toHaveTextContent(isLoading.toString());
            expect(screen.getByTestId('consumer-2-loading')).toHaveTextContent(isLoading.toString());
            expect(screen.getByTestId('consumer-3-loading')).toHaveTextContent(isLoading.toString());
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should propagate authentication state changes consistently', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.option(userGenerator),
        (isAuthenticated, user) => {
          // Skip cases where authentication state doesn't match user presence
          if (isAuthenticated && !user) {
            return;
          }

          mockAuthContext.mockReturnValue({
            user: isAuthenticated ? user : null,
            isLoading: false,
            isAuthenticated,
            error: null,
            token: isAuthenticated ? 'mock-token' : null,
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

          const { unmount } = render(<MultipleConsumers />);

          try {
            // All consumers should show the same authentication state
            expect(screen.getByTestId('consumer-1-authenticated')).toHaveTextContent(isAuthenticated.toString());
            expect(screen.getByTestId('consumer-2-authenticated')).toHaveTextContent(isAuthenticated.toString());
            expect(screen.getByTestId('consumer-3-authenticated')).toHaveTextContent(isAuthenticated.toString());

            // All consumers should show consistent user data
            const expectedUserId = isAuthenticated && user ? user.id : 'no-user';
            const expectedRole = isAuthenticated && user ? user.role : 'no-role';

            expect(screen.getByTestId('consumer-1-user-id')).toHaveTextContent(expectedUserId);
            expect(screen.getByTestId('consumer-2-user-id')).toHaveTextContent(expectedUserId);
            expect(screen.getByTestId('consumer-3-user-id')).toHaveTextContent(expectedUserId);

            expect(screen.getByTestId('consumer-1-role')).toHaveTextContent(expectedRole);
            expect(screen.getByTestId('consumer-2-role')).toHaveTextContent(expectedRole);
            expect(screen.getByTestId('consumer-3-role')).toHaveTextContent(expectedRole);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should propagate role changes immediately to all components', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        fc.constantFrom('USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN'),
        (role1, role2) => {
          // Skip if roles are the same
          if (role1 === role2) {
            return;
          }

          const user1 = { id: 'test-user', email: 'test@test.com', role: role1, companyId: 'test-company' };
          const user2 = { id: 'test-user', email: 'test@test.com', role: role2, companyId: 'test-company' };

          // First render with role1
          mockAuthContext.mockReturnValue({
            user: user1,
            isLoading: false,
            isAuthenticated: true,
            error: null,
            token: 'mock-token',
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

          const { rerender, unmount } = render(<MultipleConsumers />);

          try {
            // All consumers should show role1
            expect(screen.getByTestId('consumer-1-role')).toHaveTextContent(role1);
            expect(screen.getByTestId('consumer-2-role')).toHaveTextContent(role1);
            expect(screen.getByTestId('consumer-3-role')).toHaveTextContent(role1);

            // Update to role2
            mockAuthContext.mockReturnValue({
              user: user2,
              isLoading: false,
              isAuthenticated: true,
              error: null,
              token: 'mock-token',
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

            rerender(<MultipleConsumers />);

            // All consumers should now show role2
            expect(screen.getByTestId('consumer-1-role')).toHaveTextContent(role2);
            expect(screen.getByTestId('consumer-2-role')).toHaveTextContent(role2);
            expect(screen.getByTestId('consumer-3-role')).toHaveTextContent(role2);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});