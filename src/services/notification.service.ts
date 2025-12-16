import {
  PrismaClient,
  NotificationType,
  NotificationChannel,
  Notification,
  NotificationPreferences,
} from '@prisma/client';
import { logger } from '../config/logger';
import nodemailer from 'nodemailer';
import { config } from '../config/env';

const prisma = new PrismaClient();

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferencesData {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  bookingUpdates?: boolean;
  messages?: boolean;
  ratings?: boolean;
  marketing?: boolean;
}

// Critical notifications that override user preferences
const CRITICAL_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.BOOKING_ACCEPTED,
  NotificationType.BOOKING_DECLINED,
  NotificationType.BOOKING_EXPIRED,
  NotificationType.DISPUTE_RAISED,
  NotificationType.DISPUTE_RESOLVED,
];

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Initialize email transporter if SMTP is configured
    if (config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASSWORD,
        },
      });

      logger.info('Email transporter initialized', {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
      });
    } else {
      logger.warn('SMTP not configured, email notifications will be logged only');
    }
  }

  /**
   * Send a notification to a user
   * Respects user preferences unless it's a critical notification
   */
  async sendNotification(
    userId: string,
    notification: NotificationData
  ): Promise<void> {
    // Get user and their preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Get or create notification preferences
    let preferences = await this.getPreferences(userId);
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    // Determine if this is a critical notification
    const isCritical = CRITICAL_NOTIFICATION_TYPES.includes(notification.type);

    // Determine which channels to use
    const channels = this.determineChannels(notification.type, preferences, isCritical);

    if (channels.length === 0) {
      logger.info('Notification skipped due to user preferences', {
        userId,
        type: notification.type,
      });
      return;
    }

    // Create in-app notification if applicable
    if (channels.includes(NotificationChannel.IN_APP)) {
      await prisma.notification.create({
        data: {
          userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata || {},
          channels: [NotificationChannel.IN_APP],
        },
      });
    }

    // Send email notification if applicable
    if (channels.includes(NotificationChannel.EMAIL)) {
      await this.sendEmailNotification(user.email, notification);
    }

    logger.info('Notification sent', {
      userId,
      type: notification.type,
      channels,
      isCritical,
    });
  }

  /**
   * Determine which channels to use based on preferences and notification type
   */
  private determineChannels(
    type: NotificationType,
    preferences: NotificationPreferences,
    isCritical: boolean
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // For critical notifications, always send through all channels
    if (isCritical) {
      if (preferences.emailEnabled) {
        channels.push(NotificationChannel.EMAIL);
      }
      if (preferences.inAppEnabled) {
        channels.push(NotificationChannel.IN_APP);
      }
      return channels;
    }

    // For non-critical notifications, respect user preferences
    const shouldSend = this.shouldSendNotification(type, preferences);

    if (shouldSend) {
      if (preferences.emailEnabled) {
        channels.push(NotificationChannel.EMAIL);
      }
      if (preferences.inAppEnabled) {
        channels.push(NotificationChannel.IN_APP);
      }
    }

    return channels;
  }

  /**
   * Check if notification should be sent based on type and preferences
   */
  private shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    // Map notification types to preference settings
    switch (type) {
      case NotificationType.BOOKING_REQUEST:
      case NotificationType.BOOKING_ACCEPTED:
      case NotificationType.BOOKING_DECLINED:
      case NotificationType.BOOKING_EXPIRED:
      case NotificationType.BOOKING_COMPLETED:
        return preferences.bookingUpdates;

      case NotificationType.MESSAGE_RECEIVED:
        return preferences.messages;

      case NotificationType.RATING_RECEIVED:
        return preferences.ratings;

      case NotificationType.COMPANY_VERIFIED:
      case NotificationType.DRIVER_VERIFIED:
      case NotificationType.LISTING_SUSPENDED:
        return preferences.bookingUpdates; // Use bookingUpdates for business-related notifications

      case NotificationType.DISPUTE_RAISED:
      case NotificationType.DISPUTE_RESOLVED:
        return true; // Always send dispute notifications (they're critical)

      case NotificationType.AVAILABILITY_CONFLICT:
      case NotificationType.BOOKING_REJECTED_BLOCKED_DATES:
        return preferences.bookingUpdates; // Use bookingUpdates for availability-related notifications

      default:
        return true;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    email: string,
    notification: NotificationData
  ): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email notification skipped - SMTP not configured', {
        email,
        type: notification.type,
      });
      return;
    }

    const emailContent = this.generateEmailContent(notification);

    try {
      await this.transporter.sendMail({
        from: config.SMTP_FROM || 'noreply@vider.no',
        to: email,
        subject: notification.title,
        html: emailContent,
        text: notification.message,
      });

      logger.info('Email sent', { email, type: notification.type });
    } catch (error) {
      logger.error('Failed to send email', {
        email,
        type: notification.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - we don't want email failures to break the notification flow
    }
  }

  /**
   * Generate HTML email content based on notification type
   */
  private generateEmailContent(notification: NotificationData): string {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Vider</h1>
            </div>
            <div class="content">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              ${this.getNotificationTypeSpecificContent(notification)}
            </div>
            <div class="footer">
              <p>This is an automated message from Vider. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} Vider. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return baseTemplate;
  }

  /**
   * Get notification type-specific content for emails
   */
  private getNotificationTypeSpecificContent(notification: NotificationData): string {
    const metadata = notification.metadata || {};

    switch (notification.type) {
      case NotificationType.BOOKING_REQUEST:
        return `
          <p><strong>Booking Number:</strong> ${metadata.bookingNumber || 'N/A'}</p>
          <p><strong>Renter:</strong> ${metadata.renterCompanyName || 'N/A'}</p>
          <a href="${config.FRONTEND_URL}/bookings/${metadata.bookingId}" class="button">View Booking</a>
        `;

      case NotificationType.BOOKING_ACCEPTED:
        return `
          <p><strong>Booking Number:</strong> ${metadata.bookingNumber || 'N/A'}</p>
          <p>Your booking has been accepted by the provider.</p>
          <a href="${config.FRONTEND_URL}/bookings/${metadata.bookingId}" class="button">View Booking</a>
        `;

      case NotificationType.MESSAGE_RECEIVED:
        return `
          <p><strong>From:</strong> ${metadata.senderName || 'N/A'}</p>
          <p><strong>Booking:</strong> ${metadata.bookingNumber || 'N/A'}</p>
          <a href="${config.FRONTEND_URL}/messages/${metadata.threadId}" class="button">View Message</a>
        `;

      case NotificationType.RATING_RECEIVED:
        return `
          <p><strong>Rating:</strong> ${metadata.stars || 'N/A'} stars</p>
          <p><strong>Booking:</strong> ${metadata.bookingNumber || 'N/A'}</p>
          <a href="${config.FRONTEND_URL}/ratings" class="button">View Rating</a>
        `;

      default:
        return '';
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferencesData: NotificationPreferencesData
  ): Promise<NotificationPreferences> {
    // Check if preferences exist
    const existing = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (existing) {
      return prisma.notificationPreferences.update({
        where: { userId },
        data: preferencesData,
      });
    } else {
      return prisma.notificationPreferences.create({
        data: {
          userId,
          ...preferencesData,
        },
      });
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    return prisma.notificationPreferences.findUnique({
      where: { userId },
    });
  }

  /**
   * Create default notification preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    return prisma.notificationPreferences.create({
      data: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        bookingUpdates: true,
        messages: true,
        ratings: true,
        marketing: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    if (notification.read) {
      return; // Already marked as read
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    logger.info('Notification marked as read', { notificationId });
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    const where: any = { userId };

    if (options?.unreadOnly) {
      where.read = false;
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    logger.info('All notifications marked as read', { userId });
  }
}

export const notificationService = new NotificationService();
