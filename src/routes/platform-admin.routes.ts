import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePlatformAdmin, auditPlatformAdminAction } from '../middleware/platform-admin.middleware';
import { platformAdminService } from '../services/platform-admin.service';
import { platformConfigService } from '../services/platform-config.service';
import { featureRollbackService } from '../services/feature-rollback.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';
import { logError } from '../utils/logging.utils';
import { Role } from '@prisma/client';
import analyticsRoutes from './analytics.routes';
import platformAdminGlobalRoutes from './platform-admin-global.routes';
import platformConfigRoutes from './platform-config.routes';

const router = Router();

// Apply authentication and platform admin authorization to all routes
router.use(authenticate);
router.use(requirePlatformAdmin);
router.use(auditPlatformAdminAction);

/**
 * Get platform overview metrics
 * GET /api/platform-admin/overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    // TODO: Implement platform overview metrics
    // This will be implemented in the analytics section
    
    res.json({
      message: 'Platform overview endpoint - to be implemented',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching platform overview',
      },
    });
  }
});

/**
 * Get platform overview metrics with date range
 * GET /api/platform-admin/overview/metrics
 */
router.get('/overview/metrics', async (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;
    
    // Mock metrics data matching frontend expectations
    const metrics = {
      users: {
        total: 156,
        active: 89,
        growth: 12.5
      },
      companies: {
        total: 23,
        active: 18,
        verified: 15,
        growth: 8.7
      },
      bookings: {
        total: 342,
        completed: 298,
        pending: 12,
        cancelled: 32,
        growth: 15.3
      },
      revenue: {
        total: 125000,
        monthly: 45000,
        growth: 18.2,
        currency: 'NOK'
      },
      performance: {
        averageRating: 4.2,
        responseTime: 245,
        uptime: 99.8
      },
      range: range,
      lastUpdated: new Date().toISOString()
    };
    
    res.json(metrics);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching platform metrics',
      },
    });
  }
});

/**
 * Get platform overview activity
 * GET /api/platform-admin/overview/activity
 */
router.get('/overview/activity', async (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;
    
    // Mock activity data for now
    const activities = [
      {
        id: '1',
        type: 'user_registration',
        description: 'New user registered: john@example.com',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        severity: 'info'
      },
      {
        id: '2',
        type: 'company_verification',
        description: 'Company verified: Transport AS',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        severity: 'success'
      },
      {
        id: '3',
        type: 'booking_completed',
        description: 'Booking completed: #BK-2024-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        severity: 'info'
      }
    ];
    
    res.json({ activities, range });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching platform activity',
      },
    });
  }
});

/**
 * Get system alerts
 * GET /api/platform-admin/system/alerts
 */
router.get('/system/alerts', async (req: Request, res: Response) => {
  try {
    // Mock alerts data for now
    const alerts = [
      {
        id: '1',
        type: 'warning',
        title: 'High API Usage',
        message: 'API usage is approaching rate limits',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        resolved: false
      },
      {
        id: '2',
        type: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for next week',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        resolved: false
      }
    ];
    
    res.json({ alerts });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching system alerts',
      },
    });
  }
});

/**
 * Get all companies with filtering and pagination
 * GET /api/platform-admin/companies
 * Query parameters:
 * - status: Filter by company status (active, suspended, pending_verification)
 * - verified: Filter by verification status (true/false)
 * - search: Search by name, email, or organization number
 * - fylke: Filter by fylke (region)
 * - registeredAfter: Filter companies registered after date (ISO string)
 * - registeredBefore: Filter companies registered before date (ISO string)
 * - verifiedAfter: Filter companies verified after date (ISO string)
 * - verifiedBefore: Filter companies verified before date (ISO string)
 * - sortBy: Sort by field (name, createdAt, totalBookings, totalRevenue, aggregatedRating)
 * - sortOrder: Sort order (asc, desc)
 * - page: Page number for pagination
 * - pageSize: Number of items per page
 */
