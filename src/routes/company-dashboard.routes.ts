import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Middleware for company admin authentication and authorization
const requireCompanyAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'COMPANY_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Company admin access required'
    });
  }
  next();
};

// GET /api/dashboard/debug - Debug endpoint to check revenue calculation
router.get('/debug', requireCompanyAdmin, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get bookings with transactions
    const bookings = await prisma.booking.findMany({
      where: {
        providerCompanyId: companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: thirtyDaysAgo,
          lte: now
        }
      },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    });

    // Calculate revenue using both methods
    const transactionBasedRevenue = bookings.reduce((sum, booking) => {
      const bookingRevenue = booking.transactions.reduce((tSum, transaction) => {
        return tSum + transaction.amount;
      }, 0);
      return sum + bookingRevenue;
    }, 0);

    const bookingTotalRevenue = bookings.reduce((sum, booking) => {
      return sum + booking.total;
    }, 0);

    // Also check all bookings (not just completed ones)
    const allBookings = await prisma.booking.findMany({
      where: {
        providerCompanyId: companyId,
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now
        }
      },
      include: {
        transactions: true
      }
    });

    res.json({
      debug: {
        companyId,
        dateRange: {
          from: thirtyDaysAgo.toISOString(),
          to: now.toISOString()
        },
        completedBookingsCount: bookings.length,
        allBookingsCount: allBookings.length,
        transactionBasedRevenue,
        bookingTotalRevenue,
        bookings: bookings.map(b => ({
          id: b.id,
          status: b.status,
          total: b.total,
          completedAt: b.completedAt,
          transactionCount: b.transactions.length,
          transactionTotal: b.transactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: b.transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            status: t.status
          }))
        }))
      }
    });
  } catch (error) {
    logger.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed', message: error.message });
  }
});

// GET /api/dashboard - Company dashboard data with real metrics
router.get('/', requireCompanyAdmin, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User is not associated with a company'
      });
    }

    const cacheKey = `company_dashboard:${companyId}`;
    
    // Temporarily bypass cache to test the fix
    const bypassCache = req.query.nocache === 'true';
    
    const dashboardData = bypassCache 
      ? await generateDashboardData(companyId, userId)
      : await cacheService.getOrSet(
          cacheKey,
          async () => generateDashboardData(companyId, userId),
          300 // 5 minutes cache
        );

    logger.info('Company dashboard data retrieved', {
      userId,
      companyId,
      kpiCount: Object.keys(dashboardData.kpis).length,
      actionableItemsCount: dashboardData.actionableItems.length,
      revenue: dashboardData.kpis.provider.totalRevenue30Days
    });

    res.json(dashboardData);
  } catch (error) {
    logger.error('Failed to retrieve company dashboard data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data'
    });
  }
});

// Separate function to generate dashboard data
async function generateDashboardData(companyId: string, userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get company information
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        select: { id: true }
      }
    }
  });

  if (!company) {
    throw new Error('Company not found');
  }

  // Calculate KPIs
  const [
    totalRevenue30Days,
    fleetUtilization,
    aggregatedRating,
    totalSpend30Days,
    openBookingsCount,
    upcomingBookingsCount
  ] = await Promise.all([
    // Provider revenue (last 30 days) - using transaction-based calculation for consistency
    calculateTransactionBasedRevenue(companyId, thirtyDaysAgo, now),

    // Fleet utilization calculation
    calculateFleetUtilization(companyId, thirtyDaysAgo, now),

    // Aggregated rating from ratings table
    prisma.rating.aggregate({
      where: {
        providerCompanyId: companyId
      },
      _avg: { companyStars: true }
    }).then(result => result._avg.companyStars),

    // Renter spend (if company also rents) - using transaction-based calculation
    calculateTransactionBasedSpend(company.users.map(u => u.id), thirtyDaysAgo, now),

    // Open bookings count
    prisma.booking.count({
      where: {
        providerCompanyId: companyId,
        status: { in: ['PENDING', 'ACCEPTED', 'ACTIVE'] }
      }
    }),

    // Upcoming bookings count
    prisma.booking.count({
      where: {
        providerCompanyId: companyId,
        status: 'ACCEPTED',
        startDate: { gte: now }
      }
    })
  ]);

  // Get actionable items
  const actionableItems = await getActionableItems(companyId, userId);

  // Get operational summary
  const operations = await getOperationalSummary(companyId);

  // Get profile status
  const profile = await getProfileStatus(company);

  return {
    kpis: {
      provider: {
        totalRevenue30Days: Math.round(totalRevenue30Days * 100) / 100,
        fleetUtilization: Math.round(fleetUtilization * 100) / 100,
        aggregatedRating: aggregatedRating ? Math.round(aggregatedRating * 10) / 10 : null
      },
      renter: {
        totalSpend30Days: Math.round(totalSpend30Days * 100) / 100,
        openBookingsCount,
        upcomingBookingsCount
      }
    },
    actionableItems,
    operations,
    profile
  };
}

