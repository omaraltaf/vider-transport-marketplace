import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, BookingStatus, VehicleType, FuelType, ListingStatus, Role } from '@prisma/client';
import { RatingService } from './rating.service';

const prisma = new PrismaClient();
const ratingService = new RatingService();

// Helper function to create a test company
async function createTestCompany(orgNumber: string) {
  return prisma.company.create({
    data: {
      name: `Test Company ${orgNumber}`,
      organizationNumber: orgNumber,
      businessAddress: '123 Test St',
      city: 'Oslo',
      postalCode: '0001',
      fylke: 'Oslo',
      kommune: 'Oslo',
      vatRegistered: true,
    },
  });
}

// Helper function to create a test user
async function createTestUser(companyId: string, email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: 'hashedpassword',
      role: Role.COMPANY_ADMIN,
      companyId,
      firstName: 'Test',
      lastName: 'User',
      phone: '+4712345678',
      emailVerified: true,
    },
  });
}

// Helper function to create a test vehicle listing
async function createTestVehicleListing(companyId: string) {
  return prisma.vehicleListing.create({
    data: {
      companyId,
      title: 'Test Vehicle',
      description: 'Test Description',
      vehicleType: VehicleType.PALLET_18,
      capacity: 18,
      fuelType: FuelType.DIESEL,
      city: 'Oslo',
      fylke: 'Oslo',
      kommune: 'Oslo',
      hourlyRate: 500,
      dailyRate: 3000,
      currency: 'NOK',
      withDriver: false,
      withoutDriver: true,
      photos: [],
      tags: [],
      status: ListingStatus.ACTIVE,
    },
  });
}

// Helper function to create a test driver listing
async function createTestDriverListing(companyId: string) {
  return prisma.driverListing.create({
    data: {
      companyId,
      name: 'Test Driver',
      licenseClass: 'CE',
      languages: ['Norwegian', 'English'],
      hourlyRate: 300,
      dailyRate: 2000,
      currency: 'NOK',
      verified: true,
      status: ListingStatus.ACTIVE,
    },
  });
}

// Helper function to create a completed booking
async function createCompletedBooking(
  renterCompanyId: string,
  providerCompanyId: string,
  vehicleListingId?: string,
  driverListingId?: string
) {
  const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // +1 day

  return prisma.booking.create({
    data: {
      bookingNumber,
      renterCompanyId,
      providerCompanyId,
      vehicleListingId,
      driverListingId,
      status: BookingStatus.COMPLETED,
      startDate,
      endDate,
      durationDays: 1,
      providerRate: 3000,
      platformCommission: 150,
      platformCommissionRate: 5,
      taxes: 787.5,
      taxRate: 25,
      total: 3937.5,
      currency: 'NOK',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: new Date(),
    },
  });
}

