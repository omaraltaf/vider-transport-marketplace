import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

export interface AvailabilityBlock {
  id: string;
  listingId: string;
  listingType: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isRecurring: boolean;
  recurringBlockId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringBlock {
  id: string;
  listingId: string;
  listingType: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate?: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async getBlocks(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate?: Date,
    endDate?: Date
  ): Promise<AvailabilityBlock[]> {
    const whereClause: any = {
      listingId,
      listingType,
    };

    if (startDate && endDate) {
      whereClause.OR = [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ];
    }

    const blocks = await this.prisma.availabilityBlock.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
    });

    return blocks.map(block => ({
      id: block.id,
      listingId: block.listingId,
      listingType: block.listingType,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason || undefined,
      isRecurring: block.isRecurring,
      recurringBlockId: block.recurringBlockId || undefined,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    }));
  }

  async getRecurringBlocks(
    listingId: string,
    listingType: 'vehicle' | 'driver'
  ): Promise<RecurringBlock[]> {
    const blocks = await this.prisma.recurringBlock.findMany({
      where: {
        listingId,
        listingType,
      },
      orderBy: { startDate: 'asc' },
    });

    return blocks.map(block => ({
      id: block.id,
      listingId: block.listingId,
      listingType: block.listingType,
      daysOfWeek: block.daysOfWeek,
      startDate: block.startDate,
      endDate: block.endDate || undefined,
      reason: block.reason || undefined,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    }));
  }

  async createBlock(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date,
    reason?: string,
    createdBy?: string
  ): Promise<AvailabilityBlock> {
    const block = await this.prisma.availabilityBlock.create({
      data: {
        listingId,
        listingType,
        startDate,
        endDate,
        reason,
        createdBy: createdBy || 'system',
      },
    });

    return {
      id: block.id,
      listingId: block.listingId,
      listingType: block.listingType,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason || undefined,
      isRecurring: block.isRecurring,
      recurringBlockId: block.recurringBlockId || undefined,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }

  async deleteBlock(blockId: string): Promise<void> {
    await this.prisma.availabilityBlock.delete({
      where: { id: blockId },
    });
  }

  async checkAvailabilityConflict(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    requestedStart: Date,
    requestedEnd: Date
  ): Promise<boolean> {
    // Check for existing availability blocks that would conflict
    const conflictingBlocks = await this.prisma.availabilityBlock.findMany({
      where: {
        listingId,
        listingType,
        OR: [
          {
            startDate: { lte: requestedEnd },
            endDate: { gte: requestedStart },
          },
        ],
      },
    });

    if (conflictingBlocks.length > 0) {
      return true;
    }

    // Check for existing bookings that would conflict
    const whereClause: any = {
      status: { in: ['PENDING', 'ACCEPTED', 'ACTIVE'] },
      OR: [
        {
          startDate: { lte: requestedEnd },
          endDate: { gte: requestedStart },
        },
      ],
    };

    if (listingType === 'vehicle') {
      whereClause.vehicleListingId = listingId;
    } else {
      whereClause.driverListingId = listingId;
    }

    const conflictingBookings = await this.prisma.booking.findMany({
      where: whereClause,
    });

    return conflictingBookings.length > 0;
  }

  async createRecurringBlock(data: {
    listingId: string;
    listingType: 'vehicle' | 'driver';
    daysOfWeek: number[];
    startDate: Date;
    endDate?: Date;
    reason?: string;
    createdBy: string;
  }): Promise<RecurringBlock> {
    const block = await this.prisma.recurringBlock.create({
      data: {
        listingId: data.listingId,
        listingType: data.listingType,
        daysOfWeek: data.daysOfWeek,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        createdBy: data.createdBy,
      },
    });

    return {
      id: block.id,
      listingId: block.listingId,
      listingType: block.listingType,
      daysOfWeek: block.daysOfWeek,
      startDate: block.startDate,
      endDate: block.endDate || undefined,
      reason: block.reason || undefined,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }

  async updateRecurringBlock(
    blockId: string,
    data: {
      daysOfWeek?: number[];
      startDate?: Date;
      endDate?: Date;
      reason?: string;
      scope?: string;
      updateDate?: Date;
    },
    userId?: string
  ): Promise<RecurringBlock> {
    const block = await this.prisma.recurringBlock.update({
      where: { id: blockId },
      data: {
        daysOfWeek: data.daysOfWeek,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
      },
    });

    return {
      id: block.id,
      listingId: block.listingId,
      listingType: block.listingType,
      daysOfWeek: block.daysOfWeek,
      startDate: block.startDate,
      endDate: block.endDate || undefined,
      reason: block.reason || undefined,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }

  async deleteRecurringBlock(
    blockId: string,
    scope: 'single' | 'future' | 'all',
    deleteDate?: Date,
    userId?: string
  ): Promise<void> {
    if (scope === 'all') {
      // Delete the recurring block and all its instances
      await this.prisma.recurringBlock.delete({
        where: { id: blockId },
      });
    } else {
      // For 'single' and 'future', we would need more complex logic
      // For now, just delete the recurring block
      await this.prisma.recurringBlock.delete({
        where: { id: blockId },
      });
    }
  }

  async checkAvailability(data: {
    listingId: string;
    listingType: 'vehicle' | 'driver';
    startDate: Date;
    endDate: Date;
  }): Promise<{ available: boolean; conflicts?: any[] }> {
    const hasConflict = await this.checkAvailabilityConflict(
      data.listingId,
      data.listingType,
      data.startDate,
      data.endDate
    );

    return {
      available: !hasConflict,
      conflicts: hasConflict ? [] : undefined,
    };
  }

  async createBulkBlocks(data: {
    listingIds: string[];
    listingType: 'vehicle' | 'driver';
    startDate: Date;
    endDate: Date;
    reason?: string;
    createdBy: string;
  }): Promise<AvailabilityBlock[]> {
    const blocks = await Promise.all(
      data.listingIds.map(listingId =>
        this.createBlock(
          listingId,
          data.listingType,
          data.startDate,
          data.endDate,
          data.reason,
          data.createdBy
        )
      )
    );

    return blocks;
  }

  generateRecurringInstances(
    pattern: RecurringBlock,
    startDate: Date,
    endDate: Date
  ): any[] {
    // Simple implementation - generate instances based on days of week
    const instances: any[] = [];
    const current = new Date(Math.max(pattern.startDate.getTime(), startDate.getTime()));
    const end = new Date(Math.min(pattern.endDate?.getTime() || endDate.getTime(), endDate.getTime()));

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (pattern.daysOfWeek.includes(dayOfWeek)) {
        instances.push({
          id: `${pattern.id}-${current.toISOString().split('T')[0]}`,
          listingId: pattern.listingId,
          listingType: pattern.listingType,
          startDate: new Date(current),
          endDate: new Date(current.getTime() + 24 * 60 * 60 * 1000), // Add 1 day
          reason: pattern.reason,
          isRecurring: true,
          recurringBlockId: pattern.id,
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return instances;
  }

  async getAnalytics(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const blocks = await this.getBlocks(listingId, listingType, startDate, endDate);
    
    return {
      totalBlocks: blocks.length,
      blockedDays: blocks.length,
      utilizationRate: 0, // Would need booking data to calculate
    };
  }

  async exportCalendar(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const blocks = await this.getBlocks(listingId, listingType, startDate, endDate);
    
    // Simple iCalendar format
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Vider//Availability//EN\n';
    
    blocks.forEach(block => {
      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${block.id}\n`;
      ical += `DTSTART:${block.startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ical += `DTEND:${block.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ical += `SUMMARY:${block.reason || 'Blocked'}\n`;
      ical += 'END:VEVENT\n';
    });
    
    ical += 'END:VCALENDAR';
    return ical;
  }
}

// Create and export a singleton instance
export const availabilityService = new AvailabilityService(prisma);