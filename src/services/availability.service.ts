import { PrismaClient, BookingStatus, NotificationType } from '@prisma/client';
import { logger } from '../config/logger';
import { notificationService } from './notification.service';

// Type definitions for our models
type AvailabilityBlock = {
  id: string;
  listingId: string;
  listingType: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  isRecurring: boolean;
  recurringBlockId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type RecurringBlock = {
  id: string;
  listingId: string;
  listingType: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
  reason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const prisma = new PrismaClient() as any;

export interface CreateBlockInput {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdBy: string;
}

export interface CreateRecurringBlockInput {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  startDate: Date;
  endDate?: Date; // null means indefinite
  reason?: string;
  createdBy: string;
}

export interface UpdateRecurringBlockInput {
  daysOfWeek?: number[];
  endDate?: Date;
  reason?: string;
  scope: 'all' | 'future'; // Update all instances or only future ones
  updateDate: Date; // Reference date for 'future' scope
}

export interface AvailabilityQuery {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
}

export interface ConflictDetail {
  type: 'block' | 'booking';
  startDate: Date;
  endDate: Date;
  reason?: string;
  bookingNumber?: string;
  bookingId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: ConflictDetail[];
}

export interface BulkBlockRequest {
  listingIds: string[];
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdBy: string;
}

export interface BulkBlockResult {
  successful: string[]; // listing IDs
  failed: Array<{
    listingId: string;
    reason: string;
    conflicts: ConflictDetail[];
  }>;
}

export class AvailabilityService {
  /**
   * Create an availability block
   * Validates date range and checks for conflicts with accepted/active bookings
   * Notifies provider of conflicts with pending booking requests
   */
  async createBlock(input: CreateBlockInput): Promise<AvailabilityBlock> {
    // Validate date range: start date must be <= end date
    if (input.startDate > input.endDate) {
      throw new Error('INVALID_DATE_RANGE');
    }

    // Check for conflicts with accepted or active bookings
    const conflicts = await this.checkBookingConflicts(
      input.listingId,
      input.listingType,
      input.startDate,
      input.endDate
    );

    if (conflicts.length > 0) {
      const error: any = new Error('BOOKING_CONFLICT');
      error.conflicts = conflicts;
      throw error;
    }

    // Check for pending booking requests that would conflict
    const pendingConflicts = await this.checkPendingBookingConflicts(
      input.listingId,
      input.listingType,
      input.startDate,
      input.endDate
    );

    // Create the availability block
    const block = await prisma.availabilityBlock.create({
      data: {
        listingId: input.listingId,
        listingType: input.listingType,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        isRecurring: false,
        createdBy: input.createdBy,
      },
    });

    // Send conflict notifications for pending bookings
    if (pendingConflicts.length > 0) {
      await this.notifyPendingBookingConflicts(input.createdBy, block, pendingConflicts);
    }

    logger.info('Availability block created', {
      blockId: block.id,
      listingId: input.listingId,
      listingType: input.listingType,
      startDate: input.startDate,
      endDate: input.endDate,
      pendingConflicts: pendingConflicts.length,
    });

    return block;
  }

  /**
   * Check for conflicts with existing bookings
   * Returns bookings that overlap with the specified date range
   */
  private async checkBookingConflicts(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<ConflictDetail[]> {
    // Check for any overlap: two periods overlap if one starts before or at the same time the other ends
    // AND one ends after or at the same time the other starts
    const where: any = {
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.ACTIVE],
      },
      AND: [
        // Booking starts before or at the block end
        {
          startDate: {
            lte: endDate,
          },
        },
        // Booking ends after or at the block start
        {
          endDate: {
            gte: startDate,
          },
        },
      ],
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    const conflictingBookings = await prisma.booking.findMany({ where });

    return conflictingBookings.map((booking) => ({
      type: 'booking' as const,
      startDate: booking.startDate,
      endDate: booking.endDate,
      bookingNumber: booking.bookingNumber,
      bookingId: booking.id,
    }));
  }

  /**
   * Check for pending booking requests that would conflict with a date range
   * Returns pending bookings that overlap with the specified date range
   */
  private async checkPendingBookingConflicts(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Check for any overlap: two periods overlap if one starts before or at the same time the other ends
    // AND one ends after or at the same time the other starts
    const where: any = {
      status: BookingStatus.PENDING,
      AND: [
        // Booking starts before or at the block end
        {
          startDate: {
            lte: endDate,
          },
        },
        // Booking ends after or at the block start
        {
          endDate: {
            gte: startDate,
          },
        },
      ],
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    return prisma.booking.findMany({
      where,
      include: {
        renterCompany: true,
      },
    });
  }

  /**
   * Send conflict notifications to provider for pending bookings
   */
  private async notifyPendingBookingConflicts(
    userId: string,
    block: AvailabilityBlock,
    pendingBookings: any[]
  ): Promise<void> {
    for (const booking of pendingBookings) {
      try {
        await notificationService.sendNotification(userId, {
          type: NotificationType.AVAILABILITY_CONFLICT,
          title: 'Availability Block Conflicts with Pending Booking',
          message: `Your availability block from ${block.startDate.toLocaleDateString()} to ${block.endDate.toLocaleDateString()} conflicts with pending booking ${booking.bookingNumber} from ${booking.renterCompany.name}.`,
          metadata: {
            blockId: block.id,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            renterCompanyName: booking.renterCompany.name,
            blockStartDate: block.startDate.toISOString(),
            blockEndDate: block.endDate.toISOString(),
            bookingStartDate: booking.startDate.toISOString(),
            bookingEndDate: booking.endDate.toISOString(),
          },
        });

        logger.info('Conflict notification sent', {
          userId,
          blockId: block.id,
          bookingId: booking.id,
        });
      } catch (error) {
        logger.error('Failed to send conflict notification', {
          userId,
          blockId: block.id,
          bookingId: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Check availability for a listing in a date range
   * Returns availability status and any conflicts
   */
  async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    // Check manual blocks
    // Use inclusive comparison to detect overlaps (including same-day bookings/blocks)
    const manualBlocks = await prisma.availabilityBlock.findMany({
      where: {
        listingId: query.listingId,
        listingType: query.listingType,
        isRecurring: false,
        AND: [
          {
            startDate: { lte: query.endDate },
          },
          {
            endDate: { gte: query.startDate },
          },
        ],
      },
    });

    // Check recurring blocks and generate instances
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: {
        listingId: query.listingId,
        listingType: query.listingType,
        startDate: { lte: query.endDate },
        OR: [
          { endDate: { gte: query.startDate } },
          { endDate: null }, // Indefinite recurring blocks
        ],
      },
    });

    const recurringInstances: AvailabilityBlock[] = [];
    for (const pattern of recurringBlocks) {
      const instances = this.generateRecurringInstances(
        pattern,
        query.startDate,
        query.endDate
      );
      recurringInstances.push(...instances);
    }

    // Check bookings
    const bookingConflicts = await this.checkBookingConflicts(
      query.listingId,
      query.listingType,
      query.startDate,
      query.endDate
    );

    // Combine all conflicts
    const blockConflicts: ConflictDetail[] = manualBlocks.map((block) => ({
      type: 'block' as const,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason || undefined,
    }));

    const recurringConflicts: ConflictDetail[] = recurringInstances.map((block) => ({
      type: 'block' as const,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason || undefined,
    }));

    const allConflicts = [...blockConflicts, ...recurringConflicts, ...bookingConflicts];

    return {
      available: allConflicts.length === 0,
      conflicts: allConflicts,
    };
  }

  /**
   * Get all availability blocks for a listing
   */
  async getBlocks(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate?: Date,
    endDate?: Date
  ): Promise<AvailabilityBlock[]> {
    const where: any = {
      listingId,
      listingType,
    };

    if (startDate && endDate) {
      where.OR = [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ];
    }

    return prisma.availabilityBlock.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Delete an availability block
   */
  async deleteBlock(blockId: string, userId: string): Promise<void> {
    const block = await prisma.availabilityBlock.findUnique({
      where: { id: blockId },
    });

    if (!block) {
      throw new Error('BLOCK_NOT_FOUND');
    }

    if (block.createdBy !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    await prisma.availabilityBlock.delete({
      where: { id: blockId },
    });

    logger.info('Availability block deleted', { blockId, userId });
  }

  /**
   * Create a recurring availability block
   * Validates days of week and creates the recurring pattern
   */
  async createRecurringBlock(input: CreateRecurringBlockInput): Promise<RecurringBlock> {
    // Validate days of week (must be 0-6)
    if (!input.daysOfWeek || input.daysOfWeek.length === 0) {
      throw new Error('INVALID_DAYS_OF_WEEK');
    }

    for (const day of input.daysOfWeek) {
      if (day < 0 || day > 6) {
        throw new Error('INVALID_DAYS_OF_WEEK');
      }
    }

    // Validate date range if endDate is provided
    if (input.endDate && input.startDate > input.endDate) {
      throw new Error('INVALID_DATE_RANGE');
    }

    // Create the recurring block
    const recurringBlock = await prisma.recurringBlock.create({
      data: {
        listingId: input.listingId,
        listingType: input.listingType,
        daysOfWeek: input.daysOfWeek,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        createdBy: input.createdBy,
      },
    });

    logger.info('Recurring block created', {
      recurringBlockId: recurringBlock.id,
      listingId: input.listingId,
      listingType: input.listingType,
      daysOfWeek: input.daysOfWeek,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    return recurringBlock;
  }

  /**
   * Generate instances of a recurring block for a specific date range
   * Only generates instances for days matching the daysOfWeek pattern
   */
  generateRecurringInstances(
    pattern: RecurringBlock,
    viewStart: Date,
    viewEnd: Date
  ): AvailabilityBlock[] {
    const instances: AvailabilityBlock[] = [];
    
    // Normalize all dates to midnight for consistent comparison
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };
    
    // Start from the later of pattern start or view start
    const patternStart = normalizeDate(pattern.startDate);
    const viewStartNorm = normalizeDate(viewStart);
    const startDate = patternStart > viewStartNorm ? patternStart : viewStartNorm;
    
    // End at the earlier of pattern end (if exists), or view end
    const viewEndNorm = normalizeDate(viewEnd);
    const endDate = pattern.endDate 
      ? (normalizeDate(pattern.endDate) < viewEndNorm ? normalizeDate(pattern.endDate) : viewEndNorm)
      : viewEndNorm;

    // Iterate through each day in the range
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if this day matches the recurring pattern
      if (pattern.daysOfWeek.includes(dayOfWeek)) {
        instances.push({
          id: `${pattern.id}-${currentDate.toISOString()}`,
          listingId: pattern.listingId,
          listingType: pattern.listingType,
          startDate: new Date(currentDate),
          endDate: new Date(currentDate),
          reason: pattern.reason,
          isRecurring: true,
          recurringBlockId: pattern.id,
          createdBy: pattern.createdBy,
          createdAt: pattern.createdAt,
          updatedAt: pattern.updatedAt,
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
  }

  /**
   * Get all recurring blocks for a listing
   */
  async getRecurringBlocks(
    listingId: string,
    listingType: 'vehicle' | 'driver'
  ): Promise<RecurringBlock[]> {
    return prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Update a recurring block
   * Can update all instances or only future instances based on scope
   */
  async updateRecurringBlock(
    recurringBlockId: string,
    input: UpdateRecurringBlockInput,
    userId: string
  ): Promise<RecurringBlock> {
    const recurringBlock = await prisma.recurringBlock.findUnique({
      where: { id: recurringBlockId },
    });

    if (!recurringBlock) {
      throw new Error('RECURRING_BLOCK_NOT_FOUND');
    }

    if (recurringBlock.createdBy !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    // Validate days of week if provided
    if (input.daysOfWeek) {
      if (input.daysOfWeek.length === 0) {
        throw new Error('INVALID_DAYS_OF_WEEK');
      }
      for (const day of input.daysOfWeek) {
        if (day < 0 || day > 6) {
          throw new Error('INVALID_DAYS_OF_WEEK');
        }
      }
    }

    if (input.scope === 'future') {
      // For future scope, we need to:
      // 1. End the current recurring block at the update date
      // 2. Create a new recurring block starting from update date with new settings
      
      // Update the existing recurring block to end before the update date
      // Set to the day before update date at 23:59:59
      const newEndDate = new Date(input.updateDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      newEndDate.setHours(23, 59, 59, 999);
      
      const updatedOriginal = await prisma.recurringBlock.update({
        where: { id: recurringBlockId },
        data: {
          endDate: newEndDate,
        },
      });

      // Create a new recurring block for future instances
      const newRecurringBlock = await prisma.recurringBlock.create({
        data: {
          listingId: recurringBlock.listingId,
          listingType: recurringBlock.listingType,
          daysOfWeek: input.daysOfWeek || recurringBlock.daysOfWeek,
          startDate: input.updateDate,
          endDate: input.endDate !== undefined ? input.endDate : recurringBlock.endDate,
          reason: input.reason !== undefined ? input.reason : recurringBlock.reason,
          createdBy: recurringBlock.createdBy,
        },
      });

      logger.info('Recurring block updated (future scope)', {
        originalId: recurringBlockId,
        newId: newRecurringBlock.id,
        updateDate: input.updateDate,
      });

      return newRecurringBlock;
    } else {
      // Update all instances
      const updateData: any = {};
      
      if (input.daysOfWeek !== undefined) {
        updateData.daysOfWeek = input.daysOfWeek;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = input.endDate;
      }
      if (input.reason !== undefined) {
        updateData.reason = input.reason;
      }

      const updated = await prisma.recurringBlock.update({
        where: { id: recurringBlockId },
        data: updateData,
      });

      logger.info('Recurring block updated (all instances)', {
        recurringBlockId,
        updates: updateData,
      });

      return updated;
    }
  }

  /**
   * Delete a recurring block
   * Can delete all instances or only future instances based on scope
   */
  async deleteRecurringBlock(
    recurringBlockId: string,
    scope: 'all' | 'future',
    deleteDate: Date,
    userId: string
  ): Promise<void> {
    const recurringBlock = await prisma.recurringBlock.findUnique({
      where: { id: recurringBlockId },
    });

    if (!recurringBlock) {
      throw new Error('RECURRING_BLOCK_NOT_FOUND');
    }

    if (recurringBlock.createdBy !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    if (scope === 'future') {
      // For future scope, update the recurring block to end before the delete date
      // Set to the day before delete date at 23:59:59
      const newEndDate = new Date(deleteDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
      newEndDate.setHours(23, 59, 59, 999);
      
      await prisma.recurringBlock.update({
        where: { id: recurringBlockId },
        data: {
          endDate: newEndDate,
        },
      });

      logger.info('Recurring block deleted (future scope)', {
        recurringBlockId,
        deleteDate,
      });
    } else {
      // Delete all instances
      await prisma.recurringBlock.delete({
        where: { id: recurringBlockId },
      });

      logger.info('Recurring block deleted (all instances)', {
        recurringBlockId,
      });
    }
  }

  /**
   * Create availability blocks for multiple listings
   * Validates each listing individually and reports results
   */
  async createBulkBlocks(request: BulkBlockRequest): Promise<BulkBlockResult> {
    // Validate date range
    if (request.startDate > request.endDate) {
      throw new Error('INVALID_DATE_RANGE');
    }

    const successful: string[] = [];
    const failed: Array<{
      listingId: string;
      reason: string;
      conflicts: ConflictDetail[];
    }> = [];

    // Process each listing individually
    for (const listingId of request.listingIds) {
      try {
        // Check for conflicts with accepted or active bookings
        const conflicts = await this.checkBookingConflicts(
          listingId,
          request.listingType,
          request.startDate,
          request.endDate
        );

        if (conflicts.length > 0) {
          // Record failure with conflict details
          failed.push({
            listingId,
            reason: 'BOOKING_CONFLICT',
            conflicts,
          });
          continue;
        }

        // Create the availability block for this listing
        await prisma.availabilityBlock.create({
          data: {
            listingId,
            listingType: request.listingType,
            startDate: request.startDate,
            endDate: request.endDate,
            reason: request.reason,
            isRecurring: false,
            createdBy: request.createdBy,
          },
        });

        successful.push(listingId);
      } catch (error: any) {
        // Record failure with error reason
        failed.push({
          listingId,
          reason: error.message || 'UNKNOWN_ERROR',
          conflicts: [],
        });
      }
    }

    logger.info('Bulk block creation completed', {
      totalListings: request.listingIds.length,
      successful: successful.length,
      failed: failed.length,
      startDate: request.startDate,
      endDate: request.endDate,
    });

    return {
      successful,
      failed,
    };
  }

  /**
   * Get availability analytics for a listing over a time period
   * Calculates blocked days, booked days, available days, and utilization rates
   */
  async getAnalytics(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDays: number;
    blockedDays: number;
    bookedDays: number;
    availableDays: number;
    blockedPercentage: number;
    utilizationRate: number;
  }> {
    // Normalize dates to midnight for consistent comparison
    const periodStart = new Date(startDate);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(endDate);
    periodEnd.setHours(0, 0, 0, 0);

    // Calculate total days in period (inclusive)
    const diffTime = periodEnd.getTime() - periodStart.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Get all availability blocks in the period
    const manualBlocks = await prisma.availabilityBlock.findMany({
      where: {
        listingId,
        listingType,
        isRecurring: false,
        AND: [
          { startDate: { lte: periodEnd } },
          { endDate: { gte: periodStart } },
        ],
      },
    });

    // Get recurring blocks and generate instances
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType,
        startDate: { lte: periodEnd },
        OR: [
          { endDate: { gte: periodStart } },
          { endDate: null },
        ],
      },
    });

    const recurringInstances: AvailabilityBlock[] = [];
    for (const pattern of recurringBlocks) {
      const instances = this.generateRecurringInstances(pattern, periodStart, periodEnd);
      recurringInstances.push(...instances);
    }

    // Get all bookings in the period
    const where: any = {
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.ACTIVE, BookingStatus.COMPLETED],
      },
      AND: [
        { startDate: { lte: periodEnd } },
        { endDate: { gte: periodStart } },
      ],
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    const bookings = await prisma.booking.findMany({ where });

    // Calculate unique blocked dates
    const blockedDates = new Set<string>();
    const allBlocks = [...manualBlocks, ...recurringInstances];
    
    for (const block of allBlocks) {
      const current = new Date(Math.max(block.startDate.getTime(), periodStart.getTime()));
      const end = new Date(Math.min(block.endDate.getTime(), periodEnd.getTime()));
      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      while (current <= end) {
        blockedDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    // Calculate unique booked dates
    const bookedDates = new Set<string>();
    
    for (const booking of bookings) {
      const current = new Date(Math.max(booking.startDate.getTime(), periodStart.getTime()));
      const end = new Date(Math.min(booking.endDate.getTime(), periodEnd.getTime()));
      current.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      while (current <= end) {
        bookedDates.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    const blockedDays = blockedDates.size;
    const bookedDays = bookedDates.size;
    const availableDays = totalDays - blockedDays;

    // Calculate percentages
    const blockedPercentage = (blockedDays / totalDays) * 100;
    const utilizationRate = availableDays > 0 ? (bookedDays / availableDays) * 100 : 0;

    logger.info('Analytics calculated', {
      listingId,
      listingType,
      periodStart,
      periodEnd,
      totalDays,
      blockedDays,
      bookedDays,
      availableDays,
      blockedPercentage,
      utilizationRate,
    });

    return {
      totalDays,
      blockedDays,
      bookedDays,
      availableDays,
      blockedPercentage,
      utilizationRate,
    };
  }

  /**
   * Export calendar in iCalendar format
   * Includes all availability blocks and bookings within the specified date range
   */
  async exportCalendar(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    // Default to next 90 days if no date range specified
    const exportStart = startDate || new Date();
    const exportEnd = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // Get all availability blocks in the period
    const manualBlocks = await prisma.availabilityBlock.findMany({
      where: {
        listingId,
        listingType,
        isRecurring: false,
        AND: [
          { startDate: { lte: exportEnd } },
          { endDate: { gte: exportStart } },
        ],
      },
    });

    // Get recurring blocks and generate instances
    const recurringBlocks = await prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType,
        startDate: { lte: exportEnd },
        OR: [
          { endDate: { gte: exportStart } },
          { endDate: null },
        ],
      },
    });

    const recurringInstances: AvailabilityBlock[] = [];
    for (const pattern of recurringBlocks) {
      const instances = this.generateRecurringInstances(pattern, exportStart, exportEnd);
      recurringInstances.push(...instances);
    }

    // Get all bookings in the period
    const where: any = {
      status: {
        in: [BookingStatus.ACCEPTED, BookingStatus.ACTIVE, BookingStatus.COMPLETED],
      },
      AND: [
        { startDate: { lte: exportEnd } },
        { endDate: { gte: exportStart } },
      ],
    };

    if (listingType === 'vehicle') {
      where.vehicleListingId = listingId;
    } else {
      where.driverListingId = listingId;
    }

    const bookings = await prisma.booking.findMany({ where });

    // Generate iCalendar format
    const icalLines: string[] = [];
    
    // Header
    icalLines.push('BEGIN:VCALENDAR');
    icalLines.push('VERSION:2.0');
    icalLines.push('PRODID:-//Vider Transport Marketplace//Availability Calendar//EN');
    icalLines.push('CALSCALE:GREGORIAN');
    icalLines.push('METHOD:PUBLISH');
    icalLines.push(`X-WR-CALNAME:${listingType === 'vehicle' ? 'Vehicle' : 'Driver'} Listing ${listingId}`);
    icalLines.push('X-WR-TIMEZONE:UTC');

    // Helper function to format date for iCalendar (YYYYMMDD)
    const formatDate = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    // Helper function to format datetime for iCalendar (YYYYMMDDTHHMMSSZ)
    const formatDateTime = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    // Helper function to escape text for iCalendar
    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    // Add manual blocks
    for (const block of manualBlocks) {
      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:block-${block.id}@vider-marketplace`);
      icalLines.push(`DTSTAMP:${formatDateTime(new Date())}`);
      icalLines.push(`DTSTART;VALUE=DATE:${formatDate(block.startDate)}`);
      // Add 1 day to end date for iCalendar (exclusive end)
      const endDate = new Date(block.endDate);
      endDate.setDate(endDate.getDate() + 1);
      icalLines.push(`DTEND;VALUE=DATE:${formatDate(endDate)}`);
      icalLines.push(`SUMMARY:Unavailable${block.reason ? ` - ${escapeText(block.reason)}` : ''}`);
      if (block.reason) {
        icalLines.push(`DESCRIPTION:${escapeText(block.reason)}`);
      }
      icalLines.push('STATUS:CONFIRMED');
      icalLines.push('TRANSP:OPAQUE');
      icalLines.push('END:VEVENT');
    }

    // Add recurring instances
    for (const instance of recurringInstances) {
      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:recurring-${instance.id}@vider-marketplace`);
      icalLines.push(`DTSTAMP:${formatDateTime(new Date())}`);
      icalLines.push(`DTSTART;VALUE=DATE:${formatDate(instance.startDate)}`);
      // Add 1 day to end date for iCalendar (exclusive end)
      const endDate = new Date(instance.endDate);
      endDate.setDate(endDate.getDate() + 1);
      icalLines.push(`DTEND;VALUE=DATE:${formatDate(endDate)}`);
      icalLines.push(`SUMMARY:Unavailable (Recurring)${instance.reason ? ` - ${escapeText(instance.reason)}` : ''}`);
      if (instance.reason) {
        icalLines.push(`DESCRIPTION:${escapeText(instance.reason)}`);
      }
      icalLines.push('STATUS:CONFIRMED');
      icalLines.push('TRANSP:OPAQUE');
      icalLines.push('END:VEVENT');
    }

    // Add bookings
    for (const booking of bookings) {
      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:booking-${booking.id}@vider-marketplace`);
      icalLines.push(`DTSTAMP:${formatDateTime(new Date())}`);
      icalLines.push(`DTSTART;VALUE=DATE:${formatDate(booking.startDate)}`);
      // Add 1 day to end date for iCalendar (exclusive end)
      const endDate = new Date(booking.endDate);
      endDate.setDate(endDate.getDate() + 1);
      icalLines.push(`DTEND;VALUE=DATE:${formatDate(endDate)}`);
      icalLines.push(`SUMMARY:Booked - ${escapeText(booking.bookingNumber)}`);
      icalLines.push(`DESCRIPTION:Booking ${escapeText(booking.bookingNumber)} - Status: ${booking.status}`);
      icalLines.push('STATUS:CONFIRMED');
      icalLines.push('TRANSP:OPAQUE');
      icalLines.push('END:VEVENT');
    }

    // Footer
    icalLines.push('END:VCALENDAR');

    const icalContent = icalLines.join('\r\n');

    logger.info('Calendar exported', {
      listingId,
      listingType,
      startDate: exportStart,
      endDate: exportEnd,
      blocksCount: manualBlocks.length + recurringInstances.length,
      bookingsCount: bookings.length,
    });

    return icalContent;
  }
}

export const availabilityService = new AvailabilityService();
