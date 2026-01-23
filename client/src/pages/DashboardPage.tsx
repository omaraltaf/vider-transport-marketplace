import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { auth } from '../config/firebase';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Truck, Package, LayoutDashboard, LogOut, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '../config/config';

export const DashboardPage: React.FC = () => {
    const { user, isAdmin } = useAuth();

    const { data: bookings } = useQuery({
        queryKey: ['my-bookings-stats'],
        queryFn: async () => {
            const token = await (await import('../config/firebase')).auth.currentUser?.getIdToken();
            const res = await axios.get(config.api.bookings.myBookings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        }
    });

    const activeBookings = bookings?.filter((b: any) => b.status === 'PENDING' || b.status === 'ACCEPTED').length || 0;
    const totalRevenue = bookings?.reduce((acc: number, b: any) => b.status === 'COMPLETED' ? acc + b.totalAmount : acc, 0) || 0;

    return (
        <div className="min-h-screen p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex justify-between items-center bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="bg-primary/20 p-3 rounded-2xl text-primary">
                        <LayoutDashboard size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Vider <span className="text-primary italic">Dashboard</span></h1>
                        <p className="text-slate-400 font-medium">Welcome back, {user?.displayName || user?.email}</p>
                    </div>
                </motion.div>

                <Button variant="outline" onClick={() => auth.signOut()} className="border-white/10 hover:bg-white/5 gap-2">
                    <LogOut size={18} />
                    Sign Out
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 space-y-4" hoverable>
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-slate-400 uppercase tracking-widest">Account Status</p>
                        <Activity size={18} className="text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-xl font-bold">{isAdmin ? 'Platform Admin' : 'Company Admin'}</p>
                    </div>
                </Card>

                <Link to="/bookings">
                    <Card className="p-6 space-y-4" hoverable>
                        <div className="flex justify-between items-start">
                            <p className="text-sm text-slate-400 uppercase tracking-widest">Active Bookings</p>
                            <Package size={18} className="text-primary" />
                        </div>
                        <p className="text-3xl font-bold">{activeBookings}</p>
                    </Card>
                </Link>

                <Card className="p-6 space-y-4" hoverable>
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-slate-400 uppercase tracking-widest">Revenue</p>
                        <TrendingUp size={18} className="text-primary" />
                    </div>
                    <p className="text-3xl font-bold">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">NOK</span></p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/marketplace" className="group">
                    <Card className="p-8 space-y-4 border-primary/20 hover:border-primary/50 transition-colors" hoverable>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                <Truck size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold">Marketplace</h3>
                                <p className="text-slate-400">Discover available vehicles and shipments across Norway.</p>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-primary transition-colors" />
                        </div>
                    </Card>
                </Link>

                <Link to="/fleet" className="group">
                    <Card className="p-8 space-y-4 border-white/5 hover:border-white/20 transition-colors" hoverable>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-white/5 text-white rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                                <Package size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold">My Fleet</h3>
                                <p className="text-slate-400">Manage your company vehicles and active transport requests.</p>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    );
};
