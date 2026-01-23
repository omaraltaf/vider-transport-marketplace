/**
 * Property-Based Test: Database Content Visibility
 * **Feature: listing-search-fix, Property 2: Database content visibility**
 * **Validates: Requirements 1.2**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, ListingStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app';

const prisma = new PrismaClient();
const app = createApp();

describe('Property 2: Database content visibility', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * For any database state, search results should only include active listings
   * that exist in the database and meet visibility criteria
   */
  it('should only return active listings that exist in the database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('vehicle', 'driver', 'vehicle_driver'),
        async (listingType: string) => {
          try {
            // Get search results from API
            const response = await request(app)
              .get('/api/listings/search')
              .query({ listingType })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Verify each returned listing exists in database and is active
            for (const listing of allListings) {
              let dbListing = null;
              
              if (listing.vehicleType) {
                // This is a vehicle listing
                dbListing = await prisma.vehicleListing.findUnique({
                  where: { id: listing.id }
                });
              } else if (listing.licenseClass) {
                // This is a driver listing
                dbListing = await prisma.driverListing.findUnique({
                  where: { id: listing.id }
                });
              }
              
              // Listing must exist in database
              if (!dbListing) {
                return false;
              }
              
              // Listing must be active
              if (dbListing.status !== ListingStatus.ACTIVE) {
                return false;
              }
              
              // For driver listings, must be verified
              if (listing.licenseClass && !dbListing.verified) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`Database visibility test failed for listingType ${listingType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * For any search query, suspended listings should never be returned
   */
  it('should never return suspended listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver'), { nil: undefined }),
          fylke: fc.option(fc.constantFrom('Oslo', 'Bergen', 'Trondheim'), { nil: undefined })
        }),
        async (filters) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(filters)
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Check that no returned listing is suspended
            for (const listing of allListings) {
              if (listing.status === 'SUSPENDED') {
                return false;
              }
            }
            
            // Verify against database - check that there are no suspended listings in results
            const suspendedVehicles = await prisma.vehicleListing.findMany({
              where: { 
                status: ListingStatus.SUSPENDED
              },
              select: { id: true }
            });
            
            const suspendedDrivers = await prisma.driverListing.findMany({
              where: { 
                status: ListingStatus.SUSPENDED
              },
              select: { id: true }
            });
            
            const suspendedIds = [
              ...suspendedVehicles.map(v => v.id),
              ...suspendedDrivers.map(d => d.id)
            ];
            
            // None of the returned listings should be in the suspended list
            for (const listing of allListings) {
              if (suspendedIds.includes(listing.id)) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error('Suspended listing visibility test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any search query, unverified driver listings should never be returned
   */
  it('should never return unverified driver listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.constantFrom('driver', 'vehicle_driver'),
          fylke: fc.option(fc.constantFrom('Oslo', 'Bergen', 'Trondheim'), { nil: undefined })
        }),
        async (filters) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(filters)
              .expect(200);

            const { driverListings } = response.body;

            // Check that all returned driver listings are verified
            for (const listing of driverListings || []) {
              if (!listing.verified) {
                return false;
              }
            }
            
            // Verify against database - check that no unverified drivers are in results
            const unverifiedDrivers = await prisma.driverListing.findMany({
              where: { 
                verified: false,
                status: ListingStatus.ACTIVE
              },
              select: { id: true }
            });
            
            const unverifiedIds = unverifiedDrivers.map(d => d.id);
            
            // None of the returned driver listings should be unverified
            for (const listing of driverListings || []) {
              if (unverifiedIds.includes(listing.id)) {
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error('Unverified driver visibility test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any search query, the total count should match the actual number of visible listings
   */
  it('should return accurate total counts that match visible listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          page: fc.integer({ min: 1, max: 3 }),
          pageSize: fc.integer({ min: 5, max: 20 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { vehicleListings, driverListings, total } = response.body;
            const returnedCount = (vehicleListings?.length || 0) + (driverListings?.length || 0);

            // Get actual counts from database based on visibility rules
            let expectedVehicleCount = 0;
            let expectedDriverCount = 0;

            if (!params.listingType || params.listingType === 'vehicle' || params.listingType === 'vehicle_driver') {
              expectedVehicleCount = await prisma.vehicleListing.count({
                where: { status: ListingStatus.ACTIVE }
              });
            }

            if (!params.listingType || params.listingType === 'driver' || params.listingType === 'vehicle_driver') {
              expectedDriverCount = await prisma.driverListing.count({
                where: { 
                  status: ListingStatus.ACTIVE,
                  verified: true
                }
              });
            }

            const expectedTotal = expectedVehicleCount + expectedDriverCount;

            // Total should match expected count
            if (total !== expectedTotal) {
              return false;
            }

            // Returned count should not exceed pageSize (unless total is less than pageSize)
            if (returnedCount > params.pageSize && total > params.pageSize) {
              return false;
            }

            // If we're on page 1 and total <= pageSize, returned count should equal total
            if (params.page === 1 && total <= params.pageSize) {
              if (returnedCount !== total) {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Total count accuracy test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search with filters, only listings matching the filters should be visible
   */
  it('should only show listings that match applied filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fylke: fc.constantFrom('Oslo', 'Bergen', 'Trondheim'),
          vehicleType: fc.option(fc.constantFrom('PALLET_8', 'PALLET_18', 'PALLET_21'), { nil: undefined })
        }),
        async (filters) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(filters)
              .expect(200);

            const { vehicleListings, driverListings, total } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Build expected database query
            const vehicleWhere: any = {
              status: ListingStatus.ACTIVE,
              fylke: filters.fylke
            };

            if (filters.vehicleType) {
              vehicleWhere.vehicleType = filters.vehicleType;
            }

            const driverWhere: any = {
              status: ListingStatus.ACTIVE,
              verified: true,
              company: {
                fylke: filters.fylke
              }
            };

            // Get expected counts from database
            const expectedVehicleCount = await prisma.vehicleListing.count({
              where: vehicleWhere
            });

            const expectedDriverCount = await prisma.driverListing.count({
              where: driverWhere
            });

            const expectedTotal = expectedVehicleCount + expectedDriverCount;

            // Total should match expected filtered count
            if (total !== expectedTotal) {
              return false;
            }

            // All returned listings should match the filters
            for (const listing of allListings) {
              // Check fylke filter
              if (listing.fylke && listing.fylke !== filters.fylke) {
                return false;
              }
              
              // For driver listings, check company fylke
              if (listing.company && listing.company.fylke && listing.company.fylke !== filters.fylke) {
                return false;
              }

              // Check vehicle type filter (only for vehicle listings)
              if (filters.vehicleType && listing.vehicleType && listing.vehicleType !== filters.vehicleType) {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Filter visibility test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search query, listings should include complete company information
   */
  it('should include complete company information for all visible listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('vehicle', 'driver'),
        async (listingType: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ listingType, pageSize: 5 })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Each listing should have complete company information
            for (const listing of allListings) {
              if (!listing.company) {
                return false;
              }

              // Company should have required fields
              if (!listing.company.id || !listing.company.name) {
                return false;
              }

              // Verify company exists in database
              const dbCompany = await prisma.company.findUnique({
                where: { id: listing.company.id }
              });

              if (!dbCompany) {
                return false;
              }

              // Company information should match database
              if (listing.company.name !== dbCompany.name) {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Company information visibility test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search query, listings should not expose sensitive information
   */
  it('should not expose sensitive information in search results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('vehicle', 'driver', 'vehicle_driver'),
        async (listingType: string) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query({ listingType, pageSize: 5 })
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Check that sensitive fields are not exposed
            for (const listing of allListings) {
              // Should not expose internal IDs or sensitive data
              if (listing.internalNotes || listing.adminNotes) {
                return false;
              }

              // Company should not expose sensitive information
              if (listing.company) {
                if (listing.company.organizationNumber || 
                    listing.company.businessAddress ||
                    listing.company.vatRegistered !== undefined) {
                  return false;
                }
              }

              // Driver listings should not expose personal details beyond what's needed
              if (listing.licenseClass) {
                if (listing.personalId || listing.socialSecurityNumber) {
                  return false;
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Sensitive information exposure test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});