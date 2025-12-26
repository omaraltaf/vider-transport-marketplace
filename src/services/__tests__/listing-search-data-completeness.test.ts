import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { listingService } from '../listing.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

describe('Search Result Data Completeness Tests', () => {
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

    // Create test vehicle listing with all required fields
    testVehicleListing = await prisma.vehicleListing.create({
      data: {
        companyId: testCompany.id,
        title: 'Premium Van Service',
        description: 'A reliable and spacious van for all your transportation needs',
        vehicleType: VehicleType.PALLET_8,
        capacity: 8,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        latitude: 59.9139,
        longitude: 10.7522,
        hourlyRate: 250,
        dailyRate: 1800,
        deposit: 1000,
        currency: 'NOK',
        withDriver: true,
        withDriverCost: 300,
        withoutDriver: true,
        photos: ['/uploads/van1.jpg', '/uploads/van2.jpg'],
        tags: ['reliable', 'spacious', 'professional'],
        status: ListingStatus.ACTIVE,
      },
    });

    // Create test driver listing with all required fields
    testDriverListing = await prisma.driverListing.create({
      data: {
        companyId: testCompany.id,
        name: 'Professional Driver',
        licenseClass: 'B+',
        languages: ['Norwegian', 'English', 'German'],
        backgroundSummary: 'Experienced professional driver with 10+ years of experience',
        hourlyRate: 400,
        dailyRate: 3200,
        currency: 'NOK',
        licenseDocumentPath: '/uploads/license.pdf',
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

  describe('Vehicle listing data completeness', () => {
    it('should return all required fields for vehicle listings', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle'
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      const listing = results.vehicleListings[0];

      // Essential listing information
      expect(listing.id).toBeDefined();
      expect(listing.title).toBe('Premium Van Service');
      expect(listing.description).toBe('A reliable and spacious van for all your transportation needs');
      
      // Vehicle specifications
      expect(listing.vehicleType).toBe(VehicleType.PALLET_8);
      expect(listing.capacity).toBe(8);
      expect(listing.fuelType).toBe(FuelType.DIESEL);

      // Location information (raw database structure)
      expect(listing.city).toBe('Oslo');
      expect(listing.fylke).toBe('Oslo');
      expect(listing.kommune).toBe('Oslo');
      expect(listing.latitude).toBe(59.9139);
      expect(listing.longitude).toBe(10.7522);

      // Pricing information (raw database structure)
      expect(listing.hourlyRate).toBe(250);
      expect(listing.dailyRate).toBe(1800);
      expect(listing.deposit).toBe(1000);
      expect(listing.currency).toBe('NOK');

      // Service offerings (raw database structure)
      expect(listing.withDriver).toBe(true);
      expect(listing.withDriverCost).toBe(300);
      expect(listing.withoutDriver).toBe(true);

      // Additional information
      expect(listing.photos).toEqual(['/uploads/van1.jpg', '/uploads/van2.jpg']);
      expect(listing.tags).toEqual(['reliable', 'spacious', 'professional']);
      expect(listing.status).toBe(ListingStatus.ACTIVE);

      // Timestamps (raw Date objects)
      expect(listing.createdAt).toBeInstanceOf(Date);
      expect(listing.updatedAt).toBeInstanceOf(Date);

      // Company information
      expect(listing.company).toBeDefined();
      expect(listing.company.id).toBe(testCompany.id);
      expect(listing.company.name).toBe('Test Transport Company');
      expect(listing.company.verified).toBe(true);
      expect(listing.company.aggregatedRating).toBe(4.5);
    });

    it('should handle vehicle listings with minimal required fields', async () => {
      // Create a minimal vehicle listing
      const minimalListing = await prisma.vehicleListing.create({
        data: {
          companyId: testCompany.id,
          title: 'Basic Car',
          description: 'Simple transportation',
          vehicleType: VehicleType.OTHER,
          capacity: 4,
          fuelType: FuelType.ELECTRIC,
          city: 'Bergen',
          fylke: 'Vestland',
          kommune: 'Bergen',
          hourlyRate: 150,
          currency: 'NOK',
          withDriver: false,
          withoutDriver: true,
          photos: [],
          tags: [],
          status: ListingStatus.ACTIVE,
        },
      });

      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle',
        location: { fylke: 'Vestland' }
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      const listing = results.vehicleListings[0];

      // Required fields should be present
      expect(listing.id).toBeDefined();
      expect(listing.title).toBe('Basic Car');
      expect(listing.description).toBe('Simple transportation');
      expect(listing.vehicleType).toBe(VehicleType.OTHER);
      expect(listing.capacity).toBe(4);
      expect(listing.fuelType).toBe(FuelType.ELECTRIC);

      // Optional fields should be handled gracefully
      expect(listing.latitude).toBeNull();
      expect(listing.longitude).toBeNull();
      expect(listing.dailyRate).toBeNull();
      expect(listing.deposit).toBeNull();
      expect(listing.withDriverCost).toBeNull();
      expect(listing.photos).toEqual([]);
      expect(listing.tags).toEqual([]);

      // Clean up
      await prisma.vehicleListing.delete({ where: { id: minimalListing.id } });
    });
  });

  describe('Driver listing data completeness', () => {
    it('should return all required fields for driver listings', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'driver'
      });

      // Assert
      expect(results.driverListings).toHaveLength(1);
      const listing = results.driverListings[0];

      // Essential listing information
      expect(listing.id).toBeDefined();
      expect(listing.name).toBe('Professional Driver');
      expect(listing.licenseClass).toBe('B+');
      expect(listing.languages).toEqual(['Norwegian', 'English', 'German']);
      expect(listing.backgroundSummary).toBe('Experienced professional driver with 10+ years of experience');

      // Pricing information (raw database structure)
      expect(listing.hourlyRate).toBe(400);
      expect(listing.dailyRate).toBe(3200);
      expect(listing.currency).toBe('NOK');

      // Verification status
      expect(listing.verified).toBe(true);
      expect(listing.status).toBe(ListingStatus.ACTIVE);

      // Timestamps (raw Date objects)
      expect(listing.createdAt).toBeInstanceOf(Date);
      expect(listing.updatedAt).toBeInstanceOf(Date);

      // Company information
      expect(listing.company).toBeDefined();
      expect(listing.company.id).toBe(testCompany.id);
      expect(listing.company.name).toBe('Test Transport Company');
      expect(listing.company.verified).toBe(true);
      expect(listing.company.aggregatedRating).toBe(4.5);
    });

    it('should handle driver listings with minimal required fields', async () => {
      // Create a minimal driver listing
      const minimalListing = await prisma.driverListing.create({
        data: {
          companyId: testCompany.id,
          name: 'Basic Driver',
          licenseClass: 'B',
          languages: ['Norwegian'],
          hourlyRate: 200,
          currency: 'NOK',
          verified: true,
          status: ListingStatus.ACTIVE,
        },
      });

      // Act
      const results = await listingService.searchListings({
        listingType: 'driver'
      });

      // Assert - Should find both drivers
      expect(results.driverListings).toHaveLength(2);
      
      const basicDriver = results.driverListings.find(d => d.name === 'Basic Driver');
      expect(basicDriver).toBeDefined();

      // Required fields should be present
      expect(basicDriver!.id).toBeDefined();
      expect(basicDriver!.name).toBe('Basic Driver');
      expect(basicDriver!.licenseClass).toBe('B');
      expect(basicDriver!.languages).toEqual(['Norwegian']);
      expect(basicDriver!.verified).toBe(true);

      // Optional fields should be handled gracefully
      expect(basicDriver!.backgroundSummary).toBeNull();
      expect(basicDriver!.dailyRate).toBeNull();

      // Clean up
      await prisma.driverListing.delete({ where: { id: minimalListing.id } });
    });
  });

  describe('Mixed search results data completeness', () => {
    it('should return complete data for both vehicle and driver listings', async () => {
      // Act
      const results = await listingService.searchListings({
        listingType: 'vehicle_driver'
      });

      // Assert
      expect(results.vehicleListings).toHaveLength(1);
      expect(results.driverListings).toHaveLength(1);
      expect(results.total).toBe(2);

      // Verify vehicle listing completeness
      const vehicleListing = results.vehicleListings[0];
      expect(vehicleListing.title).toBeDefined();
      expect(vehicleListing.description).toBeDefined();
      expect(vehicleListing.hourlyRate).toBeDefined();
      expect(vehicleListing.city).toBeDefined();
      expect(vehicleListing.company).toBeDefined();

      // Verify driver listing completeness
      const driverListing = results.driverListings[0];
      expect(driverListing.name).toBeDefined();
      expect(driverListing.licenseClass).toBeDefined();
      expect(driverListing.languages).toBeDefined();
      expect(driverListing.hourlyRate).toBeDefined();
      expect(driverListing.company).toBeDefined();
    });
  });

  describe('Company information completeness', () => {
    it('should include complete company information for all listings', async () => {
      // Act
      const results = await listingService.searchListings({});

      // Assert
      expect(results.total).toBeGreaterThan(0);

      // Check vehicle listings
      results.vehicleListings.forEach(listing => {
        expect(listing.company).toBeDefined();
        expect(listing.company.id).toBeDefined();
        expect(listing.company.name).toBeDefined();
        expect(typeof listing.company.verified).toBe('boolean');
        expect(typeof listing.company.aggregatedRating).toBe('number');
      });

      // Check driver listings
      results.driverListings.forEach(listing => {
        expect(listing.company).toBeDefined();
        expect(listing.company.id).toBeDefined();
        expect(listing.company.name).toBeDefined();
        expect(typeof listing.company.verified).toBe('boolean');
        expect(typeof listing.company.aggregatedRating).toBe('number');
      });
    });
  });

  describe('Data type validation', () => {
    it('should return correct data types for all fields', async () => {
      // Act
      const results = await listingService.searchListings({});

      // Assert vehicle listing data types
      results.vehicleListings.forEach(listing => {
        expect(typeof listing.id).toBe('string');
        expect(typeof listing.title).toBe('string');
        expect(typeof listing.description).toBe('string');
        expect(typeof listing.capacity).toBe('number');
        expect(typeof listing.status).toBe('string');
        expect(typeof listing.createdAt).toBe('object'); // Date object
        expect(typeof listing.updatedAt).toBe('object'); // Date object
        expect(Array.isArray(listing.photos)).toBe(true);
        expect(Array.isArray(listing.tags)).toBe(true);
        
        if (listing.hourlyRate !== null) {
          expect(typeof listing.hourlyRate).toBe('number');
        }
        if (listing.dailyRate !== null) {
          expect(typeof listing.dailyRate).toBe('number');
        }
      });

      // Assert driver listing data types
      results.driverListings.forEach(listing => {
        expect(typeof listing.id).toBe('string');
        expect(typeof listing.name).toBe('string');
        expect(typeof listing.licenseClass).toBe('string');
        expect(typeof listing.verified).toBe('boolean');
        expect(typeof listing.status).toBe('string');
        expect(typeof listing.createdAt).toBe('object'); // Date object
        expect(typeof listing.updatedAt).toBe('object'); // Date object
        expect(Array.isArray(listing.languages)).toBe(true);
        
        if (listing.hourlyRate !== null) {
          expect(typeof listing.hourlyRate).toBe('number');
        }
        if (listing.dailyRate !== null) {
          expect(typeof listing.dailyRate).toBe('number');
        }
      });
    });
  });
});