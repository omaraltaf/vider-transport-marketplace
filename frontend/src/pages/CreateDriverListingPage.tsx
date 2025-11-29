/**
 * Create Driver Listing Page
 * Form for creating a new driver listing
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import type { DriverListing } from '../types';
import Navbar from '../components/Navbar';

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
      return apiClient.post<DriverListing>('/listings/drivers', data, token || '');
    },
    onSuccess: async (listing) => {
      // Upload license document if provided
      if (licenseDocument) {
        const formData = new FormData();
        formData.append('license', licenseDocument);

        try {
          await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/listings/drivers/${listing.id}/license`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/listings/drivers')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Driver Listings
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Driver Listing</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Driver Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseClass" className="block text-sm font-medium text-gray-700">
                      License Class *
                    </label>
                    <select
                      id="licenseClass"
                      required
                      value={formData.licenseClass}
                      onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select license class</option>
                      {LICENSE_CLASSES.map((license) => (
                        <option key={license.value} value={license.value}>
                          {license.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="backgroundSummary" className="block text-sm font-medium text-gray-700">
                      Background Summary
                    </label>
                    <textarea
                      id="backgroundSummary"
                      rows={4}
                      value={formData.backgroundSummary || ''}
                      onChange={(e) => setFormData({ ...formData, backgroundSummary: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Describe the driver's experience, qualifications, and any special skills..."
                    />
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Languages</h2>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => toggleLanguage(language)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          formData.languages.includes(language)
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomLanguage}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Add
                    </button>
                  </div>

                  {formData.languages.filter(lang => !COMMON_LANGUAGES.includes(lang)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.filter(lang => !COMMON_LANGUAGES.includes(lang)).map((language) => (
                        <span
                          key={language}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </div>
                
                <p className="mt-2 text-sm text-gray-500">
                  * At least one rate (hourly or daily) is required
                </p>
              </div>

              {/* License Document */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">License Documentation</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Upload License Document *
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      Required for verification. Driver listing will remain unpublished until verified by admin.
                    </p>
                    <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
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
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="license-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
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
                        <p className="text-xs text-gray-500">PDF, JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                    {licenseDocument && (
                      <div className="mt-2 flex items-center text-sm text-gray-600">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error creating listing</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {(createMutation.error as Error).message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/listings/drivers')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
