/**
 * Permission Error Handler
 * Handles permission-related errors with user-friendly messaging
 */

import type { IErrorTypeHandler } from '../interfaces';
import type { ApiError, ErrorContext, ErrorResponse } from '../../../types/error.types';
import { ApiErrorType, ErrorSeverity } from '../../../types/error.types';
import { createPermissionError, Permission } from '../utils/permissionUtils';

export class PermissionErrorHandler implements IErrorTypeHandler {
  canHandle(error: ApiError): boolean {
    return error.type === ApiErrorType.PERMISSION || 
           error.statusCode === 403 ||
           error.message.toLowerCase().includes('permission') ||
           error.message.toLowerCase().includes('forbidden') ||
           error.message.toLowerCase().includes('unauthorized');
  }

  async handle(error: ApiError, context: ErrorContext): Promise<ErrorResponse> {
    console.warn('Permission error detected:', {
      error: error.message,
      endpoint: context.endpoint,
      method: context.method,
      statusCode: error.statusCode
    });

    // Extract permission information from error if available
    const requiredPermission = this.extractRequiredPermission(error, context);
    
    // Create user-friendly permission error
    const permissionError = createPermissionError(requiredPermission, context.user);

    // Log permission access attempt
    this.logPermissionAttempt(error, context, permissionError);

    return {
      handled: true,
      error: {
        ...error,
        type: ApiErrorType.PERMISSION,
        message: permissionError.message,
        userMessage: permissionError.message,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        metadata: {
          ...error.metadata,
          permissionError,
          requiredPermission,
          userRole: context.user?.role || 'UNAUTHENTICATED',
          suggestedAction: permissionError.suggestedAction,
        }
      },
      shouldRetry: false,
      fallbackData: null,
      userMessage: permissionError.message,
      actions: this.getPermissionActions(permissionError, context),
    };
  }

  /**
   * Extract required permission from error context
   */
  private extractRequiredPermission(error: ApiError, context: ErrorContext): Permission {
    // Map endpoints to required permissions
    const endpointPermissions: Record<string, Permission> = {
      '/api/admin/users': Permission.MANAGE_USERS,
      '/api/admin/companies': Permission.VIEW_ALL_COMPANIES,
      '/api/admin/analytics': Permission.VIEW_ANALYTICS,
      '/api/company/listings': Permission.MANAGE_LISTINGS,
      '/api/company/bookings': Permission.MANAGE_BOOKINGS,
      '/api/company/analytics': Permission.VIEW_COMPANY_ANALYTICS,
      '/api/listings': Permission.VIEW_LISTINGS,
      '/api/bookings': Permission.CREATE_BOOKING,
    };

    // Check for exact match first
    if (endpointPermissions[context.endpoint]) {
      return endpointPermissions[context.endpoint];
    }

    // Check for partial matches
    for (const [endpoint, permission] of Object.entries(endpointPermissions)) {
      if (context.endpoint.startsWith(endpoint)) {
        return permission;
      }
    }

    // Default based on HTTP method
    switch (context.method.toUpperCase()) {
      case 'POST':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
        return Permission.MANAGE_LISTINGS; // Default to manage permission for write operations
      default:
        return Permission.VIEW_LISTINGS; // Default to view permission for read operations
    }
  }

  /**
   * Log permission access attempt for security monitoring
   */
  private logPermissionAttempt(
    error: ApiError, 
    context: ErrorContext, 
    permissionError: ReturnType<typeof createPermissionError>
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      userId: context.user?.id || 'anonymous',
      userRole: context.user?.role || 'UNAUTHENTICATED',
      companyId: context.user?.companyId,
      endpoint: context.endpoint,
      method: context.method,
      requiredPermission: permissionError.requiredPermission,
      errorMessage: error.message,
      statusCode: error.statusCode,
      userAgent: navigator.userAgent,
      ip: 'client-side', // Would be filled by server in real implementation
    };

    // In a real application, this would be sent to a security monitoring service
    console.warn('Permission access attempt logged:', logData);
    
    // Store in local storage for debugging (remove in production)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('permission_logs') || '[]');
      existingLogs.push(logData);
      
      // Keep only last 100 logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('permission_logs', JSON.stringify(existingLogs));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Get suggested actions for permission errors
   */
  private getPermissionActions(
    permissionError: ReturnType<typeof createPermissionError>,
    context: ErrorContext
  ): Array<{ label: string; action: () => void }> {
    const actions: Array<{ label: string; action: () => void }> = [];

    // Go back action
    actions.push({
      label: 'Go Back',
      action: () => window.history.back(),
    });

    // Contact admin action based on user role
    if (context.user?.role === 'COMPANY_USER') {
      actions.push({
        label: 'Contact Company Admin',
        action: () => {
          // In a real app, this would open a contact form or redirect to help
          alert('Please contact your company administrator for access to this feature.');
        },
      });
    } else if (context.user?.role === 'COMPANY_ADMIN') {
      actions.push({
        label: 'Contact Platform Admin',
        action: () => {
          // In a real app, this would open a contact form or redirect to help
          alert('Please contact platform support for access to this feature.');
        },
      });
    }

    // Login action for unauthenticated users
    if (!context.user) {
      actions.push({
        label: 'Login',
        action: () => {
          window.location.href = '/login';
        },
      });
    }

    return actions;
  }
}

export const permissionErrorHandler = new PermissionErrorHandler();