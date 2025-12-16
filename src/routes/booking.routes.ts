import { Router, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { authenticate } from '../middleware/auth.middleware';
import { authorizationService } from '../services/authorization.service';
import { logError } from '../utils/logging.utils';
import { bookingRateLimiter } from '../middleware/rate-limit.middleware';
import { requireFeature, FeatureToggle } from '../middleware/feature-toggle.middleware';
import { prisma } from '../config/database';

const router = Router();

/**
 * Calculate booking costs
 * POST /api/bookings/calculate-costs
 * Note: No authentication required for cost calculation
 */
router.post(
  '/calculate-costs',
  async (req: Request, res: Response) => {
    try {
      const { listingId, listingType, duration, includeDriver } = req.body;

      if (!listingId || !listingType || !duration) {
        return res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: listingId, listingType, duration',
          },
        });
      }

      // Calculate costs for the vehicle
      let costs = await bookingService.calculateCosts(
        listingId,
        listingType as 'vehicle' | 'driver',
        duration
      );

      // Store vehicle rate separately
      costs.vehicleRate = costs.providerRate;

      // If booking a vehicle with a driver, add driver costs from the vehicle listing
      if (listingType === 'vehicle' && includeDriver) {
        const vehicleListing = await prisma.vehicleListing.findUnique({
          where: { id: listingId },
        });

        if (vehicleListing && vehicleListing.withDriver) {
          let driverRate = 0;
          
          // Calculate driver rate based on duration type
          if (duration.hours && vehicleListing.withDriverHourlyRate) {
            driverRate = vehicleListing.withDriverHourlyRate * duration.hours;
          } else if (duration.days && vehicleListing.withDriverDailyRate) {
            driverRate = vehicleListing.withDriverDailyRate * duration.days;
          }

          // Add driver rate to costs
          costs.driverRate = driverRate;
          costs.providerRate += driverRate;
          
          // Recalculate commission and taxes with driver included
          const config = await bookingService.getPlatformConfig();
          const platformCommission = costs.providerRate * (config.commissionRate / 100);
          const subtotal = costs.providerRate + platformCommission;
          const taxes = subtotal * (config.taxRate / 100);
          const total = subtotal + taxes;

          costs.platformCommission = platformCommission;
          costs.taxes = taxes;
          costs.total = total;
        }
      }

      res.json(costs);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'LISTING_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate costs',
        },
      });
    }
  }
);

/**
 * Create a booking request
 * POST /api/bookings
 */
router.post(
  '/',
  authenticate,
  bookingRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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
          },
        });
      }

      if (errorMessage === 'CROSS_COMPANY_VEHICLE_DRIVER_NOT_ALLOWED') {
        return res.status(400).json({
          error: {
            code: 'CROSS_COMPANY_VEHICLE_DRIVER_NOT_ALLOWED',
            message: 'Vehicle and driver must be from the same company',
          },
        });
      }

      if (errorMessage.includes('NOT_AVAILABLE')) {
        return res.status(409).json({
          error: {
            code: 'LISTING_UNAVAILABLE',
            message: 'The requested listing is not available for the selected dates',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create booking request',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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

      const bookings = await bookingService.getCompanyBookings(user.companyId);

      res.json(bookings);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch bookings',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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

      const booking = await bookingService.getBookingById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        });
      }

      // Check if user has access to this booking
      if (booking.renterCompanyId !== user.companyId && booking.providerCompanyId !== user.companyId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can accept this booking',
          },
        });
      }

      if (errorMessage === 'INVALID_BOOKING_STATUS') {
        return res.status(400).json({
          error: {
            code: 'INVALID_BOOKING_STATUS',
            message: 'Booking cannot be accepted in its current status',
          },
        });
      }

      if (errorMessage === 'BOOKING_EXPIRED') {
        return res.status(400).json({
          error: {
            code: 'BOOKING_EXPIRED',
            message: 'This booking request has expired',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to accept booking',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can decline this booking',
          },
        });
      }

      if (errorMessage === 'INVALID_BOOKING_STATUS') {
        return res.status(400).json({
          error: {
            code: 'INVALID_BOOKING_STATUS',
            message: 'Booking cannot be declined in its current status',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to decline booking',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the provider can propose new terms',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to propose new terms',
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
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
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

      const booking = await bookingService.getBookingById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        });
      }

      // Check if user has access to this booking
      if (booking.renterCompanyId !== user.companyId && booking.providerCompanyId !== user.companyId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
          },
        });
      }

      if (!booking.contractPdfPath) {
        return res.status(404).json({
          error: {
            code: 'CONTRACT_NOT_FOUND',
            message: 'Contract has not been generated yet',
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
        },
      });
    }
  }
);

export default router;
