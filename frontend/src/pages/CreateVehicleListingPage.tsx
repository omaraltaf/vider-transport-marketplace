/**
 * Create Vehicle Listing Page
 * Form for creating a new vehicle listing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { VehicleListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, FormField, Input } from '../design-system/components';
import { UserStateGuard } from '../components/auth/UserStateGuard';

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

export default function CreateVehicleListingPage() {
  const navigate = useNavigate();
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

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: VehicleListingFormData) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post<VehicleListing>('/listings/vehicles', data, validToken);
    },
    onSuccess: async (listing) => {
      // Upload photos if any
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });

        try {
          const validToken = await tokenManager.getValidToken();
          await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/listings/vehicles/${listing.id}/photos`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${validToken}`,
            },
            body: formData,
          });
        } catch (error) {
          console.error('Failed to upload photos:', error);
        }
      }

      navigate('/listings/vehicles');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos([...photos, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
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

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <UserStateGuard 
        requireAuth={true}
        requiredRole="COMPANY_ADMIN"
        loadingMessage="Loading user data for listing creation..."
      >
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

        <Card padding="lg">
          <h1 className="text-2xl font-bold ds-text-gray-900 mb-6">Create Vehicle Listing</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <FormField 
                    type="text" 
                    label="Title" 
                    required
                    value={formData.title}
                    onChange={(value) => setFormData({ ...formData, title: value })}
                    placeholder="e.g., 18-pallet refrigerated truck"
                  />

                  <FormField 
                    type="textarea" 
                    label="Description" 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Describe your vehicle, its condition, and any special features..."
                  />
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
                  <FormField 
                    type="text" 
                    label="City" 
                    required
                    value={formData.city}
                    onChange={(value) => setFormData({ ...formData, city: value })}
                  />

                  <FormField 
                    type="text" 
                    label="Fylke" 
                    required
                    value={formData.fylke}
                    onChange={(value) => setFormData({ ...formData, fylke: value })}
                  />

                  <FormField 
                    type="text" 
                    label="Kommune" 
                    required
                    value={formData.kommune}
                    onChange={(value) => setFormData({ ...formData, kommune: value })}
                  />
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
                
                <p className="mt-2 text-sm ds-text-gray-500">
                  * At least one rate (hourly or daily) is required
                </p>
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
                        className="focus:ring-primary-600 h-4 w-4 text-primary-600 ds-border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="withoutDriver" className="font-medium ds-text-gray-700">
                        Available without driver
                      </label>
                      <p className="ds-text-gray-500">Renter provides their own driver</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="withDriver"
                        type="checkbox"
                        checked={formData.withDriver}
                        onChange={(e) => setFormData({ ...formData, withDriver: e.target.checked })}
                        className="focus:ring-primary-600 h-4 w-4 text-primary-600 ds-border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm flex-1">
                      <label htmlFor="withDriver" className="font-medium ds-text-gray-700">
                        Available with driver
                      </label>
                      <p className="ds-text-gray-500">You provide a driver with the vehicle</p>
                      
                      {formData.withDriver && (
                        <div className="mt-2 max-w-xs">
                          <FormField 
                            type="number" 
                            label="Additional cost for driver" 
                            helperText="NOK" 
                            required
                            value={formData.withDriverCost?.toString() || ''}
                            onChange={(value) => setFormData({ ...formData, withDriverCost: parseFloat(value) || undefined })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Photos</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700">
                      Upload Photos
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ds-border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 ds-text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm ds-text-gray-600">
                          <label
                            htmlFor="photo-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium ds-text-primary-600 ds-hover-text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-600"
                          >
                            <span>Upload files</span>
                            <input
                              id="photo-upload"
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handlePhotoChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs ds-text-gray-500">PNG, JPG, WebP up to 5MB each</p>
                      </div>
                    </div>
                  </div>

                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-32 w-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 ds-bg-error text-white rounded-full p-1 ds-hover-bg-error"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">Tags</h2>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          formData.tags.includes(tag)
                            ? 'ds-bg-primary-100 ds-text-primary-800'
                            : 'ds-bg-gray-100 ds-text-gray-800 ds-hover-bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={customTag}
                        onChange={(value) => setCustomTag(value)}
                        placeholder="Add custom tag"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                      />
                    </div>
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
              {createMutation.isError && (
                <div className="rounded-md ds-bg-error-light p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 ds-text-error" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium ds-text-error">Error creating listing</h3>
                      <p className="mt-1 text-sm ds-text-error">
                        {(createMutation.error as Error).message}
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
                  loading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Listing'}
                </Button>
              </div>
            </form>
        </Card>
        </Container>
      </UserStateGuard>
    </div>
  );
}
