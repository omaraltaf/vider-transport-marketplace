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
    Building2
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
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
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
        } catch (err: any) {
            console.error('Failed to fetch user data', err);
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
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update status', err);
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
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'SUSPENDED': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'PENDING_VERIFICATION': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <CheckCircle size={14} className="mr-1.5" />;
            case 'SUSPENDED': return <XCircle size={14} className="mr-1.5" />;
            case 'PENDING_VERIFICATION': return <Clock size={14} className="mr-1.5" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">User Management</h1>
                    </div>
                    <p className="text-slate-400 font-medium">Verify platform users and manage administrative actions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-white/10 hover:bg-white/5" onClick={fetchData}>Refresh</Button>
                    <Button className="shadow-lg shadow-primary/20">Create Admin</Button>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="p-6 space-y-4" hoverable>
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Users</p>
                            <Users size={18} className="text-primary" />
                        </div>
                        <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    </Card>
                    <Card className="p-6 space-y-4" hoverable>
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Verified</p>
                            <CheckCircle size={18} className="text-green-400" />
                        </div>
                        <p className="text-3xl font-bold">{stats.byStatus.ACTIVE}</p>
                    </Card>
                    <Card className="p-6 space-y-4" hoverable>
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Pending</p>
                            <Clock size={18} className="text-orange-400" />
                        </div>
                        <p className="text-3xl font-bold">{stats.byStatus.PENDING_VERIFICATION}</p>
                    </Card>
                    <Card className="p-6 space-y-4" hoverable>
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Suspended</p>
                            <AlertTriangle size={18} className="text-red-400" />
                        </div>
                        <p className="text-3xl font-bold">{stats.byStatus.SUSPENDED}</p>
                    </Card>
                </div>
            )}

            <div className="space-y-6">
                <Card className="p-4 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex flex-1 items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-10 h-11 bg-slate-900 border-white/10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-white/10">
                                <Filter size={16} className="text-slate-500" />
                                <select
                                    className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none cursor-pointer"
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
                            <div className="flex items-center gap-2 p-1.5 bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                <span className="text-xs font-bold text-primary px-3">{selectedUsers.length} selected</span>
                                <div className="h-6 w-px bg-primary/20 mx-1" />
                                <Button size="sm" variant="outline" className="h-8 text-[10px] border-primary/20 hover:bg-primary hover:text-black" onClick={() => handleBulkUpdate('ACTIVE')}>Verify All</Button>
                                <Button size="sm" variant="outline" className="h-8 text-[10px] text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white" onClick={() => handleBulkUpdate('SUSPENDED')}>Suspend All</Button>
                                <Button size="sm" variant="ghost" className="h-8 text-[10px] text-slate-500" onClick={() => setSelectedUsers([])}>Cancel</Button>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="overflow-hidden bg-slate-900/40 border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-white/10 bg-slate-900 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                            checked={selectedUsers.length === users.length && users.length > 0}
                                            onChange={() => {
                                                if (selectedUsers.length === users.length) setSelectedUsers([]);
                                                else setSelectedUsers(users.map(u => u.id));
                                            }}
                                        />
                                    </th>
                                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Company</th>
                                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4 border-b border-white/5"><div className="h-4 w-4 bg-white/5 rounded" /></td>
                                            <td className="p-4 border-b border-white/5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-10 w-10 bg-white/5 rounded-full" />
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-32 bg-white/5 rounded" />
                                                        <div className="h-3 w-24 bg-white/5 rounded" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 border-b border-white/5"><div className="h-4 w-24 bg-white/5 rounded" /></td>
                                            <td className="p-4 border-b border-white/5"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                                            <td className="p-4 border-b border-white/5"><div className="h-6 w-20 bg-white/5 rounded-full" /></td>
                                            <td className="p-4 border-b border-white/5"><div className="h-4 w-20 bg-white/5 rounded" /></td>
                                            <td className="p-4 border-b border-white/5"><div className="h-4 w-4 bg-white/5 rounded" /></td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center">
                                            <Users size={48} className="text-slate-800 mx-auto mb-4" />
                                            <p className="text-xl font-bold text-slate-500">No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-white/10 bg-slate-900 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => setSelectedUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-xl font-bold border border-primary/20">
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-white">{user.firstName} {user.lastName}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                                            <Mail size={12} /> {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-300 flex items-center font-medium">
                                                    <Building2 size={14} className="mr-2 text-slate-600" />
                                                    {user.company?.name || '---'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full uppercase tracking-tighter">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyles(user.status)}`}>
                                                    {getStatusIcon(user.status)}
                                                    {user.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-400 font-medium whitespace-nowrap">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="opacity-0 group-hover:opacity-100 text-primary hover:bg-primary/10 transition-all font-bold text-[10px] uppercase"
                                                    onClick={() => setUpdateModal({
                                                        show: true,
                                                        userId: user.id,
                                                        userName: `${user.firstName} ${user.lastName}`,
                                                        currentStatus: user.status,
                                                        newStatus: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                                        reason: ''
                                                    })}
                                                >
                                                    Manage
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal
                isOpen={updateModal.show}
                onClose={() => setUpdateModal({ ...updateModal, show: false })}
                title={`User Action: ${updateModal.userName}`}
            >
                <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Update Verification Status</label>
                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900 rounded-2xl border border-white/5">
                            {(['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'] as const).map((s) => (
                                <button
                                    key={s}
                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${updateModal.newStatus === s
                                        ? s === 'ACTIVE' ? 'bg-green-500 text-black' : s === 'SUSPENDED' ? 'bg-red-500 text-white' : 'bg-orange-500 text-black'
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    onClick={() => setUpdateModal({ ...updateModal, newStatus: s })}
                                >
                                    {s.split('_')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Audit Reason</label>
                        <textarea
                            className="w-full h-32 p-4 bg-slate-900 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm text-white placeholder-slate-600"
                            placeholder="State the reason for this administrative action..."
                            value={updateModal.reason}
                            onChange={(e) => setUpdateModal({ ...updateModal, reason: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 border-white/10" onClick={() => setUpdateModal({ ...updateModal, show: false })}>Cancel</Button>
                        <Button className="flex-1 shadow-lg shadow-primary/20" onClick={handleStatusUpdate}>Confirm Action</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
