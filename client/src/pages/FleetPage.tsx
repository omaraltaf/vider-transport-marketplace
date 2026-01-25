import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Plus, X, Calendar } from 'lucide-react';
import { AvailabilityModal } from '../components/AvailabilityModal';

export const FleetPage: React.FC = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [availabilityVehicle, setAvailabilityVehicle] = useState<any>(null);
    const queryClient = useQueryClient();

    const getAuthToken = async () => {
        return await (await import('../config/firebase')).auth.currentUser?.getIdToken();
    };

    const { data: fleet, isLoading } = useQuery({
        queryKey: ['my-fleet'],
        queryFn: async () => {
            const res = await axios.get(config.api.vehicles.myFleet, {
                headers: { Authorization: `Bearer ${await getAuthToken()}` }
            });
            return res.data;
        }
    });

    const addVehicleMutation = useMutation({
        mutationFn: async (newVehicle: any) => {
            return axios.post(config.api.vehicles.base, newVehicle, {
                headers: { Authorization: `Bearer ${await getAuthToken()}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-fleet'] });
            closeForm();
        }
    });

    const updateVehicleMutation = useMutation({
        mutationFn: async (updatedData: any) => {
            const { id, ...data } = updatedData;
            return axios.patch(`${config.api.vehicles.base}/${id}`, data, {
                headers: { Authorization: `Bearer ${await getAuthToken()}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-fleet'] });
            closeForm();
        }
    });

    const openAddForm = () => {
        setEditingVehicle(null);
        setIsFormOpen(true);
    };

    const openEditForm = (vehicle: any) => {
        setEditingVehicle(vehicle);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingVehicle(null);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: any = Object.fromEntries(formData.entries());

        // Ensure numeric fields are numbers
        if (data.capacityKg) data.capacityKg = parseFloat(data.capacityKg);
        if (data.dailyRate) data.dailyRate = parseFloat(data.dailyRate);
        if (data.hourlyRate) data.hourlyRate = parseFloat(data.hourlyRate);
        if (data.volumeM3) data.volumeM3 = parseFloat(data.volumeM3);
        if (data.year) data.year = parseInt(data.year);

        if (editingVehicle) {
            updateVehicleMutation.mutate({ id: editingVehicle.id, ...data });
        } else {
            addVehicleMutation.mutate(data);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">My <span className="text-primary italic">Fleet</span></h1>
                    <p className="text-slate-400 font-medium mt-1">Manage your company's transport resources</p>
                </div>

                <Button onClick={openAddForm} className="gap-2">
                    <Plus size={18} />
                    Add Vehicle
                </Button>
            </header>

            <AnimatePresence>
                {isFormOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="p-8 border-primary/20">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">
                                    {editingVehicle ? 'Edit Vehicle Details' : 'Register New Vehicle'}
                                </h2>
                                <button onClick={closeForm} className="text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Vehicle Type</label>
                                    <select
                                        name="type"
                                        required
                                        defaultValue={editingVehicle?.type || "TRUCK"}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    >
                                        <option value="TRUCK">Truck</option>
                                        <option value="VAN">Van</option>
                                        <option value="TRAILER">Trailer</option>
                                        <option value="SPECIAL">Special</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Make</label>
                                    <input
                                        name="make"
                                        required
                                        defaultValue={editingVehicle?.make}
                                        placeholder="e.g. Volvo"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Model</label>
                                    <input
                                        name="model"
                                        required
                                        defaultValue={editingVehicle?.model}
                                        placeholder="e.g. FH16"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Registration Number</label>
                                    <input
                                        name="registrationNumber"
                                        required
                                        defaultValue={editingVehicle?.registrationNumber}
                                        placeholder="e.g. AB 12345"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Capacity (kg)</label>
                                    <input
                                        name="capacityKg"
                                        type="number"
                                        required
                                        defaultValue={editingVehicle?.capacityKg}
                                        placeholder="e.g. 24000"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Daily Rate (NOK)</label>
                                    <input
                                        name="dailyRate"
                                        type="number"
                                        required
                                        defaultValue={editingVehicle?.dailyRate}
                                        placeholder="e.g. 5000"
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    />
                                </div>

                                <div className="lg:col-span-3 flex justify-end gap-4 mt-4">
                                    <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                                    <Button
                                        type="submit"
                                        isLoading={addVehicleMutation.isPending || updateVehicleMutation.isPending}
                                    >
                                        {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center text-slate-500">Loading fleet...</div>
                ) : fleet?.length === 0 ? (
                    <Card className="col-span-full p-12 text-center space-y-4 border-dashed border-white/10 bg-transparent">
                        <div className="h-16 w-16 bg-white/5 text-slate-500 mx-auto rounded-full flex items-center justify-center">
                            <Truck size={32} />
                        </div>
                        <h2 className="text-xl font-bold">No vehicles yet</h2>
                        <p className="text-slate-400 max-w-sm mx-auto">Start by adding your first vehicle to the marketplace to begin earning.</p>
                        <Button onClick={openAddForm} variant="outline">Add Your First Vehicle</Button>
                    </Card>
                ) : (
                    fleet?.map((vehicle: any) => (
                        <Card key={vehicle.id} className="p-6 space-y-4" hoverable>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">{vehicle.make} {vehicle.model}</h3>
                                    <p className="text-primary font-mono text-sm">{vehicle.registrationNumber}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${vehicle.status === 'AVAILABLE' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                    {vehicle.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-slate-500 uppercase text-[10px]">Type</p>
                                    <p className="font-semibold">{vehicle.type}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 uppercase text-[10px]">Capacity</p>
                                    <p className="font-semibold">{vehicle.capacityKg} kg</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => openEditForm(vehicle)}
                                    variant="outline"
                                    className="flex-1 text-xs px-3"
                                >
                                    Edit Details
                                </Button>
                                <Button
                                    onClick={() => setAvailabilityVehicle(vehicle)}
                                    variant="outline"
                                    className="flex-1 text-xs px-3 hover:border-primary/50 text-slate-300 hover:text-primary"
                                >
                                    <Calendar size={14} className="mr-1.5" />
                                    Availability
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <AvailabilityModal
                isOpen={!!availabilityVehicle}
                onClose={() => setAvailabilityVehicle(null)}
                vehicle={availabilityVehicle}
            />
        </div>
    );
};
