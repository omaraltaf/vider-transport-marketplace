import { Router, Request, Response } from 'express';
import { availabilityService } from '../services/availability.service';
import { authenticate } from '../middleware/auth.middleware';
import { logError } from '../utils/logging.utils';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const router = Router();

/**
 * Middleware to verify listing ownership
 * Checks if the authenticated user's company owns the listing
 */
async function verifyListingOwnership(
  req: Request,
  res: Response,
  next: Function
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
      });
      return;
    }

    const listingId = req.body.listingId || req.params.listingId;
    const listingType = req.body.listingType || req.query.listingType;

    if (!listingId || !listingType) {
      res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Listing ID and type are required',
        },
      });
      return;
    }

    // Get the listing and verify ownership
    let listing: any;
    if (listingType === 'vehicle') {
      listing = await prisma.vehicleListing.findUnique({
        where: { id: listingId },
        select: { companyId: true },
      });
    } else if (listingType === 'driver') {
      listing = await prisma.driverListing.findUnique({
        where: { id: listingId },
        select: { companyId: true },
      });
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_LISTING_TYPE',
          message: 'Listing type must be "vehicle" or "driver"',
        },
      });
      return;
    }

    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found',
        },
      });
      return;
    }

    if (listing.companyId !== req.user.companyId) {
      res.status(403).json({
        error: {
          code: 'LISTING_ACCESS_DENIED',
          message: 'You do not have access to this listing',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logError({ error: error as Error, request: req });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while verifying listing ownership',
      },
    });
  }
}

/**
 * Create a new availability block
 * POST /api/availability/blocks
 */
router.post(
  '/blocks',
  authenticate,
  verifyListingOwnership,
  async (req: Request, res: Response) => {
    try {
      const { listingId, listingType, startDate, endDate, reason } = req.body;

      if (!listingId || !listingType || !startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'listingId, listingType, startDate, and endDate are required',
          },
        });
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      const block = await availabilityService.createBlock({
        listingId,
        listingType,
        startDate: start,
        endDate: end,
        reason,
        createdBy: req.user!.userId,
      });

      res.status(201).json(block);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'INVALID_DATE_RANGE') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before or equal to end date',
          },
        });
      }

      if (errorMessage === 'BOOKING_CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'BOOKING_CONFLICT',
            message: 'The selected dates conflict with existing bookings',
            conflicts: (error as any).conflicts,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating the availability block',
        },
      });
    }
  }
);

/**
 * Get all availability blocks for a listing
 * GET /api/availability/blocks/:listingId
 */
router.get('/blocks/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { listingType, startDate, endDate } = req.query;

    if (!listingType) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'listingType query parameter is required',
        },
      });
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    if (
      (start && isNaN(start.getTime())) ||
      (end && isNaN(end.getTime()))
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format',
        },
      });
    }

    const blocks = await availabilityService.getBlocks(
      listingId,
      listingType as 'vehicle' | 'driver',
      start,
      end
    );

    res.json(blocks);
  } catch (error) {
    logError({ error: error as Error, request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching availability blocks',
      },
    });
  }
});

/**
 * Delete an availability block
 * DELETE /api/availability/blocks/:blockId
 */
router.delete(
  '/blocks/:blockId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { blockId } = req.params;

      await availabilityService.deleteBlock(blockId, req.user!.userId);

      res.status(204).send();
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'BLOCK_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'BLOCK_NOT_FOUND',
            message: 'Availability block not found',
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to delete this block',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting the availability block',
        },
      });
    }
  }
);

/**
 * Create a recurring availability block
 * POST /api/availability/recurring
 */
router.post(
  '/recurring',
  authenticate,
  verifyListingOwnership,
  async (req: Request, res: Response) => {
    try {
      const { listingId, listingType, daysOfWeek, startDate, endDate, reason } =
        req.body;

      if (!listingId || !listingType || !daysOfWeek || !startDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message:
              'listingId, listingType, daysOfWeek, and startDate are required',
          },
        });
      }

      // Parse dates
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : undefined;

      if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      const recurringBlock = await availabilityService.createRecurringBlock({
        listingId,
        listingType,
        daysOfWeek,
        startDate: start,
        endDate: end,
        reason,
        createdBy: req.user!.userId,
      });

      res.status(201).json(recurringBlock);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'INVALID_DAYS_OF_WEEK') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DAYS_OF_WEEK',
            message: 'Days of week must be an array of numbers 0-6',
          },
        });
      }

      if (errorMessage === 'INVALID_DATE_RANGE') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before or equal to end date',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating the recurring block',
        },
      });
    }
  }
);

/**
 * Update a recurring availability block
 * PUT /api/availability/recurring/:blockId
 */
