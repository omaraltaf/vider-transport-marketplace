/**
 * Protected Route Component
 * Enhanced with UserStateGuard for robust authentication and role-based access
 */

import { Navigate } from 'react-router-dom';
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext';
import { UserStateGuard } from './auth/UserStateGuard';
import { Permission } from '../services/error-handling/utils/permissionUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermissions?: Permission[];
  fallbackPath?: string;
  showLoadingSpinner?: boolean;
  loadingMessage?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermissions,
  fallbackPath = '/login',
  showLoadingSpinner = true,
  loadingMessage = "Loading..."
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useEnhancedAuth();

  // Show loading state during initial authentication check
  if (isLoading) {
    if (!showLoadingSpinner) {
      return null;
    }
    
    return (
      <UserStateGuard
        requireAuth={false}
        showLoadingSpinner={true}
        loadingMessage={loadingMessage}
      >
        <div />
      </UserStateGuard>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Use UserStateGuard for additional protection and role/permission checks
  return (
    <UserStateGuard
      requireAuth={true}
      requiredRole={requiredRole}
      requiredPermissions={requiredPermissions}
      showLoadingSpinner={showLoadingSpinner}
      loadingMessage={loadingMessage}
      fallback={<Navigate to={fallbackPath} replace />}
    >
      {children}
    </UserStateGuard>
  );
}
