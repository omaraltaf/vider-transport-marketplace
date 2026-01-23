/**
 * Platform Financial Management Page
 * Main page for platform admin financial management
 */

import React from 'react';
import FinancialManagementPanel from '../../components/platform-admin/FinancialManagementPanel';

const PlatformFinancialPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <FinancialManagementPanel />
      </div>
    </div>
  );
};

export default PlatformFinancialPage;