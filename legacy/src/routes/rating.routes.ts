import { Router, Request, Response } from 'express';
import { ratingService } from '../services/rating.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';

const router = Router();

/**
 * POST /api/ratings
 * Submit a rating for a completed booking
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, companyStars, companyReview, driverStars, driverReview } = req.body;
    const companyId = req.user!.companyId;

    if (!bookingId) {
      res.status(400).json({
        error: {
          code: 'MISSING_BOOKING_ID',
          message: 'Booking ID is required',
          requestId: 'rating-submit',
        },
      });
      return;
    }

    if (!companyStars) {
      res.status(400).json({
        error: {
          code: 'MISSING_COMPANY_STARS',
          message: 'Company rating is required',
          requestId: 'rating-submit',
        },
      });
      return;
    }

    const rating = await ratingService.submitRating(bookingId, companyId, {
      companyStars,
      companyReview,
      driverStars,
      driverReview,
    });

    res.status(201).json(rating);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    if (error instanceof Error) {
      if (error.message === 'BOOKING_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'UNAUTHORIZED') {
        res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to rate this booking',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'BOOKING_NOT_COMPLETED') {
        res.status(400).json({
          error: {
            code: 'BOOKING_NOT_COMPLETED',
            message: 'Booking must be completed before rating',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'RATING_ALREADY_EXISTS') {
        res.status(409).json({
          error: {
            code: 'RATING_ALREADY_EXISTS',
            message: 'Rating already exists for this booking',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'INVALID_COMPANY_RATING_RANGE' || error.message === 'INVALID_DRIVER_RATING_RANGE') {
        res.status(400).json({
          error: {
            code: 'INVALID_RATING_RANGE',
            message: 'Rating must be between 1 and 5 stars',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'COMPANY_STARS_MUST_BE_INTEGER' || error.message === 'DRIVER_STARS_MUST_BE_INTEGER') {
        res.status(400).json({
          error: {
            code: 'INVALID_RATING_VALUE',
            message: 'Rating must be an integer',
            requestId: 'rating-submit',
          },
        });
        return;
      }

      if (error.message === 'BOOKING_HAS_NO_DRIVER') {
        res.status(400).json({
          error: {
            code: 'BOOKING_HAS_NO_DRIVER',
            message: 'Cannot rate driver for booking without driver',
            requestId: 'rating-submit',
          },
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit rating',
        requestId: 'rating-submit',
      },
    });
  }
});

/**
 * POST /api/ratings/:ratingId/response
 * Provider responds to a review
 */
router.post('/:ratingId/response', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { ratingId } = req.params;
    const { response } = req.body;
    const companyId = req.user!.companyId;

    if (!response) {
      res.status(400).json({
        error: {
          code: 'MISSING_RESPONSE',
          message: 'Response text is required',
          requestId: 'rating-response',
        },
      });
      return;
    }

    const updatedRating = await ratingService.respondToReview(ratingId, companyId, response);

    res.status(200).json(updatedRating);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    if (error instanceof Error) {
      if (error.message === 'RATING_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'RATING_NOT_FOUND',
            message: 'Rating not found',
            requestId: 'rating-response',
          },
        });
        return;
      }

      if (error.message === 'UNAUTHORIZED') {
        res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to respond to this review',
            requestId: 'rating-response',
          },
        });
        return;
      }

      if (error.message === 'RESPONSE_ALREADY_EXISTS') {
        res.status(409).json({
          error: {
            code: 'RESPONSE_ALREADY_EXISTS',
            message: 'Response already exists for this review',
            requestId: 'rating-response',
          },
        });
        return;
      }

      if (error.message === 'RESPONSE_REQUIRED') {
        res.status(400).json({
          error: {
            code: 'RESPONSE_REQUIRED',
            message: 'Response text cannot be empty',
            requestId: 'rating-response',
          },
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit response',
        requestId: 'rating-response',
      },
    });
  }
});

/**
 * GET /api/ratings/booking/:bookingId
 * Get rating for a specific booking
 */
router.get('/booking/:bookingId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;

    const rating = await ratingService.getRatingByBookingId(bookingId);

    if (!rating) {
      res.status(404).json({
        error: {
          code: 'RATING_NOT_FOUND',
          message: 'No rating found for this booking',
          requestId: 'rating-get',
        },
      });
      return;
    }

    res.status(200).json(rating);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rating',
        requestId: 'rating-get',
      },
    });
  }
});

/**
 * GET /api/ratings/company/:companyId
 * Get all ratings for a company
 */
router.get('/company/:companyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    const ratings = await ratingService.getCompanyRatingsList(companyId);

    res.status(200).json(ratings);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve company ratings',
        requestId: 'rating-list',
      },
    });
  }
});

/**
 * GET /api/ratings/driver/:driverId
 * Get all ratings for a driver
 */
router.get('/driver/:driverId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;

    const ratings = await ratingService.getDriverRatingsList(driverId);

    res.status(200).json(ratings);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve driver ratings',
        requestId: 'rating-list',
      },
    });
  }
});

export default router;
