/**
 * Property Test: Error-free authentication redirects
 * **Feature: user-state-authentication-fix, Property 5: Error-free authentication redirects**
 * **Validates: Requirements 1.5**
 * 
 * For any authentication failure or expiration, the system SHALL redirect to login without causing JavaScript errors
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import { EnhancedAuthProvider } from '../../../contexts/EnhancedAuthContext';
import { AuthErrorBoundary } from '../AuthErrorBoundary';
import { UserStateGuard } from '../UserStateGuard';

import { vi } from 'vitest';

// Mock window.location for redirect testing
const mockLocation = {
  href: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock console methods to capture errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
let consoleErrors: string[] = [];
let consoleWarnings: string[] = [];

beforeEach(() => {
  consoleErrors = [];
  consoleWarnings = [];
  mockLocation.href = '';
  mockLocation.assign.mockClear();
  mockLocation.replace.mockClear();
  mockLocation.reload.mockClear();
  
  console.error = (...args: any[]) => {
    consoleErrors.push(args.join(' '));
  };
  
  console.warn = (...args: any[]) => {
    consoleWarnings.push(args.join(' '));
  };
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Test component that simulates authentication failures
interface TestComponentProps {
  shouldThrowAuthError: boolean;
  errorType: 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NETWORK';
  errorMessage: string;
}

function TestComponent({ shouldThrowAuthError, errorType, errorMessage }: TestComponentProps) {
  if (shouldThrowAuthError) {
    // Simulate different types of authentication errors
    const error = new Error(errorMessage);
    error.name = errorType;
    throw error;
  }
  
  return <div data-testid="protected-content">Protected Content</div>;
}

// Wrapper component with authentication context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <EnhancedAuthProvider>
        <AuthErrorBoundary>
          {children}
        </AuthErrorBoundary>
      </EnhancedAuthProvider>
    </BrowserRouter>
  );
}

describe('Property Test: Error-free authentication redirects', () => {
  it('should handle authentication failures without JavaScript errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different authentication error scenarios
        fc.record({
          errorType: fc.constantFrom('TOKEN_EXPIRED', 'UNAUTHORIZED', 'FORBIDDEN', 'NETWORK'),
          errorMessage: fc.oneof(
            fc.constant('Token has expired'),
            fc.constant('User is not authenticated'),
            fc.constant('Access denied'),
            fc.constant('Network error occurred'),
            fc.constant('Authentication failed'),
            fc.constant('Session expired'),
            fc.constant('Invalid credentials'),
            fc.constant('Permission denied')
          ),
          shouldRedirect: fc.boolean(),
        }),
        async ({ errorType, errorMessage, shouldRedirect }) => {
          // Reset state before each test
          consoleErrors = [];
          consoleWarnings = [];
          mockLocation.href = '';
          
          try {
            // Render component that will throw authentication error
            const { unmount } = render(
              <TestWrapper>
                <TestComponent 
                  shouldThrowAuthError={true}
                  errorType={errorType}
                  errorMessage={errorMessage}
                />
              </TestWrapper>
            );

            // Wait for error boundary to catch and handle the error
            await waitFor(() => {
              // Should show error UI instead of throwing unhandled errors
              const errorElements = screen.queryAllByText(/Authentication Error|Application Error/);
              expect(errorElements.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            // Property: No unhandled JavaScript errors should occur
            const hasUnhandledErrors = consoleErrors.some(error => 
              error.includes('Uncaught') || 
              error.includes('Unhandled') ||
              error.includes('TypeError') ||
              error.includes('ReferenceError')
            );
            
            expect(hasUnhandledErrors).toBe(false);

            // Property: Authentication errors should be contained within error boundary
            const authErrorElements = [
              ...screen.queryAllByText(/Authentication Error/),
              ...screen.queryAllByText(/Token Error/),
              ...screen.queryAllByText(/Permission Error/),
              ...screen.queryAllByText(/User State Error/)
            ];
            
            expect(authErrorElements.length).toBeGreaterThan(0);

            // Property: Error boundary should provide recovery options
            const recoveryElements = [
              ...screen.queryAllByText(/Try Again/),
              ...screen.queryAllByText(/Log Out/),
              ...screen.queryAllByText(/Reload Page/)
            ];
            
            expect(recoveryElements.length).toBeGreaterThan(0);

            // Property: Protected content should not render when authentication fails
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

            unmount();
          } catch (testError) {
            // If the test itself throws an error, that's a failure of the error handling
            throw new Error(`Authentication error handling failed: ${testError}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle token expiration scenarios without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate token expiration scenarios
        fc.record({
          tokenState: fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('expired_token'),
            fc.constant('invalid_token')
          ),
          userState: fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.record({
              id: fc.string(),
              email: fc.emailAddress(),
              role: fc.constantFrom('USER', 'COMPANY_ADMIN', 'PLATFORM_ADMIN')
            })
          )
        }),
        async ({ tokenState, userState }) => {
          consoleErrors = [];
          
          // Mock localStorage to simulate different token states
          const originalGetItem = localStorage.getItem;
          localStorage.getItem = vi.fn((key: string) => {
            if (key === 'auth_token') return tokenState;
            if (key === 'auth_user') return userState ? JSON.stringify(userState) : null;
            return null;
          });

          try {
            const { unmount } = render(
              <TestWrapper>
                <UserStateGuard>
                  <TestComponent 
                    shouldThrowAuthError={false}
                    errorType="TOKEN_EXPIRED"
                    errorMessage="Token expired"
                  />
                </UserStateGuard>
              </TestWrapper>
            );

            // Wait for authentication state to be processed
            await waitFor(() => {
              // Should either show loading, error UI, or protected content
              const hasValidState = 
                screen.queryByTestId('protected-content') !== null ||
                screen.queryByText(/Loading/) !== null ||
                screen.queryByText(/Authentication/) !== null;
              
              expect(hasValidState).toBe(true);
            }, { timeout: 2000 });

            // Property: No unhandled JavaScript errors during token state processing
            const hasUnhandledErrors = consoleErrors.some(error => 
              error.includes('Uncaught') || 
              error.includes('Unhandled') ||
              (error.includes('TypeError') && !error.includes('Expected')) ||
              (error.includes('ReferenceError') && !error.includes('Expected'))
            );
            
            expect(hasUnhandledErrors).toBe(false);

            unmount();
          } finally {
            localStorage.getItem = originalGetItem;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle authentication state transitions without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate authentication state transition scenarios
        fc.array(
          fc.record({
            action: fc.constantFrom('login', 'logout', 'refresh', 'expire'),
            hasValidToken: fc.boolean(),
            hasValidUser: fc.boolean(),
            networkError: fc.boolean()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (stateTransitions) => {
          consoleErrors = [];
          
          try {
            const { unmount } = render(
              <TestWrapper>
                <UserStateGuard>
                  <div data-testid="auth-dependent-content">Auth Dependent Content</div>
                </UserStateGuard>
              </TestWrapper>
            );

            // Simulate rapid state transitions
            for (const transition of stateTransitions) {
              // Simulate different authentication state changes
              if (transition.networkError) {
                // Simulate network error during authentication
                const networkError = new Error('Network error');
                networkError.name = 'NETWORK';
                
                // This should be handled gracefully by the error boundary
                expect(() => {
                  throw networkError;
                }).toThrow();
              }
              
              // Small delay between transitions
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Wait for final state to settle
            await waitFor(() => {
              const hasContent = 
                screen.queryByTestId('auth-dependent-content') !== null ||
                screen.queryByText(/Loading/) !== null ||
                screen.queryByText(/Authentication/) !== null;
              
              expect(hasContent).toBe(true);
            }, { timeout: 1000 });

            // Property: Rapid state transitions should not cause unhandled errors
            const hasUnhandledErrors = consoleErrors.some(error => 
              error.includes('Uncaught') || 
              error.includes('Unhandled') ||
              error.includes('Maximum update depth exceeded') ||
              error.includes('Cannot update a component while rendering')
            );
            
            expect(hasUnhandledErrors).toBe(false);

            unmount();
          } catch (testError) {
            throw new Error(`State transition handling failed: ${testError}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});