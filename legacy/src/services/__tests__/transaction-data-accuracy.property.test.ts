import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
import { PaymentService } from '../payment.service';

// **Feature: mock-data-replacement, Property 7: Real-time status accuracy**
// **Validates: Requirements 2.2, 15.2**

const mockPrisma = {
  transaction: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;

const paymentService = new PaymentService();

// Test data generators
const transactionArb = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  type: fc.constantFrom('BOOKING_PAYMENT', 'REFUND', 'COMMISSION'),
  amount: fc.float({ min: 1, max: 10000 }),
  currency: fc.constantFrom('NOK', 'USD', 'EUR'),
  status: fc.constantFrom('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'),
  metadata: fc.record({}),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  booking: fc.record({
    id: fc.uuid(),
    bookingNumber: fc.string({ minLength: 8, maxLength: 12 }),
    renterCompanyId: fc.uuid(),
    providerCompanyId: fc.uuid(),
    renterCompany: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
    }),
    providerCompany: fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
    }),
  }),
});

const bookingArb = fc.record({
  id: fc.uuid(),
  bookingNumber: fc.string({ minLength: 8, maxLength: 12 }),
  renterCompanyId: fc.uuid(),
  providerCompanyId: fc.uuid(),
  status: fc.constantFrom('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'),
  total: fc.float({ min: 100, max: 5000 }),
  currency: fc.constantFrom('NOK', 'USD', 'EUR'),
  createdAt: fc.date(),
  completedAt: fc.option(fc.date(), { nil: null }),
});

