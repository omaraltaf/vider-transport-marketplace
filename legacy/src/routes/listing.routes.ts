import { Router, Request, Response } from 'express';
import { ListingService } from '../services/listing.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthorizationService } from '../services/authorization.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';
import { featureToggleService } from '../services/feature-toggle.service';
import { logError } from '../utils/logging.utils';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { cloudStorageService } from '../services/cloud-storage.service';

const router = Router();
const listingService = new ListingService();
const authorizationService = new AuthorizationService();
const prisma = new PrismaClient();

// Helper function to get user with company
async function getUserWithCompany(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true },
  });
}

/**
 * GET /api/listings/search
 * Search listings with filters
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const searchStartTime = Date.now();
  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const filters: any = {};

    // Listing type filter
    if (req.query.listingType) {
      filters.listingType = req.query.listingType as string;
    }

    // Location filters
    if (req.query.fylke || req.query.kommune || req.query.radius || req.query.latitude) {
      filters.location = {};
      if (req.query.fylke) filters.location.fylke = req.query.fylke as string;
      if (req.query.kommune) filters.location.kommune = req.query.kommune as string;
      if (req.query.radius) filters.location.radius = parseFloat(req.query.radius as string);
      if (req.query.latitude && req.query.longitude) {
        filters.location.coordinates = [
          parseFloat(req.query.longitude as string),
          parseFloat(req.query.latitude as string),
        ];
      }
    }

    // Vehicle type filter
    if (req.query.vehicleType) {
      const types = Array.isArray(req.query.vehicleType)
        ? req.query.vehicleType
        : [req.query.vehicleType];
      filters.vehicleType = types;
    }

    // Fuel type filter
    if (req.query.fuelType) {
      const types = Array.isArray(req.query.fuelType)
        ? req.query.fuelType
        : [req.query.fuelType];
      filters.fuelType = types;
    }

    // Capacity filter
    if (req.query.minCapacity || req.query.maxCapacity) {
      filters.capacity = {};
      if (req.query.minCapacity) filters.capacity.min = parseInt(req.query.minCapacity as string);
      if (req.query.maxCapacity) filters.capacity.max = parseInt(req.query.maxCapacity as string);
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filters.priceRange = {};
      if (req.query.minPrice) filters.priceRange.min = parseFloat(req.query.minPrice as string);
      if (req.query.maxPrice) filters.priceRange.max = parseFloat(req.query.maxPrice as string);
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      filters.dateRange = {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      };
    }

    // With/without driver filter
    if (req.query.withDriver !== undefined) {
      filters.withDriver = req.query.withDriver === 'true';
    }

    // Tags filter
    if (req.query.tags) {
      const tags = Array.isArray(req.query.tags)
        ? req.query.tags
        : [req.query.tags];
      filters.tags = tags;
    }

    // Pagination
    if (req.query.page) filters.page = parseInt(req.query.page as string);
    if (req.query.pageSize) filters.pageSize = parseInt(req.query.pageSize as string);

    // Sorting
    if (req.query.sortBy) filters.sortBy = req.query.sortBy as string;
    if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder as string;

    // Log search request with detailed parameters
    console.log(`[SEARCH_REQUEST] ${searchId}`, {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      rawQuery: req.query,
      parsedFilters: filters,
      filterCount: Object.keys(filters).length,
      hasLocationFilter: !!filters.location,
      hasDateFilter: !!filters.dateRange,
      hasPriceFilter: !!filters.priceRange,
    });

    const results = await listingService.searchListings(filters);
    const searchDuration = Date.now() - searchStartTime;

    // Log search results with performance metrics
    console.log(`[SEARCH_RESULTS] ${searchId}`, {
      timestamp: new Date().toISOString(),
      duration: `${searchDuration}ms`,
      totalResults: results.total,
      vehicleResults: results.vehicleListings.length,
      driverResults: results.driverListings.length,
      page: results.page,
      pageSize: results.pageSize,
      totalPages: results.totalPages,
      isEmpty: results.total === 0,
      performance: {
        fast: searchDuration < 100,
        acceptable: searchDuration < 500,
        slow: searchDuration >= 500,
      },
    });

    // Log empty result scenarios for debugging
    if (results.total === 0) {
      console.log(`[SEARCH_EMPTY_RESULTS] ${searchId}`, {
        timestamp: new Date().toISOString(),
        appliedFilters: filters,
        debugInfo: {
          hasActiveListings: 'Check if database has active listings',
          filterTooRestrictive: 'Filters may be too restrictive',
          locationMismatch: filters.location ? 'Location filter may not match any listings' : false,
          priceMismatch: filters.priceRange ? 'Price range may not match any listings' : false,
          dateMismatch: filters.dateRange ? 'Date range may conflict with bookings/blocks' : false,
        },
      });
    }

    res.status(200).json(results);
  } catch (error) {
    const searchDuration = Date.now() - searchStartTime;

    // Log search errors with context
    console.error(`[SEARCH_ERROR] ${searchId}`, {
      timestamp: new Date().toISOString(),
      duration: `${searchDuration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filters: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
    });

    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search listings',
      },
    });
  }
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * POST /api/listings/vehicles
 * Create a new vehicle listing
 */
