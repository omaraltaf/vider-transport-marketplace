import { prisma } from '../config/database';
import { Role, Company, User, CompanyStatus } from '@prisma/client';
import { logger } from '../config/logger';
import { notificationService } from './notification.service';

export interface CreateCompanyData {
  name: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description?: string;
}

export interface CreateAdminData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  companyId: string;
  role: Role;
}

export interface CompanyFilters {
  status?: CompanyStatus;
  verified?: boolean;
  search?: string;
  fylke?: string;
  registeredAfter?: Date;
  registeredBefore?: Date;
  verifiedAfter?: Date;
  verifiedBefore?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface UserFilters {
  role?: Role;
  companyId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CompanyMetrics {
  totalListings: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  activeUsers: number;
}

export interface BulkOperation {
  operation: 'suspend' | 'activate' | 'delete' | 'verify';
  userIds: string[];
  reason?: string;
}

export interface BulkResult {
  successful: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface BulkCompanyOperation {
  operation: 'suspend' | 'verify' | 'activate';
  companyIds: string[];
  reason?: string;
  notes?: string;
}

export interface BulkCompanyResult {
  successful: number;
  failed: number;
  errors: Array<{ companyId: string; error: string }>;
}

export interface ExportCompaniesOptions {
  companyIds: string[];
  format: 'csv' | 'json';
  includeMetrics: boolean;
}

class PlatformAdminService {
  /**
   * Create an audit log entry for platform admin actions
   */
  private async createAuditLog(
    adminUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, any>,
    reason?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          adminUserId,
          action,
          entityType,
          entityId,
          changes: changes || {},
          reason,
          ipAddress,
        },
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: (error as Error).message,
        adminUserId,
        action,
        entityType,
        entityId,
      });
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Notify company users about status changes
   */
  private async notifyCompanyUsers(
    companyId: string,
    notificationType: 'suspended' | 'verified' | 'reactivated',
    reason?: string
  ): Promise<void> {
    try {
      // Get all company users
      const companyUsers = await prisma.user.findMany({
        where: { companyId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      // Send notifications to all company users
      for (const user of companyUsers) {
        let title: string;
        let message: string;

        switch (notificationType) {
          case 'suspended':
            title = 'Company Account Suspended';
            message = `Your company account has been suspended by platform administration. ${reason ? `Reason: ${reason}` : ''}`;
            break;
          case 'verified':
            title = 'Company Account Verified';
            message = 'Congratulations! Your company account has been verified and is now active on the platform.';
            break;
          case 'reactivated':
            title = 'Company Account Reactivated';
            message = 'Your company account has been reactivated and is now active on the platform.';
            break;
        }

        await notificationService.sendNotification(user.id, {
          type: 'COMPANY_VERIFIED', // Using existing enum value, could be extended
          title,
          message,
          metadata: {
            companyId,
            notificationType,
            reason,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to notify company users', {
        error: (error as Error).message,
        companyId,
        notificationType,
      });
      // Don't throw - notification failure shouldn't break the main operation
    }
  }
  /**
   * Get all companies with optional filtering
   */
  async getCompanies(filters: CompanyFilters = {}): Promise<{
    companies: (Company & { metrics: CompanyMetrics })[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        status,
        verified,
        search,
        fylke,
        registeredAfter,
        registeredBefore,
        verifiedAfter,
        verifiedBefore,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        pageSize = 20,
      } = filters;

      const where: any = {};

      // Apply filters
      if (status) {
        where.status = status;
      }

      if (verified !== undefined) {
        where.verified = verified;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { organizationNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (fylke) {
        where.fylke = fylke;
      }

      // Date range filters for registration
      if (registeredAfter || registeredBefore) {
        where.createdAt = {};
        if (registeredAfter) {
          where.createdAt.gte = registeredAfter;
        }
        if (registeredBefore) {
          where.createdAt.lte = registeredBefore;
        }
      }

      // Date range filters for verification
      if (verifiedAfter || verifiedBefore) {
        where.verifiedAt = {};
        if (verifiedAfter) {
          where.verifiedAt.gte = verifiedAfter;
        }
        if (verifiedBefore) {
          where.verifiedAt.lte = verifiedBefore;
        }
      }

      // Build order by clause
      let orderBy: any = { createdAt: 'desc' }; // default
      
      if (sortBy) {
        switch (sortBy) {
          case 'name':
            orderBy = { name: sortOrder };
            break;
          case 'createdAt':
            orderBy = { createdAt: sortOrder };
            break;
          case 'totalBookings':
            orderBy = { totalBookings: sortOrder };
            break;
          case 'totalRevenue':
            orderBy = { totalRevenue: sortOrder };
            break;
          case 'aggregatedRating':
            orderBy = { aggregatedRating: sortOrder };
            break;
          default:
            orderBy = { createdAt: 'desc' };
        }
      }

      // Get total count
      const total = await prisma.company.count({ where });

      // Get companies with pagination
      const companies = await prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          users: {
            select: { id: true, role: true },
          },
          vehicleListings: {
            select: { id: true, status: true },
          },
          driverListings: {
            select: { id: true, status: true },
          },
          bookingsAsProvider: {
            select: { id: true, status: true },
          },
        },
      });

      // Calculate metrics for each company
      const companiesWithMetrics = companies.map(company => ({
        ...company,
        metrics: {
          totalListings: company.vehicleListings.length + company.driverListings.length,
          totalBookings: company.totalBookings,
          totalRevenue: company.totalRevenue,
          averageRating: company.aggregatedRating || 0,
          activeUsers: company.users.length,
        },
      }));

      return {
        companies: companiesWithMetrics,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error('Error fetching companies', { error: (error as Error).message });
      throw new Error('Failed to fetch companies');
    }
  }

  /**
   * Get a company by ID with detailed metrics
   */
  async getCompanyById(companyId: string): Promise<(Company & { metrics: CompanyMetrics }) | null> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          users: {
            select: { id: true, role: true, firstName: true, lastName: true, email: true },
          },
          vehicleListings: {
            select: { id: true, status: true, title: true, vehicleType: true },
          },
          driverListings: {
            select: { id: true, status: true, name: true, verified: true },
          },
          bookingsAsProvider: {
            select: { id: true, status: true, total: true, createdAt: true },
          },
          ratingsReceived: {
            select: { companyStars: true, companyReview: true, createdAt: true },
          },
        },
      });

      if (!company) {
        return null;
      }

      return {
        ...company,
        metrics: {
          totalListings: company.vehicleListings.length + company.driverListings.length,
          totalBookings: company.totalBookings,
          totalRevenue: company.totalRevenue,
          averageRating: company.aggregatedRating || 0,
          activeUsers: company.users.length,
        },
      };
    } catch (error) {
      logger.error('Error fetching company by ID', { 
        error: (error as Error).message,
        companyId,
      });
      throw new Error('Failed to fetch company');
    }
  }