describe('RatingService', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  describe('Property 25: Rating aggregation accuracy', () => {
    /**
     * Feature: vider-transport-marketplace, Property 25: Rating aggregation accuracy
     * Validates: Requirements 12.4
     * 
     * For any entity (company or driver) with multiple ratings,
     * the aggregated rating must equal the arithmetic mean of all submitted star ratings.
     */
    it('should calculate aggregated rating as arithmetic mean of all ratings', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of 1-10 ratings, each between 1-5 stars
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
          async (ratings) => {
            // Create test companies
            const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
            const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

            // Create a vehicle listing
            const vehicleListing = await createTestVehicleListing(providerCompany.id);

            // Create completed bookings and submit ratings
            for (const stars of ratings) {
              const booking = await createCompletedBooking(
                renterCompany.id,
                providerCompany.id,
                vehicleListing.id
              );

              await ratingService.submitRating(booking.id, renterCompany.id, {
                companyStars: stars,
              });
            }

            // Get the updated company with aggregated rating
            const updatedCompany = await prisma.company.findUnique({
              where: { id: providerCompany.id },
            });

            // Calculate expected average
            const expectedAverage = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

            // Verify aggregated rating equals arithmetic mean
            expect(updatedCompany?.aggregatedRating).toBeCloseTo(expectedAverage, 10);
            expect(updatedCompany?.totalRatings).toBe(ratings.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate driver aggregated rating as arithmetic mean of all driver ratings', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate an array of 1-10 ratings, each between 1-5 stars
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
          async (ratings) => {
            // Create test companies
            const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
            const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

            // Create a driver listing
            const driverListing = await createTestDriverListing(providerCompany.id);

            // Create completed bookings and submit ratings
            for (const stars of ratings) {
              const booking = await createCompletedBooking(
                renterCompany.id,
                providerCompany.id,
                undefined,
                driverListing.id
              );

              await ratingService.submitRating(booking.id, renterCompany.id, {
                companyStars: 5, // Company rating (not testing this)
                driverStars: stars,
              });
            }

            // Get the updated driver with aggregated rating
            const updatedDriver = await prisma.driverListing.findUnique({
              where: { id: driverListing.id },
            });

            // Calculate expected average
            const expectedAverage = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

            // Verify aggregated rating equals arithmetic mean
            expect(updatedDriver?.aggregatedRating).toBeCloseTo(expectedAverage, 10);
            expect(updatedDriver?.totalRatings).toBe(ratings.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Rating range validation', () => {
    /**
     * Feature: vider-transport-marketplace, Property 26: Rating range validation
     * Validates: Requirements 12.2
     * 
     * For any rating submission, the star rating values must be integers between 1 and 5 inclusive,
     * otherwise the submission must be rejected.
     */
    it('should reject ratings outside the 1-5 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate integers outside the valid range
          fc.oneof(
            fc.integer({ max: 0 }), // Less than 1
            fc.integer({ min: 6 })  // Greater than 5
          ),
          async (invalidStars) => {
            // Create test companies
            const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
            const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

            // Create a vehicle listing
            const vehicleListing = await createTestVehicleListing(providerCompany.id);

            // Create a completed booking
            const booking = await createCompletedBooking(
              renterCompany.id,
              providerCompany.id,
              vehicleListing.id
            );

            // Attempt to submit rating with invalid stars
            await expect(
              ratingService.submitRating(booking.id, renterCompany.id, {
                companyStars: invalidStars,
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept ratings within the 1-5 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid integers between 1 and 5
          fc.integer({ min: 1, max: 5 }),
          async (validStars) => {
            // Create test companies
            const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
            const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

            // Create a vehicle listing
            const vehicleListing = await createTestVehicleListing(providerCompany.id);

            // Create a completed booking
            const booking = await createCompletedBooking(
              renterCompany.id,
              providerCompany.id,
              vehicleListing.id
            );

            // Submit rating with valid stars
            const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
              companyStars: validStars,
            });

            // Verify rating was created successfully
            expect(rating).toBeDefined();
            expect(rating.companyStars).toBe(validStars);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-integer ratings', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Attempt to submit rating with non-integer stars
      await expect(
        ratingService.submitRating(booking.id, renterCompany.id, {
          companyStars: 3.5 as any,
        })
      ).rejects.toThrow('COMPANY_STARS_MUST_BE_INTEGER');
    });

    it('should reject driver ratings outside the 1-5 range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate integers outside the valid range
          fc.oneof(
            fc.integer({ max: 0 }), // Less than 1
            fc.integer({ min: 6 })  // Greater than 5
          ),
          async (invalidStars) => {
            // Create test companies
            const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
            const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

            // Create a driver listing
            const driverListing = await createTestDriverListing(providerCompany.id);

            // Create a completed booking
            const booking = await createCompletedBooking(
              renterCompany.id,
              providerCompany.id,
              undefined,
              driverListing.id
            );

            // Attempt to submit rating with invalid driver stars
            await expect(
              ratingService.submitRating(booking.id, renterCompany.id, {
                companyStars: 5,
                driverStars: invalidStars,
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests - Rating submission', () => {
    it('should submit a rating for a completed booking', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Submit rating
      const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 5,
        companyReview: 'Excellent service!',
      });

      expect(rating).toBeDefined();
      expect(rating.companyStars).toBe(5);
      expect(rating.companyReview).toBe('Excellent service!');
      expect(rating.bookingId).toBe(booking.id);
    });

    it('should reject rating for non-completed booking', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a pending booking (not completed)
      const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          renterCompanyId: renterCompany.id,
          providerCompanyId: providerCompany.id,
          vehicleListingId: vehicleListing.id,
          status: BookingStatus.PENDING,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          durationDays: 1,
          providerRate: 3000,
          platformCommission: 150,
          platformCommissionRate: 5,
          taxes: 787.5,
          taxRate: 25,
          total: 3937.5,
          currency: 'NOK',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Attempt to submit rating
      await expect(
        ratingService.submitRating(booking.id, renterCompany.id, {
          companyStars: 5,
        })
      ).rejects.toThrow('BOOKING_NOT_COMPLETED');
    });

    it('should reject duplicate ratings', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Submit first rating
      await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 5,
      });

      // Attempt to submit second rating
      await expect(
        ratingService.submitRating(booking.id, renterCompany.id, {
          companyStars: 4,
        })
      ).rejects.toThrow('RATING_ALREADY_EXISTS');
    });

    it('should reject unauthorized rating submission', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);
      const unauthorizedCompany = await createTestCompany(`ORG-UNAUTH-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Attempt to submit rating from unauthorized company
      await expect(
        ratingService.submitRating(booking.id, unauthorizedCompany.id, {
          companyStars: 5,
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('should submit rating with both company and driver stars', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a driver listing
      const driverListing = await createTestDriverListing(providerCompany.id);

      // Create a completed booking with driver
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        undefined,
        driverListing.id
      );

      // Submit rating
      const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 5,
        companyReview: 'Great company!',
        driverStars: 4,
        driverReview: 'Good driver!',
      });

      expect(rating.companyStars).toBe(5);
      expect(rating.driverStars).toBe(4);
      expect(rating.companyReview).toBe('Great company!');
      expect(rating.driverReview).toBe('Good driver!');
    });
  });

  describe('Unit Tests - Provider response', () => {
    it('should allow provider to respond to review', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Submit rating
      const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 4,
        companyReview: 'Good service',
      });

      // Provider responds
      const updatedRating = await ratingService.respondToReview(
        rating.id,
        providerCompany.id,
        'Thank you for your feedback!'
      );

      expect(updatedRating.providerResponse).toBe('Thank you for your feedback!');
      expect(updatedRating.providerRespondedAt).toBeDefined();
    });

    it('should reject unauthorized provider response', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);
      const unauthorizedCompany = await createTestCompany(`ORG-UNAUTH-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Submit rating
      const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 4,
      });

      // Unauthorized company attempts to respond
      await expect(
        ratingService.respondToReview(rating.id, unauthorizedCompany.id, 'Response')
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('should reject duplicate provider responses', async () => {
      // Create test companies
      const renterCompany = await createTestCompany(`ORG-RENTER-${Date.now()}`);
      const providerCompany = await createTestCompany(`ORG-PROVIDER-${Date.now()}`);

      // Create a vehicle listing
      const vehicleListing = await createTestVehicleListing(providerCompany.id);

      // Create a completed booking
      const booking = await createCompletedBooking(
        renterCompany.id,
        providerCompany.id,
        vehicleListing.id
      );

      // Submit rating
      const rating = await ratingService.submitRating(booking.id, renterCompany.id, {
        companyStars: 4,
      });

      // Provider responds
      await ratingService.respondToReview(rating.id, providerCompany.id, 'First response');

      // Attempt second response
      await expect(
        ratingService.respondToReview(rating.id, providerCompany.id, 'Second response')
      ).rejects.toThrow('RESPONSE_ALREADY_EXISTS');
    });
  });

  describe('Unit Tests - Aggregated ratings', () => {
    it('should return zero ratings for company with no ratings', async () => {
      const company = await createTestCompany(`ORG-${Date.now()}`);

      const aggregated = await ratingService.getCompanyRatings(company.id);

      expect(aggregated.averageStars).toBe(0);
      expect(aggregated.totalRatings).toBe(0);
      expect(aggregated.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });

    it('should return zero ratings for driver with no ratings', async () => {
      const company = await createTestCompany(`ORG-${Date.now()}`);
      const driver = await createTestDriverListing(company.id);

      const aggregated = await ratingService.getDriverRatings(driver.id);

      expect(aggregated.averageStars).toBe(0);
      expect(aggregated.totalRatings).toBe(0);
      expect(aggregated.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });
});
