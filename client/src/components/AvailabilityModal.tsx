import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Calendar, Trash2, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface AvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: any;
}

export const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ isOpen, onClose, vehicle }) => {
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const getAuthToken = async () => {
        return await (await import('../config/firebase')).auth.currentUser?.getIdToken();
    };

    const { data: blockedPeriods, isLoading } = useQuery({
        queryKey: ['blocked-periods', vehicle?.id],
        queryFn: async () => {
            const token = await getAuthToken();
            const res = await axios.get(`${config.api.vehicles.base}/${vehicle.id}/blocked-dates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!vehicle?.id && isOpen
    });

    const addBlockMutation = useMutation({
        mutationFn: async (newBlock: any) => {
            const token = await getAuthToken();
            return axios.post(`${config.api.vehicles.base}/${vehicle.id}/block-dates`, newBlock, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blocked-periods', vehicle?.id] });
            setStartDate('');
            setEndDate('');
            setReason('');
        }
    });

    const deleteBlockMutation = useMutation({
        mutationFn: async (blockId: string) => {
            const token = await getAuthToken();
            return axios.delete(`${config.api.vehicles.base}/blocked-dates/${blockId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blocked-periods', vehicle?.id] });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addBlockMutation.mutate({
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });
    };

    if (!vehicle) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Availability: ${vehicle.make} ${vehicle.model}`}>
            <div className="space-y-8">
                {/* Add New Blocked Period */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Plus size={18} className="text-primary" />
                        Block New Dates
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <Input
                            label="Start Date"
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <Input
                            label="End Date"
                            type="date"
                            required
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="Reason (Optional)"
                                placeholder="e.g. Maintenance, Personal Use"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <Button
                                type="submit"
                                className="w-full"
                                isLoading={addBlockMutation.isPending}
                                disabled={!startDate || !endDate}
                            >
                                Block Dates
                            </Button>
                        </div>
                        {addBlockMutation.isError && (
                            <div className="md:col-span-2 text-red-500 text-xs flex items-center gap-1 mt-2">
                                <AlertCircle size={14} />
                                <p>Failed to block dates. Try again.</p>
                            </div>
                        )}
                    </form>
                </div>

                {/* Existing Blocked Periods */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Calendar size={18} className="text-primary" />
                        Currently Blocked
                    </h3>
                    <div className="space-y-3">
                        {isLoading ? (
                            <p className="text-slate-500 text-sm">Loading availability...</p>
                        ) : blockedPeriods?.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">No dates currently blocked.</p>
                        ) : (
                            blockedPeriods?.map((block: any) => (
                                <div key={block.id} className="flex justify-between items-center p-4 bg-slate-900/50 border border-white/5 rounded-xl group hover:border-primary/50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm">
                                            {format(new Date(block.startDate), 'MMM d, yyyy')} - {format(new Date(block.endDate), 'MMM d, yyyy')}
                                        </p>
                                        {block.reason && <p className="text-xs text-slate-400">{block.reason}</p>}
                                    </div>
                                    <button
                                        onClick={() => deleteBlockMutation.mutate(block.id)}
                                        disabled={deleteBlockMutation.isPending}
                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
