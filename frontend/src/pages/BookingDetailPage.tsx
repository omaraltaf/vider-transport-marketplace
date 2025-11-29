/**
 * Booking Detail Page
 * Displays detailed booking information and provider response actions
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { RatingForm } from '../components/RatingForm';
import type { Rating } from '../types';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposedTerms, setProposedTerms] = useState({
    startDate: '',
    endDate: '',
    providerRate: '',
  });
  const [showRatingForm, setShowRatingForm] = useState(false);

  const { data: booking, isLoading, error } = useQuery<any>({
    queryKey: ['booking', id],
    queryFn: async () => {
      return apiClient.get<any>(`/bookings/${id}`, token || '');
    },
    enabled: !!token && !!id,
  });

  const { data: existingRating } = useQuery<Rating | null>({
    queryKey: ['rating', 'booking', id],
    queryFn: async () => {
      try {
        return await apiClient.get<Rating>(`/ratings/booking/${id}`, token || '');
      } catch (err) {
        return null;
      }
    },
    enabled: !!token && !!id && booking?.status === 'COMPLETED',
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/bookings/${id}/accept`, {}, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiClient.post(`/bookings/${id}/decline`, { reason }, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowDeclineModal(false);
      setDeclineReason('');
    },
  });

  const proposeMutation = useMutation({
    mutationFn: async (terms: any) => {
      return apiClient.post(`/bookings/${id}/propose-terms`, terms, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      setShowProposeModal(false);
      setProposedTerms({ startDate: '', endDate: '', providerRate: '' });
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiClient.post('/ratings', { bookingId: id, ...ratingData }, token || '');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rating', 'booking', id] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      setShowRatingForm(false);
    },
  });

  const handleAccept = () => {
    if (window.confirm('Are you sure you want to accept this booking?')) {
      acceptMutation.mutate();
    }
  };

  const handleDecline = () => {
    declineMutation.mutate(declineReason);
  };

  const handlePropose = () => {
    const terms: any = {};
    if (proposedTerms.startDate) terms.startDate = proposedTerms.startDate;
    if (proposedTerms.endDate) terms.endDate = proposedTerms.endDate;
    if (proposedTerms.providerRate) terms.providerRate = parseFloat(proposedTerms.providerRate);
    
    proposeMutation.mutate(terms);
  };

  const handleDownloadContract = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/bookings/${id}/contract`, '_blank');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'DISPUTED':
        return 'bg-orange-100 text-orange-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  const isProvider = booking && booking.providerCompanyId === user?.companyId;
  const isRenter = booking && booking.renterCompanyId === user?.companyId;
  const canRespond = isProvider && booking?.status === 'PENDING';
  const canRate = isRenter && booking?.status === 'COMPLETED' && !existingRating;
  const hasDriver = !!booking?.driverListingId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading booking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading booking</h3>
                <p className="mt-1 text-sm text-red-700">{error ? (error as Error).message : 'Booking not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{booking.bookingNumber}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Booking Details
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(booking.status)}`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Provider Actions */}
        {canRespond && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Action Required</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This booking request is waiting for your response. Please accept, decline, or propose new terms.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={acceptMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {acceptMutation.isPending ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => setShowDeclineModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => setShowProposeModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Propose New Terms
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Prompt */}
        {canRate && !showRatingForm && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">Rate Your Experience</h3>
                <p className="mt-1 text-sm text-blue-700">
                  This booking is complete. Share your experience to help other companies make informed decisions.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowRatingForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Submit Rating
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Form */}
        {showRatingForm && (
          <div className="mb-6">
            <RatingForm
              bookingId={id!}
              hasDriver={hasDriver}
              onSubmit={async (data) => {
                await submitRatingMutation.mutateAsync(data);
              }}
              onCancel={() => setShowRatingForm(false)}
            />
          </div>
        )}

        {/* Existing Rating Display */}
        {existingRating && (
          <div className="mb-6 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Rating</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Company Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= existingRating.companyStars
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {existingRating.companyStars} stars
                  </span>
                </div>
                {existingRating.companyReview && (
                  <p className="mt-2 text-sm text-gray-700">{existingRating.companyReview}</p>
                )}
              </div>
              {existingRating.driverStars && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Driver Rating</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= existingRating.driverStars!
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {existingRating.driverStars} stars
                    </span>
                  </div>
                  {existingRating.driverReview && (
                    <p className="mt-2 text-sm text-gray-700">{existingRating.driverReview}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {acceptMutation.isError && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Failed to accept booking: {(acceptMutation.error as Error).message}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Information</h3>
                
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(booking.startDate)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">End Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(booking.endDate)}</dd>
                  </div>
                  
                  {booking.duration.days && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{booking.duration.days} days</dd>
                    </div>
                  )}
                  
                  {booking.duration.hours && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-sm text-gray-900">{booking.duration.hours} hours</dd>
                    </div>
                  )}
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Requested At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(booking.requestedAt)}</dd>
                  </div>
                  
                  {booking.respondedAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Responded At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(booking.respondedAt)}</dd>
                    </div>
                  )}
                  
                  {booking.status === 'PENDING' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Expires At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(booking.expiresAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Listing Details */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Details</h3>
                
                {booking.vehicleListing && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Vehicle</h4>
                    <div className="flex items-start">
                      {booking.vehicleListing.photos && booking.vehicleListing.photos.length > 0 && (
                        <img
                          src={booking.vehicleListing.photos[0]}
                          alt={booking.vehicleListing.title}
                          className="w-24 h-24 object-cover rounded-lg mr-4"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.vehicleListing.title}</p>
                        <p className="text-sm text-gray-500">{booking.vehicleListing.vehicleType}</p>
                        <p className="text-sm text-gray-500">{booking.vehicleListing.capacity} pallets</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {booking.driverListing && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Driver</h4>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.driverListing.name}</p>
                      <p className="text-sm text-gray-500">License: {booking.driverListing.licenseClass}</p>
                      {booking.driverListing.languages && booking.driverListing.languages.length > 0 && (
                        <p className="text-sm text-gray-500">Languages: {booking.driverListing.languages.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Companies</h3>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Renter</h4>
                    <p className="text-sm font-medium text-gray-900">{booking.renterCompany.name}</p>
                    <p className="text-sm text-gray-500">{booking.renterCompany.city}, {booking.renterCompany.fylke}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Provider</h4>
                    <p className="text-sm font-medium text-gray-900">{booking.providerCompany.name}</p>
                    <p className="text-sm text-gray-500">{booking.providerCompany.city}, {booking.providerCompany.fylke}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
                
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Provider Rate</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.costs.providerRate, booking.costs.currency)}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">
                      Platform Commission ({booking.costs.platformCommissionRate}%)
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.costs.platformCommission, booking.costs.currency)}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">
                      Taxes ({booking.costs.taxRate}%)
                    </dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.costs.taxes, booking.costs.currency)}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <dt className="text-base font-medium text-gray-900">Total</dt>
                    <dd className="text-base font-bold text-gray-900">
                      {formatCurrency(booking.costs.total, booking.costs.currency)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Contract Download */}
            {booking.contractPdfPath && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contract</h3>
                  <button
                    onClick={handleDownloadContract}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Contract PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeclineModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Decline Booking
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Please provide a reason for declining this booking (optional).
                    </p>
                  </div>
                  <div className="mt-4">
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={4}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Reason for declining..."
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={declineMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {declineMutation.isPending ? 'Declining...' : 'Decline Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Propose Terms Modal */}
      {showProposeModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowProposeModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Propose New Terms
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Suggest alternative dates or pricing for this booking.
                    </p>
                  </div>
                  <div className="mt-4 space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={proposedTerms.startDate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, startDate: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={proposedTerms.endDate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, endDate: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Provider Rate ({booking.costs.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={proposedTerms.providerRate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, providerRate: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handlePropose}
                  disabled={proposeMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                >
                  {proposeMutation.isPending ? 'Proposing...' : 'Propose Terms'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
