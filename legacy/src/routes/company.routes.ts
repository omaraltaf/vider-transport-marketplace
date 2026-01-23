import { Router, Request, Response } from 'express';
import { companyService } from '../services/company.service';
import { authenticate } from '../middleware/auth.middleware';
import { authorizationService } from '../services/authorization.service';
import { logger } from '../config/logger';

// Role enum values
const COMPANY_ADMIN = 'COMPANY_ADMIN';
const PLATFORM_ADMIN = 'PLATFORM_ADMIN';

const router = Router();

/**
 * GET /api/companies/stats
 * Get platform statistics for landing page
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await companyService.getPlatformStats();
    res.status(200).json(stats);
  } catch (error: any) {
    logger.error('Error fetching platform stats', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch platform statistics',
      },
    });
  }
});

/**
 * GET /api/companies/:id
 * Get company public profile
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await companyService.getPublicProfile(id);

    res.status(200).json(profile);
  } catch (error: any) {
    logger.error('Error fetching company profile', { error: error.message, companyId: req.params.id });

    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch company profile',
      },
    });
  }
});

/**
 * PUT /api/companies/:id
 * Update company profile (requires authentication and company access)
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if user has access to this company
    const hasAccess = await authorizationService.checkCompanyAccess(userId, id);
    if (!hasAccess) {
      return res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You do not have access to update this company profile',
        },
      });
    }

    // Check if user has at least COMPANY_ADMIN role
    const hasRole = await authorizationService.checkRole(userId, COMPANY_ADMIN);
    if (!hasRole) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only company admins can update company profiles',
        },
      });
    }

    const updatedCompany = await companyService.updateProfile(id, req.body);

    res.status(200).json(updatedCompany);
  } catch (error: any) {
    logger.error('Error updating company profile', { error: error.message, companyId: req.params.id });

    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }

    if (error.message === 'NO_FIELDS_TO_UPDATE') {
      return res.status(400).json({
        error: {
          code: 'NO_FIELDS_TO_UPDATE',
          message: 'No fields provided to update',
        },
      });
    }

    if (error.message.includes('_REQUIRED')) {
      return res.status(400).json({
        error: {
          code: error.message,
          message: 'Required field is missing or empty',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update company profile',
      },
    });
  }
});

/**
 * POST /api/companies/:id/verify
 * Verify company (admin only)
 */
router.post('/:id/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if user is platform admin
    const isAdmin = await authorizationService.checkRole(userId, PLATFORM_ADMIN);
    if (!isAdmin) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only platform admins can verify companies',
        },
      });
    }

    const verifiedCompany = await companyService.verifyCompany(id, userId);

    res.status(200).json(verifiedCompany);
  } catch (error: any) {
    logger.error('Error verifying company', { error: error.message, companyId: req.params.id });

    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }

    if (error.message === 'COMPANY_ALREADY_VERIFIED') {
      return res.status(409).json({
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
 * DELETE /api/companies/:id/verify
 * Remove company verification (admin only)
 */
router.delete('/:id/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if user is platform admin
    const isAdmin = await authorizationService.checkRole(userId, PLATFORM_ADMIN);
    if (!isAdmin) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only platform admins can remove company verification',
        },
      });
    }

    const unverifiedCompany = await companyService.unverifyCompany(id, userId);

    res.status(200).json(unverifiedCompany);
  } catch (error: any) {
    logger.error('Error removing company verification', { error: error.message, companyId: req.params.id });

    if (error.message === 'COMPANY_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: 'Company not found',
        },
      });
    }

    if (error.message === 'COMPANY_NOT_VERIFIED') {
      return res.status(409).json({
        error: {
          code: 'COMPANY_NOT_VERIFIED',
          message: 'Company is not verified',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove company verification',
      },
    });
  }
});

export default router;
