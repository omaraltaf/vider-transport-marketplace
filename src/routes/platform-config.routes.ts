/**
 * Platform Configuration Routes
 * API endpoints for managing platform-wide configurations
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin } from '../middleware/platform-admin.middleware';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

const router = Router();
const prisma = new PrismaClient();

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
 * GET /api/platform-admin/system/config
 * Get all platform configurations
 */
router.get('/config', 
  query('category').optional().isIn(['financial', 'system', 'features', 'security', 'performance']).withMessage('Invalid category'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { category } = req.query;
      
      logger.info('Fetching platform configurations', { 
        adminId: req.user?.userId, 
        category 
      });

      // Get platform configuration from database
      const platformConfig = await prisma.platformConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!platformConfig) {
        return res.status(404).json({
          success: false,
          message: 'No active platform configuration found'
        });
      }

      // Convert platform config to structured configuration format
      const configurations = [
        // Financial Configurations
        {
          id: `${platformConfig.id}_commission_rate`,
          category: 'financial',
          key: 'commission_rate',
          value: platformConfig.commissionRate,
          displayName: 'Commission Rate',
          description: 'Platform commission rate percentage charged on bookings',
          dataType: 'number',
          min: 0,
          max: 50,
          unit: '%',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_tax_rate`,
          category: 'financial',
          key: 'tax_rate',
          value: platformConfig.taxRate,
          displayName: 'Tax Rate (VAT)',
          description: 'Norwegian VAT rate applied to transactions',
          dataType: 'number',
          min: 0,
          max: 50,
          unit: '%',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_currency`,
          category: 'financial',
          key: 'default_currency',
          value: platformConfig.defaultCurrency,
          displayName: 'Default Currency',
          description: 'Default currency for the platform',
          dataType: 'select',
          options: ['NOK', 'EUR', 'USD'],
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_min_booking`,
          category: 'financial',
          key: 'min_booking_amount',
          value: 500, // Default value since not in schema
          displayName: 'Minimum Booking Amount',
          description: 'Minimum amount required for a booking',
          dataType: 'number',
          min: 0,
          max: 10000,
          unit: 'NOK',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_max_booking`,
          category: 'financial',
          key: 'max_booking_amount',
          value: 100000, // Default value since not in schema
          displayName: 'Maximum Booking Amount',
          description: 'Maximum amount allowed for a single booking',
          dataType: 'number',
          min: 1000,
          max: 1000000,
          unit: 'NOK',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        
        // System Configurations
        {
          id: `${platformConfig.id}_booking_timeout`,
          category: 'system',
          key: 'booking_timeout_hours',
          value: platformConfig.bookingTimeoutHours,
          displayName: 'Booking Timeout',
          description: 'Hours before unpaid bookings are automatically cancelled',
          dataType: 'number',
          min: 1,
          max: 168,
          unit: 'hours',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_session_timeout`,
          category: 'system',
          key: 'session_timeout_minutes',
          value: 60, // Default value since not in schema
          displayName: 'Session Timeout',
          description: 'Minutes before user sessions expire',
          dataType: 'number',
          min: 15,
          max: 480,
          unit: 'minutes',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_maintenance`,
          category: 'system',
          key: 'maintenance_mode',
          value: platformConfig.maintenanceMode,
          displayName: 'Maintenance Mode',
          description: 'Enable maintenance mode to restrict platform access',
          dataType: 'boolean',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        
        // Feature Configurations
        {
          id: `${platformConfig.id}_instant_booking`,
          category: 'features',
          key: 'instant_booking_enabled',
          value: platformConfig.instantBooking ?? true,
          displayName: 'Instant Booking',
          description: 'Allow users to book vehicles instantly without approval',
          dataType: 'boolean',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_recurring_bookings`,
          category: 'features',
          key: 'recurring_bookings_enabled',
          value: platformConfig.recurringBookings ?? true,
          displayName: 'Recurring Bookings',
          description: 'Enable recurring booking functionality',
          dataType: 'boolean',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_driver_ratings`,
          category: 'features',
          key: 'driver_ratings_enabled',
          value: true, // Default value since not in schema
          displayName: 'Driver Ratings',
          description: 'Enable driver rating and review system',
          dataType: 'boolean',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        
        // Security Configurations
        {
          id: `${platformConfig.id}_max_login_attempts`,
          category: 'security',
          key: 'max_login_attempts',
          value: 5, // Default value since not in schema
          displayName: 'Max Login Attempts',
          description: 'Maximum failed login attempts before account lockout',
          dataType: 'number',
          min: 3,
          max: 10,
          unit: 'attempts',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_password_min_length`,
          category: 'security',
          key: 'password_min_length',
          value: 8, // Default value since not in schema
          displayName: 'Minimum Password Length',
          description: 'Minimum required password length for user accounts',
          dataType: 'number',
          min: 6,
          max: 20,
          unit: 'characters',
          isEditable: true,
          requiresRestart: false,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        
        // Performance Configurations
        {
          id: `${platformConfig.id}_cache_ttl`,
          category: 'performance',
          key: 'cache_ttl_seconds',
          value: 300, // Default value since not in schema
          displayName: 'Cache TTL',
          description: 'Default cache time-to-live in seconds',
          dataType: 'number',
          min: 60,
          max: 3600,
          unit: 'seconds',
          isEditable: true,
          requiresRestart: true,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        },
        {
          id: `${platformConfig.id}_rate_limit`,
          category: 'performance',
          key: 'api_rate_limit_per_minute',
          value: 100, // Default value since not in schema
          displayName: 'API Rate Limit',
          description: 'Maximum API requests per minute per user',
          dataType: 'number',
          min: 10,
          max: 1000,
          unit: 'requests/min',
          isEditable: true,
          requiresRestart: true,
          updatedAt: platformConfig.updatedAt,
          updatedBy: platformConfig.activatedBy || 'system'
        }
      ];

      // Filter by category if specified
      const filteredConfigs = category 
        ? configurations.filter(config => config.category === category)
        : configurations;

      res.json({
        success: true,
        data: filteredConfigs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching platform configurations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform configurations',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/platform-admin/system/config/:key
 * Update a specific configuration
 */
router.put('/config/:key',
  body('value').notEmpty().withMessage('Value is required'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { key } = req.params;
      const { value, reason } = req.body;
      const updatedBy = req.user?.userId || 'unknown';

      logger.info('Updating platform configuration', { 
        adminId: req.user?.userId, 
        key, 
        value,
        reason 
      });

      // Get current platform config
      const currentConfig = await prisma.platformConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!currentConfig) {
        return res.status(404).json({
          success: false,
          message: 'No active platform configuration found'
        });
      }

      // Validate and map configuration key to database field
      const updateData: any = { 
        updatedAt: new Date(), 
        activatedBy: req.user?.userId || 'unknown'
      };
      
      let oldValue: any;

      switch (key) {
        case 'commission_rate':
          if (typeof value !== 'number' || value < 0 || value > 50) {
            throw new Error('Commission rate must be a number between 0 and 50');
          }
          oldValue = currentConfig.commissionRate;
          updateData.commissionRate = value;
          break;
          
        case 'tax_rate':
          if (typeof value !== 'number' || value < 0 || value > 50) {
            throw new Error('Tax rate must be a number between 0 and 50');
          }
          oldValue = currentConfig.taxRate;
          updateData.taxRate = value;
          break;
          
        case 'default_currency':
          if (typeof value !== 'string' || !['NOK', 'EUR', 'USD'].includes(value)) {
            throw new Error('Currency must be NOK, EUR, or USD');
          }
          oldValue = currentConfig.defaultCurrency;
          updateData.defaultCurrency = value;
          break;
          
        case 'min_booking_amount':
          if (typeof value !== 'number' || value < 0 || value > 10000) {
            throw new Error('Minimum booking amount must be between 0 and 10000');
          }
          oldValue = currentConfig.minBookingAmount;
          updateData.minBookingAmount = value;
          break;
          
        case 'max_booking_amount':
          if (typeof value !== 'number' || value < 1000 || value > 1000000) {
            throw new Error('Maximum booking amount must be between 1000 and 1000000');
          }
          oldValue = currentConfig.maxBookingAmount;
          updateData.maxBookingAmount = value;
          break;
          
        case 'booking_timeout_hours':
          if (typeof value !== 'number' || value < 1 || value > 168) {
            throw new Error('Booking timeout must be between 1 and 168 hours');
          }
          oldValue = currentConfig.bookingTimeoutHours;
          updateData.bookingTimeoutHours = value;
          break;
          
        case 'session_timeout_minutes':
          if (typeof value !== 'number' || value < 15 || value > 480) {
            throw new Error('Session timeout must be between 15 and 480 minutes');
          }
          oldValue = currentConfig.sessionTimeoutMinutes;
          updateData.sessionTimeoutMinutes = value;
          break;
          
        case 'maintenance_mode':
          if (typeof value !== 'boolean') {
            throw new Error('Maintenance mode must be a boolean');
          }
          oldValue = currentConfig.maintenanceMode;
          updateData.maintenanceMode = value;
          break;
          
        case 'instant_booking_enabled':
          if (typeof value !== 'boolean') {
            throw new Error('Instant booking enabled must be a boolean');
          }
          oldValue = currentConfig.instantBooking;
          updateData.instantBooking = value;
          break;
          
        case 'recurring_bookings_enabled':
          if (typeof value !== 'boolean') {
            throw new Error('Recurring bookings enabled must be a boolean');
          }
          oldValue = currentConfig.recurringBookings;
          updateData.recurringBookings = value;
          break;
          
        case 'driver_ratings_enabled':
          if (typeof value !== 'boolean') {
            throw new Error('Driver ratings enabled must be a boolean');
          }
          oldValue = currentConfig.driverRatingsEnabled;
          updateData.driverRatingsEnabled = value;
          break;
          
        case 'max_login_attempts':
          if (typeof value !== 'number' || value < 3 || value > 10) {
            throw new Error('Max login attempts must be between 3 and 10');
          }
          oldValue = currentConfig.maxLoginAttempts;
          updateData.maxLoginAttempts = value;
          break;
          
        case 'password_min_length':
          if (typeof value !== 'number' || value < 6 || value > 20) {
            throw new Error('Password minimum length must be between 6 and 20');
          }
          oldValue = currentConfig.passwordMinLength;
          updateData.passwordMinLength = value;
          break;
          
        case 'cache_ttl_seconds':
          if (typeof value !== 'number' || value < 60 || value > 3600) {
            throw new Error('Cache TTL must be between 60 and 3600 seconds');
          }
          oldValue = currentConfig.cacheTtlSeconds;
          updateData.cacheTtlSeconds = value;
          break;
          
        case 'api_rate_limit_per_minute':
          if (typeof value !== 'number' || value < 10 || value > 1000) {
            throw new Error('API rate limit must be between 10 and 1000 requests per minute');
          }
          oldValue = currentConfig.apiRateLimitPerMinute;
          updateData.apiRateLimitPerMinute = value;
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: `Configuration key '${key}' is not supported`
          });
      }

      // Update the platform configuration
      const updatedConfig = await prisma.platformConfig.update({
        where: { id: currentConfig.id },
        data: updateData
      });

      // Log the configuration change
      await prisma.auditLog.create({
        data: {
          adminUserId: req.user?.userId || 'unknown',
          action: 'PLATFORM_CONFIG_UPDATE',
          entityType: 'PLATFORM_CONFIG',
          entityId: key,
          changes: {
            key,
            oldValue,
            newValue: value,
            reason: reason || 'Configuration update'
          },
          reason: reason || `Updated ${key} configuration`,
          ipAddress: req.ip || 'unknown'
        }
      });

      // Clear relevant caches
      await redis.del('system_config_*');
      await redis.del('commission_rates:*');
      await redis.del('revenue_*');

      res.json({
        success: true,
        message: `Configuration '${key}' updated successfully`,
        data: {
          key,
          oldValue,
          newValue: value,
          updatedAt: updatedConfig.updatedAt,
          updatedBy: req.user?.userId || 'unknown'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error updating platform configuration:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update platform configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/platform-admin/system/config/bulk-update
 * Update multiple configurations at once
 */
router.post('/config/bulk-update',
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.key').notEmpty().withMessage('Each update must have a key'),
  body('updates.*.value').exists().withMessage('Each update must have a value'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { updates, reason } = req.body;
      const updatedBy = req.user?.userId || 'unknown';

      logger.info('Bulk updating platform configurations', { 
        adminId: updatedBy, 
        updateCount: updates.length,
        reason 
      });

      const results = [];
      const errors = [];

      // Process each update
      for (const update of updates) {
        try {
          // Make individual update request
          const updateResponse = await fetch(`${req.protocol}://${req.get('host')}/api/platform-admin/config/config/${update.key}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({
              value: update.value,
              reason: reason || 'Bulk configuration update'
            })
          });

          if (updateResponse.ok) {
            const result = await updateResponse.json();
            results.push({
              key: update.key,
              success: true,
              data: result.data
            });
          } else {
            const error = await updateResponse.json();
            errors.push({
              key: update.key,
              error: error.message || 'Update failed'
            });
          }
        } catch (error) {
          errors.push({
            key: update.key,
            error: error.message || 'Update failed'
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      res.json({
        success: errorCount === 0,
        message: `Bulk update completed: ${successCount} successful, ${errorCount} failed`,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: updates.length,
            successful: successCount,
            failed: errorCount
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in bulk configuration update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk configuration update',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/platform-admin/system/config/history
 * Get configuration change history
 */
router.get('/config/history',
  query('key').optional().isString().withMessage('Key must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { key, limit = 50, offset = 0 } = req.query;

      logger.info('Fetching configuration change history', { 
        adminId: req.user?.userId, 
        key,
        limit,
        offset 
      });

      const whereClause: any = {
        action: 'PLATFORM_CONFIG_UPDATE',
        entityType: 'PLATFORM_CONFIG'
      };

      if (key) {
        whereClause.entityId = key;
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit as string),
          skip: parseInt(offset as string)
        }),
        prisma.auditLog.count({ where: whereClause })
      ]);

      const history = auditLogs.map(log => ({
        id: log.id,
        key: log.entityId,
        changes: log.changes,
        reason: log.reason,
        changedBy: log.adminUserId,
        changedAt: log.createdAt,
        ipAddress: log.ipAddress
      }));

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            total,
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            hasMore: parseInt(offset as string) + parseInt(limit as string) < total
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching configuration history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configuration history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;