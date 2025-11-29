/**
 * Edit Driver Listing Page
 * Form for editing an existing driver listing
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Driver Listing</h1>
                {listing?.verified && (
                  <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified Driver
                  </div>
                )}
              </div>
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
                  onClick={() => navigate('/listings/drivers')}
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
