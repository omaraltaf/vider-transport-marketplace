/**
 * Admin Disputes Page
 * View and manage disputes
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AdminPanelPage from '../AdminPanelPage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { Container, Table, Badge, Button, SearchBar, Spinner } from '../../design-system/components';

interface Dispute {
  id: string;
  bookingId: string;
  reason: string;
  description: string | null;
  status: string;
  raisedBy: string;
  createdAt: string;
}

interface SearchResult {
  items: Dispute[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const AdminDisputesPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedQuery(value), 500);
  };

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['admin-disputes', debouncedQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      params.append('page', page.toString());
      params.append('pageSize', '20');
      return apiClient.get(`/admin/disputes?${params.toString()}`, token!);
    },
    enabled: !!token,
  });

  return (
    <AdminPanelPage>
      <Container >
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Disputes</h1>

        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search disputes..."
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 ds-text-gray-600">Loading disputes...</p>
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load disputes. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'bookingId',
                  header: 'Booking ID',
                  render: ( dispute) => (
                    <span className="text-sm font-medium text-neutral-900">
                      {dispute.bookingId.substring(0, 8)}...
                    </span>
                  ),
                },
                {
                  key: 'reason',
                  header: 'Reason',
                  render: ( dispute) => (
                    <span className="text-sm text-neutral-900">{dispute.reason}</span>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: ( dispute) => (
                    <span className="text-sm text-neutral-500 max-w-xs truncate block">
                      {dispute.description || 'N/A'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: ( dispute) => (
                    <Badge
                      variant={
                        dispute.status === 'RESOLVED'
                          ? 'success'
                          : dispute.status === 'OPEN'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {dispute.status}
                    </Badge>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  render: ( dispute) => (
                    <span className="text-sm text-neutral-500">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
              ]}
              data={data.items.map((dispute) => ({
                ...dispute,
                onClick: () => navigate(`/admin/disputes/${dispute.id}`),
              }))}
            />

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm ds-text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total disputes)
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
            <p className="text-neutral-500">No disputes found</p>
          </div>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminDisputesPage;