// Helper function to calculate transaction-based revenue
async function calculateTransactionBasedRevenue(companyId: string, startDate: Date, endDate: Date): Promise<number> {
  try {
    // Get all completed bookings for the company in the period
    const bookings = await prisma.booking.findMany({
      where: {
        providerCompanyId: companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    });

    // Sum up all completed transaction amounts
    const totalRevenue = bookings.reduce((sum, booking) => {
      const bookingRevenue = booking.transactions.reduce((tSum, transaction) => {
        return tSum + transaction.amount;
      }, 0);
      return sum + bookingRevenue;
    }, 0);

    return totalRevenue;
  } catch (error) {
    logger.error('Error calculating transaction-based revenue:', error);
    return 0;
  }
}

// Helper function to calculate transaction-based spend
async function calculateTransactionBasedSpend(userIds: string[], startDate: Date, endDate: Date): Promise<number> {
  try {
    // Get the company IDs for these users
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { companyId: true }
    });
    
    const companyIds = [...new Set(users.map(u => u.companyId))];

    // Get all completed bookings where these companies were renters
    const bookings = await prisma.booking.findMany({
      where: {
        renterCompanyId: { in: companyIds },
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    });

    // Sum up all completed transaction amounts
    const totalSpend = bookings.reduce((sum, booking) => {
      const bookingSpend = booking.transactions.reduce((tSum, transaction) => {
        return tSum + transaction.amount;
      }, 0);
      return sum + bookingSpend;
    }, 0);

    return totalSpend;
  } catch (error) {
    logger.error('Error calculating transaction-based spend:', error);
    return 0;
  }
}