router.get('/companies', async (req: Request, res: Response) => {
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
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    // Validate date parameters
    const parseDate = (dateStr: string | undefined) => {
      if (!dateStr) return undefined;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      return date;
    };

    // Validate sort parameters
    const validSortFields = ['name', 'createdAt', 'totalBookings', 'totalRevenue', 'aggregatedRating'];
    const sortField = sortBy as string;
    if (sortField && !validSortFields.includes(sortField)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_FIELD',
          message: `Sort field must be one of: ${validSortFields.join(', ')}`,
        },
      });
    }

    const sortDirection = sortOrder as string;
    if (sortDirection && !['asc', 'desc'].includes(sortDirection)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_ORDER',
          message: 'Sort order must be asc or desc',
        },
      });
    }

    // Map status values to enum format
    let mappedStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | undefined;
    if (status) {
      const statusMap: Record<string, 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'> = {
        'active': 'ACTIVE',
        'suspended': 'SUSPENDED',
        'pending_verification': 'PENDING_VERIFICATION'
      };
      mappedStatus = statusMap[status as string];
    }

    const filters = {
      status: mappedStatus,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
      search: search as string,
      fylke: fylke as string,
      registeredAfter: parseDate(registeredAfter as string),
      registeredBefore: parseDate(registeredBefore as string),
      verifiedAfter: parseDate(verifiedAfter as string),
      verifiedBefore: parseDate(verifiedBefore as string),
      sortBy: sortField,
      sortOrder: sortDirection as 'asc' | 'desc',
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    };

    const result = await platformAdminService.getCompanies(filters);
    res.json(result);
  } catch (error) {
    logError({ error: error as Error, request: req });
    
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Invalid date format')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: errorMessage,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching companies',
      },
    });
  }
});

/**
 * Get a company by ID with detailed metrics
 * GET /api/platform-admin/companies/:id
 */
router.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const company = await platformAdminService.getCompanyById(id);
    
    if (!company) {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }

    res.json(company);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching company details',
      },
    });
  }
});

/**
 * Update company status
 * PUT /api/platform-admin/companies/:id/status
 */
router.put('/companies/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be one of: ACTIVE, SUSPENDED, PENDING_VERIFICATION',
        },
      });
    }

    // Require reason for suspension
    if (status === 'SUSPENDED' && !reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Reason is required when suspending a company',
        },
      });
    }

    await platformAdminService.updateCompanyStatus(
      id, 
      status, 
      req.user!.userId, 
      reason,
      req.ip
    );

    res.json({
      message: 'Company status updated successfully',
      companyId: id,
      status,
      updatedBy: req.user!.userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating company status',
      },
    });
  }
});

/**
 * Create a new company
 * POST /api/platform-admin/companies
 */
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const {
      name,
      organizationNumber,
      businessAddress,
      city,
      postalCode,
      fylke,
      kommune,
      vatRegistered,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !organizationNumber || !businessAddress || !city || !postalCode || !fylke || !kommune) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Name, organization number, business address, city, postal code, fylke, and kommune are required',
        },
      });
    }

    const company = await platformAdminService.createCompany({
      name,
      organizationNumber,
      businessAddress,
      city,
      postalCode,
      fylke,
      kommune,
      vatRegistered: Boolean(vatRegistered),
      description,
    }, req.user!.userId);

    res.status(201).json(company);
  } catch (error) {
    logError({ error: error as Error, request: req });
    
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('unique constraint')) {
      return res.status(409).json({
        error: {
          code: 'ORGANIZATION_NUMBER_EXISTS',
          message: 'A company with this organization number already exists',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the company',
      },
    });
  }
});

/**
 * Suspend a company
 * POST /api/platform-admin/companies/:companyId/suspend
 */
router.post('/companies/:companyId/suspend', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Suspension reason is required',
        },
      });
    }

    await platformAdminService.suspendCompany(companyId, reason, req.user!.userId);

    res.json({
      message: 'Company suspended successfully',
      companyId,
      suspendedBy: req.user!.userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while suspending the company',
      },
    });
  }
});

/**
 * Delete a company
 * DELETE /api/platform-admin/companies/:companyId
 */
router.delete('/companies/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    await platformAdminService.deleteCompany(companyId, req.user!.userId);

    res.json({
      message: 'Company deleted successfully',
      companyId,
      deletedBy: req.user!.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting the company',
      },
    });
  }
});

/**
 * Verify a company
 * POST /api/platform-admin/companies/:companyId/verify
 */
router.post('/companies/:companyId/verify', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    await platformAdminService.verifyCompany(companyId, req.user!.userId);

    res.json({
      message: 'Company verified successfully',
      companyId,
      verifiedBy: req.user!.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while verifying the company',
      },
    });
  }
});

/**
 * Bulk suspend companies
 * POST /api/platform-admin/companies/bulk-suspend
 */
router.post('/companies/bulk-suspend', async (req: Request, res: Response) => {
  try {
    const { companyIds, reason } = req.body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COMPANY_IDS',
          message: 'companyIds array is required and must not be empty',
        },
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Suspension reason is required for bulk operations',
        },
      });
    }

    const result = await platformAdminService.bulkCompanyOperation({
      operation: 'suspend',
      companyIds,
      reason,
    }, req.user!.userId, req.ip);

    res.json({
      message: 'Bulk suspension completed',
      operation: 'suspend',
      result,
      performedBy: req.user!.userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while performing bulk suspension',
      },
    });
  }
});

/**
 * Bulk verify companies
 * POST /api/platform-admin/companies/bulk-verify
 */
