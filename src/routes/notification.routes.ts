/**
 * Notification Routes
 * Handles notification preferences and in-app notifications
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { logError } from '../utils/logging.utils';

const router = Router();

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const preferences = await notificationService.getPreferences(userId);

    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        emailEnabled: true,
        inAppEnabled: true,
        bookingUpdates: true,
        messages: true,
        ratings: true,
        marketing: false,
      });
    }

    res.json(preferences);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notification preferences',
        requestId: req.id,
      },
    });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { emailEnabled, inAppEnabled, bookingUpdates, messages, ratings, marketing } = req.body;

    const preferences = await notificationService.updatePreferences(userId, {
      emailEnabled,
      inAppEnabled,
      bookingUpdates,
      messages,
      ratings,
      marketing,
    });

    res.json(preferences);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update notification preferences',
        requestId: req.id,
      },
    });
  }
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const notifications = await notificationService.getUserNotifications(userId, {
      unreadOnly,
      limit,
    });

    res.json(notifications);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
        requestId: req.id,
      },
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const count = await notificationService.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch unread count',
        requestId: req.id,
      },
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await notificationService.markAsRead(id);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOTIFICATION_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
          requestId: req.id,
        },
      });
    }

    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification as read',
        requestId: req.id,
      },
    });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await notificationService.markAllAsRead(userId);

    res.json({ success: true });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark all notifications as read',
        requestId: req.id,
      },
    });
  }
});

export default router;
