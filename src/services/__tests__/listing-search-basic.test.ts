import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { listingService } from '../listing.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Basic Search Functionality Tests', () => {
  let testCompany: any;
  let testVehicleListing: any;
  let testDriverListing: any;

  beforeEach(async () => {
    // Create test company
    testCompany = await prisma.company.create({
      data: {
        name: 'Test Transport Company',
        organizationNumber: randomUUID().replace(/-/g, '').slice(0, 9),
        businessAddress: 'Test Address 123',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        verified: true,
        aggregatedRating: 4.5,
      },
    });

    // Create test vehicle listing
    testVehicleListing = await prisma.vehicleListing.create({
      data: {
        companyId: testCompany.id,
        title: 'Test Vehicle',
        description: 'A reliable test vehicle for transportation',
        vehicleType: VehicleType.PALLET_8,
        capacity: 8,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        latitude: 59.9139,
        longitude: 10.7522,
        hourlyRate: 150,
        dailyRate: 1200,
        deposit: 500,
        currency: 'NOK',
        withDriver: true,
        withDriverCost: 200,
        withoutDriver: true,
        photos: ['/test/photo1.jpg'],
        tags: ['reliable', 'spacious'],
        status: ListingStatus.ACTIVE,
      },
    });

    // Create test driver listing
    testDriverListing = await prisma.driverListing.create({
      data: {
        companyId: testCompany.id,
        name: 'Test Driver',
        licenseClass: 'B',
        languages: ['Norwegian', 'English'],
        backgroundSummary: 'Experienced professional driver',
        hourlyRate: 300,
        dailyRate: 2400,
        currency: 'NOK',
        licenseDocumentPath: '/test/license.pdf',
        verified: true,
        status: ListingStatus.ACTIVE,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order to respect foreign key constraints
    await prisma.driverListing.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  });

  describe('Search with no filters', () => {
    it('should return all active listings when no filters are applied', async () => {
      // Act
      const results = await listingService.searchListings({});

      // Assert
      expect(results).toBeDefined();
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
      expect(results.total).toBe(2);
      expect(results.page).toBe(1);
      expect(results.pageSize).toBe(20);
      expect(results.totalPages).toBe(1);

      // Verify vehicle listing data
      const vehicleListing = results.vehicleListings[0];
      expect(vehicleListing.id).toBe(testVehicleListing.id);
      expect(vehicleListing.title).toBe('Test Vehicle');
      expect(vehicleListing.description).toBe('A reliable test vehicle for transportation');

      // Verify driver listing data
      const driverListing = results.driverListings[0];
      expect(driverListing.id).toBe(testDriverListing.id);
      expect(driverListing.name).toBe('Test Driver');
      expect(driverListing.verified).toBe(true);
    });
  });

  describe('Location filter tests', () => {
    it('should filter by fylke correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        location: { fylke: 'Oslo' }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
      expect(results.vehicleListings[0].id).toBe(testVehicleListing.id);
    });

    it('should return empty results for non-matching fylke', async () => {
      // Act
      const results = await listingService.searchListings({
        location: { fylke: 'Bergen' }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should filter by kommune correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        location: { kommune: 'Oslo' }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
      expect(results.vehicleListings[0].id).toBe(testVehicleListing.id);
    });

    it('should return empty results for non-matching kommune', async () => {
      // Act
      const results = await listingService.searchListings({
        location: { kommune: 'Trondheim' }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });
  });

  describe('Vehicle type filter tests', () => {
    it('should filter by vehicle type correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        vehicleType: [VehicleType.PALLET_8]
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.vehicleListings[0].vehicleType).toBe(VehicleType.PALLET_8);
    });

    it('should return empty results for non-matching vehicle type', async () => {
      // Act
      const results = await listingService.searchListings({
        vehicleType: [VehicleType.TRAILER]
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should handle multiple vehicle types', async () => {
      // Act
      const results = await listingService.searchListings({
        vehicleType: [VehicleType.PALLET_8, VehicleType.TRAILER]
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.vehicleListings[0].vehicleType).toBe(VehicleType.PALLET_8);
    });
  });

  describe('Price range filter tests', () => {
    it('should filter by minimum price correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        priceRange: { min: 100 }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
    });

    it('should filter by maximum price correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        priceRange: { max: 200 }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1); // hourlyRate is 150
      expect(results.driverListings).toHaveLength(0); // hourlyRate is 300
    });

    it('should filter by price range correctly', async () => {
      // Act
      const results = await listingService.searchListings({
        priceRange: { min: 100, max: 200 }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1); // hourlyRate is 150
      expect(results.driverListings).toHaveLength(0); // hourlyRate is 300
    });

    it('should return empty results when price range excludes all listings', async () => {
      // Act
      const results = await listingService.searchListings({
        priceRange: { min: 5000, max: 10000 }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });
  });

  describe('Listing type filter tests', () => {
    it('should return only vehicle listings when listingType is vehicle', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle'
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(1);
    });

    it('should return only driver listings when listingType is driver', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'driver'
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.driverListings).toHaveLength(1);
      expect(results.total).toBe(1);
    });

    it('should return both types when listingType is vehicle_driver', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle_driver'
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
      expect(results.total).toBe(2);
    });
  });

  describe('Combined filter tests', () => {
    it('should apply multiple filters with AND logic', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        location: { fylke: 'Oslo' },
        vehicleType: [VehicleType.PALLET_8],
        priceRange: { min: 100, max: 200 }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(1);
      
      const listing = results.vehicleListings[0];
      expect(listing.id).toBe(testVehicleListing.id);
      expect(listing.vehicleType).toBe(VehicleType.PALLET_8);
    });

    it('should return empty results when combined filters exclude all listings', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        location: { fylke: 'Bergen' }, // Different fylke
        vehicleType: [VehicleType.PALLET_8]
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(0);
      expect(results.driverListings).toHaveLength(0);
      expect(results.total).toBe(0);
    });
  });
});