import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { config } from '../config/config';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any; // Can be a vehicle or a shipment
    type: 'vehicle' | 'shipment';
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, item, type }) => {
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [success, setSuccess] = useState(false);

    const bookingMutation = useMutation({
        mutationFn: async (bookingData: any) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.post(config.api.bookings.base, bookingData, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            setSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setStartDate('');
                setEndDate('');
            }, 2000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const bookingData = {
            providerId: type === 'vehicle' ? item.companyId : item.shipperId,
            vehicleId: type === 'vehicle' ? item.id : undefined,
            shipmentId: type === 'shipment' ? item.id : undefined,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            totalAmount: type === 'vehicle' ? (item.dailyRate || 0) : (item.budget || 0),
        };

        bookingMutation.mutate(bookingData);
    };

    if (!item) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={success ? 'Request Sent!' : `Request ${type === 'vehicle' ? 'Vehicle' : 'Shipment'}`}
        >
            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-8 space-y-4 text-center"
                    >
                        <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Success!</h3>
                            <p className="text-slate-400">Your booking request has been sent to {type === 'vehicle' ? item.company.name : item.shipper.name}.</p>
                        </div>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Listing Details</p>
                            <h4 className="font-bold text-lg">{type === 'vehicle' ? `${item.make} ${item.model}` : item.title}</h4>
                            <p className="text-sm text-slate-400">{type === 'vehicle' ? item.company.name : item.shipper.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                    <Calendar size={14} /> Start Date
                                </label>
                                <Input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-slate-900 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                    <Calendar size={14} /> End Date (Optional)
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-slate-900 border-white/10"
                                />
                            </div>
                        </div>

                        {bookingMutation.isError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                                <AlertCircle size={18} />
                                <p>
                                    {(bookingMutation.error as any)?.response?.data?.message ||
                                        'Error creating request. Please try again.'}
                                </p>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col space-y-3">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Estimated Total:</span>
                                <span className="text-primary">{type === 'vehicle' ? (item.dailyRate || 0) : (item.budget || 0)} NOK</span>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 text-lg"
                                isLoading={bookingMutation.isPending}
                            >
                                Confirm Request
                            </Button>
                        </div>
                    </form>
                )}
            </AnimatePresence>
        </Modal>
    );
};
