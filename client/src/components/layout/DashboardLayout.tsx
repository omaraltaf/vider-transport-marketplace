import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import {
    LayoutDashboard,
    Truck,
    Package,
    Users,
    LogOut,
    Menu,
    X,
    ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleSignOut = async () => {
        await auth.signOut();
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Marketplace', href: '/marketplace', icon: Truck },
        { name: 'My Fleet', href: '/fleet', icon: ClipboardList },
        { name: 'Bookings', href: '/bookings', icon: Package },
    ];

    if (isAdmin) {
        navigation.push({ name: 'User Management', href: '/admin/users', icon: Users });
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-slate-900/40 backdrop-blur-xl shrink-0">
                <div className="p-8 flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-black">
                        <Truck size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <span className="text-2xl font-bold tracking-tight">Vider</span>
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Marketplace</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
                                ${isActive
                                    ? 'bg-primary text-black font-bold shadow-lg shadow-primary/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            <item.icon size={20} />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="bg-white/5 rounded-3xl p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div className="truncate flex-1">
                                <p className="text-sm font-bold truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                                <p className="text-[10px] text-slate-500 truncate">{isAdmin ? 'Platform Admin' : 'Company'}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleSignOut}
                            className="w-full border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 gap-2 text-xs py-2 h-auto"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-40">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-black">
                            <Truck size={18} />
                        </div>
                        <span className="font-bold">Vider</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-slate-400"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                <div className="h-screen overflow-y-auto w-full relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                        {children}
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 lg:hidden flex flex-col"
                            >
                                <div className="p-8">
                                    <span className="text-2xl font-bold tracking-tight">Vider</span>
                                </div>
                                <nav className="flex-1 px-4 space-y-2">
                                    {navigation.map((item) => (
                                        <NavLink
                                            key={item.name}
                                            to={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) => `
                                                flex items-center gap-3 px-4 py-3 rounded-2xl
                                                ${isActive ? 'bg-primary text-black font-bold' : 'text-slate-400'}
                                            `}
                                        >
                                            <item.icon size={20} />
                                            {item.name}
                                        </NavLink>
                                    ))}
                                </nav>
                                <div className="p-4 border-t border-white/5">
                                    <Button onClick={handleSignOut} className="w-full gap-2">
                                        <LogOut size={18} />
                                        Sign Out
                                    </Button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};
