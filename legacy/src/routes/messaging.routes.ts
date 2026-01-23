import { Router, Request, Response } from 'express';
import { messagingService } from '../services/messaging.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';

const router = Router();

// All messaging routes require authentication
router.use(authenticate);

/**
 * GET /api/messages/threads
 * Get all message threads for the authenticated user
 */
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const threads = await messagingService.getUserThreads(userId);
    
    res.json(threads);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch message threads',
      },
    });
  }
});

/**
 * GET /api/messages/threads/:threadId
 * Get a specific thread with all messages
 */
router.get('/threads/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user!.userId;
    
    const thread = await messagingService.getThreadById(threadId);
    
    if (!thread) {
      return res.status(404).json({
        error: {
          code: 'THREAD_NOT_FOUND',
          message: 'Message thread not found',
        },
      });
    }
    
    // Verify user is a participant
    if (!thread.participants.includes(userId)) {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You are not a participant in this thread',
        },
      });
    }
    
    res.json(thread);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch thread',
      },
    });
  }
});

/**
 * GET /api/messages/bookings/:bookingId/thread
 * Get thread for a specific booking
 */
router.get('/bookings/:bookingId/thread', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user!.userId;
    
    const thread = await messagingService.getThreadByBookingId(bookingId);
    
    if (!thread) {
      return res.status(404).json({
        error: {
          code: 'THREAD_NOT_FOUND',
          message: 'Message thread not found for this booking',
        },
      });
    }
    
    // Verify user is a participant
    if (!thread.participants.includes(userId)) {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You are not a participant in this thread',
        },
      });
    }
    
    res.json(thread);
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch thread',
      },
    });
  }
});

/**
 * POST /api/messages/threads/:threadId/messages
 * Send a message in a thread
 */
router.post('/threads/:threadId/messages', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    const userId = req.user!.userId;
    
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Message content is required',
        },
      });
    }
    
    const message = await messagingService.sendMessage(threadId, userId, content);
    
    res.status(201).json(message);
  } catch (error) {
    const err = error as Error;
    logError({ error: err, request: req });
    
    if (err.message === 'THREAD_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'THREAD_NOT_FOUND',
          message: 'Message thread not found',
        },
      });
    }
    
    if (err.message === 'SENDER_NOT_PARTICIPANT') {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You are not a participant in this thread',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send message',
      },
    });
  }
});

/**
 * POST /api/messages/:messageId/read
 * Mark a message as read
 */
router.post('/:messageId/read', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.userId;
    
    await messagingService.markAsRead(messageId, userId);
    
    res.status(204).send();
  } catch (error) {
    const err = error as Error;
    logError({ error: err, request: req });
    
    if (err.message === 'MESSAGE_NOT_FOUND') {
      return res.status(404).json({
        error: {
          code: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
        },
      });
    }
    
    if (err.message === 'USER_NOT_PARTICIPANT') {
      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You are not a participant in this thread',
        },
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark message as read',
      },
    });
  }
});

/**
 * GET /api/messages/unread-count
 * Get unread message count for the authenticated user
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await messagingService.getUnreadCount(userId);
    
    res.json({ count });
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch unread count',
      },
    });
  }
});

export default router;
