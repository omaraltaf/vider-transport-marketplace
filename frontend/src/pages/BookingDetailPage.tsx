/**
 * Booking Detail Page
 * Displays detailed booking information and provider response actions
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { RatingForm } from '../components/RatingForm';
import type { Rating } from '../types';
import { Container, Card, Badge, Button, Stack, Spinner } from '../design-system/components';
import { ChevronLeft, AlertTriangle, Star, Download, AlertCircle } from 'lucide-react';

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
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<any>(`/bookings/${id}`, validToken);
    },
    enabled: !!user && !!id,
  });

  const { data: existingRating } = useQuery<Rating | null>({
    queryKey: ['rating', 'booking', id],
    queryFn: async () => {
      try {
        const validToken = await tokenManager.getValidToken();
        return await apiClient.get<Rating>(`/ratings/booking/${id}`, validToken);
      } catch (err) {
        return null;
      }
    },
    enabled: !!user && !!id && booking?.status === 'COMPLETED',
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/bookings/${id}/accept`, {}, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/bookings/${id}/decline`, { reason }, validToken);
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
      const validToken = await tokenManager.getValidToken();
      return apiClient.post(`/bookings/${id}/propose-terms`, terms, validToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      setShowProposeModal(false);
      setProposedTerms({ startDate: '', endDate: '', providerRate: '' });
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.post('/ratings', { bookingId: id, ...ratingData }, validToken);
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

  const handleDownloadContract = async () => {
    try {
      // Try multiple token storage keys used by the app
      const token = localStorage.getItem('auth_token') || 
                   localStorage.getItem('accessToken') || 
                   localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/bookings/${id}/contract`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download contract');
      }

      // Get the filename from the response headers or use a default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `contract-${booking?.bookingNumber || id}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading contract:', error);
      // You might want to show a toast notification here
      alert('Failed to download contract. Please try again.');
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'ACCEPTED':
      case 'ACTIVE':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
      case 'DISPUTED':
        return 'error';
      case 'CLOSED':
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Using centralized currency utility
  const formatCurrency = (amount: number, currency: string = 'NOK') => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const isProvider = booking && booking.providerCompanyId === user?.companyId;
  const isRenter = booking && booking.renterCompanyId === user?.companyId;
  const canRespond = isProvider && booking?.status === 'PENDING';
  const canRate = isRenter && booking?.status === 'COMPLETED' && !existingRating;
  const hasDriver = !!booking?.driverListingId;

  if (isLoading) {
    return (
      <div className="min-h-screen ds-bg-page">
        <Navbar />
        <Container>
          <Stack spacing={2} align="center" className="py-12">
            <Spinner size="lg" />
            <p className="text-sm ds-text-gray-500">Loading booking...</p>
          </Stack>
        </Container>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen ds-bg-page">
        <Navbar />
        <Container>
          <Card padding="md" className="ds-bg-error-light border ds-border-error mt-8">
            <Stack direction="horizontal" spacing={3} align="start">
              <AlertCircle className="h-5 w-5 ds-text-error flex-shrink-0" />
              <Stack spacing={1}>
                <h3 className="text-sm font-medium ds-text-error">Error loading booking</h3>
                <p className="text-sm ds-text-error">{error ? (error as Error).message : 'Booking not found'}</p>
              </Stack>
            </Stack>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container>
        <Stack spacing={6} className="py-8">
          {/* Header */}
          <Stack spacing={4}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ChevronLeft />}
              onClick={() => navigate('/bookings')}
            >
              Back to Bookings
            </Button>
            
            <Stack direction="horizontal" justify="between" align="center">
              <Stack spacing={1}>
                <h1 className="text-3xl font-bold ds-text-gray-900">{booking.bookingNumber}</h1>
                <p className="text-sm ds-text-gray-500">Booking Details</p>
              </Stack>
              <Badge variant={getStatusBadgeVariant(booking.status)} size="lg">
                {booking.status}
              </Badge>
            </Stack>
          </Stack>

          {/* Provider Actions */}
          {canRespond && (
            <Card padding="md" className="ds-bg-warning-50 ds-border-warning-200">
              <Stack direction="horizontal" spacing={3} align="start">
                <AlertTriangle className="h-5 w-5 ds-text-warning-400 flex-shrink-0" />
                <Stack spacing={4} className="flex-1">
                  <Stack spacing={1}>
                    <h3 className="text-sm font-medium ds-text-warning-800">Action Required</h3>
                    <p className="text-sm ds-text-warning-700">
                      This booking request is waiting for your response. Please accept, decline, or propose new terms.
                    </p>
                  </Stack>
                  <Stack direction="horizontal" spacing={3} wrap>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleAccept}
                      loading={acceptMutation.isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setShowDeclineModal(true)}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => setShowProposeModal(true)}
                    >
                      Propose New Terms
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Card>
          )}

          {/* Rating Prompt */}
          {canRate && !showRatingForm && (
            <Card padding="md" className="ds-bg-primary-50 ds-border-primary-200">
              <Stack direction="horizontal" spacing={3} align="start">
                <Star className="h-5 w-5 ds-text-info flex-shrink-0" />
                <Stack spacing={4} className="flex-1">
                  <Stack spacing={1}>
                    <h3 className="text-sm font-medium ds-text-primary-800">Rate Your Experience</h3>
                    <p className="text-sm ds-text-primary-700">
                      This booking is complete. Share your experience to help other companies make informed decisions.
                    </p>
                  </Stack>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowRatingForm(true)}
                  >
                    Submit Rating
                  </Button>
                </Stack>
              </Stack>
            </Card>
          )}

          {/* Rating Form */}
          {showRatingForm && (
            <RatingForm
              bookingId={id!}
              hasDriver={hasDriver}
              onSubmit={async (data) => {
                await submitRatingMutation.mutateAsync(data);
              }}
              onCancel={() => setShowRatingForm(false)}
            />
          )}

          {/* Existing Rating Display */}
          {existingRating && (
            <Card padding="lg">
              <Stack spacing={4}>
                <h3 className="text-lg font-medium ds-text-gray-900">Your Rating</h3>
                <Stack spacing={2}>
                  <p className="text-sm font-medium ds-text-gray-700">Company Rating</p>
                  <Stack direction="horizontal" spacing={2} align="center">
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
                    <span className="text-sm ds-text-gray-600">
                      {existingRating.companyStars} stars
                    </span>
                  </Stack>
                  {existingRating.companyReview && (
                    <p className="text-sm ds-text-gray-700">{existingRating.companyReview}</p>
                  )}
                </Stack>
                {existingRating.driverStars && (
                  <Stack spacing={2}>
                    <p className="text-sm font-medium ds-text-gray-700">Driver Rating</p>
                    <Stack direction="horizontal" spacing={2} align="center">
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
                      <span className="text-sm ds-text-gray-600">
                        {existingRating.driverStars} stars
                      </span>
                    </Stack>
                    {existingRating.driverReview && (
                      <p className="text-sm ds-text-gray-700">{existingRating.driverReview}</p>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
          )}

          {/* Error Messages */}
          {acceptMutation.isError && (
            <Card padding="md" className="ds-bg-error-light border ds-border-error">
              <p className="text-sm ds-text-error">
                Failed to accept booking: {(acceptMutation.error as Error).message}
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <Stack spacing={6} className="lg:col-span-2">
              {/* Booking Information */}
              <Card padding="lg">
                <Stack spacing={4}>
                  <h3 className="text-lg font-medium ds-text-gray-900">Booking Information</h3>
                  
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium ds-text-gray-500">Start Date</dt>
                      <dd className="mt-1 text-sm ds-text-gray-900">{formatDate(booking.startDate)}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium ds-text-gray-500">End Date</dt>
                      <dd className="mt-1 text-sm ds-text-gray-900">{formatDate(booking.endDate)}</dd>
                    </div>
                    
                    {booking.duration.days && (
                      <div>
                        <dt className="text-sm font-medium ds-text-gray-500">Duration</dt>
                        <dd className="mt-1 text-sm ds-text-gray-900">{booking.duration.days} days</dd>
                      </div>
                    )}
                    
                    {booking.duration.hours && (
                      <div>
                        <dt className="text-sm font-medium ds-text-gray-500">Duration</dt>
                        <dd className="mt-1 text-sm ds-text-gray-900">{booking.duration.hours} hours</dd>
                      </div>
                    )}
                    
                    <div>
                      <dt className="text-sm font-medium ds-text-gray-500">Requested At</dt>
                      <dd className="mt-1 text-sm ds-text-gray-900">{formatDate(booking.requestedAt)}</dd>
                    </div>
                    
                    {booking.respondedAt && (
                      <div>
                        <dt className="text-sm font-medium ds-text-gray-500">Responded At</dt>
                        <dd className="mt-1 text-sm ds-text-gray-900">{formatDate(booking.respondedAt)}</dd>
                      </div>
                    )}
                    
                    {booking.status === 'PENDING' && (
                      <div>
                        <dt className="text-sm font-medium ds-text-gray-500">Expires At</dt>
                        <dd className="mt-1 text-sm ds-text-gray-900">{formatDate(booking.expiresAt)}</dd>
                      </div>
                    )}
                  </dl>
                </Stack>
              </Card>

              {/* Listing Details */}
              <Card padding="lg">
                <Stack spacing={4}>
                  <h3 className="text-lg font-medium ds-text-gray-900">Rental Details</h3>
                  
                  {booking.vehicleListing && (
                    <Stack spacing={2}>
                      <h4 className="text-sm font-medium ds-text-gray-700">Vehicle</h4>
                      <Stack direction="horizontal" spacing={4} align="start">
                        {booking.vehicleListing.photos && booking.vehicleListing.photos.length > 0 && (
                          <img
                            src={booking.vehicleListing.photos[0]}
                            alt={booking.vehicleListing.title}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <Stack spacing={1}>
                          <p className="text-sm font-medium ds-text-gray-900">{booking.vehicleListing.title}</p>
                          <p className="text-sm ds-text-gray-500">{booking.vehicleListing.vehicleType}</p>
                          <p className="text-sm ds-text-gray-500">{booking.vehicleListing.capacity} pallets</p>
                        </Stack>
                      </Stack>
                    </Stack>
                  )}
                  
                  {booking.driverListing && (
                    <Stack spacing={2}>
                      <h4 className="text-sm font-medium ds-text-gray-700">Driver</h4>
                      <Stack spacing={1}>
                        <p className="text-sm font-medium ds-text-gray-900">{booking.driverListing.name}</p>
                        <p className="text-sm ds-text-gray-500">License: {booking.driverListing.licenseClass}</p>
                        {booking.driverListing.languages && booking.driverListing.languages.length > 0 && (
                          <p className="text-sm ds-text-gray-500">Languages: {booking.driverListing.languages.join(', ')}</p>
                        )}
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </Card>

              {/* Company Information */}
              <Card padding="lg">
                <Stack spacing={4}>
                  <h3 className="text-lg font-medium ds-text-gray-900">Companies</h3>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Stack spacing={2}>
                      <h4 className="text-sm font-medium ds-text-gray-700">Renter</h4>
                      <p className="text-sm font-medium ds-text-gray-900">{booking.renterCompany.name}</p>
                      <p className="text-sm ds-text-gray-500">{booking.renterCompany.city}, {booking.renterCompany.fylke}</p>
                    </Stack>
                    
                    <Stack spacing={2}>
                      <h4 className="text-sm font-medium ds-text-gray-700">Provider</h4>
                      <p className="text-sm font-medium ds-text-gray-900">{booking.providerCompany.name}</p>
                      <p className="text-sm ds-text-gray-500">{booking.providerCompany.city}, {booking.providerCompany.fylke}</p>
                    </Stack>
                  </div>
                </Stack>
              </Card>
            </Stack>

            {/* Sidebar */}
            <Stack spacing={6}>
              {/* Cost Breakdown */}
              <Card padding="lg">
                <Stack spacing={4}>
                  <h3 className="text-lg font-medium ds-text-gray-900">Cost Breakdown</h3>
                  
                  <Stack spacing={3}>
                    <Stack direction="horizontal" justify="between">
                      <dt className="text-sm ds-text-gray-500">Provider Rate</dt>
                      <dd className="text-sm font-medium ds-text-gray-900">
                        {formatCurrency(booking.costs.providerRate, booking.costs.currency)}
                      </dd>
                    </Stack>
                    
                    <Stack direction="horizontal" justify="between">
                      <dt className="text-sm ds-text-gray-500">
                        Platform Commission ({booking.costs.platformCommissionRate}%)
                      </dt>
                      <dd className="text-sm font-medium ds-text-gray-900">
                        {formatCurrency(booking.costs.platformCommission, booking.costs.currency)}
                      </dd>
                    </Stack>
                    
                    <Stack direction="horizontal" justify="between">
                      <dt className="text-sm ds-text-gray-500">
                        Taxes ({booking.costs.taxRate}%)
                      </dt>
                      <dd className="text-sm font-medium ds-text-gray-900">
                        {formatCurrency(booking.costs.taxes, booking.costs.currency)}
                      </dd>
                    </Stack>
                    
                    <Stack direction="horizontal" justify="between" className="pt-3 border-t ds-border-gray-200">
                      <dt className="text-base font-medium ds-text-gray-900">Total</dt>
                      <dd className="text-base font-bold ds-text-gray-900">
                        {formatCurrency(booking.costs.total, booking.costs.currency)}
                      </dd>
                    </Stack>
                  </Stack>
                </Stack>
              </Card>

              {/* Contract Download */}
              {booking.contractPdfPath && (
                <Card padding="lg">
                  <Stack spacing={4}>
                    <h3 className="text-lg font-medium ds-text-gray-900">Contract</h3>
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={<Download />}
                      onClick={handleDownloadContract}
                    >
                      Download Contract PDF
                    </Button>
                  </Stack>
                </Card>
              )}
            </Stack>
          </div>
        </Stack>
      </Container>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 ds-bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeclineModal(false)}></div>

            <div className="inline-block align-bottom ds-bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium ds-text-gray-900">
                    Decline Booking
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm ds-text-gray-500">
                      Please provide a reason for declining this booking (optional).
                    </p>
                  </div>
                  <div className="mt-4">
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={4}
                      className="shadow-sm ds-focus-ring-primary ds-focus-border-primary block w-full sm:text-sm ds-border-gray-300 rounded-md"
                      placeholder="Reason for declining..."
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={handleDecline}
                  loading={declineMutation.isPending}
                  disabled={declineMutation.isPending}
                >
                  {declineMutation.isPending ? 'Declining...' : 'Decline Booking'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setShowDeclineModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Propose Terms Modal */}
      {showProposeModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 ds-bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowProposeModal(false)}></div>

            <div className="inline-block align-bottom ds-bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium ds-text-gray-900">
                    Propose New Terms
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm ds-text-gray-500">
                      Suggest alternative dates or pricing for this booking.
                    </p>
                  </div>
                  <div className="mt-4 space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium ds-text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={proposedTerms.startDate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, startDate: e.target.value })}
                        className="mt-1 block w-full ds-border-gray-300 rounded-md shadow-sm ds-focus-ring-primary ds-focus-border-primary sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium ds-text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={proposedTerms.endDate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, endDate: e.target.value })}
                        className="mt-1 block w-full ds-border-gray-300 rounded-md shadow-sm ds-focus-ring-primary ds-focus-border-primary sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium ds-text-gray-700">
                        Provider Rate ({booking.costs.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={proposedTerms.providerRate}
                        onChange={(e) => setProposedTerms({ ...proposedTerms, providerRate: e.target.value })}
                        className="mt-1 block w-full ds-border-gray-300 rounded-md shadow-sm ds-focus-ring-primary ds-focus-border-primary sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handlePropose}
                  loading={proposeMutation.isPending}
                  disabled={proposeMutation.isPending}
                >
                  {proposeMutation.isPending ? 'Proposing...' : 'Propose Terms'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => setShowProposeModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
