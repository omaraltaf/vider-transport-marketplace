import { Router, Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { authenticate } from '../middleware/auth.middleware';
import { authorizationService } from '../services/authorization.service';
import { logger } from '../config/logger';

const router = Router();

// All admin routes require authentication and PLATFORM_ADMIN role
router.use(authenticate);

// Middleware to check for PLATFORM_ADMIN role
const requirePlatformAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const isAdmin = await authorizationService.checkRole(userId, 'PLATFORM_ADMIN');
    
    if (!isAdmin) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Platform admin role required',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error checking admin role', { error, userId: (req as any).user?.userId });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error checking permissions',
      },
    });
  }
};

router.use(requirePlatformAdmin);

/**
 * Get platform configuration
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await adminService.getPlatformConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error getting platform config', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get platform configuration',
      },
    });
  }
});

/**
 * Update platform configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const config = await adminService.updatePlatformConfig(req.body, userId);
    res.json(config);
  } catch (error: any) {
    logger.error('Error updating platform config', { error });
    
    if (error.message?.includes('INVALID_')) {
      res.status(400).json({
        error: {
          code: error.message,
          message: 'Invalid configuration value',
        },
      });
      return;
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update platform configuration',
      },
    });
  }
});

/**
 * Search users
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchUsers({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching users', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search users',
      },
    });
  }
});

/**
 * Search companies
 */
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchCompanies({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching companies', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search companies',
      },
    });
  }
});

/**
 * Verify a company
 */
router.post('/companies/:id/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const company = await adminService.verifyCompany(req.params.id, userId);
    res.json(company);
  } catch (error: any) {
    logger.error('Error verifying company', { error, companyId: req.params.id });
    
    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }
    
    if (error.message === 'COMPANY_ALREADY_VERIFIED') {
      return res.status(400).json({
        error: {
          code: 'COMPANY_ALREADY_VERIFIED',
          message: 'Company is already verified',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify company',
      },
    });
  }
});

/**
 * Search vehicle listings
 */
router.get('/listings/vehicles', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchVehicleListings({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching vehicle listings', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search vehicle listings',
      },
    });
  }
});

/**
 * Search driver listings
 */
router.get('/listings/drivers', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchDriverListings({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching driver listings', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search driver listings',
      },
    });
  }
});

/**
 * Verify a driver listing
 */
router.post('/listings/drivers/:id/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const driver = await adminService.verifyDriver(req.params.id, userId);
    res.json(driver);
  } catch (error: any) {
    logger.error('Error verifying driver', { error, driverId: req.params.id });
    
    if (error.message === 'DRIVER_LISTING_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'DRIVER_LISTING_NOT_FOUND',
          message: 'Driver listing not found',
        },
      });
    }
    
    if (error.message === 'LICENSE_DOCUMENT_REQUIRED_FOR_VERIFICATION') {
      return res.status(400).json({
        error: {
          code: 'LICENSE_DOCUMENT_REQUIRED',
          message: 'License document is required for verification',
        },
      });
    }
    
    if (error.message === 'DRIVER_ALREADY_VERIFIED') {
      return res.status(400).json({
        error: {
          code: 'DRIVER_ALREADY_VERIFIED',
          message: 'Driver is already verified',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify driver',
      },
    });
  }
});

/**
 * Suspend a listing
 */
router.post('/listings/:type/:id/suspend', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { type, id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'REASON_REQUIRED',
          message: 'Reason is required for suspension',
        },
      });
    }
    
    if (type !== 'vehicle' && type !== 'driver') {
      return res.status(400).json({
        error: {
          code: 'INVALID_LISTING_TYPE',
          message: 'Listing type must be "vehicle" or "driver"',
        },
      });
    }
    
    const listing = await adminService.suspendListing(id, type as 'vehicle' | 'driver', reason, userId);
    res.json(listing);
  } catch (error: any) {
    logger.error('Error suspending listing', { error, listingId: req.params.id });
    
    if (error.message === 'LISTING_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found',
        },
      });
    }
    
    if (error.message === 'LISTING_ALREADY_SUSPENDED') {
      return res.status(400).json({
        error: {
          code: 'LISTING_ALREADY_SUSPENDED',
          message: 'Listing is already suspended',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to suspend listing',
      },
    });
  }
});

/**
 * Remove a listing
 */
router.delete('/listings/:type/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { type, id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        error: {
          code: 'REASON_REQUIRED',
          message: 'Reason is required for removal',
        },
      });
    }
    
    if (type !== 'vehicle' && type !== 'driver') {
      return res.status(400).json({
        error: {
          code: 'INVALID_LISTING_TYPE',
          message: 'Listing type must be "vehicle" or "driver"',
        },
      });
    }
    
    await adminService.removeListing(id, type as 'vehicle' | 'driver', reason, userId);
    res.status(204).send();
  } catch (error: any) {
    logger.error('Error removing listing', { error, listingId: req.params.id });
    
    if (error.message === 'LISTING_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found',
        },
      });
    }
    
    if (error.message === 'CANNOT_REMOVE_LISTING_WITH_ACTIVE_BOOKINGS') {
      return res.status(400).json({
        error: {
          code: 'ACTIVE_BOOKINGS_EXIST',
          message: 'Cannot remove listing with active bookings',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove listing',
      },
    });
  }
});

/**
 * Search bookings
 */
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchBookings({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching bookings', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search bookings',
      },
    });
  }
});

/**
 * Search disputes
 */
router.get('/disputes', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchDisputes({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching disputes', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search disputes',
      },
    });
  }
});

/**
 * Get a single dispute
 */
router.get('/disputes/:id', async (req: Request, res: Response) => {
  try {
    const dispute = await adminService.getDispute(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute not found',
        },
      });
    }
    
    res.json(dispute);
  } catch (error) {
    logger.error('Error getting dispute', { error, disputeId: req.params.id });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dispute',
      },
    });
  }
});

/**
 * Resolve a dispute
 */
router.post('/disputes/:id/resolve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const dispute = await adminService.resolveDispute(req.params.id, req.body, userId);
    res.json(dispute);
  } catch (error: any) {
    logger.error('Error resolving dispute', { error, disputeId: req.params.id });
    
    if (error.message === 'DISPUTE_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'DISPUTE_NOT_FOUND',
          message: 'Dispute not found',
        },
      });
    }
    
    if (error.message === 'DISPUTE_ALREADY_RESOLVED') {
      return res.status(400).json({
        error: {
          code: 'DISPUTE_ALREADY_RESOLVED',
          message: 'Dispute is already resolved',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to resolve dispute',
      },
    });
  }
});

/**
 * Search transactions
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { query, page, pageSize } = req.query;
    const result = await adminService.searchTransactions({
      query: query as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching transactions', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search transactions',
      },
    });
  }
});

/**
 * Get analytics report
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const analytics = await adminService.getAnalytics(start, end);
    res.json(analytics);
  } catch (error) {
    logger.error('Error getting analytics', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get analytics',
      },
    });
  }
});

/**
 * Get transaction report
 */
router.get('/reports/transactions', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId, transactionType, page, pageSize } = req.query;
    
    const result = await adminService.getTransactionReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      companyId: companyId as string,
      transactionType: transactionType as any,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting transaction report', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get transaction report',
      },
    });
  }
});

/**
 * Get audit log
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const { adminUserId, entityType, entityId, action, startDate, endDate, page, pageSize } = req.query;
    
    const result = await adminService.getAuditLog({
      adminUserId: adminUserId as string,
      entityType: entityType as string,
      entityId: entityId as string,
      action: action as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting audit log', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get audit log',
      },
    });
  }
});

export default router;
