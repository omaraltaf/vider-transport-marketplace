/**
 * Platform Admin Feature Management Page
 * Main page for platform administrators to manage feature toggles
 */

import React from 'react';
import { FeatureTogglePanel } from '../../components/platform-admin';

const PlatformAdminFeaturePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Feature Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage platform-wide feature toggles, configurations, and restrictions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Platform Admin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FeatureTogglePanel className="w-full" />
      </div>
    </div>
  );
};

export default PlatformAdminFeaturePage;