/**
 * User Audit Log Page
 * Displays audit log entries that affect the user or their company
 * Requirement 20.4: User access to audit logs
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { Container, Card, Table, Badge } from '../design-system/components';
import type { Column } from '../design-system/components';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  reason: string | null;
  createdAt: string;
  adminUser: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function UserAuditLogPage() {
  const { token } = useAuth();

  // Fetch audit log
  const { data, isLoading, error } = useQuery<{ auditLogs: AuditLogEntry[] }>({
    queryKey: ['user-audit-log'],
    queryFn: async () => {
      return apiClient.get<{ auditLogs: AuditLogEntry[] }>('/gdpr/audit-log', token || '');
    },
    enabled: !!token,
  });

  const auditLogs = data?.auditLogs || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen ds-bg-page flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 ds-border-primary-600 mx-auto"></div>
            <p className="mt-4 ds-text-gray-600">Loading audit log...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen ds-bg-page py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-md ds-bg-error-light p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 ds-text-error"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium ds-text-error">
                    {error instanceof Error ? error.message : 'Failed to load audit log'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (entry) => {
        const variant = entry.action.includes('VERIFY')
          ? 'success'
          : entry.action.includes('SUSPEND') || entry.action.includes('REMOVE')
          ? 'error'
          : entry.action.includes('RESOLVE')
          ? 'info'
          : 'neutral';
        return <Badge variant={variant}>{entry.action.replace(/_/g, ' ')}</Badge>;
      },
    },
    {
      key: 'entityType',
      header: 'Entity Type',
      render: (entry) => <span className="text-sm ds-text-gray-600">{entry.entityType}</span>,
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (entry) => (
        <div className="text-sm">
          <div className="font-medium ds-text-gray-900">
            {entry.adminUser.firstName} {entry.adminUser.lastName}
          </div>
          <div className="ds-text-gray-500">{entry.adminUser.email}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (entry) => (
        <div className="text-sm ds-text-gray-900">
          {entry.reason || '-'}
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer ds-text-primary-600 ds-hover-text-primary-600 text-xs">
                View changes
              </summary>
              <pre className="mt-2 text-xs ds-bg-page p-2 rounded overflow-x-auto max-w-xs">
                {JSON.stringify(entry.changes, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (entry) => <span className="text-sm ds-text-gray-500">{formatDate(entry.createdAt)}</span>,
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen ds-bg-page py-8">
        <Container>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold ds-text-gray-900">Audit Log</h1>
            <p className="mt-2 ds-text-gray-600">
              Administrative actions that have affected your account or company
            </p>
          </div>

          {/* Info card */}
          <div className="mb-6 p-4 ds-bg-primary-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 ds-text-info"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm ds-text-primary-700">
                  This log shows all administrative actions performed by platform administrators that
                  have affected your user account, company, or listings. This is part of our
                  commitment to transparency and GDPR compliance.
                </p>
              </div>
            </div>
          </div>

          {/* Audit log table */}
          <Card padding="lg">
            <Table
              columns={columns}
              data={auditLogs}
              emptyMessage="No administrative actions have been performed on your account or company yet."
              rowKey={(entry) => entry.id}
            />
          </Card>

          {/* Footer note */}
          {auditLogs.length > 0 && (
            <div className="mt-6 text-sm ds-text-gray-500 text-center">
              Showing {auditLogs.length} audit log {auditLogs.length === 1 ? 'entry' : 'entries'}
            </div>
          )}
        </Container>
      </div>
    </>
  );
}
