/**
 * Driver Listings Page
 * Displays all driver listings for the company
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/EnhancedAuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { DriverListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, Badge, Spinner, Grid } from '../design-system/components';

export default function DriverListingsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: listings, isLoading, error } = useQuery<DriverListing[]>({
    queryKey: ['driverListings'],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<DriverListing[]>('/listings/drivers', validToken);
    },
    enabled: !!token,
  });

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'warning';
      case 'REMOVED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatPrice = (listing: DriverListing) => {
    const parts = [];
    if (listing.pricing.hourlyRate) {
      parts.push(`${listing.pricing.hourlyRate} ${listing.pricing.currency}/hr`);
    }
    if (listing.pricing.dailyRate) {
      parts.push(`${listing.pricing.dailyRate} ${listing.pricing.currency}/day`);
    }
    return parts.join(' • ');
  };

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container maxWidth="7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold ds-text-gray-900">Driver Listings</h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Manage your company's driver listings
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/listings/bulk-calendar')}
              leftIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            >
              Bulk Calendar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/listings/drivers/new')}
              leftIcon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Create Listing
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <Spinner size="lg" />
            <p className="mt-2 text-sm ds-text-gray-500">Loading listings...</p>
          </div>
        )}

        {error && (
          <div className="rounded-md ds-bg-error-light p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 ds-text-error" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium ds-text-error">Error loading listings</h3>
                <p className="mt-1 text-sm ds-text-error">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && listings && listings.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 ds-text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium ds-text-gray-900">No driver listings</h3>
            <p className="mt-1 text-sm ds-text-gray-500">Get started by creating a new driver listing.</p>
            <div className="mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/listings/drivers/new')}
                leftIcon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Create Listing
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && listings && listings.length > 0 && (
          <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap="lg">
            {listings.map((listing) => (
              <Card
                key={listing.id}
                variant="elevated"
                padding="none"
                hoverable
                onClick={() => navigate(`/listings/drivers/${listing.id}`)}
                className="cursor-pointer"
              >
                <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="h-20 w-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium ds-text-gray-900 truncate flex-1">
                      {listing.name}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(listing.status)} className="ml-2">
                      {listing.status}
                    </Badge>
                  </div>
                  
                  {listing.verified && (
                    <Badge variant="success" size="sm" className="mt-2">
                      <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </Badge>
                  )}
                  
                  {listing.backgroundSummary && (
                    <p className="mt-2 text-sm ds-text-gray-500 line-clamp-2">
                      {listing.backgroundSummary}
                    </p>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm ds-text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      License: {listing.licenseClass}
                    </div>
                    
                    {listing.languages.length > 0 && (
                      <div className="flex items-center text-sm ds-text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        {listing.languages.slice(0, 2).join(', ')}
                        {listing.languages.length > 2 && ` +${listing.languages.length - 2}`}
                      </div>
                    )}
                    
                    {(listing.pricing.hourlyRate || listing.pricing.dailyRate) && (
                      <div className="flex items-center text-sm font-medium ds-text-gray-900">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatPrice(listing)}
                      </div>
                    )}
                    
                    {listing.aggregatedRating && listing.totalRatings > 0 && (
                      <div className="flex items-center text-sm ds-text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {listing.aggregatedRating.toFixed(1)} ({listing.totalRatings} {listing.totalRatings === 1 ? 'review' : 'reviews'})
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Container>
    </div>
  );
}
