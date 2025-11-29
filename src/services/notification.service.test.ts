import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client';
import { NotificationService, NotificationData } from './notification.service';
import * as fc from 'fast-check';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

describe('NotificationService', () => {
  let testUserId: string;
  let testCompanyId: string;

  beforeEach(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        organizationNumber: '123456789',
        businessAddress: 'Test Address',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      },
    });
    testCompanyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'COMPANY_USER',
        companyId: testCompanyId,
        firstName: 'Test',
        lastName: 'User',
        phone: '12345678',
        emailVerified: true,
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.notificationPreferences.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.company.deleteMany({ where: { id: testCompanyId } });
  });

  describe('Property 43: Notification preference enforcement', () => {
    /**
     * **Feature: vider-transport-marketplace, Property 43: Notification preference enforcement**
     * **Validates: Requirements 26.5**
     * 
     * For any non-critical notification, the system must respect the user's channel preferences
     * (email/in-app) and only send through enabled channels.
     */
    it('should respect user preferences for non-critical notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random preference settings
          fc.record({
            emailEnabled: fc.boolean(),
            inAppEnabled: fc.boolean(),
            bookingUpdates: fc.boolean(),
            messages: fc.boolean(),
            ratings: fc.boolean(),
          }),
          // Generate random non-critical notification type
          fc.constantFrom(
            NotificationType.BOOKING_REQUEST,
            NotificationType.BOOKING_COMPLETED,
            NotificationType.MESSAGE_RECEIVED,
            NotificationType.RATING_RECEIVED,
            NotificationType.COMPANY_VERIFIED,
            NotificationType.DRIVER_VERIFIED,
            NotificationType.LISTING_SUSPENDED
          ),
          async (preferences, notificationType) => {
            // Set user preferences
            await notificationService.updatePreferences(testUserId, preferences);

            // Send notification
            const notification: NotificationData = {
              type: notificationType,
              title: 'Test Notification',
              message: 'Test message',
            };

            await notificationService.sendNotification(testUserId, notification);

            // Check if notification was created based on preferences
            const notifications = await prisma.notification.findMany({
              where: { userId: testUserId, type: notificationType },
            });

            // Determine if notification should have been sent
            let shouldSend = false;
            switch (notificationType) {
              case NotificationType.BOOKING_REQUEST:
              case NotificationType.BOOKING_COMPLETED:
                shouldSend = preferences.bookingUpdates;
                break;
              case NotificationType.MESSAGE_RECEIVED:
                shouldSend = preferences.messages;
                break;
              case NotificationType.RATING_RECEIVED:
                shouldSend = preferences.ratings;
                break;
              case NotificationType.COMPANY_VERIFIED:
              case NotificationType.DRIVER_VERIFIED:
              case NotificationType.LISTING_SUSPENDED:
                shouldSend = preferences.bookingUpdates;
                break;
            }

            if (shouldSend) {
              // If should send, check that at least one channel is enabled
              const hasEnabledChannel = preferences.emailEnabled || preferences.inAppEnabled;
              
              if (hasEnabledChannel) {
                // If in-app is enabled, should have created in-app notification
                if (preferences.inAppEnabled) {
                  expect(notifications.length).toBeGreaterThan(0);
                  expect(notifications.some(n => n.channels.includes(NotificationChannel.IN_APP))).toBe(true);
                } else if (preferences.emailEnabled) {
                  // Email only - no in-app notification created, but email was sent (logged)
                  // We can't verify email was sent in tests without mocking, so we just verify
                  // that no in-app notification was created when in-app is disabled
                  expect(notifications.length).toBe(0);
                }
              } else {
                // No channels enabled, should not send
                expect(notifications.length).toBe(0);
              }
            } else {
              // Preference disabled for this type, should not send
              expect(notifications.length).toBe(0);
            }

            // Clean up for next iteration
            await prisma.notification.deleteMany({ where: { userId: testUserId } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 44: Critical notification override', () => {
    /**
     * **Feature: vider-transport-marketplace, Property 44: Critical notification override**
     * **Validates: Requirements 26.3**
     * 
     * For any critical event (e.g., booking cancellation, dispute raised), the system must send
     * notifications regardless of user preferences.
     */
    it('should send critical notifications regardless of user preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random preference settings (all disabled)
          fc.record({
            emailEnabled: fc.boolean(),
            inAppEnabled: fc.boolean(),
            bookingUpdates: fc.constant(false), // Explicitly disable
            messages: fc.constant(false),
            ratings: fc.constant(false),
          }),
          // Generate random critical notification type
          fc.constantFrom(
            NotificationType.BOOKING_ACCEPTED,
            NotificationType.BOOKING_DECLINED,
            NotificationType.BOOKING_EXPIRED,
            NotificationType.DISPUTE_RAISED,
            NotificationType.DISPUTE_RESOLVED
          ),
          async (preferences, notificationType) => {
            // Set user preferences with notifications disabled
            await notificationService.updatePreferences(testUserId, preferences);

            // Send critical notification
            const notification: NotificationData = {
              type: notificationType,
              title: 'Critical Notification',
              message: 'Critical message',
            };

            await notificationService.sendNotification(testUserId, notification);

            // Check that notification was created despite preferences
            const notifications = await prisma.notification.findMany({
              where: { userId: testUserId, type: notificationType },
            });

            // Critical notifications should always be sent if at least one channel is enabled
            const hasEnabledChannel = preferences.emailEnabled || preferences.inAppEnabled;
            
            if (hasEnabledChannel) {
              // If in-app is enabled, should have created in-app notification
              if (preferences.inAppEnabled) {
                expect(notifications.length).toBeGreaterThan(0);
                expect(notifications.some(n => n.channels.includes(NotificationChannel.IN_APP))).toBe(true);
              } else if (preferences.emailEnabled) {
                // Email only - no in-app notification created, but email was sent (logged)
                // We can't verify email was sent in tests without mocking, so we just verify
                // that no in-app notification was created when in-app is disabled
                expect(notifications.length).toBe(0);
              }
            } else {
              // If both channels are disabled, no notification can be sent
              expect(notifications.length).toBe(0);
            }

            // Clean up for next iteration
            await prisma.notification.deleteMany({ where: { userId: testUserId } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    it('should create default preferences for new user', async () => {
      const preferences = await notificationService.getPreferences(testUserId);
      
      // Should be null initially
      expect(preferences).toBeNull();

      // Send a notification to trigger default preference creation
      await notificationService.sendNotification(testUserId, {
        type: NotificationType.BOOKING_REQUEST,
        title: 'Test',
        message: 'Test',
      });

      // Now preferences should exist
      const newPreferences = await notificationService.getPreferences(testUserId);
      expect(newPreferences).not.toBeNull();
      expect(newPreferences?.emailEnabled).toBe(true);
      expect(newPreferences?.inAppEnabled).toBe(true);
    });

    it('should update user preferences', async () => {
      await notificationService.updatePreferences(testUserId, {
        emailEnabled: false,
        bookingUpdates: false,
      });

      const preferences = await notificationService.getPreferences(testUserId);
      expect(preferences?.emailEnabled).toBe(false);
      expect(preferences?.bookingUpdates).toBe(false);
      expect(preferences?.inAppEnabled).toBe(true); // Should remain default
    });

    it('should mark notification as read', async () => {
      // Create a notification
      const notification = await prisma.notification.create({
        data: {
          userId: testUserId,
          type: NotificationType.BOOKING_REQUEST,
          title: 'Test',
          message: 'Test',
          channels: [NotificationChannel.IN_APP],
        },
      });

      expect(notification.read).toBe(false);

      // Mark as read
      await notificationService.markAsRead(notification.id);

      // Verify
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.read).toBe(true);
      expect(updated?.readAt).not.toBeNull();
    });

    it('should get unread count', async () => {
      // Create multiple notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            type: NotificationType.BOOKING_REQUEST,
            title: 'Test 1',
            message: 'Test 1',
            channels: [NotificationChannel.IN_APP],
            read: false,
          },
          {
            userId: testUserId,
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'Test 2',
            message: 'Test 2',
            channels: [NotificationChannel.IN_APP],
            read: false,
          },
          {
            userId: testUserId,
            type: NotificationType.RATING_RECEIVED,
            title: 'Test 3',
            message: 'Test 3',
            channels: [NotificationChannel.IN_APP],
            read: true,
          },
        ],
      });

      const count = await notificationService.getUnreadCount(testUserId);
      expect(count).toBe(2);
    });

    it('should get user notifications', async () => {
      // Create notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            type: NotificationType.BOOKING_REQUEST,
            title: 'Test 1',
            message: 'Test 1',
            channels: [NotificationChannel.IN_APP],
          },
          {
            userId: testUserId,
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'Test 2',
            message: 'Test 2',
            channels: [NotificationChannel.IN_APP],
          },
        ],
      });

      const notifications = await notificationService.getUserNotifications(testUserId);
      expect(notifications.length).toBe(2);
    });

    it('should mark all notifications as read', async () => {
      // Create notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            type: NotificationType.BOOKING_REQUEST,
            title: 'Test 1',
            message: 'Test 1',
            channels: [NotificationChannel.IN_APP],
            read: false,
          },
          {
            userId: testUserId,
            type: NotificationType.MESSAGE_RECEIVED,
            title: 'Test 2',
            message: 'Test 2',
            channels: [NotificationChannel.IN_APP],
            read: false,
          },
        ],
      });

      await notificationService.markAllAsRead(testUserId);

      const unreadCount = await notificationService.getUnreadCount(testUserId);
      expect(unreadCount).toBe(0);
    });
  });
});
