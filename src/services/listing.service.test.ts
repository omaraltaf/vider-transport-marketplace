import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { listingService, VehicleListingCreateData, DriverListingCreateData } from './listing.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper to generate unique organization number
function generateOrgNumber(): string {
  return `ORG${Date.now()}${Math.random().toString().slice(2, 8)}`;
}

describe('ListingService', () => {
  // Clean up test data after each test
  afterEach(async () => {
    // Delete in correct order to respect foreign key constraints
    await prisma.message.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  });

  /**
   * **Feature: vider-transport-marketplace, Property 9: Vehicle listing completeness**
   * **Validates: Requirements 4.1, 4.4**
   * 
   * For any valid vehicle listing creation, all required fields (Title, Description, Location, 
   * Vehicle Type, Capacity, Fuel Type, Pricing, Service Offerings) must be validated and stored.
   */
  describe('Property 9: Vehicle listing completeness', () => {
    it('should validate and store all required fields for any valid vehicle listing', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a test company
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
            fylke: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            kommune: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            vatRegistered: fc.boolean(),
          }),
          // Generate vehicle listing data
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            vehicleType: fc.constantFrom(...Object.values(VehicleType)),
            capacity: fc.integer({ min: 1, max: 100 }),
            fuelType: fc.constantFrom(...Object.values(FuelType)),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            fylke: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            kommune: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            latitude: fc.option(fc.double({ min: -90, max: 90, noNaN: true }), { nil: undefined }),
            longitude: fc.option(fc.double({ min: -180, max: 180, noNaN: true }), { nil: undefined }),
            hourlyRate: fc.option(fc.double({ min: 0.01, max: 10000, noNaN: true }), { nil: undefined }),
            dailyRate: fc.option(fc.double({ min: 0.01, max: 100000, noNaN: true }), { nil: undefined }),
            deposit: fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: undefined }),
            currency: fc.constant('NOK'),
            withDriver: fc.boolean(),
            withoutDriver: fc.boolean(),
            photos: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 20 }),
          }),
          async (companyData, listingData) => {
            // Ensure at least one service offering is true
            if (!listingData.withDriver && !listingData.withoutDriver) {
              listingData.withDriver = true;
            }

            // Ensure at least one rate is provided
            if (!listingData.hourlyRate && !listingData.dailyRate) {
              listingData.hourlyRate = 100;
            }

            // If withDriver is true, provide withDriverCost
            const withDriverCost = listingData.withDriver ? 50 : undefined;

            // Create test company with unique org number using UUID
            const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
            const company = await prisma.company.create({
              data: {
                ...companyData,
                organizationNumber: uniqueOrgNumber,
              },
            });

            // Create vehicle listing
            const createData: VehicleListingCreateData = {
              companyId: company.id,
              ...listingData,
              withDriverCost,
            };

            const listing = await listingService.createVehicleListing(createData);

            // Verify all required fields are stored
            expect(listing.id).toBeDefined();
            expect(listing.companyId).toBe(company.id);
            expect(listing.title).toBe(listingData.title);
            expect(listing.description).toBe(listingData.description);
            expect(listing.vehicleType).toBe(listingData.vehicleType);
            expect(listing.capacity).toBe(listingData.capacity);
            expect(listing.fuelType).toBe(listingData.fuelType);
            expect(listing.city).toBe(listingData.city);
            expect(listing.fylke).toBe(listingData.fylke);
            expect(listing.kommune).toBe(listingData.kommune);
            // Use toBeCloseTo for floating point comparisons
            if (listingData.latitude !== undefined) {
              expect(listing.latitude).toBeCloseTo(listingData.latitude, 2);
            } else {
              expect(listing.latitude).toBeNull();
            }
            if (listingData.longitude !== undefined) {
              expect(listing.longitude).toBeCloseTo(listingData.longitude, 2);
            } else {
              expect(listing.longitude).toBeNull();
            }
            // Use toBeCloseTo for floating point comparisons
            if (listingData.hourlyRate !== undefined) {
              expect(listing.hourlyRate).toBeCloseTo(listingData.hourlyRate, 2);
            } else {
              expect(listing.hourlyRate).toBeNull();
            }
            if (listingData.dailyRate !== undefined) {
              expect(listing.dailyRate).toBeCloseTo(listingData.dailyRate, 2);
            } else {
              expect(listing.dailyRate).toBeNull();
            }
            if (listingData.deposit !== undefined) {
              expect(listing.deposit).toBeCloseTo(listingData.deposit, 2);
            } else {
              expect(listing.deposit).toBeNull();
            }
            expect(listing.currency).toBe(listingData.currency || 'NOK');
            expect(listing.withDriver).toBe(listingData.withDriver);
            expect(listing.withDriverCost).toBe(withDriverCost ?? null);
            expect(listing.withoutDriver).toBe(listingData.withoutDriver);
            expect(listing.photos).toEqual(listingData.photos);
            expect(listing.tags).toEqual(listingData.tags);
            expect(listing.status).toBe(ListingStatus.ACTIVE);
            expect(listing.createdAt).toBeInstanceOf(Date);
            expect(listing.updatedAt).toBeInstanceOf(Date);

            // Verify the listing can be retrieved from database
            const retrievedListing = await listingService.getVehicleListingById(listing.id);
            expect(retrievedListing).not.toBeNull();
            expect(retrievedListing?.id).toBe(listing.id);
            expect(retrievedListing?.title).toBe(listingData.title);
            expect(retrievedListing?.description).toBe(listingData.description);
            expect(retrievedListing?.vehicleType).toBe(listingData.vehicleType);
            expect(retrievedListing?.capacity).toBe(listingData.capacity);
            expect(retrievedListing?.fuelType).toBe(listingData.fuelType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject listing creation when required fields are missing', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Test missing title
      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: '',
          description: 'Test description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withDriverCost: 50,
          withoutDriver: false,
        })
      ).rejects.toThrow('TITLE_REQUIRED');

      // Test missing description
      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: 'Test Vehicle',
          description: '',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withDriverCost: 50,
          withoutDriver: false,
        })
      ).rejects.toThrow('DESCRIPTION_REQUIRED');

      // Test invalid capacity
      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: 'Test Vehicle',
          description: 'Test description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 0,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withDriverCost: 50,
          withoutDriver: false,
        })
      ).rejects.toThrow('CAPACITY_MUST_BE_POSITIVE');

      // Test missing location fields
      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: 'Test Vehicle',
          description: 'Test description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: '',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withDriverCost: 50,
          withoutDriver: false,
        })
      ).rejects.toThrow('CITY_REQUIRED');
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 10: Service offering flexibility**
   * **Validates: Requirements 4.2**
   * 
   * For any vehicle listing, the system must allow and correctly store any combination of 
   * with-driver, without-driver, or both service offerings with associated pricing.
   */
  describe('Property 10: Service offering flexibility', () => {
    it('should allow and store any valid combination of service offerings', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate company data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
            fylke: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            kommune: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            vatRegistered: fc.boolean(),
          }),
          // Generate service offering combinations
          fc.record({
            withDriver: fc.boolean(),
            withoutDriver: fc.boolean(),
            withDriverCost: fc.option(fc.double({ min: 0.01, max: 1000, noNaN: true }), { nil: undefined }),
          }),
          async (companyData, serviceOffering) => {
            // Ensure at least one service offering is true
            if (!serviceOffering.withDriver && !serviceOffering.withoutDriver) {
              serviceOffering.withDriver = true;
            }

            // Adjust withDriverCost based on withDriver flag
            const withDriverCost = serviceOffering.withDriver 
              ? (serviceOffering.withDriverCost ?? 50) 
              : undefined;

            // Create test company with unique org number using UUID
            const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
            const company = await prisma.company.create({
              data: {
                ...companyData,
                organizationNumber: uniqueOrgNumber,
              },
            });

            // Create vehicle listing with service offerings
            const listing = await listingService.createVehicleListing({
              companyId: company.id,
              title: 'Test Vehicle',
              description: 'Test description',
              vehicleType: VehicleType.PALLET_18,
              capacity: 18,
              fuelType: FuelType.DIESEL,
              city: 'Oslo',
              fylke: 'Oslo',
              kommune: 'Oslo',
              hourlyRate: 100,
              withDriver: serviceOffering.withDriver,
              withDriverCost,
              withoutDriver: serviceOffering.withoutDriver,
            });

            // Verify service offerings are stored correctly
            expect(listing.withDriver).toBe(serviceOffering.withDriver);
            expect(listing.withoutDriver).toBe(serviceOffering.withoutDriver);
            
            if (serviceOffering.withDriver) {
              // Use toBeCloseTo for floating point comparison
              expect(listing.withDriverCost).toBeCloseTo(withDriverCost!, 2);
            } else {
              expect(listing.withDriverCost).toBeNull();
            }

            // Verify at least one service offering is true
            expect(listing.withDriver || listing.withoutDriver).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support with-driver only', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const listing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Test Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
      });

      expect(listing.withDriver).toBe(true);
      expect(listing.withDriverCost).toBe(50);
      expect(listing.withoutDriver).toBe(false);
    });

    it('should support without-driver only', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const listing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Test Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: false,
        withoutDriver: true,
      });

      expect(listing.withDriver).toBe(false);
      expect(listing.withDriverCost).toBeNull();
      expect(listing.withoutDriver).toBe(true);
    });

    it('should support both with-driver and without-driver', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const listing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Test Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: true,
      });

      expect(listing.withDriver).toBe(true);
      expect(listing.withDriverCost).toBe(50);
      expect(listing.withoutDriver).toBe(true);
    });

    it('should reject listing with no service offerings', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: 'Test Vehicle',
          description: 'Test description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: false,
          withoutDriver: false,
        })
      ).rejects.toThrow('AT_LEAST_ONE_SERVICE_OFFERING_REQUIRED');
    });

    it('should reject with-driver without withDriverCost', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      await expect(
        listingService.createVehicleListing({
          companyId: company.id,
          title: 'Test Vehicle',
          description: 'Test description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 100,
          withDriver: true,
          withoutDriver: false,
        })
      ).rejects.toThrow('WITH_DRIVER_COST_REQUIRED');
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 11: Driver listing with verification requirement**
   * **Validates: Requirements 5.4**
   * 
   * For any driver listing creation without license documentation, the system must prevent 
   * publication until verification documents are uploaded.
   */
  describe('Property 11: Driver listing with verification requirement', () => {
    it('should prevent publication of driver listings without license documents', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate company data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
            fylke: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            kommune: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            vatRegistered: fc.boolean(),
          }),
          // Generate driver listing data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            licenseClass: fc.constantFrom('B', 'C1', 'C', 'CE', 'D'),
            languages: fc.array(fc.constantFrom('Norwegian', 'English', 'Swedish', 'Danish', 'German'), { minLength: 1, maxLength: 5 }),
            backgroundSummary: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), { nil: undefined }),
            hourlyRate: fc.option(fc.double({ min: 0.01, max: 1000, noNaN: true }), { nil: undefined }),
            dailyRate: fc.option(fc.double({ min: 0.01, max: 10000, noNaN: true }), { nil: undefined }),
            hasLicenseDocument: fc.boolean(),
          }),
          async (companyData, driverData) => {
            // Ensure at least one rate is provided
            if (!driverData.hourlyRate && !driverData.dailyRate) {
              driverData.hourlyRate = 100;
            }

            // Create test company with unique org number using UUID
            const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
            const company = await prisma.company.create({
              data: {
                ...companyData,
                organizationNumber: uniqueOrgNumber,
              },
            });

            // Create driver listing with or without license document
            const createData: DriverListingCreateData = {
              companyId: company.id,
              name: driverData.name,
              licenseClass: driverData.licenseClass,
              languages: driverData.languages,
              backgroundSummary: driverData.backgroundSummary,
              hourlyRate: driverData.hourlyRate,
              dailyRate: driverData.dailyRate,
              licenseDocumentPath: driverData.hasLicenseDocument ? '/path/to/license.pdf' : undefined,
            };

            const listing = await listingService.createDriverListing(createData);

            // Verify listing status based on license document presence
            if (driverData.hasLicenseDocument) {
              // With license document, listing should be ACTIVE (can be published)
              expect(listing.status).toBe(ListingStatus.ACTIVE);
            } else {
              // Without license document, listing should be SUSPENDED (cannot be published)
              expect(listing.status).toBe(ListingStatus.SUSPENDED);
            }

            // Verify listing is not verified yet (requires admin verification)
            expect(listing.verified).toBe(false);
            expect(listing.verifiedAt).toBeNull();
            expect(listing.verifiedBy).toBeNull();

            // Verify license document path is stored correctly
            if (driverData.hasLicenseDocument) {
              expect(listing.licenseDocumentPath).toBe('/path/to/license.pdf');
            } else {
              expect(listing.licenseDocumentPath).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject activation of driver listing without license document', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create driver listing without license document
      const listing = await listingService.createDriverListing({
        companyId: company.id,
        name: 'John Doe',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        hourlyRate: 100,
      });

      // Verify listing is suspended
      expect(listing.status).toBe(ListingStatus.SUSPENDED);

      // Attempt to activate the listing should fail
      await expect(
        listingService.updateDriverListingStatus(listing.id, ListingStatus.ACTIVE)
      ).rejects.toThrow('CANNOT_ACTIVATE_LISTING_WITHOUT_LICENSE_DOCUMENT');
    });

    it('should allow activation of driver listing with license document', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create driver listing with license document
      const listing = await listingService.createDriverListing({
        companyId: company.id,
        name: 'John Doe',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        hourlyRate: 100,
        licenseDocumentPath: '/path/to/license.pdf',
      });

      // Verify listing is active
      expect(listing.status).toBe(ListingStatus.ACTIVE);

      // Should be able to suspend and reactivate
      const suspended = await listingService.updateDriverListingStatus(listing.id, ListingStatus.SUSPENDED);
      expect(suspended.status).toBe(ListingStatus.SUSPENDED);

      const reactivated = await listingService.updateDriverListingStatus(listing.id, ListingStatus.ACTIVE);
      expect(reactivated.status).toBe(ListingStatus.ACTIVE);
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 12: Driver verification badge display**
   * **Validates: Requirements 5.3**
   * 
   * For any driver whose credentials have been verified by a Platform Admin, 
   * the driver's listing must display a Driver Verification Badge.
   */
  describe('Property 12: Driver verification badge display', () => {
    it('should display verification badge for verified drivers', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate company data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
            fylke: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            kommune: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            vatRegistered: fc.boolean(),
          }),
          // Generate driver listing data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            licenseClass: fc.constantFrom('B', 'C1', 'C', 'CE', 'D'),
            languages: fc.array(fc.constantFrom('Norwegian', 'English', 'Swedish', 'Danish', 'German'), { minLength: 1, maxLength: 5 }),
            backgroundSummary: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), { nil: undefined }),
            hourlyRate: fc.option(fc.double({ min: 0.01, max: 1000, noNaN: true }), { nil: undefined }),
            dailyRate: fc.option(fc.double({ min: 0.01, max: 10000, noNaN: true }), { nil: undefined }),
          }),
          async (companyData, driverData) => {
            // Ensure at least one rate is provided
            if (!driverData.hourlyRate && !driverData.dailyRate) {
              driverData.hourlyRate = 100;
            }

            // Create test company with unique org number using UUID
            const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
            const company = await prisma.company.create({
              data: {
                ...companyData,
                organizationNumber: uniqueOrgNumber,
              },
            });

            // Create admin user for verification
            const adminUser = await prisma.user.create({
              data: {
                email: `admin-${randomUUID()}@test.com`,
                passwordHash: 'hashedpassword',
                role: 'PLATFORM_ADMIN',
                companyId: company.id,
                firstName: 'Admin',
                lastName: 'User',
                phone: '12345678',
                emailVerified: true,
              },
            });

            // Create driver listing with license document
            const createData: DriverListingCreateData = {
              companyId: company.id,
              name: driverData.name,
              licenseClass: driverData.licenseClass,
              languages: driverData.languages,
              backgroundSummary: driverData.backgroundSummary,
              hourlyRate: driverData.hourlyRate,
              dailyRate: driverData.dailyRate,
              licenseDocumentPath: '/path/to/license.pdf',
            };

            const listing = await listingService.createDriverListing(createData);

            // Initially, driver should not be verified
            expect(listing.verified).toBe(false);
            expect(listing.verifiedAt).toBeNull();
            expect(listing.verifiedBy).toBeNull();

            // Admin verifies the driver
            const verifiedListing = await listingService.verifyDriverListing(listing.id, adminUser.id);

            // After verification, driver should have verification badge
            expect(verifiedListing.verified).toBe(true);
            expect(verifiedListing.verifiedAt).toBeInstanceOf(Date);
            expect(verifiedListing.verifiedBy).toBe(adminUser.id);

            // Verify the listing can be retrieved and still shows verification badge
            const retrievedListing = await listingService.getDriverListingById(listing.id);
            expect(retrievedListing).not.toBeNull();
            expect(retrievedListing?.verified).toBe(true);
            expect(retrievedListing?.verifiedAt).toBeInstanceOf(Date);
            expect(retrievedListing?.verifiedBy).toBe(adminUser.id);

            // Clean up admin user
            await prisma.user.delete({ where: { id: adminUser.id } });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display verification badge for unverified drivers', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create driver listing with license document but not verified
      const listing = await listingService.createDriverListing({
        companyId: company.id,
        name: 'John Doe',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        hourlyRate: 100,
        licenseDocumentPath: '/path/to/license.pdf',
      });

      // Verify no verification badge is displayed
      expect(listing.verified).toBe(false);
      expect(listing.verifiedAt).toBeNull();
      expect(listing.verifiedBy).toBeNull();
    });

    it('should reject verification without license document', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          passwordHash: 'hashedpassword',
          role: 'PLATFORM_ADMIN',
          companyId: company.id,
          firstName: 'Admin',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      // Create driver listing without license document
      const listing = await listingService.createDriverListing({
        companyId: company.id,
        name: 'John Doe',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        hourlyRate: 100,
      });

      // Attempt to verify should fail
      await expect(
        listingService.verifyDriverListing(listing.id, adminUser.id)
      ).rejects.toThrow('LICENSE_DOCUMENT_REQUIRED_FOR_VERIFICATION');

      // Clean up admin user
      await prisma.user.delete({ where: { id: adminUser.id } });
    });

    it('should activate suspended listing upon verification', async () => {
      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: generateOrgNumber(),
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          passwordHash: 'hashedpassword',
          role: 'PLATFORM_ADMIN',
          companyId: company.id,
          firstName: 'Admin',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      // Create driver listing without license document (will be SUSPENDED)
      const listing = await listingService.createDriverListing({
        companyId: company.id,
        name: 'John Doe',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        hourlyRate: 100,
      });

      expect(listing.status).toBe(ListingStatus.SUSPENDED);

      // Update to add license document
      const updatedListing = await listingService.updateDriverListing(listing.id, {
        licenseDocumentPath: '/path/to/license.pdf',
      });

      // Still suspended until verified
      expect(updatedListing.status).toBe(ListingStatus.SUSPENDED);

      // Verify the driver
      const verifiedListing = await listingService.verifyDriverListing(listing.id, adminUser.id);

      // Should now be ACTIVE
      expect(verifiedListing.status).toBe(ListingStatus.ACTIVE);
      expect(verifiedListing.verified).toBe(true);

      // Clean up admin user
      await prisma.user.delete({ where: { id: adminUser.id } });
    });
  });
});

  /**
   * **Feature: vider-transport-marketplace, Property 13: Search filter conjunction**
   * **Validates: Requirements 6.3, 6.4**
   * 
   * For any search with multiple filters applied, the system must return only listings 
   * that satisfy all filter criteria simultaneously (AND logic).
   */
  describe('Property 13: Search filter conjunction', () => {
    it('should return only listings that satisfy all applied filters (AND logic)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a test company
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
            fylke: fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
            kommune: fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø'),
            vatRegistered: fc.boolean(),
          }),
          // Generate multiple vehicle listings with varying attributes
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
              vehicleType: fc.constantFrom(...Object.values(VehicleType)),
              capacity: fc.integer({ min: 1, max: 100 }),
              fuelType: fc.constantFrom(...Object.values(FuelType)),
              city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              fylke: fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
              kommune: fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø'),
              hourlyRate: fc.double({ min: 50, max: 500, noNaN: true }),
              dailyRate: fc.double({ min: 500, max: 5000, noNaN: true }),
              withDriver: fc.boolean(),
              withoutDriver: fc.boolean(),
              tags: fc.array(fc.constantFrom('tail-lift', 'refrigerated', 'ADR-certified', 'GPS'), { maxLength: 3 }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          // Generate search filters
          fc.record({
            vehicleType: fc.option(fc.array(fc.constantFrom(...Object.values(VehicleType)), { minLength: 1, maxLength: 2 }), { nil: undefined }),
            fuelType: fc.option(fc.array(fc.constantFrom(...Object.values(FuelType)), { minLength: 1, maxLength: 2 }), { nil: undefined }),
            fylke: fc.option(fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'), { nil: undefined }),
            capacityMin: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
            capacityMax: fc.option(fc.integer({ min: 51, max: 100 }), { nil: undefined }),
            priceMin: fc.option(fc.double({ min: 50, max: 200, noNaN: true }), { nil: undefined }),
            priceMax: fc.option(fc.double({ min: 300, max: 500, noNaN: true }), { nil: undefined }),
            withDriver: fc.option(fc.boolean(), { nil: undefined }),
            tags: fc.option(fc.array(fc.constantFrom('tail-lift', 'refrigerated', 'ADR-certified'), { minLength: 1, maxLength: 2 }), { nil: undefined }),
          }),
          async (companyData, listingsData, filterData) => {
            // Create a unique tag for this test run to isolate results
            const uniqueTag = `test-conjunction-${randomUUID()}`;

            // Create test company with unique org number
            const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
            const company = await prisma.company.create({
              data: {
                ...companyData,
                organizationNumber: uniqueOrgNumber,
              },
            });

            // Create vehicle listings
            const createdListings = [];
            for (const listingData of listingsData) {
              // Ensure at least one service offering
              if (!listingData.withDriver && !listingData.withoutDriver) {
                listingData.withDriver = true;
              }

              const withDriverCost = listingData.withDriver ? 50 : undefined;

              // Add unique tag to all listings to isolate them
              const tags = [...(listingData.tags || []), uniqueTag];

              const listing = await listingService.createVehicleListing({
                companyId: company.id,
                ...listingData,
                withDriverCost,
                tags,
              });
              createdListings.push(listing);
            }

            // Build search filters - always include unique tag to isolate results
            const searchFilters: any = {
              listingType: 'vehicle' as const,
              tags: [uniqueTag], // Always filter by unique tag
            };

            // Add additional filter tags if specified
            if (filterData.tags && filterData.tags.length > 0) {
              searchFilters.tags = [...filterData.tags, uniqueTag];
            }

            if (filterData.vehicleType) {
              searchFilters.vehicleType = filterData.vehicleType;
            }
            if (filterData.fuelType) {
              searchFilters.fuelType = filterData.fuelType;
            }
            if (filterData.fylke) {
              searchFilters.location = { fylke: filterData.fylke };
            }
            if (filterData.capacityMin !== undefined || filterData.capacityMax !== undefined) {
              searchFilters.capacity = {
                min: filterData.capacityMin,
                max: filterData.capacityMax,
              };
            }
            if (filterData.priceMin !== undefined || filterData.priceMax !== undefined) {
              searchFilters.priceRange = {
                min: filterData.priceMin,
                max: filterData.priceMax,
              };
            }
            if (filterData.withDriver !== undefined) {
              searchFilters.withDriver = filterData.withDriver;
            }

            // Perform search
            const results = await listingService.searchListings(searchFilters);

            // Verify all returned listings satisfy ALL filters (AND logic)
            for (const listing of results.vehicleListings) {
              // Check vehicle type filter
              if (filterData.vehicleType) {
                expect(filterData.vehicleType).toContain(listing.vehicleType);
              }

              // Check fuel type filter
              if (filterData.fuelType) {
                expect(filterData.fuelType).toContain(listing.fuelType);
              }

              // Check location filter
              if (filterData.fylke) {
                expect(listing.fylke).toBe(filterData.fylke);
              }

              // Check capacity filter
              if (filterData.capacityMin !== undefined) {
                expect(listing.capacity).toBeGreaterThanOrEqual(filterData.capacityMin);
              }
              if (filterData.capacityMax !== undefined) {
                expect(listing.capacity).toBeLessThanOrEqual(filterData.capacityMax);
              }

              // Check price range filter (at least one rate should be in range)
              if (filterData.priceMin !== undefined || filterData.priceMax !== undefined) {
                const epsilon = 0.01; // Tolerance for floating point comparison
                const hourlyInRange = listing.hourlyRate !== null &&
                  (filterData.priceMin === undefined || listing.hourlyRate >= filterData.priceMin - epsilon) &&
                  (filterData.priceMax === undefined || listing.hourlyRate <= filterData.priceMax + epsilon);
                const dailyInRange = listing.dailyRate !== null &&
                  (filterData.priceMin === undefined || listing.dailyRate >= filterData.priceMin - epsilon) &&
                  (filterData.priceMax === undefined || listing.dailyRate <= filterData.priceMax + epsilon);
                expect(hourlyInRange || dailyInRange).toBe(true);
              }

              // Check with/without driver filter
              if (filterData.withDriver !== undefined) {
                if (filterData.withDriver) {
                  expect(listing.withDriver).toBe(true);
                } else {
                  expect(listing.withoutDriver).toBe(true);
                }
              }

              // Check tags filter (listing must have all specified tags)
              if (filterData.tags && filterData.tags.length > 0) {
                for (const tag of filterData.tags) {
                  expect(listing.tags).toContain(tag);
                }
              }

              // Verify listing is ACTIVE (suspended listings should not appear)
              expect(listing.status).toBe(ListingStatus.ACTIVE);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty results when no listings match all filters', async () => {
      // Create a test company
      const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: uniqueOrgNumber,
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create a vehicle listing with specific attributes
      await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Test Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
      });

      // Search with filters that don't match (use a unique tag to ensure no matches)
      const uniqueTag = `unique-tag-${randomUUID()}`;
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        tags: [uniqueTag], // Tag that doesn't exist
      });

      // Should return no results
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should not return suspended listings in search results', async () => {
      // Create a test company
      const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: uniqueOrgNumber,
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create a unique tag for this test
      const uniqueTag = `test-tag-${randomUUID()}`;

      // Create an active listing with unique tag
      const activeListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Active Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
        tags: [uniqueTag],
      });

      // Create a suspended listing with the same unique tag
      const suspendedListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Suspended Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
        tags: [uniqueTag],
      });

      // Suspend the second listing
      await listingService.updateListingStatus(suspendedListing.id, ListingStatus.SUSPENDED);

      // Search for listings with the unique tag
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        tags: [uniqueTag],
      });

      // Should only return the active listing
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.vehicleListings[0].id).toBe(activeListing.id);
      expect(results.vehicleListings[0].status).toBe(ListingStatus.ACTIVE);
    });
  });

  /**
   * **Feature: vider-transport-marketplace, Property 14: Location-based search accuracy**
   * **Validates: Requirements 6.2**
   * 
   * For any location filter (Fylke, Kommune, or radius), the system must return only 
   * listings within the specified geographic boundaries.
   */
  describe('Property 14: Location-based search accuracy', () => {
    it('should return only listings within specified Fylke', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate companies in different fylker
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
              businessAddress: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              city: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').padStart(4, '1')),
              fylke: fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
              kommune: fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø'),
              vatRegistered: fc.boolean(),
            }),
            { minLength: 3, maxLength: 5 }
          ),
          // Select a fylke to search for
          fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
          async (companiesData, searchFylke) => {
            // Create a unique tag for this test run to isolate results
            const uniqueTag = `test-fylke-${randomUUID()}`;

            // Create companies and listings
            const createdListings = [];
            for (const companyData of companiesData) {
              const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
              const company = await prisma.company.create({
                data: {
                  ...companyData,
                  organizationNumber: uniqueOrgNumber,
                },
              });

              // Create a vehicle listing for this company with unique tag
              const listing = await listingService.createVehicleListing({
                companyId: company.id,
                title: `Vehicle in ${companyData.fylke}`,
                description: 'Test description',
                vehicleType: VehicleType.PALLET_18,
                capacity: 18,
                fuelType: FuelType.DIESEL,
                city: companyData.city,
                fylke: companyData.fylke,
                kommune: companyData.kommune,
                hourlyRate: 100,
                withDriver: true,
                withDriverCost: 50,
                withoutDriver: false,
                tags: [uniqueTag],
              });
              createdListings.push({ listing, fylke: companyData.fylke });
            }

            // Search by fylke with unique tag to isolate results
            const results = await listingService.searchListings({
              listingType: 'vehicle',
              location: { fylke: searchFylke },
              tags: [uniqueTag],
              pageSize: 1000, // Large page size to get all results
            });

            // Verify all returned listings are in the specified fylke
            for (const listing of results.vehicleListings) {
              expect(listing.fylke).toBe(searchFylke);
            }

            // Verify we got all listings from that fylke (accounting for pagination)
            const expectedCount = createdListings.filter(l => l.fylke === searchFylke).length;
            expect(results.total).toBe(expectedCount);
            // The actual returned count should match expected (since we used large page size)
            expect(results.vehicleListings.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only listings within specified Kommune', async () => {
      // Create a test company
      const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: uniqueOrgNumber,
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Create a unique tag for this test
      const uniqueTag = `test-kommune-${randomUUID()}`;

      // Create listings in different kommuner with unique tag
      const osloListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Oslo Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
        tags: [uniqueTag],
      });

      const bergenListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Bergen Vehicle',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Bergen',
        fylke: 'Vestland',
        kommune: 'Bergen',
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
        tags: [uniqueTag],
      });

      // Search by kommune with unique tag
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        location: { kommune: 'Oslo' },
        tags: [uniqueTag],
      });

      // Should only return Oslo listing
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.vehicleListings[0].id).toBe(osloListing.id);
      expect(results.vehicleListings[0].kommune).toBe('Oslo');
    });

    it('should return only listings within specified radius', async () => {
      // Create a test company
      const uniqueOrgNumber = randomUUID().replace(/-/g, '').slice(0, 9);
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: uniqueOrgNumber,
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      // Oslo coordinates: approximately 59.9139° N, 10.7522° E
      const osloCoords: [number, number] = [10.7522, 59.9139];

      // Create a listing near Oslo (within 10km)
      const nearListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Near Oslo',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        latitude: 59.92, // About 1km north
        longitude: 10.75,
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
      });

      // Create a listing far from Oslo (more than 100km)
      const farListing = await listingService.createVehicleListing({
        companyId: company.id,
        title: 'Far from Oslo',
        description: 'Test description',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Bergen',
        fylke: 'Vestland',
        kommune: 'Bergen',
        latitude: 60.39, // Bergen coordinates
        longitude: 5.32,
        hourlyRate: 100,
        withDriver: true,
        withDriverCost: 50,
        withoutDriver: false,
      });

      // Search within 50km radius of Oslo
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        location: {
          radius: 50,
          coordinates: osloCoords,
        },
      });

      // Should only return the near listing
      expect(results.vehicleListings.length).toBeGreaterThan(0);
      const returnedIds = results.vehicleListings.map(l => l.id);
      expect(returnedIds).toContain(nearListing.id);
      expect(returnedIds).not.toContain(farListing.id);
    });

    it('should filter driver listings by company location', async () => {
      // Create companies in different locations
      const uniqueOrgNumber1 = randomUUID().replace(/-/g, '').slice(0, 9);
      const osloCompany = await prisma.company.create({
        data: {
          name: 'Oslo Company',
          organizationNumber: uniqueOrgNumber1,
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const uniqueOrgNumber2 = randomUUID().replace(/-/g, '').slice(0, 9);
      const bergenCompany = await prisma.company.create({
        data: {
          name: 'Bergen Company',
          organizationNumber: uniqueOrgNumber2,
          businessAddress: '456 Test St',
          city: 'Bergen',
          postalCode: '5000',
          fylke: 'Vestland',
          kommune: 'Bergen',
          vatRegistered: true,
        },
      });

      // Create admin user for verification
      const uniqueEmail = `admin-${randomUUID()}@test.com`;
      const adminUser = await prisma.user.create({
        data: {
          email: uniqueEmail,
          passwordHash: 'hashedpassword',
          role: 'PLATFORM_ADMIN',
          companyId: osloCompany.id,
          firstName: 'Admin',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      // Create a unique name pattern for this test
      const uniqueNamePrefix = `Driver-${randomUUID().slice(0, 8)}`;

      // Create driver listings in different locations
      const osloDriver = await listingService.createDriverListing({
        companyId: osloCompany.id,
        name: `${uniqueNamePrefix}-Oslo`,
        licenseClass: 'C',
        languages: ['Norwegian'],
        hourlyRate: 100,
        licenseDocumentPath: '/path/to/license.pdf',
      });

      const bergenDriver = await listingService.createDriverListing({
        companyId: bergenCompany.id,
        name: `${uniqueNamePrefix}-Bergen`,
        licenseClass: 'C',
        languages: ['Norwegian'],
        hourlyRate: 100,
        licenseDocumentPath: '/path/to/license.pdf',
      });

      // Verify both drivers
      await listingService.verifyDriverListing(osloDriver.id, adminUser.id);
      await listingService.verifyDriverListing(bergenDriver.id, adminUser.id);

      // Get both drivers to check their names
      const osloDriverData = await listingService.getDriverListingById(osloDriver.id);
      const bergenDriverData = await listingService.getDriverListingById(bergenDriver.id);

      // Search by fylke
      const results = await listingService.searchListings({
        listingType: 'driver',
        location: { fylke: 'Oslo' },
      });

      // Filter results to only those with our unique name prefix
      const filteredResults = results.driverListings.filter(d => d.name.startsWith(uniqueNamePrefix));

      // Should only return Oslo driver
      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].id).toBe(osloDriver.id);

      // Clean up admin user
      await prisma.user.delete({ where: { id: adminUser.id } });
    });
  });