router.put(
  '/recurring/:blockId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { blockId } = req.params;
      const { daysOfWeek, endDate, reason, scope, updateDate } = req.body;

      if (!scope || !updateDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'scope and updateDate are required',
          },
        });
      }

      if (scope !== 'all' && scope !== 'future') {
        return res.status(400).json({
          error: {
            code: 'INVALID_SCOPE',
            message: 'scope must be "all" or "future"',
          },
        });
      }

      const update = new Date(updateDate);
      const end = endDate ? new Date(endDate) : undefined;

      if (isNaN(update.getTime()) || (end && isNaN(end.getTime()))) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      const updatedBlock = await availabilityService.updateRecurringBlock(
        blockId,
        {
          daysOfWeek,
          endDate: end,
          reason,
          scope,
          updateDate: update,
        },
        req.user!.userId
      );

      res.json(updatedBlock);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'RECURRING_BLOCK_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'RECURRING_BLOCK_NOT_FOUND',
            message: 'Recurring block not found',
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to update this recurring block',
          },
        });
      }

      if (errorMessage === 'INVALID_DAYS_OF_WEEK') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DAYS_OF_WEEK',
            message: 'Days of week must be an array of numbers 0-6',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating the recurring block',
        },
      });
    }
  }
);

/**
 * Delete a recurring availability block
 * DELETE /api/availability/recurring/:blockId
 */
router.delete(
  '/recurring/:blockId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { blockId } = req.params;
      const { scope, deleteDate } = req.body;

      if (!scope || !deleteDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'scope and deleteDate are required',
          },
        });
      }

      if (scope !== 'all' && scope !== 'future') {
        return res.status(400).json({
          error: {
            code: 'INVALID_SCOPE',
            message: 'scope must be "all" or "future"',
          },
        });
      }

      const deleteD = new Date(deleteDate);

      if (isNaN(deleteD.getTime())) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      await availabilityService.deleteRecurringBlock(
        blockId,
        scope,
        deleteD,
        req.user!.userId
      );

      res.status(204).send();
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'RECURRING_BLOCK_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'RECURRING_BLOCK_NOT_FOUND',
            message: 'Recurring block not found',
          },
        });
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return res.status(403).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'You do not have permission to delete this recurring block',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting the recurring block',
        },
      });
    }
  }
);

/**
 * Check availability for a listing in a date range
 * POST /api/availability/check
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { listingId, listingType, startDate, endDate } = req.body;

    if (!listingId || !listingType || !startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'listingId, listingType, startDate, and endDate are required',
        },
      });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format',
        },
      });
    }

    const result = await availabilityService.checkAvailability({
      listingId,
      listingType,
      startDate: start,
      endDate: end,
    });

    res.json(result);
  } catch (error) {
    logError({ error: error as Error, request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking availability',
      },
    });
  }
});

/**
 * Create availability blocks for multiple listings
 * POST /api/availability/bulk
 */
router.post(
  '/bulk',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { listingIds, listingType, startDate, endDate, reason } = req.body;

      if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'listingIds must be a non-empty array',
          },
        });
      }

      if (!listingType || !startDate || !endDate) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'listingType, startDate, and endDate are required',
          },
        });
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      // Verify ownership of all listings
      for (const listingId of listingIds) {
        let listing: any;
        if (listingType === 'vehicle') {
          listing = await prisma.vehicleListing.findUnique({
            where: { id: listingId },
            select: { companyId: true },
          });
        } else if (listingType === 'driver') {
          listing = await prisma.driverListing.findUnique({
            where: { id: listingId },
            select: { companyId: true },
          });
        } else {
          return res.status(400).json({
            error: {
              code: 'INVALID_LISTING_TYPE',
              message: 'Listing type must be "vehicle" or "driver"',
            },
          });
        }

        if (!listing) {
          return res.status(404).json({
            error: {
              code: 'LISTING_NOT_FOUND',
              message: `Listing ${listingId} not found`,
            },
          });
        }

        if (listing.companyId !== req.user!.companyId) {
          return res.status(403).json({
            error: {
              code: 'LISTING_ACCESS_DENIED',
              message: `You do not have access to listing ${listingId}`,
            },
          });
        }
      }

      // Create bulk blocks
      const result = await availabilityService.createBulkBlocks({
        listingIds,
        listingType,
        startDate: start,
        endDate: end,
        reason,
        createdBy: req.user!.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      logError({ error: error as Error, request: req });

      const errorMessage = (error as Error).message;

      if (errorMessage === 'INVALID_DATE_RANGE') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before or equal to end date',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating bulk availability blocks',
        },
      });
    }
  }
);

