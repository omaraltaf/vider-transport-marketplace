/**
 * Listing Detail Page
 * Display detailed information about a listing and allow booking
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext';
import { UserStateGuard } from '../components/auth/UserStateGuard';
import Navbar from '../components/Navbar';
import { Button } from '../design-system/components/Button';
import { Card } from '../design-system/components/Card';
import { Badge } from '../design-system/components/Badge';
import { Container } from '../design-system/components/Container';
import { CalendarView } from '../components/availability/CalendarView';
import type { VehicleListing, Company } from '../types';

interface ListingWithCompany extends VehicleListing {
  company: Company;
}

interface Rating {
  id: string;
  companyStars: number;
  companyReview?: string;
  driverStars?: number;
  driverReview?: string;
  providerResponse?: string;
  renterCompany: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface CostBreakdown {
  vehicleRate?: number;
  driverRate?: number;
  providerRate: number;
  platformCommission: number;
  platformCommissionRate: number;
  taxes: number;
  taxRate: number;
  total: number;
  currency: string;
}

export default function ListingDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user, token } = useEnhancedAuth();

  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    durationType: 'days' as 'hours' | 'days',
    durationValue: 1,
    includeDriver: false,
  });
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [calculatingCost, setCalculatingCost] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Fetch listing details (Phase 1: Vehicles only)
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', type, id],
    queryFn: async () => {
      // Phase 1: Only support vehicle listings
      if (type === 'vehicle') {
        return apiClient.get<ListingWithCompany>(`/listings/vehicles/${id}`);
      }
      throw new Error('Only vehicle listings are supported in Phase 1');
    },
    enabled: !!type && !!id && type === 'vehicle',
  });

  // Fetch ratings for the listing
  const { data: ratings } = useQuery({
    queryKey: ['ratings', type, id],
    queryFn: async () => {
      if (type === 'vehicle' && listing) {
        return apiClient.get<Rating[]>(`/ratings/company/${(listing as ListingWithCompany).companyId}`);
      } else if (type === 'driver') {
        return apiClient.get<Rating[]>(`/ratings/driver/${id}`);
      }
      return [];
    },
    enabled: !!listing,
  });



  // Calculate costs when booking data changes
  const calculateCosts = async () => {
    if (!bookingData.startDate || !listing) {
      return;
    }

    // For daily rentals, require end date
    if (bookingData.durationType === 'days' && !bookingData.endDate) {
      alert('Please select an end date for daily rental');
      return;
    }

    // For hourly rentals, require number of hours
    if (bookingData.durationType === 'hours' && bookingData.durationValue < 1) {
      alert('Please enter number of hours');
      return;
    }

    setCalculatingCost(true);
    try {
      const duration = {
        [bookingData.durationType === 'hours' ? 'hours' : 'days']: bookingData.durationValue,
      };

      const payload: any = {
        listingId: id,
        listingType: type,
        duration,
        includeDriver: bookingData.includeDriver,
      };

      const response = await apiClient.post<CostBreakdown>(
        '/bookings/calculate-costs',
        payload,
        token || undefined
      );

      setCostBreakdown(response);
    } catch (err) {
      console.error('Error calculating costs:', err);
      alert('Failed to calculate costs. Please try again.');
    } finally {
      setCalculatingCost(false);
    }
  };

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/bookings', data, token || undefined);
    },
    onSuccess: () => {
      alert('Booking request submitted successfully!');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      alert(`Error creating booking: ${error.message}`);
    },
  });

  // Check availability before booking
  const checkAvailability = async () => {
    if (!bookingData.startDate || !listing) {
      return;
    }

    // For daily rentals, require end date
    if (bookingData.durationType === 'days' && !bookingData.endDate) {
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityError(null);

    try {
      // Calculate end date for hourly rentals
      let endDate: Date;
      if (bookingData.durationType === 'hours') {
        const start = new Date(bookingData.startDate);
        endDate = new Date(start.getTime() + bookingData.durationValue * 60 * 60 * 1000);
      } else {
        endDate = new Date(bookingData.endDate);
      }

      const response = await apiClient.post<{ available: boolean; conflicts: any[] }>(
        '/availability/check',
        {
          listingId: id,
          listingType: type,
          startDate: new Date(bookingData.startDate).toISOString(),
          endDate: endDate.toISOString(),
        },
        token || undefined
      );

      if (!response.available) {
        const conflictMessages = response.conflicts.map((conflict: any) => {
          if (conflict.type === 'booking') {
            return `Booking conflict: ${new Date(conflict.startDate).toLocaleDateString()} - ${new Date(conflict.endDate).toLocaleDateString()}`;
          } else {
            return `Blocked: ${new Date(conflict.startDate).toLocaleDateString()} - ${new Date(conflict.endDate).toLocaleDateString()}${conflict.reason ? ` (${conflict.reason})` : ''}`;
          }
        }).join(', ');
        setAvailabilityError(`This listing is not available for the selected dates. ${conflictMessages}`);
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityError('Failed to check availability. Please try again.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !listing) {
      alert('You must be logged in to create a booking');
      return;
    }

    if (!bookingData.startDate) {
      alert('Please select a start date');
      return;
    }

    if (bookingData.durationType === 'days' && !bookingData.endDate) {
      alert('Please select an end date');
      return;
    }

    // Check availability before submitting
    setCheckingAvailability(true);
    setAvailabilityError(null);

    try {
      // Calculate end date for hourly rentals
      let endDate: Date;
      if (bookingData.durationType === 'hours') {
        const start = new Date(bookingData.startDate);
        endDate = new Date(start.getTime() + bookingData.durationValue * 60 * 60 * 1000);
      } else {
        endDate = new Date(bookingData.endDate);
      }

      // Check availability
      const availabilityResponse = await apiClient.post<{ available: boolean; conflicts: any[] }>(
        '/availability/check',
        {
          listingId: id,
          listingType: type,
          startDate: new Date(bookingData.startDate).toISOString(),
          endDate: endDate.toISOString(),
        },
        token || undefined
      );

      if (!availabilityResponse.available) {
        const conflictMessages = availabilityResponse.conflicts.map((conflict: any) => {
          if (conflict.type === 'booking') {
            return `Booking conflict: ${new Date(conflict.startDate).toLocaleDateString()} - ${new Date(conflict.endDate).toLocaleDateString()}`;
          } else {
            return `Blocked: ${new Date(conflict.startDate).toLocaleDateString()} - ${new Date(conflict.endDate).toLocaleDateString()}${conflict.reason ? ` (${conflict.reason})` : ''}`;
          }
        }).join(', ');
        setAvailabilityError(`This listing is not available for the selected dates. ${conflictMessages}`);
        setCheckingAvailability(false);
        return;
      }

      setCheckingAvailability(false);

      const bookingRequest: any = {
        renterCompanyId: user.companyId,
        providerCompanyId: (listing as any).companyId,
        vehicleListingId: id, // Phase 1: Only vehicle bookings
        startDate: new Date(bookingData.startDate).toISOString(),
        endDate: endDate.toISOString(),
        [bookingData.durationType === 'hours' ? 'durationHours' : 'durationDays']: bookingData.durationValue,
        includeDriver: bookingData.includeDriver,
      };

      createBookingMutation.mutate(bookingRequest);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityError('Failed to check availability. Please try again.');
      setCheckingAvailability(false);
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
    setCostBreakdown(null); // Reset cost when dates change
    setAvailabilityError(null); // Reset availability error when dates change

    // For days mode, calculate duration when both dates are set
    if (bookingData.durationType === 'days') {
      if (field === 'endDate' && bookingData.startDate && value) {
        const start = new Date(bookingData.startDate);
        const end = new Date(value);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); // +1 to include both start and end day
        setBookingData(prev => ({ ...prev, durationValue: diffDays }));
      } else if (field === 'startDate' && bookingData.endDate && value) {
        const start = new Date(value);
        const end = new Date(bookingData.endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); // +1 to include both start and end day
        setBookingData(prev => ({ ...prev, durationValue: diffDays }));
      }
    }
  };

  const handleDurationTypeChange = (newType: 'hours' | 'days') => {
    setBookingData(prev => ({
      ...prev,
      durationType: newType,
      durationValue: 1,
      endDate: newType === 'hours' ? '' : prev.endDate, // Clear end date for hours
    }));
    setCostBreakdown(null); // Reset cost when changing duration type
  };

  if (isLoading) {
    return (
      <div className="min-h-screen ds-bg-page">
        <Navbar />
        <Container>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 ds-border-primary-600"></div>
            <p className="mt-2 text-sm ds-text-gray-500">Loading listing...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen ds-bg-page">
        <Navbar />
        <Container>
          <Card padding="lg">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium ds-text-error">Error loading listing</h3>
                <p className="mt-1 text-sm ds-text-error">
                  {(error as Error)?.message || 'Listing not found'}
                </p>
              </div>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  const isVehicle = type === 'vehicle';
  const vehicleListing = isVehicle ? (listing as any) : null;
  const driverListing = !isVehicle ? (listing as any) : null;
  const company = (listing as any).company;

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container>
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          }
          className="mb-4"
        >
          Back to search
        </Button>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            {isVehicle && vehicleListing && vehicleListing.photos.length > 0 && (
              <Card className="mb-6 overflow-hidden p-0">
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={vehicleListing.photos[selectedPhoto]}
                    alt={vehicleListing.title}
                    className="w-full h-96 object-cover"
                  />
                </div>
                {vehicleListing.photos.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {vehicleListing.photos.map((photo: any, index: any) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhoto(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedPhoto === index ? 'ds-border-primary-600' : 'ds-border-gray-200'
                        }`}
                      >
                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Listing Information */}
            <Card padding="lg" className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold ds-text-gray-900">
                    {isVehicle ? vehicleListing?.title : driverListing?.name}
                  </h1>
                  {isVehicle && vehicleListing && (
                    <p className="mt-1 text-sm ds-text-gray-500">
                      {vehicleListing.location.city}, {vehicleListing.location.fylke}
                    </p>
                  )}
                </div>
                {((isVehicle && company?.verified) || (!isVehicle && driverListing?.verified)) && (
                  <Badge variant="success" size="md">
                    <svg className="mr-1 h-4 w-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </Badge>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="ds-text-gray-700">
                  {isVehicle ? vehicleListing?.description : driverListing?.backgroundSummary}
                </p>
              </div>

              {/* Vehicle Details */}
              {isVehicle && vehicleListing && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">Vehicle Type</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">{vehicleListing.vehicleType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">Capacity</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">{vehicleListing.capacity} pallets</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">Fuel Type</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">{vehicleListing.fuelType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">Location</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">
                      {vehicleListing.location.kommune}, {vehicleListing.location.fylke}
                    </p>
                  </div>
                </div>
              )}

              {/* Driver Details */}
              {!isVehicle && driverListing && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">License Class</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">{driverListing.licenseClass}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium ds-text-gray-500">Languages</h3>
                    <p className="mt-1 text-sm ds-text-gray-900">{driverListing.languages.join(', ')}</p>
                  </div>
                </div>
              )}

              {/* Service Offerings */}
              {isVehicle && vehicleListing && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium ds-text-gray-500 mb-2">Service Offerings</h3>
                  <div className="flex gap-2">
                    {vehicleListing.serviceOfferings.withDriver && (
                      <Badge variant="info" size="md">
                        With Driver
                        {vehicleListing.serviceOfferings.withDriverCost && 
                          ` (+${vehicleListing.serviceOfferings.withDriverCost} ${vehicleListing.pricing.currency})`
                        }
                      </Badge>
                    )}
                    {vehicleListing.serviceOfferings.withoutDriver && (
                      <Badge variant="info" size="md">
                        Without Driver
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {isVehicle && vehicleListing && vehicleListing.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium ds-text-gray-500 mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {vehicleListing.tags.map((tag: any) => (
                      <Badge key={tag} variant="neutral" size="md">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Provider Company Info */}
            <Card padding="lg" className="mb-6">
              <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Provider Information</h2>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium ds-text-gray-900">{company?.name}</h3>
                  {company?.description && (
                    <p className="mt-1 text-sm ds-text-gray-500">{company.description}</p>
                  )}
                  <p className="mt-2 text-sm ds-text-gray-500">
                    {company?.city}, {company?.fylke}
                  </p>
                </div>
                {company?.verified && (
                  <Badge variant="success" size="sm">
                    Verified Company
                  </Badge>
                )}
              </div>
              {company?.aggregatedRating && (
                <div className="mt-4 flex items-center">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(company.aggregatedRating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm ds-text-gray-600">
                    {company.aggregatedRating.toFixed(1)} ({company.totalRatings} reviews)
                  </span>
                </div>
              )}
            </Card>

            {/* Reviews Section */}
            {ratings && ratings.length > 0 && (
              <Card padding="lg" className="mb-6">
                <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-6">
                  {ratings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="border-b ds-border-gray-200 pb-6 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-4 w-4 ${
                                  i < (isVehicle ? rating.companyStars : (rating.driverStars || 0))
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="ml-2 text-sm font-medium ds-text-gray-900">
                              {rating.renterCompany.name}
                            </span>
                          </div>
                          <p className="mt-2 text-sm ds-text-gray-700">
                            {isVehicle ? rating.companyReview : rating.driverReview}
                          </p>
                          {rating.providerResponse && (
                            <div className="mt-3 pl-4 border-l-2 ds-border-gray-200">
                              <p className="text-sm font-medium ds-text-gray-900">Provider Response:</p>
                              <p className="mt-1 text-sm ds-text-gray-700">{rating.providerResponse}</p>
                            </div>
                          )}
                        </div>
                        <span className="text-xs ds-text-gray-500">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Availability Calendar */}
            <Card padding="lg">
              <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Availability Calendar</h2>
              <p className="text-sm ds-text-gray-500 mb-4">
                View available dates for this listing. Blocked dates are unavailable for booking.
              </p>
              <CalendarView
                listingId={id!}
                listingType={type as 'vehicle' | 'driver'}
                mode="view"
                onDateSelect={(startDate, endDate) => {
                  setBookingData(prev => ({
                    ...prev,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    durationType: 'days',
                  }));
                  setShowBookingForm(true);
                  // Scroll to booking form
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Card>
          </div>

          {/* Sidebar - Pricing and Booking */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <Card padding="lg" className="sticky top-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold ds-text-gray-900 mb-2">Pricing</h3>
                {isVehicle && vehicleListing && (
                  <div className="space-y-2">
                    {vehicleListing.pricing.hourlyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm ds-text-gray-600">Hourly Rate:</span>
                        <span className="text-sm font-medium ds-text-gray-900">
                          {vehicleListing.pricing.hourlyRate} {vehicleListing.pricing.currency}/hr
                        </span>
                      </div>
                    )}
                    {vehicleListing.pricing.dailyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm ds-text-gray-600">Daily Rate:</span>
                        <span className="text-sm font-medium ds-text-gray-900">
                          {vehicleListing.pricing.dailyRate} {vehicleListing.pricing.currency}/day
                        </span>
                      </div>
                    )}
                    {vehicleListing.pricing.deposit && (
                      <div className="flex justify-between">
                        <span className="text-sm ds-text-gray-600">Deposit:</span>
                        <span className="text-sm font-medium ds-text-gray-900">
                          {vehicleListing.pricing.deposit} {vehicleListing.pricing.currency}
                        </span>
                      </div>
                    )}
                    {vehicleListing.serviceOfferings.withDriver && (
                      <>
                        {vehicleListing.serviceOfferings.withDriverHourlyRate && (
                          <div className="flex justify-between border-t ds-border-gray-200 pt-2 mt-2">
                            <span className="text-sm ds-text-gray-600">Driver Hourly Rate:</span>
                            <span className="text-sm font-medium ds-text-gray-900">
                              +{vehicleListing.serviceOfferings.withDriverHourlyRate} {vehicleListing.pricing.currency}/hr
                            </span>
                          </div>
                        )}
                        {vehicleListing.serviceOfferings.withDriverDailyRate && (
                          <div className="flex justify-between">
                            <span className="text-sm ds-text-gray-600">Driver Daily Rate:</span>
                            <span className="text-sm font-medium ds-text-gray-900">
                              +{vehicleListing.serviceOfferings.withDriverDailyRate} {vehicleListing.pricing.currency}/day
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {!isVehicle && driverListing && (
                  <div className="space-y-2">
                    {driverListing.pricing.hourlyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm ds-text-gray-600">Hourly Rate:</span>
                        <span className="text-sm font-medium ds-text-gray-900">
                          {driverListing.pricing.hourlyRate} {driverListing.pricing.currency}/hr
                        </span>
                      </div>
                    )}
                    {driverListing.pricing.dailyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm ds-text-gray-600">Daily Rate:</span>
                        <span className="text-sm font-medium ds-text-gray-900">
                          {driverListing.pricing.dailyRate} {driverListing.pricing.currency}/day
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <UserStateGuard
                requireAuth={true}
                loadingMessage="Loading user data for booking..."
                fallback={
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    Log in to Book
                  </Button>
                }
              >
                {!showBookingForm ? (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => setShowBookingForm(true)}
                  >
                    Request Booking
                  </Button>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {/* Duration Type Selection - Show First */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-1">
                      Rental Type
                    </label>
                    <select
                      value={bookingData.durationType}
                      onChange={(e) => handleDurationTypeChange(e.target.value as 'hours' | 'days')}
                      className="w-full rounded-md ds-border-gray-300 shadow-sm focus:ds-border-primary-600 focus:ring-primary-600"
                    >
                      <option value="days">Daily Rental</option>
                      <option value="hours">Hourly Rental</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-md ds-border-gray-300 shadow-sm focus:ds-border-primary-600 focus:ring-primary-600"
                    />
                  </div>

                  {/* End Date - Only show for daily rentals */}
                  {bookingData.durationType === 'days' && (
                    <div>
                      <label className="block text-sm font-medium ds-text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={bookingData.endDate}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                        required
                        className="w-full rounded-md ds-border-gray-300 shadow-sm focus:ds-border-primary-600 focus:ring-primary-600"
                      />
                    </div>
                  )}

                  {/* Duration Input */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-1">
                      {bookingData.durationType === 'hours' ? 'Number of Hours' : 'Number of Days'}
                    </label>
                    <input
                      type="number"
                      value={bookingData.durationValue}
                      onChange={(e) => {
                        setBookingData((prev) => ({ ...prev, durationValue: Number(e.target.value) }));
                        setCostBreakdown(null); // Reset cost when duration changes
                      }}
                      min="1"
                      required
                      readOnly={bookingData.durationType === 'days' && !!bookingData.endDate}
                      className={`w-full rounded-md ds-border-gray-300 shadow-sm focus:ds-border-primary-600 focus:ring-primary-600 ${
                        bookingData.durationType === 'days' && bookingData.endDate ? 'ds-bg-gray-100' : ''
                      }`}
                      title={bookingData.durationType === 'days' && bookingData.endDate ? 'Automatically calculated from start and end dates' : ''}
                    />
                    {bookingData.durationType === 'days' && bookingData.endDate && (
                      <p className="mt-1 text-xs ds-text-gray-500">
                        Automatically calculated from selected dates
                      </p>
                    )}
                  </div>

                  {/* Driver Selection - Only show if vehicle offers both options */}
                  {isVehicle && vehicleListing && 
                   vehicleListing.serviceOfferings.withDriver && 
                   vehicleListing.serviceOfferings.withoutDriver && (
                    <div>
                      <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                        Service Type
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center p-3 border rounded-md cursor-pointer ds-hover-bg-page">
                          <input
                            type="radio"
                            name="includeDriver"
                            checked={!bookingData.includeDriver}
                            onChange={() => {
                              setBookingData((prev) => ({ ...prev, includeDriver: false }));
                              setCostBreakdown(null); // Reset cost when driver option changes
                            }}
                            className="h-4 w-4 ds-text-primary-600 focus:ring-primary-600 ds-border-gray-300"
                          />
                          <span className="ml-3 flex-1">
                            <span className="block text-sm font-medium ds-text-gray-900">
                              Without Driver
                            </span>
                            <span className="block text-xs ds-text-gray-500">
                              Self-drive rental
                            </span>
                          </span>
                        </label>
                        <label className="flex items-center p-3 border rounded-md cursor-pointer ds-hover-bg-page">
                          <input
                            type="radio"
                            name="includeDriver"
                            checked={bookingData.includeDriver}
                            onChange={() => {
                              setBookingData((prev) => ({ ...prev, includeDriver: true }));
                              setCostBreakdown(null); // Reset cost when driver option changes
                            }}
                            className="h-4 w-4 ds-text-primary-600 focus:ring-primary-600 ds-border-gray-300"
                          />
                          <span className="ml-3 flex-1">
                            <span className="block text-sm font-medium ds-text-gray-900">
                              With Driver
                            </span>
                            {bookingData.durationType === 'hours' && vehicleListing.serviceOfferings.withDriverHourlyRate && (
                              <span className="block text-xs ds-text-gray-500">
                                +{vehicleListing.serviceOfferings.withDriverHourlyRate} {vehicleListing.pricing.currency} per hour
                              </span>
                            )}
                            {bookingData.durationType === 'days' && vehicleListing.serviceOfferings.withDriverDailyRate && (
                              <span className="block text-xs ds-text-gray-500">
                                +{vehicleListing.serviceOfferings.withDriverDailyRate} {vehicleListing.pricing.currency} per day
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Availability Error */}
                  {availabilityError && (
                    <div className="rounded-md ds-bg-error-50 p-4 border ds-border-error">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 ds-text-error-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium ds-text-error-800">Availability Conflict</h3>
                          <p className="mt-1 text-sm ds-text-error-700">{availabilityError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    loading={calculatingCost}
                    onClick={calculateCosts}
                    disabled={
                      !bookingData.startDate || 
                      (bookingData.durationType === 'days' && !bookingData.endDate) ||
                      (bookingData.durationType === 'hours' && bookingData.durationValue < 1)
                    }
                  >
                    Calculate Cost
                  </Button>

                  {/* Cost Breakdown */}
                  {costBreakdown && (
                    <div className="border-t ds-border-gray-200 pt-4 space-y-2">
                      <h4 className="text-sm font-semibold ds-text-gray-900">Cost Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        {costBreakdown.vehicleRate !== undefined && (
                          <div className="flex justify-between">
                            <span className="ds-text-gray-600">Vehicle Rate:</span>
                            <span className="ds-text-gray-900">
                              {costBreakdown.vehicleRate.toFixed(2)} {costBreakdown.currency}
                            </span>
                          </div>
                        )}
                        {costBreakdown.driverRate !== undefined && costBreakdown.driverRate > 0 && (
                          <div className="flex justify-between">
                            <span className="ds-text-gray-600">Driver Rate:</span>
                            <span className="ds-text-gray-900">
                              {costBreakdown.driverRate.toFixed(2)} {costBreakdown.currency}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="ds-text-gray-600">Subtotal:</span>
                          <span className="ds-text-gray-900">
                            {costBreakdown.providerRate.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="ds-text-gray-600">
                            Platform Commission ({costBreakdown.platformCommissionRate}%):
                          </span>
                          <span className="ds-text-gray-900">
                            {costBreakdown.platformCommission.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="ds-text-gray-600">Taxes ({costBreakdown.taxRate}%):</span>
                          <span className="ds-text-gray-900">
                            {costBreakdown.taxes.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between border-t ds-border-gray-200 pt-2 font-semibold">
                          <span className="ds-text-gray-900">Total:</span>
                          <span className="ds-text-primary-600">
                            {costBreakdown.total.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setShowBookingForm(false);
                        setCostBreakdown(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={createBookingMutation.isPending || checkingAvailability}
                      disabled={!costBreakdown || checkingAvailability}
                      className="flex-1"
                    >
                      {checkingAvailability ? 'Checking Availability...' : 'Submit Request'}
                    </Button>
                  </div>
                  </form>
                )}
              </UserStateGuard>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
