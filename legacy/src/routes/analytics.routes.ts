/**
 * Analytics Routes
 * API endpoints for platform analytics and reporting
 */

import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { analyticsService } from '../services/analytics.service';
import { growthAnalyticsService } from '../services/growth-analytics.service';
import { geographicAnalyticsService } from '../services/geographic-analytics.service';
import { analyticsScheduler } from '../services/analytics-scheduler.service';
import { analyticsExportService } from '../services/analytics-export.service';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

const router = Router();

// Apply authentication and platform admin middleware to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);

/**
 * Validation middleware
 */
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * GET /api/platform-admin/analytics/filter-options
 * Get available filter options for analytics
 */
router.get('/filter-options', async (req, res) => {
  try {
    logger.info('Fetching analytics filter options', { adminId: req.user?.id });

    // Get unique regions from companies
    const regions = await prisma.company.findMany({
      select: { city: true, fylke: true },
      where: { 
        city: { not: null },
        fylke: { not: null }
      },
      distinct: ['city', 'fylke']
    });

    // Extract unique cities and fylke
    const uniqueCities = [...new Set(regions.map(r => r.city).filter(Boolean))];
    const uniqueFylke = [...new Set(regions.map(r => r.fylke).filter(Boolean))];

    const filterOptions = {
      regions: [...uniqueCities, ...uniqueFylke].slice(0, 10), // Limit to top 10
      companyTypes: ['Logistics', 'Transport', 'Delivery', 'Moving', 'Freight'],
      userSegments: ['Enterprise', 'SMB', 'Individual', 'Government'],
      featureFlags: ['instant-booking', 'recurring-bookings', 'without-driver', 'hourly-bookings']
    };

    res.json(filterOptions);
  } catch (error) {
    logger.error('Error fetching filter options:', error);
    
    // Fallback to default options
    res.json({
      regions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand'],
      companyTypes: ['Logistics', 'Transport', 'Delivery', 'Moving', 'Freight'],
      userSegments: ['Enterprise', 'SMB', 'Individual', 'Government'],
      featureFlags: ['instant-booking', 'recurring-bookings', 'without-driver', 'hourly-bookings']
    });
  }
});

/**
 * GET /api/platform-admin/analytics/kpis
 * Get platform KPIs and key metrics
 */
