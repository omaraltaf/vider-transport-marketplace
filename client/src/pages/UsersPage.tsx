import React from 'react';
import { UserManagementPanel } from '../components/features/platform-admin/UserManagementPanel';

export const UsersPage: React.FC = () => {
    return (
        <div className="min-h-screen p-8 space-y-8 max-w-7xl mx-auto">
            <UserManagementPanel />
        </div>
    );
};

export default UsersPage;
