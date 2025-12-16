import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { authenticate, requireCompanyAdmin } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

// Simple in-memory cache for dashboard data
interface CacheEntry {
  data: any;
  timestamp: number;
}

const dashboardCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 30 * 1000; // 30 seconds

/**
 * Get cached dashboard data if available and not expired
 */
function getCachedData(companyId: string): any | null {
  const cached = dashboardCache.get(companyId);
  
  if (!cached) {
    return null;
  }

  const now = Date.now();
  const age = now - cached.timestamp;

  if (age > CACHE_DURATION_MS) {
    // Cache expired, remove it
    dashboardCache.delete(companyId);
    return null;
  }

  return cached.data;
}

/**
 * Store data in cache
 */
function setCachedData(companyId: string, data: any): void {
  dashboardCache.set(companyId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get complete dashboard data for authenticated company admin
 * GET /api/dashboard
 */
router.get(
  '/',
  authenticate,
  requireCompanyAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get user's company ID
      if (!req || !req.user) {
        logger.error('Request or user is undefined', { 
          hasReq: !!req, 
          hasUser: req ? !!req.user : false 
        });
        return res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authentication state error',
          },
        });
      }
      
      const userId = req.user.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user || !user.companyId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found or not associated with a company',
          },
        });
      }

      const companyId = user.companyId;

      // Check cache first
      const cachedData = getCachedData(companyId);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Fetch fresh data
      const dashboardData = await dashboardService.getDashboardData(companyId);

      // Cache the response
      setCachedData(companyId, dashboardData);

      res.json(dashboardData);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'COMPANY_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'COMPANY_NOT_FOUND',
            message: 'Company not found',
          },
        });
      }

      if (errorMessage === 'DASHBOARD_DATA_FETCH_FAILED') {
        return res.status(500).json({
          error: {
            code: 'DASHBOARD_DATA_FETCH_FAILED',
            message: 'Failed to fetch dashboard data',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching dashboard data',
        },
      });
    }
  }
);

export default router;
