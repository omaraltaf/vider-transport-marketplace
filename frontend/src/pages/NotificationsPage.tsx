/**
 * Notifications Page
 * Displays all user notifications
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import type { Notification } from '../types';
import { Card, Container, Stack, Button, Spinner } from '../design-system/components';
import ConflictResolutionModal from '../components/availability/ConflictResolutionModal';

export default function NotificationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const unreadParam = filter === 'unread' ? '?unreadOnly=true' : '';
      return apiClient.get<Notification[]>(`/notifications${unreadParam}`, token || '');
    },
    enabled: !!token,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiClient.put(`/notifications/${notificationId}/read`, {}, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.put('/notifications/mark-all-read', {}, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    const metadata = notification.metadata || {};
    switch (notification.type) {
      case 'AVAILABILITY_CONFLICT':
        // Open conflict resolution modal
        setSelectedConflict({
          notificationId: notification.id,
          blockId: metadata.blockId,
          bookingId: metadata.bookingId,
          bookingNumber: metadata.bookingNumber,
          listingId: metadata.listingId,
          listingTitle: metadata.listingTitle,
          startDate: metadata.startDate,
          endDate: metadata.endDate,
          conflictType: metadata.conflictType || 'block_vs_booking',
        });
        setConflictModalOpen(true);
        break;
      case 'BOOKING_REJECTED_BLOCKED_DATES':
        // Navigate to listing calendar
        if (metadata.listingId) {
          navigate(`/listings/${metadata.listingId}`);
        }
        break;
      case 'BOOKING_REQUEST':
      case 'BOOKING_ACCEPTED':
      case 'BOOKING_DECLINED':
      case 'BOOKING_EXPIRED':
      case 'BOOKING_COMPLETED':
        if (metadata.bookingId) {
          navigate(`/bookings/${metadata.bookingId}`);
        }
        break;
      case 'MESSAGE_RECEIVED':
        navigate('/messages');
        break;
      case 'RATING_RECEIVED':
        if (metadata.bookingId) {
          navigate(`/bookings/${metadata.bookingId}`);
        }
        break;
      default:
        break;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'AVAILABILITY_CONFLICT':
      case 'BOOKING_REJECTED_BLOCKED_DATES':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-warning-100 p-3">
            <svg className="h-6 w-6 ds-text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'BOOKING_REQUEST':
      case 'BOOKING_ACCEPTED':
      case 'BOOKING_DECLINED':
      case 'BOOKING_EXPIRED':
      case 'BOOKING_COMPLETED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-info-100 p-3">
            <svg className="h-6 w-6 ds-text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'MESSAGE_RECEIVED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-success-100 p-3">
            <svg className="h-6 w-6 ds-text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        );
      case 'RATING_RECEIVED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-warning-100 p-3">
            <svg className="h-6 w-6 ds-text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case 'COMPANY_VERIFIED':
      case 'DRIVER_VERIFIED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-primary-100 p-3">
            <svg className="h-6 w-6 ds-text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'DISPUTE_RAISED':
      case 'DISPUTE_RESOLVED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-error-100 p-3">
            <svg className="h-6 w-6 ds-text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-gray-100 p-3">
            <svg className="h-6 w-6 ds-text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen ds-bg-page flex items-center justify-center">
          <Stack spacing={4} align="center">
            <Spinner size="lg" />
            <p className="ds-text-gray-600">Loading notifications...</p>
          </Stack>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen ds-bg-page py-8">
        <Container>
          <Stack spacing={6}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold ds-text-gray-900">Notifications</h1>
                <p className="mt-2 ds-text-gray-600">Stay updated with your activity</p>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/settings/notifications')}
                leftIcon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Settings
              </Button>
            </div>

          {/* Filter tabs */}
          <div className="mb-6 border-b ds-border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setFilter('all')}
                className={`${
                  filter === 'all'
                    ? 'border-indigo-500 ds-text-primary-600'
                    : 'border-transparent ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700'
                } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`${
                  filter === 'unread'
                    ? 'border-indigo-500 ds-text-primary-600'
                    : 'border-transparent ds-text-gray-500 hover:ds-border-gray-300 ds-hover-text-gray-700'
                } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
              >
                Unread
              </button>
            </nav>
          </div>

          {/* Mark all as read button */}
          {notifications.some((n) => !n.read) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                loading={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
              </Button>
            </div>
          )}

          {/* Notifications list */}
          <Card padding="sm">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 ds-text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium ds-text-gray-900">No notifications</h3>
                <p className="mt-1 text-sm ds-text-gray-500">
                  {filter === 'unread' ? "You're all caught up!" : 'Check back later for updates'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-6 py-4 ds-hover-bg-page transition-colors ${
                      !notification.read ? 'ds-bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p
                            className={`text-sm ${
                              !notification.read ? 'font-semibold' : 'font-medium'
                            } ds-text-gray-900`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="ml-2 inline-block h-2 w-2 rounded-full ds-bg-primary-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm ds-text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs ds-text-gray-400 mt-2">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          </Stack>
        </Container>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <ConflictResolutionModal
          isOpen={conflictModalOpen}
          onClose={() => {
            setConflictModalOpen(false);
            setSelectedConflict(null);
          }}
          conflict={selectedConflict}
        />
      )}
    </>
  );
}
