import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Package, MapPin, Calendar } from 'lucide-react';
import { BookingModal } from '../components/BookingModal';

export const MarketplacePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'vehicles' | 'shipments'>('vehicles');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    const openBooking = (item: any) => {
        setSelectedItem(item);
        setIsBookingOpen(true);
    };

    const { data: vehicles, isLoading: loadingVehicles } = useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await axios.get(config.api.vehicles.base);
            return res.data;
        },
        enabled: activeTab === 'vehicles',
    });

    const { data: shipments, isLoading: loadingShipments } = useQuery({
        queryKey: ['shipments'],
        queryFn: async () => {
            const res = await axios.get(config.api.shipments.base);
            return res.data;
        },
        enabled: activeTab === 'shipments',
    });

    return (
        <div className="space-y-8">
            <header className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Market<span className="text-primary italic">place</span></h1>
                        <p className="text-slate-400 font-medium mt-1">Discover resources and opportunities across Norway</p>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                        <button
                            onClick={() => setActiveTab('vehicles')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold ${activeTab === 'vehicles' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Truck size={18} />
                            Vehicles
                        </button>
                        <button
                            onClick={() => setActiveTab('shipments')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold ${activeTab === 'shipments' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Package size={18} />
                            Shipments
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {activeTab === 'vehicles' ? (
                        loadingVehicles ? (
                            <div className="col-span-full text-center py-20 text-slate-500">Loading vehicles...</div>
                        ) : vehicles?.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-500">No vehicles available at the moment.</div>
                        ) : (
                            vehicles?.map((vehicle: any) => (
                                <Card key={vehicle.id} className="overflow-hidden flex flex-col" hoverable>
                                    <div className="h-48 bg-slate-800 relative">
                                        {vehicle.imageUrl ? (
                                            <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                <Truck size={64} />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-primary text-black text-xs font-bold px-3 py-1 rounded-full uppercase">
                                            {vehicle.type}
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4 flex-1">
                                        <div>
                                            <h3 className="text-xl font-bold">{vehicle.make} {vehicle.model}</h3>
                                            <p className="text-slate-400 text-sm flex items-center gap-1">
                                                <MapPin size={14} /> {vehicle.company.city} • {vehicle.company.name}
                                            </p>
                                        </div>

                                        <div className="flex gap-4 border-y border-white/5 py-3">
                                            <div className="flex-1">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Capacity</p>
                                                <p className="font-semibold">{vehicle.capacityKg} kg</p>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Volume</p>
                                                <p className="font-semibold">{vehicle.volumeM3 || '-'} m³</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Daily Rate</p>
                                                <p className="text-xl font-bold text-primary">{vehicle.dailyRate || 'Ask'} <span className="text-sm font-normal text-slate-400">NOK</span></p>
                                            </div>
                                            <Button size="sm" onClick={() => openBooking(vehicle)}>Request Booking</Button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )
                    ) : (
                        loadingShipments ? (
                            <div className="col-span-full text-center py-20 text-slate-500">Loading shipments...</div>
                        ) : shipments?.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-500">No transport requests found.</div>
                        ) : (
                            shipments?.map((shipment: any) => (
                                <Card key={shipment.id} className="p-6 space-y-4" hoverable>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold">{shipment.title}</h3>
                                            <p className="text-slate-400 text-sm">{shipment.shipper.name}</p>
                                        </div>
                                        <div className="bg-slate-800 p-2 rounded-xl text-primary">
                                            <Package size={20} />
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                            <p className="text-sm font-medium">{shipment.pickupLocation}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <p className="text-sm font-medium">{shipment.deliveryLocation}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-slate-400">
                                        <p className="flex items-center gap-1"><Calendar size={14} /> {new Date(shipment.pickupDate).toLocaleDateString()}</p>
                                        <p className="font-bold text-white text-base">{shipment.budget ? `${shipment.budget} NOK` : 'Contact for budget'}</p>
                                    </div>

                                    <Button className="w-full" variant="outline" onClick={() => openBooking(shipment)}>View Details</Button>
                                </Card>
                            ))
                        )
                    )}
                </motion.div>
            </AnimatePresence>

            <BookingModal
                isOpen={isBookingOpen}
                onClose={() => setIsBookingOpen(false)}
                item={selectedItem}
                type={activeTab === 'vehicles' ? 'vehicle' : 'shipment'}
            />
        </div>
    );
};