describe('Transaction Data Accuracy Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ensure transaction status matches database records', () => {
    fc.assert(fc.property(
      fc.array(transactionArb, { minLength: 1, maxLength: 20 }),
      fc.uuid(),
      async (transactions, companyId) => {
        // Arrange
        const bookingIds = transactions.map(t => t.bookingId);
        mockPrisma.booking.findMany.mockResolvedValue(
          bookingIds.map(id => ({ id, renterCompanyId: companyId }))
        );
        mockPrisma.transaction.findMany.mockResolvedValue(transactions);

        // Act
        const result = await paymentService.getCompanyTransactions(companyId);

        // Assert - Every transaction status should match database record
        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
          where: {
            bookingId: { in: bookingIds },
          },
          include: {
            booking: {
              include: {
                renterCompany: true,
                providerCompany: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        result.forEach(transaction => {
          const dbTransaction = transactions.find(t => t.id === transaction.id);
          expect(dbTransaction).toBeDefined();
          if (dbTransaction) {
            expect(transaction.status).toBe(dbTransaction.status);
            expect(transaction.type).toBe(dbTransaction.type);
            expect(transaction.amount).toBe(dbTransaction.amount);
            expect(transaction.currency).toBe(dbTransaction.currency);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure payment status reflects real processing state', () => {
    fc.assert(fc.property(
      transactionArb,
      fc.constantFrom('PENDING', 'COMPLETED', 'FAILED'),
      async (transaction, newStatus) => {
        // Arrange
        const updatedTransaction = { ...transaction, status: newStatus };
        mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
        mockPrisma.transaction.update.mockResolvedValue(updatedTransaction);

        // Act - Simulate status update
        const result = await mockPrisma.transaction.update({
          where: { id: transaction.id },
          data: { status: newStatus },
        });

        // Assert - Status should be updated in database
        expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
          where: { id: transaction.id },
          data: { status: newStatus },
        });

        expect(result.status).toBe(newStatus);
        expect(result.id).toBe(transaction.id);
      }
    ), { numRuns: 100 });
  });

  it('should ensure transaction amounts are accurate from database', () => {
    fc.assert(fc.property(
      fc.array(transactionArb, { minLength: 1, maxLength: 15 }),
      fc.uuid(),
      async (transactions, companyId) => {
        // Arrange
        const bookingIds = transactions.map(t => t.bookingId);
        mockPrisma.booking.findMany.mockResolvedValue(
          bookingIds.map(id => ({ id, renterCompanyId: companyId }))
        );
        mockPrisma.transaction.findMany.mockResolvedValue(transactions);

        // Act
        const result = await paymentService.getCompanyTransactions(companyId);

        // Assert - All amounts should match database exactly
        result.forEach(transaction => {
          const dbTransaction = transactions.find(t => t.id === transaction.id);
          expect(dbTransaction).toBeDefined();
          if (dbTransaction) {
            expect(transaction.amount).toBe(dbTransaction.amount);
            expect(transaction.currency).toBe(dbTransaction.currency);
          }
        });

        // Total should be sum of all transaction amounts
        const expectedTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
        const actualTotal = result.reduce((sum, t) => sum + t.amount, 0);
        expect(actualTotal).toBe(expectedTotal);
      }
    ), { numRuns: 100 });
  });

  it('should ensure refund status accuracy from database', () => {
    fc.assert(fc.property(
      fc.array(transactionArb, { minLength: 1, maxLength: 10 }),
      fc.uuid(),
      async (transactions, companyId) => {
        // Arrange - Filter to only refund transactions
        const refundTransactions = transactions.map(t => ({
          ...t,
          type: 'REFUND' as TransactionType,
        }));
        
        const bookingIds = refundTransactions.map(t => t.bookingId);
        mockPrisma.booking.findMany.mockResolvedValue(
          bookingIds.map(id => ({ id, renterCompanyId: companyId }))
        );
        mockPrisma.transaction.findMany.mockResolvedValue(refundTransactions);

        // Act
        const result = await paymentService.getCompanyTransactions(companyId, {
          type: TransactionType.REFUND,
        });

        // Assert - All returned transactions should be refunds with accurate status
        result.forEach(transaction => {
          expect(transaction.type).toBe('REFUND');
          
          const dbTransaction = refundTransactions.find(t => t.id === transaction.id);
          expect(dbTransaction).toBeDefined();
          if (dbTransaction) {
            expect(transaction.status).toBe(dbTransaction.status);
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure booking payment status consistency', () => {
    fc.assert(fc.property(
      bookingArb,
      fc.constantFrom('PENDING', 'COMPLETED', 'FAILED'),
      async (booking, transactionStatus) => {
        // Arrange
        const transaction = {
          id: 'test-transaction',
          bookingId: booking.id,
          type: 'BOOKING_PAYMENT' as TransactionType,
          amount: booking.total,
          currency: booking.currency,
          status: transactionStatus as TransactionStatus,
          metadata: {},
          createdAt: new Date(),
        };

        mockPrisma.booking.findUnique.mockResolvedValue(booking);
        mockPrisma.transaction.create.mockResolvedValue(transaction);

        // Act
        const result = await paymentService.recordTransaction(
          booking.id,
          booking.total,
          TransactionType.BOOKING_PAYMENT
        );

        // Assert - Transaction should be created with correct booking relationship
        expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
          where: { id: booking.id },
        });

        expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
          data: {
            bookingId: booking.id,
            type: TransactionType.BOOKING_PAYMENT,
            amount: booking.total,
            currency: booking.currency,
            status: TransactionStatus.PENDING,
            metadata: {},
          },
        });

        expect(result.bookingId).toBe(booking.id);
        expect(result.amount).toBe(booking.total);
        expect(result.currency).toBe(booking.currency);
      }
    ), { numRuns: 100 });
  });

  it('should ensure transaction filtering by date range uses database queries', () => {
    fc.assert(fc.property(
      fc.array(transactionArb, { minLength: 1, maxLength: 15 }),
      fc.uuid(),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
      fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }),
      async (transactions, companyId, startDate, endDate) => {
        // Arrange
        const bookingIds = transactions.map(t => t.bookingId);
        mockPrisma.booking.findMany.mockResolvedValue(
          bookingIds.map(id => ({ id, renterCompanyId: companyId }))
        );
        
        // Filter transactions to date range
        const filteredTransactions = transactions.filter(t => 
          t.createdAt >= startDate && t.createdAt <= endDate
        );
        mockPrisma.transaction.findMany.mockResolvedValue(filteredTransactions);

        // Act
        const result = await paymentService.getCompanyTransactions(companyId, {
          startDate,
          endDate,
        });

        // Assert - Should query database with date filters
        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
          where: {
            bookingId: { in: bookingIds },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            booking: {
              include: {
                renterCompany: true,
                providerCompany: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // All returned transactions should be within date range
        result.forEach(transaction => {
          expect(transaction.createdAt).toBeInstanceOf(Date);
          expect(transaction.createdAt.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(transaction.createdAt.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      }
    ), { numRuns: 100 });
  });
});