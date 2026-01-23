/**
 * Authentication Components
 * Exports all authentication-related components and utilities
 */

export { default as UserStateGuard, withUserStateGuard } from './UserStateGuard';
export type { UserStateGuardProps } from './UserStateGuard';

export { default as AuthErrorBoundary, withAuthErrorBoundary } from './AuthErrorBoundary';
export type { AuthErrorBoundaryProps, AuthErrorBoundaryState } from './AuthErrorBoundary';

export { 
  default as PermissionGuard, 
  withPermission, 
  withAnyPermission, 
  withAllPermissions 
} from './PermissionGuard';

export { default as PermissionDenied } from '../error-handling/PermissionDenied';

export { default as PasswordChangeModal } from './PasswordChangeModal';

// Re-export enhanced auth context for convenience
export { 
  EnhancedAuthProvider, 
  useEnhancedAuth, 
  useAuth 
} from '../../contexts/EnhancedAuthContext';
export type { 
  User, 
  AuthError, 
  AuthState, 
  AuthContextValue 
} from '../../contexts/EnhancedAuthContext';