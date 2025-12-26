/**
 * Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { EnhancedAuthProvider, useEnhancedAuth } from './contexts/EnhancedAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { queryClient } from './lib/queryClient';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import CompanyProfileEditPage from './pages/CompanyProfileEditPage';
import VehicleListingsPage from './pages/VehicleListingsPage';
import CreateVehicleListingPage from './pages/CreateVehicleListingPage';
import EditVehicleListingPage from './pages/EditVehicleListingPage';
import DriverListingsPage from './pages/DriverListingsPage';
import CreateDriverListingPage from './pages/CreateDriverListingPage';
import EditDriverListingPage from './pages/EditDriverListingPage';
import SearchPage from './pages/SearchPage';
import ListingDetailPage from './pages/ListingDetailPage';
import BookingsPage from './pages/BookingsPage';
import BookingDetailPage from './pages/BookingDetailPage';
import BillingPage from './pages/BillingPage';
import MessagingPage from './pages/MessagingPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage';
import AdminVehicleListingsPage from './pages/admin/AdminVehicleListingsPage';
import AdminDriverListingsPage from './pages/admin/AdminDriverListingsPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminDisputeDetailPage from './pages/admin/AdminDisputeDetailPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminAuditLogPage from './pages/admin/AdminAuditLogPage';
import DataExportPage from './pages/DataExportPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import UserAuditLogPage from './pages/UserAuditLogPage';
import BulkCalendarManagementPage from './pages/BulkCalendarManagementPage';
import UserProfilePage from './pages/UserProfilePage';
import { PlatformAdminPage } from './pages/admin/PlatformAdminPage';


import { SkipLink } from './design-system/components/SkipLink/SkipLink';

/**
 * Root Route Component
 * Redirects authenticated users to appropriate dashboards based on role
 * Enhanced with loading states for better UX
 */
function RootRoute() {
  const { isAuthenticated, user, isLoading } = useEnhancedAuth();
  
  console.log('RootRoute - isAuthenticated:', isAuthenticated);
  console.log('RootRoute - user:', user);
  console.log('RootRoute - user role:', user?.role);
  console.log('RootRoute - isLoading:', isLoading);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated && user) {
    if (user.role === 'PLATFORM_ADMIN') {
      console.log('Redirecting to /platform-admin');
      return <Navigate to="/platform-admin" replace />;
    }
    if (user.role === 'COMPANY_ADMIN') {
      console.log('Redirecting to /dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  console.log('Showing HomePage');
  return <HomePage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EnhancedAuthProvider>
        <ToastProvider>
            <BrowserRouter>

            <SkipLink />
            <main id="main-content" role="main">
              <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/listings/:type/:id" element={<ListingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute 
                  requiredRole="COMPANY_ADMIN"
                  loadingMessage="Loading company dashboard..."
                >
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/companies/:id" element={<CompanyProfilePage />} />
            <Route
              path="/companies/:id/edit"
              element={
                <ProtectedRoute>
                  <CompanyProfileEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/vehicles"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <VehicleListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/vehicles/new"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <CreateVehicleListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/vehicles/:id"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <EditVehicleListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <DriverListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers/new"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <CreateDriverListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers/:id"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <EditDriverListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/bulk-calendar"
              element={
                <ProtectedRoute requiredRole="COMPANY_ADMIN">
                  <BulkCalendarManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <BillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessagingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/notifications"
              element={
                <ProtectedRoute>
                  <NotificationSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-admin"
              element={
                <ProtectedRoute 
                  requiredRole="PLATFORM_ADMIN"
                  loadingMessage="Loading platform admin..."
                >
                  <PlatformAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/platform-admin/*"
              element={
                <ProtectedRoute 
                  requiredRole="PLATFORM_ADMIN"
                  loadingMessage="Loading platform admin..."
                >
                  <PlatformAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminCompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/listings/vehicles"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminVehicleListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/listings/drivers"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminDriverListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminTransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminDisputesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes/:id"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminDisputeDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute requiredRole="PLATFORM_ADMIN">
                  <AdminAuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/data-export"
              element={
                <ProtectedRoute>
                  <DataExportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/delete-account"
              element={
                <ProtectedRoute>
                  <DeleteAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/audit-log"
              element={
                <ProtectedRoute>
                  <UserAuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />
            </Routes>
            </main>
            </BrowserRouter>
        </ToastProvider>
      </EnhancedAuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
