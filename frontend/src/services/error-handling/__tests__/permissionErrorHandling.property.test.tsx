/**
 * Property-Based Tests for Permission Error Handling
 * **Feature: user-state-authentication-fix, Property 10: Permission error handling**
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PermissionGuard } from '../../../components/auth/PermissionGuard';
import { PermissionDenied } from '../../../components/error-handling/PermissionDenied';
import { PermissionErrorHandler } from '../handlers/PermissionErrorHandler';
import { 
  Permission, 
  hasPermission, 
  createPermissionError,
  assertPermission,
  canAccessCompany
} from '../utils/permissionUtils';
import { usePermissions } from '../../../hooks/usePermissions';
import { ApiErrorType, ErrorSeverity } from '../../../types/error.types';
import { createPropertyTestConfig } from '../utils/testGenerators';
import type { User } from '../../../types';

// Mock AuthContext
const mockUser = vi.fn();
vi.mock('../../../contexts/EnhancedAuthContext', () => ({
  useAuth: () => ({ user: mockUser() })
}));

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useMemo: vi.fn().mockImplementation((fn) => fn()),
    useEffect: vi.fn().mockImplementation((fn) => fn()),
  };
});

describe('Permission Error Handling Properties', () => {
  let permissionErrorHandler: PermissionErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    permissionErrorHandler = new PermissionErrorHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 10a: For any user role and permission combination, permission checking should never throw runtime errors', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      email: fc.emailAddress(),
      role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'INVALID_ROLE'),
      companyId: fc.option(fc.string()),
      profile: fc.record({
        firstName: fc.string(),
        lastName: fc.string()
      })
    }), { nil: null });

    const permissionArb = fc.constantFrom(
      Permission.MANAGE_PLATFORM,
      Permission.VIEW_ALL_COMPANIES,
      Permission.MANAGE_USERS,
      Permission.VIEW_ANALYTICS,
      Permission.MANAGE_COMPANY,
      Permission.MANAGE_LISTINGS,
      Permission.MANAGE_BOOKINGS,
      Permission.VIEW_COMPANY_ANALYTICS,
      Permission.VIEW_LISTINGS,
      Permission.CREATE_BOOKING,
      Permission.VIEW_OWN_BOOKINGS
    );

    fc.assert(
      fc.property(userArb, permissionArb, (user, permission) => {
        // Permission checking should never throw
        expect(() => {
          const result = hasPermission(user, permission);
          expect(typeof result).toBe('boolean');
        }).not.toThrow();

        // Permission error creation should never throw
        expect(() => {
          const error = createPermissionError(permission, user);
          expect(error.type).toBe('PERMISSION_DENIED');
          expect(typeof error.message).toBe('string');
          expect(error.requiredPermission).toBe(permission);
        }).not.toThrow();
      }),
      createPropertyTestConfig(100)
    );
  });

  it('Property 10b: For any permission assertion with insufficient permissions, should throw structured error without runtime crashes', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      email: fc.emailAddress(),
      role: fc.constantFrom('COMPANY_USER', 'INVALID_ROLE'), // Roles with limited permissions
      companyId: fc.option(fc.string()),
      profile: fc.record({
        firstName: fc.string(),
        lastName: fc.string()
      })
    }), { nil: null });

    const restrictedPermissionArb = fc.constantFrom(
      Permission.MANAGE_PLATFORM,
      Permission.VIEW_ALL_COMPANIES,
      Permission.MANAGE_USERS,
      Permission.VIEW_ANALYTICS
    );

    fc.assert(
      fc.property(userArb, restrictedPermissionArb, (user, permission) => {
        // Should throw a structured permission error, not a runtime error
        expect(() => {
          assertPermission(user, permission);
        }).toThrow();

        try {
          assertPermission(user, permission);
        } catch (error: any) {
          // Should be a structured permission error
          expect(error.type).toBe('PERMISSION_DENIED');
          expect(error.requiredPermission).toBe(permission);
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
        }
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 10c: PermissionGuard component should handle all user states without runtime errors', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      email: fc.emailAddress(),
      role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'INVALID_ROLE'),
      companyId: fc.option(fc.string()),
      profile: fc.record({
        firstName: fc.string(),
        lastName: fc.string()
      })
    }), { nil: null });

    const permissionArb = fc.constantFrom(
      Permission.MANAGE_PLATFORM,
      Permission.MANAGE_LISTINGS,
      Permission.VIEW_LISTINGS
    );

    fc.assert(
      fc.property(userArb, permissionArb, (user, permission) => {
        mockUser.mockReturnValue(user);

        // Component should render without throwing
        expect(() => {
          const { unmount } = render(
            <PermissionGuard permission={permission}>
              <div data-testid="protected-content">Protected Content</div>
            </PermissionGuard>
          );
          unmount();
        }).not.toThrow();

        // Test actual rendering
        const { unmount } = render(
          <PermissionGuard permission={permission}>
            <div data-testid="protected-content">Protected Content</div>
          </PermissionGuard>
        );

        try {
          // Should either show content or permission denied, never crash
          const hasAccess = hasPermission(user, permission);
          if (hasAccess) {
            expect(screen.queryByTestId('protected-content')).toBeTruthy();
          } else {
            // Should show permission denied UI
            expect(screen.queryByText(/access denied/i) || screen.queryByText(/permission/i)).toBeTruthy();
          }
        } finally {
          unmount();
        }
      }),
      createPropertyTestConfig(30)
    );
  });

  it('Property 10d: PermissionDenied component should render safely for all error states', () => {
    const permissionErrorArb = fc.record({
      type: fc.constant('PERMISSION_DENIED' as const),
      message: fc.string({ minLength: 5 }).filter(s => s.trim().length > 0), // Ensure non-empty trimmed message
      requiredPermission: fc.constantFrom(...Object.values(Permission)),
      userRole: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'UNAUTHENTICATED', 'INVALID_ROLE'),
      suggestedAction: fc.option(fc.string({ minLength: 1 }), { nil: undefined })
    });

    fc.assert(
      fc.property(permissionErrorArb, (error) => {
        // Component should render without throwing
        expect(() => {
          const { unmount } = render(
            <PermissionDenied 
              error={error}
              onGoBack={() => {}}
              onContactAdmin={() => {}}
            />
          );
          unmount();
        }).not.toThrow();

        // Test actual rendering
        const { unmount } = render(
          <PermissionDenied 
            error={error}
            onGoBack={() => {}}
            onContactAdmin={() => {}}
          />
        );

        try {
          // Should display error message (use flexible text matcher for whitespace)
          expect(screen.getByText((content, element) => {
            return element?.textContent?.trim() === error.message.trim();
          })).toBeTruthy();
          expect(screen.getByText(/access denied/i)).toBeTruthy();
          
          // Should display role and permission info
          expect(screen.getByText(error.userRole)).toBeTruthy();
          expect(screen.getByText(error.requiredPermission)).toBeTruthy();
        } finally {
          unmount();
        }
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 10e: PermissionErrorHandler should handle all API error types without runtime errors', () => {
    const apiErrorArb = fc.record({
      type: fc.constantFrom(ApiErrorType.PERMISSION, ApiErrorType.NETWORK, ApiErrorType.VALIDATION),
      message: fc.string({ minLength: 1 }),
      statusCode: fc.constantFrom(401, 403, 404, 500),
      originalError: fc.option(fc.record({
        name: fc.string(),
        message: fc.string()
      }), { nil: undefined }),
      metadata: fc.option(fc.object(), { nil: undefined })
    });

    const contextArb = fc.record({
      endpoint: fc.constantFrom('/api/admin/users', '/api/company/listings', '/api/bookings'),
      method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
      user: fc.option(fc.record({
        id: fc.string(),
        role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'),
        companyId: fc.option(fc.string())
      }), { nil: null })
    });

    fc.assert(
      fc.asyncProperty(apiErrorArb, contextArb, async (error, context) => {
        // Handler should process without throwing
        let result;
        expect(async () => {
          result = await permissionErrorHandler.handle(error, context);
        }).not.toThrow();

        result = await permissionErrorHandler.handle(error, context);

        // Should return structured response
        expect(result).toBeDefined();
        expect(typeof result.handled).toBe('boolean');
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
        
        if (result.error) {
          expect(result.error.type).toBeDefined();
          expect(typeof result.error.message).toBe('string');
        }
      }),
      createPropertyTestConfig(30)
    );
  });

  it('Property 10f: usePermissions hook should handle all user states without runtime errors', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      email: fc.emailAddress(),
      role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'INVALID_ROLE'),
      companyId: fc.option(fc.string()),
      profile: fc.record({
        firstName: fc.string(),
        lastName: fc.string()
      })
    }), { nil: null });

    fc.assert(
      fc.property(userArb, (user) => {
        mockUser.mockReturnValue(user);

        // Hook should execute without throwing
        expect(() => {
          const TestComponent = () => {
            const permissions = usePermissions();
            
            // Test all hook methods
            expect(typeof permissions.hasPermission).toBe('function');
            expect(typeof permissions.hasAnyPermission).toBe('function');
            expect(typeof permissions.hasAllPermissions).toBe('function');
            expect(typeof permissions.canAccessCompany).toBe('function');
            expect(Array.isArray(permissions.userPermissions)).toBe(true);
            expect(typeof permissions.isPlatformAdmin).toBe('boolean');
            expect(typeof permissions.isCompanyAdmin).toBe('boolean');
            expect(typeof permissions.isCompanyUser).toBe('boolean');

            return <div>Test</div>;
          };

          const { unmount } = render(<TestComponent />);
          unmount();
        }).not.toThrow();
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 10g: Permission checking with multiple permissions should handle all combinations safely', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'),
      companyId: fc.option(fc.string())
    }), { nil: null });

    const permissionsArb = fc.array(
      fc.constantFrom(...Object.values(Permission)),
      { minLength: 1, maxLength: 5 }
    );

    fc.assert(
      fc.property(userArb, permissionsArb, (user, permissions) => {
        mockUser.mockReturnValue(user);

        // Multiple permission checking should not throw
        expect(() => {
          const { unmount: unmount1 } = render(
            <PermissionGuard anyPermissions={permissions}>
              <div data-testid="any-permissions-content">Any Permissions Content</div>
            </PermissionGuard>
          );
          unmount1();
        }).not.toThrow();

        expect(() => {
          const { unmount: unmount2 } = render(
            <PermissionGuard allPermissions={permissions}>
              <div data-testid="all-permissions-content">All Permissions Content</div>
            </PermissionGuard>
          );
          unmount2();
        }).not.toThrow();
      }),
      createPropertyTestConfig(30)
    );
  });

  it('Property 10h: Company access checking should handle all company ID combinations safely', () => {
    const userArb = fc.option(fc.record({
      id: fc.string(),
      role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'),
      companyId: fc.option(fc.string(), { nil: undefined })
    }), { nil: null });

    const companyIdArb = fc.string();

    fc.assert(
      fc.property(userArb, companyIdArb, (user, companyId) => {
        // Company access checking should never throw
        expect(() => {
          const result = canAccessCompany(user, companyId);
          expect(typeof result).toBe('boolean');
        }).not.toThrow();
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 10i: Permission error handler should detect permission errors correctly', () => {
    const errorArb = fc.record({
      type: fc.constantFrom(ApiErrorType.PERMISSION, ApiErrorType.NETWORK, ApiErrorType.VALIDATION),
      message: fc.oneof(
        fc.string(),
        fc.constant('Permission denied'),
        fc.constant('Forbidden'),
        fc.constant('Unauthorized'),
        fc.constant('Access denied')
      ),
      statusCode: fc.constantFrom(200, 401, 403, 404, 500)
    });

    fc.assert(
      fc.property(errorArb, (error) => {
        // canHandle should never throw
        expect(() => {
          const canHandle = permissionErrorHandler.canHandle(error);
          expect(typeof canHandle).toBe('boolean');
          
          // Should detect permission errors correctly
          const isPermissionError = error.type === ApiErrorType.PERMISSION ||
                                   error.statusCode === 403 ||
                                   error.message.toLowerCase().includes('permission') ||
                                   error.message.toLowerCase().includes('forbidden') ||
                                   error.message.toLowerCase().includes('unauthorized');
          
          if (isPermissionError) {
            expect(canHandle).toBe(true);
          }
        }).not.toThrow();
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 10j: Permission system should provide consistent error messages', () => {
    const permissionArb = fc.constantFrom(...Object.values(Permission));
    const userArb = fc.option(fc.record({
      id: fc.string(),
      role: fc.constantFrom('COMPANY_USER', 'INVALID_ROLE'), // Limited permissions
      companyId: fc.option(fc.string())
    }), { nil: null });

    fc.assert(
      fc.property(permissionArb, userArb, (permission, user) => {
        // Error messages should be consistent and informative
        const error = createPermissionError(permission, user);
        
        expect(error.message).toContain(permission);
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.requiredPermission).toBe(permission);
        expect(error.userRole).toBe(user?.role || 'UNAUTHENTICATED');
        
        // Should have suggested action for certain permissions
        const adminPermissions = [
          Permission.MANAGE_PLATFORM,
          Permission.VIEW_ALL_COMPANIES,
          Permission.MANAGE_USERS,
          Permission.VIEW_ANALYTICS,
          Permission.MANAGE_COMPANY,
          Permission.MANAGE_LISTINGS,
          Permission.MANAGE_BOOKINGS,
          Permission.VIEW_COMPANY_ANALYTICS
        ];
        
        if (adminPermissions.includes(permission)) {
          expect(error.suggestedAction).toBeDefined();
          expect(error.suggestedAction!.length).toBeGreaterThan(0);
        }
      }),
      createPropertyTestConfig(50)
    );
  });
});