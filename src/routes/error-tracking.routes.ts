import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/errors/track
 * Track frontend errors
 */
router.post('/track', (req: Request, res: Response) => {
  try {
    const { error, context, userAgent, url, timestamp } = req.body;
    
    // Log the frontend error
    logger.error('Frontend error tracked', {
      error,
      context,
      userAgent,
      url,
      timestamp,
      ip: req.ip,
    });

    res.status(200).json({ message: 'Error tracked successfully' });
  } catch (error) {
    logger.error('Failed to track frontend error', { error });
    res.status(500).json({ error: 'Failed to track error' });
  }
});

export default router;