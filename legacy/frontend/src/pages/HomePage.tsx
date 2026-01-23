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
  Button, 
  Card, 
  Container, 
  Grid, 
  Select, 
  Input
} from '../design-system/components';
import { 
  Search,
  Truck, 
  Users, 
  Shield,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

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
      const response = await apiClient.get<any>('/listings/search?sortBy=rating&sortOrder=desc&pageSize=6');
      return response;
    }
  });

  // Fetch trust indicators (verified companies count, total ratings)
  const { data: trustStats } = useQuery({
    queryKey: ['trustStats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/companies/stats');
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
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <Navbar />
      
      {/* Hero Section */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #2563EB, #1E40AF)' }} role="banner">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" aria-hidden="true" />
        <Container>
          <div className="relative py-24 sm:py-32">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                <span className="block">Vider</span>
                <span className="block text-3xl sm:text-4xl md:text-5xl mt-2" style={{ color: '#BFDBFE' }}>
                  Norwegian B2B Transport Marketplace
                </span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-xl" style={{ color: '#DBEAFE' }}>
                Connect transport companies across Norway. Rent vehicles and drivers, build trust through verified profiles, and grow your business with transparent pricing.
              </p>
              
              {/* Quick Search Bar */}
              <div className="mt-10 max-w-4xl mx-auto">
                <Card padding="lg">
                  <form onSubmit={handleQuickSearch} role="search" aria-label="Quick search for listings">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="listingType" className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                          What do you need?
                        </label>
                        <Select
                          id="listingType"
                          value={quickSearch.listingType}
                          onChange={(value) => setQuickSearch({ ...quickSearch, listingType: value })}
                          options={[
                            { value: '', label: 'All Types' },
                            { value: 'vehicle', label: 'Vehicle Only' },
                            { value: 'driver', label: 'Driver Only' },
                            { value: 'vehicle_driver', label: 'Vehicle + Driver' },
                          ]}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="fylke" className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                          Location (Fylke)
                        </label>
                        <Select
                          id="fylke"
                          value={quickSearch.fylke}
                          onChange={(value) => setQuickSearch({ ...quickSearch, fylke: value })}
                          options={[
                            { value: '', label: 'All Locations' },
                            ...FYLKER.map(fylke => ({ value: fylke, label: fylke }))
                          ]}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                          Start Date
                        </label>
                        <Input
                          type="date"
                          id="startDate"
                          value={quickSearch.startDate}
                          onChange={(value) => setQuickSearch({ ...quickSearch, startDate: value })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="endDate" className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                          End Date
                        </label>
                        <Input
                          type="date"
                          id="endDate"
                          value={quickSearch.endDate}
                          onChange={(value) => setQuickSearch({ ...quickSearch, endDate: value })}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        leftIcon={<Search size={20} />}
                        aria-label="Search for listings"
                      >
                        Search Listings
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Trust Indicators Section */}
      <section className="py-12" style={{ backgroundColor: '#F9FAFB' }} aria-label="Platform statistics">
        <Container>
          <h2 className="sr-only">Platform Trust Indicators</h2>
          <Grid columns={{ sm: 1, md: 4 }} gap={8}>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }} aria-hidden="true">
                <CheckCircle size={32} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#111827' }} aria-label={`${trustStats?.verifiedCompanies || '50+'} verified companies`}>
                {trustStats?.verifiedCompanies || '50+'}
              </div>
              <div className="text-sm mt-1" style={{ color: '#4B5563' }}>Verified Companies</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: '#D1FAE5', color: '#047857' }}>
                <Star size={32} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#111827' }}>
                {trustStats?.averageRating || '4.8'}/5
              </div>
              <div className="text-sm mt-1" style={{ color: '#4B5563' }}>Average Rating</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: '#E9D5FF', color: '#7C3AED' }}>
                <Truck size={32} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#111827' }}>
                {trustStats?.activeListings || '200+'}
              </div>
              <div className="text-sm mt-1" style={{ color: '#4B5563' }}>Active Listings</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full mb-4" style={{ backgroundColor: '#FED7AA', color: '#B45309' }}>
                <Shield size={32} />
              </div>
              <div className="text-3xl font-bold" style={{ color: '#111827' }}>
                {trustStats?.completedBookings || '1000+'}
              </div>
              <div className="text-sm mt-1" style={{ color: '#4B5563' }}>Completed Bookings</div>
            </div>
          </Grid>
        </Container>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16" style={{ backgroundColor: '#FFFFFF' }} aria-labelledby="featured-listings-heading">
        <Container>
          <div className="text-center mb-12">
            <h2 id="featured-listings-heading" className="text-3xl font-extrabold sm:text-4xl" style={{ color: '#111827' }}>
              Featured Listings
            </h2>
            <p className="mt-4 text-lg" style={{ color: '#4B5563' }}>
              Top-rated vehicles and drivers available for rent
            </p>
          </div>

          {featuredListings?.results && featuredListings.results.length > 0 ? (
            <div role="list">
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={8}>
              {featuredListings.results.map((listing: any) => (
                <Link
                  key={listing.id}
                  to={`/listings/${listing.type}/${listing.id}`}
                  className="group block"
                  role="listitem"
                  aria-label={`View ${listing.title || listing.name} listing`}
                >
                  <Card hoverable padding="sm">
                    {listing.photos && listing.photos.length > 0 ? (
                      <div className="h-48 overflow-hidden rounded-lg mb-4" style={{ backgroundColor: '#E5E7EB' }}>
                        <img
                          src={listing.photos[0]}
                          alt={listing.title || listing.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center rounded-lg mb-4" style={{ background: 'linear-gradient(to bottom right, #DBEAFE, #BFDBFE)' }}>
                        <Truck size={64} style={{ color: '#60A5FA' }} />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold group-hover:text-blue-600 transition-colors" style={{ color: '#111827' }}>
                          {listing.title || listing.name}
                        </h3>
                        {listing.verified && (
                          <CheckCircle size={24} style={{ color: '#2563EB' }} className="flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: '#4B5563' }}>
                        {listing.description || listing.backgroundSummary}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Star size={20} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                          <span className="ml-1 text-sm font-medium" style={{ color: '#111827' }}>
                            {listing.aggregatedRating?.toFixed(1) || 'New'}
                          </span>
                          {listing.totalRatings > 0 && (
                            <span className="ml-1 text-sm" style={{ color: '#6B7280' }}>
                              ({listing.totalRatings})
                            </span>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold" style={{ color: '#111827' }}>
                            {listing.pricing?.dailyRate 
                              ? `${listing.pricing.dailyRate} kr/day`
                              : listing.pricing?.hourlyRate
                              ? `${listing.pricing.hourlyRate} kr/hr`
                              : 'Contact for price'}
                          </div>
                        </div>
                      </div>
                      
                      {listing.location && (
                        <div className="mt-3 text-sm" style={{ color: '#6B7280' }}>
                          📍 {listing.location.city || listing.location.fylke}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </Grid>
            </div>
          ) : (
            <div className="text-center py-12">
              <Truck size={48} style={{ color: '#9CA3AF' }} className="mx-auto" />
              <p className="mt-4" style={{ color: '#4B5563' }}>No featured listings available at the moment.</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/search">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={20} />}>
                View All Listings
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* Call to Action Section */}
      <section style={{ backgroundColor: '#2563EB' }} aria-labelledby="cta-heading">
        <Container>
          <div className="py-16 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 id="cta-heading" className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to grow your transport business?
              </h2>
              <p className="mt-4 text-lg" style={{ color: '#DBEAFE' }}>
                Join Vider today and connect with transport companies across Norway. List your vehicles and drivers, or find the perfect rental for your next job.
              </p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <CheckCircle size={24} style={{ color: '#BFDBFE' }} className="flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Verified Companies</h3>
                    <p className="mt-1 text-sm" style={{ color: '#DBEAFE' }}>
                      All companies are verified with Norwegian organization numbers
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Shield size={24} style={{ color: '#BFDBFE' }} className="flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Secure Transactions</h3>
                    <p className="mt-1 text-sm" style={{ color: '#DBEAFE' }}>
                      Transparent pricing with automated invoicing and receipts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Star size={24} style={{ color: '#BFDBFE' }} className="flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">Rating System</h3>
                    <p className="mt-1 text-sm" style={{ color: '#DBEAFE' }}>
                      Build trust through verified reviews and ratings
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Users size={24} style={{ color: '#BFDBFE' }} className="flex-shrink-0 mt-1" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">B2B Network</h3>
                    <p className="mt-1 text-sm" style={{ color: '#DBEAFE' }}>
                      Connect with professional transport companies nationwide
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 lg:mt-0">
              <Card padding="lg">
                <h3 className="text-2xl font-bold mb-6" style={{ color: '#111827' }}>
                  Get Started Today
                </h3>
                
                <div className="space-y-4">
                  <Link to="/register">
                    <Button variant="primary" size="lg" fullWidth>
                      Create Company Account
                    </Button>
                  </Link>
                  
                  <Link to="/login">
                    <Button variant="outline" size="lg" fullWidth>
                      Sign In
                    </Button>
                  </Link>
                  
                  <Link to="/search" className="block text-center">
                    <Button variant="ghost" size="lg" fullWidth rightIcon={<ArrowRight size={20} />}>
                      Browse Listings
                    </Button>
                  </Link>
                </div>
                
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <p className="text-sm text-center" style={{ color: '#4B5563' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium" style={{ color: '#2563EB' }}>
                      Sign in here
                    </Link>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#1F2937' }} role="contentinfo">
        <Container>
          <div className="py-12 text-center" style={{ color: '#9CA3AF' }}>
            <p>&copy; {new Date().getFullYear()} Vider. All rights reserved.</p>
            <p className="mt-2 text-sm">Norwegian B2B Transport Marketplace</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
