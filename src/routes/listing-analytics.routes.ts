/**
 * Listing Analytics Routes
 * API endpoints for vehicle and driver listing performance metrics and analytics
 */

import { Router, Request, Response } from 'express';
import { listingAnalyticsService } from '../services/listing-analytics.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthorizationService } from '../services/authorization.service';
import { logError } from '../utils/logging.utils';
import { PrismaClient } from '@prisma/client';

const router = Router();
const authorizationService = new AuthorizationService();
const prisma = new PrismaClient();

// Helper function to get user with company
async function getUserWithCompany(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true },
  });
}

/**
 * GET /api/listings/analytics/performance/:listingId
 * Get performance metrics for a specific listing
 */
router.get('/performance/:listingId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { listingId } = req.params;
    const { type, startDate, endDate } = req.query;

    // Validate listing type
    if (!type || (type !== 'vehicle' && type !== 'driver')) {
      res.status(400).json({
        error: {
          code: 'INVALID_LISTING_TYPE',
          message: 'Listing type must be either "vehicle" or "driver"',
        },
      });
      return;
    }

    // Check if user has access to this listing
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    // Verify listing belongs to user's company
    const listingTable = type === 'vehicle' ? 'vehicleListing' : 'driverListing';
    const listing = await (prisma as any)[listingTable].findUnique({
      where: { id: listingId },
      select: { companyId: true },
    });

    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found',
        },
      });
      return;
    }

    if (listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only view analytics for your own company listings',
        },
      });
      return;
    }

    // Parse date parameters
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get performance metrics
    const metrics = await listingAnalyticsService.getListingPerformanceMetrics(
      listingId,
      type as 'vehicle' | 'driver',
      start,
      end
    );

    res.status(200).json(metrics);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch listing performance metrics',
      },
    });
  }
});

/**
 * GET /api/listings/analytics/detailed/:listingId
 * Get comprehensive analytics including trends for a specific listing
 */
router.get('/detailed/:listingId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { listingId } = req.params;
    const { type, startDate, endDate } = req.query;

    // Validate listing type
    if (!type || (type !== 'vehicle' && type !== 'driver')) {
      res.status(400).json({
        error: {
          code: 'INVALID_LISTING_TYPE',
          message: 'Listing type must be either "vehicle" or "driver"',
        },
      });
      return;
    }

    // Check if user has access to this listing
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    // Verify listing belongs to user's company
    const listingTable = type === 'vehicle' ? 'vehicleListing' : 'driverListing';
    const listing = await (prisma as any)[listingTable].findUnique({
      where: { id: listingId },
      select: { companyId: true },
    });

    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found',
        },
      });
      return;
    }

    if (listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only view analytics for your own company listings',
        },
      });
      return;
    }

    // Parse date parameters
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get detailed analytics
    const analytics = await listingAnalyticsService.getListingAnalytics(
      listingId,
      type as 'vehicle' | 'driver',
      start,
      end
    );

    res.status(200).json(analytics);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch listing analytics',
      },
    });
  }
});

/**
 * GET /api/listings/analytics/company
 * Get performance metrics for all listings of the authenticated user's company
 */
router.get('/company', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { startDate, endDate } = req.query;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can view company-wide analytics',
        },
      });
      return;
    }

    // Get user's company
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    // Parse date parameters
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get company-wide performance metrics
    const performance = await listingAnalyticsService.getCompanyListingsPerformance(
      user.companyId,
      start,
      end
    );

    res.status(200).json(performance);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch company listings performance',
      },
    });
  }
});

export default router;