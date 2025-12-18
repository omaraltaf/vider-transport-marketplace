/**
 * Bookings Dashboard Page
 * Displays bookings with separate views for renter and provider roles
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { Booking } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Badge, Button, Stack, Spinner } from '../design-system/components';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

type BookingView = 'renter' | 'provider';

export default function BookingsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [view, setView] = useState<BookingView>('renter');

  const { data: bookings, isLoading, error } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<Booking[]>('/bookings', validToken);
    },
    enabled: !!user,
  });

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
      case 'DISPUTED':
        return 'error';
      case 'CLOSED':
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Using centralized currency utility
  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Filter bookings based on view
  const filteredBookings = bookings?.filter((booking) => {
    if (view === 'renter') {
      return booking.renterCompanyId === user?.companyId;
    } else {
      return booking.providerCompanyId === user?.companyId;
    }
  });

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container>
        <Stack spacing={6} className="py-8">
          <div>
            <h1 className="text-3xl font-bold ds-text-gray-900">Bookings</h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Manage your rental bookings
            </p>
          </div>

          {/* View Toggle */}
          <div>
            <div className="sm:hidden">
              <select
                value={view}
                onChange={(e) => setView(e.target.value as BookingView)}
                className="block w-full rounded-md ds-border-gray-300 focus:ds-border-primary-600 focus:ring-primary-600"
              >
                <option value="renter">As Renter</option>
                <option value="provider">As Provider</option>
              </select>
            </div>
            <Stack direction="horizontal" spacing={2} className="hidden sm:flex">
              <Button
                variant={view === 'renter' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setView('renter')}
              >
                As Renter
              </Button>
              <Button
                variant={view === 'provider' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setView('provider')}
              >
                As Provider
              </Button>
            </Stack>
          </div>

          {isLoading && (
            <Stack spacing={2} align="center" className="py-12">
              <Spinner size="lg" />
              <p className="text-sm ds-text-gray-500">Loading bookings...</p>
            </Stack>
          )}

          {error && (
            <Card padding="md" className="ds-bg-error-light border ds-border-error">
              <Stack direction="horizontal" spacing={3} align="start">
                <AlertCircle className="h-5 w-5 ds-text-error flex-shrink-0" />
                <Stack spacing={1}>
                  <h3 className="text-sm font-medium ds-text-error">Error loading bookings</h3>
                  <p className="text-sm ds-text-error">{(error as Error).message}</p>
                </Stack>
              </Stack>
            </Card>
          )}

          {!isLoading && !error && filteredBookings && filteredBookings.length === 0 && (
            <Stack spacing={2} align="center" className="py-12">
              <svg
                className="h-12 w-12 ds-text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="text-sm font-medium ds-text-gray-900">No bookings</h3>
              <p className="text-sm ds-text-gray-500">
                {view === 'renter' 
                  ? 'You have not made any rental requests yet.' 
                  : 'You have not received any rental requests yet.'}
              </p>
            </Stack>
          )}

          {!isLoading && !error && filteredBookings && filteredBookings.length > 0 && (
            <Stack spacing={3}>
              {filteredBookings.map((booking) => (
                <Card
                  key={booking.id}
                  hoverable
                  padding="md"
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                >
                  <Stack spacing={3}>
                    <Stack direction="horizontal" justify="between" align="center">
                      <Stack direction="horizontal" spacing={3} align="center">
                        <p className="text-sm font-medium ds-text-primary-600 truncate">
                          {booking.bookingNumber}
                        </p>
                        <Badge variant={getStatusBadgeVariant(booking.status)} size="sm">
                          {booking.status}
                        </Badge>
                      </Stack>
                      <p className="text-sm font-medium ds-text-gray-900">
                        {formatCurrency(booking.costs.total, booking.costs.currency)}
                      </p>
                    </Stack>
                    
                    <Stack direction="horizontal" spacing={6} wrap className="text-sm ds-text-gray-500">
                      <Stack direction="horizontal" spacing={2} align="center">
                        <Calendar className="h-5 w-5 ds-text-gray-400 flex-shrink-0" />
                        <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                      </Stack>
                      {booking.duration.days && (
                        <Stack direction="horizontal" spacing={2} align="center">
                          <Clock className="h-5 w-5 ds-text-gray-400 flex-shrink-0" />
                          <span>{booking.duration.days} days</span>
                        </Stack>
                      )}
                      {booking.duration.hours && (
                        <Stack direction="horizontal" spacing={2} align="center">
                          <Clock className="h-5 w-5 ds-text-gray-400 flex-shrink-0" />
                          <span>{booking.duration.hours} hours</span>
                        </Stack>
                      )}
                      {view === 'provider' && booking.status === 'PENDING' && (
                        <Stack direction="horizontal" spacing={2} align="center" className="text-orange-600">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <span>Action Required</span>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </div>
  );
}
