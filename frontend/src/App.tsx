/**
 * Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <main id="main-content" role="main">
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/listings/:type/:id" element={<ListingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <VehicleListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/vehicles/new"
              element={
                <ProtectedRoute>
                  <CreateVehicleListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/vehicles/:id"
              element={
                <ProtectedRoute>
                  <EditVehicleListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers"
              element={
                <ProtectedRoute>
                  <DriverListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers/new"
              element={
                <ProtectedRoute>
                  <CreateDriverListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/listings/drivers/:id"
              element={
                <ProtectedRoute>
                  <EditDriverListingPage />
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
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute>
                  <AdminCompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/listings/vehicles"
              element={
                <ProtectedRoute>
                  <AdminVehicleListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/listings/drivers"
              element={
                <ProtectedRoute>
                  <AdminDriverListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute>
                  <AdminBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <ProtectedRoute>
                  <AdminTransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute>
                  <AdminDisputesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes/:id"
              element={
                <ProtectedRoute>
                  <AdminDisputeDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute>
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
          </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
