import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { platformConfigService } from '../services/platform-config.service';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Middleware for platform admin authentication and authorization
const requirePlatformAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Platform admin access required'
    });
  }
  next();
};

// GET /api/platform-admin/financial/revenue/summary - Real revenue data
router.get('/revenue/summary', requirePlatformAdmin, async (req, res) => {
  try {
    const cacheKey = 'financial:revenue_summary';
    
    const revenueSummary = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Total revenue from completed bookings
        const totalRevenueResult = await prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { total: true, platformCommission: true }
        });

        // Monthly revenue
        const monthlyRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfMonth }
          },
          _sum: { total: true, platformCommission: true }
        });

        // Last month revenue for comparison
        const lastMonthRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfLastMonth, lte: endOfLastMonth }
          },
          _sum: { total: true, platformCommission: true }
        });

        // Yearly revenue
        const yearlyRevenueResult = await prisma.booking.aggregate({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startOfYear }
          },
          _sum: { total: true, platformCommission: true }
        });

        // TODO: Fix groupBy query when Prisma types are resolved
        // const revenueByPaymentMethod = await prisma.transaction.groupBy({
        //   by: ['paymentMethod'],
        //   where: {
        //     type: 'BOOKING_PAYMENT',
        //     status: 'COMPLETED'
        //   },
        //   _sum: { amount: true },
        //   _count: { id: true }
        // });
        const revenueByPaymentMethod: any[] = [];

        // Average transaction value
        const avgTransactionResult = await prisma.transaction.aggregate({
          where: {
            type: 'BOOKING_PAYMENT',
            status: 'COMPLETED'
          },
          _avg: { amount: true }
        });

        const totalRevenue = totalRevenueResult._sum.total || 0;
        const totalCommissions = totalRevenueResult._sum.platformCommission || 0;
        const monthlyRevenue = monthlyRevenueResult._sum.total || 0;
        const monthlyCommissions = monthlyRevenueResult._sum.platformCommission || 0;
        const lastMonthRevenue = lastMonthRevenueResult._sum.total || 0;
        const yearlyRevenue = yearlyRevenueResult._sum.total || 0;
        const yearlyCommissions = yearlyRevenueResult._sum.platformCommission || 0;

        // Calculate growth rate
        const monthlyGrowthRate = lastMonthRevenue > 0 
          ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
          : 0;

        return {
          total: {
            revenue: Math.round(totalRevenue * 100) / 100,
            commissions: Math.round(totalCommissions * 100) / 100,
            netRevenue: Math.round((totalRevenue - totalCommissions) * 100) / 100
          },
          monthly: {
            revenue: Math.round(monthlyRevenue * 100) / 100,
            commissions: Math.round(monthlyCommissions * 100) / 100,
            netRevenue: Math.round((monthlyRevenue - monthlyCommissions) * 100) / 100,
            growthRate: Math.round(monthlyGrowthRate * 100) / 100
          },
          yearly: {
            revenue: Math.round(yearlyRevenue * 100) / 100,
            commissions: Math.round(yearlyCommissions * 100) / 100,
            netRevenue: Math.round((yearlyRevenue - yearlyCommissions) * 100) / 100
          },
          paymentMethods: revenueByPaymentMethod.map(method => ({
            method: method.paymentMethod,
            revenue: Math.round((method._sum.amount || 0) * 100) / 100,
            transactionCount: method._count.id
          })),
          averageTransactionValue: Math.round((avgTransactionResult._avg.amount || 0) * 100) / 100
        };
      },
      300 // 5 minutes cache
    );

    logger.info('Revenue summary retrieved', {
      userId: req.user?.id,
      totalRevenue: revenueSummary.total.revenue
    });

    res.json({
      success: true,
      data: revenueSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve revenue summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve revenue summary'
    });
  }
});

// GET /api/platform-admin/financial/commission-rates - Real commission rates from database
router.get('/commission-rates', requirePlatformAdmin, async (req, res) => {
  try {
    const commissionConfigs = await platformConfigService.getConfigsByCategory('financial');
    const commissionRates = commissionConfigs.filter(config => 
      config.key.toLowerCase().includes('commission') || 
      config.key.toLowerCase().includes('rate')
    );

    // Also get current commission statistics
    const commissionStats = await cacheService.getOrSet(
      'financial:commission_stats',
      async () => {
        const totalCommissionsResult = await prisma.booking.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { platformCommission: true },
          _count: { id: true }
        });

        const avgCommissionResult = await prisma.booking.aggregate({
          where: { 
            status: 'COMPLETED',
            platformCommission: { not: null }
          },
          _avg: { platformCommission: true }
        });

        return {
          totalCommissions: totalCommissionsResult._sum.platformCommission || 0,
          totalBookings: totalCommissionsResult._count.id,
          averageCommission: avgCommissionResult._avg.platformCommission || 0
        };
      },
      300
    );

    logger.info('Commission rates retrieved', {
      userId: req.user?.id,
      configCount: commissionRates.length
    });

    res.json({
      success: true,
      data: {
        configurations: commissionRates,
        statistics: commissionStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve commission rates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission rates'
    });
  }
});

