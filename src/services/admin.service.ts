import { PrismaClient, ListingStatus, User, Company, VehicleListing, DriverListing, Booking, Transaction, Dispute, DisputeStatus, BookingStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface PlatformConfig {
  commissionRate: number; // percentage (e.g., 5 for 5%)
  taxRate: number; // percentage
  bookingTimeoutHours: number;
  defaultCurrency: string;
}

export interface SearchEntityFilters {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchEntityResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DisputeResolution {
  resolution: string;
  refundAmount?: number;
  notes?: string;
}

export interface DisputeCreationData {
  bookingId: string;
  raisedBy: string;
  reason: string;
  description?: string;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  transactionType?: TransactionType;
  page?: number;
  pageSize?: number;
}

export interface AuditLogFilters {
  adminUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface AnalyticsReport {
  totalRevenue: number;
  activeListings: {
    vehicles: number;
    drivers: number;
    total: number;
  };
  bookings: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
  topRatedProviders: Array<{
    companyId: string;
    companyName: string;
    rating: number;
    totalRatings: number;
  }>;
}

export class AdminService {
  /**
   * Update platform configuration
   * Only platform admins can update configuration
   */
  async updatePlatformConfig(config: Partial<PlatformConfig>, adminUserId: string): Promise<PlatformConfig> {
    // Validate configuration values
    if (config.commissionRate !== undefined && (config.commissionRate < 0 || config.commissionRate > 100)) {
      throw new Error('INVALID_COMMISSION_RATE');
    }

    if (config.taxRate !== undefined && (config.taxRate < 0 || config.taxRate > 100)) {
      throw new Error('INVALID_TAX_RATE');
    }

    if (config.bookingTimeoutHours !== undefined && config.bookingTimeoutHours <= 0) {
      throw new Error('INVALID_BOOKING_TIMEOUT');
    }

    // Get existing config or create new one
    const existingConfig = await prisma.platformConfig.findFirst();

    let updatedConfig;
    if (existingConfig) {
      updatedConfig = await prisma.platformConfig.update({
        where: { id: existingConfig.id },
        data: config,
      });
    } else {
      // Create initial config with defaults
      updatedConfig = await prisma.platformConfig.create({
        data: {
          commissionRate: config.commissionRate || 5,
          taxRate: config.taxRate || 25,
          bookingTimeoutHours: config.bookingTimeoutHours || 24,
          defaultCurrency: config.defaultCurrency || 'NOK',
        },
      });
    }

    // Log the configuration change
    await this.createAuditLog({
      adminUserId,
      action: 'UPDATE_PLATFORM_CONFIG',
      entityType: 'PlatformConfig',
      entityId: updatedConfig.id,
      changes: config,
    });

    logger.info('Platform configuration updated', { adminUserId, changes: config });

    return {
      commissionRate: updatedConfig.commissionRate,
      taxRate: updatedConfig.taxRate,
      bookingTimeoutHours: updatedConfig.bookingTimeoutHours,
      defaultCurrency: updatedConfig.defaultCurrency,
    };
  }

  /**
   * Get current platform configuration
   */
  async getPlatformConfig(): Promise<PlatformConfig> {
    const config = await prisma.platformConfig.findFirst();

    if (!config) {
      // Return default configuration
      return {
        commissionRate: 5,
        taxRate: 25,
        bookingTimeoutHours: 24,
        defaultCurrency: 'NOK',
      };
    }

    return {
      commissionRate: config.commissionRate,
      taxRate: config.taxRate,
      bookingTimeoutHours: config.bookingTimeoutHours,
      defaultCurrency: config.defaultCurrency,
    };
  }

  /**
   * Search and list users
   */
  async searchUsers(filters: SearchEntityFilters): Promise<SearchEntityResult<User>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.OR = [
        { email: { contains: filters.query, mode: 'insensitive' } },
        { firstName: { contains: filters.query, mode: 'insensitive' } },
        { lastName: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Search and list companies
   */
  async searchCompanies(filters: SearchEntityFilters): Promise<SearchEntityResult<Company>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { organizationNumber: { contains: filters.query, mode: 'insensitive' } },
        { city: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Search and list vehicle listings
   */
  async searchVehicleListings(filters: SearchEntityFilters): Promise<SearchEntityResult<VehicleListing>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.vehicleListing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.vehicleListing.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Search and list driver listings
   */
  async searchDriverListings(filters: SearchEntityFilters): Promise<SearchEntityResult<DriverListing>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { licenseClass: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.driverListing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.driverListing.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Search and list bookings
   */
  async searchBookings(filters: SearchEntityFilters): Promise<SearchEntityResult<Booking>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.bookingNumber = { contains: filters.query, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          renterCompany: {
            select: {
              id: true,
              name: true,
            },
          },
          providerCompany: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Search and list transactions
   */
  async searchTransactions(filters: SearchEntityFilters): Promise<SearchEntityResult<Transaction>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // No text search for transactions, but we keep the interface consistent

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Verify a company (admin only)
   */
  async verifyCompany(companyId: string, adminUserId: string): Promise<Company> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    if (company.verified) {
      throw new Error('COMPANY_ALREADY_VERIFIED');
    }

    const verifiedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
      },
    });

    // Create audit log
    await this.createAuditLog({
      adminUserId,
      action: 'VERIFY_COMPANY',
      entityType: 'Company',
      entityId: companyId,
      changes: { verified: true },
    });

    logger.info('Company verified by admin', { companyId, adminUserId });

    return verifiedCompany;
  }

  /**
   * Verify a driver listing (admin only)
   */
  async verifyDriver(driverListingId: string, adminUserId: string): Promise<DriverListing> {
    const driverListing = await prisma.driverListing.findUnique({
      where: { id: driverListingId },
    });

    if (!driverListing) {
      throw new Error('DRIVER_LISTING_NOT_FOUND');
    }

    if (!driverListing.licenseDocumentPath) {
      throw new Error('LICENSE_DOCUMENT_REQUIRED_FOR_VERIFICATION');
    }

    if (driverListing.verified) {
      throw new Error('DRIVER_ALREADY_VERIFIED');
    }

    const verifiedDriver = await prisma.driverListing.update({
      where: { id: driverListingId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        // If listing was suspended due to missing license, activate it now
        status: driverListing.status === ListingStatus.SUSPENDED ? ListingStatus.ACTIVE : driverListing.status,
      },
    });

    // Create audit log
    await this.createAuditLog({
      adminUserId,
      action: 'VERIFY_DRIVER',
      entityType: 'DriverListing',
      entityId: driverListingId,
      changes: { verified: true },
    });

    logger.info('Driver verified by admin', { driverListingId, adminUserId });

    return verifiedDriver;
  }

  /**
   * Suspend a listing (vehicle or driver)
   * Suspended listings are removed from search results
   */
  async suspendListing(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    reason: string,
    adminUserId: string
  ): Promise<VehicleListing | DriverListing> {
    if (listingType === 'vehicle') {
      const listing = await prisma.vehicleListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      if (listing.status === ListingStatus.SUSPENDED) {
        throw new Error('LISTING_ALREADY_SUSPENDED');
      }

      const suspendedListing = await prisma.vehicleListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.SUSPENDED },
      });

      // Create audit log
      await this.createAuditLog({
        adminUserId,
        action: 'SUSPEND_LISTING',
        entityType: 'VehicleListing',
        entityId: listingId,
        changes: { status: ListingStatus.SUSPENDED },
        reason,
      });

      logger.info('Vehicle listing suspended by admin', { listingId, adminUserId, reason });

      return suspendedListing;
    } else {
      const listing = await prisma.driverListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      if (listing.status === ListingStatus.SUSPENDED) {
        throw new Error('LISTING_ALREADY_SUSPENDED');
      }

      const suspendedListing = await prisma.driverListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.SUSPENDED },
      });

      // Create audit log
      await this.createAuditLog({
        adminUserId,
        action: 'SUSPEND_LISTING',
        entityType: 'DriverListing',
        entityId: listingId,
        changes: { status: ListingStatus.SUSPENDED },
        reason,
      });

      logger.info('Driver listing suspended by admin', { listingId, adminUserId, reason });

      return suspendedListing;
    }
  }

  /**
   * Remove a listing permanently (vehicle or driver)
   * Removed listings are permanently deleted and cannot be recovered
   */
  async removeListing(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    reason: string,
    adminUserId: string
  ): Promise<void> {
    if (listingType === 'vehicle') {
      const listing = await prisma.vehicleListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      // Check for active bookings
      const activeBookings = await prisma.booking.count({
        where: {
          vehicleListingId: listingId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'ACTIVE'],
          },
        },
      });

      if (activeBookings > 0) {
        throw new Error('CANNOT_REMOVE_LISTING_WITH_ACTIVE_BOOKINGS');
      }

      // Create audit log before deletion
      await this.createAuditLog({
        adminUserId,
        action: 'REMOVE_LISTING',
        entityType: 'VehicleListing',
        entityId: listingId,
        changes: { status: ListingStatus.REMOVED },
        reason,
      });

      // Mark as removed instead of deleting to preserve booking history
      await prisma.vehicleListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.REMOVED },
      });

      logger.info('Vehicle listing removed by admin', { listingId, adminUserId, reason });
    } else {
      const listing = await prisma.driverListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      // Check for active bookings
      const activeBookings = await prisma.booking.count({
        where: {
          driverListingId: listingId,
          status: {
            in: ['PENDING', 'ACCEPTED', 'ACTIVE'],
          },
        },
      });

      if (activeBookings > 0) {
        throw new Error('CANNOT_REMOVE_LISTING_WITH_ACTIVE_BOOKINGS');
      }

      // Create audit log before deletion
      await this.createAuditLog({
        adminUserId,
        action: 'REMOVE_LISTING',
        entityType: 'DriverListing',
        entityId: listingId,
        changes: { status: ListingStatus.REMOVED },
        reason,
      });

      // Mark as removed instead of deleting to preserve booking history
      await prisma.driverListing.update({
        where: { id: listingId },
        data: { status: ListingStatus.REMOVED },
      });

      logger.info('Driver listing removed by admin', { listingId, adminUserId, reason });
    }
  }

  /**
   * Create a dispute for a booking
   */
  async createDispute(data: DisputeCreationData): Promise<Dispute> {
    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Check if dispute already exists for this booking
    const existingDispute = await prisma.dispute.findUnique({
      where: { bookingId: data.bookingId },
    });

    if (existingDispute) {
      throw new Error('DISPUTE_ALREADY_EXISTS');
    }

    // Create the dispute
    const dispute = await prisma.dispute.create({
      data: {
        bookingId: data.bookingId,
        raisedBy: data.raisedBy,
        reason: data.reason,
        description: data.description,
        status: DisputeStatus.OPEN,
      },
    });

    // Update booking status to DISPUTED
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: { status: BookingStatus.DISPUTED },
    });

    logger.info('Dispute created', { disputeId: dispute.id, bookingId: data.bookingId });

    return dispute;
  }

  /**
   * Search and list disputes
   */
  async searchDisputes(filters: SearchEntityFilters): Promise<SearchEntityResult<Dispute>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.query) {
      where.OR = [
        { reason: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a single dispute by ID
   */
  async getDispute(disputeId: string): Promise<Dispute | null> {
    return await prisma.dispute.findUnique({
      where: { id: disputeId },
    });
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    adminUserId: string
  ): Promise<Dispute> {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: true,
      },
    });

    if (!dispute) {
      throw new Error('DISPUTE_NOT_FOUND');
    }

    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new Error('DISPUTE_ALREADY_RESOLVED');
    }

    // Update dispute status
    const resolvedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: resolution.resolution,
        refundAmount: resolution.refundAmount,
        notes: resolution.notes,
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      },
    });

    // If refund is issued, create a refund transaction
    if (resolution.refundAmount && resolution.refundAmount > 0) {
      await prisma.transaction.create({
        data: {
          bookingId: dispute.bookingId,
          type: TransactionType.REFUND,
          amount: resolution.refundAmount,
          currency: dispute.booking?.currency || 'NOK',
          status: TransactionStatus.COMPLETED,
          metadata: {
            disputeId: disputeId,
            resolvedBy: adminUserId,
          },
        },
      });
    }

    // Create audit log
    await this.createAuditLog({
      adminUserId,
      action: 'RESOLVE_DISPUTE',
      entityType: 'Dispute',
      entityId: disputeId,
      changes: {
        status: DisputeStatus.RESOLVED,
        resolution: resolution.resolution,
        refundAmount: resolution.refundAmount,
      },
    });

    logger.info('Dispute resolved by admin', { disputeId, adminUserId, refundAmount: resolution.refundAmount });

    return resolvedDispute;
  }

  /**
   * Get analytics report
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<AnalyticsReport> {
    // Calculate total revenue from commissions
    const transactions = await prisma.transaction.findMany({
      where: {
        type: 'COMMISSION',
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Count active listings
    const [activeVehicles, activeDrivers] = await Promise.all([
      prisma.vehicleListing.count({
        where: { status: ListingStatus.ACTIVE },
      }),
      prisma.driverListing.count({
        where: { status: ListingStatus.ACTIVE },
      }),
    ]);

    // Count bookings by status
    const [totalBookings, pendingBookings, activeBookings, completedBookings] = await Promise.all([
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.booking.count({
        where: {
          status: 'PENDING',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.booking.count({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      prisma.booking.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    // Get top-rated providers
    const topRatedProviders = await prisma.company.findMany({
      where: {
        aggregatedRating: { not: null },
        totalRatings: { gt: 0 },
      },
      orderBy: [
        { aggregatedRating: 'desc' },
        { totalRatings: 'desc' },
      ],
      take: 10,
      select: {
        id: true,
        name: true,
        aggregatedRating: true,
        totalRatings: true,
      },
    });

    return {
      totalRevenue,
      activeListings: {
        vehicles: activeVehicles,
        drivers: activeDrivers,
        total: activeVehicles + activeDrivers,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        active: activeBookings,
        completed: completedBookings,
      },
      topRatedProviders: topRatedProviders.map((p) => ({
        companyId: p.id,
        companyName: p.name,
        rating: p.aggregatedRating || 0,
        totalRatings: p.totalRatings,
      })),
    };
  }

  /**
   * Get filtered transaction report
   */
  async getTransactionReport(filters: ReportFilters): Promise<SearchEntityResult<Transaction>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // Filter by date range
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Filter by transaction type
    if (filters.transactionType) {
      where.type = filters.transactionType;
    }

    // Filter by company (either renter or provider)
    if (filters.companyId) {
      where.booking = {
        OR: [
          { renterCompanyId: filters.companyId },
          { providerCompanyId: filters.companyId },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              renterCompany: {
                select: {
                  id: true,
                  name: true,
                },
              },
              providerCompany: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get audit log with filters
   */
  async getAuditLog(filters: AuditLogFilters): Promise<SearchEntityResult<any>> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.adminUserId) {
      where.adminUserId = filters.adminUserId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Create an audit log entry
   * This is called internally by other admin methods
   */
  private async createAuditLog(data: {
    adminUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    reason?: string;
    ipAddress?: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        adminUserId: data.adminUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes || {},
        reason: data.reason,
        ipAddress: data.ipAddress,
      },
    });
  }
}

export const adminService = new AdminService();
