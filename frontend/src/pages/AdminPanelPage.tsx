/**
 * Admin Panel Page
 * Main admin panel with sidebar navigation and entity management
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  UsersIcon,
  BuildingOfficeIcon,
  TruckIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

interface AdminPanelPageProps {
  children: React.ReactNode;
}

const AdminPanelPage: React.FC<AdminPanelPageProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Companies', href: '/admin/companies', icon: BuildingOfficeIcon },
    { name: 'Vehicle Listings', href: '/admin/listings/vehicles', icon: TruckIcon },
    { name: 'Driver Listings', href: '/admin/listings/drivers', icon: UserIcon },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarIcon },
    { name: 'Transactions', href: '/admin/transactions', icon: BanknotesIcon },
    { name: 'Disputes', href: '/admin/disputes', icon: ExclamationTriangleIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
    { name: 'Audit Log', href: '/admin/audit-log', icon: ClipboardDocumentListIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto`}
        >
          <div className="p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <span className="text-sm font-medium">Collapse</span>
              ) : (
                <span className="text-xl">☰</span>
              )}
            </button>
          </div>

          <nav className="px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  } group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    } ${sidebarOpen ? 'mr-3' : 'mx-auto'} h-6 w-6 flex-shrink-0`}
                  />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanelPage;
