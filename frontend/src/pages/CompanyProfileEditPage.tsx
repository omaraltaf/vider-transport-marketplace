/**
 * Company Profile Edit Page
 * Form for company admins to update their company profile
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { companyService, type UpdateCompanyProfileData } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useEffect } from 'react';

const FYLKER = [
  'Oslo',
  'Rogaland',
  'Møre og Romsdal',
  'Nordland',
  'Viken',
  'Innlandet',
  'Vestfold og Telemark',
  'Agder',
  'Vestland',
  'Trøndelag',
  'Troms og Finnmark',
];

export default function CompanyProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getProfile(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateCompanyProfileData>();

  // Populate form with existing data
  useEffect(() => {
    if (company) {
      reset({
        description: company.description || '',
        businessAddress: company.businessAddress,
        city: company.city,
        postalCode: company.postalCode,
        fylke: company.fylke,
        kommune: company.kommune,
      });
    }
  }, [company, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCompanyProfileData) =>
      companyService.updateProfile(id!, data, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      navigate(`/companies/${id}`);
    },
  });

  // Check authorization
  const canEdit = user?.companyId === id && (user?.role === 'COMPANY_ADMIN' || user?.role === 'PLATFORM_ADMIN');

  if (!canEdit) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to edit this company profile.</p>
          <button
            onClick={() => navigate(`/companies/${id}`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View Profile
          </button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const onSubmit = (data: UpdateCompanyProfileData) => {
    updateMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Company Profile</h1>
          <p className="text-gray-600 mt-2">Update your company's public information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Company Name (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={company?.name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Contact support to change company name</p>
          </div>

          {/* Organization Number (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Number
            </label>
            <input
              type="text"
              value={company?.organizationNumber || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Organization number cannot be changed</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Company Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell potential partners about your company..."
            />
          </div>

          {/* Business Address */}
          <div>
            <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-2">
              Business Address <span className="text-red-500">*</span>
            </label>
            <input
              id="businessAddress"
              type="text"
              {...register('businessAddress', { required: 'Business address is required' })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.businessAddress ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.businessAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.businessAddress.message}</p>
            )}
          </div>

          {/* City and Postal Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                {...register('city', { required: 'City is required' })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                id="postalCode"
                type="text"
                {...register('postalCode', { required: 'Postal code is required' })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.postalCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.postalCode && (
                <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          {/* Fylke */}
          <div>
            <label htmlFor="fylke" className="block text-sm font-medium text-gray-700 mb-2">
              Fylke (County) <span className="text-red-500">*</span>
            </label>
            <select
              id="fylke"
              {...register('fylke', { required: 'Fylke is required' })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.fylke ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a fylke</option>
              {FYLKER.map((fylke) => (
                <option key={fylke} value={fylke}>
                  {fylke}
                </option>
              ))}
            </select>
            {errors.fylke && (
              <p className="text-red-500 text-sm mt-1">{errors.fylke.message}</p>
            )}
          </div>

          {/* Kommune */}
          <div>
            <label htmlFor="kommune" className="block text-sm font-medium text-gray-700 mb-2">
              Kommune (Municipality) <span className="text-red-500">*</span>
            </label>
            <input
              id="kommune"
              type="text"
              {...register('kommune', { required: 'Kommune is required' })}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.kommune ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.kommune && (
              <p className="text-red-500 text-sm mt-1">{errors.kommune.message}</p>
            )}
          </div>

          {/* Error Message */}
          {updateMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Failed to update profile. Please try again.'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/companies/${id}`)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
