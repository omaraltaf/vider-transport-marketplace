/**
 * Property-Based Test: Required Field Presence
 * **Feature: listing-search-fix, Property 3: Required field presence**
 * **Validates: Requirements 1.5**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app';

const prisma = new PrismaClient();
const app = createApp();

describe('Property 3: Required field presence', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * For any search result listing, it should contain all essential fields
   * (title, description, pricing information)
   */
  it('should include all essential fields in vehicle listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.constantFrom('vehicle', 'vehicle_driver'),
          pageSize: fc.integer({ min: 1, max: 10 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { vehicleListings } = response.body;

            // Check each vehicle listing has required fields
            for (const listing of vehicleListings || []) {
              // Essential identification fields
              if (!listing.id || typeof listing.id !== 'string') {
                return false;
              }

              // Title/name information
              if (!listing.title && !listing.name) {
                return false;
              }

              // Description information
              if (!listing.description || typeof listing.description !== 'string') {
                return false;
              }

              // Vehicle-specific required fields
              if (!listing.vehicleType || typeof listing.vehicleType !== 'string') {
                return false;
              }

              // Pricing information - at least one pricing field should be present
              const hasPricing = listing.pricePerDay !== undefined || 
                               listing.pricePerHour !== undefined || 
                               listing.pricePerKm !== undefined ||
                               listing.basePrice !== undefined;
              
              if (!hasPricing) {
                return false;
              }

              // Location information
              if (!listing.fylke || typeof listing.fylke !== 'string') {
                return false;
              }

              // Company information should be present
              if (!listing.company || !listing.company.id || !listing.company.name) {
                return false;
              }

              // Status should be present and valid
              if (!listing.status || typeof listing.status !== 'string') {
                return false;
              }

              // Availability information
              if (listing.available === undefined || typeof listing.available !== 'boolean') {
                return false;
              }

              // Creation timestamp
              if (!listing.createdAt) {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Vehicle listing required fields test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any driver listing in search results, it should contain all essential fields
   */
  it('should include all essential fields in driver listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.constantFrom('driver', 'vehicle_driver'),
          pageSize: fc.integer({ min: 1, max: 10 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { driverListings } = response.body;

            // Check each driver listing has required fields
            for (const listing of driverListings || []) {
              // Essential identification fields
              if (!listing.id || typeof listing.id !== 'string') {
                return false;
              }

              // Title/name information
              if (!listing.title && !listing.name) {
                return false;
              }

              // Description information
              if (!listing.description || typeof listing.description !== 'string') {
                return false;
              }

              // Driver-specific required fields
              if (!listing.licenseClass || !Array.isArray(listing.licenseClass)) {
                return false;
              }

              // Pricing information - at least one pricing field should be present
              const hasPricing = listing.pricePerDay !== undefined || 
                               listing.pricePerHour !== undefined || 
                               listing.pricePerKm !== undefined ||
                               listing.basePrice !== undefined;
              
              if (!hasPricing) {
                return false;
              }

              // Company information should be present
              if (!listing.company || !listing.company.id || !listing.company.name) {
                return false;
              }

              // Status should be present and valid
              if (!listing.status || typeof listing.status !== 'string') {
                return false;
              }

              // Verification status for drivers
              if (listing.verified === undefined || typeof listing.verified !== 'boolean') {
                return false;
              }

              // Availability information
              if (listing.available === undefined || typeof listing.available !== 'boolean') {
                return false;
              }

              // Creation timestamp
              if (!listing.createdAt) {
                return false;
              }

              // Experience information
              if (listing.experience === undefined || typeof listing.experience !== 'number') {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Driver listing required fields test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any search result, pricing information should be properly formatted and valid
   */
  it('should have valid pricing information in all listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          pageSize: fc.integer({ min: 1, max: 8 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Check pricing information for all listings
            for (const listing of allListings) {
              // At least one pricing field should exist
              const pricingFields = [
                listing.pricePerDay,
                listing.pricePerHour, 
                listing.pricePerKm,
                listing.basePrice
              ].filter(price => price !== undefined);

              if (pricingFields.length === 0) {
                return false;
              }

              // All present pricing fields should be valid numbers
              for (const price of pricingFields) {
                if (typeof price !== 'number' || price < 0 || !isFinite(price)) {
                  return false;
                }
              }

              // If currency is specified, it should be a valid string
              if (listing.currency && typeof listing.currency !== 'string') {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Pricing information validation test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * For any search result, location information should be complete and valid
   */
  it('should have complete location information in all listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
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

            // Check location information for all listings
            for (const listing of allListings) {
              // Fylke should be present and valid
              if (!listing.fylke || typeof listing.fylke !== 'string') {
                // For driver listings, check company fylke as fallback
                if (listing.licenseClass && listing.company && listing.company.fylke) {
                  if (typeof listing.company.fylke !== 'string') {
                    return false;
                  }
                } else {
                  return false;
                }
              }

              // Kommune should be present if available
              if (listing.kommune && typeof listing.kommune !== 'string') {
                return false;
              }

              // Coordinates should be valid if present
              if (listing.coordinates) {
                if (!Array.isArray(listing.coordinates) || 
                    listing.coordinates.length !== 2 ||
                    typeof listing.coordinates[0] !== 'number' ||
                    typeof listing.coordinates[1] !== 'number') {
                  return false;
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Location information validation test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search result, company information should be complete and accessible
   */
  it('should have complete company information in all listings', async () => {
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

            // Check company information for all listings
            for (const listing of allListings) {
              // Company object should exist
              if (!listing.company || typeof listing.company !== 'object') {
                return false;
              }

              // Company should have required identification fields
              if (!listing.company.id || typeof listing.company.id !== 'string') {
                return false;
              }

              if (!listing.company.name || typeof listing.company.name !== 'string') {
                return false;
              }

              // Company should have location information
              if (!listing.company.fylke || typeof listing.company.fylke !== 'string') {
                return false;
              }

              // Company should have contact information
              if (listing.company.email && typeof listing.company.email !== 'string') {
                return false;
              }

              if (listing.company.phone && typeof listing.company.phone !== 'string') {
                return false;
              }

              // Company rating should be valid if present
              if (listing.company.rating !== undefined) {
                if (typeof listing.company.rating !== 'number' || 
                    listing.company.rating < 0 || 
                    listing.company.rating > 5) {
                  return false;
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Company information validation test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search result, timestamps and metadata should be present and valid
   */
  it('should have valid timestamps and metadata in all listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          pageSize: fc.integer({ min: 1, max: 6 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Check timestamps and metadata for all listings
            for (const listing of allListings) {
              // CreatedAt should be present and valid
              if (!listing.createdAt) {
                return false;
              }

              // Should be a valid date string or Date object
              const createdDate = new Date(listing.createdAt);
              if (isNaN(createdDate.getTime())) {
                return false;
              }

              // UpdatedAt should be valid if present
              if (listing.updatedAt) {
                const updatedDate = new Date(listing.updatedAt);
                if (isNaN(updatedDate.getTime())) {
                  return false;
                }
              }

              // Status should be a valid enum value
              const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
              if (!validStatuses.includes(listing.status)) {
                return false;
              }

              // Available should be boolean
              if (typeof listing.available !== 'boolean') {
                return false;
              }

              // Views count should be valid if present
              if (listing.views !== undefined) {
                if (typeof listing.views !== 'number' || listing.views < 0) {
                  return false;
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Timestamps and metadata validation test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search result, essential display information should be non-empty
   */
  it('should have non-empty essential display fields in all listings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          pageSize: fc.integer({ min: 1, max: 5 })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const { vehicleListings, driverListings } = response.body;
            const allListings = [...(vehicleListings || []), ...(driverListings || [])];

            // Check essential display fields are non-empty
            for (const listing of allListings) {
              // Title or name should be non-empty
              const hasTitle = (listing.title && listing.title.trim().length > 0) ||
                             (listing.name && listing.name.trim().length > 0);
              
              if (!hasTitle) {
                return false;
              }

              // Description should be non-empty
              if (!listing.description || listing.description.trim().length === 0) {
                return false;
              }

              // Company name should be non-empty
              if (!listing.company.name || listing.company.name.trim().length === 0) {
                return false;
              }

              // Location should be non-empty
              const hasLocation = (listing.fylke && listing.fylke.trim().length > 0) ||
                                (listing.company.fylke && listing.company.fylke.trim().length > 0);
              
              if (!hasLocation) {
                return false;
              }

              // Vehicle type or license class should be non-empty
              if (listing.vehicleType) {
                if (listing.vehicleType.trim().length === 0) {
                  return false;
                }
              } else if (listing.licenseClass) {
                if (!Array.isArray(listing.licenseClass) || listing.licenseClass.length === 0) {
                  return false;
                }
              } else {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Essential display fields validation test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});