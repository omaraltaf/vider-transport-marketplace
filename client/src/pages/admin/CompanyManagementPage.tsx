import React from 'react';
import { CompanyManagementPanel } from '../../components/features/platform-admin/CompanyManagementPanel';

export const CompanyManagementPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <CompanyManagementPanel />
        </div>
    );
};

export default CompanyManagementPage;
