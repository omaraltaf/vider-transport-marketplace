import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2,
    Search,
    Filter,
    Plus,
    MapPin,
    Hash,
    Truck,
    Users,
    Package
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { config } from '../../../config/config';
import { useAuth } from '../../../contexts/AuthContext';

interface Company {
    id: string;
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
    verified: boolean;
    postalCode?: string;
    fylke?: string;
    kommune?: string;
    _count: {
        users: number;
        vehicles: number;
        shipments: number;
    };
    createdAt: string;
}

export const CompanyManagementPanel: React.FC = () => {
    const { token } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        organizationNumber: '',
        businessAddress: '',
        city: '',
        postalCode: '',
        fylke: '',
        kommune: ''
    });

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const res = await axios.get(config.api.platformAdmin.companies, {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: statusFilter === 'ALL' ? undefined : statusFilter, search: searchTerm || undefined }
            });
            if (res.data.success) setCompanies(res.data.data);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchCompanies();
    }, [token, statusFilter, searchTerm]);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await axios.patch(`${config.api.platformAdmin.companies}/${editingCompany.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(config.api.platformAdmin.companies, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsFormModalOpen(false);
            setEditingCompany(null);
            resetForm();
            fetchCompanies();
        } catch (err) {
            console.error('Operation failed', err);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            organizationNumber: '',
            businessAddress: '',
            city: '',
            postalCode: '',
            fylke: '',
            kommune: ''
        });
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await axios.patch(`${config.api.platformAdmin.companies}/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCompanies();
        } catch (err) {
            console.error('Status update failed', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this company?')) return;
        try {
            await axios.delete(`${config.api.platformAdmin.companies}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCompanies();
        } catch (err) {
            console.error('Delete failed', err);
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

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Building2 size={24} />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">Company Management</h1>
                    </div>
                    <p className="text-slate-400 font-medium">Manage all registered businesses and their platform status.</p>
                </div>
                <Button className="shadow-lg shadow-primary/20 gap-2" onClick={() => { setEditingCompany(null); resetForm(); setIsFormModalOpen(true); }}>
                    <Plus size={18} />
                    Register Company
                </Button>
            </div>

            <Card className="p-4 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-1 items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <Input
                                placeholder="Search companies..."
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
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="p-6 h-48 animate-pulse bg-white/5"><div /></Card>
                    ))
                ) : companies.length === 0 ? (
                    <div className="lg:col-span-2 py-20 text-center">
                        <Building2 size={48} className="text-slate-800 mx-auto mb-4" />
                        <p className="text-xl font-bold text-slate-500">No companies found</p>
                    </div>
                ) : (
                    companies.map((company) => (
                        <Card key={company.id} className="p-6 space-y-4 group relative overflow-hidden" hoverable>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 font-bold border border-white/5 group-hover:border-primary/20 transition-all">
                                        {company.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{company.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Hash size={12} /> {company.organizationNumber}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(company.status)}`}>
                                        {company.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Users</p>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Users size={14} className="text-slate-600" />
                                        <span className="text-sm font-bold">{company._count.users}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Fleet</p>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Truck size={14} className="text-slate-600" />
                                        <span className="text-sm font-bold">{company._count.vehicles}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Shipments</p>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Package size={14} className="text-slate-600" />
                                        <span className="text-sm font-bold">{company._count.shipments}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
                                <MapPin size={12} /> {company.city}, {company.businessAddress}
                            </div>

                            <div className="pt-4 flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                {company.status !== 'ACTIVE' && (
                                    <Button size="sm" variant="ghost" className="text-xs font-bold text-green-400 hover:bg-green-400/10" onClick={() => handleStatusUpdate(company.id, 'ACTIVE')}>Activate</Button>
                                )}
                                {company.status !== 'SUSPENDED' && (
                                    <Button size="sm" variant="ghost" className="text-xs font-bold text-red-400 hover:bg-red-400/10" onClick={() => handleStatusUpdate(company.id, 'SUSPENDED')}>Suspend</Button>
                                )}
                                <Button size="sm" variant="ghost" className="text-xs font-bold text-primary hover:bg-primary/10" onClick={() => {
                                    setEditingCompany(company);
                                    setFormData({
                                        name: company.name,
                                        organizationNumber: company.organizationNumber,
                                        businessAddress: company.businessAddress,
                                        city: company.city,
                                        postalCode: company.postalCode || '',
                                        fylke: company.fylke || '',
                                        kommune: company.kommune || ''
                                    });
                                    setIsFormModalOpen(true);
                                }}>Edit</Button>
                                <Button size="sm" variant="ghost" className="text-xs font-bold text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(company.id)}>Delete</Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingCompany ? 'Edit Company' : 'Register New Company'}
            >
                <form onSubmit={handleCreateOrUpdate} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company Name</label>
                        <Input
                            required
                            placeholder="e.g. Vider Transport AS"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-slate-900 border-white/10 h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Organization Number</label>
                        <Input
                            required
                            placeholder="9-digit NO number"
                            value={formData.organizationNumber}
                            onChange={(e) => setFormData({ ...formData, organizationNumber: e.target.value })}
                            className="bg-slate-900 border-white/10 h-12"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Address</label>
                            <Input
                                required
                                value={formData.businessAddress}
                                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                                className="bg-slate-900 border-white/10 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City</label>
                            <Input
                                required
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="bg-slate-900 border-white/10 h-12"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Postal Code</label>
                            <Input
                                required
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                className="bg-slate-900 border-white/10 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">County (Fylke)</label>
                            <Input
                                value={formData.fylke}
                                onChange={(e) => setFormData({ ...formData, fylke: e.target.value })}
                                className="bg-slate-900 border-white/10 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Municipality</label>
                            <Input
                                value={formData.kommune}
                                onChange={(e) => setFormData({ ...formData, kommune: e.target.value })}
                                className="bg-slate-900 border-white/10 h-12"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 pt-6">
                        <Button variant="outline" type="button" className="flex-1 h-12 border-white/10" onClick={() => setIsFormModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 shadow-lg shadow-primary/20 h-12">
                            {editingCompany ? 'Save Changes' : 'Register Company'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
