import { Router, Request, Response } from 'express';
import { gdprService } from '../services/gdpr.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';

const router = Router();

/**
 * Export user data
 * GET /api/gdpr/export
 * Requirement 20.1: GDPR data export
 */
router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await gdprService.exportUserData(userId);

    res.status(200).json({
      data: userData,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'EXPORT_FAILED',
        message: 'Failed to export user data',
      },
    });
  }
});

/**
 * Delete user account
 * DELETE /api/gdpr/account
 * Requirement 20.2, 20.5: GDPR data deletion
 */
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await gdprService.deleteUserAccount(userId);

    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (error.message === 'CANNOT_DELETE_SOLE_COMPANY_ADMIN') {
        return res.status(400).json({
          error: {
            code: 'CANNOT_DELETE_SOLE_COMPANY_ADMIN',
            message: 'Cannot delete the only admin of a company. Please assign another admin first.',
          },
        });
      }

      if (error.message === 'CANNOT_DELETE_USER_WITH_ACTIVE_BOOKINGS') {
        return res.status(400).json({
          error: {
            code: 'CANNOT_DELETE_USER_WITH_ACTIVE_BOOKINGS',
            message: 'Cannot delete account with active bookings. Please complete or cancel all bookings first.',
          },
        });
      }
    }

    res.status(500).json({
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete user account',
      },
    });
  }
});

/**
 * Get user audit log
 * GET /api/gdpr/audit-log
 * Requirement 20.4: User access to audit logs
 */
router.get('/audit-log', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const auditLogs = await gdprService.getUserAuditLog(userId);

    res.status(200).json({
      auditLogs,
    });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'AUDIT_LOG_FAILED',
        message: 'Failed to retrieve audit log',
      },
    });
  }
});

export default router;
