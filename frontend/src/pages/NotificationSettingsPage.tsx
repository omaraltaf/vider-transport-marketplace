/**
 * Notification Settings Page
 * Allows users to manage their notification preferences
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import type { NotificationPreferences } from '../types';

export default function NotificationSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      return apiClient.get<NotificationPreferences>('/notifications/preferences', token || '');
    },
    enabled: !!token,
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (data: NotificationPreferences) => {
      return apiClient.put<NotificationPreferences>('/notifications/preferences', data, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const [formData, setFormData] = useState<NotificationPreferences>({
    emailEnabled: preferences?.emailEnabled ?? true,
    inAppEnabled: preferences?.inAppEnabled ?? true,
    bookingUpdates: preferences?.bookingUpdates ?? true,
    messages: preferences?.messages ?? true,
    ratings: preferences?.ratings ?? true,
    marketing: preferences?.marketing ?? false,
  });

  // Update form data when preferences load
  if (preferences && formData.emailEnabled === true && !preferences.emailEnabled) {
    setFormData({
      emailEnabled: preferences.emailEnabled,
      inAppEnabled: preferences.inAppEnabled,
      bookingUpdates: preferences.bookingUpdates,
      messages: preferences.messages,
      ratings: preferences.ratings,
      marketing: preferences.marketing,
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleToggle = (field: keyof NotificationPreferences) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading preferences...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage how you receive notifications from Vider
            </p>
          </div>

          {/* Success message */}
          {saveSuccess && (
            <div className="mb-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Preferences saved successfully
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Settings form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Channel preferences */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notification Channels</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose how you want to receive notifications
                </p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="emailEnabled" className="text-sm font-medium text-gray-900">
                      Email Notifications
                    </label>
                    <p className="text-sm text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.emailEnabled}
                    onClick={() => handleToggle('emailEnabled')}
                    className={`${
                      formData.emailEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="inAppEnabled" className="text-sm font-medium text-gray-900">
                      In-App Notifications
                    </label>
                    <p className="text-sm text-gray-500">
                      Receive notifications within the platform
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.inAppEnabled}
                    onClick={() => handleToggle('inAppEnabled')}
                    className={`${
                      formData.inAppEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.inAppEnabled ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification types */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notification Types</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Choose which types of notifications you want to receive
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Note: Critical notifications (booking cancellations, disputes) will always be sent
                </p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="bookingUpdates" className="text-sm font-medium text-gray-900">
                      Booking Updates
                    </label>
                    <p className="text-sm text-gray-500">
                      Notifications about booking requests, acceptances, and completions
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.bookingUpdates}
                    onClick={() => handleToggle('bookingUpdates')}
                    className={`${
                      formData.bookingUpdates ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.bookingUpdates ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="messages" className="text-sm font-medium text-gray-900">
                      Messages
                    </label>
                    <p className="text-sm text-gray-500">
                      Notifications when you receive new messages
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.messages}
                    onClick={() => handleToggle('messages')}
                    className={`${
                      formData.messages ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.messages ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="ratings" className="text-sm font-medium text-gray-900">
                      Ratings & Reviews
                    </label>
                    <p className="text-sm text-gray-500">
                      Notifications when you receive ratings or reviews
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.ratings}
                    onClick={() => handleToggle('ratings')}
                    className={`${
                      formData.ratings ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.ratings ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="marketing" className="text-sm font-medium text-gray-900">
                      Marketing & Updates
                    </label>
                    <p className="text-sm text-gray-500">
                      Platform updates, tips, and promotional content
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.marketing}
                    onClick={() => handleToggle('marketing')}
                    className={`${
                      formData.marketing ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        formData.marketing ? 'translate-x-5' : 'translate-x-0'
                      } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