router.post('/companies/bulk-verify', async (req: Request, res: Response) => {
  try {
    const { companyIds, notes } = req.body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COMPANY_IDS',
          message: 'companyIds array is required and must not be empty',
        },
      });
    }

    const result = await platformAdminService.bulkCompanyOperation({
      operation: 'verify',
      companyIds,
      notes,
    }, req.user!.userId, req.ip);

    res.json({
      message: 'Bulk verification completed',
      operation: 'verify',
      result,
      performedBy: req.user!.userId,
      notes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while performing bulk verification',
      },
    });
  }
});

/**
 * Bulk export companies
 * POST /api/platform-admin/companies/bulk-export
 */
router.post('/companies/bulk-export', async (req: Request, res: Response) => {
  try {
    const { companyIds, format = 'csv', includeMetrics = true } = req.body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COMPANY_IDS',
          message: 'companyIds array is required and must not be empty',
        },
      });
    }

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be csv or json',
        },
      });
    }

    const exportData = await platformAdminService.exportCompanies({
      companyIds,
      format,
      includeMetrics,
    }, req.user!.userId);

    // Set appropriate headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `companies_export_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

    res.send(exportData);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while exporting companies',
      },
    });
  }
});

// ===== FEATURE CONFIGURATION MANAGEMENT ENDPOINTS =====

/**
 * Get all platform features with their current configuration
 * GET /api/platform-admin/config/features
 */
router.get('/config/features', async (req: Request, res: Response) => {
  try {
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'NO_CONFIGURATION_FOUND',
          message: 'No active platform configuration found',
        },
      });
    }

    // Extract feature toggles and format for response
    const features = [
      {
        id: 'without-driver-listings',
        name: 'Without Driver Listings',
        description: 'Allow vehicle listings without driver',
        enabled: config.withoutDriverListings,
        scope: 'global' as const,
        category: 'booking-features',
        requiresRestart: false,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
      {
        id: 'hourly-bookings',
        name: 'Hourly Bookings',
        description: 'Enable hourly booking options',
        enabled: config.hourlyBookings,
        scope: 'global' as const,
        category: 'booking-features',
        requiresRestart: false,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
      {
        id: 'recurring-bookings',
        name: 'Recurring Bookings',
        description: 'Enable recurring booking functionality',
        enabled: config.recurringBookings,
        scope: 'global' as const,
        category: 'booking-features',
        requiresRestart: false,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
      {
        id: 'instant-booking',
        name: 'Instant Booking',
        description: 'Allow instant booking without approval',
        enabled: config.instantBooking,
        scope: 'global' as const,
        category: 'booking-features',
        requiresRestart: false,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
      {
        id: 'auto-approval',
        name: 'Auto Approval',
        description: 'Automatically approve bookings',
        enabled: config.autoApprovalEnabled,
        scope: 'global' as const,
        category: 'system-features',
        requiresRestart: false,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
      {
        id: 'maintenance-mode',
        name: 'Maintenance Mode',
        description: 'Enable platform maintenance mode',
        enabled: config.maintenanceMode,
        scope: 'global' as const,
        category: 'system-features',
        requiresRestart: true,
        lastUpdated: config.updatedAt,
        updatedBy: config.activatedBy,
      },
    ];

    res.json({
      features,
      totalFeatures: features.length,
      configVersion: config.version,
      lastConfigUpdate: config.updatedAt,
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching feature configuration',
      },
    });
  }
});

/**
 * Update a specific feature configuration
 * PUT /api/platform-admin/config/features/:featureId
 */
router.put('/config/features/:featureId', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { enabled, reason } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: {
          code: 'INVALID_ENABLED_VALUE',
          message: 'enabled field must be a boolean value',
        },
      });
    }

    // Map feature IDs to configuration fields
    const featureFieldMap: Record<string, string> = {
      'without-driver-listings': 'withoutDriverListings',
      'hourly-bookings': 'hourlyBookings',
      'recurring-bookings': 'recurringBookings',
      'instant-booking': 'instantBooking',
      'auto-approval': 'autoApprovalEnabled',
      'maintenance-mode': 'maintenanceMode',
    };

    const configField = featureFieldMap[featureId];
    if (!configField) {
      return res.status(404).json({
        error: {
          code: 'FEATURE_NOT_FOUND',
          message: `Feature '${featureId}' not found`,
        },
      });
    }

    // Update the configuration
    const updateData = {
      [configField]: enabled,
      reason: reason || `Updated feature: ${featureId}`,
    };

    const updatedConfig = await platformConfigService.updateConfiguration(
      updateData,
      req.user!.userId
    );

    res.json({
      message: 'Feature updated successfully',
      featureId,
      enabled,
      configVersion: updatedConfig.version,
      updatedBy: req.user!.userId,
      reason: updateData.reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating feature configuration',
      },
    });
  }
});

/**
 * Bulk update multiple features
 * POST /api/platform-admin/config/features/bulk-update
 */
