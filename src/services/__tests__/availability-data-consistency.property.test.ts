import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { AvailabilityService } from '../availability.service';

// **Feature: mock-data-replacement, Property 14: Availability data consistency**
// **Validates: Requirements 14.1, 14.2**

const mockPrisma = {
  availability: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

const availabilityService = new AvailabilityService(mockPrisma);

// Test data generators
const availabilityBlockArb = fc.record({
  id: fc.uuid(),
  vehicleId: fc.uuid(),
  startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  isAvailable: fc.boolean(),
  recurringPattern: fc.oneof(
    fc.constant(null),
    fc.record({
      type: fc.constantFrom('DAILY', 'WEEKLY', 'MONTHLY'),
      interval: fc.integer({ min: 1, max: 30 }),
      endDate: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }), { nil: null }),
    })
  ),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const bookingArb = fc.record({
  id: fc.uuid(),
  vehicleId: fc.uuid(),
  startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  status: fc.constantFrom('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'),
  createdAt: fc.date(),
});

describe('Availability Data Consistency Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ensure availability calendar data comes from database', () => {
    fc.assert(fc.property(
      fc.array(availabilityBlockArb, { minLength: 0, maxLength: 20 }),
      fc.uuid(),
      fc.date(),
      fc.date(),
      async (availabilityBlocks, vehicleId, startDate, endDate) => {
        // Arrange
        mockPrisma.availability.findMany.mockResolvedValue(availabilityBlocks);

        // Act
        const result = await availabilityService.getAvailabilityCalendar(vehicleId, startDate, endDate);

        // Assert - All returned availability should match database records
        expect(mockPrisma.availability.findMany).toHaveBeenCalledWith({
          where: {
            vehicleId,
            OR: [
              {
                startDate: { lte: endDate },
                endDate: { gte: startDate },
              },
              {
                recurringPattern: { not: null },
              },
            ],
          },
          orderBy: { startDate: 'asc' },
        });

        // Every availability block in result should be traceable to database
        result.forEach(block => {
          const dbBlock = availabilityBlocks.find(db => db.id === block.id);
          expect(dbBlock).toBeDefined();
          if (dbBlock) {
            expect(block.vehicleId).toBe(dbBlock.vehicleId);
            expect(block.isAvailable).toBe(dbBlock.isAvailable);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should detect availability conflicts using real booking data', () => {
    fc.assert(fc.property(
      fc.array(bookingArb, { minLength: 0, maxLength: 10 }),
      fc.uuid(),
      fc.date(),
      fc.date(),
      async (existingBookings, vehicleId, requestedStart, requestedEnd) => {
        // Arrange
        const confirmedBookings = existingBookings.filter(b => 
          b.status === 'CONFIRMED' || b.status === 'PENDING'
        );
        mockPrisma.booking.findMany.mockResolvedValue(confirmedBookings);

        // Act
        const hasConflict = await availabilityService.checkAvailabilityConflict(
          vehicleId, 
          requestedStart, 
          requestedEnd
        );

        // Assert - Conflict detection should use real booking data
        expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
          where: {
            vehicleId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            OR: [
              {
                startDate: { lte: requestedEnd },
                endDate: { gte: requestedStart },
              },
            ],
          },
        });

        // If there are overlapping confirmed bookings, should detect conflict
        const actualConflicts = confirmedBookings.filter(booking => {
          return booking.startDate <= requestedEnd && booking.endDate >= requestedStart;
        });

        if (actualConflicts.length > 0) {
          expect(hasConflict).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  it('should retrieve recurring availability patterns from database', () => {
    fc.assert(fc.property(
      fc.array(availabilityBlockArb, { minLength: 0, maxLength: 15 }),
      fc.uuid(),
      async (availabilityBlocks, vehicleId) => {
        // Arrange
        const blocksWithRecurring = availabilityBlocks.filter(block => 
          block.recurringPattern !== null
        );
        mockPrisma.availability.findMany.mockResolvedValue(blocksWithRecurring);

        // Act
        const recurringPatterns = await availabilityService.getRecurringAvailability(vehicleId);

        // Assert - All recurring patterns should come from database
        expect(mockPrisma.availability.findMany).toHaveBeenCalledWith({
          where: {
            vehicleId,
            recurringPattern: { not: null },
          },
        });

        // Every returned pattern should match database record
        recurringPatterns.forEach(pattern => {
          const dbBlock = blocksWithRecurring.find(db => db.id === pattern.id);
          expect(dbBlock).toBeDefined();
          if (dbBlock && dbBlock.recurringPattern) {
            expect(pattern.recurringPattern).toEqual(dbBlock.recurringPattern);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should calculate availability utilization from real data', () => {
    fc.assert(fc.property(
      fc.array(availabilityBlockArb, { minLength: 1, maxLength: 10 }),
      fc.array(bookingArb, { minLength: 0, maxLength: 10 }),
      fc.uuid(),
      fc.date(),
      fc.date(),
      async (availabilityBlocks, bookings, vehicleId, startDate, endDate) => {
        // Arrange
        mockPrisma.availability.findMany.mockResolvedValue(availabilityBlocks);
        mockPrisma.booking.findMany.mockResolvedValue(bookings);

        // Act
        const utilization = await availabilityService.calculateUtilization(vehicleId, startDate, endDate);

        // Assert - Utilization should be calculated from real data
        expect(mockPrisma.availability.findMany).toHaveBeenCalled();
        expect(mockPrisma.booking.findMany).toHaveBeenCalled();

        // Utilization should be between 0 and 1
        expect(utilization).toBeGreaterThanOrEqual(0);
        expect(utilization).toBeLessThanOrEqual(1);

        // If no availability blocks, utilization should be 0
        if (availabilityBlocks.length === 0) {
          expect(utilization).toBe(0);
        }
      }
    ), { numRuns: 100 });
  });

  it('should handle availability notifications using real event data', () => {
    fc.assert(fc.property(
      availabilityBlockArb,
      fc.constantFrom('CREATED', 'UPDATED', 'DELETED'),
      async (availabilityBlock, changeType) => {
        // Arrange
        mockPrisma.availability.findFirst.mockResolvedValue(availabilityBlock);

        // Act
        const notifications = await availabilityService.getAvailabilityNotifications(
          availabilityBlock.vehicleId,
          changeType
        );

        // Assert - Notifications should be based on real availability changes
        expect(mockPrisma.availability.findFirst).toHaveBeenCalledWith({
          where: { id: availabilityBlock.id },
          include: { vehicle: true },
        });

        // Notifications should contain real data
        notifications.forEach(notification => {
          expect(notification.vehicleId).toBe(availabilityBlock.vehicleId);
          expect(notification.changeType).toBe(changeType);
          expect(notification.timestamp).toBeInstanceOf(Date);
        });
      }
    ), { numRuns: 100 });
  });
});