import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, Role, BookingStatus, NotificationType, NotificationChannel } from '@prisma/client';
import { GDPRService } from './gdpr.service';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();
const gdprService = new GDPRService();

// Helper to generate unique organization number
function generateUniqueOrgNumber(): string {
  // Use crypto random bytes to ensure uniqueness
  const randomNum = crypto.randomBytes(4).readUInt32BE(0);
  return (100000000 + (randomNum % 900000000)).toString();
}

describe('GDPRService', () => {
  // Clean up test data after each test
  afterEach(async () => {
    try {
      await prisma.notification.deleteMany();
      await prisma.notificationPreferences.deleteMany();
      await prisma.message.deleteMany();
      await prisma.messageThread.deleteMany();
      await prisma.rating.deleteMany();
      await prisma.transaction.deleteMany();
      await prisma.booking.deleteMany();
      await prisma.driverListing.deleteMany();
      await prisma.vehicleListing.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.user.deleteMany();
      await prisma.company.deleteMany();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Property 33: GDPR data export completeness', () => {
    /**
     * **Feature: vider-transport-marketplace, Property 33: GDPR data export completeness**
     * **Validates: Requirements 20.1**
     * 
     * For any user data export request, the exported data must include all personal 
     * information associated with the user across all tables in the system.
     */
    it('should export all personal data for any user with random data', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user data
          fc.record({
            email: fc.emailAddress(),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 8, maxLength: 15 }),
            companyName: fc.string({ minLength: 1, maxLength: 100 }),
            city: fc.string({ minLength: 1, maxLength: 50 }),
            postalCode: fc.string({ minLength: 4, maxLength: 10 }),
            fylke: fc.string({ minLength: 1, maxLength: 50 }),
            kommune: fc.string({ minLength: 1, maxLength: 50 }),
            // Generate random number of bookings, messages, ratings, notifications
            numBookingsAsRenter: fc.integer({ min: 0, max: 3 }),
            numBookingsAsProvider: fc.integer({ min: 0, max: 3 }),
            numMessages: fc.integer({ min: 0, max: 5 }),
            numRatings: fc.integer({ min: 0, max: 3 }),
            numNotifications: fc.integer({ min: 0, max: 5 }),
          }),
          async (data) => {
            // Generate unique identifiers to avoid collisions during shrinking
            const uniqueId = crypto.randomBytes(8).toString('hex');
            const organizationNumber = generateUniqueOrgNumber();
            const uniqueEmail = `${uniqueId}-${data.email}`;
            
            // Create company
            const company = await prisma.company.create({
              data: {
                name: data.companyName,
                organizationNumber,
                businessAddress: '123 Test St',
                city: data.city,
                postalCode: data.postalCode,
                fylke: data.fylke,
                kommune: data.kommune,
                vatRegistered: true,
              },
            });

            // Create user
            const passwordHash = await bcrypt.hash('password123', 12);
            const user = await prisma.user.create({
              data: {
                email: uniqueEmail,
                passwordHash,
                role: Role.COMPANY_ADMIN,
                companyId: company.id,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                emailVerified: true,
              },
            });

            // Create another company for cross-company bookings
            const otherOrgNumber = generateUniqueOrgNumber();
            const otherCompany = await prisma.company.create({
              data: {
                name: 'Other Company',
                organizationNumber: otherOrgNumber,
                businessAddress: '456 Other St',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            // Create vehicle listing for bookings
            const vehicleListing = await prisma.vehicleListing.create({
              data: {
                companyId: otherCompany.id,
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
                withDriver: true,
                withoutDriver: true,
                photos: [],
                tags: [],
              },
            });

            // Create bookings as renter
            const bookingsAsRenter = [];
            for (let i = 0; i < data.numBookingsAsRenter; i++) {
              const booking = await prisma.booking.create({
                data: {
                  bookingNumber: `BK-RENTER-${Date.now()}-${i}`,
                  renterCompanyId: company.id,
                  providerCompanyId: otherCompany.id,
                  vehicleListingId: vehicleListing.id,
                  status: BookingStatus.COMPLETED,
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 86400000),
                  durationDays: 1,
                  providerRate: 3000,
                  platformCommission: 150,
                  platformCommissionRate: 5,
                  taxes: 787.5,
                  taxRate: 25,
                  total: 3937.5,
                  currency: 'NOK',
                  expiresAt: new Date(Date.now() + 86400000),
                },
              });
              bookingsAsRenter.push(booking);
            }

            // Create bookings as provider
            const bookingsAsProvider = [];
            for (let i = 0; i < data.numBookingsAsProvider; i++) {
              const booking = await prisma.booking.create({
                data: {
                  bookingNumber: `BK-PROVIDER-${Date.now()}-${i}`,
                  renterCompanyId: otherCompany.id,
                  providerCompanyId: company.id,
                  vehicleListingId: vehicleListing.id,
                  status: BookingStatus.COMPLETED,
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 86400000),
                  durationDays: 1,
                  providerRate: 3000,
                  platformCommission: 150,
                  platformCommissionRate: 5,
                  taxes: 787.5,
                  taxRate: 25,
                  total: 3937.5,
                  currency: 'NOK',
                  expiresAt: new Date(Date.now() + 86400000),
                },
              });
              bookingsAsProvider.push(booking);
            }

            // Create ratings (only if we have bookings as renter)
            const ratings = [];
            const numRatingsToCreate = Math.min(data.numRatings, bookingsAsRenter.length);
            for (let i = 0; i < numRatingsToCreate; i++) {
              const rating = await prisma.rating.create({
                data: {
                  bookingId: bookingsAsRenter[i].id,
                  renterCompanyId: company.id,
                  providerCompanyId: otherCompany.id,
                  companyStars: 5,
                  companyReview: 'Great service!',
                },
              });
              ratings.push(rating);
            }

            // Create messages (only if we have bookings)
            const messages = [];
            const numMessagesToCreate = (data.numMessages > 0 && bookingsAsRenter.length > 0) ? data.numMessages : 0;
            if (numMessagesToCreate > 0) {
              const messageThread = await prisma.messageThread.create({
                data: {
                  bookingId: bookingsAsRenter[0].id,
                  participants: [user.id],
                },
              });

              for (let i = 0; i < numMessagesToCreate; i++) {
                const message = await prisma.message.create({
                  data: {
                    threadId: messageThread.id,
                    senderId: user.id,
                    content: `Test message ${i}`,
                    readBy: [],
                  },
                });
                messages.push(message);
              }
            }

            // Create notifications
            const notifications = [];
            for (let i = 0; i < data.numNotifications; i++) {
              const notification = await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: NotificationType.BOOKING_REQUEST,
                  title: `Notification ${i}`,
                  message: `Test notification ${i}`,
                  channels: [NotificationChannel.IN_APP],
                },
              });
              notifications.push(notification);
            }

            // Export user data
            const exportedData = await gdprService.exportUserData(user.id);

            // Verify all user data is present
            expect(exportedData.user.id).toBe(user.id);
            expect(exportedData.user.email).toBe(uniqueEmail);
            expect(exportedData.user.firstName).toBe(data.firstName);
            expect(exportedData.user.lastName).toBe(data.lastName);
            expect(exportedData.user.phone).toBe(data.phone);

            // Verify company data is present
            expect(exportedData.company.id).toBe(company.id);
            expect(exportedData.company.name).toBe(data.companyName);
            expect(exportedData.company.organizationNumber).toBe(organizationNumber);
            expect(exportedData.company.city).toBe(data.city);

            // Verify bookings as renter
            expect(exportedData.bookingsAsRenter).toHaveLength(data.numBookingsAsRenter);
            for (const booking of exportedData.bookingsAsRenter) {
              expect(booking).toHaveProperty('id');
              expect(booking).toHaveProperty('bookingNumber');
              expect(booking).toHaveProperty('status');
              expect(booking).toHaveProperty('total');
            }

            // Verify bookings as provider
            expect(exportedData.bookingsAsProvider).toHaveLength(data.numBookingsAsProvider);
            for (const booking of exportedData.bookingsAsProvider) {
              expect(booking).toHaveProperty('id');
              expect(booking).toHaveProperty('bookingNumber');
              expect(booking).toHaveProperty('status');
              expect(booking).toHaveProperty('total');
            }

            // Verify ratings (should match the actual number created)
            expect(exportedData.ratings).toHaveLength(numRatingsToCreate);
            for (const rating of exportedData.ratings) {
              expect(rating).toHaveProperty('id');
              expect(rating).toHaveProperty('bookingId');
              expect(rating).toHaveProperty('companyStars');
            }

            // Verify messages (should match the actual number created)
            expect(exportedData.messages).toHaveLength(numMessagesToCreate);
            for (const message of exportedData.messages) {
              expect(message).toHaveProperty('id');
              expect(message).toHaveProperty('content');
              expect(message).toHaveProperty('threadId');
            }

            // Verify notifications
            expect(exportedData.notifications).toHaveLength(data.numNotifications);
            for (const notification of exportedData.notifications) {
              expect(notification).toHaveProperty('id');
              expect(notification).toHaveProperty('type');
              expect(notification).toHaveProperty('title');
              expect(notification).toHaveProperty('message');
            }

            // Verify audit logs (empty for non-admin users)
            expect(exportedData.auditLogs).toBeDefined();
            expect(Array.isArray(exportedData.auditLogs)).toBe(true);
          }
        ),
        { numRuns: 5 } // Reduced to avoid database connection issues
      );
    });
  });

  describe('Property 34: GDPR data deletion completeness', () => {
    /**
     * **Feature: vider-transport-marketplace, Property 34: GDPR data deletion completeness**
     * **Validates: Requirements 20.2, 20.5**
     * 
     * For any account deletion request, all personal data must be removed or anonymized 
     * from all system tables while preserving necessary transaction records for legal compliance.
     */
    it('should anonymize all personal data for any user while preserving transaction records', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 8, maxLength: 15 }),
            companyName: fc.string({ minLength: 1, maxLength: 100 }),
            numMessages: fc.integer({ min: 1, max: 5 }),
            numNotifications: fc.integer({ min: 1, max: 5 }),
          }),
          async (data) => {
            // Generate unique identifiers to avoid collisions during shrinking
            const uniqueId = crypto.randomBytes(8).toString('hex');
            const organizationNumber = generateUniqueOrgNumber();
            const otherOrgNumber = generateUniqueOrgNumber();
            const uniqueEmail = `${uniqueId}-${data.email}`;
            const uniqueEmail2 = `${uniqueId}-admin2@example.com`;
            
            // Create company with multiple admins so we can delete one
            const company = await prisma.company.create({
              data: {
                name: data.companyName,
                organizationNumber,
                businessAddress: '123 Test St',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            // Create first admin (the one we'll delete)
            const passwordHash = await bcrypt.hash('password123', 12);
            const user = await prisma.user.create({
              data: {
                email: uniqueEmail,
                passwordHash,
                role: Role.COMPANY_ADMIN,
                companyId: company.id,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                emailVerified: true,
              },
            });

            // Create second admin so company still has an admin after deletion
            const secondAdmin = await prisma.user.create({
              data: {
                email: uniqueEmail2,
                passwordHash,
                role: Role.COMPANY_ADMIN,
                companyId: company.id,
                firstName: 'Admin',
                lastName: 'Two',
                phone: '12345678',
                emailVerified: true,
              },
            });

            // Create other company for bookings
            const otherCompany = await prisma.company.create({
              data: {
                name: 'Other Company',
                organizationNumber: otherOrgNumber,
                businessAddress: '456 Other St',
                city: 'Oslo',
                postalCode: '0002',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            // Create vehicle listing
            const vehicleListing = await prisma.vehicleListing.create({
              data: {
                companyId: otherCompany.id,
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
                withDriver: true,
                withoutDriver: true,
                photos: [],
                tags: [],
              },
            });

            // Create completed booking (no active bookings)
            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}`,
                renterCompanyId: company.id,
                providerCompanyId: otherCompany.id,
                vehicleListingId: vehicleListing.id,
                status: BookingStatus.COMPLETED,
                startDate: new Date(Date.now() - 172800000), // 2 days ago
                endDate: new Date(Date.now() - 86400000), // 1 day ago
                durationDays: 1,
                providerRate: 3000,
                platformCommission: 150,
                platformCommissionRate: 5,
                taxes: 787.5,
                taxRate: 25,
                total: 3937.5,
                currency: 'NOK',
                expiresAt: new Date(Date.now() - 86400000),
              },
            });

            // Create message thread and messages
            const messageThread = await prisma.messageThread.create({
              data: {
                bookingId: booking.id,
                participants: [user.id],
              },
            });

            const originalMessageContents: string[] = [];
            for (let i = 0; i < data.numMessages; i++) {
              const content = `Original message ${i}`;
              originalMessageContents.push(content);
              await prisma.message.create({
                data: {
                  threadId: messageThread.id,
                  senderId: user.id,
                  content,
                  readBy: [],
                },
              });
            }

            // Create notifications
            for (let i = 0; i < data.numNotifications; i++) {
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  type: NotificationType.BOOKING_REQUEST,
                  title: `Notification ${i}`,
                  message: `Test notification ${i}`,
                  channels: [NotificationChannel.IN_APP],
                },
              });
            }

            // Create notification preferences
            await prisma.notificationPreferences.create({
              data: {
                userId: user.id,
                emailEnabled: true,
                inAppEnabled: true,
                bookingUpdates: true,
                messages: true,
                ratings: true,
                marketing: false,
              },
            });

            // Delete user account
            await gdprService.deleteUserAccount(user.id);

            // Verify user data is anonymized
            const deletedUser = await prisma.user.findUnique({
              where: { id: user.id },
            });

            expect(deletedUser).not.toBeNull();
            expect(deletedUser!.email).not.toBe(uniqueEmail);
            expect(deletedUser!.email).toContain('deleted-');
            expect(deletedUser!.email).toContain('@anonymized.local');
            expect(deletedUser!.firstName).toBe('Deleted');
            expect(deletedUser!.lastName).toBe('User');
            expect(deletedUser!.phone).toBe('DELETED');
            expect(deletedUser!.passwordHash).toBe('DELETED');
            expect(deletedUser!.emailVerified).toBe(false);
            expect(deletedUser!.verificationToken).toBeNull();
            expect(deletedUser!.resetPasswordToken).toBeNull();

            // Verify messages are anonymized
            const messages = await prisma.message.findMany({
              where: { senderId: user.id },
            });
            expect(messages).toHaveLength(data.numMessages);
            for (const message of messages) {
              expect(message.content).toBe('[Message deleted by user]');
              expect(originalMessageContents).not.toContain(message.content);
            }

            // Verify notifications are deleted
            const notifications = await prisma.notification.findMany({
              where: { userId: user.id },
            });
            expect(notifications).toHaveLength(0);

            // Verify notification preferences are deleted
            const preferences = await prisma.notificationPreferences.findUnique({
              where: { userId: user.id },
            });
            expect(preferences).toBeNull();

            // Verify booking is preserved (for legal/financial records)
            const preservedBooking = await prisma.booking.findUnique({
              where: { id: booking.id },
            });
            expect(preservedBooking).not.toBeNull();
            expect(preservedBooking!.renterCompanyId).toBe(company.id);

            // Verify company is preserved
            const preservedCompany = await prisma.company.findUnique({
              where: { id: company.id },
            });
            expect(preservedCompany).not.toBeNull();
          }
        ),
        { numRuns: 5 } // Reduced to avoid database connection issues
      );
    });
  });

  describe('Unit Tests', () => {
    it('should throw error when exporting data for non-existent user', async () => {
      await expect(gdprService.exportUserData('non-existent-id')).rejects.toThrow('USER_NOT_FOUND');
    });

    it('should throw error when deleting non-existent user', async () => {
      await expect(gdprService.deleteUserAccount('non-existent-id')).rejects.toThrow('USER_NOT_FOUND');
    });

    it('should throw error when deleting sole company admin', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: '123456789',
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const passwordHash = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash,
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
          firstName: 'Admin',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      await expect(gdprService.deleteUserAccount(user.id)).rejects.toThrow(
        'CANNOT_DELETE_SOLE_COMPANY_ADMIN'
      );
    });

    it('should throw error when deleting user with active bookings', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: '123456789',
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const passwordHash = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash,
          role: Role.COMPANY_USER,
          companyId: company.id,
          firstName: 'Test',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      const otherCompany = await prisma.company.create({
        data: {
          name: 'Other Company',
          organizationNumber: '999999999',
          businessAddress: '456 Other St',
          city: 'Oslo',
          postalCode: '0002',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const vehicleListing = await prisma.vehicleListing.create({
        data: {
          companyId: otherCompany.id,
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
          withDriver: true,
          withoutDriver: true,
          photos: [],
          tags: [],
        },
      });

      // Create active booking
      await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}`,
          renterCompanyId: company.id,
          providerCompanyId: otherCompany.id,
          vehicleListingId: vehicleListing.id,
          status: BookingStatus.ACTIVE,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          durationDays: 1,
          providerRate: 3000,
          platformCommission: 150,
          platformCommissionRate: 5,
          taxes: 787.5,
          taxRate: 25,
          total: 3937.5,
          currency: 'NOK',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      await expect(gdprService.deleteUserAccount(user.id)).rejects.toThrow(
        'CANNOT_DELETE_USER_WITH_ACTIVE_BOOKINGS'
      );
    });

    it('should retrieve audit logs for user', async () => {
      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          organizationNumber: '123456789',
          businessAddress: '123 Test St',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
        },
      });

      const passwordHash = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          passwordHash,
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
          firstName: 'Test',
          lastName: 'User',
          phone: '12345678',
          emailVerified: true,
        },
      });

      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash,
          role: Role.PLATFORM_ADMIN,
          companyId: company.id,
          firstName: 'Admin',
          lastName: 'User',
          phone: '87654321',
          emailVerified: true,
        },
      });

      // Create audit log for company verification
      await prisma.auditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: 'VERIFY_COMPANY',
          entityType: 'Company',
          entityId: company.id,
          changes: { verified: true },
        },
      });

      const auditLogs = await gdprService.getUserAuditLog(user.id);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('VERIFY_COMPANY');
      expect(auditLogs[0].entityType).toBe('Company');
      expect(auditLogs[0].entityId).toBe(company.id);
    });
  });
});
