/**
 * User Service
 * Handles user profile management operations
 */

import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  company: {
    id: string;
    name: string;
    organizationNumber: string;
    verified: boolean;
  };
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export class UserService {
  private readonly SALT_ROUNDS = 12;

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            organizationNumber: true,
            verified: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      company: user.company,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileData): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            organizationNumber: true,
            verified: true,
          },
        },
      },
    });

    logger.info('User profile updated', { userId, updatedFields: Object.keys(data) });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      company: updatedUser.company,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        isTemporaryPassword: false, // Mark password as no longer temporary
        updatedAt: new Date(),
      },
    });

    logger.info('User password changed', { userId });
  }

  /**
   * Delete user account
   */
  async deleteUserAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // Check if user is the only admin for their company
    if (user.role === Role.COMPANY_ADMIN) {
      const adminCount = user.company.users.filter(u => u.role === Role.COMPANY_ADMIN).length;
      if (adminCount === 1) {
        throw new Error('CANNOT_DELETE_COMPANY_ADMIN');
      }
    }

    // Delete user and related data
    await prisma.$transaction(async (tx) => {
      // Delete user's availability blocks
      await tx.availabilityBlock.deleteMany({
        where: { createdBy: userId },
      });

      // Delete user's recurring blocks
      await tx.recurringBlock.deleteMany({
        where: { createdBy: userId },
      });

      // Delete user's messages
      await tx.message.deleteMany({
        where: { senderId: userId },
      });

      // Delete user's audit logs
      await tx.auditLog.deleteMany({
        where: { adminUserId: userId },
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    logger.info('User account deleted', { userId });
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<{
    totalBookings: number;
    totalListings: number;
    memberSince: Date;
    lastLogin: Date | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          include: {
            bookingsAsProvider: true,
            bookingsAsRenter: true,
            vehicleListings: true,
            driverListings: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const totalBookings = user.company.bookingsAsProvider.length + user.company.bookingsAsRenter.length;
    const totalListings = user.company.vehicleListings.length + user.company.driverListings.length;

    return {
      totalBookings,
      totalListings,
      memberSince: user.createdAt,
      lastLogin: null, // We don't track last login currently
    };
  }
}

export const userService = new UserService();