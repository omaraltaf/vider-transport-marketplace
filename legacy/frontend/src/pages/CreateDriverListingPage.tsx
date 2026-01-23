/**
 * Create Driver Listing Page
 * Form for creating a new driver listing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { DriverListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, FormField, Input, Select, Textarea } from '../design-system/components';

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

export default function CreateDriverListingPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [formData, setFormData] = useState<DriverListingFormData>({
    name: '',
    licenseClass: '',
    languages: [],
    currency: 'NOK',
  });

  const [licenseDocument, setLicenseDocument] = useState<File | null>(null);
  const [customLanguage, setCustomLanguage] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: DriverListingFormData) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post<DriverListing>('/listings/drivers', data, validToken);
    },
    onSuccess: async (listing) => {
      // Upload license document if provided
      if (licenseDocument) {
        const formData = new FormData();
        formData.append('license', licenseDocument);

        try {
          const validToken = await tokenManager.getValidToken();
          await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/listings/drivers/${listing.id}/license`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${validToken}`,
            },
            body: formData,
          });
        } catch (error) {
          console.error('Failed to upload license document:', error);
        }
      }

      navigate('/listings/drivers');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLicenseDocument(file);
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

        <Card variant="elevated" padding="lg">
          <h1 className="text-2xl font-bold ds-text-gray-900 mb-6">Create Driver Listing</h1>

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
                      placeholder="e.g., John Doe"
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
                      placeholder="Describe the driver's experience, qualifications, and any special skills..."
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
                
                <p className="mt-2 text-sm ds-text-gray-500">
                  * At least one rate (hourly or daily) is required
                </p>
              </div>

              {/* License Document */}
              <div>
                <h2 className="text-lg font-medium ds-text-gray-900 mb-4">License Documentation</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700">
                      Upload License Document *
                    </label>
                    <p className="mt-1 text-sm ds-text-gray-500">
                      Required for verification. Driver listing will remain unpublished until verified by admin.
                    </p>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 ds-border-gray-300 border-dashed rounded-md">
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
                            htmlFor="license-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium ds-text-primary-600 ds-hover-text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-600"
                          >
                            <span>Upload a file</span>
                            <input
                              id="license-upload"
                              type="file"
                              required
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleLicenseChange}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs ds-text-gray-500">PDF, JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                    {licenseDocument && (
                      <div className="mt-2 flex items-center text-sm ds-text-gray-600">
                        <svg className="h-5 w-5 ds-text-success mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {licenseDocument.name}
                      </div>
                    )}
                  </div>
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
                  onClick={() => navigate('/listings/drivers')}
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
    </div>
  );
}
