/**
 * Admin Users Page
 * Manage and search users
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { Container, Table, Badge, Button, SearchBar, Spinner } from '../../design-system/components';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  company: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface SearchResult {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const AdminUsersPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setTimeout(() => setDebouncedQuery(value), 500);
  };

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['admin-users', debouncedQuery, page],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      params.append('page', page.toString());
      params.append('pageSize', '20');
      
      return apiClient.get(`/admin/users?${params.toString()}`, validToken);
    },
    enabled: !!user,
  });

  return (
    <AdminPanelPage>
      <Container>
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Users</h1>

        {/* Search */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by email or name..."
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 ds-text-gray-600">Loading users...</p>
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load users. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'user',
                  header: 'User',
                  render: ( user) => (
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-neutral-500">{user.email}</div>
                    </div>
                  ),
                },
                {
                  key: 'company',
                  header: 'Company',
                  render: ( user) => (
                    <div className="text-sm text-neutral-900">{user.company.name}</div>
                  ),
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: ( user) => (
                    <Badge variant="info">{user.role}</Badge>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: ( user) =>
                    user.emailVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  render: ( user) => (
                    <span className="text-sm text-neutral-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
              ]}
              data={data.items}
            />

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm ds-text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total users)
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
            <p className="text-neutral-500">No users found</p>
          </div>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminUsersPage;
