import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Mail,
    Building2,
    Calendar
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { config } from '../../../config/config';
import { useAuth } from '../../../contexts/AuthContext';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
    emailVerified: boolean;
    createdAt: string;
    company?: {
        name: string;
    };
}

interface Stats {
    totalUsers: number;
    activeToday: number;
    byStatus: {
        ACTIVE: number;
        SUSPENDED: number;
        PENDING_VERIFICATION: number;
    };
    verifiedRate: number;
}

export const UserManagementPanel: React.FC = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Selection for bulk operations
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    // Modal for status update
    const [updateModal, setUpdateModal] = useState<{
        show: boolean;
        userId: string | null;
        userName: string;
        currentStatus: string;
        newStatus: string;
        reason: string;
    }>({
        show: false,
        userId: null,
        userName: '',
        currentStatus: '',
        newStatus: '',
        reason: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, statsRes] = await Promise.all([
                axios.get(config.api.platformAdmin.users, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { status: statusFilter === 'ALL' ? undefined : statusFilter, search: searchTerm || undefined }
                }),
                axios.get(config.api.platformAdmin.stats, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (usersRes.data.success) setUsers(usersRes.data.data);
            if (statsRes.data.success) setStats(statsRes.data.data);
            setError(null);
        } catch (err: any) {
            setError('Failed to fetch user data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token, statusFilter, searchTerm]);

    const handleStatusUpdate = async () => {
        if (!updateModal.userId) return;

        try {
            const res = await axios.patch(
                `${config.api.platformAdmin.users}/${updateModal.userId}/status`,
                { status: updateModal.newStatus, reason: updateModal.reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setUsers(prev => prev.map(u => u.id === updateModal.userId ? { ...u, status: updateModal.newStatus as any } : u));
                setUpdateModal({ ...updateModal, show: false });
                fetchData(); // Refresh stats
            }
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status');
        }
    };

    const handleBulkUpdate = async (status: string) => {
        if (selectedUsers.length === 0) return;

        try {
            const res = await axios.post(
                config.api.platformAdmin.bulkStatus,
                { userIds: selectedUsers, status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setSelectedUsers([]);
                fetchData();
            }
        } catch (err) {
            console.error('Bulk update failed', err);
            alert('Bulk update failed');
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'text-green-600 bg-green-50 border-green-200';
            case 'SUSPENDED': return 'text-red-600 bg-red-50 border-red-200';
            case 'PENDING_VERIFICATION': return 'text-amber-600 bg-amber-50 border-amber-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <CheckCircle size={14} className="mr-1" />;
            case 'SUSPENDED': return <XCircle size={14} className="mr-1" />;
            case 'PENDING_VERIFICATION': return <Clock size={14} className="mr-1" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage platform users and their verification status.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchData}>Refresh Data</Button>
                    <Button>Create Admin</Button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Users</p>
                            <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center space-x-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Active Users</p>
                            <h3 className="text-2xl font-bold">{stats.byStatus.ACTIVE}</h3>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center space-x-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Pending</p>
                            <h3 className="text-2xl font-bold">{stats.byStatus.PENDING_VERIFICATION}</h3>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center space-x-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Suspended</p>
                            <h3 className="text-2xl font-bold">{stats.byStatus.SUSPENDED}</h3>
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters & Actions */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-1 items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                placeholder="Search users..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <Filter size={16} className="text-gray-500" />
                            <select
                                className="bg-transparent text-sm font-medium focus:outline-none"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING_VERIFICATION">Pending</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>
                        </div>
                    </div>

                    {selectedUsers.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <span className="text-sm font-medium text-primary ml-2">{selectedUsers.length} selected</span>
                            <div className="h-6 w-px bg-primary/20 mx-2" />
                            <Button size="sm" variant="outline" onClick={() => handleBulkUpdate('ACTIVE')}>Verify All</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleBulkUpdate('SUSPENDED')}>Suspend All</Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>Cancel</Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* User Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={selectedUsers.length === users.length && users.length > 0}
                                        onChange={() => {
                                            if (selectedUsers.length === users.length) setSelectedUsers([]);
                                            else setSelectedUsers(users.map(u => u.id));
                                        }}
                                    />
                                </th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">User</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                                <th className="p-4 text-sm font-semibold text-gray-600 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
                                        <td className="p-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                                    <div className="h-3 w-24 bg-gray-200 rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                                        <td className="p-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                                        <td className="p-4"><div className="h-6 w-20 bg-gray-200 rounded-full" /></td>
                                        <td className="p-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                                        <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Users size={48} className="text-gray-200 mb-4" />
                                            <p className="text-lg font-medium">No users found</p>
                                            <p>Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => toggleUserSelection(user.id)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-full font-bold">
                                                    {user.firstName[0]}{user.lastName[0]}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-gray-500 flex items-center">
                                                        <Mail size={12} className="mr-1" /> {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-gray-700 flex items-center">
                                                <Building2 size={14} className="mr-2 text-gray-400" />
                                                {user.company?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                                {getStatusIcon(user.status)}
                                                {user.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar size={14} className="mr-2 text-gray-400" />
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setUpdateModal({
                                                        show: true,
                                                        userId: user.id,
                                                        userName: `${user.firstName} ${user.lastName}`,
                                                        currentStatus: user.status,
                                                        newStatus: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                                        reason: ''
                                                    })}
                                                >
                                                    Modify
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Update Balance / Status Modal */}
            <Modal
                isOpen={updateModal.show}
                onClose={() => setUpdateModal({ ...updateModal, show: false })}
                title={`Update Status: ${updateModal.userName}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200">
                            <button
                                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${updateModal.newStatus === 'ACTIVE' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                                onClick={() => setUpdateModal({ ...updateModal, newStatus: 'ACTIVE' })}
                            >
                                Active
                            </button>
                            <button
                                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${updateModal.newStatus === 'SUSPENDED' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
                                onClick={() => setUpdateModal({ ...updateModal, newStatus: 'SUSPENDED' })}
                            >
                                Suspended
                            </button>
                            <button
                                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${updateModal.newStatus === 'PENDING_VERIFICATION' ? 'bg-white shadow text-amber-600' : 'text-gray-500'}`}
                                onClick={() => setUpdateModal({ ...updateModal, newStatus: 'PENDING_VERIFICATION' })}
                            >
                                Pending
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
                        <textarea
                            className="w-full h-24 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
                            placeholder="Provide a reason for this administrative action..."
                            value={updateModal.reason}
                            onChange={(e) => setUpdateModal({ ...updateModal, reason: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setUpdateModal({ ...updateModal, show: false })}>Cancel</Button>
                        <Button onClick={handleStatusUpdate}>Save Changes</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
