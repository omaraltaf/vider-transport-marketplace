import { PrismaClient, BookingStatus, ListingStatus } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface DashboardKPIs {
  provider: {
    totalRevenue30Days: number;
    fleetUtilization: number;
    aggregatedRating: number | null;
  };
  renter: {
    totalSpend30Days: number;
    openBookingsCount: number;
    upcomingBookingsCount: number;
  };
}

export interface ActionableItem {
  type: 'booking_request' | 'expiring_request' | 'unread_message' | 'rating_prompt' | 'verification_status';
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
  createdAt: string;
}

export interface OperationalSummary {
  listings: {
    availableCount: number;
    suspendedCount: number;
  };
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    companyName: string;
    listingTitle: string;
    status: BookingStatus;
    startDate: string;
    role: 'provider' | 'renter';
  }>;
  billing: {
    hasInvoices: boolean;
    latestInvoicePath: string | null;
  };
}

export interface ProfileStatus {
  completeness: number; // 0-100 percentage
  missingFields: string[];
  verified: boolean;
  allDriversVerified: boolean;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  actionableItems: ActionableItem[];
  operations: OperationalSummary;
  profile: ProfileStatus;
}

export class DashboardService {
  /**
   * Get complete dashboard data for a company
   * Aggregates data from multiple sources with comprehensive error handling
   */
  async getDashboardData(companyId: string): Promise<DashboardData> {
    try {
      // Fetch all data in parallel for better performance
      const [kpis, actionableItems, operations, profile] = await Promise.all([
        this.getKPIs(companyId).catch(error => {
          logger.error('Error fetching KPIs', { companyId, error });
          return this.getDefaultKPIs();
        }),
        this.getActionableItems(companyId).catch(error => {
          logger.error('Error fetching actionable items', { companyId, error });
          return [];
        }),
        this.getOperationalSummary(companyId).catch(error => {
          logger.error('Error fetching operational summary', { companyId, error });
          return this.getDefaultOperationalSummary();
        }),
        this.getProfileStatus(companyId).catch(error => {
          logger.error('Error fetching profile status', { companyId, error });
          return this.getDefaultProfileStatus();
        }),
      ]);

      logger.info('Dashboard data fetched successfully', { companyId });

      return {
        kpis,
        actionableItems,
        operations,
        profile,
      };
    } catch (error) {
      logger.error('Error fetching dashboard data', { companyId, error });
      throw new Error('DASHBOARD_DATA_FETCH_FAILED');
    }
  }

