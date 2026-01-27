import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Package, Calendar, Check, X, Shield, Pencil, Trash2, Save, Star, History, ArrowRight, ArrowLeft } from 'lucide-react';
import { ReviewModal } from '../components/ReviewModal';

export const ManageBookingsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);

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

    const [activeSection, setActiveSection] = useState<'incoming' | 'outgoing' | 'history'>('incoming');

    // Categorization logic
    const incomingRequests = bookings?.filter((b: any) =>
        b.status === 'PENDING' && (isAdmin || b.providerId === currentUser?.companyId)
    ) || [];

    const outgoingRequests = bookings?.filter((b: any) =>
        b.status === 'PENDING' && (isAdmin || b.requesterId === currentUser?.companyId)
    ) || [];

    const historyBookings = bookings?.filter((b: any) =>
        b.status !== 'PENDING' && (isAdmin || b.providerId === currentUser?.companyId || b.requesterId === currentUser?.companyId)
    ) || [];

    const currentBookings = activeSection === 'incoming'
        ? incomingRequests
        : activeSection === 'outgoing'
            ? outgoingRequests
            : historyBookings;

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

                        {/* Review Button */}
                        {(booking.status === 'COMPLETED' || booking.status === 'CANCELLED') && (
                            <div className="flex items-center gap-2">
                                {booking.reviews?.some((r: any) => r.reviewerId === currentUser?.companyId) ? (
                                    <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                                        <Star size={10} className="fill-yellow-500" />
                                        Reviewed
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-yellow-500 hover:bg-yellow-500 hover:text-black border-yellow-500/20 gap-2 font-bold uppercase transition-all"
                                        onClick={() => {
                                            setSelectedBookingForReview(booking);
                                            setIsReviewModalOpen(true);
                                        }}
                                    >
                                        <Star size={14} className="fill-current" />
                                        {isIncoming ? 'Rate Client' : 'Rate Supplier'}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-12 pb-20">
            {/* ... header ... */}
            <header className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Booking <span className="text-primary italic">Management</span></h1>
                        <p className="text-slate-400 font-medium mt-1">Track and manage your transport agreements</p>
                    </div>

                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                        <button
                            onClick={() => setActiveSection('incoming')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold text-xs ${activeSection === 'incoming' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <ArrowLeft size={16} />
                            Incoming
                            {incomingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{incomingRequests.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveSection('outgoing')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold text-xs ${activeSection === 'outgoing' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <ArrowRight size={16} />
                            Outgoing
                        </button>
                        <button
                            onClick={() => setActiveSection('history')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold text-xs ${activeSection === 'history' ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <History size={16} />
                            History
                        </button>
                    </div>
                </div>
                {isAdmin && (
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 h-fit">
                        <Shield size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Platform Admin Mode</span>
                    </div>
                )}
            </header>

            <section className="space-y-4">
                {isLoading ? (
                    <div className="py-20 text-center text-slate-500">Loading bookings...</div>
                ) : currentBookings.length === 0 ? (
                    <Card className="p-12 text-center space-y-4 border-dashed border-white/10 bg-transparent">
                        <div className="h-16 w-16 bg-white/5 text-slate-500 mx-auto rounded-full flex items-center justify-center">
                            {activeSection === 'incoming' ? <ArrowLeft size={32} /> : activeSection === 'outgoing' ? <ArrowRight size={32} /> : <History size={32} />}
                        </div>
                        <h2 className="text-xl font-bold">
                            {activeSection === 'incoming' ? 'No incoming requests' : activeSection === 'outgoing' ? 'No outgoing requests' : 'No history found'}
                        </h2>
                        <p className="text-slate-400 max-w-sm mx-auto">
                            {activeSection === 'history'
                                ? 'Completed, cancelled, or rejected bookings will appear here.'
                                : 'Active pending requests will appear here until they are accepted or rejected.'}
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {currentBookings.map((booking: any) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                isIncoming={isAdmin || booking.providerId === currentUser?.companyId}
                                showAdminControls={isAdmin}
                            />
                        ))}
                    </div>
                )}
            </section>

            {selectedBookingForReview && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => {
                        setIsReviewModalOpen(false);
                        setSelectedBookingForReview(null);
                    }}
                    booking={selectedBookingForReview}
                />
            )}
        </div>
    );
};
