/**
 * Property-based tests for listing data authenticity
 * **Feature: mock-data-replacement, Property 13: Listing data authenticity**
 * 
 * Validates that all vehicle listing display and search results are retrievable from the database
 * and that no mock data is used in listing management components.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, ListingStatus, VehicleType, FuelType } from '@prisma/client';
import { listingService } from '../listing.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

describe('Listing Data Authenticity Property Tests', () => {
  beforeAll(async () => {
    logger.info('Starting listing data authenticity tests');
  });

  afterAll(async () => {
    logger.info('Completed listing data authenticity tests');
  });

  /**
   * Property 13: Listing data authenticity
   * For any vehicle listing display or search result, all listing information should be retrievable from the database
   */
  it('should ensure all vehicle listing data comes from database', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test company data
        fc.record({
          name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          organizationNumber: fc.string({ minLength: 9, maxLength: 9 }),
          city: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
          fylke: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
          kommune: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
        }),
        // Generate test vehicle listing data
        fc.record({
          title: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 0),
          description: fc.string({ minLength: 2, maxLength: 200 }).filter(s => s.trim().length > 0),
          vehicleType: fc.constantFrom(...Object.values(VehicleType)),
          capacity: fc.integer({ min: 1, max: 50 }),
          fuelType: fc.constantFrom(...Object.values(FuelType)),
          hourlyRate: fc.option(fc.float({ min: 1, max: 1000 }), { nil: null }),
          dailyRate: fc.option(fc.float({ min: 1, max: 5000 }), { nil: null }),
          withDriver: fc.boolean(),
          withoutDriver: fc.boolean(),
        }),
        async (companyData, listingData) => {
          // Generate unique identifiers to avoid conflicts
          const uniqueSuffix = Date.now() + Math.random().toString(36).substr(2, 9);
          companyData.organizationNumber = `12345${uniqueSuffix.toString().slice(-4)}`;
          companyData.name = `${companyData.name}_${uniqueSuffix}`;

          // Ensure at least one service offering is true
          if (!listingData.withDriver && !listingData.withoutDriver) {
            listingData.withDriver = true;
          }

          // Ensure at least one rate is provided
          if (!listingData.hourlyRate && !listingData.dailyRate) {
            listingData.hourlyRate = 100;
          }

          // Create test company
          const company = await prisma.company.create({
            data: {
              ...companyData,
              businessAddress: '123 Test Street',
              postalCode: '0123',
              verified: true,
              status: 'ACTIVE',
              vatRegistered: true,
            },
          });

          try {
            // Create vehicle listing in database
            const createdListing = await listingService.createVehicleListing({
              companyId: company.id,
              ...listingData,
              city: companyData.city,
              fylke: companyData.fylke,
              kommune: companyData.kommune,
              withDriverCost: listingData.withDriver ? 50 : undefined,
            });

            // Retrieve listing through service (simulating frontend API call)
            const retrievedListing = await listingService.getVehicleListingById(createdListing.id);

            // Property: All listing data should be retrievable from database
            expect(retrievedListing).toBeDefined();
            expect(retrievedListing.id).toBe(createdListing.id);
            expect(retrievedListing.title).toBe(listingData.title);
            expect(retrievedListing.description).toBe(listingData.description);
            expect(retrievedListing.vehicleType).toBe(listingData.vehicleType);
            expect(retrievedListing.capacity).toBe(listingData.capacity);
            expect(retrievedListing.fuelType).toBe(listingData.fuelType);
            expect(retrievedListing.status).toBe(ListingStatus.ACTIVE);

            // Verify pricing data authenticity (with floating point tolerance)
            if (listingData.hourlyRate) {
              expect(retrievedListing.pricing.hourlyRate).toBeCloseTo(listingData.hourlyRate, 5);
            }
            if (listingData.dailyRate) {
              expect(retrievedListing.pricing.dailyRate).toBeCloseTo(listingData.dailyRate, 5);
            }

            // Verify service offerings authenticity
            expect(retrievedListing.serviceOfferings.withDriver).toBe(listingData.withDriver);
            expect(retrievedListing.serviceOfferings.withoutDriver).toBe(listingData.withoutDriver);

            // Verify location data authenticity
            expect(retrievedListing.location.city).toBe(companyData.city);
            expect(retrievedListing.location.fylke).toBe(companyData.fylke);
            expect(retrievedListing.location.kommune).toBe(companyData.kommune);

            // Verify company data is included and authentic
            expect(retrievedListing.company).toBeDefined();
            expect(retrievedListing.company.id).toBe(company.id);
            expect(retrievedListing.company.name).toBe(companyData.name);

            logger.info('Vehicle listing data authenticity verified', {
              listingId: createdListing.id,
              companyId: company.id,
            });
          } finally {
            // Clean up test data
            await prisma.vehicleListing.deleteMany({ where: { companyId: company.id } });
            await prisma.company.delete({ where: { id: company.id } });
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 13: No mock data fallbacks in error scenarios
   * When database queries fail, the system should not fall back to mock data
   */
  it('should not use mock data when database operations fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (invalidId) => {
          // Attempt to retrieve non-existent listing
          const result = await listingService.getVehicleListingById(invalidId);

          // Property: Should return null, not mock data
          expect(result).toBeNull();

          // Verify no mock data structure is returned (only check if result is not null)
          if (result !== null) {
            expect(result).not.toHaveProperty('title');
            expect(result).not.toHaveProperty('description');
            expect(result).not.toHaveProperty('vehicleType');
          }

          logger.info('No mock data fallback verified for invalid listing ID', {
            invalidId,
            result,
          });
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 13: Company listing retrieval authenticity
   * For any company's listing collection, all listings should be retrievable from the database
   */
  it('should ensure company listing collections come from database', async () => {
    const uniqueSuffix = Date.now() + Math.random().toString(36).substr(2, 9);
    
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: `TestCompany_${uniqueSuffix}`,
        organizationNumber: `12345${uniqueSuffix.toString().slice(-4)}`,
        businessAddress: '123 Test Street',
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        postalCode: '0123',
        verified: true,
        status: 'ACTIVE',
        vatRegistered: true,
      },
    });

    try {
      // Create multiple vehicle listings
      const createdListings = [];
      for (let i = 0; i < 3; i++) {
        const listing = await listingService.createVehicleListing({
          companyId: company.id,
          title: `Test Vehicle ${i}`,
          description: 'Test description',
          vehicleType: VehicleType.PALLET_8,
          capacity: 10,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withDriverCost: 50,
          withoutDriver: false,
        });
        createdListings.push(listing);
      }

      // Retrieve company listings through service (simulating frontend API call)
      const retrievedListings = await listingService.getCompanyVehicleListings(company.id);

      // Property: All company listings should be retrievable from database
      expect(retrievedListings).toHaveLength(createdListings.length);

      // Verify each listing is authentic and matches database
      for (let i = 0; i < createdListings.length; i++) {
        const created = createdListings[i];
        const retrieved = retrievedListings.find(l => l.id === created.id);
        
        expect(retrieved).toBeDefined();
        expect(retrieved!.title).toBe(`Test Vehicle ${i}`);
        expect(retrieved!.vehicleType).toBe(VehicleType.PALLET_8);
        expect(retrieved!.capacity).toBe(10);
        expect(retrieved!.companyId).toBe(company.id);
      }

      // Verify no mock data is present (all listings should have database IDs)
      for (const listing of retrievedListings) {
        expect(listing.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
        expect(listing.createdAt).toBeDefined();
        expect(listing.updatedAt).toBeDefined();
      }

      logger.info('Company listing collection authenticity verified', {
        companyId: company.id,
        listingCount: retrievedListings.length,
      });
    } finally {
      // Clean up test data
      await prisma.vehicleListing.deleteMany({ where: { companyId: company.id } });
      await prisma.company.delete({ where: { id: company.id } });
    }
  });
});