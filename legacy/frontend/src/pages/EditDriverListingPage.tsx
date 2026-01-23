/**
 * Edit Driver Listing Page
 * Form for editing an existing driver listing
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import type { DriverListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, FormField, Input, Select, Textarea, Spinner, Badge } from '../design-system/components';
import { CalendarView } from '../components/availability/CalendarView';
import { BlockForm } from '../components/availability/BlockForm';
import { BlockList } from '../components/availability/BlockList';
import { RecurringBlockForm } from '../components/availability/RecurringBlockForm';

interface DriverListingFormData {
  name: string;
  licenseClass: string;
  languages: string[];
  backgroundSummary?: string;
  hourlyRate?: number;
  dailyRate?: number;
  currency: string;
}

const COMMON_LANGUAGES = [
  'Norwegian',
  'English',
  'Swedish',
  'Danish',
  'German',
  'Polish',
];

const LICENSE_CLASSES = [
  { value: 'B', label: 'Class B - Car' },
  { value: 'C', label: 'Class C - Truck' },
  { value: 'C1', label: 'Class C1 - Light Truck' },
  { value: 'CE', label: 'Class CE - Truck with Trailer' },
  { value: 'C1E', label: 'Class C1E - Light Truck with Trailer' },
  { value: 'D', label: 'Class D - Bus' },
  { value: 'DE', label: 'Class DE - Bus with Trailer' },
];

export default function EditDriverListingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  
  const [formData, setFormData] = useState<DriverListingFormData>({
    name: '',
    licenseClass: '',
    languages: [],
    currency: 'NOK',
  });

  const [customLanguage, setCustomLanguage] = useState('');
  const [showCalendarManagement, setShowCalendarManagement] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  const { data: listing, isLoading } = useQuery<DriverListing>({
    queryKey: ['driverListing', id],
    queryFn: async () => {
      return apiClient.get<DriverListing>(`/listings/drivers/${id}`, token || '');
    },
    enabled: !!id && !!token,
  });

  useEffect(() => {
    if (listing) {
      setFormData({
        name: listing.name,
        licenseClass: listing.licenseClass,
        languages: listing.languages,
        backgroundSummary: listing.backgroundSummary,
        hourlyRate: listing.pricing.hourlyRate,
        dailyRate: listing.pricing.dailyRate,
        currency: listing.pricing.currency,
      });
    }
  }, [listing]);

  const updateMutation = useMutation({
    mutationFn: async (data: DriverListingFormData) => {
      return apiClient.put<DriverListing>(`/listings/drivers/${id}`, data, token || '');
    },
    onSuccess: () => {
      navigate('/listings/drivers');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/listings/drivers/${id}`, token || '');
    },
    onSuccess: () => {
      navigate('/listings/drivers');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this driver listing? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const toggleLanguage = (language: string) => {
    if (formData.languages.includes(language)) {
      setFormData({ ...formData, languages: formData.languages.filter((l) => l !== language) });
    } else {
      setFormData({ ...formData, languages: [...formData.languages, language] });
    }
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim() && !formData.languages.includes(customLanguage.trim())) {
      setFormData({ ...formData, languages: [...formData.languages, customLanguage.trim()] });
      setCustomLanguage('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen ds-bg-page">
        <Navbar />
        <Container maxWidth="3xl">
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 text-sm ds-text-gray-500">Loading listing...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container maxWidth="3xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/listings/drivers')}
            leftIcon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Back to Driver Listings
          </Button>
        </div>

        {/* Tab Navigation */}
        <Card variant="elevated" padding="md" className="mb-6">
          <div className="flex gap-4 border-b ds-border-gray-200">
            <button
              onClick={() => setShowCalendarManagement(false)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                !showCalendarManagement
                  ? 'ds-border-primary-600 ds-text-primary-600'
                  : 'border-transparent ds-text-gray-500 ds-hover-text-gray-700 ds-hover-border-gray-300'
              }`}
            >
              Listing Details
            </button>
            <button
              onClick={() => setShowCalendarManagement(true)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                showCalendarManagement
                  ? 'ds-border-primary-600 ds-text-primary-600'
                  : 'border-transparent ds-text-gray-500 ds-hover-text-gray-700 ds-hover-border-gray-300'
              }`}
            >
              Calendar Management
            </button>
          </div>
        </Card>

        {!showCalendarManagement ? (
          <Card variant="elevated" padding="lg">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold ds-text-gray-900">Edit Driver Listing</h1>
                {listing?.verified && (
                  <Badge variant="success" size="sm" className="mt-2">
                    <svg className="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified Driver
                  </Badge>
                )}
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={deleteMutation.isPending}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <FormField label="Driver Name" required>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(value) => setFormData({ ...formData, name: value })}
                    />
                  </FormField>

                  <FormField label="License Class" required>
                    <Select
                      value={formData.licenseClass}
                      onChange={(value) => setFormData({ ...formData, licenseClass: value })}
                      options={[
                        { value: '', label: 'Select license class' },
                        ...LICENSE_CLASSES
                      ]}
                    />
                  </FormField>

                  <FormField label="Background Summary">
                    <Textarea
                      rows={4}
                      value={formData.backgroundSummary || ''}
                      onChange={(value) => setFormData({ ...formData, backgroundSummary: value })}
                    />
                  </FormField>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Languages</h2>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => toggleLanguage(language)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          formData.languages.includes(language)
                            ? 'ds-bg-primary-100 ds-text-primary-800'
                            : 'ds-bg-gray-100 ds-text-gray-800 ds-hover-bg-gray-200'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLanguage())}
                      placeholder="Add another language"
                      className="block w-full rounded-md ds-border-gray-300 shadow-sm focus:ds-border-primary-600 focus:ring-primary-600 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="inline-flex items-center px-4 py-2 border ds-border-gray-300 shadow-sm text-sm font-medium rounded-md ds-text-gray-700 bg-white ds-hover-bg-page focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
                    >
                      Add
                    </button>
                  </div>

                  {formData.languages.filter(lang => !COMMON_LANGUAGES.includes(lang)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.filter(lang => !COMMON_LANGUAGES.includes(lang)).map((language) => (
                        <span
                          key={language}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ds-bg-primary-100 ds-text-primary-800"
                        >
                          {language}
                          <button
                            type="button"
                            onClick={() => toggleLanguage(language)}
                            className="ml-1 inline-flex items-center"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Pricing</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Hourly Rate" helperText="NOK">
                    <Input
                      type="number"
                      value={formData.hourlyRate?.toString() || ''}
                      onChange={(value) => setFormData({ ...formData, hourlyRate: parseFloat(value) || undefined })}
                    />
                  </FormField>

                  <FormField label="Daily Rate" helperText="NOK">
                    <Input
                      type="number"
                      value={formData.dailyRate?.toString() || ''}
                      onChange={(value) => setFormData({ ...formData, dailyRate: parseFloat(value) || undefined })}
                    />
                  </FormField>
                </div>
              </div>

              {/* Error Message */}
              {updateMutation.isError && (
                <div className="rounded-md ds-bg-error-light p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 ds-text-error" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium ds-text-error">Error updating listing</h3>
                      <p className="mt-1 text-sm ds-text-error">
                        {(updateMutation.error as Error).message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/listings/drivers')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={updateMutation.isPending}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Calendar View */}
            <Card variant="elevated" padding="lg">
              <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Availability Calendar</h2>
              <CalendarView
                listingId={id!}
                listingType="driver"
                mode="manage"
                showExport={true}
                key={calendarRefreshTrigger}
              />
            </Card>

            {/* Block Management */}
            <Card variant="elevated" padding="lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold ds-text-gray-900">Availability Blocks</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBlockForm(!showBlockForm)}
                  >
                    {showBlockForm ? 'Cancel' : 'Add Block'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecurringForm(!showRecurringForm)}
                  >
                    {showRecurringForm ? 'Cancel' : 'Add Recurring Block'}
                  </Button>
                </div>
              </div>

              {showBlockForm && (
                <div className="mb-6">
                  <BlockForm
                    listingId={id!}
                    listingType="driver"
                    onBlockCreated={() => {
                      setShowBlockForm(false);
                      // Refresh calendar
                      setCalendarRefreshTrigger(prev => prev + 1);
                    }}
                    onCancel={() => setShowBlockForm(false)}
                  />
                </div>
              )}

              {showRecurringForm && (
                <div className="mb-6">
                  <RecurringBlockForm
                    listingId={id!}
                    listingType="driver"
                    onBlockCreated={() => {
                      setShowRecurringForm(false);
                      // Refresh calendar
                      setCalendarRefreshTrigger(prev => prev + 1);
                    }}
                    onCancel={() => setShowRecurringForm(false)}
                  />
                </div>
              )}

              <BlockList
                listingId={id!}
                listingType="driver"
                onBlockDeleted={() => {
                  // Refresh calendar when block is deleted
                  setCalendarRefreshTrigger(prev => prev + 1);
                }}
              />
            </Card>
          </div>
        )}
      </Container>
    </div>
  );
}
