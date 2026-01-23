import { Router } from 'express';
import { analyticsService } from '../services/analytics.service';
import { platformConfigService } from '../services/platform-config.service';
import { logger } from '../utils/logger';

const router = Router();

// Middleware for platform admin authentication and authorization
const requirePlatformAdmin = (req: any, res: any, next: any) => {
  // This should be implemented based on your auth system
  // For now, we'll assume the user is authenticated and has platform admin role
  if (!req.user || req.user.role !== 'PLATFORM_ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Platform admin access required'
    });
  }
  next();
};

// GET /api/platform-admin/analytics/overview - Real platform metrics
router.get('/overview', requirePlatformAdmin, async (req, res) => {
  try {
    const metrics = await analyticsService.getPlatformOverview();
    
    logger.info('Platform overview metrics retrieved', {
      userId: req.user?.id,
      metricsKeys: Object.keys(metrics)
    });

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve platform overview metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve platform metrics'
    });
  }
});

// GET /api/platform-admin/analytics/bookings - Real booking analytics
router.get('/bookings', requirePlatformAdmin, async (req, res) => {
  try {
    const bookingMetrics = await analyticsService.getBookingMetrics();
    
    logger.info('Booking metrics retrieved', {
      userId: req.user?.id,
      totalBookings: bookingMetrics.pendingBookings + bookingMetrics.acceptedBookings + 
                    bookingMetrics.activeBookings + bookingMetrics.completedBookings + 
                    bookingMetrics.cancelledBookings + bookingMetrics.disputedBookings
    });

    res.json({
      success: true,
      data: bookingMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve booking metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve booking analytics'
    });
  }
});

// GET /api/platform-admin/analytics/financial - Real financial analytics
router.get('/financial', requirePlatformAdmin, async (req, res) => {
  try {
    const financialMetrics = await analyticsService.getFinancialMetrics();
    
    logger.info('Financial metrics retrieved', {
      userId: req.user?.id,
      dailyRevenue: financialMetrics.dailyRevenue,
      monthlyRevenue: financialMetrics.monthlyRevenue
    });

    res.json({
      success: true,
      data: financialMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve financial metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve financial analytics'
    });
  }
});

// GET /api/platform-admin/analytics/historical/:metricType - Historical data
router.get('/historical/:metricType', requirePlatformAdmin, async (req, res) => {
  try {
    const { metricType } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (days > 365) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 365 days of historical data allowed'
      });
    }

    const historicalData = await analyticsService.getHistoricalData(metricType, days);
    
    logger.info('Historical analytics data retrieved', {
      userId: req.user?.id,
      metricType,
      days,
      recordCount: historicalData.length
    });

    res.json({
      success: true,
      data: historicalData,
      metricType,
      days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve historical analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve historical analytics data'
    });
  }
});

// GET /api/platform-admin/analytics/config/commission-rates - Real commission rates
router.get('/config/commission-rates', requirePlatformAdmin, async (req, res) => {
  try {
    const commissionConfigs = await platformConfigService.getConfigsByCategory('financial');
    const commissionRates = commissionConfigs.filter(config => 
      config.key.includes('commission') || config.key.includes('rate')
    );
    
    logger.info('Commission rate configurations retrieved', {
      userId: req.user?.id,
      configCount: commissionRates.length
    });

    res.json({
      success: true,
      data: commissionRates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve commission rate configurations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve commission rate configurations'
    });
  }
});

// POST /api/platform-admin/analytics/snapshot - Create analytics snapshot
router.post('/snapshot', requirePlatformAdmin, async (req, res) => {
  try {
    const { metricType, metricData } = req.body;

    if (!metricType || !metricData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'metricType and metricData are required'
      });
    }

    const snapshot = await analyticsService.createSnapshot(metricType, metricData);
    
    logger.info('Analytics snapshot created', {
      userId: req.user?.id,
      snapshotId: snapshot.id,
      metricType
    });

    res.status(201).json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create analytics snapshot:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create analytics snapshot'
    });
  }
});

// DELETE /api/platform-admin/analytics/cache - Invalidate analytics cache
router.delete('/cache', requirePlatformAdmin, async (req, res) => {
  try {
    await analyticsService.invalidateCache();
    
    logger.info('Analytics cache invalidated', {
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Analytics cache invalidated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to invalidate analytics cache:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to invalidate analytics cache'
    });
  }
});

export default router;