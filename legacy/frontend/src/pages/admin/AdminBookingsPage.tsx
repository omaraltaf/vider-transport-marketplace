/**
 * Admin Bookings Page
 * View and manage all bookings
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useEnhancedAuth } from '../../contexts/EnhancedAuthContext';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { Container, Table, Badge, Button, SearchBar, Spinner } from '../../design-system/components';

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  renterCompany: { id: string; name: string };
  providerCompany: { id: string; name: string };
  costs: { total: number; currency: string };
  createdAt: string;
}

interface SearchResult {
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const AdminBookingsPage = () => {
  const { user } = useEnhancedAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedQuery(value), 500);
  };

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['admin-bookings', debouncedQuery, page],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      params.append('page', page.toString());
      params.append('pageSize', '20');
      return apiClient.get(`/admin/bookings?${params.toString()}`, validToken);
    },
    enabled: !!user,
  });

  return (
    <AdminPanelPage>
      <Container >
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Bookings</h1>

        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by booking number..."
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 ds-text-gray-600">Loading bookings...</p>
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load bookings. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'bookingNumber',
                  header: 'Booking #',
                  render: ( booking) => (
                    <span className="text-sm font-medium text-neutral-900">{booking.bookingNumber}</span>
                  ),
                },
                {
                  key: 'renter',
                  header: 'Renter',
                  render: ( booking) => (
                    <span className="text-sm text-neutral-900">{booking.renterCompany.name}</span>
                  ),
                },
                {
                  key: 'provider',
                  header: 'Provider',
                  render: ( booking) => (
                    <span className="text-sm text-neutral-900">{booking.providerCompany.name}</span>
                  ),
                },
                {
                  key: 'dates',
                  header: 'Dates',
                  render: ( booking) => (
                    <span className="text-sm text-neutral-500">
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'total',
                  header: 'Total',
                  render: ( booking) => (
                    <span className="text-sm text-neutral-900">
                      {booking.costs.total} {booking.costs.currency}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: ( booking) => (
                    <Badge
                      variant={
                        booking.status === 'COMPLETED'
                          ? 'success'
                          : booking.status === 'ACTIVE'
                          ? 'info'
                          : booking.status === 'PENDING'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {booking.status}
                    </Badge>
                  ),
                },
              ]}
              data={data.items}
            />

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm ds-text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total bookings)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-neutral-500">No bookings found</p>
          </div>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminBookingsPage;
