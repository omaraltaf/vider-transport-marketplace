/**
 * Home Page - Landing Page
 * Landing page for the Vider platform with hero, search, featured listings, and trust indicators
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import Navbar from '../components/Navbar';
import { 
  MagnifyingGlassIcon, 
  TruckIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  StarIcon,
  CheckBadgeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

// Norwegian Fylker (Counties)
const FYLKER = [
  'Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland',
  'Troms og Finnmark', 'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'
];

export default function HomePage() {
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState({
    listingType: '',
    fylke: '',
    startDate: '',
    endDate: ''
  });

  // Fetch featured listings (top-rated, active listings)
  const { data: featuredListings } = useQuery({
    queryKey: ['featuredListings'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/api/listings/search?sortBy=rating&sortOrder=desc&pageSize=6');
      return response;
    }
  });

  // Fetch trust indicators (verified companies count, total ratings)
  const { data: trustStats } = useQuery({
    queryKey: ['trustStats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/api/companies/stats');
      return response;
    }
  });

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (quickSearch.listingType) params.append('listingType', quickSearch.listingType);
    if (quickSearch.fylke) params.append('fylke', quickSearch.fylke);
    if (quickSearch.startDate) params.append('startDate', quickSearch.startDate);
    if (quickSearch.endDate) params.append('endDate', quickSearch.endDate);
    
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <header className="relative bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden" role="banner">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="block">Vider</span>
              <span className="block text-blue-200 text-3xl sm:text-4xl md:text-5xl mt-2">
                Norwegian B2B Transport Marketplace
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-blue-100">
              Connect transport companies across Norway. Rent vehicles and drivers, build trust through verified profiles, and grow your business with transparent pricing.
            </p>
            
            {/* Quick Search Bar */}
            <div className="mt-10 max-w-4xl mx-auto">
              <form onSubmit={handleQuickSearch} className="bg-white rounded-lg shadow-xl p-4 sm:p-6" role="search" aria-label="Quick search for listings">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="listingType" className="block text-sm font-medium text-gray-700 mb-1">
                      What do you need?
                    </label>
                    <select
                      id="listingType"
                      value={quickSearch.listingType}
                      onChange={(e) => setQuickSearch({ ...quickSearch, listingType: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="vehicle">Vehicle Only</option>
                      <option value="driver">Driver Only</option>
                      <option value="vehicle_driver">Vehicle + Driver</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="fylke" className="block text-sm font-medium text-gray-700 mb-1">
                      Location (Fylke)
                    </label>
                    <select
                      id="fylke"
                      value={quickSearch.fylke}
                      onChange={(e) => setQuickSearch({ ...quickSearch, fylke: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">All Locations</option>
                      {FYLKER.map(fylke => (
                        <option key={fylke} value={fylke}>{fylke}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={quickSearch.startDate}
                      onChange={(e) => setQuickSearch({ ...quickSearch, startDate: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={quickSearch.endDate}
                      onChange={(e) => setQuickSearch({ ...quickSearch, endDate: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <button
                    type="submit"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg"
                    aria-label="Search for listings"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                    Search Listings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Indicators Section */}
      <section className="bg-gray-50 py-12" aria-label="Platform statistics">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="sr-only">Platform Trust Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mb-4" aria-hidden="true">
                <CheckBadgeIcon className="h-8 w-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900" aria-label={`${trustStats?.verifiedCompanies || '50+'} verified companies`}>
                {trustStats?.verifiedCompanies || '50+'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Verified Companies</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
                <StarIcon className="h-8 w-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {trustStats?.averageRating || '4.8'}/5
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Rating</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                <TruckIcon className="h-8 w-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {trustStats?.activeListings || '200+'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Active Listings</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 text-orange-600 mb-4">
                <ShieldCheckIcon className="h-8 w-8" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {trustStats?.completedBookings || '1000+'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Completed Bookings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16 bg-white" aria-labelledby="featured-listings-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="featured-listings-heading" className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Featured Listings
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Top-rated vehicles and drivers available for rent
            </p>
          </div>

          {featuredListings?.results && featuredListings.results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" role="list">
              {featuredListings.results.map((listing: any) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.type}/${listing.id}`}
                  className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200"
                  role="listitem"
                  aria-label={`View ${listing.title || listing.name} listing`}
                >
                  {listing.photos && listing.photos.length > 0 ? (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={listing.photos[0]}
                        alt={listing.title || listing.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <TruckIcon className="h-16 w-16 text-blue-400" />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {listing.title || listing.name}
                      </h3>
                      {listing.verified && (
                        <CheckBadgeIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {listing.description || listing.backgroundSummary}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-medium text-gray-900">
                          {listing.aggregatedRating?.toFixed(1) || 'New'}
                        </span>
                        {listing.totalRatings > 0 && (
                          <span className="ml-1 text-sm text-gray-500">
                            ({listing.totalRatings})
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {listing.pricing?.dailyRate 
                            ? `${listing.pricing.dailyRate} kr/day`
                            : listing.pricing?.hourlyRate
                            ? `${listing.pricing.hourlyRate} kr/hr`
                            : 'Contact for price'}
                        </div>
                      </div>
                    </div>
                    
                    {listing.location && (
                      <div className="mt-3 text-sm text-gray-500">
                        📍 {listing.location.city || listing.location.fylke}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">No featured listings available at the moment.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/search"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View All Listings
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-blue-600" aria-labelledby="cta-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 id="cta-heading" className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to grow your transport business?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Join Vider today and connect with transport companies across Norway. List your vehicles and drivers, or find the perfect rental for your next job.
              </p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <CheckBadgeIcon className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Verified Companies</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      All companies are verified with Norwegian organization numbers
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Secure Transactions</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      Transparent pricing with automated invoicing and receipts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <StarIcon className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Rating System</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      Build trust through verified reviews and ratings
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <UserGroupIcon className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">B2B Network</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      Connect with professional transport companies nationwide
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 lg:mt-0">
              <div className="bg-white rounded-lg shadow-xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Get Started Today
                </h3>
                
                <div className="space-y-4">
                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Company Account
                  </Link>
                  
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign In
                  </Link>
                  
                  <Link
                    to="/search"
                    className="w-full flex items-center justify-center px-6 py-3 text-base font-medium text-blue-600 hover:text-blue-700"
                  >
                    Browse Listings →
                  </Link>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Vider. All rights reserved.</p>
            <p className="mt-2 text-sm">Norwegian B2B Transport Marketplace</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
