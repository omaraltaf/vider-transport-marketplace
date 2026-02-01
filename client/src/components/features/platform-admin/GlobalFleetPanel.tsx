import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Truck,
    Search,
    Filter,
    Plus,
    Building2,
    Hash,
    Calendar,
    Weight,
    Maximize,
    CircleDollarSign,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { config } from '../../../config/config';
import { useAuth } from '../../../contexts/AuthContext';

interface Vehicle {
    id: string;
    companyId: string;
    company: { name: string };
    type: 'TRUCK' | 'VAN' | 'TRAILER' | 'SPECIAL';
    make: string;
    model: string;
    registrationNumber: string;
    capacityKg: number;
    volumeM3?: number;
    dailyRate?: number;
    status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'INACTIVE';
    createdAt: string;
}

export const GlobalFleetPanel: React.FC = () => {
    const { token } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [formData, setFormData] = useState({
        companyId: '',
        type: 'TRUCK',
        make: '',
        model: '',
        registrationNumber: '',
        capacityKg: 0,
        volumeM3: 0,
        dailyRate: 0,
        status: 'AVAILABLE'
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [vehiclesRes, companiesRes] = await Promise.all([
                axios.get(config.api.platformAdmin.vehicles, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        status: statusFilter === 'ALL' ? undefined : statusFilter,
                        type: typeFilter === 'ALL' ? undefined : typeFilter,
                        search: searchTerm || undefined
                    }
                }),
                axios.get(config.api.platformAdmin.companies, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (vehiclesRes.data.success) setVehicles(vehiclesRes.data.data);
            if (companiesRes.data.success) setCompanies(companiesRes.data.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token, statusFilter, typeFilter, searchTerm]);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                capacityKg: parseFloat(formData.capacityKg.toString()),
                volumeM3: parseFloat(formData.volumeM3.toString()),
                dailyRate: parseFloat(formData.dailyRate.toString())
            };

            if (editingVehicle) {
                await axios.patch(`${config.api.platformAdmin.vehicles}/${editingVehicle.id}`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(config.api.platformAdmin.vehicles, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsFormModalOpen(false);
            setEditingVehicle(null);
            fetchData();
        } catch (err) {
            console.error('Operation failed', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
        try {
            await axios.delete(`${config.api.platformAdmin.vehicles}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return <CheckCircle2 size={16} className="text-green-400" />;
            case 'BOOKED': return <AlertCircle size={16} className="text-blue-400" />;
            case 'MAINTENANCE': return <AlertCircle size={16} className="text-orange-400" />;
            case 'INACTIVE': return <XCircle size={16} className="text-red-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Truck size={24} />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">Global Fleet</h1>
                    </div>
                    <p className="text-slate-400 font-medium">Overview and management of every vehicle in the marketplace.</p>
                </div>
                <Button className="shadow-lg shadow-primary/20 gap-2" onClick={() => { setEditingVehicle(null); setIsFormModalOpen(true); }}>
                    <Plus size={18} />
                    Add Vehicle
                </Button>
            </div>

            <Card className="p-4 bg-slate-900/40 border-white/5 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex flex-1 items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <Input
                                placeholder="Search registration, make, model..."
                                className="pl-10 h-11 bg-slate-900 border-white/10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-white/10">
                            <Filter size={14} className="text-slate-500" />
                            <select
                                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="ALL">All Types</option>
                                <option value="TRUCK">Trucks</option>
                                <option value="VAN">Vans</option>
                                <option value="TRAILER">Trailers</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-white/10">
                            <select
                                className="bg-transparent text-xs font-bold text-slate-300 focus:outline-none cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="AVAILABLE">Available</option>
                                <option value="BOOKED">Booked</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="h-20 animate-pulse bg-white/5" />
                    ))
                ) : vehicles.length === 0 ? (
                    <div className="py-20 text-center">
                        <Truck size={48} className="text-slate-800 mx-auto mb-4" />
                        <p className="text-xl font-bold text-slate-500">No vehicles found</p>
                    </div>
                ) : (
                    vehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-6 border-white/5 bg-slate-900/40 group" hoverable>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-lg">{vehicle.make} {vehicle.model}</h3>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-primary border border-primary/20 rounded-full uppercase">
                                            {vehicle.registrationNumber}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                        <Building2 size={12} /> {vehicle.company.name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-2xl px-6 border-l border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Type</p>
                                    <p className="text-xs font-bold text-slate-300 uppercase">{vehicle.type}</p>
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Capacity</p>
                                    <p className="text-xs font-bold text-slate-300 flex items-center gap-1 justify-center md:justify-start">
                                        <Weight size={12} className="text-slate-500" /> {vehicle.capacityKg} kg
                                    </p>
                                </div>
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Daily Rate</p>
                                    <p className="text-xs font-bold text-primary flex items-center gap-1 justify-center md:justify-start">
                                        <CircleDollarSign size={12} /> {vehicle.dailyRate?.toLocaleString()} NOK
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Status</p>
                                    <p className={`text-[10px] font-black flex items-center gap-1 justify-end uppercase ${vehicle.status === 'AVAILABLE' ? 'text-green-400' :
                                            vehicle.status === 'BOOKED' ? 'text-blue-400' : 'text-orange-400'
                                        }`}>
                                        {getStatusIcon(vehicle.status)}
                                        {vehicle.status}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all border-l border-white/5 pl-6">
                                <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => {
                                    setEditingVehicle(vehicle);
                                    setFormData({
                                        companyId: vehicle.companyId,
                                        type: vehicle.type,
                                        make: vehicle.make,
                                        model: vehicle.model,
                                        registrationNumber: vehicle.registrationNumber,
                                        capacityKg: vehicle.capacityKg,
                                        volumeM3: vehicle.volumeM3 || 0,
                                        dailyRate: vehicle.dailyRate || 0,
                                        status: vehicle.status
                                    });
                                    setIsFormModalOpen(true);
                                }}>
                                    <Edit2 size={16} />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(vehicle.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}
            >
                <form onSubmit={handleCreateOrUpdate} className="space-y-5 pt-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign to Company</label>
                        <select
                            required
                            className="w-full h-12 bg-slate-900 border border-white/10 rounded-2xl px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            value={formData.companyId}
                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                        >
                            <option value="">Select a company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</label>
                            <select
                                className="w-full h-12 bg-slate-900 border border-white/10 rounded-2xl px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="TRUCK">Truck</option>
                                <option value="VAN">Van</option>
                                <option value="TRAILER">Trailer</option>
                                <option value="SPECIAL">Special</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                            <select
                                className="w-full h-12 bg-slate-900 border border-white/10 rounded-2xl px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="AVAILABLE">Available</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Make</label>
                            <Input placeholder="e.g. Scania" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Model</label>
                            <Input placeholder="e.g. R500" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registration Number</label>
                        <Input placeholder="AB 12345" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} required />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[10px]">Capacity (kg)</label>
                            <Input type="number" value={formData.capacityKg} onChange={(e) => setFormData({ ...formData, capacityKg: parseInt(e.target.value) })} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[10px]">Volume (m³)</label>
                            <Input type="number" value={formData.volumeM3} onChange={(e) => setFormData({ ...formData, volumeM3: parseInt(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-[10px]">Daily Rate (NOK)</label>
                            <Input type="number" value={formData.dailyRate} onChange={(e) => setFormData({ ...formData, dailyRate: parseInt(e.target.value) })} required />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button variant="outline" type="button" className="flex-1 h-12 border-white/10" onClick={() => setIsFormModalOpen(false)}>Cancel</Button>
                        <Button type="submit" className="flex-1 shadow-lg shadow-primary/20 h-12">
                            {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