router.post('/config/features/bulk-update', async (req: Request, res: Response) => {
  try {
    const { features, reason } = req.body;

    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FEATURES_ARRAY',
          message: 'features array is required and must not be empty',
        },
      });
    }

    // Validate feature updates
    const featureFieldMap: Record<string, string> = {
      'without-driver-listings': 'withoutDriverListings',
      'hourly-bookings': 'hourlyBookings',
      'recurring-bookings': 'recurringBookings',
      'instant-booking': 'instantBooking',
      'auto-approval': 'autoApprovalEnabled',
      'maintenance-mode': 'maintenanceMode',
    };

    const updateData: Record<string, any> = {
      reason: reason || 'Bulk feature update',
    };

    const updatedFeatures: Array<{ featureId: string; enabled: boolean }> = [];

    for (const feature of features) {
      const { featureId, enabled } = feature;

      if (!featureId || typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: {
            code: 'INVALID_FEATURE_DATA',
            message: 'Each feature must have featureId (string) and enabled (boolean)',
          },
        });
      }

      const configField = featureFieldMap[featureId];
      if (!configField) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FEATURE_ID',
            message: `Invalid feature ID: ${featureId}`,
          },
        });
      }

      updateData[configField] = enabled;
      updatedFeatures.push({ featureId, enabled });
    }

    // Perform bulk update
    const updatedConfig = await platformConfigService.updateConfiguration(
      updateData,
      req.user!.userId
    );

    res.json({
      message: 'Bulk feature update completed successfully',
      updatedFeatures,
      configVersion: updatedConfig.version,
      updatedBy: req.user!.userId,
      reason: updateData.reason,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while performing bulk feature update',
      },
    });
  }
});

/**
 * Get feature configuration history
 * GET /api/platform-admin/config/features/history
 */
router.get('/config/features/history', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, featureId } = req.query;

    const config = await platformConfigService.getConfiguration();
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'NO_CONFIGURATION_FOUND',
          message: 'No active platform configuration found',
        },
      });
    }

    // For now, return a simple history response since we don't have complex history tracking yet
    // This can be enhanced later when the configuration history service is fully implemented
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 20;

    // Create a simple history entry for the current configuration
    const simpleHistory = [
      {
        id: config.id,
        version: config.version,
        changeType: 'FEATURE_TOGGLE',
        changes: {
          withoutDriverListings: config.withoutDriverListings,
          hourlyBookings: config.hourlyBookings,
          recurringBookings: config.recurringBookings,
          instantBooking: config.instantBooking,
          autoApprovalEnabled: config.autoApprovalEnabled,
          maintenanceMode: config.maintenanceMode,
        },
        reason: 'Current configuration state',
        changedBy: config.activatedBy || 'system',
        createdAt: config.updatedAt,
        rollbackTo: null,
      }
    ];

    res.json({
      history: simpleHistory,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
      configId: config.id,
      currentVersion: config.version,
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching feature configuration history',
      },
    });
  }
});

/**
 * Emergency disable a feature
 * POST /api/platform-admin/config/features/:featureId/emergency-disable
 */
router.post('/config/features/:featureId/emergency-disable', async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const { reason, severity = 'high' } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Emergency disable reason is required',
        },
      });
    }

    // Map feature IDs to FeatureToggle enum
    const featureMap: Record<string, FeatureToggle> = {
      'without-driver-listings': FeatureToggle.WITHOUT_DRIVER_LISTINGS,
      'hourly-bookings': FeatureToggle.HOURLY_BOOKINGS,
      'recurring-bookings': FeatureToggle.RECURRING_BOOKINGS,
      'instant-booking': FeatureToggle.INSTANT_BOOKING,
      'auto-approval': FeatureToggle.AUTO_APPROVAL,
      'maintenance-mode': FeatureToggle.MAINTENANCE_MODE,
    };

    const feature = featureMap[featureId];
    if (!feature) {
      return res.status(404).json({
        error: {
          code: 'FEATURE_NOT_FOUND',
          message: `Feature '${featureId}' not found`,
        },
      });
    }

    await featureRollbackService.emergencyDisableFeature({
      feature,
      reason,
      adminUserId: req.user!.userId,
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
    });

    res.json({
      message: 'Feature emergency disabled successfully',
      featureId,
      feature,
      reason,
      severity,
      disabledBy: req.user!.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'EMERGENCY_DISABLE_FAILED',
        message: 'Failed to emergency disable feature',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * Emergency disable multiple features
 * POST /api/platform-admin/config/features/emergency-disable-multiple
 */
router.post('/config/features/emergency-disable-multiple', async (req: Request, res: Response) => {
  try {
    const { featureIds, reason, severity = 'high' } = req.body;

    if (!featureIds || !Array.isArray(featureIds) || featureIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FEATURE_IDS',
          message: 'featureIds array is required and must not be empty',
        },
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Emergency disable reason is required',
        },
      });
    }

    // Map feature IDs to FeatureToggle enum
    const featureMap: Record<string, FeatureToggle> = {
      'without-driver-listings': FeatureToggle.WITHOUT_DRIVER_LISTINGS,
      'hourly-bookings': FeatureToggle.HOURLY_BOOKINGS,
      'recurring-bookings': FeatureToggle.RECURRING_BOOKINGS,
      'instant-booking': FeatureToggle.INSTANT_BOOKING,
      'auto-approval': FeatureToggle.AUTO_APPROVAL,
      'maintenance-mode': FeatureToggle.MAINTENANCE_MODE,
    };

    const features: FeatureToggle[] = [];
    for (const featureId of featureIds) {
      const feature = featureMap[featureId];
      if (!feature) {
        return res.status(400).json({
          error: {
            code: 'INVALID_FEATURE_ID',
            message: `Invalid feature ID: ${featureId}`,
          },
        });
      }
      features.push(feature);
    }

    await featureRollbackService.emergencyDisableMultipleFeatures(
      features,
      reason,
      req.user!.userId,
      severity as 'low' | 'medium' | 'high' | 'critical'
    );

    res.json({
      message: 'Multiple features emergency disabled successfully',
      featureIds,
      features,
      reason,
      severity,
      disabledBy: req.user!.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'EMERGENCY_DISABLE_FAILED',
        message: 'Failed to emergency disable multiple features',
        details: (error as Error).message,
      },
    });
  }
});