// GET /api/platform-admin/financial/disputes - Real dispute data
router.get('/disputes', requirePlatformAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [disputes, totalCount] = await Promise.all([
      prisma.dispute.findMany({
        where: whereClause,
        include: {
          booking: {
            select: {
              id: true,
              total: true,
              status: true,
              startDate: true,
              endDate: true
            }
          },
          // user: {  // User field doesn't exist in Dispute model
          //   select: {
          //     id: true,
          //     firstName: true,
          //     lastName: true,
          //     email: true
          //   }
          // },
          // company: {  // Company field doesn't exist in Dispute model
          //   select: {
          //     id: true,
          //     name: true,
          //     email: true
          //   }
          // }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.dispute.count({ where: whereClause })
    ]);

    // Get dispute statistics
    const disputeStats = await cacheService.getOrSet(
      'financial:dispute_stats',
      async () => {
        const stats = await prisma.dispute.groupBy({
          by: ['status'],
          _count: { id: true }
        });

        const refundStats = await prisma.dispute.aggregate({
          where: { refundAmount: { not: null } },
          _sum: { refundAmount: true },
          _count: { id: true }
        });

        return {
          byStatus: stats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          totalRefunds: refundStats._sum.refundAmount || 0,
          refundCount: refundStats._count.id
        };
      },
      300
    );

    logger.info('Disputes retrieved', {
      userId: req.user?.id,
      page,
      limit,
      totalCount,
      status
    });

    res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: disputeStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve disputes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve disputes'
    });
  }
});

// GET /api/platform-admin/financial/refunds - Real refund data
router.get('/refunds', requirePlatformAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const whereClause: any = { type: 'REFUND' };
    if (status) {
      whereClause.status = status;
    }

    const [refunds, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          booking: {
            select: {
              id: true,
              total: true,
              status: true,
              startDate: true,
              endDate: true
            }
          }
          // user: {  // User field doesn't exist in Transaction model
          //   select: {
          //     id: true,
          //     firstName: true,
          //     lastName: true,
          //     email: true
          //   }
          // }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where: whereClause })
    ]);

    // Get refund statistics
    const refundStats = await cacheService.getOrSet(
      'financial:refund_stats',
      async () => {
        const totalRefundsResult = await prisma.transaction.aggregate({
          where: { type: 'REFUND', status: 'COMPLETED' },
          _sum: { amount: true },
          _count: { id: true }
        });

        const pendingRefundsResult = await prisma.transaction.aggregate({
          where: { type: 'REFUND', status: 'PENDING' },
          _sum: { amount: true },
          _count: { id: true }
        });

        const avgRefundResult = await prisma.transaction.aggregate({
          where: { type: 'REFUND', status: 'COMPLETED' },
          _avg: { amount: true }
        });

        return {
          totalRefunded: totalRefundsResult._sum.amount || 0,
          completedRefunds: totalRefundsResult._count.id,
          pendingRefunds: pendingRefundsResult._count.id,
          pendingAmount: pendingRefundsResult._sum.amount || 0,
          averageRefund: avgRefundResult._avg.amount || 0
        };
      },
      300
    );

    logger.info('Refunds retrieved', {
      userId: req.user?.id,
      page,
      limit,
      totalCount,
      status
    });

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        statistics: refundStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve refunds:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve refunds'
    });
  }
});

// PUT /api/platform-admin/financial/commission-rates/:key - Update commission rate
router.put('/commission-rates/:key', requirePlatformAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Value is required'
      });
    }

    const updatedConfig = await platformConfigService.updateConfig(key, {
      value,
      updatedBy: req.user?.id
    });

    // Invalidate financial cache
    await cacheService.invalidatePattern('financial:*');

    logger.info('Commission rate updated', {
      userId: req.user?.id,
      key,
      newValue: value
    });

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Commission rate updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to update commission rate:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to update commission rate'
    });
  }
});

export default router;