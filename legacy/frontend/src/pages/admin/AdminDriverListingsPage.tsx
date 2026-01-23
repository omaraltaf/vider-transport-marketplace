/**
 * Admin Driver Listings Page
 * Manage driver listings with verification, suspend, and remove functionality
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { Container, Table, Badge, Button, SearchBar, Spinner } from '../../design-system/components';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';

interface DriverListing {
  id: string;
  name: string;
  licenseClass: string;
  verified: boolean;
  verifiedAt: string | null;
  status: string;
  company: {
    id: string;
    name: string;
  };
  pricing: {
    dailyRate?: number;
    currency: string;
  };
  aggregatedRating: number | null;
  totalRatings: number;
  createdAt: string;
}

interface SearchResult {
  items: DriverListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const AdminDriverListingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedQuery(value), 500);
  };

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['admin-driver-listings', debouncedQuery, page],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      params.append('page', page.toString());
      params.append('pageSize', '20');
      
      return apiClient.get(`/admin/listings/drivers?${params.toString()}`, validToken);
    },
    enabled: !!user,
  });

  const verifyMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/admin/listings/drivers/${driverId}/verify`, {}, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-listings'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/admin/listings/driver/${id}/suspend`, { reason }, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-listings'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ id }: { id: string; reason: string }) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.delete(`/admin/listings/driver/${id}`, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-listings'] });
    },
  });

  const handleVerify = async (driverId: string) => {
    if (confirm('Are you sure you want to verify this driver?')) {
      try {
        await verifyMutation.mutateAsync(driverId);
        alert('Driver verified successfully');
      } catch (error: any) {
        alert(error.message || 'Failed to verify driver');
      }
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt('Please provide a reason for suspension:');
    if (reason) {
      try {
        await suspendMutation.mutateAsync({ id, reason });
        alert('Listing suspended successfully');
      } catch (error: any) {
        alert(error.message || 'Failed to suspend listing');
      }
    }
  };

  const handleRemove = async (id: string) => {
    const reason = prompt('Please provide a reason for removal:');
    if (reason && confirm('Are you sure you want to permanently remove this listing?')) {
      try {
        await removeMutation.mutateAsync({ id, reason });
        alert('Listing removed successfully');
      } catch (error: any) {
        alert(error.message || 'Failed to remove listing');
      }
    }
  };

  return (
    <AdminPanelPage>
      <Container >
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Driver Listings</h1>

        {/* Search */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by name or license class..."
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 ds-text-gray-600">Loading listings...</p>
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load listings. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'driver',
                  header: 'Driver',
                  render: ( listing) => (
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-neutral-900">{listing.name}</div>
                      {listing.verified && (
                        <CheckBadgeIcon className="ml-2 h-5 w-5 ds-text-primary-600" title="Verified" />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'company',
                  header: 'Company',
                  render: ( listing) => (
                    <span className="text-sm text-neutral-900">{listing.company.name}</span>
                  ),
                },
                {
                  key: 'license',
                  header: 'License',
                  render: ( listing) => (
                    <span className="text-sm text-neutral-500">{listing.licenseClass}</span>
                  ),
                },
                {
                  key: 'rating',
                  header: 'Rating',
                  render: ( listing) =>
                    listing.aggregatedRating ? (
                      <div className="text-sm text-neutral-500">
                        <span className="font-medium">{listing.aggregatedRating.toFixed(1)}</span>
                        <span className="ds-text-gray-400"> ({listing.totalRatings})</span>
                      </div>
                    ) : (
                      <span className="text-sm ds-text-gray-400">No ratings</span>
                    ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: ( listing) => (
                    <Badge
                      variant={
                        listing.status === 'ACTIVE'
                          ? 'success'
                          : listing.status === 'SUSPENDED'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {listing.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: ( listing) => (
                    <div className="flex gap-2">
                      {!listing.verified && listing.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(listing.id)}
                          disabled={verifyMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                      {listing.status === 'ACTIVE' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(listing.id)}
                            disabled={suspendMutation.isPending}
                          >
                            Suspend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(listing.id)}
                            disabled={removeMutation.isPending}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                      {listing.status === 'SUSPENDED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(listing.id)}
                          disabled={removeMutation.isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={data.items}
            />

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm ds-text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total listings)
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
            <p className="text-neutral-500">No driver listings found</p>
          </div>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminDriverListingsPage;
