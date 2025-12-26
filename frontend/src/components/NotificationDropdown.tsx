/**
 * Notification Dropdown Component
 * Displays in-app notifications in a dropdown menu
 */

import { Fragment, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import type { Notification } from '../types';
import { Card } from '../design-system/components';
import ConflictResolutionModal from './availability/ConflictResolutionModal';

export default function NotificationDropdown() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      return apiClient.get<Notification[]>('/notifications?limit=10', token || '');
    },
    enabled: !!token,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      return apiClient.get<{ count: number }>('/notifications/unread-count', token || '');
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

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
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'AVAILABILITY_CONFLICT':
      case 'BOOKING_REJECTED_BLOCKED_DATES':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-warning-100 p-2">
            <svg className="h-5 w-5 ds-text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex-shrink-0 rounded-full bg-blue-100 p-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'MESSAGE_RECEIVED':
        return (
          <div className="flex-shrink-0 rounded-full bg-green-100 p-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        );
      case 'RATING_RECEIVED':
        return (
          <div className="flex-shrink-0 rounded-full bg-yellow-100 p-2">
            <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      case 'COMPANY_VERIFIED':
      case 'DRIVER_VERIFIED':
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-primary-100 p-2">
            <svg className="h-5 w-5 ds-text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'DISPUTE_RAISED':
      case 'DISPUTE_RESOLVED':
        return (
          <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
            <svg className="h-5 w-5 ds-text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 rounded-full ds-bg-gray-100 p-2">
            <svg className="h-5 w-5 ds-text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton className="relative rounded-full bg-white p-1 ds-text-gray-400 ds-hover-text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2">
          <span className="sr-only">View notifications</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
          )}
        </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-96 origin-top-right focus:outline-none">
          <Card padding="sm">
            <div className="px-4 py-3 border-b ds-border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold ds-text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs ds-text-primary-600 ds-hover-text-primary-600"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm ds-text-gray-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <MenuItem key={notification.id}>
                    {() => (
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 ds-hover-bg-page border-b border-gray-100 last:border-b-0 ${
                          !notification.read ? 'ds-bg-primary-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} ds-text-gray-900`}>
                              {notification.title}
                            </p>
                            <p className="text-sm ds-text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs ds-text-gray-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                            </div>
                          )}
                        </div>
                      </button>
                    )}
                  </MenuItem>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t ds-border-gray-200">
              <button
                onClick={() => navigate('/notifications')}
                className="text-sm ds-text-primary-600 ds-hover-text-primary-600 font-medium"
              >
                View all notifications
              </button>
            </div>
          </Card>
        </MenuItems>
      </Transition>
      </Menu>

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