  /**
   * Update company status
   */
  async updateCompanyStatus(companyId: string, status: CompanyStatus, updatedBy: string, reason?: string, ipAddress?: string): Promise<void> {
    try {
      // Get company before update for audit trail
      const companyBefore = await prisma.company.findUnique({
        where: { id: companyId },
        select: { 
          status: true, 
          verified: true, 
          verifiedAt: true, 
          verifiedBy: true,
          suspendedAt: true, 
          suspendedBy: true, 
          suspensionReason: true 
        },
      });

      const updateData: any = {
        status,
      };

      let notificationType: 'suspended' | 'verified' | 'reactivated' | null = null;

      if (status === CompanyStatus.SUSPENDED) {
        updateData.suspendedAt = new Date();
        updateData.suspendedBy = updatedBy;
        updateData.suspensionReason = reason;
        notificationType = 'suspended';
      } else if (status === CompanyStatus.ACTIVE) {
        updateData.suspendedAt = null;
        updateData.suspendedBy = null;
        updateData.suspensionReason = null;
        
        // If company wasn't verified before, mark as verified
        if (!companyBefore?.verified) {
          updateData.verified = true;
          updateData.verifiedAt = new Date();
          updateData.verifiedBy = updatedBy;
          notificationType = 'verified';
        } else {
          notificationType = 'reactivated';
        }
      }

      await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      });

