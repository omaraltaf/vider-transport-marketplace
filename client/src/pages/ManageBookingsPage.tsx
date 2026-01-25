import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
// import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Package, Truck, Calendar, Inbox, Send } from 'lucide-react';

export const ManageBookingsPage: React.FC = () => {
    const queryClient = useQueryClient();

    // 1. Fetch current user info to get companyId
    const { data: currentUser } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            const res = await axios.get(config.api.auth.me, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    // 2. Fetch all related bookings
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

    const incomingBookings = bookings?.filter((b: any) => b.providerId === currentUser?.companyId) || [];
    const outgoingBookings = bookings?.filter((b: any) => b.requesterId === currentUser?.companyId) || [];

    const BookingCard = ({ booking, isIncoming }: { booking: any, isIncoming: boolean }) => (
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
                    <p className="text-xs text-slate-400 mt-1">
                        {isIncoming ? (
                            <><span className="text-slate-500">From:</span> {booking.requester.name}</>
                        ) : (
                            <><span className="text-slate-500">To:</span> {booking.provider.name}</>
                        )}
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

                {isIncoming && booking.status === 'PENDING' && (
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
    );

    return (
        <div className="space-y-12 pb-20">
            <header>
                <h1 className="text-4xl font-bold tracking-tight">Manage <span className="text-primary italic">Bookings</span></h1>
                <p className="text-slate-400 font-medium mt-1">Review and manage your incoming and outgoing requests</p>
            </header>

            <div className="space-y-12">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-500">Loading bookings...</div>
                ) : (
                    <>
                        {/* Incoming Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                <Inbox size={20} className="text-primary" />
                                <h2 className="text-xl font-bold">Incoming <span className="text-slate-500 font-medium text-sm ml-1">Requests from clients</span></h2>
                            </div>
                            {incomingBookings.length === 0 ? (
                                <p className="text-slate-500 italic py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/5">No incoming requests yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {incomingBookings.map((booking: any) => (
                                        <BookingCard key={booking.id} booking={booking} isIncoming={true} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Outgoing Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                <Send size={20} className="text-blue-500" />
                                <h2 className="text-xl font-bold">Outgoing <span className="text-slate-500 font-medium text-sm ml-1">Requests you sent</span></h2>
                            </div>
                            {outgoingBookings.length === 0 ? (
                                <p className="text-slate-500 italic py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/5">No outgoing requests yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {outgoingBookings.map((booking: any) => (
                                        <BookingCard key={booking.id} booking={booking} isIncoming={false} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};
