import { PrismaClient } from '@prisma/client';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
  };
  companies: {
    total: number;
    verified: number;
    active: number;
    growthRate: number;
  };
  bookings: {
    total: number;
    thisMonth: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
  financial: {
    totalRevenue: number;
    commissions: number;
    refunds: number;
    disputes: number;
  };
}

export interface BookingMetrics {
  pendingBookings: number;
  acceptedBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;
  averageBookingValue: number;
  bookingConversionRate: number;
}

export interface FinancialMetrics {
  dailyRevenue: number;
  monthlyRevenue: number;
  commissionEarned: number;
  refundsProcessed: number;
  disputeRefunds: number;
  averageTransactionValue: number;
  paymentFailureRate: number;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshotDate: Date;
  metricType: string;
  metricData: any;
  createdAt: Date;
}

class AnalyticsService {
  private readonly CACHE_PREFIX = 'analytics:';
  private readonly CACHE_TTL = 300; // 5 minutes

  async getPlatformOverview(dateRange?: { startDate: Date; endDate: Date }): Promise<PlatformMetrics> {
    const cacheKey = `${this.CACHE_PREFIX}platform_overview:${dateRange ? `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}` : 'default'}`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const startDate = dateRange?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = dateRange?.endDate || now;
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // User metrics
        const totalUsers = await prisma.user.count({
          where: {
            createdAt: { lte: endDate }
          }
        });
        const activeUsers = await prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
              lte: endDate
            }
          }
        });
        const newUsersInRange = await prisma.user.count({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        });
        const newUsersLastMonth = await prisma.user.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          }
        });
        const userGrowthRate = newUsersLastMonth > 0 
          ? ((newUsersInRange - newUsersLastMonth) / newUsersLastMonth) * 100 
          : 0;

        // Company metrics
        const totalCompanies = await prisma.company.count({
          where: {
            createdAt: { lte: endDate }
          }
        });
        const verifiedCompanies = await prisma.company.count({
          where: { 
            verified: true,
            createdAt: { lte: endDate }
          }
        });
        const activeCompanies = await prisma.company.count({
          where: {
            status: 'ACTIVE',
            updatedAt: {
              gte: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000),
              lte: endDate
            }
          }
        });
        const newCompaniesInRange = await prisma.company.count({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        });
        const newCompaniesLastMonth = await prisma.company.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          }
        });
        const companyGrowthRate = newCompaniesLastMonth > 0 
          ? ((newCompaniesInRange - newCompaniesLastMonth) / newCompaniesLastMonth) * 100 
          : 0;

        // Booking metrics
        const totalBookings = await prisma.booking.count({
          where: {
            createdAt: { lte: endDate }
          }
        });
        const bookingsInRange = await prisma.booking.count({
          where: {
            createdAt: { gte: startDate, lte: endDate }
          }
        });
        const completedBookings = await prisma.booking.count({
          where: { 
            status: 'COMPLETED',
            createdAt: { lte: endDate }
          }
        });
        const cancelledBookings = await prisma.booking.count({
          where: { 
            status: 'CANCELLED',
            createdAt: { lte: endDate }
          }
        });

        // Financial metrics - filtered by date range
        const revenueResult = await prisma.booking.aggregate({
          where: { 
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { total: true }
        });
        const totalRevenue = revenueResult._sum.total || 0;

        const commissionResult = await prisma.booking.aggregate({
          where: { 
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { platformCommission: true }
        });
        const commissions = commissionResult._sum.platformCommission || 0;

        const refundResult = await prisma.transaction.aggregate({
          where: { 
            type: 'REFUND', 
            status: 'COMPLETED',
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { amount: true }
        });
        const refunds = refundResult._sum.amount || 0;

        const disputes = await prisma.dispute.count({
          where: { 
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            createdAt: { lte: endDate }
          }
        });

        return {
          users: {
            total: totalUsers,
            active: activeUsers,
            newThisMonth: newUsersInRange,
            growthRate: Math.round(userGrowthRate * 100) / 100,
          },
          companies: {
            total: totalCompanies,
            verified: verifiedCompanies,
            active: activeCompanies,
            growthRate: Math.round(companyGrowthRate * 100) / 100,
          },
          bookings: {
            total: totalBookings,
            thisMonth: bookingsInRange,
            completed: completedBookings,
            cancelled: cancelledBookings,
            revenue: totalRevenue,
          },
          financial: {
            totalRevenue,
            commissions,
            refunds,
            disputes,
          },
        };
      },
      this.CACHE_TTL
    );
  }

  async getBookingMetrics(): Promise<BookingMetrics> {
    const cacheKey = `${this.CACHE_PREFIX}booking_metrics`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const pendingBookings = await prisma.booking.count({
          where: { status: 'PENDING' }
        });
        const acceptedBookings = await prisma.booking.count({
          where: { status: 'ACCEPTED' }
        });
        const activeBookings = await prisma.booking.count({
          where: { status: 'ACTIVE' }
        });
        const completedBookings = await prisma.booking.count({
          where: { status: 'COMPLETED' }
        });
        const cancelledBookings = await prisma.booking.count({
          where: { status: 'CANCELLED' }
        });
        const disputedBookings = await prisma.booking.count({
          where: { status: 'DISPUTED' }
        });

        const avgBookingResult = await prisma.booking.aggregate({
          _avg: { total: true }
        });
        const averageBookingValue = avgBookingResult._avg.total || 0;

        const totalRequests = await prisma.booking.count();
        const bookingConversionRate = totalRequests > 0 
          ? (completedBookings / totalRequests) * 100 
          : 0;

        return {
          pendingBookings,
          acceptedBookings,
          activeBookings,
          completedBookings,
          cancelledBookings,
          disputedBookings,
          averageBookingValue: Math.round(averageBookingValue * 100) / 100,
          bookingConversionRate: Math.round(bookingConversionRate * 100) / 100,
        };
      },
      this.CACHE_TTL
    );
  }

  async getFinancialMetrics(): Promise<FinancialMetrics> {
    const cacheKey = `${this.CACHE_PREFIX}financial_metrics`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Daily revenue
        const dailyRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfDay }
          },
          _sum: { total: true }
        });
        const dailyRevenue = dailyRevenueResult._sum.total || 0;

        // Monthly revenue
        const monthlyRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfMonth }
          },
          _sum: { total: true }
        });
        const monthlyRevenue = monthlyRevenueResult._sum.total || 0;

        // Commission earned
        const commissionResult = await prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { platformCommission: true }
        });
        const commissionEarned = commissionResult._sum.platformCommission || 0;

        // Refunds processed
        const refundResult = await prisma.transaction.aggregate({
          where: { type: 'REFUND', status: 'COMPLETED' },
          _sum: { amount: true }
        });
        const refundsProcessed = refundResult._sum.amount || 0;

        // Dispute refunds
        const disputeRefundResult = await prisma.dispute.aggregate({
          where: { status: 'RESOLVED', refundAmount: { not: null } },
          _sum: { refundAmount: true }
        });
        const disputeRefunds = disputeRefundResult._sum.refundAmount || 0;

        // Average transaction value
        const avgTransactionResult = await prisma.transaction.aggregate({
          where: { status: 'COMPLETED' },
          _avg: { amount: true }
        });
        const averageTransactionValue = avgTransactionResult._avg.amount || 0;

        // Payment failure rate
        const totalTransactions = await prisma.transaction.count();
        const failedTransactions = await prisma.transaction.count({
          where: { status: 'FAILED' }
        });
        const paymentFailureRate = totalTransactions > 0 
          ? (failedTransactions / totalTransactions) * 100 
          : 0;

        return {
          dailyRevenue: Math.round(dailyRevenue * 100) / 100,
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          commissionEarned: Math.round(commissionEarned * 100) / 100,
          refundsProcessed: Math.round(refundsProcessed * 100) / 100,
          disputeRefunds: Math.round(disputeRefunds * 100) / 100,
          averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
          paymentFailureRate: Math.round(paymentFailureRate * 100) / 100,
        };
      },
      this.CACHE_TTL
    );
  }

  async getHistoricalData(metricType: string, days = 30): Promise<AnalyticsSnapshot[]> {
    const cacheKey = `${this.CACHE_PREFIX}historical:${metricType}:${days}`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const snapshots = await prisma.analyticsSnapshots.findMany({
          where: {
            metricType,
            snapshotDate: { gte: startDate }
          },
          orderBy: { snapshotDate: 'asc' }
        });

        return snapshots.map(snapshot => ({
          id: snapshot.id,
          snapshotDate: snapshot.snapshotDate,
          metricType: snapshot.metricType,
          metricData: snapshot.metricData,
          createdAt: snapshot.createdAt,
        }));
      },
      this.CACHE_TTL * 2 // Cache historical data longer
    );
  }

  async createSnapshot(metricType: string, metricData: any): Promise<AnalyticsSnapshot> {
    const snapshot = await prisma.analyticsSnapshots.create({
      data: {
        snapshotDate: new Date(),
        metricType,
        metricData,
      }
    });

    // Invalidate related cache
    await cacheService.invalidatePattern(`${this.CACHE_PREFIX}historical:${metricType}:*`);

    return {
      id: snapshot.id,
      snapshotDate: snapshot.snapshotDate,
      metricType: snapshot.metricType,
      metricData: snapshot.metricData,
      createdAt: snapshot.createdAt,
    };
  }

  async getPlatformKPIs(useCache: boolean = true): Promise<any> {
    const cacheKey = `${this.CACHE_PREFIX}platform_kpis`;
    
    if (!useCache) {
      await cacheService.del(cacheKey);
    }
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // User metrics
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        });
        const newUsersThisMonth = await prisma.user.count({
          where: {
            createdAt: { gte: startOfMonth }
          }
        });
        const newUsersLastMonth = await prisma.user.count({
          where: {
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          }
        });
        const userGrowthRate = newUsersLastMonth > 0 
          ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
          : 0;

        // Company metrics
        const totalCompanies = await prisma.company.count();
        const verifiedCompanies = await prisma.company.count({
          where: { verified: true }
        });
        const activeCompanies = await prisma.company.count({
          where: {
            status: 'ACTIVE',
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        });

        // Booking metrics
        const totalBookings = await prisma.booking.count();
        const completedBookings = await prisma.booking.count({
          where: { status: 'COMPLETED' }
        });
        const bookingsThisMonth = await prisma.booking.count({
          where: {
            createdAt: { gte: startOfMonth }
          }
        });

        // Financial metrics
        const revenueResult = await prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { total: true }
        });
        const totalRevenue = revenueResult._sum.total || 0;

        const avgBookingResult = await prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _avg: { total: true }
        });
        const averageBookingValue = avgBookingResult._avg.total || 0;

        const monthlyRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfMonth }
          },
          _sum: { total: true }
        });
        const monthlyRevenue = monthlyRevenueResult._sum.total || 0;

        const lastMonthRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
          _sum: { total: true }
        });
        const lastMonthRevenue = lastMonthRevenueResult._sum.total || 0;

        const revenueGrowthRate = lastMonthRevenue > 0 
          ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;

        // Platform utilization
        const platformUtilization = totalUsers > 0 
          ? (activeUsers / totalUsers) * 100 
          : 0;

        return {
          totalUsers,
          activeUsers,
          userGrowthRate: Math.round(userGrowthRate * 100) / 100,
          platformUtilization: Math.round(platformUtilization * 100) / 100,
          totalCompanies,
          verifiedCompanies,
          activeCompanies,
          totalBookings,
          completedBookings,
          bookingsThisMonth,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          averageBookingValue: Math.round(averageBookingValue * 100) / 100,
          revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
        };
      },
      this.CACHE_TTL
    );
  }

  async invalidateCache(pattern?: string): Promise<void> {
    const cachePattern = pattern ? `${this.CACHE_PREFIX}${pattern}` : `${this.CACHE_PREFIX}*`;
    await cacheService.invalidatePattern(cachePattern);
    logger.info('Analytics cache invalidated', { pattern: cachePattern });
  }

  async getTimeSeriesData(
    metric: string,
    timeRange: { startDate: Date; endDate: Date } | { start: Date; end: Date; granularity?: string },
    useCache: boolean = true
  ): Promise<any[]> {
    // Normalize the timeRange parameter
    let normalizedRange: { startDate: Date; endDate: Date };
    
    if ('startDate' in timeRange) {
      normalizedRange = timeRange;
    } else {
      normalizedRange = {
        startDate: timeRange.start,
        endDate: timeRange.end
      };
    }

    const cacheKey = `${this.CACHE_PREFIX}timeseries:${metric}:${normalizedRange.startDate.toISOString()}_${normalizedRange.endDate.toISOString()}`;
    
    if (!useCache) {
      return this.fetchTimeSeriesData(metric, normalizedRange);
    }

    return cacheService.getOrSet(
      cacheKey,
      () => this.fetchTimeSeriesData(metric, normalizedRange),
      this.CACHE_TTL
    );
  }

  private async fetchTimeSeriesData(
    metric: string,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<any[]> {
    // Generate daily data points between start and end date
    const data: any[] = [];
    const currentDate = new Date(timeRange.startDate);
    
    while (currentDate <= timeRange.endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      let value = 0;
      
      switch (metric) {
        case 'bookings':
          value = await prisma.booking.count({
            where: {
              createdAt: {
                gte: currentDate,
                lt: nextDate
              }
            }
          });
          break;
        case 'revenue':
          const revenueResult = await prisma.booking.aggregate({
            where: {
              status: 'COMPLETED',
              completedAt: {
                gte: currentDate,
                lt: nextDate
              }
            },
            _sum: { total: true }
          });
          value = revenueResult._sum.total || 0;
          break;
        case 'users':
          value = await prisma.user.count({
            where: {
              createdAt: {
                gte: currentDate,
                lt: nextDate
              }
            }
          });
          break;
        default:
          value = 0;
      }

      data.push({
        date: currentDate.toISOString().split('T')[0],
        value
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  async getGeographicMetrics(useCache: boolean = true): Promise<any[]> {
    const cacheKey = `${this.CACHE_PREFIX}geographic_metrics`;
    
    if (!useCache) {
      return this.fetchGeographicMetrics();
    }

    return cacheService.getOrSet(
      cacheKey,
      () => this.fetchGeographicMetrics(),
      this.CACHE_TTL
    );
  }

  private async fetchGeographicMetrics(): Promise<any[]> {
    const metrics = await prisma.company.groupBy({
      by: ['fylke'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return metrics.map(metric => ({
      region: metric.fylke,
      count: metric._count.id
    }));
  }

  async refreshAllMetrics(): Promise<void> {
    logger.info('Refreshing all analytics metrics');
    
    // Invalidate all caches
    await this.invalidateCache();
    
    // Pre-warm key metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const timeRange = { startDate: startOfMonth, endDate: now };
    
    // Pre-warm platform overview
    await this.getPlatformOverview(timeRange);
    
    // Pre-warm geographic metrics
    await this.getGeographicMetrics(false);
    
    // Pre-warm time series data for key metrics
    await Promise.all([
      this.getTimeSeriesData('bookings', timeRange, false),
      this.getTimeSeriesData('revenue', timeRange, false),
      this.getTimeSeriesData('users', timeRange, false)
    ]);
    
    logger.info('All analytics metrics refreshed');
  }
}

export const analyticsService = new AnalyticsService();