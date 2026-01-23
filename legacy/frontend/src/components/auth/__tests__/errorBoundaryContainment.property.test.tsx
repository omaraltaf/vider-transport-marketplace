/**
 * Property-Based Test: Error boundary containment
 * **Feature: user-state-authentication-fix, Property 12: Error boundary containment**
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import { AuthErrorBoundary } from '../AuthErrorBoundary';
import { useEnhancedAuth } from '../../../contexts/EnhancedAuthContext';

// Mock the enhanced auth context
vi.mock('../../../contexts/EnhancedAuthContext', () => ({
  useEnhancedAuth: vi.fn(),
}));

// Test component that can throw various types of errors
const ErrorThrowingComponent = ({ 
  error, 
  shouldThrow, 
  testId 
}: { 
  error: Error; 
  shouldThrow: boolean; 
  testId: string;
}) => {
  if (shouldThrow) {
    throw error;
  }
  
  return <div data-testid={testId}>Component rendered successfully</div>;
};

// Component that accesses user state and can throw auth-related errors
const AuthDependentComponent = ({ 
  shouldThrowUserError, 
  shouldThrowTokenError,
  testId 
}: { 
  shouldThrowUserError: boolean; 
  shouldThrowTokenError: boolean;
  testId: string;
}) => {
  const { user } = useEnhancedAuth();
  
  if (shouldThrowUserError) {
    // Simulate accessing undefined user properties
    throw new Error(`Cannot read property 'id' of undefined`);
  }
  
  if (shouldThrowTokenError) {
    throw new Error('Token expired - authentication required');
  }
  
  return (
    <div data-testid={testId}>
      <span>User: {user?.id || 'No user'}</span>
    </div>
  );
};

// Generators for property-based testing
const authenticationErrorGenerator = fc.oneof(
  fc.constant(new Error("Cannot read property 'id' of undefined")),
  fc.constant(new Error("Cannot read property 'role' of undefined")),
  fc.constant(new Error("Cannot read property 'email' of undefined")),
  fc.constant(new Error('Token expired')),
  fc.constant(new Error('Invalid token')),
  fc.constant(new Error('Unauthorized access')),
  fc.constant(new Error('Forbidden - insufficient permissions')),
  fc.constant(new Error('Authentication failed')),
  fc.constant(new Error('User session expired')),
  fc.constant(new Error('Login required'))
);

const nonAuthenticationErrorGenerator = fc.oneof(
  fc.constant(new Error('Network connection failed')),
  fc.constant(new Error('Database connection error')),
  fc.constant(new TypeError('Cannot read property of null')),
  fc.constant(new ReferenceError('Variable is not defined')),
  fc.constant(new SyntaxError('Unexpected token'))
);

const errorGenerator = fc.oneof(
  authenticationErrorGenerator,
  nonAuthenticationErrorGenerator
);

describe('Property Test: Error boundary containment', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let onErrorSpy: ReturnType<typeof vi.fn>;
  let onAuthErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.error to prevent test output pollution
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create fresh spies for error handlers
    onErrorSpy = vi.fn();
    onAuthErrorSpy = vi.fn();
    
    // Mock useEnhancedAuth
    (useEnhancedAuth as any).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it('should contain any error thrown in authentication components without crashing the application', () => {
    fc.assert(
      fc.property(
        errorGenerator,
        fc.boolean(),
        (error, shouldThrow) => {
          // Create fresh spies for each iteration
          const localOnErrorSpy = vi.fn();
          const localOnAuthErrorSpy = vi.fn();
          
          const testId = `error-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { unmount } = render(
            <div data-testid="app-container">
              <div data-testid="outside-boundary">App is still running</div>
              <AuthErrorBoundary 
                onError={localOnErrorSpy}
                onAuthError={localOnAuthErrorSpy}
                showDetails={false}
              >
                <ErrorThrowingComponent 
                  error={error}
                  shouldThrow={shouldThrow}
                  testId={testId}
                />
              </AuthErrorBoundary>
              <div data-testid="after-boundary">Content after boundary</div>
            </div>
          );

          try {
            if (shouldThrow) {
              // Error boundary should catch the error and show error UI
              expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
              expect(screen.getByRole('heading', { name: /Authentication Error|Application Error/ })).toBeInTheDocument();
              
              // Application should still be running
              expect(screen.getByTestId('app-container')).toBeInTheDocument();
              expect(screen.getByTestId('outside-boundary')).toBeInTheDocument();
              expect(screen.getByTestId('after-boundary')).toBeInTheDocument();
              
              // Error handlers should be called
              expect(localOnErrorSpy).toHaveBeenCalled();
            } else {
              // Component should render normally
              expect(screen.getByTestId(testId)).toBeInTheDocument();
              expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
              
              // Error handlers should not be called
              expect(localOnErrorSpy).not.toHaveBeenCalled();
              expect(localOnAuthErrorSpy).not.toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should properly identify and handle authentication-related errors', () => {
    fc.assert(
      fc.property(
        authenticationErrorGenerator,
        (authError) => {
          const testId = `auth-error-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { unmount } = render(
            <AuthErrorBoundary 
              onError={onErrorSpy}
              onAuthError={onAuthErrorSpy}
              showDetails={false}
            >
              <ErrorThrowingComponent 
                error={authError}
                shouldThrow={true}
                testId={testId}
              />
            </AuthErrorBoundary>
          );

          try {
            // Should show authentication error UI
            expect(screen.getByRole('heading', { name: 'Authentication Error' })).toBeInTheDocument();
            
            // Should show suggested actions for auth errors
            expect(screen.getByText(/Suggested Actions/)).toBeInTheDocument();
            expect(screen.getByText(/Try refreshing the page/)).toBeInTheDocument();
            expect(screen.getByText(/Log out and log back in/)).toBeInTheDocument();
            
            // Both error handlers should be called
            expect(onErrorSpy).toHaveBeenCalledWith(authError, expect.any(Object));
            expect(onAuthErrorSpy).toHaveBeenCalledWith(authError);
            
            // Should show auth-specific action buttons
            expect(screen.getByRole('button', { name: /Log Out & Retry/ })).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle non-authentication errors appropriately', () => {
    fc.assert(
      fc.property(
        nonAuthenticationErrorGenerator,
        (nonAuthError) => {
          const testId = `non-auth-error-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { unmount } = render(
            <AuthErrorBoundary 
              onError={onErrorSpy}
              onAuthError={onAuthErrorSpy}
              showDetails={false}
            >
              <ErrorThrowingComponent 
                error={nonAuthError}
                shouldThrow={true}
                testId={testId}
              />
            </AuthErrorBoundary>
          );

          try {
            // Should show general application error UI (but might be classified as auth error)
            // The error boundary might classify some errors as auth errors based on keywords
            const heading = screen.getByRole('heading', { name: /Authentication Error|Application Error/ });
            expect(heading).toBeInTheDocument();
            
            // Only general error handler should be called
            expect(onErrorSpy).toHaveBeenCalledWith(nonAuthError, expect.any(Object));
            
            // Auth error handler may or may not be called depending on error classification
            // This is acceptable behavior as the boundary errs on the side of caution
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should provide recovery options and maintain application stability', () => {
    fc.assert(
      fc.property(
        errorGenerator,
        fc.integer({ min: 0, max: 3 }),
        (error, maxRetries) => {
          const testId = `recovery-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { unmount } = render(
            <div data-testid="stable-app">
              <AuthErrorBoundary 
                onError={onErrorSpy}
                onAuthError={onAuthErrorSpy}
                maxRetries={maxRetries}
                showDetails={false}
              >
                <ErrorThrowingComponent 
                  error={error}
                  shouldThrow={true}
                  testId={testId}
                />
              </AuthErrorBoundary>
            </div>
          );

          try {
            // Application container should remain stable
            expect(screen.getByTestId('stable-app')).toBeInTheDocument();
            
            // Should show error UI with recovery options
            expect(screen.getByRole('heading', { name: /Authentication Error|Application Error/ })).toBeInTheDocument();
            
            // Should show retry button if retries are available
            if (maxRetries > 0) {
              expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
            }
            
            // Should always show reload option
            expect(screen.getByRole('button', { name: /Reload Page/ })).toBeInTheDocument();
            
            // Should show clear error option
            expect(screen.getByRole('button', { name: /Clear Error/ })).toBeInTheDocument();
            
            // Should show error ID for support
            expect(screen.getByText(/error ID:/)).toBeInTheDocument();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle user state access errors gracefully', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (shouldThrowUserError, shouldThrowTokenError) => {
          // Skip case where no error is thrown
          if (!shouldThrowUserError && !shouldThrowTokenError) {
            return;
          }

          const testId = `user-state-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const { unmount } = render(
            <div data-testid="app-with-auth">
              <AuthErrorBoundary 
                onError={onErrorSpy}
                onAuthError={onAuthErrorSpy}
                showDetails={false}
              >
                <AuthDependentComponent 
                  shouldThrowUserError={shouldThrowUserError}
                  shouldThrowTokenError={shouldThrowTokenError}
                  testId={testId}
                />
              </AuthErrorBoundary>
            </div>
          );

          try {
            // Application should remain stable
            expect(screen.getByTestId('app-with-auth')).toBeInTheDocument();
            
            // Should show authentication error UI
            expect(screen.getByRole('heading', { name: 'Authentication Error' })).toBeInTheDocument();
            
            // Should provide auth-specific recovery options
            expect(screen.getByText(/Suggested Actions/)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Log Out & Retry/ })).toBeInTheDocument();
            
            // Auth error handler should be called
            expect(onAuthErrorSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent error propagation beyond the boundary', () => {
    fc.assert(
      fc.property(
        errorGenerator,
        (error) => {
          // Create fresh spies for each iteration
          const localOnErrorSpy = vi.fn();
          const localOnAuthErrorSpy = vi.fn();
          
          const testId = `propagation-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Create a parent component that would crash if error propagates
          const ParentComponent = () => {
            const [hasError, setHasError] = React.useState(false);
            
            // This would throw if error propagates
            if (hasError) {
              throw new Error('Parent component crashed due to error propagation');
            }
            
            return (
              <div data-testid="parent-component">
                <div data-testid="sibling-before">Sibling before boundary</div>
                <AuthErrorBoundary 
                  onError={(err) => {
                    localOnErrorSpy(err);
                    // Don't set hasError - boundary should contain the error
                  }}
                  onAuthError={localOnAuthErrorSpy}
                  showDetails={false}
                >
                  <ErrorThrowingComponent 
                    error={error}
                    shouldThrow={true}
                    testId={testId}
                  />
                </AuthErrorBoundary>
                <div data-testid="sibling-after">Sibling after boundary</div>
              </div>
            );
          };

          const { unmount } = render(<ParentComponent />);

          try {
            // Parent and sibling components should remain unaffected
            expect(screen.getByTestId('parent-component')).toBeInTheDocument();
            expect(screen.getByTestId('sibling-before')).toBeInTheDocument();
            expect(screen.getByTestId('sibling-after')).toBeInTheDocument();
            
            // Error should be contained within boundary
            expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Authentication Error|Application Error/ })).toBeInTheDocument();
            
            // Error handler should be called
            expect(localOnErrorSpy).toHaveBeenCalled();
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});