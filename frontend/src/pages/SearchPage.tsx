/**
 * Search Page
 * Search and filter vehicle and driver listings
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Search Listings</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalResults} {totalResults === 1 ? 'result' : 'results'} found
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filter Panel */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:col-span-1 mb-8 lg:mb-0`}>
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-6">
                {/* Listing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Listing Type
                  </label>
                  <select
                    value={filters.listingType || ''}
                    onChange={(e) => handleFilterChange('listingType', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">All Types</option>
                    <option value="vehicle">Vehicle Only</option>
                    <option value="driver">Driver Only</option>
                    <option value="vehicle_driver">Vehicle + Driver</option>
                  </select>
                </div>

                {/* Location - Fylke */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fylke (County)
                  </label>
                  <select
                    value={filters.fylke || ''}
                    onChange={(e) => handleFilterChange('fylke', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">All Fylker</option>
                    {FYLKER.map(fylke => (
                      <option key={fylke} value={fylke}>{fylke}</option>
                    ))}
                  </select>
                </div>

                {/* Location - Kommune */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kommune (Municipality)
                  </label>
                  <input
                    type="text"
                    value={filters.kommune || ''}
                    onChange={(e) => handleFilterChange('kommune', e.target.value)}
                    placeholder="Enter kommune name"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <div className="space-y-2">
                    {VEHICLE_TYPES.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.vehicleType?.includes(type.value) || false}
                          onChange={() => handleArrayFilterChange('vehicleType', type.value)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuel Type
                  </label>
                  <div className="space-y-2">
                    {FUEL_TYPES.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.fuelType?.includes(type.value) || false}
                          onChange={() => handleArrayFilterChange('fuelType', type.value)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Capacity Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacity (pallets)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minCapacity || ''}
                      onChange={(e) => handleFilterChange('minCapacity', e.target.value ? Number(e.target.value) : undefined)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxCapacity || ''}
                      onChange={(e) => handleFilterChange('maxCapacity', e.target.value ? Number(e.target.value) : undefined)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (NOK)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* With/Without Driver */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Option
                  </label>
                  <select
                    value={filters.withDriver === undefined ? '' : filters.withDriver ? 'true' : 'false'}
                    onChange={(e) => handleFilterChange('withDriver', e.target.value === '' ? undefined : e.target.value === 'true')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Any</option>
                    <option value="true">With Driver</option>
                    <option value="false">Without Driver</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features
                  </label>
                  <div className="space-y-2">
                    {TAGS.map(tag => (
                      <label key={tag} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.tags?.includes(tag) || false}
                          onChange={() => handleArrayFilterChange('tags', tag)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results Section */}
          <main className="lg:col-span-3">
            {/* Sorting Controls */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={filters.sortBy || 'price'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value="price">Price</option>
                    <option value="rating">Rating</option>
                    <option value="distance">Distance</option>
                  </select>
                  <select
                    value={filters.sortOrder || 'asc'}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-500">Searching...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading results</h3>
                    <p className="mt-1 text-sm text-red-700">{(error as Error).message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && totalResults === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}

            {/* Vehicle Listings */}
            {!isLoading && !error && results?.vehicleListings && results.vehicleListings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicle Listings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.vehicleListings.map((listing: any) => (
                    <a
                      key={listing.id}
                      href={`/listings/vehicle/${listing.id}`}
                      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow block"
                    >
                      {listing.photos && listing.photos.length > 0 ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-start justify-between">
                          <h3 className="text-lg font-medium text-gray-900 truncate flex-1">
                            {listing.title}
                          </h3>
                          {listing.company?.verified && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Verified
                            </span>
                          )}
                        </div>
                        
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {listing.description}
                        </p>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {listing.city}, {listing.fylke}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {listing.vehicleType} • {listing.capacity} pallets • {listing.fuelType}
                          </div>
                          
                          <div className="flex items-center text-sm font-medium text-gray-900">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatPrice(listing)}
                          </div>

                          {listing.company?.aggregatedRating && (
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {listing.company.aggregatedRating.toFixed(1)} ({listing.company.name})
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex gap-2 flex-wrap">
                          {listing.withDriver && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              With Driver
                            </span>
                          )}
                          {listing.withoutDriver && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Without Driver
                            </span>
                          )}
                          {listing.tags && listing.tags.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}



            {/* Pagination */}
            {!isLoading && !error && totalPages > 1 && (
              <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
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
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
