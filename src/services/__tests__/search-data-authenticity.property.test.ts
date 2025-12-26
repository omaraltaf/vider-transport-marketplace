import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { ListingService, SearchFilters } from '../listing.service';

// **Feature: mock-data-replacement, Property 10: Historical record accuracy**
// **Validates: Requirements 3.5, 4.3, 12.1, 12.2, 15.1**

const mockPrisma = {
  vehicleListing: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  driverListing: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

const listingService = new ListingService();

// Test data generators
const vehicleListingArb = fc.record({
  id: fc.uuid(),
  companyId: fc.uuid(),
  title: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  vehicleType: fc.constantFrom('TRUCK', 'VAN', 'TRAILER', 'CONTAINER'),
  capacity: fc.integer({ min: 500, max: 40000 }),
  fuelType: fc.constantFrom('DIESEL', 'ELECTRIC', 'HYBRID', 'GASOLINE'),
  city: fc.string({ minLength: 3, maxLength: 30 }),
  fylke: fc.string({ minLength: 3, maxLength: 30 }),
  kommune: fc.string({ minLength: 3, maxLength: 30 }),
  latitude: fc.option(fc.float({ min: 58, max: 72 }), { nil: null }),
  longitude: fc.option(fc.float({ min: 4, max: 32 }), { nil: null }),
  hourlyRate: fc.option(fc.float({ min: 100, max: 2000 }), { nil: null }),
  dailyRate: fc.option(fc.float({ min: 500, max: 10000 }), { nil: null }),
  withDriver: fc.boolean(),
  withoutDriver: fc.boolean(),
  tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 0, maxLength: 5 }),
  status: fc.constantFrom('ACTIVE', 'INACTIVE', 'SUSPENDED'),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const driverListingArb = fc.record({
  id: fc.uuid(),
  companyId: fc.uuid(),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  licenseClass: fc.constantFrom('B', 'C', 'CE', 'D'),
  languages: fc.array(fc.constantFrom('Norwegian', 'English', 'Swedish', 'Danish'), { minLength: 1, maxLength: 3 }),
  hourlyRate: fc.option(fc.float({ min: 200, max: 800 }), { nil: null }),
  dailyRate: fc.option(fc.float({ min: 1000, max: 5000 }), { nil: null }),
  status: fc.constantFrom('ACTIVE', 'INACTIVE', 'SUSPENDED'),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const searchFiltersArb = fc.record({
  listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
  location: fc.option(fc.record({
    fylke: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: undefined }),
    kommune: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: undefined }),
    radius: fc.option(fc.float({ min: 1, max: 100 }), { nil: undefined }),
    coordinates: fc.option(fc.tuple(fc.float({ min: 4, max: 32 }), fc.float({ min: 58, max: 72 })), { nil: undefined }),
  }), { nil: undefined }),
  vehicleType: fc.option(fc.array(fc.constantFrom('TRUCK', 'VAN', 'TRAILER', 'CONTAINER'), { minLength: 1, maxLength: 3 }), { nil: undefined }),
  fuelType: fc.option(fc.array(fc.constantFrom('DIESEL', 'ELECTRIC', 'HYBRID', 'GASOLINE'), { minLength: 1, maxLength: 2 }), { nil: undefined }),
  capacity: fc.option(fc.record({
    min: fc.option(fc.integer({ min: 500, max: 20000 }), { nil: undefined }),
    max: fc.option(fc.integer({ min: 20000, max: 40000 }), { nil: undefined }),
  }), { nil: undefined }),
  priceRange: fc.option(fc.record({
    min: fc.option(fc.float({ min: 100, max: 1000 }), { nil: undefined }),
    max: fc.option(fc.float({ min: 1000, max: 5000 }), { nil: undefined }),
  }), { nil: undefined }),
  withDriver: fc.option(fc.boolean(), { nil: undefined }),
  tags: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 1, maxLength: 3 }), { nil: undefined }),
  page: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  pageSize: fc.option(fc.integer({ min: 5, max: 50 }), { nil: undefined }),
  sortBy: fc.option(fc.constantFrom('createdAt', 'hourlyRate', 'dailyRate', 'rating'), { nil: undefined }),
  sortOrder: fc.option(fc.constantFrom('asc', 'desc'), { nil: undefined }),
});

