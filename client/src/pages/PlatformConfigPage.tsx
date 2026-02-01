import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Percent, Wallet, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export const PlatformConfigPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { data: platformConfig, isLoading } = useQuery({
        queryKey: ['platform-config'],
        queryFn: async () => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            const res = await axios.get(`${config.api.baseUrl}/platform-config`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data.data;
        }
    });

    const updateConfigMutation = useMutation({
        mutationFn: async (newData: any) => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            return axios.patch(`${config.api.baseUrl}/platform-config`, newData, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-config'] });
            setSuccessMessage('Configuration updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            platformFeePercent: formData.get('platformFeePercent'),
            taxPercent: formData.get('taxPercent'),
            platformFeeDiscountPercent: formData.get('platformFeeDiscountPercent'),
        };
        updateConfigMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <Settings size={24} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">Platform Configuration</h1>
                </div>
                <p className="text-slate-400 font-medium">Manage global fees, taxes, and platform discounts.</p>
            </div>

            {successMessage && (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 size={20} />
                    <p className="font-bold">{successMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-8 space-y-6 bg-slate-900/40 border-white/5" hoverable>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Wallet size={20} className="text-primary" />
                                    Fee Settings
                                </h3>
                                <p className="text-sm text-slate-500">Global marketplace transaction fees.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Platform Fee (%)</label>
                                <div className="relative">
                                    <Input
                                        name="platformFeePercent"
                                        type="number"
                                        step="0.1"
                                        defaultValue={platformConfig?.platformFeePercent}
                                        className="pl-10 h-12 bg-slate-900 border-white/10 text-lg font-bold"
                                        placeholder="5.0"
                                        required
                                    />
                                    <Percent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Info size={10} /> Applied to the baseline price of every booking.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fee Discount (%)</label>
                                <div className="relative">
                                    <Input
                                        name="platformFeeDiscountPercent"
                                        type="number"
                                        step="0.1"
                                        defaultValue={platformConfig?.platformFeeDiscountPercent}
                                        className="pl-10 h-12 bg-slate-900 border-white/10 text-lg font-bold"
                                        placeholder="0.0"
                                        required
                                    />
                                    <Percent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Info size={10} /> Percentage discount subtracted from the platform fee.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-8 space-y-6 bg-slate-900/40 border-white/5" hoverable>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Percent size={20} className="text-primary" />
                                    Tax Settings
                                </h3>
                                <p className="text-sm text-slate-500">Government taxes (VAT/MVA).</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tax Percentage (%)</label>
                                <div className="relative">
                                    <Input
                                        name="taxPercent"
                                        type="number"
                                        step="0.1"
                                        defaultValue={platformConfig?.taxPercent}
                                        className="pl-10 h-12 bg-slate-900 border-white/10 text-lg font-bold"
                                        placeholder="25.0"
                                        required
                                    />
                                    <Percent size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Info size={10} /> Calculated on the baseline price. Sum of Price + Tax goes to companies.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                                <AlertCircle size={14} /> Example Calculation
                            </h4>
                            <div className="space-y-1 text-xs text-slate-400 font-medium">
                                <div className="flex justify-between">
                                    <span>Baseline Price:</span>
                                    <span>1,000 NOK</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax ({platformConfig?.taxPercent}%):</span>
                                    <span>+{(1000 * (platformConfig?.taxPercent / 100)).toLocaleString()} NOK</span>
                                </div>
                                <div className="flex justify-between font-bold text-white pt-1 border-t border-white/5">
                                    <span>Total to Company:</span>
                                    <span>{(1000 * (1 + platformConfig?.taxPercent / 100)).toLocaleString()} NOK</span>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <span>Platform Fee ({platformConfig?.platformFeePercent}%):</span>
                                    <span>+{(1000 * (platformConfig?.platformFeePercent / 100) * (1 - platformConfig?.platformFeeDiscountPercent / 100)).toFixed(2)} NOK</span>
                                </div>
                                <div className="flex justify-between font-bold text-primary pt-1 border-t border-primary/20 mt-1">
                                    <span>Total Requester Pays:</span>
                                    <span>{(1000 * (1 + platformConfig?.taxPercent / 100) + 1000 * (platformConfig?.platformFeePercent / 100) * (1 - platformConfig?.platformFeeDiscountPercent / 100)).toFixed(2)} NOK</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        className="h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20"
                        isLoading={updateConfigMutation.isPending}
                    >
                        Save Configuration
                    </Button>
                </div>
            </form>
        </div>
    );
};