/**
 * Rollback feature configuration
 * POST /api/platform-admin/config/features/rollback
 */
router.post('/config/features/rollback', async (req: Request, res: Response) => {
  try {
    const { targetConfigId, reason, features } = req.body;

    if (!targetConfigId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TARGET_CONFIG',
          message: 'targetConfigId is required for rollback',
        },
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REASON',
          message: 'Rollback reason is required',
        },
      });
    }

    // Check rollback safety first
    const safetyCheck = await featureRollbackService.isRollbackSafe(targetConfigId, features);
    if (!safetyCheck.safe) {
      return res.status(400).json({
        error: {
          code: 'UNSAFE_ROLLBACK',
          message: 'Rollback is not safe',
          blockingIssues: safetyCheck.blockingIssues,
          warnings: safetyCheck.warnings,
        },
      });
    }

    const result = await featureRollbackService.rollbackToVersion({
      targetConfigId,
      reason,
      adminUserId: req.user!.userId,
      features,
    });

    res.json({
      message: 'Rollback completed successfully',
      result,
      performedBy: req.user!.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'ROLLBACK_FAILED',
        message: 'Failed to rollback configuration',
        details: (error as Error).message,
      },
    });
  }
});

// ===== USER MANAGEMENT ENDPOINTS =====
// User management routes are now handled by dedicated user-management.routes.ts
// mounted at /api/platform-admin/users

// ===== GEOGRAPHIC RESTRICTIONS =====

/**
 * Get geographic restrictions
 * GET /api/platform-admin/config/geographic-restrictions
 */
router.get('/config/geographic-restrictions', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const query = {
      region: req.query.region as string,
      regionType: req.query.regionType as any,
      restrictionType: req.query.restrictionType as any,
      isBlocked: req.query.isBlocked ? req.query.isBlocked === 'true' : undefined
    };

    const restrictions = await geographicRestrictionService.getRestrictions(config.id, query);
    
    res.json({
      restrictions,
      total: restrictions.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching geographic restrictions',
      },
    });
  }
});

/**
 * Create geographic restriction
 * POST /api/platform-admin/config/geographic-restrictions
 */
router.post('/config/geographic-restrictions', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { restrictionType, region, regionType, isBlocked, reason } = req.body;

    if (!restrictionType || !region || !regionType) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'restrictionType, region, and regionType are required',
        },
      });
    }

    const restriction = await geographicRestrictionService.createRestriction(config.id, {
      restrictionType,
      region,
      regionType,
      isBlocked: isBlocked ?? true,
      reason
    });

    res.status(201).json({ restriction });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating geographic restriction',
      },
    });
  }
});

/**
 * Update geographic restriction
 * PUT /api/platform-admin/config/geographic-restrictions/:id
 */
router.put('/config/geographic-restrictions/:id', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const { id } = req.params;
    const updateData = req.body;

    const restriction = await geographicRestrictionService.updateRestriction(id, updateData);

    res.json({ restriction });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating geographic restriction',
      },
    });
  }
});

/**
 * Delete geographic restriction
 * DELETE /api/platform-admin/config/geographic-restrictions/:id
 */