/**
 * Get calendar view for a listing
 * GET /api/availability/calendar/:listingId
 */
router.get('/calendar/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { listingType, startDate, endDate } = req.query;

    if (!listingType) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'listingType query parameter is required',
        },
      });
    }

    // Default to next 90 days if not specified
    const start = startDate
      ? new Date(startDate as string)
      : new Date();
    const end = endDate
      ? new Date(endDate as string)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid date format',
        },
      });
    }

    // Get all blocks (manual and recurring)
    const blocks = await availabilityService.getBlocks(
      listingId,
      listingType as 'vehicle' | 'driver',
      start,
      end
    );

    // Get recurring blocks and generate instances
    const recurringBlocks = await availabilityService.getRecurringBlocks(
      listingId,
      listingType as 'vehicle' | 'driver'
    );

    const recurringInstances: any[] = [];
    for (const pattern of recurringBlocks) {
      const instances = availabilityService.generateRecurringInstances(
        pattern,
        start,
        end
      );
      recurringInstances.push(...instances);
    }

    // Get bookings
    const where: any = {
      status: { in: ['ACCEPTED', 'ACTIVE', 'COMPLETED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    // Build calendar days
    const calendarDays: any[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if date is blocked
      const block = blocks.find(
        (b) =>
          b.startDate <= currentDate &&
          b.endDate >= currentDate &&
          !b.isRecurring
      );

      const recurringBlock = recurringInstances.find(
        (b) =>
          b.startDate.toISOString().split('T')[0] === dateStr
      );

      // Check if date is booked
      const booking = bookings.find(
        (b) => b.startDate <= currentDate && b.endDate >= currentDate
      );

      let status = 'available';
      let details: any = {};

      if (booking) {
        status = 'booked';
        details = {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          bookingStatus: booking.status,
        };
      } else if (block) {
        status = 'blocked';
        details = {
          blockId: block.id,
          reason: block.reason,
        };
      } else if (recurringBlock) {
        status = 'blocked';
        details = {
          blockId: recurringBlock.id,
          reason: recurringBlock.reason,
          isRecurring: true,
        };
      }

      calendarDays.push({
        date: dateStr,
        status,
        ...details,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      listingId,
      listingType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: calendarDays,
    });
  } catch (error) {
    logError({ error: error as Error, request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching calendar view',
      },
    });
  }
});

/**
 * Get availability analytics for a listing
 * GET /api/availability/analytics/:listingId
 */
router.get(
  '/analytics/:listingId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;
      const { listingType, startDate, endDate } = req.query;

      if (!listingType) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'listingType query parameter is required',
          },
        });
      }

      // Default to last 30 days if not specified
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      const analytics = await availabilityService.getAnalytics(
        listingId,
        listingType as 'vehicle' | 'driver',
        start,
        end
      );

      res.json(analytics);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching analytics',
        },
      });
    }
  }
);

/**
 * Export calendar in iCalendar format
 * GET /api/availability/export/:listingId
 */
router.get(
  '/export/:listingId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { listingId } = req.params;
      const { listingType, startDate, endDate } = req.query;

      if (!listingType) {
        return res.status(400).json({
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'listingType query parameter is required',
          },
        });
      }

      // Verify listing ownership
      let listing: any;
      if (listingType === 'vehicle') {
        listing = await prisma.vehicleListing.findUnique({
          where: { id: listingId },
          select: { companyId: true, title: true },
        });
      } else if (listingType === 'driver') {
        listing = await prisma.driverListing.findUnique({
          where: { id: listingId },
          select: { companyId: true, name: true },
        });
      } else {
        return res.status(400).json({
          error: {
            code: 'INVALID_LISTING_TYPE',
            message: 'Listing type must be "vehicle" or "driver"',
          },
        });
      }

      if (!listing) {
        return res.status(404).json({
          error: {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found',
          },
        });
      }

      if (listing.companyId !== req.user!.companyId) {
        return res.status(403).json({
          error: {
            code: 'LISTING_ACCESS_DENIED',
            message: 'You do not have access to this listing',
          },
        });
      }

      // Parse optional date range
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      if (
        (start && isNaN(start.getTime())) ||
        (end && isNaN(end.getTime()))
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Invalid date format',
          },
        });
      }

      // Generate iCalendar content
      const icalContent = await availabilityService.exportCalendar(
        listingId,
        listingType as 'vehicle' | 'driver',
        start,
        end
      );

      // Set headers for file download
      const filename = `${listingType}-${listingId}-availability.ics`;
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(icalContent);
    } catch (error) {
      logError({ error: error as Error, request: req });

      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while exporting calendar',
        },
      });
    }
  }
);

export default router;
