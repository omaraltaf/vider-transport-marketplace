import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorizationService } from '../services/authorization.service';
import { logError } from '../utils/logging.utils';
import { applyRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * Create a booking request
 * POST /api/bookings
 */
router.post(
  '/',
  authenticateToken,
  applyRateLimit('booking'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const {
        providerCompanyId,
        vehicleListingId,
        driverListingId,
        startDate,
        endDate,
        durationHours,
        durationDays,
      } = req.body;

      const booking = await bookingService.createBookingRequest({
        renterCompanyId: user.companyId,
        providerCompanyId,
        vehicleListingId,
        driverListingId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        durationHours,
        durationDays,
      });

      res.status(201).json(booking);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;
      
      if (errorMessage === 'SELF_BOOKING_NOT_ALLOWED') {
        return res.status(400).json({
          error: {
            code: 'SELF_BOOKING_NOT_ALLOWED',
            message: 'Cannot book your own company listings',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'CROSS_COMPANY_VEHICLE_DRIVER_NOT_ALLOWED') {
        return res.status(400).json({
          error: {
            code: 'CROSS_COMPANY_VEHICLE_DRIVER_NOT_ALLOWED',
            message: 'Vehicle and driver must be from the same company',
            requestId: req.id,
          },
        });
      }

      if (errorMessage.includes('NOT_AVAILABLE')) {
        return res.status(409).json({
          error: {
            code: 'LISTING_UNAVAILABLE',
            message: 'The requested listing is not available for the selected dates',
            requestId: req.id,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create booking request',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Get bookings for the authenticated user's company
 * GET /api/bookings
 */
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const bookings = await bookingService.getCompanyBookings(user.companyId);

      res.json(bookings);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bookings',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Get a specific booking by ID
 * GET /api/bookings/:id
 */
router.get(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const booking = await bookingService.getBookingById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: req.id,
          },
        });
      }

      // Check if user has access to this booking
      if (booking.renterCompanyId !== user.companyId && booking.providerCompanyId !== user.companyId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
            requestId: req.id,
          },
        });
      }

      res.json(booking);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch booking',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Accept a booking request (provider only)
 * POST /api/bookings/:id/accept
 */
router.post(
  '/:id/accept',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const booking = await bookingService.acceptBooking(req.params.id, user.companyId);

      res.json(booking);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can accept this booking',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'INVALID_BOOKING_STATUS') {
        return res.status(400).json({
          error: {
            code: 'INVALID_BOOKING_STATUS',
            message: 'Booking cannot be accepted in its current status',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'BOOKING_EXPIRED') {
        return res.status(400).json({
          error: {
            code: 'BOOKING_EXPIRED',
            message: 'This booking request has expired',
            requestId: req.id,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to accept booking',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Decline a booking request (provider only)
 * POST /api/bookings/:id/decline
 */
router.post(
  '/:id/decline',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const { reason } = req.body;

      const booking = await bookingService.declineBooking(req.params.id, user.companyId, reason);

      res.json(booking);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can decline this booking',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'INVALID_BOOKING_STATUS') {
        return res.status(400).json({
          error: {
            code: 'INVALID_BOOKING_STATUS',
            message: 'Booking cannot be declined in its current status',
            requestId: req.id,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to decline booking',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Propose new terms for a booking (provider only)
 * POST /api/bookings/:id/propose-terms
 */
router.post(
  '/:id/propose-terms',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const { startDate, endDate, providerRate } = req.body;

      const newTerms: any = {};
      if (startDate) newTerms.startDate = new Date(startDate);
      if (endDate) newTerms.endDate = new Date(endDate);
      if (providerRate) newTerms.providerRate = providerRate;

      const booking = await bookingService.proposeNewTerms(req.params.id, user.companyId, newTerms);

      res.json(booking);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BOOKING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: req.id,
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can propose new terms',
            requestId: req.id,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to propose new terms',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * Download booking contract PDF
 * GET /api/bookings/:id/contract
 */
router.get(
  '/:id/contract',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const user = await authorizationService.getUserById(userId);

      if (!user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not found',
            requestId: req.id,
          },
        });
      }

      const booking = await bookingService.getBookingById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
            requestId: req.id,
          },
        });
      }

      // Check if user has access to this booking
      if (booking.renterCompanyId !== user.companyId && booking.providerCompanyId !== user.companyId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
            requestId: req.id,
          },
        });
      }

      if (!booking.contractPdfPath) {
        return res.status(404).json({
          error: {
            code: 'CONTRACT_NOT_FOUND',
            message: 'Contract has not been generated yet',
            requestId: req.id,
          },
        });
      }

      // Send the PDF file
      res.download(booking.contractPdfPath, `contract-${booking.bookingNumber}.pdf`);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to download contract',
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