router.delete('/config/geographic-restrictions/:id', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const { id } = req.params;

    await geographicRestrictionService.deleteRestriction(id);

    res.json({ message: 'Geographic restriction deleted successfully' });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting geographic restriction',
      },
    });
  }
});

/**
 * Bulk create geographic restrictions
 * POST /api/platform-admin/config/geographic-restrictions/bulk
 */
router.post('/config/geographic-restrictions/bulk', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { restrictions } = req.body;

    if (!Array.isArray(restrictions) || restrictions.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'restrictions array is required and must not be empty',
        },
      });
    }

    const createdRestrictions = await geographicRestrictionService.bulkCreateRestrictions(
      config.id,
      restrictions
    );

    res.status(201).json({ 
      restrictions: createdRestrictions,
      total: createdRestrictions.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while bulk creating geographic restrictions',
      },
    });
  }
});

/**
 * Get geographic restriction statistics
 * GET /api/platform-admin/config/geographic-restrictions/stats
 */
router.get('/config/geographic-restrictions/stats', async (req: Request, res: Response) => {
  try {
    const { geographicRestrictionService } = await import('../services/geographic-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const stats = await geographicRestrictionService.getRestrictionStats(config.id);

    res.json({ stats });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching geographic restriction statistics',
      },
    });
  }
});

// ===== PAYMENT METHOD RESTRICTIONS =====

/**
 * Get payment method configurations
 * GET /api/platform-admin/config/payment-methods
 */
router.get('/config/payment-methods', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const query = {
      paymentMethod: req.query.paymentMethod as any,
      enabled: req.query.enabled ? req.query.enabled === 'true' : undefined,
      region: req.query.region as string
    };

    const configs = await paymentMethodRestrictionService.getPaymentMethodConfigs(config.id, query);
    
    res.json({
      paymentMethods: configs,
      total: configs.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching payment method configurations',
      },
    });
  }
});

/**
 * Create payment method configuration
 * POST /api/platform-admin/config/payment-methods
 */
router.post('/config/payment-methods', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const configData = req.body;

    // Validate the configuration
    const validationErrors = paymentMethodRestrictionService.validatePaymentMethodConfig(configData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment method configuration',
          details: validationErrors
        },
      });
    }

    const paymentMethodConfig = await paymentMethodRestrictionService.createPaymentMethodConfig(
      config.id,
      configData
    );

    res.status(201).json({ paymentMethodConfig });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating payment method configuration',
      },
    });
  }
});

/**
 * Update payment method configuration
 * PUT /api/platform-admin/config/payment-methods/:paymentMethod
 */
router.put('/config/payment-methods/:paymentMethod', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { paymentMethod } = req.params;
    const updateData = req.body;

    const updatedConfig = await paymentMethodRestrictionService.updatePaymentMethodConfig(
      config.id,
      paymentMethod as any,
      updateData
    );

    res.json({ paymentMethodConfig: updatedConfig });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating payment method configuration',
      },
    });
  }
});

/**
 * Delete payment method configuration
 * DELETE /api/platform-admin/config/payment-methods/:paymentMethod
 */
router.delete('/config/payment-methods/:paymentMethod', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { paymentMethod } = req.params;

    await paymentMethodRestrictionService.deletePaymentMethodConfig(
      config.id,
      paymentMethod as any
    );

    res.json({ message: 'Payment method configuration deleted successfully' });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting payment method configuration',
      },
    });
  }
});

/**
 * Bulk update payment method configurations
 * PUT /api/platform-admin/config/payment-methods/bulk
 */
router.put('/config/payment-methods/bulk', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'updates array is required and must not be empty',
        },
      });
    }

    const updatedConfigs = await paymentMethodRestrictionService.bulkUpdatePaymentMethods(
      config.id,
      updates
    );

    res.json({ 
      paymentMethodConfigs: updatedConfigs,
      total: updatedConfigs.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while bulk updating payment method configurations',
      },
    });
  }
});

/**
 * Update region support for payment method
 * PUT /api/platform-admin/config/payment-methods/:paymentMethod/regions
 */
router.put('/config/payment-methods/:paymentMethod/regions', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { paymentMethod } = req.params;
    const { regionsToAdd = [], regionsToRemove = [] } = req.body;

    const updatedConfig = await paymentMethodRestrictionService.updateRegionSupport(
      config.id,
      paymentMethod as any,
      regionsToAdd,
      regionsToRemove
    );

    res.json({ paymentMethodConfig: updatedConfig });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating region support',
      },
    });
  }
});

/**
 * Get payment method statistics
 * GET /api/platform-admin/config/payment-methods/stats
 */
router.get('/config/payment-methods/stats', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const stats = await paymentMethodRestrictionService.getPaymentMethodStats(config.id);

    res.json({ stats });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching payment method statistics',
      },
    });
  }
});

