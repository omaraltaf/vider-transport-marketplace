import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, Role, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

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

describe('AvailabilityService', () => {
  beforeEach(async () => {
    // Clean up database before each test - delete in correct order
    await prisma.availabilityBlock.deleteMany();
    await prisma.recurringBlock.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test - delete in correct order
    await prisma.availabilityBlock.deleteMany();
    await prisma.recurringBlock.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  /**
   * Feature: listing-availability-calendar, Property 1: Availability block creation and persistence
   * Validates: Requirements 1.1, 1.2, 1.4
   * 
   * For any listing and valid date range (start ≤ end), creating an availability block 
   * should result in a stored block with the correct listingId, dates, and optional reason
   */
  it('Property 1: should create and persist availability blocks with valid date ranges', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 0, max: 365 }), // days to add for end date
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        async (startDate, daysToAdd, reason) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          // Calculate end date (ensure start <= end)
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + daysToAdd);

          // Act: Create availability block
          const block = await availabilityService.createBlock({
            listingId: listing.id,
            listingType: 'vehicle',
            startDate,
            endDate,
            reason,
            createdBy: user.id,
          });

          // Assert: Block should be created with correct data
          expect(block).toBeDefined();
          expect(block.listingId).toBe(listing.id);
          expect(block.listingType).toBe('vehicle');
          expect(block.startDate.getTime()).toBe(startDate.getTime());
          expect(block.endDate.getTime()).toBe(endDate.getTime());
          // Database stores undefined as null
          expect(block.reason).toBe(reason === undefined ? null : reason);
          expect(block.createdBy).toBe(user.id);
          expect(block.isRecurring).toBe(false);

          // Assert: Block should be persisted in database
          const persistedBlock = await prisma.availabilityBlock.findUnique({
            where: { id: block.id },
          });

          expect(persistedBlock).toBeDefined();
          expect(persistedBlock?.listingId).toBe(listing.id);
          expect(persistedBlock?.startDate.getTime()).toBe(startDate.getTime());
          expect(persistedBlock?.endDate.getTime()).toBe(endDate.getTime());

          // Cleanup
          await prisma.availabilityBlock.delete({ where: { id: block.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 2: Date range validation
   * Validates: Requirements 1.4
   * 
   * For any availability block creation attempt, if the end date is before the start date,
   * the system should reject the block with a validation error
   */
  it('Property 2: should reject blocks with invalid date ranges (end < start)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 365 }), // days to subtract for invalid end date
        async (endDate, daysToSubtract) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          // Calculate start date (ensure start > end for invalid range)
          const startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() + daysToSubtract);

          // Act & Assert: Should throw validation error
          await expect(
            availabilityService.createBlock({
              listingId: listing.id,
              listingType: 'vehicle',
              startDate,
              endDate,
              createdBy: user.id,
            })
          ).rejects.toThrow('INVALID_DATE_RANGE');

          // Cleanup
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 4: Recurring block instance generation
   * Validates: Requirements 2.1, 2.2, 2.3
   * 
   * For any recurring block with weekly pattern and specific days of week, the generated 
   * instances should only occur on the specified days within the recurrence period
   */
  it('Property 4: should generate recurring instances only on specified days of week', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-01') }),
        fc.integer({ min: 7, max: 90 }), // duration in days
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }).map(arr => [...new Set(arr)]), // unique days of week
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        async (startDate, durationDays, daysOfWeek, reason) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          // Normalize dates to midnight to avoid timezone issues
          const normalizedStart = new Date(startDate);
          normalizedStart.setHours(0, 0, 0, 0);
          
          const endDate = new Date(normalizedStart);
          endDate.setDate(endDate.getDate() + durationDays);

          // Act: Create recurring block
          const recurringBlock = await availabilityService.createRecurringBlock({
            listingId: listing.id,
            listingType: 'vehicle',
            daysOfWeek,
            startDate: normalizedStart,
            endDate,
            reason,
            createdBy: user.id,
          });

          // Generate instances
          const instances = availabilityService.generateRecurringInstances(
            recurringBlock,
            normalizedStart,
            endDate
          );

          // Assert: All instances should be on specified days of week
          for (const instance of instances) {
            const dayOfWeek = instance.startDate.getDay();
            expect(daysOfWeek).toContain(dayOfWeek);
            
            // Assert: Instance dates should be within the recurrence period
            expect(instance.startDate.getTime()).toBeGreaterThanOrEqual(normalizedStart.getTime());
            expect(instance.endDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
            
            // Assert: Instance should have correct metadata
            expect(instance.listingId).toBe(listing.id);
            expect(instance.listingType).toBe('vehicle');
            expect(instance.isRecurring).toBe(true);
            expect(instance.recurringBlockId).toBe(recurringBlock.id);
          }

          // Assert: No instances should be generated for days not in daysOfWeek
          const allDays = [0, 1, 2, 3, 4, 5, 6];
          const excludedDays = allDays.filter(day => !daysOfWeek.includes(day));
          
          for (const instance of instances) {
            const dayOfWeek = instance.startDate.getDay();
            expect(excludedDays).not.toContain(dayOfWeek);
          }

          // Cleanup
          await prisma.recurringBlock.delete({ where: { id: recurringBlock.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 3: Booking conflict detection
   * Validates: Requirements 1.6, 7.3, 8.2
   * 
   * For any listing with an accepted or active booking, attempting to create an availability 
   * block that overlaps the booking dates should be rejected with a conflict error
   */
  it('Property 3: should reject blocks that conflict with accepted/active bookings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-30') }),
        fc.integer({ min: 1, max: 30 }), // booking duration in days
        fc.integer({ min: -5, max: 5 }), // offset for block start (can overlap)
        fc.constantFrom(BookingStatus.ACCEPTED, BookingStatus.ACTIVE),
        async (bookingStart, bookingDuration, blockOffset, bookingStatus) => {
          // Setup: Create test data
          const providerCompany = await createTestCompany(`PROV-${Date.now()}-${Math.random()}`);
          const renterCompany = await createTestCompany(`RENT-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(providerCompany.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(providerCompany.id);

          // Create booking
          const bookingEnd = new Date(bookingStart);
          bookingEnd.setDate(bookingEnd.getDate() + bookingDuration);

          const booking = await prisma.booking.create({
            data: {
              bookingNumber: `BK-${Date.now()}-${Math.random()}`,
              renterCompanyId: renterCompany.id,
              providerCompanyId: providerCompany.id,
              vehicleListingId: listing.id,
              status: bookingStatus,
              startDate: bookingStart,
              endDate: bookingEnd,
              durationDays: bookingDuration,
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

          // Calculate block dates that overlap with booking
          const blockStart = new Date(bookingStart);
          blockStart.setDate(blockStart.getDate() + blockOffset);
          const blockEnd = new Date(blockStart);
          blockEnd.setDate(blockEnd.getDate() + 5);

          // Check if there's actual overlap (inclusive boundaries)
          const hasOverlap = !(blockEnd < bookingStart || blockStart > bookingEnd);

          if (hasOverlap) {
            // Act & Assert: Should throw conflict error
            try {
              await availabilityService.createBlock({
                listingId: listing.id,
                listingType: 'vehicle',
                startDate: blockStart,
                endDate: blockEnd,
                createdBy: user.id,
              });
              // If we get here, the test should fail
              expect(true).toBe(false); // Force failure
            } catch (error: any) {
              expect(error.message).toBe('BOOKING_CONFLICT');
              expect(error.conflicts).toBeDefined();
              expect(error.conflicts.length).toBeGreaterThan(0);
              expect(error.conflicts[0].type).toBe('booking');
              expect(error.conflicts[0].bookingNumber).toBe(booking.bookingNumber);
            }
          } else {
            // If no overlap, block should be created successfully
            const block = await availabilityService.createBlock({
              listingId: listing.id,
              listingType: 'vehicle',
              startDate: blockStart,
              endDate: blockEnd,
              createdBy: user.id,
            });
            expect(block).toBeDefined();
            await prisma.availabilityBlock.delete({ where: { id: block.id } });
          }

          // Cleanup
          await prisma.booking.delete({ where: { id: booking.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: providerCompany.id } });
          await prisma.company.delete({ where: { id: renterCompany.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 5: Recurring block update scope
   * Validates: Requirements 2.5
   * 
   * For any recurring block, updating with "future only" option should only modify instances 
   * with start dates after the update date, leaving past instances unchanged
   */
  it('Property 5: should update only future instances when scope is "future"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
        fc.integer({ min: 60, max: 120 }), // duration in days (need enough time for past/future split)
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }).map(arr => [...new Set(arr)]),
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }).map(arr => [...new Set(arr)]),
        async (startDate, durationDays, originalDaysOfWeek, newDaysOfWeek) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);

          // Create recurring block
          const recurringBlock = await availabilityService.createRecurringBlock({
            listingId: listing.id,
            listingType: 'vehicle',
            daysOfWeek: originalDaysOfWeek,
            startDate,
            endDate,
            createdBy: user.id,
          });

          // Choose an update date in the middle of the recurrence period
          const updateDate = new Date(startDate);
          updateDate.setDate(updateDate.getDate() + Math.floor(durationDays / 2));

          // Generate instances before update
          const instancesBeforeUpdate = availabilityService.generateRecurringInstances(
            recurringBlock,
            startDate,
            updateDate
          );

          // Act: Update with "future" scope
          const updatedBlock = await availabilityService.updateRecurringBlock(
            recurringBlock.id,
            {
              daysOfWeek: newDaysOfWeek,
              scope: 'future',
              updateDate,
            },
            user.id
          );

          // Assert: Original block should end before update date
          const originalBlock = await prisma.recurringBlock.findUnique({
            where: { id: recurringBlock.id },
          });
          
          expect(originalBlock).toBeDefined();
          expect(originalBlock!.endDate).toBeDefined();
          expect(originalBlock!.endDate!.getTime()).toBeLessThan(updateDate.getTime());

          // Assert: New block should start at update date
          expect(updatedBlock.id).not.toBe(recurringBlock.id); // Should be a new block
          expect(updatedBlock.startDate.getTime()).toBe(updateDate.getTime());
          expect(updatedBlock.daysOfWeek).toEqual(newDaysOfWeek);

          // Assert: Past instances should still follow original pattern
          const pastInstances = availabilityService.generateRecurringInstances(
            originalBlock!,
            startDate,
            originalBlock!.endDate!
          );

          for (const instance of pastInstances) {
            const dayOfWeek = instance.startDate.getDay();
            expect(originalDaysOfWeek).toContain(dayOfWeek);
          }

          // Assert: Future instances should follow new pattern
          const futureInstances = availabilityService.generateRecurringInstances(
            updatedBlock,
            updateDate,
            endDate
          );

          for (const instance of futureInstances) {
            const dayOfWeek = instance.startDate.getDay();
            expect(newDaysOfWeek).toContain(dayOfWeek);
          }

          // Cleanup
          await prisma.recurringBlock.delete({ where: { id: recurringBlock.id } });
          await prisma.recurringBlock.delete({ where: { id: updatedBlock.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 6: Recurring block deletion scope
   * Validates: Requirements 2.6
   * 
   * For any recurring block, deleting with "future only" option should only remove instances 
   * with start dates after the deletion date, preserving past instances
   */
  it('Property 6: should delete only future instances when scope is "future"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
        fc.integer({ min: 60, max: 120 }), // duration in days
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }).map(arr => [...new Set(arr)]),
        async (startDate, durationDays, daysOfWeek) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + durationDays);

          // Create recurring block
          const recurringBlock = await availabilityService.createRecurringBlock({
            listingId: listing.id,
            listingType: 'vehicle',
            daysOfWeek,
            startDate,
            endDate,
            createdBy: user.id,
          });

          // Choose a delete date in the middle of the recurrence period
          const deleteDate = new Date(startDate);
          deleteDate.setDate(deleteDate.getDate() + Math.floor(durationDays / 2));

          // Generate instances before deletion
          const allInstances = availabilityService.generateRecurringInstances(
            recurringBlock,
            startDate,
            endDate
          );

          const pastInstances = allInstances.filter(
            inst => inst.startDate.getTime() < deleteDate.getTime()
          );
          const futureInstances = allInstances.filter(
            inst => inst.startDate.getTime() >= deleteDate.getTime()
          );

          // Act: Delete with "future" scope
          await availabilityService.deleteRecurringBlock(
            recurringBlock.id,
            'future',
            deleteDate,
            user.id
          );

          // Assert: Block should still exist but with updated end date
          const updatedBlock = await prisma.recurringBlock.findUnique({
            where: { id: recurringBlock.id },
          });

          expect(updatedBlock).toBeDefined();
          expect(updatedBlock!.endDate).toBeDefined();
          expect(updatedBlock!.endDate!.getTime()).toBeLessThan(deleteDate.getTime());

          // Assert: Past instances should still be generatable
          const remainingInstances = availabilityService.generateRecurringInstances(
            updatedBlock!,
            startDate,
            updatedBlock!.endDate!
          );

          // All remaining instances should be before delete date
          for (const instance of remainingInstances) {
            expect(instance.startDate.getTime()).toBeLessThan(deleteDate.getTime());
          }

          // Assert: Future instances should not be generated
          const noFutureInstances = availabilityService.generateRecurringInstances(
            updatedBlock!,
            deleteDate,
            endDate
          );

          expect(noFutureInstances.length).toBe(0);

          // Cleanup
          await prisma.recurringBlock.delete({ where: { id: recurringBlock.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 11: Booking validation against availability
   * Validates: Requirements 5.3, 5.4
   * 
   * Property: For any booking request, if the requested dates overlap with availability blocks
   * or existing bookings, the system should reject the request with a specific conflict error
   */
  it('Property 11: should reject booking requests that conflict with availability blocks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-30') }),
        fc.integer({ min: 1, max: 30 }), // block duration in days
        fc.integer({ min: -5, max: 5 }), // offset for booking start (can overlap)
        fc.integer({ min: 1, max: 30 }), // booking duration in days
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),

        async (blockStart, blockDuration, bookingOffset, bookingDuration, blockReason) => {
          // Setup: Create test data
          const timestamp = Date.now();
          const random1 = Math.random().toString(36).substring(2, 15);
          const random2 = Math.random().toString(36).substring(2, 15);
          
          const company1 = await prisma.company.create({
            data: {
              name: `Test Company ${timestamp}-${random1}`,
              organizationNumber: `ORG${timestamp}${random1}`.substring(0, 20),
              businessAddress: 'Test Address',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          const company2 = await prisma.company.create({
            data: {
              name: `Test Company ${timestamp}-${random2}`,
              organizationNumber: `ORG${timestamp}${random2}`.substring(0, 20),
              businessAddress: 'Test Address',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          const user = await createTestUser(company1.id, `test${Date.now()}@example.com`);

          const listing = await createTestVehicleListing(company1.id);

          // Calculate dates
          const blockEnd = new Date(blockStart);
          blockEnd.setDate(blockEnd.getDate() + blockDuration);

          const bookingStart = new Date(blockStart);
          bookingStart.setDate(bookingStart.getDate() + bookingOffset);

          const bookingEnd = new Date(bookingStart);
          bookingEnd.setDate(bookingEnd.getDate() + bookingDuration);

          // Create availability block
          await availabilityService.createBlock({
            listingId: listing.id,
            listingType: 'vehicle',
            startDate: blockStart,
            endDate: blockEnd,
            reason: blockReason,
            createdBy: user.id,
          });

          // Determine if there should be a conflict (inclusive boundaries)
          const hasOverlap = !(bookingEnd < blockStart || bookingStart > blockEnd);

          // Import booking service dynamically to avoid circular dependency issues
          const { bookingService } = await import('./booking.service');

          // Act & Assert
          if (hasOverlap) {
            // Should reject with conflict error
            try {
              await bookingService.createBookingRequest({
                renterCompanyId: company2.id,
                providerCompanyId: company1.id,
                vehicleListingId: listing.id,
                startDate: bookingStart,
                endDate: bookingEnd,
                durationDays: bookingDuration,
              });
              
              // If we get here, the test failed - should have thrown
              expect(true).toBe(false); // Force failure with clear message
            } catch (error: any) {
              // Should throw VEHICLE_NOT_AVAILABLE error
              expect(error.message).toBe('VEHICLE_NOT_AVAILABLE');
              
              // Should include conflict details
              expect(error.conflicts).toBeDefined();
              expect(error.conflicts.length).toBeGreaterThan(0);
              expect(error.details).toBeDefined();
              expect(error.details).toContain('Blocked');
            }
          } else {
            // Should succeed - no overlap
            const booking = await bookingService.createBookingRequest({
              renterCompanyId: company2.id,
              providerCompanyId: company1.id,
              vehicleListingId: listing.id,
              startDate: bookingStart,
              endDate: bookingEnd,
              durationDays: bookingDuration,
            });

            expect(booking).toBeDefined();
            expect(booking.status).toBe(BookingStatus.PENDING);

            // Cleanup booking and related data
            await prisma.message.deleteMany({ where: { thread: { bookingId: booking.id } } });
            await prisma.messageThread.deleteMany({ where: { bookingId: booking.id } });
            await prisma.booking.delete({ where: { id: booking.id } });
          }

          // Cleanup
          await prisma.availabilityBlock.deleteMany({ where: { listingId: listing.id } });
          await prisma.vehicleListing.delete({ where: { id: listing.id } });
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company1.id } });
          await prisma.company.delete({ where: { id: company2.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: listing-availability-calendar, Property 12: Bulk block creation with individual validation
   * Validates: Requirements 6.2, 6.3, 6.4
   * 
   * For any bulk block creation request across multiple listings, each listing should be 
   * validated individually, and the result should correctly identify which succeeded and 
   * which failed with their specific conflicts
   */
  it('Property 12: should validate each listing individually in bulk operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // number of listings
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-06-30') }),
        fc.integer({ min: 1, max: 30 }), // block duration in days
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        async (numListings, blockStart, blockDuration, reason) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);

          // Create multiple listings
          const listings = [];
          for (let i = 0; i < numListings; i++) {
            const listing = await createTestVehicleListing(company.id);
            listings.push(listing);
          }

          // Randomly create bookings for some listings to cause conflicts
          const listingsWithBookings = new Set<string>();
          const numConflicts = Math.floor(Math.random() * numListings);
          
          for (let i = 0; i < numConflicts; i++) {
            const listing = listings[i];
            
            // Create a booking that overlaps with the block dates
            const bookingStart = new Date(blockStart);
            bookingStart.setDate(bookingStart.getDate() + Math.floor(blockDuration / 2));
            const bookingEnd = new Date(bookingStart);
            bookingEnd.setDate(bookingEnd.getDate() + 5);

            await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}-${i}`,
                renterCompanyId: company.id,
                providerCompanyId: company.id,
                vehicleListingId: listing.id,
                startDate: bookingStart,
                endDate: bookingEnd,
                durationDays: 5,
                providerRate: 3000,
                platformCommission: 300,
                platformCommissionRate: 0.1,
                taxes: 375,
                taxRate: 0.25,
                total: 3675,
                currency: 'NOK',
                status: BookingStatus.ACCEPTED,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            });

            listingsWithBookings.add(listing.id);
          }

          // Calculate block end date
          const blockEnd = new Date(blockStart);
          blockEnd.setDate(blockEnd.getDate() + blockDuration);

          // Act: Create bulk blocks
          const result = await availabilityService.createBulkBlocks({
            listingIds: listings.map(l => l.id),
            listingType: 'vehicle',
            startDate: blockStart,
            endDate: blockEnd,
            reason,
            createdBy: user.id,
          });

          // Assert: Result should have successful and failed arrays
          expect(result).toBeDefined();
          expect(result.successful).toBeDefined();
          expect(result.failed).toBeDefined();
          expect(Array.isArray(result.successful)).toBe(true);
          expect(Array.isArray(result.failed)).toBe(true);

          // Assert: Total should equal number of listings
          expect(result.successful.length + result.failed.length).toBe(numListings);

          // Assert: Listings with bookings should be in failed array
          for (const listingId of listingsWithBookings) {
            expect(result.successful).not.toContain(listingId);
            const failedEntry = result.failed.find(f => f.listingId === listingId);
            expect(failedEntry).toBeDefined();
            expect(failedEntry?.reason).toBe('BOOKING_CONFLICT');
            expect(failedEntry?.conflicts).toBeDefined();
            expect(failedEntry?.conflicts.length).toBeGreaterThan(0);
          }

          // Assert: Listings without bookings should be in successful array
          for (const listing of listings) {
            if (!listingsWithBookings.has(listing.id)) {
              expect(result.successful).toContain(listing.id);
              expect(result.failed.find(f => f.listingId === listing.id)).toBeUndefined();

              // Assert: Block should be created in database
              const blocks = await prisma.availabilityBlock.findMany({
                where: {
                  listingId: listing.id,
                  startDate: blockStart,
                  endDate: blockEnd,
                },
              });
              expect(blocks.length).toBe(1);
              expect(blocks[0].listingId).toBe(listing.id);
              expect(blocks[0].reason).toBe(reason === undefined ? null : reason);
            }
          }

          // Cleanup
          await prisma.availabilityBlock.deleteMany({ where: { listingId: { in: listings.map(l => l.id) } } });
          await prisma.booking.deleteMany({ where: { vehicleListingId: { in: listings.map(l => l.id) } } });
          for (const listing of listings) {
            await prisma.vehicleListing.delete({ where: { id: listing.id } });
          }
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
