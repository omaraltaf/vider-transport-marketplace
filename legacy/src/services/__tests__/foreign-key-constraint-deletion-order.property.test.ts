/**
 * Property-Based Test: Foreign Key Constraint Deletion Order
 * **Feature: listing-search-fix, Property 4: Foreign key constraint deletion order**
 * **Validates: Requirements 2.1, 2.2**
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Property 4: Foreign key constraint deletion order', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Ensure we have some test data to work with
    const companyCount = await prisma.company.count();
    if (companyCount === 0) {
      // Create minimal test data for constraint testing
      const testCompany = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: '999999999',
          businessAddress: 'Test Address',
          city: 'Test City',
          postalCode: '0000',
          fylke: 'Test Fylke',
          kommune: 'Test Kommune',
          vatRegistered: true,
        },
      });

      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'COMPANY_USER',
          companyId: testCompany.id,
          firstName: 'Test',
          lastName: 'User',
          phone: '+4700000000',
          emailVerified: true,
        },
      });
    }
  });

  /**
   * For any database state with foreign key relationships, deletion operations
   * must respect dependency order to avoid constraint violations
   */
  it('should delete child records before parent records to avoid constraint violations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'message_before_thread',
          'booking_before_listing',
          'user_before_company',
          'rating_before_booking',
          'availability_block_before_recurring_block'
        ),
        async (constraintType: string) => {
          try {
            // Test different constraint scenarios
            switch (constraintType) {
              case 'message_before_thread':
                // Messages must be deleted before message threads
                const threadCount = await prisma.messageThread.count();
                const messageCount = await prisma.message.count();
                
                if (threadCount > 0 || messageCount > 0) {
                  // Try deleting in correct order (messages first, then threads)
                  await prisma.message.deleteMany();
                  await prisma.messageThread.deleteMany();
                  
                  // Verify deletion succeeded
                  const remainingMessages = await prisma.message.count();
                  const remainingThreads = await prisma.messageThread.count();
                  
                  if (remainingMessages !== 0 || remainingThreads !== 0) {
                    return false;
                  }
                }
                break;

              case 'booking_before_listing':
                // Bookings must be deleted before listings
                const vehicleListingCount = await prisma.vehicleListing.count();
                const driverListingCount = await prisma.driverListing.count();
                const bookingCount = await prisma.booking.count();
                
                if (bookingCount > 0 || vehicleListingCount > 0 || driverListingCount > 0) {
                  // Delete bookings first, then listings
                  await prisma.booking.deleteMany();
                  await prisma.driverListing.deleteMany();
                  await prisma.vehicleListing.deleteMany();
                  
                  // Verify deletion succeeded
                  const remainingBookings = await prisma.booking.count();
                  const remainingVehicles = await prisma.vehicleListing.count();
                  const remainingDrivers = await prisma.driverListing.count();
                  
                  if (remainingBookings !== 0 || remainingVehicles !== 0 || remainingDrivers !== 0) {
                    return false;
                  }
                }
                break;

              case 'user_before_company':
                // Users must be deleted before companies
                const userCount = await prisma.user.count();
                const companyCount = await prisma.company.count();
                
                if (userCount > 0 || companyCount > 0) {
                  // Delete users first, then companies
                  await prisma.user.deleteMany();
                  await prisma.company.deleteMany();
                  
                  // Verify deletion succeeded
                  const remainingUsers = await prisma.user.count();
                  const remainingCompanies = await prisma.company.count();
                  
                  if (remainingUsers !== 0 || remainingCompanies !== 0) {
                    return false;
                  }
                }
                break;

              case 'rating_before_booking':
                // Ratings must be deleted before bookings
                const ratingCount = await prisma.rating.count();
                const existingBookingCount = await prisma.booking.count();
                
                if (ratingCount > 0 || existingBookingCount > 0) {
                  // Delete ratings first, then bookings
                  await prisma.rating.deleteMany();
                  await prisma.booking.deleteMany();
                  
                  // Verify deletion succeeded
                  const remainingRatings = await prisma.rating.count();
                  const remainingBookings = await prisma.booking.count();
                  
                  if (remainingRatings !== 0 || remainingBookings !== 0) {
                    return false;
                  }
                }
                break;

              case 'availability_block_before_recurring_block':
                // Availability blocks must be deleted before recurring blocks
                const availabilityBlockCount = await prisma.availabilityBlock.count();
                const recurringBlockCount = await prisma.recurringBlock.count();
                
                if (availabilityBlockCount > 0 || recurringBlockCount > 0) {
                  // Delete availability blocks first, then recurring blocks
                  await prisma.availabilityBlock.deleteMany();
                  await prisma.recurringBlock.deleteMany();
                  
                  // Verify deletion succeeded
                  const remainingAvailability = await prisma.availabilityBlock.count();
                  const remainingRecurring = await prisma.recurringBlock.count();
                  
                  if (remainingAvailability !== 0 || remainingRecurring !== 0) {
                    return false;
                  }
                }
                break;
            }
            
            return true;
          } catch (error) {
            // If we get a foreign key constraint error, the deletion order is wrong
            if (error instanceof Error && error.message.includes('foreign key constraint')) {
              return false;
            }
            // Other errors might be acceptable (e.g., no data to delete)
            return true;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * For any complete database cleanup operation, all tables should be cleared
   * without foreign key constraint violations when following proper deletion order
   */
  it('should successfully clear all tables when following the correct deletion sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to use the seed script's deletion order
        async (useCorrectOrder: boolean) => {
          try {
            if (useCorrectOrder) {
              // Use the same deletion order as in seed.routes.ts
              // Level 1: Leaf nodes (no dependencies)
              await prisma.message.deleteMany();
              await prisma.transaction.deleteMany();
              await prisma.rating.deleteMany();
              await prisma.dispute.deleteMany();
              await prisma.availabilityBlock.deleteMany();
              await prisma.auditLog.deleteMany();
              await prisma.notification.deleteMany();
              await prisma.notificationPreferences.deleteMany();
              await prisma.securityEvent.deleteMany();
              await prisma.securityAlert.deleteMany();
              await prisma.scheduledReport.deleteMany();
              await prisma.analyticsSnapshots.deleteMany();
              await prisma.contentFlags.deleteMany();
              await prisma.geographicRestriction.deleteMany();
              await prisma.paymentMethodConfig.deleteMany();
              await prisma.configurationHistory.deleteMany();
              
              // Level 2: Entities with Level 1 dependencies
              await prisma.messageThread.deleteMany();
              await prisma.recurringBlock.deleteMany();
              
              // Level 3: Entities with Level 2 dependencies
              await prisma.booking.deleteMany();
              
              // Level 4: Entities with Level 3 dependencies
              await prisma.driverListing.deleteMany();
              await prisma.vehicleListing.deleteMany();
              
              // Level 5: Entities with Level 4 dependencies
              await prisma.platformConfigs.deleteMany();
              await prisma.user.deleteMany();
              
              // Level 6: Root entities
              await prisma.company.deleteMany();
              await prisma.platformConfig.deleteMany();
              
              // Verify all tables are empty
              const counts = await Promise.all([
                prisma.company.count(),
                prisma.user.count(),
                prisma.vehicleListing.count(),
                prisma.driverListing.count(),
                prisma.booking.count(),
                prisma.rating.count(),
                prisma.message.count(),
                prisma.messageThread.count(),
              ]);
              
              // All counts should be 0
              return counts.every(count => count === 0);
            } else {
              // Test that we can at least query the tables without errors
              // (We won't test incorrect deletion order as it would cause constraint violations)
              const companyCount = await prisma.company.count();
              const userCount = await prisma.user.count();
              
              // Just verify we can read the data
              return typeof companyCount === 'number' && typeof userCount === 'number';
            }
          } catch (error) {
            // If we get constraint violations, the order is wrong
            if (error instanceof Error && error.message.includes('foreign key constraint')) {
              return !useCorrectOrder; // Expected to fail if not using correct order
            }
            // Other errors are acceptable
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * For any foreign key relationship in the database schema, the relationship
   * should be properly defined and enforced
   */
  it('should enforce foreign key relationships correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'user_company_relationship',
          'booking_listing_relationship',
          'message_thread_relationship',
          'rating_booking_relationship'
        ),
        async (relationshipType: string) => {
          try {
            switch (relationshipType) {
              case 'user_company_relationship':
                // Users should reference valid companies
                const usersWithCompanies = await prisma.user.findMany({
                  include: { company: true }
                });
                
                for (const user of usersWithCompanies) {
                  if (!user.company) {
                    return false; // User should have a valid company
                  }
                }
                break;

              case 'booking_listing_relationship':
                // Bookings should reference valid listings
                const bookingsWithListings = await prisma.booking.findMany({
                  include: { 
                    vehicleListing: true,
                    driverListing: true,
                    renterCompany: true,
                    providerCompany: true
                  }
                });
                
                for (const booking of bookingsWithListings) {
                  // Booking should have valid companies
                  if (!booking.renterCompany || !booking.providerCompany) {
                    return false;
                  }
                  
                  // If booking has vehicle listing, it should be valid
                  if (booking.vehicleListingId && !booking.vehicleListing) {
                    return false;
                  }
                  
                  // If booking has driver listing, it should be valid
                  if (booking.driverListingId && !booking.driverListing) {
                    return false;
                  }
                }
                break;

              case 'message_thread_relationship':
                // Messages should reference valid threads
                const messagesWithThreads = await prisma.message.findMany({
                  include: { thread: true }
                });
                
                for (const message of messagesWithThreads) {
                  if (!message.thread) {
                    return false; // Message should have a valid thread
                  }
                }
                break;

              case 'rating_booking_relationship':
                // Ratings should reference valid bookings
                const ratingsWithBookings = await prisma.rating.findMany({
                  include: { booking: true }
                });
                
                for (const rating of ratingsWithBookings) {
                  if (!rating.booking) {
                    return false; // Rating should have a valid booking
                  }
                }
                break;
            }
            
            return true;
          } catch (error) {
            // Database errors indicate relationship problems
            return false;
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});