// Helper function to calculate fleet utilization
async function calculateFleetUtilization(companyId: string, startDate: Date, endDate: Date): Promise<number> {
  try {
    // Get total vehicles
    const totalVehicles = await prisma.vehicleListing.count({
      where: { companyId, status: 'ACTIVE' }
    });

    if (totalVehicles === 0) {
      return 0;
    }

    // Get total booking hours in the period
    const bookings = await prisma.booking.findMany({
      where: {
        providerCompanyId: companyId,
        status: { in: ['COMPLETED', 'ACTIVE'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      select: {
        startDate: true,
        endDate: true
      }
    });

    const totalBookingHours = bookings.reduce((total, booking) => {
      const start = new Date(Math.max(booking.startDate.getTime(), startDate.getTime()));
      const end = new Date(Math.min(booking.endDate.getTime(), endDate.getTime()));
      const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
      return total + hours;
    }, 0);

    // Calculate total possible hours (30 days * 24 hours * number of vehicles)
    const totalPossibleHours = 30 * 24 * totalVehicles;
    
    return totalPossibleHours > 0 ? (totalBookingHours / totalPossibleHours) * 100 : 0;
  } catch (error) {
    logger.error('Error calculating fleet utilization:', error);
    return 0;
  }
}

// Helper function to get actionable items
async function getActionableItems(companyId: string, userId: string): Promise<any[]> {
  const actionableItems = [];

  try {
    // Pending booking requests
    const pendingBookings = await prisma.booking.count({
      where: { providerCompanyId: companyId, status: 'PENDING' }
    });

    if (pendingBookings > 0) {
      actionableItems.push({
        type: 'booking_request',
        id: 'pending_bookings',
        title: `${pendingBookings} Pending Booking${pendingBookings > 1 ? 's' : ''}`,
        description: `You have ${pendingBookings} booking request${pendingBookings > 1 ? 's' : ''} waiting for your response`,
        priority: 'high',
        link: '/bookings?status=pending',
        createdAt: new Date().toISOString()
      });
    }

    // Expiring requests (older than 24 hours)
    const expiringRequests = await prisma.booking.count({
      where: {
        providerCompanyId: companyId,
        status: 'PENDING',
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (expiringRequests > 0) {
      actionableItems.push({
        type: 'expiring_request',
        id: 'expiring_requests',
        title: `${expiringRequests} Request${expiringRequests > 1 ? 's' : ''} Expiring Soon`,
        description: `${expiringRequests} booking request${expiringRequests > 1 ? 's' : ''} will expire if not responded to soon`,
        priority: 'high',
        link: '/bookings?status=pending&expiring=true',
        createdAt: new Date().toISOString()
      });
    }

    // Unread messages - simplified for now since Message model doesn't have recipientId
    const unreadMessages = 0; // TODO: Implement proper message counting when message system is updated

    if (unreadMessages > 0) {
      actionableItems.push({
        type: 'unread_message',
        id: 'unread_messages',
        title: `${unreadMessages} Unread Message${unreadMessages > 1 ? 's' : ''}`,
        description: `You have ${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}`,
        priority: 'medium',
        link: '/messages',
        createdAt: new Date().toISOString()
      });
    }

    // Verification status
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { verified: true }
    });

    if (!company?.verified) {
      actionableItems.push({
        type: 'verification_status',
        id: 'company_verification',
        title: 'Complete Company Verification',
        description: 'Your company profile needs verification to accept bookings',
        priority: 'high',
        link: '/profile/verification',
        createdAt: new Date().toISOString()
      });
    }

    // Rating prompts for completed bookings without reviews
    const completedBookingsWithoutReviews = await prisma.booking.count({
      where: {
        providerCompanyId: companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        },
        rating: null
      }
    });

    if (completedBookingsWithoutReviews > 0) {
      actionableItems.push({
        type: 'rating_prompt',
        id: 'pending_reviews',
        title: 'Rate Recent Bookings',
        description: `${completedBookingsWithoutReviews} completed booking${completedBookingsWithoutReviews > 1 ? 's' : ''} waiting for your review`,
        priority: 'low',
        link: '/bookings?status=completed&needs_review=true',
        createdAt: new Date().toISOString()
      });
    }

    return actionableItems;
  } catch (error) {
    logger.error('Error getting actionable items:', error);
    return [];
  }
}

// Helper function to get operational summary
async function getOperationalSummary(companyId: string): Promise<any> {
  try {
    const [
      availableListings,
      suspendedListings,
      recentBookings
    ] = await Promise.all([
      prisma.vehicleListing.count({
        where: { companyId, status: 'ACTIVE' }
      }),
      prisma.vehicleListing.count({
        where: { companyId, status: 'SUSPENDED' }
      }),
      prisma.booking.findMany({
        where: { providerCompanyId: companyId },
        include: {
          renterCompany: {
            select: { name: true }
          },
          vehicleListing: {
            select: { title: true }
          },
          driverListing: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return {
      listings: {
        availableCount: availableListings,
        suspendedCount: suspendedListings
      },
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        companyName: booking.renterCompany.name,
        listingTitle: booking.vehicleListing?.title || booking.driverListing?.name || 'Unknown',
        status: booking.status,
        startDate: booking.startDate.toISOString(),
        role: 'provider' as const
      })),
      billing: {
        hasInvoices: false,
        latestInvoicePath: null
      }
    };
  } catch (error) {
    logger.error('Error getting operational summary:', error);
    return {
      listings: { availableCount: 0, suspendedCount: 0 },
      recentBookings: [],
      billing: { hasInvoices: false, latestInvoicePath: null }
    };
  }
}

// Helper function to get profile status
async function getProfileStatus(company: any): Promise<any> {
  try {
    const requiredFields = [
      'name', 'description', 'email', 'phone', 'address',
      'businessLicense', 'insurancePolicy'
    ];

    const missingFields = requiredFields.filter(field => !company[field]);
    const completeness = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100);

    const allDriversVerified = company.users.length > 0 
      ? company.users.every((user: any) => user.verified)
      : true;

    return {
      completeness,
      missingFields,
      verified: company.verified,
      allDriversVerified
    };
  } catch (error) {
    logger.error('Error getting profile status:', error);
    return {
      completeness: 0,
      missingFields: [],
      verified: false,
      allDriversVerified: false
    };
  }
}

export default router;