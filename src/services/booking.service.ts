import { PrismaClient, BookingStatus } from '@prisma/client';
import type { Booking, PlatformConfig } from '@prisma/client';
import { logger } from '../config/logger';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { messagingService } from './messaging.service';

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
}

export interface CostBreakdown {
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
    // Validate that at least one listing is provided
    if (!data.vehicleListingId && !data.driverListingId) {
      throw new Error('AT_LEAST_ONE_LISTING_REQUIRED');
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
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

    // Check availability for vehicle
    if (data.vehicleListingId) {
      const hasConflict = await this.hasBookingConflict(
        data.vehicleListingId,
        'vehicle',
        data.startDate,
        data.endDate
      );

      if (hasConflict) {
        throw new Error('VEHICLE_NOT_AVAILABLE');
      }
    }

    // Check availability for driver
    if (data.driverListingId) {
      const hasConflict = await this.hasBookingConflict(
        data.driverListingId,
        'driver',
        data.startDate,
        data.endDate
      );

      if (hasConflict) {
        throw new Error('DRIVER_NOT_AVAILABLE');
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
   */
  private async hasBookingConflict(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const where: any = {
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
  async getBookingById(bookingId: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        vehicleListing: true,
        driverListing: true,
      },
    });
  }

  /**
   * Get bookings for a company (as renter or provider)
   */
  async getCompanyBookings(companyId: string): Promise<Booking[]> {
    return prisma.booking.findMany({
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
  }

  /**
   * Accept a booking request (provider only)
   * Generates a PDF contract summary upon acceptance
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

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.ACCEPTED,
        respondedAt: new Date(),
        contractPdfPath: contractPath,
      },
    });

    logger.info('Booking accepted', { bookingId, providerId, contractPath });

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

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newState,
        completedAt: newState === BookingStatus.COMPLETED ? new Date() : booking.completedAt,
      },
    });

    logger.info('Booking state transitioned', { bookingId, oldState: booking.status, newState });

    return updatedBooking;
  }

  /**
   * Generate a PDF contract for a booking
   * Returns the file path where the contract was saved
   */
  private async generateContract(bookingId: string, booking?: any): Promise<string> {
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
