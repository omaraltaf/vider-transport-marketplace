/**
 * Bulk Calendar Management Page
 * Allows providers to manage availability for multiple listings at once
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { apiClient } from '../services/api';
import type { VehicleListing, DriverListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, Spinner, Badge } from '../design-system/components';
import { Input } from '../design-system/components/Input';
import { Textarea } from '../design-system/components/Textarea';
import { Skeleton } from '../design-system/components/Skeleton';
import { ErrorBoundary } from '../components/availability/ErrorBoundary';
import { ErrorState } from '../components/availability/ErrorState';
import { AlertCircle, CheckCircle, XCircle, Calendar, Truck, User, RefreshCw } from 'lucide-react';
import styles from './BulkCalendarManagementPage.module.css';

interface BulkBlockRequest {
  listingIds: string[];
  listingType: 'vehicle' | 'driver';
  startDate: string;
  endDate: string;
  reason?: string;
}

interface ConflictDetail {
  type: 'block' | 'booking';
  startDate: string;
  endDate: string;
  reason?: string;
  bookingNumber?: string;
}

interface BulkBlockResult {
  successful: string[];
  failed: Array<{
    listingId: string;
    reason: string;
    conflicts: ConflictDetail[];
  }>;
}

interface ListingSelection {
  id: string;
  title: string;
  type: 'vehicle' | 'driver';
  selected: boolean;
}

export default function BulkCalendarManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedListings, setSelectedListings] = useState<Map<string, ListingSelection>>(new Map());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkBlockResult | null>(null);
  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string; general?: string }>({});

  // Fetch vehicle listings
  const { 
    data: vehicleListings, 
    isLoading: loadingVehicles, 
    error: vehicleError,
    refetch: refetchVehicles 
  } = useQuery<VehicleListing[]>({
    queryKey: ['vehicleListings'],
    queryFn: async () => {
      return apiClient.get<VehicleListing[]>('/listings/vehicles', token || '');
    },
    enabled: !!token,
    retry: 2,
  });

  // Fetch driver listings
  const { 
    data: driverListings, 
    isLoading: loadingDrivers, 
    error: driverError,
    refetch: refetchDrivers 
  } = useQuery<DriverListing[]>({
    queryKey: ['driverListings'],
    queryFn: async () => {
      return apiClient.get<DriverListing[]>('/listings/drivers', token || '');
    },
    enabled: !!token,
    retry: 2,
  });

  // Bulk block creation mutation
  const bulkBlockMutation = useMutation({
    mutationFn: async (data: BulkBlockRequest) => {
      return apiClient.post<BulkBlockResult>('/availability/bulk', data, token || '');
    },
    onSuccess: (result) => {
      setBulkResult(result);
      // Invalidate availability queries
      queryClient.invalidateQueries({ queryKey: ['availabilityBlocks'] });
      queryClient.invalidateQueries({ queryKey: ['calendarView'] });
    },
    onError: (error) => {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create bulk blocks' });
    },
  });

  const today = new Date().toISOString().split('T')[0];

  const toggleListing = (id: string, title: string, type: 'vehicle' | 'driver') => {
    const newSelections = new Map(selectedListings);
    const existing = newSelections.get(id);
    
    if (existing) {
      newSelections.delete(id);
    } else {
      newSelections.set(id, { id, title, type, selected: true });
    }
    
    setSelectedListings(newSelections);
    setBulkResult(null); // Clear previous results when selection changes
  };

  const selectAllVehicles = () => {
    if (!vehicleListings) return;
    const newSelections = new Map(selectedListings);
    vehicleListings.forEach(listing => {
      newSelections.set(listing.id, {
        id: listing.id,
        title: listing.title,
        type: 'vehicle',
        selected: true,
      });
    });
    setSelectedListings(newSelections);
    setBulkResult(null);
  };

  const selectAllDrivers = () => {
    if (!driverListings) return;
    const newSelections = new Map(selectedListings);
    driverListings.forEach(listing => {
      newSelections.set(listing.id, {
        id: listing.id,
        title: listing.name,
        type: 'driver',
        selected: true,
      });
    });
    setSelectedListings(newSelections);
    setBulkResult(null);
  };

  const clearSelection = () => {
    setSelectedListings(new Map());
    setBulkResult(null);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        newErrors.endDate = 'End date must be after or equal to start date';
      }
    }

    if (selectedListings.size === 0) {
      newErrors.general = 'Please select at least one listing';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});
    setBulkResult(null);

    if (!validateForm()) {
      return;
    }

    // Group listings by type
    const vehicleIds: string[] = [];
    const driverIds: string[] = [];

    selectedListings.forEach(listing => {
      if (listing.type === 'vehicle') {
        vehicleIds.push(listing.id);
      } else {
        driverIds.push(listing.id);
      }
    });

    // Create bulk blocks for each type
    const requests: Promise<BulkBlockResult>[] = [];

    if (vehicleIds.length > 0) {
      requests.push(
        bulkBlockMutation.mutateAsync({
          listingIds: vehicleIds,
          listingType: 'vehicle',
          startDate,
          endDate,
          reason: reason.trim() || undefined,
        })
      );
    }

    if (driverIds.length > 0) {
      requests.push(
        bulkBlockMutation.mutateAsync({
          listingIds: driverIds,
          listingType: 'driver',
          startDate,
          endDate,
          reason: reason.trim() || undefined,
        })
      );
    }

    try {
      const results = await Promise.all(requests);
      
      // Combine results
      const combinedResult: BulkBlockResult = {
        successful: results.flatMap(r => r.successful),
        failed: results.flatMap(r => r.failed),
      };

      setBulkResult(combinedResult);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getListingTitle = (listingId: string): string => {
    const selection = selectedListings.get(listingId);
    return selection?.title || listingId;
  };

  const isLoading = loadingVehicles || loadingDrivers;
  const hasError = vehicleError || driverError;

  const handleRetry = () => {
    if (vehicleError) refetchVehicles();
    if (driverError) refetchDrivers();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen ds-bg-background-page">
        <Navbar />
        
        <Container>
          <div className="mb-6">
            <h1 className="text-3xl font-bold ds-text-gray-900">Bulk Calendar Management</h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Block dates for multiple listings at once
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Loading skeleton for listing selection */}
              <div className="lg:col-span-1">
                <Card padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton variant="text" width={120} height={20} />
                    <Skeleton variant="rectangle" width={60} height={24} />
                  </div>
                  <Skeleton variant="rectangle" width="100%" height={36} />
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton variant="text" width={100} height={16} />
                        <Skeleton variant="text" width={60} height={12} />
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="p-3 rounded-md border">
                            <div className="flex items-start">
                              <Skeleton variant="rectangle" width={16} height={16} />
                              <div className="ml-3 flex-1">
                                <Skeleton variant="text" width="80%" height={16} />
                                <Skeleton variant="text" width="60%" height={12} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Loading skeleton for form */}
              <div className="lg:col-span-2">
                <Card padding="lg">
                  <Skeleton variant="text" width={120} height={20} />
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Skeleton variant="text" width={80} height={16} />
                        <Skeleton variant="rectangle" width="100%" height={40} />
                      </div>
                      <div>
                        <Skeleton variant="text" width={70} height={16} />
                        <Skeleton variant="rectangle" width="100%" height={40} />
                      </div>
                    </div>
                    <div>
                      <Skeleton variant="text" width={120} height={16} />
                      <Skeleton variant="rectangle" width="100%" height={80} />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Skeleton variant="rectangle" width={80} height={40} />
                      <Skeleton variant="rectangle" width={160} height={40} />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {hasError && !isLoading && (
            <ErrorState
              error={vehicleError || driverError || 'Failed to load listings'}
              onRetry={handleRetry}
              variant="network"
            />
          )}

        {!isLoading && !hasError && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listing Selection */}
            <div className="lg:col-span-1">
              <Card padding="lg" className={styles.selectionCard}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold ds-text-gray-900">
                    Select Listings
                  </h2>
                  <Badge variant="neutral">
                    {selectedListings.size} selected
                  </Badge>
                </div>

                {selectedListings.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="w-full mb-4"
                  >
                    Clear Selection
                  </Button>
                )}

                {/* Vehicle Listings */}
                {vehicleListings && vehicleListings.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium ds-text-gray-700 flex items-center">
                        <Truck size={16} className="mr-1" />
                        Vehicles ({vehicleListings.length})
                      </h3>
                      <button
                        type="button"
                        onClick={selectAllVehicles}
                        className="text-xs ds-text-primary-600 ds-hover-text-primary-700"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {vehicleListings.map(listing => (
                        <label
                          key={listing.id}
                          className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedListings.has(listing.id)
                              ? 'ds-border-primary-500 ds-bg-primary-50'
                              : 'ds-border-gray-200 ds-hover-bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedListings.has(listing.id)}
                            onChange={() => toggleListing(listing.id, listing.title, 'vehicle')}
                            className="mt-0.5 h-4 w-4 ds-text-primary-600 ds-border-gray-300 rounded ds-focus-ring-primary"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium ds-text-gray-900 truncate">
                              {listing.title}
                            </p>
                            <p className="text-xs ds-text-gray-500">
                              {listing.vehicleType} • {listing.location.city}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Driver Listings */}
                {driverListings && driverListings.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium ds-text-gray-700 flex items-center">
                        <User size={16} className="mr-1" />
                        Drivers ({driverListings.length})
                      </h3>
                      <button
                        type="button"
                        onClick={selectAllDrivers}
                        className="text-xs ds-text-primary-600 ds-hover-text-primary-700"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {driverListings.map(listing => (
                        <label
                          key={listing.id}
                          className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedListings.has(listing.id)
                              ? 'ds-border-primary-500 ds-bg-primary-50'
                              : 'ds-border-gray-200 ds-hover-bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedListings.has(listing.id)}
                            onChange={() => toggleListing(listing.id, listing.name, 'driver')}
                            className="mt-0.5 h-4 w-4 ds-text-primary-600 ds-border-gray-300 rounded ds-focus-ring-primary"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="text-sm font-medium ds-text-gray-900 truncate">
                              {listing.name}
                            </p>
                            <p className="text-xs ds-text-gray-500">
                              License: {listing.licenseClass}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(!vehicleListings || vehicleListings.length === 0) &&
                  (!driverListings || driverListings.length === 0) && (
                    <div className="text-center py-8">
                      <Calendar size={48} className="mx-auto ds-text-gray-400 mb-2" />
                      <p className="text-sm ds-text-gray-500">
                        No listings available
                      </p>
                    </div>
                  )}
              </Card>
            </div>

            {/* Bulk Block Form and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Form */}
              <Card padding="lg">
                <h2 className="text-lg font-semibold ds-text-gray-900 mb-4">
                  Block Dates
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Start Date"
                      value={startDate}
                      onChange={(value) => {
                        setStartDate(value);
                        if (errors.startDate) {
                          setErrors(prev => ({ ...prev, startDate: undefined }));
                        }
                      }}
                      error={errors.startDate}
                      required
                      min={today}
                      disabled={bulkBlockMutation.isPending}
                    />

                    <Input
                      type="date"
                      label="End Date"
                      value={endDate}
                      onChange={(value) => {
                        setEndDate(value);
                        if (errors.endDate) {
                          setErrors(prev => ({ ...prev, endDate: undefined }));
                        }
                      }}
                      error={errors.endDate}
                      required
                      min={startDate || today}
                      disabled={bulkBlockMutation.isPending}
                    />
                  </div>

                  <Textarea
                    label="Reason (Optional)"
                    value={reason}
                    onChange={setReason}
                    placeholder="e.g., Maintenance, Holiday, etc."
                    rows={3}
                    disabled={bulkBlockMutation.isPending}
                    helperText="Provide a reason for blocking these dates (visible only to you)"
                  />

                  {errors.general && (
                    <div className={styles.errorAlert} role="alert">
                      <AlertCircle size={20} />
                      <span>{errors.general}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setReason('');
                        setErrors({});
                        setBulkResult(null);
                      }}
                      disabled={bulkBlockMutation.isPending}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={bulkBlockMutation.isPending}
                      disabled={selectedListings.size === 0}
                    >
                      {bulkBlockMutation.isPending
                        ? 'Creating Blocks...'
                        : `Create Blocks for ${selectedListings.size} Listing${selectedListings.size !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Results */}
              {bulkResult && (
                <Card padding="lg">
                  <h2 className="text-lg font-semibold ds-text-gray-900 mb-4">
                    Results
                  </h2>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg ds-bg-success-50 border ds-border-success-200">
                      <div className="flex items-center">
                        <CheckCircle size={20} className="ds-text-success-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium ds-text-success-900">
                            Successful
                          </p>
                          <p className="text-2xl font-bold ds-text-success-700">
                            {bulkResult.successful.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg ds-bg-error-50 border ds-border-error-200">
                      <div className="flex items-center">
                        <XCircle size={20} className="ds-text-error-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium ds-text-error-900">
                            Failed
                          </p>
                          <p className="text-2xl font-bold ds-text-error-700">
                            {bulkResult.failed.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Successful Listings */}
                  {bulkResult.successful.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium ds-text-gray-900 mb-3 flex items-center">
                        <CheckCircle size={16} className="ds-text-success-600 mr-2" />
                        Successfully Blocked ({bulkResult.successful.length})
                      </h3>
                      <div className="space-y-2">
                        {bulkResult.successful.map(listingId => (
                          <div
                            key={listingId}
                            className="p-3 rounded-md ds-bg-success-50 border ds-border-success-200"
                          >
                            <p className="text-sm font-medium ds-text-success-900">
                              {getListingTitle(listingId)}
                            </p>
                            <p className="text-xs ds-text-success-700 mt-1">
                              Blocked from {formatDate(startDate)} to {formatDate(endDate)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Listings */}
                  {bulkResult.failed.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium ds-text-gray-900 mb-3 flex items-center">
                        <XCircle size={16} className="ds-text-error-600 mr-2" />
                        Failed to Block ({bulkResult.failed.length})
                      </h3>
                      <div className="space-y-4">
                        {bulkResult.failed.map((failure, index) => (
                          <div
                            key={index}
                            className="p-4 rounded-md ds-bg-error-50 border ds-border-error-200"
                          >
                            <p className="text-sm font-medium ds-text-error-900 mb-2">
                              {getListingTitle(failure.listingId)}
                            </p>
                            <p className="text-sm ds-text-error-700 mb-3">
                              {failure.reason}
                            </p>

                            {failure.conflicts && failure.conflicts.length > 0 && (
                              <div className="mt-3 pt-3 border-t ds-border-error-200">
                                <p className="text-xs font-medium ds-text-error-900 mb-2">
                                  Conflicts:
                                </p>
                                <ul className="space-y-2">
                                  {failure.conflicts.map((conflict, conflictIndex) => (
                                    <li
                                      key={conflictIndex}
                                      className="text-xs ds-text-error-700 pl-4 border-l-2 ds-border-error-300"
                                    >
                                      <strong>
                                        {conflict.type === 'booking' ? 'Booking' : 'Block'}:
                                      </strong>{' '}
                                      {formatDate(conflict.startDate)} - {formatDate(conflict.endDate)}
                                      {conflict.bookingNumber && (
                                        <span className="font-medium">
                                          {' '}(Booking #{conflict.bookingNumber})
                                        </span>
                                      )}
                                      {conflict.reason && (
                                        <span> - {conflict.reason}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </Container>
    </div>
    </ErrorBoundary>
  );
}
