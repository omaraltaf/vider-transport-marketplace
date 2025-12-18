/**
 * Vehicle Listings Page
 * Displays all vehicle listings for the company
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { tokenManager } from '../services/error-handling/TokenManager';
import { apiClient } from '../services/api';
import type { VehicleListing } from '../types';
import Navbar from '../components/Navbar';
import { Container, Card, Button, Badge, Spinner, Grid } from '../design-system/components';

export default function VehicleListingsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: listings, isLoading, error } = useQuery<VehicleListing[]>({
    queryKey: ['vehicleListings'],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<VehicleListing[]>('/listings/vehicles', validToken);
    },
    enabled: !!user,
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

  const formatPrice = (listing: VehicleListing) => {
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
            <h1 className="text-3xl font-bold ds-text-gray-900">Vehicle Listings</h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Manage your company's vehicle listings
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
              onClick={() => navigate('/listings/vehicles/new')}
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
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium ds-text-gray-900">No vehicle listings</h3>
            <p className="mt-1 text-sm ds-text-gray-500">Get started by creating a new vehicle listing.</p>
            <div className="mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/listings/vehicles/new')}
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
                onClick={() => navigate(`/listings/vehicles/${listing.id}`)}
                className="cursor-pointer"
              >
                {listing.photos.length > 0 ? (
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 ds-bg-gray-200 flex items-center justify-center">
                    <svg className="h-12 w-12 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium ds-text-gray-900 truncate flex-1">
                      {listing.title}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(listing.status)} className="ml-2">
                      {listing.status}
                    </Badge>
                  </div>
                  
                  <p className="mt-1 text-sm ds-text-gray-500 line-clamp-2">
                    {listing.description}
                  </p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm ds-text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {listing.location.city}, {listing.location.fylke}
                    </div>
                    
                    <div className="flex items-center text-sm ds-text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {listing.vehicleType} • {listing.capacity} pallets
                    </div>
                    
                    <div className="flex items-center text-sm font-medium ds-text-gray-900">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 ds-text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatPrice(listing)}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    {listing.serviceOfferings.withDriver && (
                      <Badge variant="info" size="sm">
                        With Driver
                      </Badge>
                    )}
                    {listing.serviceOfferings.withoutDriver && (
                      <Badge variant="default" size="sm">
                        Without Driver
                      </Badge>
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
