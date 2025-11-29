import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { messagingService } from './messaging.service';
import { bookingService } from './booking.service';
import * as fc from 'fast-check';

const prisma = new PrismaClient();

describe('MessagingService', () => {
  // Helper to clean up test data
  async function cleanupTestData() {
    await prisma.message.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.platformConfig.deleteMany({});
  }

  beforeEach(async () => {
    await cleanupTestData();
  });

  /**
   * **Feature: vider-transport-marketplace, Property 40: Message thread creation on booking**
   * 
   * Property: For any booking creation, the system must automatically create a dedicated 
   * message thread with the renter and provider as participants.
   * 
   * **Validates: Requirements 25.1**
   */
  it('Property 40: Message thread creation on booking - should create thread when booking is created', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random company data
        fc.record({
          renterCompany: fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            city: fc.string({ minLength: 1, maxLength: 30 }),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }),
            fylke: fc.constantFrom('Oslo', 'Viken', 'Rogaland'),
            kommune: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          providerCompany: fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            city: fc.string({ minLength: 1, maxLength: 30 }),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }),
            fylke: fc.constantFrom('Oslo', 'Viken', 'Rogaland'),
            kommune: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          vehicleData: fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 200 }),
            capacity: fc.integer({ min: 1, max: 30 }),
            hourlyRate: fc.float({ min: 100, max: 2000 }),
            dailyRate: fc.float({ min: 1000, max: 10000 }),
          }),
          bookingData: fc.record({
            durationHours: fc.integer({ min: 1, max: 24 }),
            durationDays: fc.integer({ min: 1, max: 7 }),
          }),
        }),
        async ({ renterCompany, providerCompany, vehicleData, bookingData }) => {
          // Ensure unique org numbers
          if (renterCompany.organizationNumber === providerCompany.organizationNumber) {
            providerCompany.organizationNumber = (
              parseInt(providerCompany.organizationNumber) + 1
            ).toString();
          }

          // Create platform config
          await prisma.platformConfig.create({
            data: {
              commissionRate: 5,
              taxRate: 25,
              bookingTimeoutHours: 24,
              defaultCurrency: 'NOK',
            },
          });

          // Create renter company
          const renterComp = await prisma.company.create({
            data: {
              name: renterCompany.name,
              organizationNumber: renterCompany.organizationNumber,
              businessAddress: '123 Test St',
              city: renterCompany.city,
              postalCode: renterCompany.postalCode,
              fylke: renterCompany.fylke,
              kommune: renterCompany.kommune,
              vatRegistered: true,
            },
          });

          // Create provider company
          const providerComp = await prisma.company.create({
            data: {
              name: providerCompany.name,
              organizationNumber: providerCompany.organizationNumber,
              businessAddress: '456 Test Ave',
              city: providerCompany.city,
              postalCode: providerCompany.postalCode,
              fylke: providerCompany.fylke,
              kommune: providerCompany.kommune,
              vatRegistered: true,
            },
          });

          // Create users for both companies
          const renterUser = await prisma.user.create({
            data: {
              email: `renter-${renterComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: renterComp.id,
              firstName: 'Renter',
              lastName: 'User',
              phone: '12345678',
              emailVerified: true,
            },
          });

          const providerUser = await prisma.user.create({
            data: {
              email: `provider-${providerComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: providerComp.id,
              firstName: 'Provider',
              lastName: 'User',
              phone: '87654321',
              emailVerified: true,
            },
          });

          // Create vehicle listing
          const vehicleListing = await prisma.vehicleListing.create({
            data: {
              companyId: providerComp.id,
              title: vehicleData.title,
              description: vehicleData.description,
              vehicleType: 'PALLET_18',
              capacity: vehicleData.capacity,
              fuelType: 'DIESEL',
              city: providerCompany.city,
              fylke: providerCompany.fylke,
              kommune: providerCompany.kommune,
              hourlyRate: vehicleData.hourlyRate,
              dailyRate: vehicleData.dailyRate,
              currency: 'NOK',
              withDriver: false,
              withoutDriver: true,
              photos: [],
              tags: [],
              status: 'ACTIVE',
            },
          });

          // Create booking
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + bookingData.durationDays);

          const booking = await bookingService.createBookingRequest({
            renterCompanyId: renterComp.id,
            providerCompanyId: providerComp.id,
            vehicleListingId: vehicleListing.id,
            startDate,
            endDate,
            durationHours: bookingData.durationHours,
            durationDays: bookingData.durationDays,
          });

          // Verify message thread was created
          const thread = await prisma.messageThread.findUnique({
            where: { bookingId: booking.id },
          });

          // Property: Thread must exist
          expect(thread).not.toBeNull();

          // Property: Thread must have participants from both companies
          expect(thread!.participants).toContain(renterUser.id);
          expect(thread!.participants).toContain(providerUser.id);

          // Property: Thread must have at least 2 participants (renter and provider)
          expect(thread!.participants.length).toBeGreaterThanOrEqual(2);

          // Cleanup
          await cleanupTestData();
        }
      ),
      { numRuns: 100 }
    );
  });
});

  /**
   * **Feature: vider-transport-marketplace, Property 41: Message delivery to all participants**
   * 
   * Property: For any message sent in a booking thread, all participants in that thread 
   * must receive the message and an email notification.
   * 
   * **Validates: Requirements 25.2**
   */
  it('Property 41: Message delivery to all participants - should deliver message to all thread participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random message content (non-empty after trimming)
        fc.record({
          messageContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          companyData: fc.record({
            renterCompany: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            }),
            providerCompany: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            }),
          }),
        }),
        async ({ messageContent, companyData }) => {
          // Ensure unique org numbers and add timestamp to make them unique across runs
          const timestamp = Date.now();
          companyData.renterCompany.organizationNumber = `${timestamp}${companyData.renterCompany.organizationNumber.slice(-3)}`;
          companyData.providerCompany.organizationNumber = `${timestamp + 1}${companyData.providerCompany.organizationNumber.slice(-3)}`;

          // Create platform config
          await prisma.platformConfig.create({
            data: {
              commissionRate: 5,
              taxRate: 25,
              bookingTimeoutHours: 24,
              defaultCurrency: 'NOK',
            },
          });

          // Create renter company
          const renterComp = await prisma.company.create({
            data: {
              name: companyData.renterCompany.name,
              organizationNumber: companyData.renterCompany.organizationNumber,
              businessAddress: '123 Test St',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          // Create provider company
          const providerComp = await prisma.company.create({
            data: {
              name: companyData.providerCompany.name,
              organizationNumber: companyData.providerCompany.organizationNumber,
              businessAddress: '456 Test Ave',
              city: 'Oslo',
              postalCode: '0002',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          // Create users for both companies
          const renterUser = await prisma.user.create({
            data: {
              email: `renter-${renterComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: renterComp.id,
              firstName: 'Renter',
              lastName: 'User',
              phone: '12345678',
              emailVerified: true,
            },
          });

          const providerUser = await prisma.user.create({
            data: {
              email: `provider-${providerComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: providerComp.id,
              firstName: 'Provider',
              lastName: 'User',
              phone: '87654321',
              emailVerified: true,
            },
          });

          // Create vehicle listing
          const vehicleListing = await prisma.vehicleListing.create({
            data: {
              companyId: providerComp.id,
              title: 'Test Vehicle',
              description: 'Test Description',
              vehicleType: 'PALLET_18',
              capacity: 18,
              fuelType: 'DIESEL',
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
              status: 'ACTIVE',
            },
          });

          // Create booking
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 2);

          const booking = await bookingService.createBookingRequest({
            renterCompanyId: renterComp.id,
            providerCompanyId: providerComp.id,
            vehicleListingId: vehicleListing.id,
            startDate,
            endDate,
            durationHours: 24,
            durationDays: 2,
          });

          // Get the message thread
          const thread = await prisma.messageThread.findUnique({
            where: { bookingId: booking.id },
          });

          expect(thread).not.toBeNull();

          // Send a message from the renter
          const message = await messagingService.sendMessage(
            thread!.id,
            renterUser.id,
            messageContent
          );

          // Property: Message must exist
          expect(message).not.toBeNull();
          expect(message.content).toBe(messageContent.trim());
          expect(message.senderId).toBe(renterUser.id);

          // Property: Message must be in the thread
          const messages = await messagingService.getThreadMessages(thread!.id);
          expect(messages.length).toBeGreaterThan(0);
          expect(messages.some((m) => m.id === message.id)).toBe(true);

          // Property: All participants must be able to see the message
          const threadWithMessages = await messagingService.getThreadById(thread!.id);
          expect(threadWithMessages).not.toBeNull();
          expect(threadWithMessages!.messages.some((m) => m.id === message.id)).toBe(true);

          // Property: Sender should have the message marked as read
          expect(message.readBy).toContain(renterUser.id);

          // Property: Other participants should NOT have the message marked as read yet
          expect(message.readBy).not.toContain(providerUser.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: vider-transport-marketplace, Property 42: Unread message indicator**
   * 
   * Property: For any new message received by a user, the system must display an unread 
   * indicator until the user marks the message as read.
   * 
   * **Validates: Requirements 25.4**
   */
  it('Property 42: Unread message indicator - should track unread messages correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random message content
        fc.record({
          messageContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          companyData: fc.record({
            renterCompany: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            }),
            providerCompany: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(String),
            }),
          }),
        }),
        async ({ messageContent, companyData }) => {
          // Ensure unique org numbers and add timestamp to make them unique across runs
          const timestamp = Date.now();
          companyData.renterCompany.organizationNumber = `${timestamp}${companyData.renterCompany.organizationNumber.slice(-3)}`;
          companyData.providerCompany.organizationNumber = `${timestamp + 1}${companyData.providerCompany.organizationNumber.slice(-3)}`;

          // Create platform config
          await prisma.platformConfig.create({
            data: {
              commissionRate: 5,
              taxRate: 25,
              bookingTimeoutHours: 24,
              defaultCurrency: 'NOK',
            },
          });

          // Create renter company
          const renterComp = await prisma.company.create({
            data: {
              name: companyData.renterCompany.name,
              organizationNumber: companyData.renterCompany.organizationNumber,
              businessAddress: '123 Test St',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          // Create provider company
          const providerComp = await prisma.company.create({
            data: {
              name: companyData.providerCompany.name,
              organizationNumber: companyData.providerCompany.organizationNumber,
              businessAddress: '456 Test Ave',
              city: 'Oslo',
              postalCode: '0002',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          // Create users for both companies
          const renterUser = await prisma.user.create({
            data: {
              email: `renter-${renterComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: renterComp.id,
              firstName: 'Renter',
              lastName: 'User',
              phone: '12345678',
              emailVerified: true,
            },
          });

          const providerUser = await prisma.user.create({
            data: {
              email: `provider-${providerComp.id}@test.com`,
              passwordHash: 'hashedpassword',
              role: 'COMPANY_USER',
              companyId: providerComp.id,
              firstName: 'Provider',
              lastName: 'User',
              phone: '87654321',
              emailVerified: true,
            },
          });

          // Create vehicle listing
          const vehicleListing = await prisma.vehicleListing.create({
            data: {
              companyId: providerComp.id,
              title: 'Test Vehicle',
              description: 'Test Description',
              vehicleType: 'PALLET_18',
              capacity: 18,
              fuelType: 'DIESEL',
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
              status: 'ACTIVE',
            },
          });

          // Create booking
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 2);

          const booking = await bookingService.createBookingRequest({
            renterCompanyId: renterComp.id,
            providerCompanyId: providerComp.id,
            vehicleListingId: vehicleListing.id,
            startDate,
            endDate,
            durationHours: 24,
            durationDays: 2,
          });

          // Get the message thread
          const thread = await prisma.messageThread.findUnique({
            where: { bookingId: booking.id },
          });

          expect(thread).not.toBeNull();

          // Property: Initially, provider should have 0 unread messages
          const initialUnreadCount = await messagingService.getUnreadCount(providerUser.id);
          expect(initialUnreadCount).toBe(0);

          // Send a message from the renter
          const message = await messagingService.sendMessage(
            thread!.id,
            renterUser.id,
            messageContent
          );

          // Property: After message is sent, provider should have 1 unread message
          const unreadCountAfterSend = await messagingService.getUnreadCount(providerUser.id);
          expect(unreadCountAfterSend).toBe(1);

          // Property: Sender (renter) should still have 0 unread messages (they sent it)
          const senderUnreadCount = await messagingService.getUnreadCount(renterUser.id);
          expect(senderUnreadCount).toBe(0);

          // Mark the message as read by the provider
          await messagingService.markAsRead(message.id, providerUser.id);

          // Property: After marking as read, provider should have 0 unread messages
          const unreadCountAfterRead = await messagingService.getUnreadCount(providerUser.id);
          expect(unreadCountAfterRead).toBe(0);

          // Property: Message should now be marked as read by provider
          const updatedMessage = await prisma.message.findUnique({
            where: { id: message.id },
          });
          expect(updatedMessage!.readBy).toContain(providerUser.id);
        }
      ),
      { numRuns: 100 }
    );
  });
