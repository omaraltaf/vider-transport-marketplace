import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import AdminPanelPage from '../AdminPanelPage';
import { Container, Card, Table, Badge, Button, Select, Input, Spinner } from '../../design-system/components';

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface AuditLogResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminAuditLogPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  const { data, isLoading } = useQuery<AuditLogResult>({
    queryKey: ['admin-audit-log', page, filters],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      });

      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      return apiClient.get<AuditLogResult>(`/admin/audit-log?${params.toString()}`, validToken);
    },
    enabled: !!user,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  return (
    <AdminPanelPage>
      <Container >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-neutral-900">Audit Log</h1>
          </div>

          {/* Filters */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="action" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  Action
                </label>
                <Select
                  value={filters.action}
                  onChange={(value) => handleFilterChange('action', value)}
                  options={[
                    { value: '', label: 'All Actions' },
                    { value: 'VERIFY_COMPANY', label: 'Verify Company' },
                    { value: 'VERIFY_DRIVER', label: 'Verify Driver' },
                    { value: 'SUSPEND_LISTING', label: 'Suspend Listing' },
                    { value: 'REMOVE_LISTING', label: 'Remove Listing' },
                    { value: 'RESOLVE_DISPUTE', label: 'Resolve Dispute' },
                    { value: 'UPDATE_PLATFORM_CONFIG', label: 'Update Config' },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="entityType" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  Entity Type
                </label>
                <Select
                  value={filters.entityType}
                  onChange={(value) => handleFilterChange('entityType', value)}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'Company', label: 'Company' },
                    { value: 'DriverListing', label: 'Driver Listing' },
                    { value: 'VehicleListing', label: 'Vehicle Listing' },
                    { value: 'Dispute', label: 'Dispute' },
                    { value: 'PlatformConfig', label: 'Platform Config' },
                  ]}
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(value) => handleFilterChange('startDate', value)}
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(value) => handleFilterChange('endDate', value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </Card>

          {/* Audit Log Table */}
          <Card padding="lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <Table
                  columns={[
                    {
                      key: 'timestamp',
                      header: 'Timestamp',
                      render: ( entry) => (
                        <span className="text-sm text-neutral-900">
                          {new Date(entry.createdAt).toLocaleString('nb-NO')}
                        </span>
                      ),
                    },
                    {
                      key: 'adminUser',
                      header: 'Admin User',
                      render: ( entry) => (
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {entry.adminUser
                              ? `${entry.adminUser.firstName} ${entry.adminUser.lastName}`
                              : 'Unknown'}
                          </div>
                          <div className="text-sm text-neutral-500">{entry.adminUser?.email}</div>
                        </div>
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      render: ( entry) => (
                        <Badge
                          variant={
                            entry.action.includes('VERIFY')
                              ? 'success'
                              : entry.action.includes('SUSPEND') || entry.action.includes('REMOVE')
                              ? 'error'
                              : entry.action.includes('RESOLVE')
                              ? 'info'
                              : entry.action.includes('UPDATE')
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {entry.action}
                        </Badge>
                      ),
                    },
                    {
                      key: 'entity',
                      header: 'Entity',
                      render: ( entry) => (
                        <div>
                          <div className="text-sm text-neutral-900">{entry.entityType}</div>
                          <div className="text-sm text-neutral-500 truncate max-w-xs" title={entry.entityId}>
                            {entry.entityId}
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'changes',
                      header: 'Changes',
                      render: ( entry) =>
                        entry.changes && Object.keys(entry.changes).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="ds-text-primary-600 hover:text-primary-800">
                              View Changes
                            </summary>
                            <pre className="mt-2 text-xs ds-bg-page p-2 rounded overflow-x-auto">
                              {JSON.stringify(entry.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="ds-text-gray-400">No changes</span>
                        ),
                    },
                    {
                      key: 'reason',
                      header: 'Reason',
                      render: ( entry) => (
                        <span className="text-sm text-neutral-500">{entry.reason || '-'}</span>
                      ),
                    },
                  ]}
                  data={data?.items || []}
                  emptyMessage="No audit log entries found"
                />

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm ds-text-gray-700">
                      Showing {(page - 1) * data.pageSize + 1} to{' '}
                      {Math.min(page * data.pageSize, data.total)} of {data.total} results
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                        disabled={page === data.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </Container>
    </AdminPanelPage>
  );
}
