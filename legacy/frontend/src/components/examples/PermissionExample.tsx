/**
 * Permission System Example
 * Demonstrates how to use the permission system in components
 */

import React from 'react';
import { PermissionGuard, withPermission } from '../auth/PermissionGuard';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../services/error-handling/utils/permissionUtils';

/**
 * Example component that requires MANAGE_LISTINGS permission
 */
const ListingManagementComponent: React.FC = () => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Listing Management</h3>
      <p>This component is only visible to users with MANAGE_LISTINGS permission.</p>
      <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Create New Listing
      </button>
    </div>
  );
};

/**
 * Example using HOC pattern
 */
const ProtectedListingComponent = withPermission(
  ListingManagementComponent, 
  Permission.MANAGE_LISTINGS
);

/**
 * Example component demonstrating various permission patterns
 */
export const PermissionExample: React.FC = () => {
  const {
    hasPermission,
    hasAnyPermission,
    isPlatformAdmin,
    isCompanyAdmin,
    userPermissions,
  } = usePermissions();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Permission System Examples</h2>

      {/* Role-based display */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Role-based Content</h3>
        
        {isPlatformAdmin && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">Platform Admin Only Content</p>
          </div>
        )}

        {isCompanyAdmin && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">Company Admin Content</p>
          </div>
        )}
      </div>

      {/* Permission-based display */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Permission-based Content</h3>
        
        {hasPermission(Permission.MANAGE_LISTINGS) && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">You can manage listings!</p>
          </div>
        )}

        {hasAnyPermission([Permission.VIEW_ANALYTICS, Permission.VIEW_COMPANY_ANALYTICS]) && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <p className="text-purple-800">You can view some analytics!</p>
          </div>
        )}
      </div>

      {/* Using PermissionGuard component */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Permission Guard Examples</h3>
        
        <PermissionGuard permission={Permission.MANAGE_LISTINGS}>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">Protected by PermissionGuard - MANAGE_LISTINGS</p>
          </div>
        </PermissionGuard>

        <PermissionGuard 
          anyPermissions={[Permission.VIEW_ANALYTICS, Permission.VIEW_COMPANY_ANALYTICS]}
        >
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
            <p className="text-indigo-800">Protected by PermissionGuard - Any Analytics Permission</p>
          </div>
        </PermissionGuard>
      </div>

      {/* Using HOC pattern */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">HOC Pattern Example</h3>
        <ProtectedListingComponent />
      </div>

      {/* User permissions display */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Permissions</h3>
        <div className="p-4 bg-gray-50 border rounded">
          <p className="font-medium mb-2">You have the following permissions:</p>
          <ul className="list-disc list-inside space-y-1">
            {userPermissions.map(permission => (
              <li key={permission} className="text-sm text-gray-600">
                {permission}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PermissionExample;