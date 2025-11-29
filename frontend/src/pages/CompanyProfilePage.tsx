/**
 * Company Profile Page
 * Displays public company profile with verification badge and rating
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Layout from '../components/Layout';
import { ReviewsList } from '../components/ReviewsList';
import type { Rating } from '../types';
import { CheckBadgeIcon, StarIcon, MapPinIcon, BuildingOfficeIcon } from '@heroicons/react/24/solid';

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyService.getProfile(id!),
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery<Rating[]>({
    queryKey: ['ratings', 'company', id],
    queryFn: async () => {
      return apiClient.get<Rating[]>(`/ratings/company/${id}`, token || '');
    },
    enabled: !!id,
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async ({ ratingId, response }: { ratingId: string; response: string }) => {
      return apiClient.post(`/ratings/${ratingId}/response`, { response }, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'company', id] });
    },
  });

  const canEdit = user?.companyId === id && (user?.role === 'COMPANY_ADMIN' || user?.role === 'PLATFORM_ADMIN');
  const canRespond = user?.companyId === id;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !company) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h2>
          <p className="text-gray-600 mb-6">The company profile you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to Home
          </button>
        </div>
      </Layout>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 ${
              star <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                {company.verified && (
                  <div className="flex items-center gap-1 text-blue-600" title="Verified Company">
                    <CheckBadgeIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600">Org. nr.: {company.organizationNumber}</p>
            </div>
            {canEdit && (
              <button
                onClick={() => navigate(`/companies/${id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Rating Section */}
          {company.aggregatedRating !== null && company.aggregatedRating !== undefined && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              {renderStars(company.aggregatedRating)}
              <span className="text-lg font-semibold text-gray-900">
                {company.aggregatedRating.toFixed(1)}
              </span>
              <span className="text-gray-600">
                ({company.totalRatings} {company.totalRatings === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          )}
        </div>

        {/* Company Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Company Information</h2>
          
          <div className="space-y-4">
            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Location</p>
                <p className="text-gray-600">{company.businessAddress}</p>
                <p className="text-gray-600">
                  {company.postalCode} {company.city}
                </p>
                <p className="text-gray-600">
                  {company.kommune}, {company.fylke}
                </p>
              </div>
            </div>

            {/* VAT Status */}
            <div className="flex items-start gap-3">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">VAT Registration</p>
                <p className="text-gray-600">
                  {company.vatRegistered ? 'VAT Registered' : 'Not VAT Registered'}
                </p>
              </div>
            </div>

            {/* Description */}
            {company.description && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">About</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{company.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Member Since</p>
              <p className="font-medium text-gray-900">
                {new Date(company.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {company.verifiedAt && (
              <div>
                <p className="text-gray-600">Verified On</p>
                <p className="font-medium text-gray-900">
                  {new Date(company.verifiedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
          <ReviewsList
            reviews={reviews}
            canRespond={canRespond}
            onRespond={async (ratingId, response) => {
              await respondToReviewMutation.mutateAsync({ ratingId, response });
            }}
          />
        </div>
      </div>
    </Layout>
  );
}