router.post('/vehicles', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can create listings',
        },
      });
      return;
    }

    // Get user's company
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    // Check feature toggle for without-driver listings
    if (!req.body.withDriver) {
      const withoutDriverEnabled = await featureToggleService.isFeatureEnabled(FeatureToggle.WITHOUT_DRIVER_LISTINGS);
      if (!withoutDriverEnabled) {
        res.status(403).json({
          error: {
            code: 'FEATURE_DISABLED',
            message: 'Without-driver listings are currently disabled',
            feature: 'withoutDriverListings',
          },
        });
        return;
      }
    }

    const listing = await listingService.createVehicleListing({
      ...req.body,
      companyId: user.companyId,
    });

    res.status(201).json(listing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('REQUIRED') || errorMessage.includes('INVALID')) {
      res.status(400).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create vehicle listing',
      },
    });
  }
});

/**
 * GET /api/listings/vehicles
 * Get all vehicle listings for the authenticated user's company
 */
router.get('/vehicles', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Get user's company
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    const listings = await listingService.getCompanyVehicleListings(user.companyId);

    res.status(200).json(listings);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch vehicle listings',
      },
    });
  }
});

/**
 * GET /api/listings/vehicles/:id
 * Get a specific vehicle listing
 */
router.get('/vehicles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await listingService.getVehicleListingById(req.params.id);

    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Vehicle listing not found',
        },
      });
      return;
    }

    res.status(200).json(listing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch vehicle listing',
      },
    });
  }
});

/**
 * PUT /api/listings/vehicles/:id
 * Update a vehicle listing
 */
router.put('/vehicles/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can update listings',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getVehicleListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Vehicle listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only update your own company listings',
        },
      });
      return;
    }

    const updatedListing = await listingService.updateVehicleListing(listingId, req.body);

    res.status(200).json(updatedListing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('NOT_FOUND')) {
      res.status(404).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    if (errorMessage.includes('REQUIRED') || errorMessage.includes('INVALID')) {
      res.status(400).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update vehicle listing',
      },
    });
  }
});

/**
 * DELETE /api/listings/vehicles/:id
 * Delete a vehicle listing
 */
router.delete('/vehicles/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can delete listings',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getVehicleListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Vehicle listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only delete your own company listings',
        },
      });
      return;
    }

    await listingService.deleteVehicleListing(listingId);

    res.status(204).send();
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete vehicle listing',
      },
    });
  }
});

/**
 * POST /api/listings/vehicles/:id/photos
 * Upload photos for a vehicle listing
 */
router.post('/vehicles/:id/photos', authenticate, upload.array('photos', 10), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can upload photos',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getVehicleListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Vehicle listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only upload photos to your own company listings',
        },
      });
      return;
    }

    const files = req.files as Express.Multer.File[];

    // Upload files to GCS
    const uploadPromises = files.map(file => cloudStorageService.uploadFile(file, 'listings'));
    const photoPaths = await Promise.all(uploadPromises);

    // Add photos to existing listing
    const updatedListing = await listingService.updateVehicleListing(listingId, {
      photos: [...listing.photos, ...photoPaths],
    });

    res.status(200).json({
      photos: photoPaths,
      listing: updatedListing,
    });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload photos',
      },
    });
  }
});

