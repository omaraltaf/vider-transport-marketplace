/**
 * Search Page
 * Search and filter vehicle and driver listings
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { Button, Card, Grid, Badge, Icon, Spinner, Select, Input, Container, Stack } from '../design-system/components';
import { MapPin, Check, Star, Filter as FilterIcon, X } from 'lucide-react';

// Norwegian Fylker (Counties)
const FYLKER = [
  'Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland',
  'Troms og Finnmark', 'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'
];

const VEHICLE_TYPES = [
  { value: 'PALLET_8', label: '8-pallet' },
  { value: 'PALLET_18', label: '18-pallet' },
  { value: 'PALLET_21', label: '21-pallet' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'OTHER', label: 'Other' },
];

const FUEL_TYPES = [
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'BIOGAS', label: 'Biogas' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'GAS', label: 'Gas' },
];

const TAGS = [
  'tail-lift', 'refrigerated', 'ADR-certified', 'GPS-tracked', 'temperature-controlled'
];

interface SearchFilters {
  listingType?: string;
  fylke?: string;
  kommune?: string;
  vehicleType?: string[];
  fuelType?: string[];
  minCapacity?: number;
  maxCapacity?: number;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  withDriver?: boolean;
  tags?: string[];
  page?: number;
  sortBy?: string;
  sortOrder?: string;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>({
    listingType: searchParams.get('listingType') || '',
    fylke: searchParams.get('fylke') || '',
    kommune: searchParams.get('kommune') || '',
    vehicleType: searchParams.getAll('vehicleType'),
    fuelType: searchParams.getAll('fuelType'),
    minCapacity: searchParams.get('minCapacity') ? Number(searchParams.get('minCapacity')) : undefined,
    maxCapacity: searchParams.get('maxCapacity') ? Number(searchParams.get('maxCapacity')) : undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    withDriver: searchParams.get('withDriver') === 'true' ? true : searchParams.get('withDriver') === 'false' ? false : undefined,
    tags: searchParams.getAll('tags'),
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    sortBy: searchParams.get('sortBy') || 'price',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  // Build query string from filters
  const buildQueryString = (currentFilters: SearchFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    return params.toString();
  };

  // Fetch search results
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['searchListings', filters],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      return apiClient.get<any>(`/listings/search?${queryString}`);
    },
  });

  // Update URL when filters change
  useEffect(() => {
    const queryString = buildQueryString(filters);
    setSearchParams(queryString);
  }, [filters, setSearchParams]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleArrayFilterChange = (key: 'vehicleType' | 'fuelType' | 'tags', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray, page: 1 };
    });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      sortBy: 'price',
      sortOrder: 'asc',
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (listing: any) => {
    const parts = [];
    if (listing.hourlyRate) {
      parts.push(`${listing.hourlyRate} ${listing.currency || 'NOK'}/hr`);
    }
    if (listing.dailyRate) {
      parts.push(`${listing.dailyRate} ${listing.currency || 'NOK'}/day`);
    }
    return parts.join(' • ');
  };

  const totalResults = results?.total || 0;
  const totalPages = results?.totalPages || 0;
  const currentPage = filters.page || 1;

  return (
    <div className="min-h-screen ds-bg-page">
      <Navbar />
      
      <Container>
        <Stack spacing={6} style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold ds-text-gray-900">Search Listings</h1>
              <p className="mt-1 text-sm ds-text-gray-500">
                {totalResults} {totalResults === 1 ? 'result' : 'results'} found
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Icon icon={showFilters ? X : FilterIcon} size="sm" />}
              className="lg:hidden"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>

          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Filter Panel */}
            <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:col-span-1 mb-8 lg:mb-0`}>
              <Card padding="lg" className="sticky top-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold ds-text-gray-900">Filters</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear all
                  </Button>
                </div>

                <Stack spacing={6}>
                  {/* Listing Type */}
                  <Select
                    label="Listing Type"
                    value={filters.listingType || ''}
                    onChange={(value) => handleFilterChange('listingType', value)}
                    options={[
                      { value: '', label: 'All Types' },
                      { value: 'vehicle', label: 'Vehicle Only' },
                      { value: 'driver', label: 'Driver Only' },
                      { value: 'vehicle_driver', label: 'Vehicle + Driver' },
                    ]}
                  />

                  {/* Location - Fylke */}
                  <Select
                    label="Fylke (County)"
                    value={filters.fylke || ''}
                    onChange={(value) => handleFilterChange('fylke', value)}
                    options={[
                      { value: '', label: 'All Fylker' },
                      ...FYLKER.map(fylke => ({ value: fylke, label: fylke })),
                    ]}
                  />

                  {/* Location - Kommune */}
                  <Input
                    label="Kommune (Municipality)"
                    type="text"
                    value={filters.kommune || ''}
                    onChange={(value) => handleFilterChange('kommune', value)}
                    placeholder="Enter kommune name"
                  />

                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <div className="space-y-2">
                    {VEHICLE_TYPES.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.vehicleType?.includes(type.value) || false}
                          onChange={() => handleArrayFilterChange('vehicleType', type.value)}
                          className="rounded ds-border-gray-300 ds-text-primary-600 focus:ring-primary-600"
                        />
                        <span className="ml-2 text-sm ds-text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                    Fuel Type
                  </label>
                  <div className="space-y-2">
                    {FUEL_TYPES.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.fuelType?.includes(type.value) || false}
                          onChange={() => handleArrayFilterChange('fuelType', type.value)}
                          className="rounded ds-border-gray-300 ds-text-primary-600 focus:ring-primary-600"
                        />
                        <span className="ml-2 text-sm ds-text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                  {/* Capacity Range */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Capacity (pallets)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minCapacity?.toString() || ''}
                        onChange={(value) => handleFilterChange('minCapacity', value ? Number(value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxCapacity?.toString() || ''}
                        onChange={(value) => handleFilterChange('maxCapacity', value ? Number(value) : undefined)}
                      />
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Price Range (NOK)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice?.toString() || ''}
                        onChange={(value) => handleFilterChange('minPrice', value ? Number(value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice?.toString() || ''}
                        onChange={(value) => handleFilterChange('maxPrice', value ? Number(value) : undefined)}
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Availability
                    </label>
                    <Stack spacing={2}>
                      <Input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(value) => handleFilterChange('startDate', value)}
                      />
                      <Input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(value) => handleFilterChange('endDate', value)}
                      />
                    </Stack>
                  </div>

                  {/* With/Without Driver */}
                  <Select
                    label="Driver Option"
                    value={filters.withDriver === undefined ? '' : filters.withDriver ? 'true' : 'false'}
                    onChange={(value) => handleFilterChange('withDriver', value === '' ? undefined : value === 'true')}
                    options={[
                      { value: '', label: 'Any' },
                      { value: 'true', label: 'With Driver' },
                      { value: 'false', label: 'Without Driver' },
                    ]}
                  />

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium ds-text-gray-700 mb-2">
                      Features
                    </label>
                    <div className="space-y-2">
                      {TAGS.map(tag => (
                        <label key={tag} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.tags?.includes(tag) || false}
                            onChange={() => handleArrayFilterChange('tags', tag)}
                            className="rounded ds-border-gray-300 ds-text-primary-600 focus:ring-primary-600"
                          />
                          <span className="ml-2 text-sm ds-text-gray-700 capitalize">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </Stack>
              </Card>
            </aside>

            {/* Results Section */}
            <main className="lg:col-span-3">
              {/* Sorting Controls */}
              <Card padding="md" className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="text-sm font-medium ds-text-gray-700">Sort by:</label>
                    <div className="flex gap-2">
                      <Select
                        value={filters.sortBy || 'price'}
                        onChange={(value) => handleFilterChange('sortBy', value)}
                        options={[
                          { value: 'price', label: 'Price' },
                          { value: 'rating', label: 'Rating' },
                          { value: 'distance', label: 'Distance' },
                        ]}
                      />
                      <Select
                        value={filters.sortOrder || 'asc'}
                        onChange={(value) => handleFilterChange('sortOrder', value)}
                        options={[
                          { value: 'asc', label: 'Ascending' },
                          { value: 'desc', label: 'Descending' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Loading State */}
              {isLoading && (
                <Card padding="lg">
                  <div className="text-center py-12">
                    <Spinner size="lg" />
                    <p className="mt-4 text-sm ds-text-gray-500">Searching...</p>
                  </div>
                </Card>
              )}

              {/* Error State */}
              {error && (
                <Card padding="lg">
                  <div className="rounded-md ds-bg-error-light p-4 border ds-border-error">
                    <div className="flex items-start">
                      <Icon icon={X} size="md" color="#DC2626" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium ds-text-error">Error loading results</h3>
                        <p className="mt-1 text-sm ds-text-error">{(error as Error).message}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* No Results */}
              {!isLoading && !error && totalResults === 0 && (
                <Card padding="lg">
                  <div className="text-center py-12">
                    <Icon name="search" size="xl" color="#9CA3AF" />
                    <h3 className="mt-4 text-sm font-medium ds-text-gray-900">No results found</h3>
                    <p className="mt-2 text-sm ds-text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                  </div>
                </Card>
              )}

              {/* Vehicle Listings */}
              {!isLoading && !error && results?.vehicleListings && results.vehicleListings.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">Vehicle Listings</h2>
                  <Grid columns={{ md: 2 }} gap={6}>
                    {results.vehicleListings.map((listing: any) => (
                      <a
                        key={listing.id}
                        href={`/listings/vehicle/${listing.id}`}
                        className="block"
                      >
                        <Card hoverable padding="sm" className="h-full">
                          {listing.photos && listing.photos.length > 0 ? (
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
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-lg font-medium ds-text-gray-900 truncate flex-1">
                                {listing.title}
                              </h3>
                              {listing.company?.verified && (
                                <Badge variant="success" size="sm">
                                  <Icon icon={Check} size="sm" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                          
                            <p className="mt-1 text-sm ds-text-gray-500 line-clamp-2">
                              {listing.description}
                            </p>
                          
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center text-sm ds-text-gray-500">
                                <Icon icon={MapPin} size="sm" color="#9CA3AF" />
                                <span className="ml-1.5">{listing.city}, {listing.fylke}</span>
                              </div>
                              
                              <div className="flex items-center text-sm ds-text-gray-500">
                                <Icon name="check" size="sm" color="#9CA3AF" />
                                <span className="ml-1.5">{listing.vehicleType} • {listing.capacity} pallets • {listing.fuelType}</span>
                              </div>
                              
                              <div className="flex items-center text-sm font-medium ds-text-gray-900">
                                <span className="text-lg font-semibold">{formatPrice(listing)}</span>
                              </div>

                              {listing.company?.aggregatedRating && (
                                <div className="flex items-center text-sm ds-text-gray-500">
                                  <Icon icon={Star} size="sm" color="#FBBF24" />
                                  <span className="ml-1.5">{listing.company.aggregatedRating.toFixed(1)} ({listing.company.name})</span>
                                </div>
                              )}
                            </div>
                          
                            <div className="mt-4 flex gap-2 flex-wrap">
                              {/* Show availability status if date filters are applied */}
                              {filters.startDate && filters.endDate && (
                                <Badge variant="success" size="sm">
                                  <Icon icon={Check} size="sm" />
                                  Available {filters.startDate} - {filters.endDate}
                                </Badge>
                              )}
                              {listing.withDriver && (
                                <Badge variant="info" size="sm">With Driver</Badge>
                              )}
                              {listing.withoutDriver && (
                                <Badge variant="neutral" size="sm">Without Driver</Badge>
                              )}
                              {listing.tags && listing.tags.slice(0, 2).map((tag: string) => (
                                <Badge key={tag} variant="neutral" size="sm">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      </a>
                    ))}
                  </Grid>
                </div>
              )}



              {/* Pagination */}
              {!isLoading && !error && totalPages > 1 && (
                <Card padding="md">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm ds-text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="hidden sm:flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </main>
          </div>
        </Stack>
      </Container>
    </div>
  );
}
