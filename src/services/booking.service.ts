import { PrismaClient, BookingStatus, NotificationType } from '@prisma/client';
import type { Booking, PlatformConfig } from '@prisma/client';
import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { messagingService } from './messaging.service';
import { availabilityService } from './availability.service';
import { notificationService } from './notification.service';
import { featureToggleService } from './feature-toggle.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';

const prisma = new PrismaClient();

export interface BookingRequestData {
  renterCompanyId: string;
  providerCompanyId: string;
  vehicleListingId?: string;
  driverListingId?: string;
  startDate: Date;
  endDate: Date;
  durationHours?: number;
  durationDays?: number;
  pickupLocation?: {
    region?: string;
    address?: string;
    coordinates?: { lat: number; lng: number; };
  };
  paymentMethod?: string;
  totalAmount?: number;
}

export interface CostBreakdown {
  vehicleRate?: number;
  driverRate?: number;
  providerRate: number;
  platformCommission: number;
  platformCommissionRate: number;
  taxes: number;
  taxRate: number;
  total: number;
  currency: string;
}

export interface BookingTerms {
  startDate?: Date;
  endDate?: Date;
  providerRate?: number;
}

export class BookingService {
  /**
   * Get current platform configuration
   * Creates default config if none exists
   * For simplicity in testing, we maintain only one config record and update it
   */
  async getPlatformConfig(): Promise<PlatformConfig> {
    // Try to get the first (and should be only) config
    let config = await prisma.platformConfig.findFirst();

    // Create default config if none exists
    if (!config) {
      config = await prisma.platformConfig.create({
        data: {
          commissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '5'),
          taxRate: parseFloat(process.env.PLATFORM_TAX_RATE || '25'),
          bookingTimeoutHours: parseInt(process.env.BOOKING_TIMEOUT_HOURS || '24', 10),
          defaultCurrency: process.env.DEFAULT_CURRENCY || 'NOK',
        },
      });
      logger.info('Default platform configuration created', { config });
    }

