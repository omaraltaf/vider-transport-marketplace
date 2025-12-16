import { PrismaClient, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import type { VehicleListing, DriverListing } from '@prisma/client';
import { logger } from '../config/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

export interface VehicleListingCreateData {
  companyId: string;
  title: string;
  description: string;
  vehicleType: VehicleType;
  capacity: number;
  fuelType: FuelType;
  city: string;
  fylke: string;
  kommune: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  dailyRate?: number;
  deposit?: number;
  currency?: string;
  withDriver: boolean;
  withDriverCost?: number;
  withoutDriver: boolean;
  photos?: string[];
  tags?: string[];
}

export interface VehicleListingUpdateData {
  title?: string;
  description?: string;
  vehicleType?: VehicleType;
  capacity?: number;
  fuelType?: FuelType;
  city?: string;
  fylke?: string;
  kommune?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  dailyRate?: number;
  deposit?: number;
  currency?: string;
  withDriver?: boolean;
  withDriverCost?: number;
  withoutDriver?: boolean;
  photos?: string[];
  tags?: string[];
}

export interface DriverListingCreateData {
  companyId: string;
  name: string;
  licenseClass: string;
  languages: string[];
  backgroundSummary?: string;
  hourlyRate?: number;
  dailyRate?: number;
  currency?: string;
  licenseDocumentPath?: string;
}

export interface DriverListingUpdateData {
  name?: string;
  licenseClass?: string;
  languages?: string[];
  backgroundSummary?: string;
  hourlyRate?: number;
  dailyRate?: number;
  currency?: string;
  licenseDocumentPath?: string;
}

export interface SearchFilters {
  listingType?: 'vehicle' | 'driver' | 'vehicle_driver';
  location?: {
    fylke?: string;
    kommune?: string;
    radius?: number; // in kilometers
    coordinates?: [number, number]; // [longitude, latitude]
  };
  vehicleType?: VehicleType[];
  fuelType?: FuelType[];
  capacity?: {
    min?: number;
    max?: number;
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  withDriver?: boolean;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'price' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  vehicleListings: VehicleListing[];
  driverListings: DriverListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ListingService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  /**
   * Create a new vehicle listing
   */
  async createVehicleListing(data: VehicleListingCreateData): Promise<VehicleListing> {
    // Validate required fields
    this.validateVehicleListingData(data);

    // Validate service offerings
    if (!data.withDriver && !data.withoutDriver) {
      throw new Error('AT_LEAST_ONE_SERVICE_OFFERING_REQUIRED');
    }

    // If withDriver is true, withDriverCost should be provided
    if (data.withDriver && data.withDriverCost === undefined) {
      throw new Error('WITH_DRIVER_COST_REQUIRED');
    }

    // If withDriver is false, withDriverCost should not be provided
    if (!data.withDriver && data.withDriverCost !== undefined) {
      throw new Error('WITH_DRIVER_COST_NOT_ALLOWED');
    }

    // Validate pricing - at least one rate must be provided
    if (!data.hourlyRate && !data.dailyRate) {
      throw new Error('AT_LEAST_ONE_RATE_REQUIRED');
    }

    // Create the listing
    const listing = await prisma.vehicleListing.create({
      data: {
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        fuelType: data.fuelType,
        city: data.city,
        fylke: data.fylke,
        kommune: data.kommune,
        latitude: data.latitude,
        longitude: data.longitude,
        hourlyRate: data.hourlyRate,
        dailyRate: data.dailyRate,
        deposit: data.deposit,
        currency: data.currency || 'NOK',
        withDriver: data.withDriver,
        withDriverCost: data.withDriverCost,
        withoutDriver: data.withoutDriver,
        photos: data.photos || [],
        tags: data.tags || [],
        status: ListingStatus.ACTIVE,
      },
    });

    logger.info('Vehicle listing created', { listingId: listing.id, companyId: data.companyId });

    return listing;
  }

  /**
   * Update an existing vehicle listing
   */
  async updateVehicleListing(listingId: string, data: VehicleListingUpdateData): Promise<VehicleListing> {
    // Check if listing exists
    const existingListing = await prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Validate updated fields
    if (data.title !== undefined && data.title.trim() === '') {
      throw new Error('TITLE_REQUIRED');
    }

    if (data.description !== undefined && data.description.trim() === '') {
      throw new Error('DESCRIPTION_REQUIRED');
    }

    if (data.capacity !== undefined && data.capacity <= 0) {
      throw new Error('CAPACITY_MUST_BE_POSITIVE');
    }

    // Validate service offerings if being updated
    const withDriver = data.withDriver !== undefined ? data.withDriver : existingListing.withDriver;
    const withoutDriver = data.withoutDriver !== undefined ? data.withoutDriver : existingListing.withoutDriver;

    if (!withDriver && !withoutDriver) {
      throw new Error('AT_LEAST_ONE_SERVICE_OFFERING_REQUIRED');
    }

    // Validate withDriverCost consistency
    if (data.withDriver !== undefined) {
      if (data.withDriver && data.withDriverCost === undefined && existingListing.withDriverCost === null) {
        throw new Error('WITH_DRIVER_COST_REQUIRED');
      }
      if (!data.withDriver && data.withDriverCost !== undefined) {
        throw new Error('WITH_DRIVER_COST_NOT_ALLOWED');
      }
    }

    // Update the listing
    const updatedListing = await prisma.vehicleListing.update({
      where: { id: listingId },
      data,
    });

    logger.info('Vehicle listing updated', { listingId, updatedFields: Object.keys(data) });

    return updatedListing;
  }

  /**
   * Delete a vehicle listing
   */
  async deleteVehicleListing(listingId: string): Promise<void> {
    // Check if listing exists
    const listing = await prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Check if there are any active bookings for this listing
    const activeBookings = await prisma.booking.count({
      where: {
        vehicleListingId: listingId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'ACTIVE'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new Error('CANNOT_DELETE_LISTING_WITH_ACTIVE_BOOKINGS');
    }

    // Delete the listing
    await prisma.vehicleListing.delete({
      where: { id: listingId },
    });

    logger.info('Vehicle listing deleted', { listingId });
  }

  /**
   * Update listing status (ACTIVE, SUSPENDED, REMOVED)
   */
  async updateListingStatus(listingId: string, status: ListingStatus): Promise<VehicleListing> {
    // Check if listing exists
    const listing = await prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Update status
    const updatedListing = await prisma.vehicleListing.update({
      where: { id: listingId },
      data: { status },
    });

    logger.info('Vehicle listing status updated', { listingId, status });

    return updatedListing;
  }

  /**
   * Get vehicle listing by ID
   */
  async getVehicleListingById(listingId: string): Promise<any | null> {
    const listing = await prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        company: true,
      },
    });

    if (!listing) {
      return null;
    }

    // Transform flat database structure to nested frontend structure
    return {
      id: listing.id,
      companyId: listing.companyId,
      title: listing.title,
      description: listing.description,
      vehicleType: listing.vehicleType,
      capacity: listing.capacity,
      fuelType: listing.fuelType,
      location: {
        city: listing.city,
        fylke: listing.fylke,
        kommune: listing.kommune,
        coordinates: listing.latitude && listing.longitude 
          ? [listing.latitude, listing.longitude] 
          : undefined,
      },
      pricing: {
        hourlyRate: listing.hourlyRate || undefined,
        dailyRate: listing.dailyRate || undefined,
        deposit: listing.deposit || undefined,
        currency: listing.currency,
      },
      serviceOfferings: {
        withDriver: listing.withDriver,
        withDriverCost: listing.withDriverCost || undefined,
        withDriverHourlyRate: listing.withDriverHourlyRate || undefined,
        withDriverDailyRate: listing.withDriverDailyRate || undefined,
        withoutDriver: listing.withoutDriver,
      },
      photos: listing.photos,
      tags: listing.tags,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      company: listing.company,
    };
  }

  /**
   * Get all vehicle listings for a company
   */
  async getCompanyVehicleListings(companyId: string): Promise<any[]> {
    const listings = await prisma.vehicleListing.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Transform flat database structure to nested frontend structure
    return listings.map(listing => ({
      id: listing.id,
      companyId: listing.companyId,
      title: listing.title,
      description: listing.description,
      vehicleType: listing.vehicleType,
      capacity: listing.capacity,
      fuelType: listing.fuelType,
      location: {
        city: listing.city,
        fylke: listing.fylke,
        kommune: listing.kommune,
        coordinates: listing.latitude && listing.longitude 
          ? [listing.latitude, listing.longitude] 
          : undefined,
      },
      pricing: {
        hourlyRate: listing.hourlyRate || undefined,
        dailyRate: listing.dailyRate || undefined,
        deposit: listing.deposit || undefined,
        currency: listing.currency,
      },
      serviceOfferings: {
        withDriver: listing.withDriver,
        withDriverCost: listing.withDriverCost || undefined,
        withDriverHourlyRate: listing.withDriverHourlyRate || undefined,
        withDriverDailyRate: listing.withDriverDailyRate || undefined,
        withoutDriver: listing.withoutDriver,
      },
      photos: listing.photos,
      tags: listing.tags,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    }));
  }

  /**
   * Upload photos for a listing
   * Returns array of file paths
   */
  async uploadPhotos(files: Array<{ buffer: Buffer; filename: string }>): Promise<string[]> {
    // Ensure upload directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    const uploadedPaths: string[] = [];

    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.filename}`;
      const filepath = path.join(this.uploadDir, filename);

      // Write file to disk
      await fs.writeFile(filepath, file.buffer);

      uploadedPaths.push(filepath);
    }

    logger.info('Photos uploaded', { count: files.length });

    return uploadedPaths;
  }

  /**
   * Validate vehicle listing data
   */
  private validateVehicleListingData(data: VehicleListingCreateData): void {
    if (!data.title || data.title.trim() === '') {
      throw new Error('TITLE_REQUIRED');
    }

    if (!data.description || data.description.trim() === '') {
      throw new Error('DESCRIPTION_REQUIRED');
    }

    if (!data.vehicleType) {
      throw new Error('VEHICLE_TYPE_REQUIRED');
    }

    if (!data.capacity || data.capacity <= 0) {
      throw new Error('CAPACITY_MUST_BE_POSITIVE');
    }

    if (!data.fuelType) {
      throw new Error('FUEL_TYPE_REQUIRED');
    }

    if (!data.city || data.city.trim() === '') {
      throw new Error('CITY_REQUIRED');
    }

    if (!data.fylke || data.fylke.trim() === '') {
      throw new Error('FYLKE_REQUIRED');
    }

    if (!data.kommune || data.kommune.trim() === '') {
      throw new Error('KOMMUNE_REQUIRED');
    }
  }

  /**
   * Create a new driver listing
   * Note: Driver listings cannot be published (status remains SUSPENDED) until license documents are uploaded
   */
  async createDriverListing(data: DriverListingCreateData): Promise<DriverListing> {
    // Validate required fields
    this.validateDriverListingData(data);

    // Validate pricing - at least one rate must be provided
    if (!data.hourlyRate && !data.dailyRate) {
      throw new Error('AT_LEAST_ONE_RATE_REQUIRED');
    }

    // Determine initial status based on license document
    // If no license document is provided, listing starts as SUSPENDED (cannot be published)
    const status = data.licenseDocumentPath ? ListingStatus.ACTIVE : ListingStatus.SUSPENDED;

    // Create the listing
    const listing = await prisma.driverListing.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        licenseClass: data.licenseClass,
        languages: data.languages,
        backgroundSummary: data.backgroundSummary,
        hourlyRate: data.hourlyRate,
        dailyRate: data.dailyRate,
        currency: data.currency || 'NOK',
        licenseDocumentPath: data.licenseDocumentPath,
        verified: false, // Starts unverified, requires admin verification
        status,
      },
    });

    logger.info('Driver listing created', { 
      listingId: listing.id, 
      companyId: data.companyId,
      status,
      hasLicenseDocument: !!data.licenseDocumentPath 
    });

    return listing;
  }

  /**
   * Update an existing driver listing
   */
  async updateDriverListing(listingId: string, data: DriverListingUpdateData): Promise<DriverListing> {
    // Check if listing exists
    const existingListing = await prisma.driverListing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Validate updated fields
    if (data.name !== undefined && data.name.trim() === '') {
      throw new Error('NAME_REQUIRED');
    }

    if (data.licenseClass !== undefined && data.licenseClass.trim() === '') {
      throw new Error('LICENSE_CLASS_REQUIRED');
    }

    if (data.languages !== undefined && data.languages.length === 0) {
      throw new Error('AT_LEAST_ONE_LANGUAGE_REQUIRED');
    }

    // Update the listing
    const updatedListing = await prisma.driverListing.update({
      where: { id: listingId },
      data,
    });

    logger.info('Driver listing updated', { listingId, updatedFields: Object.keys(data) });

    return updatedListing;
  }

  /**
   * Delete a driver listing
   */
  async deleteDriverListing(listingId: string): Promise<void> {
    // Check if listing exists
    const listing = await prisma.driverListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Check if there are any active bookings for this listing
    const activeBookings = await prisma.booking.count({
      where: {
        driverListingId: listingId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'ACTIVE'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new Error('CANNOT_DELETE_LISTING_WITH_ACTIVE_BOOKINGS');
    }

    // Delete the listing
    await prisma.driverListing.delete({
      where: { id: listingId },
    });

    logger.info('Driver listing deleted', { listingId });
  }

  /**
   * Verify a driver listing (admin only)
   * Sets verified flag to true and displays verification badge
   */
  async verifyDriverListing(listingId: string, adminUserId: string): Promise<DriverListing> {
    // Check if listing exists
    const listing = await prisma.driverListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Check if license document is uploaded
    if (!listing.licenseDocumentPath) {
      throw new Error('LICENSE_DOCUMENT_REQUIRED_FOR_VERIFICATION');
    }

    // Verify the driver
    const verifiedListing = await prisma.driverListing.update({
      where: { id: listingId },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        // If listing was suspended due to missing license, activate it now
        status: listing.status === ListingStatus.SUSPENDED ? ListingStatus.ACTIVE : listing.status,
      },
    });

    logger.info('Driver listing verified', { listingId, adminUserId });

    return verifiedListing;
  }

  /**
   * Upload license document for a driver listing
   * Returns the file path
   */
  async uploadLicenseDocument(file: { buffer: Buffer; filename: string }): Promise<string> {
    // Ensure upload directory exists
    const licenseDir = path.join(this.uploadDir, 'licenses');
    await fs.mkdir(licenseDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.filename}`;
    const filepath = path.join(licenseDir, filename);

    // Write file to disk
    await fs.writeFile(filepath, file.buffer);

    logger.info('License document uploaded', { filepath });

    return filepath;
  }

  /**
   * Update driver listing status (ACTIVE, SUSPENDED, REMOVED)
   */
  async updateDriverListingStatus(listingId: string, status: ListingStatus): Promise<DriverListing> {
    // Check if listing exists
    const listing = await prisma.driverListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new Error('LISTING_NOT_FOUND');
    }

    // Cannot activate a listing without license document
    if (status === ListingStatus.ACTIVE && !listing.licenseDocumentPath) {
      throw new Error('CANNOT_ACTIVATE_LISTING_WITHOUT_LICENSE_DOCUMENT');
    }

    // Update status
    const updatedListing = await prisma.driverListing.update({
      where: { id: listingId },
      data: { status },
    });

    logger.info('Driver listing status updated', { listingId, status });

    return updatedListing;
  }

  /**
   * Get driver listing by ID
   */
  async getDriverListingById(listingId: string): Promise<any | null> {
    const listing = await prisma.driverListing.findUnique({
      where: { id: listingId },
      include: {
        company: true,
      },
    });

    if (!listing) {
      return null;
    }

    // Transform flat database structure to nested frontend structure
    return {
      id: listing.id,
      companyId: listing.companyId,
      name: listing.name,
      backgroundSummary: listing.backgroundSummary,
      licenseClass: listing.licenseClass,
      languages: listing.languages,
      verified: listing.verified,
      pricing: {
        hourlyRate: listing.hourlyRate || undefined,
        dailyRate: listing.dailyRate || undefined,
        currency: listing.currency,
      },
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      company: listing.company,
    };
  }

  /**
   * Get all driver listings for a company
   */
  async getCompanyDriverListings(companyId: string): Promise<any[]> {
    const listings = await prisma.driverListing.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    // Transform flat database structure to nested frontend structure
    return listings.map(listing => ({
      id: listing.id,
      companyId: listing.companyId,
      name: listing.name,
      licenseClass: listing.licenseClass,
      languages: listing.languages,
      backgroundSummary: listing.backgroundSummary || undefined,
      pricing: {
        hourlyRate: listing.hourlyRate || undefined,
        dailyRate: listing.dailyRate || undefined,
        currency: listing.currency,
      },
      verified: listing.verified,
      verifiedAt: listing.verifiedAt?.toISOString(),
      aggregatedRating: listing.aggregatedRating || undefined,
      totalRatings: listing.totalRatings,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    }));
  }

  /**
   * Validate driver listing data
   */
  private validateDriverListingData(data: DriverListingCreateData): void {
    if (!data.name || data.name.trim() === '') {
      throw new Error('NAME_REQUIRED');
    }

    if (!data.licenseClass || data.licenseClass.trim() === '') {
      throw new Error('LICENSE_CLASS_REQUIRED');
    }

    if (!data.languages || data.languages.length === 0) {
      throw new Error('AT_LEAST_ONE_LANGUAGE_REQUIRED');
    }
  }

  /**
   * Search listings with filters
   * Implements filter conjunction (AND logic) for all filters
   */
  async searchListings(filters: SearchFilters): Promise<SearchResult> {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const skip = (page - 1) * pageSize;

    let vehicleListings: VehicleListing[] = [];
    let driverListings: DriverListing[] = [];
    let totalVehicles = 0;
    let totalDrivers = 0;

    // Determine which listing types to search
    const searchVehicles = !filters.listingType || filters.listingType === 'vehicle' || filters.listingType === 'vehicle_driver';
    const searchDrivers = !filters.listingType || filters.listingType === 'driver' || filters.listingType === 'vehicle_driver';

    // Build vehicle listing query
    if (searchVehicles) {
      const vehicleWhere: any = {
        status: ListingStatus.ACTIVE, // Only return active listings
      };

      // Location filters
      if (filters.location) {
        if (filters.location.fylke) {
          vehicleWhere.fylke = filters.location.fylke;
        }
        if (filters.location.kommune) {
          vehicleWhere.kommune = filters.location.kommune;
        }
        // Radius search with coordinates
        if (filters.location.radius && filters.location.coordinates) {
          // We'll filter by radius after fetching results
          vehicleWhere.latitude = { not: null };
          vehicleWhere.longitude = { not: null };
        }
      }

      // Vehicle type filter
      if (filters.vehicleType && filters.vehicleType.length > 0) {
        vehicleWhere.vehicleType = { in: filters.vehicleType };
      }

      // Fuel type filter
      if (filters.fuelType && filters.fuelType.length > 0) {
        vehicleWhere.fuelType = { in: filters.fuelType };
      }

      // Capacity filter
      if (filters.capacity) {
        if (filters.capacity.min !== undefined) {
          vehicleWhere.capacity = { ...vehicleWhere.capacity, gte: filters.capacity.min };
        }
        if (filters.capacity.max !== undefined) {
          vehicleWhere.capacity = { ...vehicleWhere.capacity, lte: filters.capacity.max };
        }
      }

      // Price range filter (check both hourly and daily rates)
      // At least one rate must be within the specified range
      if (filters.priceRange) {
        // Build condition for hourly rate in range
        const hourlyCondition: any = {};
        if (filters.priceRange.min !== undefined) {
          hourlyCondition.gte = filters.priceRange.min;
        }
        if (filters.priceRange.max !== undefined) {
          hourlyCondition.lte = filters.priceRange.max;
        }
        
        // Build condition for daily rate in range
        const dailyCondition: any = {};
        if (filters.priceRange.min !== undefined) {
          dailyCondition.gte = filters.priceRange.min;
        }
        if (filters.priceRange.max !== undefined) {
          dailyCondition.lte = filters.priceRange.max;
        }
        
        // At least one rate must be in range (OR logic)
        vehicleWhere.OR = [
          { hourlyRate: hourlyCondition },
          { dailyRate: dailyCondition },
        ];
      }

      // With/without driver filter
      if (filters.withDriver !== undefined) {
        if (filters.withDriver) {
          vehicleWhere.withDriver = true;
        } else {
          vehicleWhere.withoutDriver = true;
        }
      }

      // Tags filter (listing must have all specified tags)
      if (filters.tags && filters.tags.length > 0) {
        vehicleWhere.tags = { hasEvery: filters.tags };
      }

      // Fetch vehicle listings
      let allVehicleListings = await prisma.vehicleListing.findMany({
        where: vehicleWhere,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              verified: true,
              aggregatedRating: true,
            },
          },
        },
      });

      // Apply radius filter if specified
      if (filters.location?.radius && filters.location?.coordinates) {
        allVehicleListings = allVehicleListings.filter((listing) => {
          if (!listing.latitude || !listing.longitude) return false;
          const distance = this.calculateDistance(
            filters.location!.coordinates![1],
            filters.location!.coordinates![0],
            listing.latitude,
            listing.longitude
          );
          return distance <= filters.location!.radius!;
        });
      }

      // Apply date range filter (check for booking conflicts and availability blocks)
      if (filters.dateRange) {
        const availableListings: typeof allVehicleListings = [];
        for (const listing of allVehicleListings) {
          const hasBookingConflict = await this.hasBookingConflict(
            listing.id,
            filters.dateRange.start,
            filters.dateRange.end
          );
          const hasBlockConflict = await this.hasAvailabilityBlockConflict(
            listing.id,
            filters.dateRange.start,
            filters.dateRange.end
          );
          if (!hasBookingConflict && !hasBlockConflict) {
            availableListings.push(listing);
          }
        }
        allVehicleListings = availableListings;
      }

      // Sort results
      if (filters.sortBy) {
        allVehicleListings = this.sortVehicleListings(
          allVehicleListings,
          filters.sortBy,
          filters.sortOrder || 'asc',
          filters.location?.coordinates
        );
      }

      totalVehicles = allVehicleListings.length;
      vehicleListings = allVehicleListings.slice(skip, skip + pageSize);
    }

    // Build driver listing query
    if (searchDrivers) {
      const driverWhere: any = {
        status: ListingStatus.ACTIVE, // Only return active listings
        verified: true, // Only return verified drivers
      };

      // Price range filter
      if (filters.priceRange) {
        const priceConditions: any[] = [];
        if (filters.priceRange.min !== undefined) {
          priceConditions.push({
            OR: [
              { hourlyRate: { gte: filters.priceRange.min } },
              { dailyRate: { gte: filters.priceRange.min } },
            ],
          });
        }
        if (filters.priceRange.max !== undefined) {
          priceConditions.push({
            OR: [
              { hourlyRate: { lte: filters.priceRange.max } },
              { dailyRate: { lte: filters.priceRange.max } },
            ],
          });
        }
        if (priceConditions.length > 0) {
          driverWhere.AND = priceConditions;
        }
      }

      // Fetch driver listings
      let allDriverListings = await prisma.driverListing.findMany({
        where: driverWhere,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              verified: true,
              aggregatedRating: true,
              fylke: true,
              kommune: true,
            },
          },
        },
      });

      // Apply location filters (based on company location)
      if (filters.location) {
        if (filters.location.fylke) {
          allDriverListings = allDriverListings.filter(
            (listing: any) => listing.company.fylke === filters.location!.fylke
          );
        }
        if (filters.location.kommune) {
          allDriverListings = allDriverListings.filter(
            (listing: any) => listing.company.kommune === filters.location!.kommune
          );
        }
      }

      // Apply date range filter (check for booking conflicts and availability blocks)
      if (filters.dateRange) {
        const availableListings: typeof allDriverListings = [];
        for (const listing of allDriverListings) {
          const hasBookingConflict = await this.hasDriverBookingConflict(
            listing.id,
            filters.dateRange.start,
            filters.dateRange.end
          );
          const hasBlockConflict = await this.hasDriverAvailabilityBlockConflict(
            listing.id,
            filters.dateRange.start,
            filters.dateRange.end
          );
          if (!hasBookingConflict && !hasBlockConflict) {
            availableListings.push(listing);
          }
        }
        allDriverListings = availableListings;
      }

      // Sort results
      if (filters.sortBy) {
        allDriverListings = this.sortDriverListings(
          allDriverListings,
          filters.sortBy,
          filters.sortOrder || 'asc'
        );
      }

      totalDrivers = allDriverListings.length;
      driverListings = allDriverListings.slice(skip, skip + pageSize);
    }

    const total = totalVehicles + totalDrivers;
    const totalPages = Math.ceil(total / pageSize);

    logger.info('Search completed', {
      filters,
      totalVehicles,
      totalDrivers,
      total,
      page,
      pageSize,
    });

    return {
      vehicleListings,
      driverListings,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Check if a vehicle listing has booking conflicts in the specified date range
   */
  private async hasBookingConflict(
    listingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const conflictingBookings = await prisma.booking.count({
      where: {
        vehicleListingId: listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.ACTIVE],
        },
        OR: [
          // Booking starts during the requested period
          {
            startDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          // Booking ends during the requested period
          {
            endDate: {
              gt: startDate,
              lte: endDate,
            },
          },
          // Booking spans the entire requested period
          {
            startDate: {
              lte: startDate,
            },
            endDate: {
              gte: endDate,
            },
          },
        ],
      },
    });

    return conflictingBookings > 0;
  }

  /**
   * Check if a vehicle listing has availability block conflicts in the specified date range
   */
  private async hasAvailabilityBlockConflict(
    listingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    // Check manual availability blocks
    const manualBlocks = await prisma.availabilityBlock.count({
      where: {
        listingId,
        listingType: 'vehicle',
        isRecurring: false,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (manualBlocks > 0) {
      return true;
    }

    // Check recurring blocks
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType: 'vehicle',
        startDate: { lte: endDate },
        OR: [
          { endDate: { gte: startDate } },
          { endDate: null }, // Indefinite recurring blocks
        ],
      },
    });

    // Check if any recurring block generates instances in the date range
    for (const pattern of recurringBlocks) {
      const instances = this.generateRecurringInstancesForListing(
        pattern,
        startDate,
        endDate
      );
      if (instances.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate recurring instances for a pattern within a date range
   */
  private generateRecurringInstancesForListing(
    pattern: any,
    viewStart: Date,
    viewEnd: Date
  ): any[] {
    const instances: any[] = [];
    
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };
    
    const patternStart = normalizeDate(pattern.startDate);
    const viewStartNorm = normalizeDate(viewStart);
    const startDate = patternStart > viewStartNorm ? patternStart : viewStartNorm;
    
    const viewEndNorm = normalizeDate(viewEnd);
    const endDate = pattern.endDate 
      ? (normalizeDate(pattern.endDate) < viewEndNorm ? normalizeDate(pattern.endDate) : viewEndNorm)
      : viewEndNorm;

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (pattern.daysOfWeek.includes(dayOfWeek)) {
        instances.push({
          startDate: new Date(currentDate),
          endDate: new Date(currentDate),
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
  }

  /**
   * Check if a driver listing has booking conflicts in the specified date range
   */
  private async hasDriverBookingConflict(
    listingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const conflictingBookings = await prisma.booking.count({
      where: {
        driverListingId: listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.ACTIVE],
        },
        OR: [
          // Booking starts during the requested period
          {
            startDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          // Booking ends during the requested period
          {
            endDate: {
              gt: startDate,
              lte: endDate,
            },
          },
          // Booking spans the entire requested period
          {
            startDate: {
              lte: startDate,
            },
            endDate: {
              gte: endDate,
            },
          },
        ],
      },
    });

    return conflictingBookings > 0;
  }

  /**
   * Check if a driver listing has availability block conflicts in the specified date range
   */
  private async hasDriverAvailabilityBlockConflict(
    listingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    // Check manual availability blocks
    const manualBlocks = await prisma.availabilityBlock.count({
      where: {
        listingId,
        listingType: 'driver',
        isRecurring: false,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (manualBlocks > 0) {
      return true;
    }

    // Check recurring blocks
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType: 'driver',
        startDate: { lte: endDate },
        OR: [
          { endDate: { gte: startDate } },
          { endDate: null }, // Indefinite recurring blocks
        ],
      },
    });

    // Check if any recurring block generates instances in the date range
    for (const pattern of recurringBlocks) {
      const instances = this.generateRecurringInstancesForListing(
        pattern,
        startDate,
        endDate
      );
      if (instances.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Sort vehicle listings
   */
  private sortVehicleListings(
    listings: any[],
    sortBy: 'price' | 'rating' | 'distance',
    sortOrder: 'asc' | 'desc',
    coordinates?: [number, number]
  ): any[] {
    const sorted = [...listings];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'price') {
        // Use the lower of hourly or daily rate for comparison
        const priceA = Math.min(a.hourlyRate || Infinity, a.dailyRate || Infinity);
        const priceB = Math.min(b.hourlyRate || Infinity, b.dailyRate || Infinity);
        comparison = priceA - priceB;
      } else if (sortBy === 'rating') {
        const ratingA = a.company?.aggregatedRating || 0;
        const ratingB = b.company?.aggregatedRating || 0;
        comparison = ratingA - ratingB;
      } else if (sortBy === 'distance' && coordinates) {
        if (!a.latitude || !a.longitude) return 1;
        if (!b.latitude || !b.longitude) return -1;
        const distanceA = this.calculateDistance(
          coordinates[1],
          coordinates[0],
          a.latitude,
          a.longitude
        );
        const distanceB = this.calculateDistance(
          coordinates[1],
          coordinates[0],
          b.latitude,
          b.longitude
        );
        comparison = distanceA - distanceB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Sort driver listings
   */
  private sortDriverListings(
    listings: any[],
    sortBy: 'price' | 'rating' | 'distance',
    sortOrder: 'asc' | 'desc'
  ): any[] {
    const sorted = [...listings];

    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'price') {
        // Use the lower of hourly or daily rate for comparison
        const priceA = Math.min(a.hourlyRate || Infinity, a.dailyRate || Infinity);
        const priceB = Math.min(b.hourlyRate || Infinity, b.dailyRate || Infinity);
        comparison = priceA - priceB;
      } else if (sortBy === 'rating') {
        const ratingA = a.aggregatedRating || 0;
        const ratingB = b.aggregatedRating || 0;
        comparison = ratingA - ratingB;
      }
      // Note: distance sorting not applicable for drivers as they don't have coordinates

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }
}

export const listingService = new ListingService();
