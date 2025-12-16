/**
 * Data Export Page
 * Allows users to export their personal data (GDPR compliance)
 * Requirement 20.1: GDPR data export
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { Container, Card, Button } from '../design-system/components';
import { colors } from '../design-system/tokens/colors';
import { Download, FileDown } from 'lucide-react';

export default function DataExportPage() {
  const { token } = useAuth();
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  // Export data mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      return apiClient.get<any>('/gdpr/export', token || '');
    },
    onSuccess: (data) => {
      setExportData(data);
      setExportSuccess(true);
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleDownload = () => {
    if (!exportData) return;

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vider-data-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen py-8" style={{ backgroundColor: colors.background.page }}>
        <Container>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: colors.gray[900] }}>Export Your Data</h1>
            <p className="mt-2" style={{ color: colors.gray[600] }}>
              Download a copy of all your personal data stored in Vider
            </p>
          </div>

          {/* Info card */}
          <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-medium mb-4" style={{ color: colors.gray[900] }}>What's included?</h2>
              <ul className="space-y-2 text-sm" style={{ color: colors.gray[600] }}>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Your account information (name, email, phone)</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Your company information</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>All bookings (as renter and provider)</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Ratings and reviews you've submitted</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Messages you've sent</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Notifications</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 ds-text-success mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Audit logs (if you're an admin)</span>
                </li>
              </ul>

              <div className="mt-6 p-4 rounded-md" style={{ backgroundColor: colors.primary[50] }}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      style={{ color: colors.semantic.info }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm" style={{ color: colors.primary[700] }}>
                      Your data will be exported in JSON format, which is machine-readable and can be
                      imported into other systems.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

          {/* Success message */}
          {exportSuccess && (
            <div className="mb-6 rounded-md p-4" style={{ backgroundColor: '#D1FAE5' }}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: colors.semantic.success }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium" style={{ color: colors.semantic.success }}>
                    Data exported successfully! Click the download button below to save your data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {exportMutation.isError && (
            <div className="mb-6 rounded-md p-4" style={{ backgroundColor: '#FEE2E2' }}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: colors.semantic.error }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium" style={{ color: colors.semantic.error }}>
                    {exportMutation.error instanceof Error
                      ? exportMutation.error.message
                      : 'Failed to export data. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleExport}
                variant="primary"
                size="lg"
                loading={exportMutation.isPending}
                leftIcon={<Download size={20} />}
                fullWidth
              >
                Export My Data
              </Button>

              {exportSuccess && (
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  size="lg"
                  leftIcon={<FileDown size={20} />}
                  fullWidth
                >
                  Download JSON File
                </Button>
              )}
            </div>
          </Card>
        </Container>
      </div>
    </>
  );
}
