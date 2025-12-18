/**
 * Edit Vehicle Listing Page
 * Form for editing an existing vehicle listing
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { VehicleListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, FormField, Spinner } from '../design-system/components';
import { CalendarView } from '../components/availability/CalendarView';
import { BlockForm } from '../components/availability/BlockForm';
import { BlockList } from '../components/availability/BlockList';
import { RecurringBlockForm } from '../components/availability/RecurringBlockForm';

interface VehicleListingFormData {
  title: string;
  description: string;
  vehicleType: string;
  capacity: number;
  fuelType: string;
  city: string;
  fylke: string;
  kommune: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  dailyRate?: number;
  deposit?: number;
  currency: string;
  withDriver: boolean;
  withDriverCost?: number;
  withoutDriver: boolean;
  tags: string[];
}

const VEHICLE_TYPES = [
  { value: 'PALLET_8', label: '8-pallet' },
  { value: 'PALLET_18', label: '18-pallet' },
  { value: 'PALLET_21', label: '21-pallet' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'OTHER', label: 'Other' },
];

const FUEL_TYPES = [
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'BIOGAS', label: 'Biogas' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GAS', label: 'Gas' },
];

const COMMON_TAGS = [
  'tail-lift',
  'refrigerated',
  'ADR-certified',
  'GPS-tracked',
  'temperature-controlled',
];

export default function EditVehicleListingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  
  const [formData, setFormData] = useState<VehicleListingFormData>({
    title: '',
    description: '',
    vehicleType: '',
    capacity: 0,
    fuelType: '',
    city: '',
    fylke: '',
    kommune: '',
    currency: 'NOK',
    withDriver: false,
    withoutDriver: true,
    tags: [],
  });

  const [customTag, setCustomTag] = useState('');
  const [showCalendarManagement, setShowCalendarManagement] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  const { data: listing, isLoading } = useQuery<VehicleListing>({
    queryKey: ['vehicleListing', id],
    queryFn: async () => {
      return apiClient.get<VehicleListing>(`/listings/vehicles/${id}`, token || '');
    },
    enabled: !!id && !!token,
  });

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title,
        description: listing.description,
        vehicleType: listing.vehicleType,
        capacity: listing.capacity,
        fuelType: listing.fuelType,
        city: listing.location.city,
        fylke: listing.location.fylke,
        kommune: listing.location.kommune,
        latitude: listing.location.coordinates?.[1],
        longitude: listing.location.coordinates?.[0],
        hourlyRate: listing.pricing.hourlyRate,
        dailyRate: listing.pricing.dailyRate,
        deposit: listing.pricing.deposit,
        currency: listing.pricing.currency,
        withDriver: listing.serviceOfferings.withDriver,
        withDriverCost: listing.serviceOfferings.withDriverCost,
        withoutDriver: listing.serviceOfferings.withoutDriver,
        tags: listing.tags,
      });
    }
  }, [listing]);

  const updateMutation = useMutation({
    mutationFn: async (data: VehicleListingFormData) => {
      return apiClient.put<VehicleListing>(`/listings/vehicles/${id}`, data, token || '');
    },
    onSuccess: () => {
      navigate('/listings/vehicles');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/listings/vehicles/${id}`, token || '');
    },
    onSuccess: () => {
      navigate('/listings/vehicles');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const toggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !formData.tags.includes(customTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, customTag.trim()] });
      setCustomTag('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen ds-bg-background-page">
        <Navbar />
        <Container>
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 text-sm ds-text-gray-500">Loading listing...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen ds-bg-background-page">
      <Navbar />
      
      <Container>
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/listings/vehicles')}
            leftIcon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Back to Listings
          </Button>
        </div>

        {/* Tab Navigation */}
        <Card padding="md" className="mb-6">
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
          <Card padding="lg">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold ds-text-gray-900">Edit Vehicle Listing</h1>
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
                <FormField type="text" label="Title" required value={formData.title} onChange={(value) => setFormData({ ...formData, title: value })} />

                <FormField type="textarea" label="Description" required value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} rows={4} />
              </div>
            </div>

            {/* Vehicle Details */}
            <div>
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Vehicle Details</h2>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  type="select"
                  label="Vehicle Type"
                  required
                  value={formData.vehicleType}
                  onChange={(value) => setFormData({ ...formData, vehicleType: value })}
                  options={[
                    { value: '', label: 'Select type' },
                    ...VEHICLE_TYPES
                  ]}
                />

                <FormField
                  type="number"
                  label="Capacity (pallets)"
                  required
                  value={formData.capacity.toString()}
                  onChange={(value) => setFormData({ ...formData, capacity: parseInt(value) || 0 })}
                />

                <FormField
                  type="select"
                  label="Fuel Type"
                  required
                  value={formData.fuelType}
                  onChange={(value) => setFormData({ ...formData, fuelType: value })}
                  options={[
                    { value: '', label: 'Select fuel type' },
                    ...FUEL_TYPES
                  ]}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Location</h2>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField type="text" label="City" required value={formData.city} onChange={(value) => setFormData({ ...formData, city: value })} />

                <FormField type="text" label="Fylke" required value={formData.fylke} onChange={(value) => setFormData({ ...formData, fylke: value })} />

                <FormField type="text" label="Kommune" required value={formData.kommune} onChange={(value) => setFormData({ ...formData, kommune: value })} />
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Pricing</h2>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  type="number"
                  label="Hourly Rate"
                  helperText="NOK"
                  value={formData.hourlyRate?.toString() || ''}
                  onChange={(value) => setFormData({ ...formData, hourlyRate: parseFloat(value) || undefined })}
                />

                <FormField
                  type="number"
                  label="Daily Rate"
                  helperText="NOK"
                  value={formData.dailyRate?.toString() || ''}
                  onChange={(value) => setFormData({ ...formData, dailyRate: parseFloat(value) || undefined })}
                />

                <FormField
                  type="number"
                  label="Deposit (Optional)"
                  helperText="NOK"
                  value={formData.deposit?.toString() || ''}
                  onChange={(value) => setFormData({ ...formData, deposit: parseFloat(value) || undefined })}
                />
              </div>
            </div>

            {/* Service Offerings */}
            <div>
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Service Offerings</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="withoutDriver"
                      type="checkbox"
                      checked={formData.withoutDriver}
                      onChange={(e) => setFormData({ ...formData, withoutDriver: e.target.checked })}
                      className="ds-focus-ring-primary h-4 w-4 ds-text-primary-600 ds-border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="withoutDriver" className="font-medium ds-text-gray-700">
                      Available without driver
                    </label>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="withDriver"
                      type="checkbox"
                      checked={formData.withDriver}
                      onChange={(e) => setFormData({ ...formData, withDriver: e.target.checked })}
                      className="ds-focus-ring-primary h-4 w-4 ds-text-primary-600 ds-border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm flex-1">
                    <label htmlFor="withDriver" className="font-medium ds-text-gray-700">
                      Available with driver
                    </label>
                    
                    {formData.withDriver && (
                      <div className="mt-2">
                        <FormField
                          type="number"
                          label="Additional cost for driver"
                          helperText="NOK"
                          value={formData.withDriverCost?.toString() || ''}
                          onChange={(value) => setFormData({ ...formData, withDriverCost: parseFloat(value) || undefined })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Tags</h2>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant={formData.tags.includes(tag) ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                    placeholder="Add custom tag"
                    className="block w-full rounded-md ds-border-gray-300 shadow-sm ds-focus-border-primary ds-focus-ring-primary sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={addCustomTag}
                  >
                    Add
                  </Button>
                </div>

                {formData.tags.filter(tag => !COMMON_TAGS.includes(tag)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.filter(tag => !COMMON_TAGS.includes(tag)).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ds-bg-primary-100 ds-text-primary-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="ml-1 inline-flex items-center ds-text-primary-800 hover:ds-text-primary-900"
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

            {/* Error Message */}
            {updateMutation.isError && (
              <div className="rounded-md ds-bg-error-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 ds-text-error-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium ds-text-error-800">Error updating listing</h3>
                    <p className="mt-1 text-sm ds-text-error-700">
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
                onClick={() => navigate('/listings/vehicles')}
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
            <Card padding="lg">
              <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Availability Calendar</h2>
              <CalendarView
                listingId={id!}
                listingType="vehicle"
                mode="manage"
                showExport={true}
                key={calendarRefreshTrigger}
              />
            </Card>

            {/* Block Management */}
            <Card padding="lg">
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
                    listingType="vehicle"
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
                    listingType="vehicle"
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
                listingType="vehicle"
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
