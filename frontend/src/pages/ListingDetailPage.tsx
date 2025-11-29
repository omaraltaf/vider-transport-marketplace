/**
 * Listing Detail Page
 * Display detailed information about a listing and allow booking
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import type { VehicleListing, DriverListing, Company } from '../types';

interface ListingWithCompany extends VehicleListing {
  company: Company;
}

interface DriverListingWithCompany extends DriverListing {
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
  const { user, token } = useAuth();

  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    durationType: 'days' as 'hours' | 'days',
    durationValue: 1,
  });
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [calculatingCost, setCalculatingCost] = useState(false);

  // Fetch listing details
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', type, id],
    queryFn: async () => {
      if (type === 'vehicle') {
        return apiClient.get<ListingWithCompany>(`/listings/vehicles/${id}`);
      } else {
        return apiClient.get<DriverListingWithCompany>(`/listings/drivers/${id}`);
      }
    },
    enabled: !!type && !!id,
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
    if (!bookingData.startDate || !bookingData.endDate || !listing) {
      return;
    }

    setCalculatingCost(true);
    try {
      const duration = {
        [bookingData.durationType === 'hours' ? 'hours' : 'days']: bookingData.durationValue,
      };

      const response = await apiClient.post<CostBreakdown>(
        '/bookings/calculate-costs',
        {
          listingId: id,
          listingType: type,
          duration,
        },
        token || undefined
      );

      setCostBreakdown(response);
    } catch (err) {
      console.error('Error calculating costs:', err);
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !listing) {
      alert('You must be logged in to create a booking');
      return;
    }

    if (!bookingData.startDate || !bookingData.endDate) {
      alert('Please select start and end dates');
      return;
    }

    const bookingRequest = {
      renterCompanyId: user.companyId,
      providerCompanyId: (listing as any).companyId,
      [type === 'vehicle' ? 'vehicleListingId' : 'driverListingId']: id,
      startDate: new Date(bookingData.startDate).toISOString(),
      endDate: new Date(bookingData.endDate).toISOString(),
      [bookingData.durationType === 'hours' ? 'durationHours' : 'durationDays']: bookingData.durationValue,
    };

    createBookingMutation.mutate(bookingRequest);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));

    // Calculate duration when both dates are set
    if (field === 'endDate' && bookingData.startDate && value) {
      const start = new Date(bookingData.startDate);
      const end = new Date(value);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setBookingData(prev => ({ ...prev, durationValue: diffDays, durationType: 'days' }));
    } else if (field === 'startDate' && bookingData.endDate && value) {
      const start = new Date(value);
      const end = new Date(bookingData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setBookingData(prev => ({ ...prev, durationValue: diffDays, durationType: 'days' }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading listing</h3>
                <p className="mt-1 text-sm text-red-700">
                  {(error as Error)?.message || 'Listing not found'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isVehicle = type === 'vehicle';
  const vehicleListing = isVehicle ? (listing as ListingWithCompany) : null;
  const driverListing = !isVehicle ? (listing as DriverListingWithCompany) : null;
  const company = (listing as any).company;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to search
        </button>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            {isVehicle && vehicleListing && vehicleListing.photos.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={vehicleListing.photos[selectedPhoto]}
                    alt={vehicleListing.title}
                    className="w-full h-96 object-cover"
                  />
                </div>
                {vehicleListing.photos.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {vehicleListing.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedPhoto(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedPhoto === index ? 'border-indigo-600' : 'border-gray-200'
                        }`}
                      >
                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Listing Information */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isVehicle ? vehicleListing?.title : driverListing?.name}
                  </h1>
                  {isVehicle && vehicleListing && (
                    <p className="mt-1 text-sm text-gray-500">
                      {vehicleListing.location.city}, {vehicleListing.location.fylke}
                    </p>
                  )}
                </div>
                {((isVehicle && company?.verified) || (!isVehicle && driverListing?.verified)) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700">
                  {isVehicle ? vehicleListing?.description : driverListing?.backgroundSummary}
                </p>
              </div>

              {/* Vehicle Details */}
              {isVehicle && vehicleListing && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Vehicle Type</h3>
                    <p className="mt-1 text-sm text-gray-900">{vehicleListing.vehicleType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Capacity</h3>
                    <p className="mt-1 text-sm text-gray-900">{vehicleListing.capacity} pallets</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fuel Type</h3>
                    <p className="mt-1 text-sm text-gray-900">{vehicleListing.fuelType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Location</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {vehicleListing.location.kommune}, {vehicleListing.location.fylke}
                    </p>
                  </div>
                </div>
              )}

              {/* Driver Details */}
              {!isVehicle && driverListing && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">License Class</h3>
                    <p className="mt-1 text-sm text-gray-900">{driverListing.licenseClass}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Languages</h3>
                    <p className="mt-1 text-sm text-gray-900">{driverListing.languages.join(', ')}</p>
                  </div>
                </div>
              )}

              {/* Service Offerings */}
              {isVehicle && vehicleListing && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Service Offerings</h3>
                  <div className="flex gap-2">
                    {vehicleListing.serviceOfferings.withDriver && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        With Driver
                        {vehicleListing.serviceOfferings.withDriverCost && 
                          ` (+${vehicleListing.serviceOfferings.withDriverCost} ${vehicleListing.pricing.currency})`
                        }
                      </span>
                    )}
                    {vehicleListing.serviceOfferings.withoutDriver && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        Without Driver
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {isVehicle && vehicleListing && vehicleListing.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {vehicleListing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Provider Company Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Information</h2>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{company?.name}</h3>
                  {company?.description && (
                    <p className="mt-1 text-sm text-gray-500">{company.description}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {company?.city}, {company?.fylke}
                  </p>
                </div>
                {company?.verified && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verified Company
                  </span>
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
                  <span className="ml-2 text-sm text-gray-600">
                    {company.aggregatedRating.toFixed(1)} ({company.totalRatings} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            {ratings && ratings.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-6">
                  {ratings.slice(0, 5).map((rating) => (
                    <div key={rating.id} className="border-b border-gray-200 pb-6 last:border-0">
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
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              {rating.renterCompany.name}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-700">
                            {isVehicle ? rating.companyReview : rating.driverReview}
                          </p>
                          {rating.providerResponse && (
                            <div className="mt-3 pl-4 border-l-2 border-gray-200">
                              <p className="text-sm font-medium text-gray-900">Provider Response:</p>
                              <p className="mt-1 text-sm text-gray-700">{rating.providerResponse}</p>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Pricing and Booking */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing</h3>
                {isVehicle && vehicleListing && (
                  <div className="space-y-2">
                    {vehicleListing.pricing.hourlyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hourly Rate:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {vehicleListing.pricing.hourlyRate} {vehicleListing.pricing.currency}/hr
                        </span>
                      </div>
                    )}
                    {vehicleListing.pricing.dailyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Daily Rate:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {vehicleListing.pricing.dailyRate} {vehicleListing.pricing.currency}/day
                        </span>
                      </div>
                    )}
                    {vehicleListing.pricing.deposit && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Deposit:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {vehicleListing.pricing.deposit} {vehicleListing.pricing.currency}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {!isVehicle && driverListing && (
                  <div className="space-y-2">
                    {driverListing.pricing.hourlyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Hourly Rate:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {driverListing.pricing.hourlyRate} {driverListing.pricing.currency}/hr
                        </span>
                      </div>
                    )}
                    {driverListing.pricing.dailyRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Daily Rate:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {driverListing.pricing.dailyRate} {driverListing.pricing.currency}/day
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!showBookingForm ? (
                <button
                  onClick={() => {
                    if (!user) {
                      alert('Please log in to make a booking');
                      navigate('/login');
                      return;
                    }
                    setShowBookingForm(true);
                  }}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Request Booking
                </button>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.endDate}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={bookingData.durationValue}
                        onChange={(e) =>
                          setBookingData((prev) => ({ ...prev, durationValue: Number(e.target.value) }))
                        }
                        min="1"
                        required
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <select
                        value={bookingData.durationType}
                        onChange={(e) =>
                          setBookingData((prev) => ({
                            ...prev,
                            durationType: e.target.value as 'hours' | 'days',
                          }))
                        }
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={calculateCosts}
                    disabled={calculatingCost || !bookingData.startDate || !bookingData.endDate}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {calculatingCost ? 'Calculating...' : 'Calculate Cost'}
                  </button>

                  {/* Cost Breakdown */}
                  {costBreakdown && (
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900">Cost Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Provider Rate:</span>
                          <span className="text-gray-900">
                            {costBreakdown.providerRate.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Platform Commission ({costBreakdown.platformCommissionRate}%):
                          </span>
                          <span className="text-gray-900">
                            {costBreakdown.platformCommission.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxes ({costBreakdown.taxRate}%):</span>
                          <span className="text-gray-900">
                            {costBreakdown.taxes.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-indigo-600">
                            {costBreakdown.total.toFixed(2)} {costBreakdown.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingForm(false);
                        setCostBreakdown(null);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!costBreakdown || createBookingMutation.isPending}
                      className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {createBookingMutation.isPending ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
