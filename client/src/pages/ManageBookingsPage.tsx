import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
// import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Package, Truck, Calendar } from 'lucide-react';

export const ManageBookingsPage: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: bookings, isLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: async () => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            const res = await axios.get(config.api.bookings.myBookings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.patch(`${config.api.bookings.base}/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            queryClient.invalidateQueries({ queryKey: ['my-fleet'] });
            queryClient.invalidateQueries({ queryKey: ['my-bookings-stats'] });
        }
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tight">Manage <span className="text-primary italic">Bookings</span></h1>
                <p className="text-slate-400 font-medium mt-1">Review and manage your incoming and outgoing requests</p>
            </header>

            <div className="space-y-6">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-500">Loading bookings...</div>
                ) : bookings?.length === 0 ? (
                    <Card className="p-12 text-center space-y-4 border-dashed border-white/10 bg-transparent">
                        <div className="h-16 w-16 bg-white/5 text-slate-500 mx-auto rounded-full flex items-center justify-center">
                            <Clock size={32} />
                        </div>
                        <h2 className="text-xl font-bold">No bookings found</h2>
                        <p className="text-slate-400 max-w-sm mx-auto">You haven't made or received any booking requests yet.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {bookings?.map((booking: any) => (
                            <Card key={booking.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" hoverable>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${booking.vehicleId ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {booking.vehicleId ? <Truck size={24} /> : <Package size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">
                                                {booking.vehicleId
                                                    ? `${booking.vehicle.make} ${booking.vehicle.model}`
                                                    : booking.shipment.title}
                                            </h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${booking.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' :
                                                booking.status === 'ACCEPTED' ? 'bg-primary/20 text-primary' :
                                                    booking.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-slate-700 text-slate-300'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {booking.requester.name} → {booking.provider.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dates</p>
                                        <p className="text-sm flex items-center gap-1 font-medium">
                                            <Calendar size={14} />
                                            {new Date(booking.startDate).toLocaleDateString()}
                                            {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Amount</p>
                                        <p className="text-sm font-bold text-primary">{booking.totalAmount.toLocaleString()} NOK</p>
                                    </div>

                                    {booking.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-500 hover:bg-red-500 group border-red-500/20"
                                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'REJECTED' })}
                                                isLoading={updateStatusMutation.isPending}
                                            >
                                                <X size={16} className="group-hover:text-white" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-primary text-black"
                                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'ACCEPTED' })}
                                                isLoading={updateStatusMutation.isPending}
                                            >
                                                <Check size={16} />
                                                Accept
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
