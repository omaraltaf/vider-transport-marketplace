/**
 * Property-Based Test: Search Filter Matching
 * **Feature: listing-search-fix, Property 1: Search filter matching**
 * **Validates: Requirements 1.1**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, VehicleType, ListingStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app';

const prisma = new PrismaClient();
const app = createApp();

describe('Property 1: Search filter matching', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * For any search filter combination, returned results should match
   * the specified criteria exactly
   */
  it('should return only listings that match location filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger'),
        async (city: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ fylke: city })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];
            
            // All returned listings should match the city filter
            for (const listing of allListings) {
              // For vehicle listings, check fylke directly
              if (listing.fylke && listing.fylke !== city) {
                return false;
              }
              // For driver listings, check company fylke
              if (listing.company && listing.company.fylke && listing.company.fylke !== city) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Location filter test failed for city ${city}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * For any vehicle type filter, only listings of that type should be returned
   */
  it('should return only listings that match vehicle type filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('PALLET_8', 'PALLET_18', 'PALLET_21', 'TRAILER'),
        async (vehicleType: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ vehicleType })
              .expect(200);

            const { vehicleListings } = response.body;
            
            // All returned vehicle listings should match the vehicle type filter
            for (const listing of vehicleListings || []) {
              if (listing.vehicleType && listing.vehicleType !== vehicleType) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Vehicle type filter test failed for type ${vehicleType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * For any price range filter, only listings within that range should be returned
   */
  it('should return only listings that match price range filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 5000 }),
        fc.integer({ min: 5001, max: 10000 }),
        async (minPrice: number, maxPrice: number) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ minPrice, maxPrice })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];
            
            // All returned listings should have prices within the range
            for (const listing of allListings) {
              let price = 0;
              
              // Get the relevant price (daily rate preferred, then hourly)
              if (listing.dailyRate) {
                price = listing.dailyRate;
              } else if (listing.hourlyRate) {
                price = listing.hourlyRate;
              }
              
              if (price > 0 && (price < minPrice || price > maxPrice)) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Price range filter test failed for range ${minPrice}-${maxPrice}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any listing type filter, only listings of that type should be returned
   */
  it('should return only listings that match listing type filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('vehicle', 'driver'),
        async (listingType: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ listingType })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            
            // All returned listings should match the listing type
            if (listingType === 'vehicle') {
              // Should have vehicle listings but no driver listings
              if (driverListings && driverListings.length > 0) {
                return false;
              }
              // Vehicle listings should have vehicle-specific fields
              for (const listing of vehicleListings || []) {
                if (!listing.vehicleType || !listing.capacity) {
                  return false;
                }
              }
            } else if (listingType === 'driver') {
              // Should have driver listings but no vehicle listings
              if (vehicleListings && vehicleListings.length > 0) {
                return false;
              }
              // Driver listings should have driver-specific fields
              for (const listing of driverListings || []) {
                if (!listing.licenseClass || !listing.languages) {
                  return false;
                }
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Listing type filter test failed for type ${listingType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any combination of filters, results should match ALL specified criteria
   */
  it('should return listings that match multiple filter combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fylke: fc.constantFrom('Oslo', 'Bergen', 'Trondheim'),
          vehicleType: fc.constantFrom('PALLET_8', 'PALLET_18', 'PALLET_21'),
          minPrice: fc.integer({ min: 1000, max: 4000 }),
          maxPrice: fc.integer({ min: 4001, max: 8000 })
        }),
        async (filters) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(filters)
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];
            
            // All returned listings should match ALL filters
            for (const listing of allListings) {
              // Check fylke filter
              if (listing.fylke && listing.fylke !== filters.fylke) {
                return false;
              }
              if (listing.company && listing.company.fylke && listing.company.fylke !== filters.fylke) {
                return false;
              }
              
              // Check vehicle type filter (only for vehicle listings)
              if (listing.vehicleType && listing.vehicleType !== filters.vehicleType) {
                return false;
              }
              
              // Check price range filter
              let price = listing.dailyRate || listing.hourlyRate || 0;
              if (price > 0 && (price < filters.minPrice || price > filters.maxPrice)) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Multiple filter test failed for filters:`, filters, error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search without filters, all active listings should be returned
   */
  it('should return all active listings when no filters are applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(true), // Just a placeholder to run the test
        async () => {
          try {
            // Get all active listings from database
            const [vehicleListings, driverListings] = await Promise.all([
              prisma.vehicleListing.findMany({
                where: { status: ListingStatus.ACTIVE },
                include: { company: true }
              }),
              prisma.driverListing.findMany({
                where: { status: ListingStatus.ACTIVE, verified: true },
                include: { company: true }
              })
            ]);
            
            const totalActiveListings = vehicleListings.length + driverListings.length;
            
            // Get search results without filters
            const response = await request(app)
              .get('/api/listings/search')
              .expect(200);

            const { total } = response.body;
            
            // Should return all active listings
            if (total !== totalActiveListings) {
              return false;
            }
            
            // All returned listings should be active
            const allListings = [...(response.body.vehicleListings || []), ...(response.body.driverListings || [])];
            for (const listing of allListings) {
              if (listing.status !== 'ACTIVE') {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error('No filter test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * For any search query, pagination should work correctly
   */
  it('should handle pagination correctly with filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          page: fc.integer({ min: 1, max: 3 }),
          pageSize: fc.integer({ min: 1, max: 10 }),
          fylke: fc.option(fc.constantFrom('Oslo', 'Bergen', 'Trondheim'), { nil: undefined })
        }),
        async (params) => {
          try {
            const queryParams: any = {
              page: params.page,
              pageSize: params.pageSize
            };
            
            if (params.fylke) {
              queryParams.fylke = params.fylke;
            }
            
            const response = await request(app)
              .get('/api/listings/search')
              .query(queryParams)
              .expect(200);

            const { vehicleListings, driverListings, page, pageSize, totalPages } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];
            
            // Check pagination metadata
            if (page !== params.page) {
              return false;
            }
            
            if (pageSize !== params.pageSize) {
              return false;
            }
            
            // Results should not exceed pageSize
            if (allListings.length > params.pageSize) {
              return false;
            }
            
            // If there are more results than pageSize, should have multiple pages
            if (response.body.total > params.pageSize && totalPages <= 1) {
              return false;
            }
            
            return true;
          } catch (error) {
            console.error('Pagination test failed for params:', params, error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search with sorting, results should be ordered correctly
   */
  it('should sort results correctly when sort parameter is specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('price_asc', 'price_desc', 'rating_desc', 'created_desc'),
        async (sortBy: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ sortBy, pageSize: 10 })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];
            
            if (allListings.length < 2) {
              return true; // Can't test sorting with less than 2 items
            }
            
            // Check if results are sorted correctly
            for (let i = 0; i < allListings.length - 1; i++) {
              const current = allListings[i];
              const next = allListings[i + 1];
              
              switch (sortBy) {
                case 'price_asc':
                  const currentPrice = current.dailyRate || current.hourlyRate || 0;
                  const nextPrice = next.dailyRate || next.hourlyRate || 0;
                  if (currentPrice > nextPrice) {
                    return false;
                  }
                  break;
                  
                case 'price_desc':
                  const currentPriceDesc = current.dailyRate || current.hourlyRate || 0;
                  const nextPriceDesc = next.dailyRate || next.hourlyRate || 0;
                  if (currentPriceDesc < nextPriceDesc) {
                    return false;
                  }
                  break;
                  
                case 'rating_desc':
                  const currentRating = current.aggregatedRating || 0;
                  const nextRating = next.aggregatedRating || 0;
                  if (currentRating < nextRating) {
                    return false;
                  }
                  break;
                  
                case 'created_desc':
                  const currentDate = new Date(current.createdAt);
                  const nextDate = new Date(next.createdAt);
                  if (currentDate < nextDate) {
                    return false;
                  }
                  break;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Sorting test failed for sortBy ${sortBy}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});