/**
 * Check payment method availability for region and amount
 * POST /api/platform-admin/config/payment-methods/check-availability
 */
router.post('/config/payment-methods/check-availability', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { paymentMethod, region, amount } = req.body;

    if (!paymentMethod || !region) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'paymentMethod and region are required',
        },
      });
    }

    const availability = await paymentMethodRestrictionService.isPaymentMethodAvailable(
      config.id,
      paymentMethod,
      region,
      amount
    );

    let processingFee: number | undefined;
    if (availability.allowed && amount) {
      processingFee = await paymentMethodRestrictionService.calculateProcessingFee(
        config.id,
        paymentMethod,
        amount
      );
    }

    res.json({ 
      ...availability,
      processingFee
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking payment method availability',
      },
    });
  }
});

/**
 * Get available payment methods for region
 * GET /api/platform-admin/config/payment-methods/available/:region
 */
router.get('/config/payment-methods/available/:region', async (req: Request, res: Response) => {
  try {
    const { paymentMethodRestrictionService } = await import('../services/payment-method-restriction.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { region } = req.params;
    const amount = req.query.amount ? parseFloat(req.query.amount as string) : undefined;

    const availableMethods = await paymentMethodRestrictionService.getAvailableMethodsForRegion(
      config.id,
      region,
      amount
    );

    res.json({ 
      region,
      amount,
      availableMethods
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching available payment methods',
      },
    });
  }
});

// ===== REGION-SPECIFIC CONFIGURATION =====

/**
 * Get region-specific configurations
 * GET /api/platform-admin/config/regions
 */
router.get('/config/regions', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const query = {
      region: req.query.region as string,
      regionType: req.query.regionType as any,
      enabled: req.query.enabled ? req.query.enabled === 'true' : undefined
    };

    const regionConfigs = await regionSpecificConfigService.getRegionConfigs(config.id, query);
    
    res.json({
      regionConfigs,
      total: regionConfigs.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching region-specific configurations',
      },
    });
  }
});

/**
 * Create region-specific configuration
 * POST /api/platform-admin/config/regions
 */
router.post('/config/regions', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const configData = req.body;

    // Validate the configuration
    const validationErrors = regionSpecificConfigService.validateRegionConfig(configData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid region-specific configuration',
          details: validationErrors
        },
      });
    }

    const regionConfig = await regionSpecificConfigService.createRegionConfig(config.id, configData);

    res.status(201).json({ regionConfig });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating region-specific configuration',
      },
    });
  }
});

/**
 * Update region-specific configuration
 * PUT /api/platform-admin/config/regions/:id
 */
router.put('/config/regions/:id', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const regionConfig = await regionSpecificConfigService.updateRegionConfig(config.id, id, updateData);

    res.json({ regionConfig });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating region-specific configuration',
      },
    });
  }
});

/**
 * Delete region-specific configuration
 * DELETE /api/platform-admin/config/regions/:id
 */
router.delete('/config/regions/:id', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { id } = req.params;

    await regionSpecificConfigService.deleteRegionConfig(config.id, id);

    res.json({ message: 'Region-specific configuration deleted successfully' });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting region-specific configuration',
      },
    });
  }
});

/**
 * Get effective feature configuration for a region
 * GET /api/platform-admin/config/regions/:region/effective
 */
router.get('/config/regions/:region/effective', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { region } = req.params;
    const regionType = req.query.regionType as any || 'COUNTRY';

    // Get global configuration
    const globalConfig = {
      withoutDriverListings: config.withoutDriverListings,
      hourlyBookings: config.hourlyBookings,
      recurringBookings: config.recurringBookings,
      instantBooking: config.instantBooking,
      autoApprovalEnabled: config.autoApprovalEnabled,
      maintenanceMode: config.maintenanceMode
    };

    const effectiveConfig = await regionSpecificConfigService.getEffectiveFeatureConfig(
      config.id,
      region,
      regionType,
      globalConfig
    );

    res.json({ 
      region,
      regionType,
      effectiveConfig
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching effective configuration',
      },
    });
  }
});

/**
 * Check feature availability for a region
 * GET /api/platform-admin/config/regions/:region/features/:feature
 */
router.get('/config/regions/:region/features/:feature', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { region, feature } = req.params;
    const regionType = req.query.regionType as any || 'COUNTRY';

    // Get global value for the feature
    const globalValue = (config as any)[feature];
    if (globalValue === undefined) {
      return res.status(404).json({
        error: {
          code: 'FEATURE_NOT_FOUND',
          message: `Feature '${feature}' not found`,
        },
      });
    }

    const availability = await regionSpecificConfigService.isFeatureAvailableInRegion(
      config.id,
      feature,
      region,
      regionType,
      globalValue
    );

    res.json({ availability });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking feature availability',
      },
    });
  }
});