export default router;

/**
 * POST /api/listings/drivers
 * Create a new driver listing
 */
router.post('/drivers', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can create listings',
        },
      });
      return;
    }

    // Get user's company
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    const listing = await listingService.createDriverListing({
      ...req.body,
      companyId: user.companyId,
    });

    res.status(201).json(listing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('REQUIRED') || errorMessage.includes('INVALID')) {
      res.status(400).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create driver listing',
      },
    });
  }
});

/**
 * GET /api/listings/drivers
 * Get all driver listings for the authenticated user's company
 * Or get drivers for a specific company (via companyId query param) - no auth required for browsing
 */
router.get('/drivers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;

    // If companyId is provided, fetch drivers for that company (for booking purposes)
    if (companyId && typeof companyId === 'string') {
      const listings = await listingService.getCompanyDriverListings(companyId);
      res.status(200).json(listings);
      return;
    }

    // Otherwise, require authentication and fetch user's company drivers
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        },
      });
      return;
    }

    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        },
      });
      return;
    }

    // Get user's company
    const user = await getUserWithCompany(userId);
    if (!user || !user.companyId) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANY_ASSOCIATED',
          message: 'User must be associated with a company',
        },
      });
      return;
    }

    const listings = await listingService.getCompanyDriverListings(user.companyId);

    res.status(200).json(listings);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch driver listings',
      },
    });
  }
});

/**
 * GET /api/listings/drivers/:id
 * Get a specific driver listing
 */
router.get('/drivers/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const listing = await listingService.getDriverListingById(req.params.id);

    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Driver listing not found',
        },
      });
      return;
    }

    res.status(200).json(listing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch driver listing',
      },
    });
  }
});

/**
 * PUT /api/listings/drivers/:id
 * Update a driver listing
 */
router.put('/drivers/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can update listings',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getDriverListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Driver listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only update your own company listings',
        },
      });
      return;
    }

    const updatedListing = await listingService.updateDriverListing(listingId, req.body);

    res.status(200).json(updatedListing);
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('NOT_FOUND')) {
      res.status(404).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    if (errorMessage.includes('REQUIRED') || errorMessage.includes('INVALID')) {
      res.status(400).json({
        error: {
          code: errorMessage,
          message: errorMessage.replace(/_/g, ' ').toLowerCase(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update driver listing',
      },
    });
  }
});

/**
 * DELETE /api/listings/drivers/:id
 * Delete a driver listing
 */
router.delete('/drivers/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can delete listings',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getDriverListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Driver listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only delete your own company listings',
        },
      });
      return;
    }

    await listingService.deleteDriverListing(listingId);

    res.status(204).send();
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete driver listing',
      },
    });
  }
});

/**
 * POST /api/listings/drivers/:id/license
 * Upload license document for a driver listing
 */
router.post('/drivers/:id/license', authenticate, upload.single('license'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const listingId = req.params.id;

    // Check if user has Company Admin role
    const hasRole = await authorizationService.checkRole(userId, 'COMPANY_ADMIN');
    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only Company Admins can upload license documents',
        },
      });
      return;
    }

    // Check if listing belongs to user's company
    const listing = await listingService.getDriverListingById(listingId);
    if (!listing) {
      res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Driver listing not found',
        },
      });
      return;
    }

    const user = await getUserWithCompany(userId);
    if (!user || listing.companyId !== user.companyId) {
      res.status(403).json({
        error: {
          code: 'COMPANY_ACCESS_DENIED',
          message: 'You can only upload documents to your own company listings',
        },
      });
      return;
    }

    const file = req.file as Express.Multer.File;
    if (!file) {
      res.status(400).json({
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No license document was uploaded',
        },
      });
      return;
    }

    const licensePath = `/uploads/listings/${file.filename}`;

    // Update listing with license document path
    const updatedListing = await listingService.updateDriverListing(listingId, {
      licenseDocumentPath: licensePath,
    });

    res.status(200).json({
      licensePath,
      listing: updatedListing,
    });
  } catch (error) {
    logError({ error: error instanceof Error ? error : new Error('Unknown error'), request: req });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload license document',
      },
    });
  }
});
