/**
 * User Audit Log Page
 * Displays audit log entries that affect the user or their company
 * Requirement 20.4: User access to audit logs
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';

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

  const getActionBadgeColor = (action: string) => {
    if (action.includes('VERIFY')) return 'bg-green-100 text-green-800';
    if (action.includes('SUSPEND') || action.includes('REMOVE')) return 'bg-red-100 text-red-800';
    if (action.includes('RESOLVE')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audit log...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
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
                  <p className="text-sm font-medium text-red-800">
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="mt-2 text-gray-600">
              Administrative actions that have affected your account or company
            </p>
          </div>

          {/* Info card */}
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
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
                <p className="text-sm text-blue-700">
                  This log shows all administrative actions performed by platform administrators that
                  have affected your user account, company, or listings. This is part of our
                  commitment to transparency and GDPR compliance.
                </p>
              </div>
            </div>
          </div>

          {/* Audit log entries */}
          {auditLogs.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No audit log entries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No administrative actions have been performed on your account or company yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {auditLogs.map((entry) => (
                  <li key={entry.id} className="px-6 py-5 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionBadgeColor(
                              entry.action
                            )}`}
                          >
                            {entry.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-gray-500">{entry.entityType}</span>
                        </div>

                        <div className="mt-2 text-sm text-gray-900">
                          <p>
                            <span className="font-medium">Admin:</span>{' '}
                            {entry.adminUser.firstName} {entry.adminUser.lastName} (
                            {entry.adminUser.email})
                          </p>
                          {entry.reason && (
                            <p className="mt-1">
                              <span className="font-medium">Reason:</span> {entry.reason}
                            </p>
                          )}
                          {entry.changes && Object.keys(entry.changes).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-indigo-600 hover:text-indigo-500">
                                View changes
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                                {JSON.stringify(entry.changes, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>

                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {formatDate(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer note */}
          {auditLogs.length > 0 && (
            <div className="mt-6 text-sm text-gray-500 text-center">
              Showing {auditLogs.length} audit log {auditLogs.length === 1 ? 'entry' : 'entries'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
