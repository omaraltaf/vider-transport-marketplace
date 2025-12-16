/**
 * User Profile API Routes
 * Endpoints for user profile management
 */

import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * Get current user profile
 * GET /api/user/profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await userService.getUserProfile(userId);
    
    res.status(200).json(profile);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profile',
      },
    });
  }
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data = updateUserProfileSchema.parse(req.body);
    
    const updatedProfile = await userService.updateUserProfile(userId, data);
    
    res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update profile',
      },
    });
  }
});

/**
 * Change password
 * POST /api/user/change-password
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    await userService.changePassword(userId, currentPassword, newPassword);
    
    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
        },
      });
    }

    if (error instanceof Error) {
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return res.status(400).json({
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
          },
        });
      }
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to change password',
      },
    });
  }
});

/**
 * Delete user account
 * DELETE /api/user/account
 */
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    await userService.deleteUserAccount(userId);
    
    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_DELETE_COMPANY_ADMIN') {
      return res.status(400).json({
        error: {
          code: 'CANNOT_DELETE_COMPANY_ADMIN',
          message: 'Cannot delete account. You are the only admin for your company.',
        },
      });
    }

    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete account',
      },
    });
  }
});

/**
 * Get user statistics
 * GET /api/user/statistics
 */
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statistics = await userService.getUserStatistics(userId);
    
    res.status(200).json(statistics);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user statistics',
      },
    });
  }
});

export default router;