    return config;
  }

  /**
   * Update platform configuration (admin only)
   */
  async updatePlatformConfig(updates: {
    commissionRate?: number;
    taxRate?: number;
    bookingTimeoutHours?: number;
    defaultCurrency?: string;
  }): Promise<PlatformConfig> {
    // Validate values
    if (updates.commissionRate !== undefined && (updates.commissionRate < 0 || updates.commissionRate > 100)) {
      throw new Error('INVALID_COMMISSION_RATE');
    }

    if (updates.taxRate !== undefined && (updates.taxRate < 0 || updates.taxRate > 100)) {
      throw new Error('INVALID_TAX_RATE');
    }

    if (updates.bookingTimeoutHours !== undefined && updates.bookingTimeoutHours <= 0) {
      throw new Error('INVALID_TIMEOUT_HOURS');
    }

    // Get or create current config
    let currentConfig = await this.getPlatformConfig();

    // Prepare update data - only include fields that are being updated
    const updateData: any = {};
    if (updates.commissionRate !== undefined) {
      updateData.commissionRate = updates.commissionRate;
    }
    if (updates.taxRate !== undefined) {
      updateData.taxRate = updates.taxRate;
    }
    if (updates.bookingTimeoutHours !== undefined) {
      updateData.bookingTimeoutHours = updates.bookingTimeoutHours;
    }
    if (updates.defaultCurrency !== undefined) {
      updateData.defaultCurrency = updates.defaultCurrency;
    }

    // Update the existing config (Prisma will automatically update updatedAt)
    const updatedConfig = await prisma.platformConfig.update({
      where: { id: currentConfig.id },
      data: updateData,
    });

    logger.info('Platform configuration updated', { 
      oldConfig: currentConfig, 
      newConfig: updatedConfig,
      updates 
    });

    return updatedConfig;
  }

  /**
   * Calculate costs for a booking
   * Formula: Total = Provider Rate + (Provider Rate × Commission Rate) + ((Provider Rate + Commission) × Tax Rate)
   * Commission is calculated on the pre-tax provider rate
   */
  async calculateCosts(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    duration: { hours?: number; days?: number }
  ): Promise<CostBreakdown> {
    // Get platform configuration
    const config = await this.getPlatformConfig();

    // Get listing and determine provider rate
    let providerRate = 0;
    let currency = config.defaultCurrency;

    if (listingType === 'vehicle') {
      const listing = await prisma.vehicleListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      currency = listing.currency;

      // Calculate provider rate based on duration
      if (duration.hours && listing.hourlyRate) {
        providerRate = listing.hourlyRate * duration.hours;
      } else if (duration.days && listing.dailyRate) {
        providerRate = listing.dailyRate * duration.days;
      } else {
        throw new Error('INVALID_DURATION_OR_RATE');
      }
    } else if (listingType === 'driver') {
      const listing = await prisma.driverListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        throw new Error('LISTING_NOT_FOUND');
      }

      currency = listing.currency;

      // Calculate provider rate based on duration
      if (duration.hours && listing.hourlyRate) {
        providerRate = listing.hourlyRate * duration.hours;
      } else if (duration.days && listing.dailyRate) {
        providerRate = listing.dailyRate * duration.days;
      } else {
        throw new Error('INVALID_DURATION_OR_RATE');
      }
    }

    // Calculate commission (on pre-tax provider rate)
    const platformCommission = providerRate * (config.commissionRate / 100);

    // Calculate taxes (on provider rate + commission)
    const subtotal = providerRate + platformCommission;
    const taxes = subtotal * (config.taxRate / 100);

    // Calculate total
    const total = subtotal + taxes;

    return {
      providerRate,
      platformCommission,
      platformCommissionRate: config.commissionRate,
      taxes,
      taxRate: config.taxRate,
      total,
      currency,
    };
  }

  /**
   * Create a booking request
   * Validates self-booking prevention and cross-company vehicle-driver validation
   * Blocks availability calendar on creation
   */
  async createBookingRequest(data: BookingRequestData): Promise<Booking> {
    // Feature toggle enforcement
    if (data.durationHours) {
      const hourlyBookingsEnabled = await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      if (!hourlyBookingsEnabled) {
        throw new Error('HOURLY_BOOKINGS_DISABLED');
      }
    }

    // Geographic restriction enforcement
    if (data.pickupLocation) {
      const { checkGeographicAccess } = await import('../middleware/geographic-restriction.middleware');
      const { RestrictionType, RegionType } = await import('@prisma/client');
      
      // Extract region from pickup location (simplified - in real implementation would use geocoding)
      const region = data.pickupLocation.region || 'Norway';
      const regionType = RegionType.COUNTRY;
      
      const hasBookingAccess = await checkGeographicAccess(region, regionType, RestrictionType.BOOKING_BLOCKED);
      if (!hasBookingAccess) {
        throw new Error(`BOOKING_BLOCKED_IN_REGION:${region}`);
      }
    }

    // Payment method validation (if payment method is specified)
    if (data.paymentMethod) {
      const { checkPaymentMethodAvailability } = await import('../middleware/payment-method-restriction.middleware');
      
      const region = data.pickupLocation?.region || 'Norway';
      const paymentCheck = await checkPaymentMethodAvailability(
        data.paymentMethod as any, // Type assertion for runtime compatibility
        region,
        data.totalAmount
      );
      
      if (!paymentCheck.allowed) {
        throw new Error(`PAYMENT_METHOD_NOT_AVAILABLE:${paymentCheck.reason}`);
      }
    }

    // Validate that at least one listing is provided
    if (!data.vehicleListingId && !data.driverListingId) {
      throw new Error('AT_LEAST_ONE_LISTING_REQUIRED');
    }

    // Validate dates (allow same-day bookings where start equals end)
    if (data.startDate > data.endDate) {
      throw new Error('INVALID_DATE_RANGE');
    }

    // Validate duration
    if (!data.durationHours && !data.durationDays) {
      throw new Error('DURATION_REQUIRED');
    }

    // Self-booking prevention: Check if renter company is the same as provider company
    if (data.renterCompanyId === data.providerCompanyId) {
      throw new Error('SELF_BOOKING_NOT_ALLOWED');
    }

    // Get vehicle listing if provided
    let vehicleListing = null;
    if (data.vehicleListingId) {
      vehicleListing = await prisma.vehicleListing.findUnique({
        where: { id: data.vehicleListingId },
      });

      if (!vehicleListing) {
        throw new Error('VEHICLE_LISTING_NOT_FOUND');
      }

      // Verify provider company matches
      if (vehicleListing.companyId !== data.providerCompanyId) {
        throw new Error('VEHICLE_PROVIDER_MISMATCH');
      }
    }

    // Get driver listing if provided
    let driverListing = null;
    if (data.driverListingId) {
      driverListing = await prisma.driverListing.findUnique({
        where: { id: data.driverListingId },
      });

      if (!driverListing) {
        throw new Error('DRIVER_LISTING_NOT_FOUND');
      }

      // Verify provider company matches
      if (driverListing.companyId !== data.providerCompanyId) {
        throw new Error('DRIVER_PROVIDER_MISMATCH');
      }
    }

    // Cross-company vehicle-driver validation
    // If both vehicle and driver are provided, they must be from the same company
    if (vehicleListing && driverListing) {
      if (vehicleListing.companyId !== driverListing.companyId) {
        throw new Error('CROSS_COMPANY_VEHICLE_DRIVER_NOT_ALLOWED');
      }
    }

    // Check availability for vehicle (includes both booking conflicts and availability blocks)
    if (data.vehicleListingId) {
      const availabilityResult = await availabilityService.checkAvailability({
        listingId: data.vehicleListingId,
        listingType: 'vehicle',
        startDate: data.startDate,
        endDate: data.endDate,
      });

      if (!availabilityResult.available) {
        // Check if any conflicts are due to availability blocks
        const hasBlockConflict = availabilityResult.conflicts.some(c => c.type === 'block');
        
        // Create detailed error message with conflict information
        const conflictDetails = availabilityResult.conflicts.map(c => {
          if (c.type === 'booking') {
            return `Booking conflict: ${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}${c.bookingNumber ? ` (${c.bookingNumber})` : ''}`;
          } else {
            return `Blocked: ${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}${c.reason ? ` - ${c.reason}` : ''}`;
          }
        }).join('; ');
        
        // If there's a block conflict, send automatic rejection notification
        if (hasBlockConflict) {
          await this.sendBlockedDatesRejectionNotification(
            data.renterCompanyId,
            data.vehicleListingId,
            'vehicle',
            data.startDate,
            data.endDate,
            conflictDetails
          );
        }
        
        const error: any = new Error('VEHICLE_NOT_AVAILABLE');
        error.conflicts = availabilityResult.conflicts;
        error.details = conflictDetails;
        throw error;
      }
    }

    // Check availability for driver (includes both booking conflicts and availability blocks)
    if (data.driverListingId) {
      const availabilityResult = await availabilityService.checkAvailability({
        listingId: data.driverListingId,
        listingType: 'driver',
        startDate: data.startDate,
        endDate: data.endDate,
      });

      if (!availabilityResult.available) {
        // Check if any conflicts are due to availability blocks
        const hasBlockConflict = availabilityResult.conflicts.some(c => c.type === 'block');
        
        // Create detailed error message with conflict information
        const conflictDetails = availabilityResult.conflicts.map(c => {
          if (c.type === 'booking') {
            return `Booking conflict: ${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}${c.bookingNumber ? ` (${c.bookingNumber})` : ''}`;
          } else {
            return `Blocked: ${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}${c.reason ? ` - ${c.reason}` : ''}`;
          }
        }).join('; ');
        
        // If there's a block conflict, send automatic rejection notification
        if (hasBlockConflict) {
          await this.sendBlockedDatesRejectionNotification(
            data.renterCompanyId,
            data.driverListingId,
            'driver',
            data.startDate,
            data.endDate,
            conflictDetails
          );
        }
        
        const error: any = new Error('DRIVER_NOT_AVAILABLE');
        error.conflicts = availabilityResult.conflicts;
        error.details = conflictDetails;
        throw error;
      }
    }

    // Calculate costs
    let costs: CostBreakdown;
    if (data.vehicleListingId) {
      costs = await this.calculateCosts(
        data.vehicleListingId,
        'vehicle',
        { hours: data.durationHours, days: data.durationDays }
      );
    } else {
      costs = await this.calculateCosts(
        data.driverListingId!,
        'driver',
        { hours: data.durationHours, days: data.durationDays }
      );
    }

    // If both vehicle and driver, add driver costs
    if (data.vehicleListingId && data.driverListingId) {
      const driverCosts = await this.calculateCosts(
        data.driverListingId,
        'driver',
        { hours: data.durationHours, days: data.durationDays }
      );

      // Combine costs
      costs.providerRate += driverCosts.providerRate;
      costs.platformCommission += driverCosts.platformCommission;
      costs.taxes += driverCosts.taxes;
      costs.total += driverCosts.total;
    }

    // Get platform config for timeout
    const config = await this.getPlatformConfig();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.bookingTimeoutHours);

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber();

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        renterCompanyId: data.renterCompanyId,
        providerCompanyId: data.providerCompanyId,
        vehicleListingId: data.vehicleListingId,
        driverListingId: data.driverListingId,
        status: BookingStatus.PENDING,
        startDate: data.startDate,
        endDate: data.endDate,
        durationHours: data.durationHours,
        durationDays: data.durationDays,
        providerRate: costs.providerRate,
        platformCommission: costs.platformCommission,
        platformCommissionRate: costs.platformCommissionRate,
        taxes: costs.taxes,
        taxRate: costs.taxRate,
        total: costs.total,
        currency: costs.currency,
        expiresAt,
      },
    });

    logger.info('Booking request created', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      renterCompanyId: data.renterCompanyId,
      providerCompanyId: data.providerCompanyId,
      total: costs.total,
    });

    // Create message thread for the booking
    // Get user IDs from both companies to add as participants
    const renterUsers = await prisma.user.findMany({
      where: { companyId: data.renterCompanyId },
      select: { id: true },
    });

    const providerUsers = await prisma.user.findMany({
      where: { companyId: data.providerCompanyId },
      select: { id: true },
    });

    const participants = [
      ...renterUsers.map((u) => u.id),
      ...providerUsers.map((u) => u.id),
    ];

    await messagingService.createThread(booking.id, participants);

    return booking;
  }

  /**
   * Check if a listing has booking conflicts in the specified date range
   * This blocks the availability calendar
   * Includes PENDING, ACCEPTED, ACTIVE, and COMPLETED bookings
   */
  private async hasBookingConflict(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const where: any = {
      status: {
        in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.ACTIVE, BookingStatus.COMPLETED],
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
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    const conflictingBookings = await prisma.booking.count({ where });

    return conflictingBookings > 0;
  }

  /**
   * Generate a unique booking number
   */
  private async generateBookingNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BK-${timestamp}-${random}`;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<any | null> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
    });

    if (!booking) {
      return null;
    }

    // Transform flat database structure to nested frontend structure
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      renterCompanyId: booking.renterCompanyId,
      providerCompanyId: booking.providerCompanyId,
      vehicleListingId: booking.vehicleListingId || undefined,
      driverListingId: booking.driverListingId || undefined,
      status: booking.status,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      duration: {
        hours: booking.durationHours || undefined,
        days: booking.durationDays || undefined,
      },
      costs: {
        providerRate: booking.providerRate,
        platformCommission: booking.platformCommission,
        platformCommissionRate: booking.platformCommissionRate,
        taxes: booking.taxes,
        taxRate: booking.taxRate,
        total: booking.total,
        currency: booking.currency,
      },
      contractPdfPath: booking.contractPdfPath || undefined,
      requestedAt: booking.requestedAt.toISOString(),
      respondedAt: booking.respondedAt?.toISOString(),
      expiresAt: booking.expiresAt.toISOString(),
      completedAt: booking.completedAt?.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      // Include related entities
      renterCompany: booking.renterCompany,
      providerCompany: booking.providerCompany,
      vehicleListing: booking.vehicleListing ? {
        id: booking.vehicleListing.id,
        title: booking.vehicleListing.title,
        vehicleType: booking.vehicleListing.vehicleType,
        capacity: booking.vehicleListing.capacity,
        photos: booking.vehicleListing.photos,
      } : undefined,
      driverListing: booking.driverListing ? {
        id: booking.driverListing.id,
        name: booking.driverListing.name,
        licenseClass: booking.driverListing.licenseClass,
        languages: booking.driverListing.languages,
      } : undefined,
    };
  }

  /**
   * Get bookings for a company (as renter or provider)
   */
  async getCompanyBookings(companyId: string): Promise<any[]> {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { renterCompanyId: companyId },
          { providerCompanyId: companyId },
        ],
      },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform flat database structure to nested frontend structure
    return bookings.map(booking => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      renterCompanyId: booking.renterCompanyId,
      providerCompanyId: booking.providerCompanyId,
      vehicleListingId: booking.vehicleListingId || undefined,
      driverListingId: booking.driverListingId || undefined,
      status: booking.status,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      duration: {
        hours: booking.durationHours || undefined,
        days: booking.durationDays || undefined,
      },
      costs: {
        providerRate: booking.providerRate,
        platformCommission: booking.platformCommission,
        platformCommissionRate: booking.platformCommissionRate,
        taxes: booking.taxes,
        taxRate: booking.taxRate,
        total: booking.total,
        currency: booking.currency,
      },
      contractPdfPath: booking.contractPdfPath || undefined,
      requestedAt: booking.requestedAt.toISOString(),
      respondedAt: booking.respondedAt?.toISOString(),
      expiresAt: booking.expiresAt.toISOString(),
      completedAt: booking.completedAt?.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      // Include related entities
      renterCompany: booking.renterCompany,
      providerCompany: booking.providerCompany,
      vehicleListing: booking.vehicleListing ? {
        id: booking.vehicleListing.id,
        title: booking.vehicleListing.title,
        vehicleType: booking.vehicleListing.vehicleType,
        capacity: booking.vehicleListing.capacity,
        photos: booking.vehicleListing.photos,
      } : undefined,
      driverListing: booking.driverListing ? {
        id: booking.driverListing.id,
        name: booking.driverListing.name,
        licenseClass: booking.driverListing.licenseClass,
        languages: booking.driverListing.languages,
      } : undefined,
    }));
  }

  /**
   * Accept a booking request (provider only)
   * Generates a PDF contract summary upon acceptance
   * Automatically updates availability calendar
   */
  async acceptBooking(bookingId: string, providerId: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.providerCompanyId !== providerId) {
      throw new Error('UNAUTHORIZED');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('INVALID_BOOKING_STATUS');
    }

    // Check if booking has expired
    if (new Date() > booking.expiresAt) {
      throw new Error('BOOKING_EXPIRED');
    }

    // Generate contract PDF
    const contractPath = await this.generateContract(bookingId, booking);

    // Get a user from the provider company to use as createdBy
    const providerUser = await prisma.user.findFirst({
      where: { companyId: providerId },
    });

    if (!providerUser) {
      throw new Error('PROVIDER_USER_NOT_FOUND');
    }

    // Use transaction to ensure booking acceptance and availability update are atomic
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.ACCEPTED,
          respondedAt: new Date(),
          contractPdfPath: contractPath,
        },
      });

      // Automatically update availability calendar for vehicle
      if (booking.vehicleListingId) {
        await tx.availabilityBlock.create({
          data: {
            listingId: booking.vehicleListingId,
            listingType: 'vehicle',
            startDate: booking.startDate,
            endDate: booking.endDate,
            reason: `Booking ${booking.bookingNumber}`,
            isRecurring: false,
            createdBy: providerUser.id,
          },
        });
      }

      // Automatically update availability calendar for driver
      if (booking.driverListingId) {
        await tx.availabilityBlock.create({
          data: {
            listingId: booking.driverListingId,
            listingType: 'driver',
            startDate: booking.startDate,
            endDate: booking.endDate,
            reason: `Booking ${booking.bookingNumber}`,
            isRecurring: false,
            createdBy: providerUser.id,
          },
        });
      }

      return updated;
    });

    logger.info('Booking accepted and availability updated', { bookingId, providerId, contractPath });

    return updatedBooking;
  }

  /**
   * Decline a booking request (provider only)
   */
  async declineBooking(bookingId: string, providerId: string, reason?: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.providerCompanyId !== providerId) {
      throw new Error('UNAUTHORIZED');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('INVALID_BOOKING_STATUS');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        respondedAt: new Date(),
      },
    });

    logger.info('Booking declined', { bookingId, providerId, reason });

    return updatedBooking;
  }

  /**
   * Cancel a booking and restore availability
   * Can be called by either renter or provider
   * Automatically removes availability blocks created for this booking
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
      },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Verify user has permission (must be from renter or provider company)
    const userCompany = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!userCompany) {
      throw new Error('USER_NOT_FOUND');
    }

    if (
      userCompany.companyId !== booking.renterCompanyId &&
      userCompany.companyId !== booking.providerCompanyId
    ) {
      throw new Error('UNAUTHORIZED');
    }

    // Can only cancel PENDING, ACCEPTED, or ACTIVE bookings
    if (![BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.ACTIVE].includes(booking.status as any)) {
      throw new Error('INVALID_BOOKING_STATUS');
    }

    // Use transaction to ensure booking cancellation and availability restoration are atomic
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          respondedAt: new Date(),
        },
      });

      // If booking was ACCEPTED or ACTIVE, remove the availability blocks
      if (booking.status === BookingStatus.ACCEPTED || booking.status === BookingStatus.ACTIVE) {
        // Remove availability block for vehicle
        if (booking.vehicleListingId) {
          await tx.availabilityBlock.deleteMany({
            where: {
              listingId: booking.vehicleListingId,
              listingType: 'vehicle',
              startDate: booking.startDate,
              endDate: booking.endDate,
              reason: `Booking ${booking.bookingNumber}`,
            },
          });
        }

        // Remove availability block for driver
        if (booking.driverListingId) {
          await tx.availabilityBlock.deleteMany({
            where: {
              listingId: booking.driverListingId,
              listingType: 'driver',
              startDate: booking.startDate,
              endDate: booking.endDate,
              reason: `Booking ${booking.bookingNumber}`,
            },
          });
        }
      }

      return updated;
    });

    logger.info('Booking cancelled and availability restored', { bookingId, userId, reason });

    return updatedBooking;
  }

  /**
   * Propose new terms for a booking (provider only)
   */
  async proposeNewTerms(
    bookingId: string,
    providerId: string,
    newTerms: BookingTerms
  ): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.providerCompanyId !== providerId) {
      throw new Error('UNAUTHORIZED');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('INVALID_BOOKING_STATUS');
    }

    // For now, we'll just log the proposed terms
    // In a full implementation, this would create a counter-offer that the renter can accept/reject
    logger.info('New terms proposed', { bookingId, providerId, newTerms });

    // Return the booking unchanged for now
    return booking;
  }

  /**
   * Auto-expire pending bookings that have passed their timeout
   * This should be run periodically (e.g., via cron job)
   */
  async autoExpireBookings(): Promise<number> {
    const now = new Date();

    const result = await prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
      },
    });

    logger.info('Auto-expired bookings', { count: result.count });

    return result.count;
  }

  /**
   * Transition booking state
   * Handles availability calendar updates for state transitions
   */
  async transitionBookingState(bookingId: string, newState: BookingStatus): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Validate state transition
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED],
      [BookingStatus.ACCEPTED]: [BookingStatus.ACTIVE, BookingStatus.CANCELLED],
      [BookingStatus.ACTIVE]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED, BookingStatus.CANCELLED],
      [BookingStatus.COMPLETED]: [BookingStatus.CLOSED, BookingStatus.DISPUTED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.DISPUTED]: [BookingStatus.CLOSED, BookingStatus.CANCELLED],
      [BookingStatus.CLOSED]: [],
    };

    if (!validTransitions[booking.status].includes(newState)) {
      throw new Error('INVALID_STATE_TRANSITION');
    }

    // Use transaction for state transition and availability updates
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: newState,
          completedAt: newState === BookingStatus.COMPLETED ? new Date() : booking.completedAt,
        },
      });

      // When transitioning to COMPLETED, keep the availability blocks for historical reference
      // They remain in the calendar to show past bookings
      // No action needed here as blocks are already created when booking was accepted

      // When transitioning to CANCELLED from ACCEPTED or ACTIVE, remove availability blocks
      if (
        newState === BookingStatus.CANCELLED &&
        (booking.status === BookingStatus.ACCEPTED || booking.status === BookingStatus.ACTIVE)
      ) {
        // Remove availability block for vehicle
        if (booking.vehicleListingId) {
          await tx.availabilityBlock.deleteMany({
            where: {
              listingId: booking.vehicleListingId,
              listingType: 'vehicle',
              startDate: booking.startDate,
              endDate: booking.endDate,
              reason: `Booking ${booking.bookingNumber}`,
            },
          });
        }

        // Remove availability block for driver
        if (booking.driverListingId) {
          await tx.availabilityBlock.deleteMany({
            where: {
              listingId: booking.driverListingId,
              listingType: 'driver',
              startDate: booking.startDate,
              endDate: booking.endDate,
              reason: `Booking ${booking.bookingNumber}`,
            },
          });
        }
      }

      return updated;
    });

    logger.info('Booking state transitioned', { bookingId, oldState: booking.status, newState });

    return updatedBooking;
  }

  /**
   * Send automatic rejection notification when booking request is for blocked dates
   */
  private async sendBlockedDatesRejectionNotification(
    renterCompanyId: string,
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date,
    conflictDetails: string
  ): Promise<void> {
    try {
      // Get a user from the renter company to send notification to
      const renterUser = await prisma.user.findFirst({
        where: { companyId: renterCompanyId },
      });

      if (!renterUser) {
        logger.warn('No user found for renter company, skipping rejection notification', {
          renterCompanyId,
        });
        return;
      }

      // Get listing details for the notification
      let listingTitle = 'Unknown listing';
      if (listingType === 'vehicle') {
        const listing = await prisma.vehicleListing.findUnique({
          where: { id: listingId },
          select: { title: true },
        });
        if (listing) {
          listingTitle = listing.title;
        }
      } else {
        const listing = await prisma.driverListing.findUnique({
          where: { id: listingId },
          select: { name: true },
        });
        if (listing) {
          listingTitle = listing.name;
        }
      }

      await notificationService.sendNotification(renterUser.id, {
        type: NotificationType.BOOKING_REJECTED_BLOCKED_DATES,
        title: 'Booking Request Rejected - Dates Not Available',
        message: `Your booking request for ${listingTitle} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} was automatically rejected because the dates are blocked by the provider. ${conflictDetails}`,
        metadata: {
          listingId,
          listingType,
          listingTitle,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          conflictDetails,
        },
      });

      logger.info('Blocked dates rejection notification sent', {
        renterCompanyId,
        listingId,
        listingType,
      });
    } catch (error) {
      logger.error('Failed to send blocked dates rejection notification', {
        renterCompanyId,
        listingId,
        listingType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - notification failure shouldn't break the booking flow
    }
  }

  /**
   * Generate a PDF contract for a booking
   * Returns the file path where the contract was saved
   */
  async generateContract(bookingId: string, booking?: any): Promise<string> {
    // Fetch booking with relations if not provided
    if (!booking) {
      booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          renterCompany: true,
          providerCompany: true,
          vehicleListing: true,
          driverListing: true,
        },
      });

      if (!booking) {
        throw new Error('BOOKING_NOT_FOUND');
      }
    }

    // Ensure contracts directory exists
    const contractsDir = path.join(process.cwd(), 'uploads', 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Generate filename
    const filename = `contract-${booking.bookingNumber}-${Date.now()}.pdf`;
    const filepath = path.join(contractsDir, filename);

    // Create PDF document
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('RENTAL CONTRACT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Booking Number: ${booking.bookingNumber}`, { align: 'center' });
        doc.moveDown(2);

        // Provider Information
        doc.fontSize(14).text('Provider:', { underline: true });
        doc.fontSize(10);
        doc.text(`Company: ${booking.providerCompany.name}`);
        doc.text(`Organization Number: ${booking.providerCompany.organizationNumber}`);
        doc.text(`Address: ${booking.providerCompany.businessAddress}, ${booking.providerCompany.city}`);
        doc.moveDown();

        // Renter Information
        doc.fontSize(14).text('Renter:', { underline: true });
        doc.fontSize(10);
        doc.text(`Company: ${booking.renterCompany.name}`);
        doc.text(`Organization Number: ${booking.renterCompany.organizationNumber}`);
        doc.text(`Address: ${booking.renterCompany.businessAddress}, ${booking.renterCompany.city}`);
        doc.moveDown();

        // Rental Details
        doc.fontSize(14).text('Rental Details:', { underline: true });
        doc.fontSize(10);
        
        if (booking.vehicleListing) {
          doc.text(`Vehicle: ${booking.vehicleListing.title}`);
          doc.text(`Type: ${booking.vehicleListing.vehicleType}`);
          doc.text(`Capacity: ${booking.vehicleListing.capacity} pallets`);
        }
        
        if (booking.driverListing) {
          doc.text(`Driver: ${booking.driverListing.name}`);
          doc.text(`License Class: ${booking.driverListing.licenseClass}`);
        }

        doc.text(`Start Date: ${booking.startDate.toLocaleDateString()}`);
        doc.text(`End Date: ${booking.endDate.toLocaleDateString()}`);
        
        if (booking.durationDays) {
          doc.text(`Duration: ${booking.durationDays} days`);
        } else if (booking.durationHours) {
          doc.text(`Duration: ${booking.durationHours} hours`);
        }
        doc.moveDown();

        // Financial Details
        doc.fontSize(14).text('Financial Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Provider Rate: ${booking.providerRate.toFixed(2)} ${booking.currency}`);
        doc.text(`Platform Commission (${booking.platformCommissionRate}%): ${booking.platformCommission.toFixed(2)} ${booking.currency}`);
        doc.text(`Taxes (${booking.taxRate}%): ${booking.taxes.toFixed(2)} ${booking.currency}`);
        doc.fontSize(12).text(`Total: ${booking.total.toFixed(2)} ${booking.currency}`, { underline: true });
        doc.moveDown();

        // Terms
        doc.fontSize(14).text('Terms and Conditions:', { underline: true });
        doc.fontSize(9);
        doc.text('1. This contract is binding upon acceptance by the provider.');
        doc.text('2. Payment terms are as agreed between parties.');
        doc.text('3. Cancellation policies apply as per platform terms.');
        doc.text('4. Both parties agree to comply with Norwegian transport regulations.');
        doc.moveDown();

        // Footer
        doc.fontSize(8);
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.text('Vider Transport Marketplace', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          logger.info('Contract PDF generated', { bookingId, filepath });
          resolve(filepath);
        });

        stream.on('error', (error) => {
          logger.error('Error generating contract PDF', { bookingId, error });
          reject(error);
        });
      } catch (error) {
        logger.error('Error creating PDF document', { bookingId, error });
        reject(error);
      }
    });
  }
}

export const bookingService = new BookingService();