  /**
   * Calculate KPIs for both provider and renter roles
   */
  private async getKPIs(companyId: string): Promise<DashboardKPIs> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get company data for rating
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { aggregatedRating: true },
    });

    // Calculate provider revenue (last 30 days)
    const providerRevenue = await this.calculateRevenue30Days(companyId, 'provider');

    // Calculate fleet utilization
    const fleetUtilization = await this.calculateFleetUtilization(companyId);

    // Calculate renter spending (last 30 days)
    const renterSpend = await this.calculateRevenue30Days(companyId, 'renter');

    // Count open bookings (pending status) as renter
    const openBookingsCount = await prisma.booking.count({
      where: {
        renterCompanyId: companyId,
        status: BookingStatus.PENDING,
      },
    });

    // Count upcoming bookings (accepted status) as renter
    const upcomingBookingsCount = await prisma.booking.count({
      where: {
        renterCompanyId: companyId,
        status: BookingStatus.ACCEPTED,
      },
    });

    return {
      provider: {
        totalRevenue30Days: providerRevenue,
        fleetUtilization,
        aggregatedRating: company?.aggregatedRating || null,
      },
      renter: {
        totalSpend30Days: renterSpend,
        openBookingsCount,
        upcomingBookingsCount,
      },
    };
  }

  /**
   * Calculate revenue for last 30 days
   * For provider: sum of providerRate from bookings where company is provider
   * For renter: sum of total from bookings where company is renter
   */
  public async calculateRevenue30Days(companyId: string, role: 'provider' | 'renter'): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      status: { in: [BookingStatus.ACCEPTED, BookingStatus.COMPLETED] },
      createdAt: { gte: thirtyDaysAgo },
    };

    if (role === 'provider') {
      where.providerCompanyId = companyId;
    } else {
      where.renterCompanyId = companyId;
    }

    if (role === 'provider') {
      const bookings = await prisma.booking.findMany({
        where,
        select: { providerRate: true },
      });
      return bookings.reduce((sum, b) => sum + b.providerRate, 0);
    } else {
      const bookings = await prisma.booking.findMany({
        where,
        select: { total: true },
      });
      return bookings.reduce((sum, b) => sum + b.total, 0);
    }
  }

  /**
   * Calculate fleet utilization percentage
   * Formula: (Active + Accepted Bookings) / Total Active Listings * 100
   */
  public async calculateFleetUtilization(companyId: string): Promise<number> {
    // Count total active listings (vehicles + drivers)
    const totalVehicles = await prisma.vehicleListing.count({
      where: { companyId, status: ListingStatus.ACTIVE },
    });

    const totalDrivers = await prisma.driverListing.count({
      where: { companyId, status: ListingStatus.ACTIVE },
    });

    const totalListings = totalVehicles + totalDrivers;

    if (totalListings === 0) {
      return 0;
    }

    // Count active and accepted bookings where company is provider
    const activeBookings = await prisma.booking.count({
      where: {
        providerCompanyId: companyId,
        status: { in: [BookingStatus.ACTIVE, BookingStatus.ACCEPTED] },
      },
    });

    return (activeBookings / totalListings) * 100;
  }

  /**
   * Get actionable items requiring attention
   */
  private async getActionableItems(companyId: string): Promise<ActionableItem[]> {
    const items: ActionableItem[] = [];

    // Get pending booking requests (as provider)
    const pendingRequests = await prisma.booking.findMany({
      where: {
        providerCompanyId: companyId,
        status: BookingStatus.PENDING,
      },
      include: {
        renterCompany: { select: { name: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // Add pending requests
    for (const booking of pendingRequests) {
      const timeUntilExpiry = booking.expiresAt.getTime() - Date.now();
      const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

      // Determine if expiring soon (less than 6 hours)
      const isExpiring = hoursUntilExpiry < 6;

      items.push({
        type: isExpiring ? 'expiring_request' : 'booking_request',
        id: booking.id,
        title: isExpiring 
          ? `Booking request expiring soon` 
          : `New booking request`,
        description: `From ${booking.renterCompany.name} - Booking ${booking.bookingNumber}`,
        priority: isExpiring ? 'high' : 'medium',
        link: `/bookings/${booking.id}`,
        createdAt: booking.requestedAt.toISOString(),
      });
    }

    // Get unread message count
    const unreadCount = await this.getUnreadMessageCount(companyId);
    if (unreadCount > 0) {
      items.push({
        type: 'unread_message',
        id: 'unread-messages',
        title: `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
        description: 'You have unread messages in your booking conversations',
        priority: 'medium',
        link: '/messages',
        createdAt: new Date().toISOString(),
      });
    }

    // Get completed bookings without ratings (as renter)
    const completedWithoutRating = await prisma.booking.findMany({
      where: {
        renterCompanyId: companyId,
        status: BookingStatus.COMPLETED,
        rating: null,
      },
      include: {
        providerCompany: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    for (const booking of completedWithoutRating) {
      items.push({
        type: 'rating_prompt',
        id: booking.id,
        title: 'Rate your completed booking',
        description: `Booking ${booking.bookingNumber} with ${booking.providerCompany.name}`,
        priority: 'low',
        link: `/bookings/${booking.id}/rate`,
        createdAt: booking.completedAt?.toISOString() || new Date().toISOString(),
      });
    }

    // Check verification status
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { verified: true },
    });

    if (!company?.verified) {
      items.push({
        type: 'verification_status',
        id: 'company-verification',
        title: 'Company not verified',
        description: 'Complete your company verification to build trust with customers',
        priority: 'medium',
        link: '/profile',
        createdAt: new Date().toISOString(),
      });
    }

    // Check driver verification status
    const unverifiedDrivers = await prisma.driverListing.count({
      where: {
        companyId,
        verified: false,
        status: { not: ListingStatus.REMOVED },
      },
    });

    if (unverifiedDrivers > 0) {
      items.push({
        type: 'verification_status',
        id: 'driver-verification',
        title: `${unverifiedDrivers} driver${unverifiedDrivers > 1 ? 's' : ''} pending verification`,
        description: 'Upload license documents to get your drivers verified',
        priority: 'medium',
        link: '/listings/drivers',
        createdAt: new Date().toISOString(),
      });
    }

    // Sort by priority (high > medium > low) and then by date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }

  /**
   * Get unread message count for a company
   */
  private async getUnreadMessageCount(companyId: string): Promise<number> {
    // Get all users for this company
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return 0;
    }

    // Get all threads where any company user is a participant
    const threads = await prisma.messageThread.findMany({
      where: {
        participants: {
          hasSome: userIds,
        },
      },
      select: { id: true },
    });

    const threadIds = threads.map(t => t.id);

    if (threadIds.length === 0) {
      return 0;
    }

    // Get all messages in these threads
    const messages = await prisma.message.findMany({
      where: {
        threadId: { in: threadIds },
        senderId: { notIn: userIds }, // Don't count own messages
      },
      select: { id: true, readBy: true },
    });

    // Count messages where none of the company users have read them
    const unreadMessages = messages.filter(m => 
      !userIds.some(userId => m.readBy.includes(userId))
    );

    return unreadMessages.length;
  }

  /**
   * Get operational summary
   */
  private async getOperationalSummary(companyId: string): Promise<OperationalSummary> {
    // Count available listings
    const availableVehicles = await prisma.vehicleListing.count({
      where: { companyId, status: ListingStatus.ACTIVE },
    });

    const availableDrivers = await prisma.driverListing.count({
      where: { companyId, status: ListingStatus.ACTIVE },
    });

    const availableCount = availableVehicles + availableDrivers;

    // Count suspended listings
    const suspendedVehicles = await prisma.vehicleListing.count({
      where: { companyId, status: ListingStatus.SUSPENDED },
    });

    const suspendedDrivers = await prisma.driverListing.count({
      where: { companyId, status: ListingStatus.SUSPENDED },
    });

    const suspendedCount = suspendedVehicles + suspendedDrivers;

    // Get 5 most recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
      },
      include: {
        renterCompany: { select: { name: true } },
        providerCompany: { select: { name: true } },
        vehicleListing: { select: { title: true } },
        driverListing: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const formattedBookings = recentBookings.map(booking => {
      const isProvider = booking.providerCompanyId === companyId;
      const otherCompanyName = isProvider 
        ? booking.renterCompany.name 
        : booking.providerCompany.name;
      
      const listingTitle = booking.vehicleListing?.title || booking.driverListing?.name || 'N/A';

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        companyName: otherCompanyName,
        listingTitle,
        status: booking.status,
        startDate: booking.startDate.toISOString(),
        role: isProvider ? 'provider' as const : 'renter' as const,
      };
    });

    // Check for invoices (look for completed bookings with contracts)
    const hasInvoices = await prisma.booking.count({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CLOSED] },
        contractPdfPath: { not: null },
      },
    }) > 0;

    // Get latest invoice path
    const latestInvoice = await prisma.booking.findFirst({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CLOSED] },
        contractPdfPath: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: { contractPdfPath: true },
    });

    return {
      listings: {
        availableCount,
        suspendedCount,
      },
      recentBookings: formattedBookings,
      billing: {
        hasInvoices,
        latestInvoicePath: latestInvoice?.contractPdfPath || null,
      },
    };
  }

  /**
   * Calculate profile completeness
   */
  public async calculateProfileCompleteness(companyId: string): Promise<number> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    const requiredFields = [
      'name',
      'organizationNumber',
      'businessAddress',
      'city',
      'postalCode',
      'fylke',
      'kommune',
      'description',
    ];

    const filledFields = requiredFields.filter(field => {
      const value = company[field as keyof typeof company];
      return value !== null && value !== undefined && String(value).trim() !== '';
    });

    return (filledFields.length / requiredFields.length) * 100;
  }

  /**
   * Get profile status
   */
  private async getProfileStatus(companyId: string): Promise<ProfileStatus> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('COMPANY_NOT_FOUND');
    }

    // Calculate completeness
    const completeness = await this.calculateProfileCompleteness(companyId);

    // Identify missing fields
    const requiredFields = [
      { key: 'name', label: 'Company Name' },
      { key: 'organizationNumber', label: 'Organization Number' },
      { key: 'businessAddress', label: 'Business Address' },
      { key: 'city', label: 'City' },
      { key: 'postalCode', label: 'Postal Code' },
      { key: 'fylke', label: 'Fylke' },
      { key: 'kommune', label: 'Kommune' },
      { key: 'description', label: 'Company Description' },
    ];

    const missingFields = requiredFields
      .filter(field => {
        const value = company[field.key as keyof typeof company];
        return value === null || value === undefined || String(value).trim() === '';
      })
      .map(field => field.label);

    // Check if all drivers are verified
    const totalDrivers = await prisma.driverListing.count({
      where: {
        companyId,
        status: { not: ListingStatus.REMOVED },
      },
    });

    const verifiedDrivers = await prisma.driverListing.count({
      where: {
        companyId,
        status: { not: ListingStatus.REMOVED },
        verified: true,
      },
    });

    const allDriversVerified = totalDrivers > 0 && totalDrivers === verifiedDrivers;

    return {
      completeness,
      missingFields,
      verified: company.verified,
      allDriversVerified,
    };
  }

  /**
   * Count bookings by status for a company
   */
  public async countBookingsByStatus(
    companyId: string,
    status: BookingStatus,
    role?: 'provider' | 'renter'
  ): Promise<number> {
    const where: any = { status };

    if (role === 'provider') {
      where.providerCompanyId = companyId;
    } else if (role === 'renter') {
      where.renterCompanyId = companyId;
    } else {
      where.OR = [
        { providerCompanyId: companyId },
        { renterCompanyId: companyId },
      ];
    }

    return prisma.booking.count({ where });
  }

  // Default fallback methods for error handling

  private getDefaultKPIs(): DashboardKPIs {
    return {
      provider: {
        totalRevenue30Days: 0,
        fleetUtilization: 0,
        aggregatedRating: null,
      },
      renter: {
        totalSpend30Days: 0,
        openBookingsCount: 0,
        upcomingBookingsCount: 0,
      },
    };
  }

  private getDefaultOperationalSummary(): OperationalSummary {
    return {
      listings: {
        availableCount: 0,
        suspendedCount: 0,
      },
      recentBookings: [],
      billing: {
        hasInvoices: false,
        latestInvoicePath: null,
      },
    };
  }

  private getDefaultProfileStatus(): ProfileStatus {
    return {
      completeness: 0,
      missingFields: [],
      verified: false,
      allDriversVerified: false,
    };
  }
}

export const dashboardService = new DashboardService();
