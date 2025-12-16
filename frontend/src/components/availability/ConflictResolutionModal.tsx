/**
 * Conflict Resolution Modal
 * Allows providers to resolve availability conflicts by cancelling booking or removing block
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api';
import { Modal, Button, Stack } from '../../design-system/components';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: {
    notificationId: string;
    blockId?: string;
    bookingId?: string;
    bookingNumber?: string;
    listingId: string;
    listingTitle: string;
    startDate: string;
    endDate: string;
    conflictType: 'block_vs_booking' | 'booking_vs_block';
  };
}

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  conflict,
}: ConflictResolutionModalProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<'cancel_booking' | 'remove_block' | null>(
    null
  );

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async () => {
      if (!conflict.bookingId) throw new Error('No booking ID');
      return apiClient.put(
        `/bookings/${conflict.bookingId}/cancel`,
        { reason: 'Availability conflict' },
        token || ''
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      onClose();
    },
  });

  // Remove block mutation
  const removeBlockMutation = useMutation({
    mutationFn: async () => {
      if (!conflict.blockId) throw new Error('No block ID');
      return apiClient.delete(`/availability/blocks/${conflict.blockId}`, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      onClose();
    },
  });

  const handleResolve = () => {
    if (selectedAction === 'cancel_booking') {
      cancelBookingMutation.mutate();
    } else if (selectedAction === 'remove_block') {
      removeBlockMutation.mutate();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isLoading = cancelBookingMutation.isPending || removeBlockMutation.isPending;
  const error = cancelBookingMutation.error || removeBlockMutation.error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Availability Conflict"
      size="md"
    >
      <Stack spacing={4}>
        {/* Conflict details */}
        <div className="ds-bg-warning-50 border ds-border-warning-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 ds-text-warning-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-medium ds-text-warning-800">Availability Conflict Detected</p>
              <p className="text-sm ds-text-warning-700 mt-1">
                There is a conflict for <strong>{conflict.listingTitle}</strong> between{' '}
                {formatDate(conflict.startDate)} and {formatDate(conflict.endDate)}.
              </p>
            </div>
          </div>
        </div>

        {/* Conflict information */}
        <div className="ds-bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium ds-text-gray-900 mb-2">Conflict Details</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="ds-text-gray-600">Listing:</dt>
              <dd className="font-medium ds-text-gray-900">{conflict.listingTitle}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="ds-text-gray-600">Period:</dt>
              <dd className="font-medium ds-text-gray-900">
                {formatDate(conflict.startDate)} - {formatDate(conflict.endDate)}
              </dd>
            </div>
            {conflict.bookingNumber && (
              <div className="flex justify-between">
                <dt className="ds-text-gray-600">Booking:</dt>
                <dd className="font-medium ds-text-gray-900">{conflict.bookingNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Resolution options */}
        <div>
          <h4 className="font-medium ds-text-gray-900 mb-3">Choose Resolution</h4>
          <Stack spacing={2}>
            {conflict.bookingId && (
              <button
                onClick={() => setSelectedAction('cancel_booking')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedAction === 'cancel_booking'
                    ? 'ds-border-primary-600 ds-bg-primary-50'
                    : 'ds-border-gray-200 ds-hover-border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 mt-0.5 ${
                      selectedAction === 'cancel_booking'
                        ? 'ds-border-primary-600 ds-bg-primary-600'
                        : 'ds-border-gray-300'
                    }`}
                  >
                    {selectedAction === 'cancel_booking' && (
                      <svg
                        className="h-full w-full text-white"
                        fill="currentColor"
                        viewBox="0 0 12 12"
                      >
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium ds-text-gray-900">Cancel the booking</p>
                    <p className="text-sm ds-text-gray-600 mt-1">
                      Cancel booking {conflict.bookingNumber} and keep the availability block.
                      The renter will be notified.
                    </p>
                  </div>
                </div>
              </button>
            )}

            {conflict.blockId && (
              <button
                onClick={() => setSelectedAction('remove_block')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedAction === 'remove_block'
                    ? 'ds-border-primary-600 ds-bg-primary-50'
                    : 'ds-border-gray-200 ds-hover-border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 mt-0.5 ${
                      selectedAction === 'remove_block'
                        ? 'ds-border-primary-600 ds-bg-primary-600'
                        : 'ds-border-gray-300'
                    }`}
                  >
                    {selectedAction === 'remove_block' && (
                      <svg
                        className="h-full w-full text-white"
                        fill="currentColor"
                        viewBox="0 0 12 12"
                      >
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium ds-text-gray-900">Remove the availability block</p>
                    <p className="text-sm ds-text-gray-600 mt-1">
                      Remove the availability block and allow the booking to proceed.
                    </p>
                  </div>
                </div>
              </button>
            )}
          </Stack>
        </div>

        {/* Error message */}
        {error && (
          <div className="ds-bg-error-50 border ds-border-error-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 ds-text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm ds-text-error">
                  {error instanceof Error ? error.message : 'Failed to resolve conflict'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t ds-border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleResolve}
            disabled={!selectedAction || isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Resolving...' : 'Resolve Conflict'}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
}