describe('Search Data Authenticity Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ensure search results come from database queries', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 20 }),
      fc.array(driverListingArb, { minLength: 0, maxLength: 10 }),
      searchFiltersArb,
      async (vehicleListings, driverListings, filters) => {
        // Arrange - Filter to only active listings
        const activeVehicles = vehicleListings.map(v => ({ ...v, status: ListingStatus.ACTIVE }));
        const activeDrivers = driverListings.map(d => ({ ...d, status: ListingStatus.ACTIVE }));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(activeVehicles);
        mockPrisma.vehicleListing.count.mockResolvedValue(activeVehicles.length);
        mockPrisma.driverListing.findMany.mockResolvedValue(activeDrivers);
        mockPrisma.driverListing.count.mockResolvedValue(activeDrivers.length);

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database for active listings
        if (!filters.listingType || filters.listingType === 'vehicle' || filters.listingType === 'vehicle_driver') {
          expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                status: ListingStatus.ACTIVE,
              }),
            })
          );
        }

        if (!filters.listingType || filters.listingType === 'driver' || filters.listingType === 'vehicle_driver') {
          expect(mockPrisma.driverListing.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                status: ListingStatus.ACTIVE,
              }),
            })
          );
        }

        // All returned results should match database records
        result.vehicleListings.forEach(listing => {
          const dbListing = activeVehicles.find(v => v.id === listing.id);
          expect(dbListing).toBeDefined();
          if (dbListing) {
            expect(listing.title).toBe(dbListing.title);
            expect(listing.vehicleType).toBe(dbListing.vehicleType);
            expect(listing.status).toBe(dbListing.status);
          }
        });

        result.driverListings.forEach(listing => {
          const dbListing = activeDrivers.find(d => d.id === listing.id);
          expect(dbListing).toBeDefined();
          if (dbListing) {
            expect(listing.name).toBe(dbListing.name);
            expect(listing.licenseClass).toBe(dbListing.licenseClass);
            expect(listing.status).toBe(dbListing.status);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure location-based search uses database coordinates', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 15 }),
      fc.string({ minLength: 3, maxLength: 20 }),
      async (vehicleListings, fylke) => {
        // Arrange - Set specific fylke for listings
        const listingsWithLocation = vehicleListings.map(v => ({
          ...v,
          fylke,
          status: ListingStatus.ACTIVE,
        }));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(listingsWithLocation);
        mockPrisma.vehicleListing.count.mockResolvedValue(listingsWithLocation.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          location: { fylke },
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with location filter
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ListingStatus.ACTIVE,
              fylke,
            }),
          })
        );

        // All returned listings should have the correct fylke
        result.vehicleListings.forEach(listing => {
          expect(listing.fylke).toBe(fylke);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure vehicle type filtering uses database values', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 15 }),
      fc.array(fc.constantFrom('TRUCK', 'VAN', 'TRAILER', 'CONTAINER'), { minLength: 1, maxLength: 2 }),
      async (vehicleListings, vehicleTypes) => {
        // Arrange - Set specific vehicle types
        const filteredListings = vehicleListings
          .map(v => ({ ...v, status: ListingStatus.ACTIVE }))
          .filter(v => vehicleTypes.includes(v.vehicleType as VehicleType));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(filteredListings);
        mockPrisma.vehicleListing.count.mockResolvedValue(filteredListings.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          vehicleType: vehicleTypes as VehicleType[],
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with vehicle type filter
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ListingStatus.ACTIVE,
              vehicleType: { in: vehicleTypes },
            }),
          })
        );

        // All returned listings should have one of the specified vehicle types
        result.vehicleListings.forEach(listing => {
          expect(vehicleTypes).toContain(listing.vehicleType);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure price range filtering uses database rates', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 15 }),
      fc.float({ min: 100, max: 1000 }),
      fc.float({ min: 1000, max: 5000 }),
      async (vehicleListings, minPrice, maxPrice) => {
        // Arrange - Ensure some listings have rates in range
        const listingsWithRates = vehicleListings.map((v, index) => ({
          ...v,
          status: ListingStatus.ACTIVE,
          hourlyRate: index % 2 === 0 ? minPrice + 100 : null,
          dailyRate: index % 2 === 1 ? minPrice + 500 : null,
        }));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(listingsWithRates);
        mockPrisma.vehicleListing.count.mockResolvedValue(listingsWithRates.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          priceRange: { min: minPrice, max: maxPrice },
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with price range filter
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ListingStatus.ACTIVE,
              OR: [
                { hourlyRate: { gte: minPrice, lte: maxPrice } },
                { dailyRate: { gte: minPrice, lte: maxPrice } },
              ],
            }),
          })
        );

        // All returned listings should have at least one rate in range
        result.vehicleListings.forEach(listing => {
          const hourlyInRange = listing.hourlyRate !== null && 
            listing.hourlyRate >= minPrice && listing.hourlyRate <= maxPrice;
          const dailyInRange = listing.dailyRate !== null && 
            listing.dailyRate >= minPrice && listing.dailyRate <= maxPrice;
          
          expect(hourlyInRange || dailyInRange).toBe(true);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure capacity filtering uses database values', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 15 }),
      fc.integer({ min: 1000, max: 10000 }),
      fc.integer({ min: 10000, max: 30000 }),
      async (vehicleListings, minCapacity, maxCapacity) => {
        // Arrange - Set capacities within range
        const listingsWithCapacity = vehicleListings.map(v => ({
          ...v,
          status: ListingStatus.ACTIVE,
          capacity: minCapacity + Math.floor(Math.random() * (maxCapacity - minCapacity)),
        }));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(listingsWithCapacity);
        mockPrisma.vehicleListing.count.mockResolvedValue(listingsWithCapacity.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          capacity: { min: minCapacity, max: maxCapacity },
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with capacity filter
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ListingStatus.ACTIVE,
              capacity: { gte: minCapacity, lte: maxCapacity },
            }),
          })
        );

        // All returned listings should have capacity in range
        result.vehicleListings.forEach(listing => {
          expect(listing.capacity).toBeGreaterThanOrEqual(minCapacity);
          expect(listing.capacity).toBeLessThanOrEqual(maxCapacity);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure tag filtering uses database tag arrays', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 1, maxLength: 10 }),
      fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
      async (vehicleListings, searchTags) => {
        // Arrange - Ensure some listings have all required tags
        const listingsWithTags = vehicleListings.map((v, index) => ({
          ...v,
          status: ListingStatus.ACTIVE,
          tags: index % 2 === 0 ? [...searchTags, 'extra-tag'] : searchTags,
        }));

        mockPrisma.vehicleListing.findMany.mockResolvedValue(listingsWithTags);
        mockPrisma.vehicleListing.count.mockResolvedValue(listingsWithTags.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          tags: searchTags,
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with tags filter
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: ListingStatus.ACTIVE,
              tags: { hasEvery: searchTags },
            }),
          })
        );

        // All returned listings should have all required tags
        result.vehicleListings.forEach(listing => {
          searchTags.forEach(tag => {
            expect(listing.tags).toContain(tag);
          });
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure pagination uses database offset and limit', () => {
    fc.assert(fc.property(
      fc.array(vehicleListingArb, { minLength: 10, maxLength: 50 }),
      fc.integer({ min: 1, max: 5 }),
      fc.integer({ min: 5, max: 15 }),
      async (vehicleListings, page, pageSize) => {
        // Arrange
        const activeListings = vehicleListings.map(v => ({ ...v, status: ListingStatus.ACTIVE }));
        const expectedSkip = (page - 1) * pageSize;

        mockPrisma.vehicleListing.findMany.mockResolvedValue(activeListings.slice(expectedSkip, expectedSkip + pageSize));
        mockPrisma.vehicleListing.count.mockResolvedValue(activeListings.length);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.count.mockResolvedValue(0);

        const filters: SearchFilters = {
          page,
          pageSize,
        };

        // Act
        const result = await listingService.searchListings(filters);

        // Assert - Should query database with correct skip and take
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: expectedSkip,
            take: pageSize,
          })
        );

        // Result should have correct pagination metadata
        expect(result.pagination.page).toBe(page);
        expect(result.pagination.pageSize).toBe(pageSize);
        expect(result.pagination.total).toBe(activeListings.length);
      }
    ), { numRuns: 100 });
  });
});