/**
 * Bulk create region-specific configurations
 * POST /api/platform-admin/config/regions/bulk
 */
router.post('/config/regions/bulk', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'configs array is required and must not be empty',
        },
      });
    }

    const createdConfigs = await regionSpecificConfigService.bulkCreateRegionConfigs(config.id, configs);

    res.status(201).json({ 
      regionConfigs: createdConfigs,
      total: createdConfigs.length
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while bulk creating region configurations',
      },
    });
  }
});

/**
 * Get region configuration statistics
 * GET /api/platform-admin/config/regions/stats
 */
router.get('/config/regions/stats', async (req: Request, res: Response) => {
  try {
    const { regionSpecificConfigService } = await import('../services/region-specific-config.service');
    const config = await platformConfigService.getConfiguration();
    
    if (!config) {
      return res.status(404).json({
        error: {
          code: 'CONFIGURATION_NOT_FOUND',
          message: 'Platform configuration not found',
        },
      });
    }

    const stats = await regionSpecificConfigService.getRegionConfigStats(config.id);

    res.json({ stats });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching region configuration statistics',
      },
    });
  }
});

// ===== RESTRICTION MONITORING =====

/**
 * Get restriction violations
 * GET /api/platform-admin/monitoring/violations
 */
router.get('/monitoring/violations', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const query = {
      type: req.query.type as any,
      userId: req.query.userId as string,
      region: req.query.region as string,
      restrictionType: req.query.restrictionType as any,
      paymentMethod: req.query.paymentMethod as any,
      blocked: req.query.blocked ? req.query.blocked === 'true' : undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const result = await restrictionMonitoringService.getViolations(query);
    
    res.json(result);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching restriction violations',
      },
    });
  }
});

/**
 * Get restriction violation statistics
 * GET /api/platform-admin/monitoring/violations/stats
 */
router.get('/monitoring/violations/stats', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await restrictionMonitoringService.getViolationStats(startDate, endDate);
    
    res.json({ stats });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching violation statistics',
      },
    });
  }
});

/**
 * Export restriction violations
 * GET /api/platform-admin/monitoring/violations/export
 */
router.get('/monitoring/violations/export', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const query = {
      type: req.query.type as any,
      userId: req.query.userId as string,
      region: req.query.region as string,
      restrictionType: req.query.restrictionType as any,
      paymentMethod: req.query.paymentMethod as any,
      blocked: req.query.blocked ? req.query.blocked === 'true' : undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const csvData = await restrictionMonitoringService.exportViolations(query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="restriction-violations.csv"');
    res.send(csvData);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while exporting violations',
      },
    });
  }
});

/**
 * Get alert rules
 * GET /api/platform-admin/monitoring/alert-rules
 */
router.get('/monitoring/alert-rules', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const alertRules = await restrictionMonitoringService.getAlertRules();
    
    res.json({ alertRules });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching alert rules',
      },
    });
  }
});

/**
 * Create alert rule
 * POST /api/platform-admin/monitoring/alert-rules
 */
router.post('/monitoring/alert-rules', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const ruleData = req.body;

    if (!ruleData.name || !ruleData.conditions) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'name and conditions are required',
        },
      });
    }

    const alertRule = await restrictionMonitoringService.createAlertRule(ruleData);
    
    res.status(201).json({ alertRule });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating alert rule',
      },
    });
  }
});

/**
 * Update alert rule
 * PUT /api/platform-admin/monitoring/alert-rules/:id
 */
router.put('/monitoring/alert-rules/:id', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const { id } = req.params;
    const updateData = req.body;

    const alertRule = await restrictionMonitoringService.updateAlertRule(id, updateData);
    
    res.json({ alertRule });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating alert rule',
      },
    });
  }
});

/**
 * Delete alert rule
 * DELETE /api/platform-admin/monitoring/alert-rules/:id
 */
router.delete('/monitoring/alert-rules/:id', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const { id } = req.params;

    await restrictionMonitoringService.deleteAlertRule(id);
    
    res.json({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting alert rule',
      },
    });
  }
});

/**
 * Cleanup old violations
 * POST /api/platform-admin/monitoring/cleanup
 */
router.post('/monitoring/cleanup', async (req: Request, res: Response) => {
  try {
    const { restrictionMonitoringService } = await import('../services/restriction-monitoring.service');
    
    const { olderThanDays = 30 } = req.body;

    const removedCount = await restrictionMonitoringService.cleanupOldViolations(olderThanDays);
    
    res.json({ 
      message: 'Cleanup completed successfully',
      removedCount
    });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while cleaning up violations',
      },
    });
  }
});

// Mount analytics routes
router.use('/analytics', analyticsRoutes);

// Mount platform configuration routes
router.use('/system', platformConfigRoutes);

// Mount global platform admin routes
router.use('/', platformAdminGlobalRoutes);

export default router;