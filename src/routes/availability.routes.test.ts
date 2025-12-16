import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import availabilityRoutes from './availability.routes';
import { availabilityService } from '../services/availability.service';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Mock the services
vi.mock('../services/availability.service', () => ({
  availabilityService: {
    createBlock: vi.fn(),
    getBlocks: vi.fn(),
    deleteBlock: vi.fn(),
    createRecurringBlock: vi.fn(),
    updateRecurringBlock: vi.fn(),
    deleteRecurringBlock: vi.fn(),
    checkAvailability: vi.fn(),
    getRecurringBlocks: vi.fn(),
    generateRecurringInstances: vi.fn(),
    createBulkBlocks: vi.fn(),
  },
}));

// Mock prisma
vi.mock('../config/database', () => ({
  prisma: {
    vehicleListing: {
      findUnique: vi.fn(),
    },
    driverListing: {
      findUnique: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Availability Routes', () => {
  let app: Application;
  let mockToken: string;
  let mockUserId: string;
  let mockCompanyId: string;

  beforeEach(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/availability', availabilityRoutes);

    // Setup mock data
    mockUserId = 'user-123';
    mockCompanyId = 'company-123';
    
    // Create a valid JWT token for testing
    mockToken = jwt.sign(
      {
        userId: mockUserId,
        email: 'test@example.com',
        role: 'COMPANY_ADMIN',
        companyId: mockCompanyId,
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('POST /api/availability/blocks', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/availability/blocks')
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should require listing ownership', async () => {
      // Mock listing with different company
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: 'different-company',
      });

      const response = await request(app)
        .post('/api/availability/blocks')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LISTING_ACCESS_DENIED');
    });

    it('should create availability block successfully', async () => {
      // Mock listing ownership
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      const mockBlock = {
        id: 'block-123',
        listingId: 'listing-123',
        listingType: 'vehicle',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        reason: 'Maintenance',
        isRecurring: false,
        recurringBlockId: null,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (availabilityService.createBlock as any).mockResolvedValue(mockBlock);

      const response = await request(app)
        .post('/api/availability/blocks')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          reason: 'Maintenance',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('block-123');
      expect(availabilityService.createBlock).toHaveBeenCalledWith({
        listingId: 'listing-123',
        listingType: 'vehicle',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        reason: 'Maintenance',
        createdBy: mockUserId,
      });
    });

    it('should handle invalid date range', async () => {
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      const error: any = new Error('INVALID_DATE_RANGE');
      (availabilityService.createBlock as any).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/availability/blocks')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-05',
          endDate: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should handle booking conflicts', async () => {
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      const error: any = new Error('BOOKING_CONFLICT');
      error.conflicts = [
        {
          type: 'booking',
          startDate: new Date('2024-01-02'),
          endDate: new Date('2024-01-04'),
          bookingNumber: 'BK-123',
        },
      ];
      (availabilityService.createBlock as any).mockRejectedValue(error);

      const response = await request(app)
        .post('/api/availability/blocks')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOOKING_CONFLICT');
      expect(response.body.error.conflicts).toHaveLength(1);
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/availability/blocks')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          // Missing listingType, startDate, endDate
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });
  });

  describe('GET /api/availability/blocks/:listingId', () => {
    it('should get blocks for a listing', async () => {
      const mockBlocks = [
        {
          id: 'block-1',
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          reason: 'Maintenance',
          isRecurring: false,
          recurringBlockId: null,
          createdBy: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (availabilityService.getBlocks as any).mockResolvedValue(mockBlocks);

      const response = await request(app)
        .get('/api/availability/blocks/listing-123')
        .query({ listingType: 'vehicle' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('block-1');
    });

    it('should require listingType parameter', async () => {
      const response = await request(app).get(
        '/api/availability/blocks/listing-123'
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });

    it('should filter by date range', async () => {
      (availabilityService.getBlocks as any).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/availability/blocks/listing-123')
        .query({
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(availabilityService.getBlocks).toHaveBeenCalledWith(
        'listing-123',
        'vehicle',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('DELETE /api/availability/blocks/:blockId', () => {
    it('should require authentication', async () => {
      const response = await request(app).delete(
        '/api/availability/blocks/block-123'
      );

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should delete block successfully', async () => {
      (availabilityService.deleteBlock as any).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/availability/blocks/block-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(204);
      expect(availabilityService.deleteBlock).toHaveBeenCalledWith(
        'block-123',
        mockUserId
      );
    });

    it('should handle block not found', async () => {
      (availabilityService.deleteBlock as any).mockRejectedValue(
        new Error('BLOCK_NOT_FOUND')
      );

      const response = await request(app)
        .delete('/api/availability/blocks/block-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BLOCK_NOT_FOUND');
    });

    it('should handle unauthorized deletion', async () => {
      (availabilityService.deleteBlock as any).mockRejectedValue(
        new Error('UNAUTHORIZED')
      );

      const response = await request(app)
        .delete('/api/availability/blocks/block-123')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/availability/recurring', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/availability/recurring')
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          daysOfWeek: [1, 3, 5],
          startDate: '2024-01-01',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should create recurring block successfully', async () => {
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      const mockRecurringBlock = {
        id: 'recurring-123',
        listingId: 'listing-123',
        listingType: 'vehicle',
        daysOfWeek: [1, 3, 5],
        startDate: new Date('2024-01-01'),
        endDate: null,
        reason: 'Weekly maintenance',
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (availabilityService.createRecurringBlock as any).mockResolvedValue(
        mockRecurringBlock
      );

      const response = await request(app)
        .post('/api/availability/recurring')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          daysOfWeek: [1, 3, 5],
          startDate: '2024-01-01',
          reason: 'Weekly maintenance',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('recurring-123');
      expect(response.body.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should handle invalid days of week', async () => {
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      (availabilityService.createRecurringBlock as any).mockRejectedValue(
        new Error('INVALID_DAYS_OF_WEEK')
      );

      const response = await request(app)
        .post('/api/availability/recurring')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          daysOfWeek: [7, 8],
          startDate: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DAYS_OF_WEEK');
    });
  });

  describe('PUT /api/availability/recurring/:blockId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/availability/recurring/recurring-123')
        .send({
          scope: 'future',
          updateDate: '2024-01-15',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should update recurring block (all instances)', async () => {
      const mockUpdatedBlock = {
        id: 'recurring-123',
        listingId: 'listing-123',
        listingType: 'vehicle',
        daysOfWeek: [1, 2, 3],
        startDate: new Date('2024-01-01'),
        endDate: null,
        reason: 'Updated reason',
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (availabilityService.updateRecurringBlock as any).mockResolvedValue(
        mockUpdatedBlock
      );

      const response = await request(app)
        .put('/api/availability/recurring/recurring-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          daysOfWeek: [1, 2, 3],
          reason: 'Updated reason',
          scope: 'all',
          updateDate: '2024-01-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.daysOfWeek).toEqual([1, 2, 3]);
      expect(availabilityService.updateRecurringBlock).toHaveBeenCalledWith(
        'recurring-123',
        {
          daysOfWeek: [1, 2, 3],
          endDate: undefined,
          reason: 'Updated reason',
          scope: 'all',
          updateDate: expect.any(Date),
        },
        mockUserId
      );
    });

    it('should update recurring block (future only)', async () => {
      const mockNewBlock = {
        id: 'recurring-456',
        listingId: 'listing-123',
        listingType: 'vehicle',
        daysOfWeek: [2, 4],
        startDate: new Date('2024-01-15'),
        endDate: null,
        reason: 'New pattern',
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (availabilityService.updateRecurringBlock as any).mockResolvedValue(
        mockNewBlock
      );

      const response = await request(app)
        .put('/api/availability/recurring/recurring-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          daysOfWeek: [2, 4],
          scope: 'future',
          updateDate: '2024-01-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('recurring-456');
    });

    it('should validate scope parameter', async () => {
      const response = await request(app)
        .put('/api/availability/recurring/recurring-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          scope: 'invalid',
          updateDate: '2024-01-15',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SCOPE');
    });
  });

  describe('DELETE /api/availability/recurring/:blockId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/availability/recurring/recurring-123')
        .send({
          scope: 'all',
          deleteDate: '2024-01-15',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should delete recurring block (all instances)', async () => {
      (availabilityService.deleteRecurringBlock as any).mockResolvedValue(
        undefined
      );

      const response = await request(app)
        .delete('/api/availability/recurring/recurring-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          scope: 'all',
          deleteDate: '2024-01-15',
        });

      expect(response.status).toBe(204);
      expect(availabilityService.deleteRecurringBlock).toHaveBeenCalledWith(
        'recurring-123',
        'all',
        expect.any(Date),
        mockUserId
      );
    });

    it('should delete recurring block (future only)', async () => {
      (availabilityService.deleteRecurringBlock as any).mockResolvedValue(
        undefined
      );

      const response = await request(app)
        .delete('/api/availability/recurring/recurring-123')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          scope: 'future',
          deleteDate: '2024-01-15',
        });

      expect(response.status).toBe(204);
      expect(availabilityService.deleteRecurringBlock).toHaveBeenCalledWith(
        'recurring-123',
        'future',
        expect.any(Date),
        mockUserId
      );
    });
  });

  describe('POST /api/availability/check', () => {
    it('should check availability', async () => {
      const mockResult = {
        available: false,
        conflicts: [
          {
            type: 'booking' as const,
            startDate: new Date('2024-01-02'),
            endDate: new Date('2024-01-04'),
            bookingNumber: 'BK-123',
          },
        ],
      };

      (availabilityService.checkAvailability as any).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/availability/check')
        .send({
          listingId: 'listing-123',
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(false);
      expect(response.body.conflicts).toHaveLength(1);
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/availability/check')
        .send({
          listingId: 'listing-123',
          // Missing other parameters
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });
  });

  describe('GET /api/availability/calendar/:listingId', () => {
    it('should get calendar view', async () => {
      (availabilityService.getBlocks as any).mockResolvedValue([]);
      (availabilityService.getRecurringBlocks as any).mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/availability/calendar/listing-123')
        .query({ listingType: 'vehicle' });

      expect(response.status).toBe(200);
      expect(response.body.listingId).toBe('listing-123');
      expect(response.body.days).toBeDefined();
      expect(Array.isArray(response.body.days)).toBe(true);
    });

    it('should include blocked dates in calendar', async () => {
      const mockBlock = {
        id: 'block-1',
        listingId: 'listing-123',
        listingType: 'vehicle',
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-02'),
        reason: 'Maintenance',
        isRecurring: false,
        recurringBlockId: null,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (availabilityService.getBlocks as any).mockResolvedValue([mockBlock]);
      (availabilityService.getRecurringBlocks as any).mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/availability/calendar/listing-123')
        .query({
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(200);
      const blockedDay = response.body.days.find((d: any) => d.date === '2024-01-02');
      expect(blockedDay.status).toBe('blocked');
      expect(blockedDay.reason).toBe('Maintenance');
    });

    it('should include booked dates in calendar', async () => {
      (availabilityService.getBlocks as any).mockResolvedValue([]);
      (availabilityService.getRecurringBlocks as any).mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([
        {
          id: 'booking-1',
          bookingNumber: 'BK-123',
          startDate: new Date('2024-01-03'),
          endDate: new Date('2024-01-03'),
          status: 'ACCEPTED',
        },
      ]);

      const response = await request(app)
        .get('/api/availability/calendar/listing-123')
        .query({
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(200);
      const bookedDay = response.body.days.find((d: any) => d.date === '2024-01-03');
      expect(bookedDay.status).toBe('booked');
      expect(bookedDay.bookingNumber).toBe('BK-123');
    });

    it('should default to 90 days if no date range specified', async () => {
      (availabilityService.getBlocks as any).mockResolvedValue([]);
      (availabilityService.getRecurringBlocks as any).mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/availability/calendar/listing-123')
        .query({ listingType: 'vehicle' });

      expect(response.status).toBe(200);
      expect(response.body.days.length).toBeGreaterThan(80); // Should be around 90 days
    });
  });

  describe('POST /api/availability/bulk', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/availability/bulk')
        .send({
          listingIds: ['listing-1', 'listing-2'],
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should require listingIds array', async () => {
      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });

    it('should require non-empty listingIds array', async () => {
      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingIds: [],
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_PARAMETERS');
    });

    it('should verify ownership of all listings', async () => {
      // Mock first listing owned by user, second by different company
      prisma.vehicleListing.findUnique
        .mockResolvedValueOnce({ companyId: mockCompanyId })
        .mockResolvedValueOnce({ companyId: 'different-company' });

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingIds: ['listing-1', 'listing-2'],
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LISTING_ACCESS_DENIED');
    });

    it('should create bulk blocks successfully', async () => {
      // Mock all listings owned by user
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      // Mock service response
      (availabilityService.createBulkBlocks as any).mockResolvedValue({
        successful: ['listing-1', 'listing-2'],
        failed: [],
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingIds: ['listing-1', 'listing-2'],
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          reason: 'Maintenance',
        });

      expect(response.status).toBe(201);
      expect(response.body.successful).toEqual(['listing-1', 'listing-2']);
      expect(response.body.failed).toEqual([]);
      expect(availabilityService.createBulkBlocks).toHaveBeenCalledWith({
        listingIds: ['listing-1', 'listing-2'],
        listingType: 'vehicle',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        reason: 'Maintenance',
        createdBy: mockUserId,
      });
    });

    it('should report individual listing failures', async () => {
      // Mock all listings owned by user
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      // Mock service response with some failures
      (availabilityService.createBulkBlocks as any).mockResolvedValue({
        successful: ['listing-1'],
        failed: [
          {
            listingId: 'listing-2',
            reason: 'BOOKING_CONFLICT',
            conflicts: [
              {
                type: 'booking',
                startDate: new Date('2024-01-02'),
                endDate: new Date('2024-01-04'),
                bookingNumber: 'BK-123',
              },
            ],
          },
        ],
      });

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingIds: ['listing-1', 'listing-2'],
          listingType: 'vehicle',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
        });

      expect(response.status).toBe(201);
      expect(response.body.successful).toEqual(['listing-1']);
      expect(response.body.failed).toHaveLength(1);
      expect(response.body.failed[0].listingId).toBe('listing-2');
      expect(response.body.failed[0].reason).toBe('BOOKING_CONFLICT');
      expect(response.body.failed[0].conflicts).toHaveLength(1);
    });

    it('should validate date range', async () => {
      // Mock all listings owned by user
      prisma.vehicleListing.findUnique.mockResolvedValue({
        companyId: mockCompanyId,
      });

      // Mock service to throw date range error
      (availabilityService.createBulkBlocks as any).mockRejectedValue(
        new Error('INVALID_DATE_RANGE')
      );

      const response = await request(app)
        .post('/api/availability/bulk')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          listingIds: ['listing-1'],
          listingType: 'vehicle',
          startDate: '2024-01-05',
          endDate: '2024-01-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });
});
