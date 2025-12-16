/**
 * Delete Account Page
 * Allows users to permanently delete their account (GDPR compliance)
 * Requirement 20.2: GDPR data deletion
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { Container, Card, Button, Modal, Input } from '../design-system/components';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteAccountPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete<{ message: string }>('/gdpr/account', token || '');
    },
    onSuccess: () => {
      // Log out and redirect to home page
      logout();
      navigate('/', { replace: true });
    },
  });

  const handleDelete = () => {
    if (confirmText === 'DELETE MY ACCOUNT') {
      deleteMutation.mutate();
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen ds-bg-page py-8">
        <Container>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold ds-text-gray-900">Delete Account</h1>
            <p className="mt-2 ds-text-gray-600">
              Permanently delete your account and all associated data
            </p>
          </div>

          {/* Warning card */}
          <div className="ds-bg-error-light border-2 ds-border-error rounded-lg mb-6 p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 ds-text-error" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium ds-text-error">Warning: This action is irreversible</h3>
                <div className="mt-2 text-sm ds-text-error">
                  <p>Deleting your account will:</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          <Card padding="lg" className="mb-6">
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">What will be deleted?</h2>
              <ul className="space-y-2 text-sm ds-text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Your account information (name, email, phone) will be anonymized</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>All messages you've sent will be deleted</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>All notifications will be deleted</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>You will lose access to your account immediately</span>
                </li>
              </ul>

              <h2 className="text-lg font-medium ds-text-gray-900 mb-4 mt-6">What will be kept?</h2>
              <ul className="space-y-2 text-sm ds-text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Booking records (anonymized) - required for legal and financial compliance
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Transaction records - required for accounting and tax purposes</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Ratings and reviews - but your personal information will be anonymized</span>
                </li>
              </ul>

              <div className="mt-6 p-4 ds-bg-warning-50 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> You cannot delete your account if:
                    </p>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      <li>You are the only admin of your company</li>
                      <li>You have active bookings (pending, accepted, or in progress)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

          {/* Error message */}
          {deleteMutation.isError && (
            <div className="mb-6 rounded-md ds-bg-error-light p-4">
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
                    {deleteMutation.error instanceof Error
                      ? deleteMutation.error.message
                      : 'Failed to delete account. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation section */}
          {!showConfirmation ? (
            <Card padding="lg">
              <Button
                onClick={() => setShowConfirmation(true)}
                variant="danger"
                size="lg"
                leftIcon={<Trash2 size={20} />}
                fullWidth
              >
                I Want to Delete My Account
              </Button>
            </Card>
          ) : null}

          {/* Confirmation Modal */}
          <Modal
            isOpen={showConfirmation}
            onClose={() => {
              setShowConfirmation(false);
              setConfirmText('');
            }}
            title="Confirm Account Deletion"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm ds-text-gray-600">
                To confirm, please type <strong>DELETE MY ACCOUNT</strong> in the box below:
              </p>
              <Input
                type="text"
                value={confirmText}
                onChange={setConfirmText}
                placeholder="DELETE MY ACCOUNT"
              />
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmText('');
                  }}
                  variant="outline"
                  size="md"
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE MY ACCOUNT'}
                  variant="danger"
                  size="md"
                  loading={deleteMutation.isPending}
                  fullWidth
                >
                  Delete My Account Permanently
                </Button>
              </div>
            </div>
          </Modal>
        </Container>
      </div>
    </>
  );
}
