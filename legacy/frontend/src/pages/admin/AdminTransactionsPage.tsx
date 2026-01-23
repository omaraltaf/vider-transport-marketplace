/**
 * Admin Transactions Page
 * View all transactions
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminPanelPage from '../AdminPanelPage';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import { Container, Table, Badge, Button, Spinner } from '../../design-system/components';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  booking: {
    id: string;
    bookingNumber: string;
  };
  createdAt: string;
}

interface SearchResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const AdminTransactionsPage = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['admin-transactions', page],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '20');
      return apiClient.get(`/admin/transactions?${params.toString()}`, validToken);
    },
    enabled: !!user,
  });

  return (
    <AdminPanelPage>
      <Container >
        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Transactions</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 ds-text-gray-600">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load transactions. Please try again.</p>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <Table
              columns={[
                {
                  key: 'bookingNumber',
                  header: 'Booking #',
                  render: ( transaction) => (
                    <span className="text-sm font-medium text-neutral-900">
                      {transaction.booking.bookingNumber}
                    </span>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  render: ( transaction) => (
                    <Badge
                      variant={
                        transaction.type === 'COMMISSION'
                          ? 'info'
                          : transaction.type === 'REFUND'
                          ? 'error'
                          : 'default'
                      }
                    >
                      {transaction.type}
                    </Badge>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: ( transaction) => (
                    <span className="text-sm text-neutral-900">
                      {transaction.amount} {transaction.currency}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: ( transaction) => (
                    <Badge
                      variant={
                        transaction.status === 'COMPLETED'
                          ? 'success'
                          : transaction.status === 'PENDING'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {transaction.status}
                    </Badge>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Date',
                  render: ( transaction) => (
                    <span className="text-sm text-neutral-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
              ]}
              data={data.items}
            />

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm ds-text-gray-700">
                  Showing page {data.page} of {data.totalPages} ({data.total} total transactions)
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
            <p className="text-neutral-500">No transactions found</p>
          </div>
        )}
      </Container>
    </AdminPanelPage>
  );
};

export default AdminTransactionsPage;
