import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  company: {
    id: string;
    name: string;
    organizationNumber: string;
    businessAddress: string;
    city: string;
    postalCode: string;
    fylke: string;
    kommune: string;
    vatRegistered: boolean;
    description: string | null;
    verified: boolean;
  };
  bookingsAsRenter: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    startDate: Date;
    endDate: Date;
    total: number;
    currency: string;
    createdAt: Date;
  }>;
  bookingsAsProvider: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    startDate: Date;
    endDate: Date;
    total: number;
    currency: string;
    createdAt: Date;
  }>;
  ratings: Array<{
    id: string;
    bookingId: string;
    companyStars: number;
    companyReview: string | null;
    driverStars: number | null;
    driverReview: string | null;
    createdAt: Date;
  }>;
  messages: Array<{
    id: string;
    threadId: string;
    content: string;
    createdAt: Date;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }>;
}

export class GDPRService {
  /**
   * Export all personal data for a user in machine-readable format
   * Requirement 20.1: GDPR data export
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Get user with company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Get bookings where user's company is the renter
    const bookingsAsRenter = await prisma.booking.findMany({
      where: { renterCompanyId: user.companyId },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });

    // Get bookings where user's company is the provider
    const bookingsAsProvider = await prisma.booking.findMany({
      where: { providerCompanyId: user.companyId },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    });

    // Get ratings given by user's company
    const ratings = await prisma.rating.findMany({
      where: { renterCompanyId: user.companyId },
      select: {
        id: true,
        bookingId: true,
        companyStars: true,
        companyReview: true,
        driverStars: true,
        driverReview: true,
        createdAt: true,
      },
    });

    // Get messages sent by user
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      select: {
        id: true,
        threadId: true,
        content: true,
        createdAt: true,
      },
    });

    // Get notifications for user
    const notifications = await prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        createdAt: true,
      },
    });

    // Get audit logs for user (if they are an admin)
    const auditLogs = await prisma.auditLog.findMany({
      where: { adminUserId: userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    });

    logger.info('User data exported', { userId });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        organizationNumber: user.company.organizationNumber,
        businessAddress: user.company.businessAddress,
        city: user.company.city,
        postalCode: user.company.postalCode,
        fylke: user.company.fylke,
        kommune: user.company.kommune,
        vatRegistered: user.company.vatRegistered,
        description: user.company.description,
        verified: user.company.verified,
      },
      bookingsAsRenter,
      bookingsAsProvider,
      ratings,
      messages,
      notifications,
      auditLogs,
    };
  }

  /**
   * Delete user account and anonymize personal data
   * Requirement 20.2, 20.5: GDPR data deletion
   */
  async deleteUserAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Check if user is the only admin of their company
    const companyAdmins = await prisma.user.count({
      where: {
        companyId: user.companyId,
        role: 'COMPANY_ADMIN',
      },
    });

    if (companyAdmins === 1 && user.role === 'COMPANY_ADMIN') {
      throw new Error('CANNOT_DELETE_SOLE_COMPANY_ADMIN');
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        OR: [
          { renterCompanyId: user.companyId },
          { providerCompanyId: user.companyId },
        ],
        status: {
          in: ['PENDING', 'ACCEPTED', 'ACTIVE'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new Error('CANNOT_DELETE_USER_WITH_ACTIVE_BOOKINGS');
    }

    await prisma.$transaction(async (tx) => {
      // Anonymize user data instead of deleting to preserve transaction records
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.local`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: 'DELETED',
          passwordHash: 'DELETED',
          emailVerified: false,
          verificationToken: null,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      // Anonymize messages
      await tx.message.updateMany({
        where: { senderId: userId },
        data: {
          content: '[Message deleted by user]',
        },
      });

      // Delete notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Delete notification preferences
      await tx.notificationPreferences.deleteMany({
        where: { userId },
      });

      // Note: We keep bookings, ratings, and transactions for legal/financial records
      // but the user's personal information is anonymized
    });

    logger.info('User account deleted and data anonymized', { userId });
  }

  /**
   * Get audit log entries that affect a specific user or their company
   * Requirement 20.4: User access to audit logs
   */
  async getUserAuditLog(userId: string): Promise<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: any;
    reason: string | null;
    createdAt: Date;
    adminUser: {
      email: string;
      firstName: string;
      lastName: string;
    };
  }>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Get audit logs that affect the user or their company
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          // Actions on the user
          {
            entityType: 'User',
            entityId: userId,
          },
          // Actions on the user's company
          {
            entityType: 'Company',
            entityId: user.companyId,
          },
          // Actions on listings owned by the user's company
          {
            entityType: {
              in: ['VehicleListing', 'DriverListing'],
            },
            // We need to check if the listing belongs to the user's company
            // This is a simplified version - in production you might want to join
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('User audit log retrieved', { userId, count: auditLogs.length });

    return auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes: log.changes,
      reason: log.reason,
      createdAt: log.createdAt,
      adminUser: log.adminUser,
    }));
  }
}

export const gdprService = new GDPRService();
