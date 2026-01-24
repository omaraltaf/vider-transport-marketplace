import React from 'react';
import { UserManagementPanel } from '../components/features/platform-admin/UserManagementPanel';

export const UsersPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <UserManagementPanel />
        </div>
    );
};

export default UsersPage;