router.get('/kpis', 
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const useCache = req.query.useCache !== 'false';
      
      logger.info('Fetching platform KPIs', { 
        adminId: req.user?.id, 
        useCache 
      });

      const kpis = await analyticsService.getPlatformKPIs(useCache);

      res.json({
        success: true,
        data: kpis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching platform KPIs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform KPIs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/metrics/:type
 * Get specific metric data with time series
 */
router.get('/metrics/:type',
  param('type').isIn(['users', 'bookings', 'revenue']).withMessage('Invalid metric type'),
  query('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('endDate must be a valid ISO date'),
  query('granularity').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('Invalid granularity'),
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type } = req.params;
      const { startDate, endDate, granularity = 'day', useCache = true } = req.query;

      // Normalize dates to UTC to handle timezone differences
      const startDateUTC = new Date(startDate as string);
      const endDateUTC = new Date(endDate as string);
      
      // Set to start/end of day to ensure consistent filtering
      startDateUTC.setUTCHours(0, 0, 0, 0);
      endDateUTC.setUTCHours(23, 59, 59, 999);

      const timeRange = {
        start: startDateUTC,
        end: endDateUTC,
        granularity: granularity as 'hour' | 'day' | 'week' | 'month'
      };

      // Validate date range
      if (timeRange.start >= timeRange.end) {
        return res.status(400).json({
          success: false,
          message: 'startDate must be before endDate'
        });
      }

      // Limit date range to prevent excessive queries
      const maxDays = granularity === 'hour' ? 7 : granularity === 'day' ? 90 : 365;
      const daysDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > maxDays) {
        return res.status(400).json({
          success: false,
          message: `Date range too large. Maximum ${maxDays} days for ${granularity} granularity`
        });
      }

      logger.info('Fetching metric time series', { 
        adminId: req.user?.id, 
        type, 
        timeRange,
        useCache: useCache === 'true'
      });

      const data = await analyticsService.getTimeSeriesData(
        type, 
        timeRange, 
        useCache === 'true'
      );

      res.json({
        success: true,
        data: {
          metric: type,
          timeRange,
          timeSeries: data
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching metric data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch metric data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/trends
 * Get growth trends and analysis
 */
router.get('/trends',
  query('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('endDate must be a valid ISO date'),
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, useCache = true } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Validate date range
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'startDate must be before endDate'
        });
      }

      logger.info('Fetching growth trends', { 
        adminId: req.user?.id, 
        dateRange: { start, end },
        useCache: useCache === 'true'
      });

      const trends = await growthAnalyticsService.getGrowthMetrics(
        start, 
        end, 
        useCache === 'true'
      );

      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching growth trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch growth trends',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/geographic
 * Get geographic usage patterns and analysis
 */
router.get('/geographic',
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const useCache = req.query.useCache !== 'false';

      logger.info('Fetching geographic analytics', { 
        adminId: req.user?.id, 
        useCache 
      });

      const geographicData = await geographicAnalyticsService.getGeographicUsageData(useCache);

      res.json({
        success: true,
        data: geographicData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching geographic analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch geographic analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/heatmap
 * Get heat map data for geographic visualization
 */
router.get('/heatmap',
  query('metric').optional().isIn(['users', 'bookings', 'revenue', 'growth']).withMessage('Invalid metric'),
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { metric, useCache = true } = req.query;

      logger.info('Fetching heat map data', { 
        adminId: req.user?.id, 
        metric,
        useCache: useCache === 'true'
      });

      const geographicData = await geographicAnalyticsService.getGeographicUsageData(useCache === 'true');
      
      // Filter heat map data by metric if specified
      let heatMapData = geographicData.heatMapData;
      if (metric) {
        heatMapData = heatMapData.filter(point => point.metric === metric);
      }

      res.json({
        success: true,
        data: {
          metric: metric || 'all',
          points: heatMapData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching heat map data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch heat map data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/cohorts
 * Get cohort analysis data
 */
router.get('/cohorts',
  query('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('endDate must be a valid ISO date'),
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, useCache = true } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      logger.info('Fetching cohort analysis', { 
        adminId: req.user?.id, 
        dateRange: { start, end },
        useCache: useCache === 'true'
      });

      const growthMetrics = await growthAnalyticsService.getGrowthMetrics(
        start, 
        end, 
        useCache === 'true'
      );

      res.json({
        success: true,
        data: {
          cohorts: growthMetrics.cohortAnalysis,
          dateRange: { start, end }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching cohort analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cohort analysis',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/forecasting
 * Get forecasting data and predictions
 */
router.get('/forecasting',
  query('startDate').isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('endDate must be a valid ISO date'),
  query('useCache').optional().isBoolean().withMessage('useCache must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate, useCache = true } = req.query;

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      logger.info('Fetching forecasting data', { 
        adminId: req.user?.id, 
        dateRange: { start, end },
        useCache: useCache === 'true'
      });

      const growthMetrics = await growthAnalyticsService.getGrowthMetrics(
        start, 
        end, 
        useCache === 'true'
      );

      res.json({
        success: true,
        data: {
          forecasting: growthMetrics.forecasting,
          trendAnalysis: growthMetrics.trendAnalysis,
          dateRange: { start, end }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching forecasting data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forecasting data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/platform-admin/analytics/refresh
 * Manually refresh analytics cache
 */
router.post('/refresh',
  body('scope').optional().isIn(['all', 'kpis', 'geographic', 'timeseries']).withMessage('Invalid refresh scope'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { scope = 'all' } = req.body;

      logger.info('Manual analytics refresh requested', { 
        adminId: req.user?.id, 
        scope 
      });

      switch (scope) {
        case 'kpis':
          await analyticsService.getPlatformKPIs(false);
          break;
        case 'geographic':
          await geographicAnalyticsService.getGeographicUsageData(false);
          break;
        case 'timeseries':
          await analyticsService.invalidateCache('timeseries:*');
          break;
        case 'all':
        default:
          await analyticsService.refreshAllMetrics();
          await geographicAnalyticsService.getGeographicUsageData(false);
          break;
      }

      res.json({
        success: true,
        message: `Analytics cache refreshed for scope: ${scope}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error refreshing analytics cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh analytics cache',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/scheduler/status
 * Get analytics scheduler job status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    logger.info('Fetching scheduler status', { adminId: req.user?.id });

    const status = analyticsScheduler.getJobStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduler status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/platform-admin/analytics/scheduler/trigger/:jobName
 * Manually trigger a scheduler job
 */
router.post('/scheduler/trigger/:jobName',
  param('jobName').isIn([
    'kpi-calculation', 
    'geographic-metrics', 
    'cache-warming', 
    'daily-aggregation', 
    'weekly-aggregation', 
    'monthly-aggregation'
  ]).withMessage('Invalid job name'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { jobName } = req.params;

      logger.info('Manual job trigger requested', { 
        adminId: req.user?.id, 
        jobName 
      });

      await analyticsScheduler.triggerJob(jobName);

      res.json({
        success: true,
        message: `Job ${jobName} triggered successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error triggering job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/platform-admin/analytics/export
 * Export analytics data in various formats
 */
router.post('/export',
  body('reportType').isIn(['kpis', 'growth', 'geographic', 'cohorts', 'comprehensive']).withMessage('Invalid report type'),
  body('format').isIn(['csv', 'excel', 'json']).withMessage('Invalid export format'),
  body('dateRange.start').isISO8601().withMessage('Invalid start date'),
  body('dateRange.end').isISO8601().withMessage('Invalid end date'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('delivery.method').optional().isIn(['download', 'email']).withMessage('Invalid delivery method'),
  body('delivery.recipients').optional().isArray().withMessage('Recipients must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const exportRequest = {
        reportType: req.body.reportType,
        format: req.body.format,
        dateRange: {
          start: new Date(req.body.dateRange.start),
          end: new Date(req.body.dateRange.end)
        },
        filters: req.body.filters,
        delivery: req.body.delivery
      };

      logger.info('Analytics export requested', { 
        adminId: req.user?.id,
        exportRequest 
      });

      const exportResult = await analyticsExportService.exportData(exportRequest);

      if (exportRequest.delivery?.method === 'email') {
        // Send by email
        await analyticsExportService.sendReportByEmail(
          exportResult,
          exportRequest.delivery.recipients || [],
          `${exportRequest.reportType} Report`
        );

        res.json({
          success: true,
          message: 'Report sent by email successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        // Download response
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.setHeader('Content-Type', exportResult.contentType);
        res.send(exportResult.data);
      }
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/platform-admin/analytics/scheduled-reports
 * Create a scheduled report
 */
router.post('/scheduled-reports',
  body('name').notEmpty().withMessage('Report name is required'),
  body('reportType').isIn(['kpis', 'growth', 'geographic', 'cohorts', 'comprehensive']).withMessage('Invalid report type'),
  body('format').isIn(['csv', 'excel', 'json']).withMessage('Invalid format'),
  body('schedule').notEmpty().withMessage('Schedule is required'),
  body('recipients').isArray().withMessage('Recipients must be an array'),
  body('isActive').isBoolean().withMessage('isActive must be boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const reportConfig = {
        name: req.body.name,
        reportType: req.body.reportType,
        format: req.body.format,
        schedule: req.body.schedule,
        recipients: req.body.recipients,
        filters: req.body.filters || {},
        isActive: req.body.isActive,
        createdBy: req.user?.id || 'system'
      };

      logger.info('Creating scheduled report', { 
        adminId: req.user?.id,
        reportConfig 
      });

      const scheduledReport = await analyticsExportService.createScheduledReport(
        reportConfig,
        req.user?.id
      );

      res.json({
        success: true,
        data: scheduledReport,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error creating scheduled report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create scheduled report',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/analytics/scheduled-reports
 * Get all scheduled reports
 */
router.get('/scheduled-reports', async (req, res) => {
  try {
    logger.info('Fetching scheduled reports', { adminId: req.user?.id });

    // This would typically fetch from database
    // For now, return empty array as placeholder
    const scheduledReports: any[] = [];

    res.json({
      success: true,
      data: scheduledReports,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching scheduled reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled reports',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;