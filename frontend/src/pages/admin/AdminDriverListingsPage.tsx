/**
 * Admin Driver Listings Page
 * Manage driver listings with verification, suspend, and remove functionality
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { MagnifyingGlassIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

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
  const { token } = useAuth();
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
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      params.append('page', page.toString());
      params.append('pageSize', '20');
      
      return apiClient.get(`/admin/listings/drivers?${params.toString()}`, token!);
    },
    enabled: !!token,
  });

  const verifyMutation = useMutation({
    mutationFn: async (driverId: string) => {
      return apiClient.post(`/admin/listings/drivers/${driverId}/verify`, {}, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-listings'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.post(`/admin/listings/driver/${id}/suspend`, { reason }, token!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-listings'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ id }: { id: string; reason: string }) => {
      return apiClient.delete(`/admin/listings/driver/${id}`, token!);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Driver Listings</h1>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or license class..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading listings...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Failed to load listings. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.items.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{listing.name}</div>
                          {listing.verified && (
                            <CheckBadgeIcon className="ml-2 h-5 w-5 text-blue-600" title="Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {listing.company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.licenseClass}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.aggregatedRating ? (
                          <div>
                            <span className="font-medium">{listing.aggregatedRating.toFixed(1)}</span>
                            <span className="text-gray-400"> ({listing.totalRatings})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            listing.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'SUSPENDED'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {!listing.verified && listing.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleVerify(listing.id)}
                            disabled={verifyMutation.isPending}
                            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            Verify
                          </button>
                        )}
                        {listing.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleSuspend(listing.id)}
                              disabled={suspendMutation.isPending}
                              className="text-yellow-600 hover:text-yellow-800 font-medium disabled:opacity-50"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => handleRemove(listing.id)}
                              disabled={removeMutation.isPending}
                              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {listing.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleRemove(listing.id)}
                            disabled={removeMutation.isPending}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total listings)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No driver listings found</p>
          </div>
        )}
      </div>
    </AdminPanelPage>
  );
};

export default AdminDriverListingsPage;
