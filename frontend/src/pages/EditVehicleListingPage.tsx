/**
 * Edit Vehicle Listing Page
 * Form for editing an existing vehicle listing
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import type { VehicleListing } from '../types';
import Navbar from '../components/Navbar';

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/listings/vehicles')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Edit Vehicle Listing</h1>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
                      Vehicle Type *
                    </label>
                    <select
                      id="vehicleType"
                      required
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select type</option>
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                      Capacity (pallets) *
                    </label>
                    <input
                      type="number"
                      id="capacity"
                      required
                      min="1"
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700">
                      Fuel Type *
                    </label>
                    <select
                      id="fuelType"
                      required
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select fuel type</option>
                      {FUEL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Location</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="fylke" className="block text-sm font-medium text-gray-700">
                      Fylke *
                    </label>
                    <input
                      type="text"
                      id="fylke"
                      required
                      value={formData.fylke}
                      onChange={(e) => setFormData({ ...formData, fylke: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="kommune" className="block text-sm font-medium text-gray-700">
                      Kommune *
                    </label>
                    <input
                      type="text"
                      id="kommune"
                      required
                      value={formData.kommune}
                      onChange={(e) => setFormData({ ...formData, kommune: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">
                      Hourly Rate
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="hourlyRate"
                        min="0"
                        step="0.01"
                        value={formData.hourlyRate || ''}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || undefined })}
                        className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">NOK</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700">
                      Daily Rate
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="dailyRate"
                        min="0"
                        step="0.01"
                        value={formData.dailyRate || ''}
                        onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || undefined })}
                        className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">NOK</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deposit" className="block text-sm font-medium text-gray-700">
                      Deposit (Optional)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        id="deposit"
                        min="0"
                        step="0.01"
                        value={formData.deposit || ''}
                        onChange={(e) => setFormData({ ...formData, deposit: parseFloat(e.target.value) || undefined })}
                        className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">NOK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Offerings */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Service Offerings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="withoutDriver"
                        type="checkbox"
                        checked={formData.withoutDriver}
                        onChange={(e) => setFormData({ ...formData, withoutDriver: e.target.checked })}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="withoutDriver" className="font-medium text-gray-700">
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
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm flex-1">
                      <label htmlFor="withDriver" className="font-medium text-gray-700">
                        Available with driver
                      </label>
                      
                      {formData.withDriver && (
                        <div className="mt-2">
                          <label htmlFor="withDriverCost" className="block text-sm font-medium text-gray-700">
                            Additional cost for driver
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm max-w-xs">
                            <input
                              type="number"
                              id="withDriverCost"
                              min="0"
                              step="0.01"
                              required={formData.withDriver}
                              value={formData.withDriverCost || ''}
                              onChange={(e) => setFormData({ ...formData, withDriverCost: parseFloat(e.target.value) || undefined })}
                              className="block w-full rounded-md border-gray-300 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">NOK</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          formData.tags.includes(tag)
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                      placeholder="Add custom tag"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomTag}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add
                    </button>
                  </div>

                  {formData.tags.filter(tag => !COMMON_TAGS.includes(tag)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.filter(tag => !COMMON_TAGS.includes(tag)).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
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

              {/* Error Message */}
              {updateMutation.isError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error updating listing</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {(updateMutation.error as Error).message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/listings/vehicles')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
