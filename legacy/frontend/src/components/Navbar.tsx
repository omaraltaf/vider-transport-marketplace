/**
 * Navigation Bar Component
 * Responsive navigation with user menu and notifications
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import NotificationDropdown from './NotificationDropdown';
import { Button, Drawer } from '../design-system/components';
import { Menu as MenuIcon, X } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, token } = useAuth();
  const navigate = useNavigate();

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      return apiClient.get<{ count: number }>('/messages/unread-count', token || '');
    },
    enabled: !!token && isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails on server, clear local state and navigate
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo and primary navigation */}
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link to="/" className="flex items-center" aria-label="Vider home page">
                <img
                  className="h-8 w-auto"
                  src="/logo-rectangular.svg"
                  alt="Vider logo"
                  onError={(e) => {
                    // Fallback if logo doesn't exist
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <span className="hidden ml-2 text-xl font-bold ds-text-gray-900">
                  Vider
                </span>
              </Link>
            </div>
            
            {/* Desktop navigation links */}
            {isAuthenticated && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {user?.role === 'PLATFORM_ADMIN' ? (
                  // Platform Admin Navigation
                  <>
                    <Link
                      to="/platform-admin"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-900 hover:ds-border-gray-300"
                    >
                      Platform Dashboard
                    </Link>
                    <Link
                      to="/admin/companies"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Companies
                    </Link>
                    <Link
                      to="/admin/users"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/analytics"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Analytics
                    </Link>
                    <Link
                      to="/admin/transactions"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Financial
                    </Link>
                  </>
                ) : (
                  // Regular User Navigation
                  <>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-900 hover:ds-border-gray-300"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/listings/vehicles"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-900 hover:ds-border-gray-300"
                    >
                      My Listings
                    </Link>
                    <Link
                      to="/search"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Search
                    </Link>
                    <Link
                      to="/bookings"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Bookings
                    </Link>
                    <Link
                      to="/messages"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700 relative"
                      aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
                    >
                      Messages
                      {unreadCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white ds-bg-error rounded-full" aria-label={`${unreadCount} unread messages`}>
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/billing"
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700"
                    >
                      Billing
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right side - notifications and user menu */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                {/* Notification dropdown */}
                <NotificationDropdown />

                {/* User menu dropdown */}
                <Menu as="div" className="relative ml-3">
                  <MenuButton 
                    className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
                    aria-label="User menu"
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full ds-bg-primary-600 flex items-center justify-center text-white font-medium" aria-hidden="true">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </MenuButton>
                  <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <MenuItem>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block px-4 py-2 text-sm ds-text-gray-700`}
                        >
                          Your Profile
                        </Link>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <Link
                          to="/settings/notifications"
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block px-4 py-2 text-sm ds-text-gray-700`}
                        >
                          Notification Settings
                        </Link>
                      )}
                    </MenuItem>
                    <div className="border-t border-gray-100 my-1"></div>
                    <MenuItem>
                      {({ active }) => (
                        <Link
                          to="/settings/audit-log"
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block px-4 py-2 text-sm ds-text-gray-700`}
                        >
                          Audit Log
                        </Link>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <Link
                          to="/settings/data-export"
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block px-4 py-2 text-sm ds-text-gray-700`}
                        >
                          Export My Data
                        </Link>
                      )}
                    </MenuItem>
                    <MenuItem>
                      {({ active }) => (
                        <Link
                          to="/settings/delete-account"
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block px-4 py-2 text-sm ds-text-error`}
                        >
                          Delete Account
                        </Link>
                      )}
                    </MenuItem>
                    <div className="border-t border-gray-100 my-1"></div>
                    <MenuItem>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? 'ds-bg-gray-100' : ''
                          } block w-full text-left px-4 py-2 text-sm ds-text-gray-700`}
                        >
                          Sign out
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </>
            ) : (
              <div className="hidden sm:flex sm:items-center sm:space-x-4">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
              >
                {!mobileMenuOpen ? <MenuIcon size={24} /> : <X size={24} />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
      >
        <div id="mobile-menu">
          <div className="space-y-1 pb-3 pt-2">
            {isAuthenticated ? (
              user?.role === 'PLATFORM_ADMIN' ? (
                // Platform Admin Mobile Navigation
                <>
                  <Link
                    to="/platform-admin"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Platform Dashboard
                  </Link>
                  <Link
                    to="/admin/companies"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Companies
                  </Link>
                  <Link
                    to="/admin/users"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Users
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Analytics
                  </Link>
                  <Link
                    to="/admin/transactions"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Financial
                  </Link>
                </>
              ) : (
                // Regular User Mobile Navigation
                <>
                  <Link
                    to="/dashboard"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/listings/vehicles"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Listings
                  </Link>
                  <Link
                    to="/search"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Search
                  </Link>
                  <Link
                    to="/bookings"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Bookings
                  </Link>
                  <Link
                    to="/messages"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800 flex items-center justify-between"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Messages</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white ds-bg-error rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/billing"
                    className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Billing
                  </Link>
                </>
              )
            ) : (
              <>
                <Link
                  to="/login"
                  className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium ds-text-gray-600 hover:ds-border-gray-300 ds-hover-bg-page ds-hover-text-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
          {isAuthenticated && (
            <div className="border-t ds-border-gray-200 pb-3 pt-4">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full ds-bg-primary-600 flex items-center justify-center text-white font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium ds-text-gray-800">{user?.email}</div>
                  <div className="text-sm font-medium ds-text-gray-500">{user?.role}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-base font-medium ds-text-gray-500 ds-hover-bg-gray-100 ds-hover-text-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Your Profile
                </Link>
                <Link
                  to="/settings/notifications"
                  className="block px-4 py-2 text-base font-medium ds-text-gray-500 ds-hover-bg-gray-100 ds-hover-text-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Notification Settings
                </Link>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium ds-text-gray-500 ds-hover-bg-gray-100 ds-hover-text-gray-800"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </nav>
  );
}