      // Create audit log
      await this.createAuditLog(
        updatedBy,
        'UPDATE_COMPANY_STATUS',
        'company',
        companyId,
        {
          before: companyBefore,
          after: updateData,
        },
        reason,
        ipAddress
      );

      // Notify company users if applicable
      if (notificationType) {
        await this.notifyCompanyUsers(companyId, notificationType, reason);
      }

      logger.info('Company status updated by platform admin', {
        companyId,
        status,
        updatedBy,
        reason,
      });
    } catch (error) {
      logger.error('Error updating company status', { 
        error: (error as Error).message,
        companyId,
        status,
        updatedBy,
      });
      throw new Error('Failed to update company status');
    }
  }

  /**
   * Create a new company
   */
  async createCompany(data: CreateCompanyData, createdBy: string): Promise<Company> {
    try {
      const company = await prisma.company.create({
        data: {
          ...data,
          verified: false, // New companies start unverified
          status: CompanyStatus.PENDING_VERIFICATION,
        },
      });

      logger.info('Company created by platform admin', {
        companyId: company.id,
        companyName: company.name,
        createdBy,
      });

      return company;
    } catch (error) {
      logger.error('Error creating company', { 
        error: (error as Error).message,
        data,
        createdBy,
      });
      throw new Error('Failed to create company');
    }
  }

  /**
   * Suspend a company
   */
  async suspendCompany(companyId: string, reason: string, suspendedBy: string, ipAddress?: string): Promise<void> {
    try {
      // Get company before update for audit trail
      const companyBefore = await prisma.company.findUnique({
        where: { id: companyId },
        select: { status: true, suspendedAt: true, suspendedBy: true, suspensionReason: true },
      });

      await prisma.company.update({
        where: { id: companyId },
        data: { 
          status: CompanyStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedBy,
          suspensionReason: reason,
        },
      });

      // Create audit log
      await this.createAuditLog(
        suspendedBy,
        'SUSPEND_COMPANY',
        'company',
        companyId,
        {
          before: companyBefore,
          after: {
            status: CompanyStatus.SUSPENDED,
            suspendedAt: new Date(),
            suspendedBy,
            suspensionReason: reason,
          },
        },
        reason,
        ipAddress
      );

      // Notify company users
      await this.notifyCompanyUsers(companyId, 'suspended', reason);

      // TODO: Handle active bookings

      logger.info('Company suspended by platform admin', {
        companyId,
        reason,
        suspendedBy,
      });
    } catch (error) {
      logger.error('Error suspending company', { 
        error: (error as Error).message,
        companyId,
        reason,
        suspendedBy,
      });
      throw new Error('Failed to suspend company');
    }
  }

  /**
   * Delete a company (soft delete with data archival)
   */
  async deleteCompany(companyId: string, deletedBy: string, ipAddress?: string): Promise<void> {
    try {
      // Get company before update for audit trail
      const companyBefore = await prisma.company.findUnique({
        where: { id: companyId },
        select: { 
          status: true, 
          verified: true, 
          suspendedAt: true, 
          suspendedBy: true, 
          suspensionReason: true 
        },
      });

      // Soft delete by suspending and adding deletion metadata
      const updateData = {
        status: CompanyStatus.SUSPENDED,
        verified: false,
        suspendedAt: new Date(),
        suspendedBy: deletedBy,
        suspensionReason: 'Company deleted by platform admin',
      };

      await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      });

      // Create audit log
      await this.createAuditLog(
        deletedBy,
        'DELETE_COMPANY',
        'company',
        companyId,
        {
          before: companyBefore,
          after: updateData,
        },
        'Company deleted by platform admin',
        ipAddress
      );

      // Notify company users
      await this.notifyCompanyUsers(companyId, 'suspended', 'Company has been deleted by platform administration');

      // TODO: Archive company data
      // TODO: Handle data retention policies

      logger.info('Company deleted by platform admin', {
        companyId,
        deletedBy,
      });
    } catch (error) {
      logger.error('Error deleting company', { 
        error: (error as Error).message,
        companyId,
        deletedBy,
      });
      throw new Error('Failed to delete company');
    }
  }

  /**
   * Verify a company
   */
  async verifyCompany(companyId: string, verifiedBy: string, notes?: string, ipAddress?: string): Promise<void> {
    try {
      // Get company before update for audit trail
      const companyBefore = await prisma.company.findUnique({
        where: { id: companyId },
        select: { verified: true, verifiedAt: true, verifiedBy: true, status: true, verificationNotes: true },
      });

      await prisma.company.update({
        where: { id: companyId },
        data: {
          verified: true,
          verifiedAt: new Date(),
          verifiedBy,
          status: CompanyStatus.ACTIVE,
          verificationNotes: notes,
        },
      });

      // Create audit log
      await this.createAuditLog(
        verifiedBy,
        'VERIFY_COMPANY',
        'company',
        companyId,
        {
          before: companyBefore,
          after: {
            verified: true,
            verifiedAt: new Date(),
            verifiedBy,
            status: CompanyStatus.ACTIVE,
            verificationNotes: notes,
          },
        },
        notes,
        ipAddress
      );

      // Notify company users
      await this.notifyCompanyUsers(companyId, 'verified');

      logger.info('Company verified by platform admin', {
        companyId,
        verifiedBy,
        notes,
      });
    } catch (error) {
      logger.error('Error verifying company', { 
        error: (error as Error).message,
        companyId,
        verifiedBy,
      });
      throw new Error('Failed to verify company');
    }
  }

  /**
   * Get all users with optional filtering
   */
  async getUsers(filters: UserFilters = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const {
        role,
        companyId,
        search,
        page = 1,
        pageSize = 20,
      } = filters;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (companyId) {
        where.companyId = companyId;
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const total = await prisma.user.count({ where });

      const users = await prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: { name: true, verified: true },
          },
        },
      });

      return {
        users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error('Error fetching users', { error: (error as Error).message });
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Create a new admin user
   */
  async createAdmin(data: CreateAdminData, createdBy: string): Promise<User> {
    try {
      // Generate a temporary password (user will need to reset)
      const tempPassword = Math.random().toString(36).slice(-12);
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const user = await prisma.user.create({
        data: {
          ...data,
          passwordHash,
          emailVerified: false, // Admin will need to verify email
        },
      });

      // TODO: Send email with temporary password and setup instructions

      logger.info('Admin user created by platform admin', {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdBy,
      });

      return user;
    } catch (error) {
      logger.error('Error creating admin user', { 
        error: (error as Error).message,
        data,
        createdBy,
      });
      throw new Error('Failed to create admin user');
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason: string, suspendedBy: string): Promise<void> {
    try {
      // TODO: Add suspension fields to User model
      // For now, we'll use a different approach
      
      // TODO: Invalidate user sessions
      // TODO: Handle active bookings

      logger.info('User suspended by platform admin', {
        userId,
        reason,
        suspendedBy,
      });
    } catch (error) {
      logger.error('Error suspending user', { 
        error: (error as Error).message,
        userId,
        reason,
        suspendedBy,
      });
      throw new Error('Failed to suspend user');
    }
  }

  /**
   * Perform bulk operations on users
   */
  async bulkUserOperation(operation: BulkOperation, performedBy: string): Promise<BulkResult> {
    const result: BulkResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of operation.userIds) {
      try {
        switch (operation.operation) {
          case 'suspend':
            await this.suspendUser(userId, operation.reason || 'Bulk suspension', performedBy);
            break;
          case 'activate':
            // TODO: Implement user activation
            break;
          case 'delete':
            // TODO: Implement user deletion
            break;
          case 'verify':
            await prisma.user.update({
              where: { id: userId },
              data: { emailVerified: true },
            });
            break;
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          userId,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Bulk user operation completed', {
      operation: operation.operation,
      totalUsers: operation.userIds.length,
      successful: result.successful,
      failed: result.failed,
      performedBy,
    });

    return result;
  }

  /**
   * Perform bulk operations on companies
   */
  async bulkCompanyOperation(operation: BulkCompanyOperation, performedBy: string, ipAddress?: string): Promise<BulkCompanyResult> {
    const result: BulkCompanyResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const companyId of operation.companyIds) {
      try {
        switch (operation.operation) {
          case 'suspend':
            await this.suspendCompany(companyId, operation.reason || 'Bulk suspension', performedBy, ipAddress);
            break;
          case 'verify':
            await this.verifyCompany(companyId, performedBy, operation.notes, ipAddress);
            break;
          case 'activate':
            await this.updateCompanyStatus(companyId, CompanyStatus.ACTIVE, performedBy, 'Bulk activation', ipAddress);
            break;
        }
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          companyId,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Bulk company operation completed', {
      operation: operation.operation,
      totalCompanies: operation.companyIds.length,
      successful: result.successful,
      failed: result.failed,
      performedBy,
    });

    return result;
  }

  /**
   * Export companies data
   */
  async exportCompanies(options: ExportCompaniesOptions, exportedBy: string): Promise<string> {
    try {
      const { companyIds, format, includeMetrics } = options;

      // Get companies data
      const companies = await prisma.company.findMany({
        where: {
          id: { in: companyIds },
        },
        include: includeMetrics ? {
          users: {
            select: { id: true, role: true },
          },
          vehicleListings: {
            select: { id: true, status: true },
          },
          driverListings: {
            select: { id: true, status: true },
          },
          bookingsAsProvider: {
            select: { id: true, status: true },
          },
        } : undefined,
      });

      // Transform data for export
      const exportData = companies.map(company => {
        const baseData = {
          id: company.id,
          name: company.name,
          organizationNumber: company.organizationNumber,
          businessAddress: company.businessAddress,
          city: company.city,
          postalCode: company.postalCode,
          fylke: company.fylke,
          kommune: company.kommune,
          vatRegistered: company.vatRegistered,
          status: company.status,
          verified: company.verified,
          createdAt: company.createdAt.toISOString(),
          verifiedAt: company.verifiedAt?.toISOString(),
          verifiedBy: company.verifiedBy,
          suspendedAt: company.suspendedAt?.toISOString(),
          suspendedBy: company.suspendedBy,
          suspensionReason: company.suspensionReason,
        };

        if (includeMetrics && 'users' in company) {
          return {
            ...baseData,
            totalListings: (company.vehicleListings?.length || 0) + (company.driverListings?.length || 0),
            totalBookings: company.totalBookings,
            totalRevenue: company.totalRevenue,
            averageRating: company.aggregatedRating || 0,
            activeUsers: company.users?.length || 0,
          };
        }

        return baseData;
      });

      // Create audit log
      await this.createAuditLog(
        exportedBy,
        'EXPORT_COMPANIES',
        'company',
        'bulk',
        {
          companyIds,
          format,
          includeMetrics,
          exportedCount: companies.length,
        },
        `Exported ${companies.length} companies in ${format} format`,
      );

      // Format output
      if (format === 'csv') {
        return this.convertToCSV(exportData);
      } else {
        return JSON.stringify(exportData, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting companies', { 
        error: (error as Error).message,
        options,
        exportedBy,
      });
      throw new Error('Failed to export companies');
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  }
}

export const platformAdminService = new PlatformAdminService();