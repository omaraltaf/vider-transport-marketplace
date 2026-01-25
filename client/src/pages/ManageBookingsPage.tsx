import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Package, Truck, Calendar, Inbox, Send, Trash2, Pencil, Save, Shield } from 'lucide-react';

export const ManageBookingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

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

    // 2. Fetch all related bookings (the backend now filters this)
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

    const cancelBookingMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.delete(`${config.api.bookings.base}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
        }
    });

    const updateBookingMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.patch(`${config.api.bookings.base}/${id}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setEditingBookingId(null);
        }
    });

    const startEditing = (booking: any) => {
        setEditingBookingId(booking.id);
        setEditStartDate(new Date(booking.startDate).toISOString().split('T')[0]);
        setEditEndDate(booking.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : '');
    };

    const handleUpdate = (id: string) => {
        updateBookingMutation.mutate({
            id,
            data: {
                startDate: new Date(editStartDate),
                endDate: editEndDate ? new Date(editEndDate) : null
            }
        });
    };

    // If admin, they see all. We split them into "Action Required" (Pending) and "Others"
    const pendingBookings = isAdmin ? bookings?.filter((b: any) => b.status === 'PENDING') || [] : bookings?.filter((b: any) => b.providerId === currentUser?.companyId) || [];
    const otherBookings = isAdmin ? bookings?.filter((b: any) => b.status !== 'PENDING') || [] : bookings?.filter((b: any) => b.requesterId === currentUser?.companyId) || [];

    const BookingCard = ({ booking, isIncoming, showAdminControls = false }: { booking: any, isIncoming: boolean, showAdminControls?: boolean }) => {
        const isEditing = editingBookingId === booking.id;

        return (
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
                            {showAdminControls && <Shield size={14} className="text-amber-500" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {isAdmin ? (
                                <><span className="text-slate-500 font-bold">{booking.requester.name}</span> → <span className="text-slate-500 font-bold">{booking.provider.name}</span></>
                            ) : isIncoming ? (
                                <><span className="text-slate-500">From:</span> {booking.requester.name}</>
                            ) : (
                                <><span className="text-slate-500">To:</span> {booking.provider.name}</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="space-y-1 min-w-[200px]">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dates</p>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(e.target.value)}
                                    className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                />
                                <span className="text-slate-500">-</span>
                                <input
                                    type="date"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(e.target.value)}
                                    className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                />
                            </div>
                        ) : (
                            <p className="text-sm flex items-center gap-1 font-medium">
                                <Calendar size={14} />
                                {new Date(booking.startDate).toLocaleDateString()}
                                {booking.endDate && ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Amount</p>
                        <p className="text-sm font-bold text-primary">{booking.totalAmount.toLocaleString()} NOK</p>
                    </div>

                    <div className="flex gap-2">
                        {/* Provider Controls (Accept/Reject) */}
                        {(isAdmin || isIncoming) && booking.status === 'PENDING' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 hover:bg-red-500 group border-red-500/20"
                                    onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'REJECTED' })}
                                    isLoading={updateStatusMutation.isPending}
                                    title="Reject on behalf of provider"
                                >
                                    <X size={16} className="group-hover:text-white" />
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-primary text-black"
                                    onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'ACCEPTED' })}
                                    isLoading={updateStatusMutation.isPending}
                                    title="Accept on behalf of provider"
                                >
                                    <Check size={16} />
                                    Accept
                                </Button>
                            </>
                        )}

                        {/* Requester Controls (Edit/Cancel) */}
                        {(isAdmin || !isIncoming) && booking.status === 'PENDING' && (
                            <>
                                {isEditing ? (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingBookingId(null)}
                                        >
                                            <X size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-primary text-black"
                                            onClick={() => handleUpdate(booking.id)}
                                            isLoading={updateBookingMutation.isPending}
                                        >
                                            <Save size={16} />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-slate-400 hover:text-white"
                                            onClick={() => startEditing(booking)}
                                            title="Edit on behalf of requester"
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-500 hover:bg-red-500 group border-red-500/20"
                                            onClick={() => cancelBookingMutation.mutate(booking.id)}
                                            isLoading={cancelBookingMutation.isPending}
                                            title="Cancel on behalf of requester"
                                        >
                                            <Trash2 size={16} className="group-hover:text-white" />
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-12 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Manage <span className="text-primary italic">Bookings</span></h1>
                    <p className="text-slate-400 font-medium mt-1">
                        {isAdmin ? 'System-wide booking management for platform administrators' : 'Review and manage your incoming and outgoing requests'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 h-fit">
                        <Shield size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Platform Admin Mode</span>
                    </div>
                )}
            </header>

            <div className="space-y-12">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-500">Loading bookings...</div>
                ) : (
                    <>
                        {/* Primary Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                <Inbox size={20} className="text-primary" />
                                <h2 className="text-xl font-bold">
                                    {isAdmin ? 'Action Required' : 'Incoming'}
                                    <span className="text-slate-500 font-medium text-sm ml-1">
                                        {isAdmin ? 'Requests pending system-wide' : 'Requests from clients'}
                                    </span>
                                </h2>
                            </div>
                            {pendingBookings.length === 0 ? (
                                <p className="text-slate-500 italic py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/5">
                                    {isAdmin ? 'No pending bookings found.' : 'No incoming requests yet.'}
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {pendingBookings.map((booking: any) => (
                                        <BookingCard key={booking.id} booking={booking} isIncoming={isAdmin || true} showAdminControls={isAdmin} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Secondary Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                <Send size={20} className="text-blue-500" />
                                <h2 className="text-xl font-bold">
                                    {isAdmin ? 'Archived / Settled' : 'Outgoing'}
                                    <span className="text-slate-500 font-medium text-sm ml-1">
                                        {isAdmin ? 'Historical data' : 'Requests you sent'}
                                    </span>
                                </h2>
                            </div>
                            {otherBookings.length === 0 ? (
                                <p className="text-slate-500 italic py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/5">
                                    {isAdmin ? 'No historical bookings found.' : 'No outgoing requests yet.'}
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {otherBookings.map((booking: any) => (
                                        <BookingCard key={booking.id} booking={booking} isIncoming={isAdmin ? false : false} showAdminControls={isAdmin} />
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
