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
                        {/* Provider Controls (Accept/Reject/Complete) */}
                        {(isAdmin || isIncoming) && (
                            <>
                                {booking.status === 'PENDING' && (
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
                                {booking.status === 'ACCEPTED' && (
                                    <Button
                                        size="sm"
                                        className="bg-primary text-black gap-2 font-bold"
                                        onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'COMPLETED' })}
                                        isLoading={updateStatusMutation.isPending}
                                    >
                                        <Check size={16} />
                                        Mark as Completed
                                    </Button>
                                )}
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
                        {(booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'REJECTED') && (
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
        <div className="space-y-8 pb-32">
            <header className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight">Booking <span className="text-primary italic">Management</span></h1>
                        <p className="text-slate-400 font-medium">Track, manage and review your transport agreements</p>
                    </div>

                    <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50">
                        <button
                            onClick={() => setActiveSection('incoming')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${activeSection === 'incoming'
                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ArrowLeft size={16} />
                            Incoming
                            {incomingRequests.length > 0 && (
                                <span className={`${activeSection === 'incoming' ? 'bg-black/20' : 'bg-red-500'} text-white text-[10px] px-2 py-0.5 rounded-full font-black`}>
                                    {incomingRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveSection('outgoing')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${activeSection === 'outgoing'
                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <ArrowRight size={16} />
                            Outgoing
                        </button>
                        <button
                            onClick={() => setActiveSection('history')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${activeSection === 'history'
                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <History size={16} />
                            History
                        </button>
                    </div>
                </div>

                {isAdmin && (
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-2xl flex items-center gap-3 w-fit animate-in fade-in slide-in-from-left-4 duration-500">
                        <Shield size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Platform Admin Oversight Mode</span>
                    </div>
                )}
            </header>

            <main className="min-h-[400px] relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-10 w-10 border-4 border-primary border-t-transparent animate-spin rounded-full" />
                            <p className="text-slate-500 font-medium animate-pulse">Fetching {activeSection} bookings...</p>
                        </div>
                    </div>
                ) : currentBookings.index === 0 && currentBookings.length === 0 ? (
                    <div className="py-20 animate-in fade-in zoom-in-95 duration-500">
                        <Card className="p-16 text-center space-y-6 border-dashed border-white/10 bg-transparent overflow-hidden relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 blur-[100px] -z-10 rounded-full" />
                            <div className="h-20 w-20 bg-white/5 text-slate-500 mx-auto rounded-3xl flex items-center justify-center rotate-3 border border-white/5 shadow-inner">
                                {activeSection === 'incoming' ? <ArrowLeft size={40} /> : activeSection === 'outgoing' ? <ArrowRight size={40} /> : <History size={40} />}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">
                                    {activeSection === 'incoming' ? 'No incoming requests' : activeSection === 'outgoing' ? 'No outgoing requests' : 'Empty history'}
                                </h2>
                                <p className="text-slate-500 max-w-sm mx-auto font-medium">
                                    {activeSection === 'history'
                                        ? 'Your completed, cancelled, or rejected transport agreements will be archived here.'
                                        : 'Pending requests will appear here once they are initiated. Check your other tabs for updates.'}
                                </p>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            </main>

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
