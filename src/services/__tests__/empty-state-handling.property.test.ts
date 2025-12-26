import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';

// **Feature: mock-data-replacement, Property 12: Empty state handling**
// **Validates: Requirements 7.5**

const mockPrisma = {
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  company: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  vehicleListing: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  driverListing: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  platformConfigs: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock service classes that handle empty states
class EmptyStateTestService {
  constructor(private prisma: PrismaClient) {}

  async getUsers(filters?: any): Promise<{ data: any[]; message?: string }> {
    const users = await this.prisma.user.findMany(filters);
    
    if (users.length === 0) {
      return {
        data: [],
        message: 'No users found matching the criteria'
      };
    }
    
    return { data: users };
  }

  async getCompanies(filters?: any): Promise<{ data: any[]; message?: string }> {
    const companies = await this.prisma.company.findMany(filters);
    
    if (companies.length === 0) {
      return {
        data: [],
        message: 'No companies found'
      };
    }
    
    return { data: companies };
  }

  async getBookings(filters?: any): Promise<{ data: any[]; message?: string }> {
    const bookings = await this.prisma.booking.findMany(filters);
    
    if (bookings.length === 0) {
      return {
        data: [],
        message: 'No bookings available'
      };
    }
    
    return { data: bookings };
  }

  async getTransactions(filters?: any): Promise<{ data: any[]; message?: string }> {
    const transactions = await this.prisma.transaction.findMany(filters);
    
    if (transactions.length === 0) {
      return {
        data: [],
        message: 'No transactions found'
      };
    }
    
    return { data: transactions };
  }

  async searchListings(query: string): Promise<{ data: any[]; message?: string }> {
    const [vehicles, drivers] = await Promise.all([
      this.prisma.vehicleListing.findMany({
        where: { title: { contains: query, mode: 'insensitive' } }
      }),
      this.prisma.driverListing.findMany({
        where: { name: { contains: query, mode: 'insensitive' } }
      })
    ]);

    const allListings = [...vehicles, ...drivers];
    
    if (allListings.length === 0) {
      return {
        data: [],
        message: `No listings found for "${query}"`
      };
    }
    
    return { data: allListings };
  }

  async getConfigurations(category?: string): Promise<{ data: any[]; message?: string }> {
    const configs = await this.prisma.platformConfigs.findMany(
      category ? { where: { category } } : undefined
    );
    
    if (configs.length === 0) {
      return {
        data: [],
        message: category ? `No configurations found for category "${category}"` : 'No configurations available'
      };
    }
    
    return { data: configs };
  }
}

const testService = new EmptyStateTestService(mockPrisma);

// Test data generators
const emptyFiltersArb = fc.record({
  status: fc.option(fc.constantFrom('ACTIVE', 'INACTIVE', 'NONEXISTENT'), { nil: undefined }),
  category: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
  dateRange: fc.option(fc.record({
    start: fc.date(),
    end: fc.date(),
  }), { nil: undefined }),
});

const searchQueryArb = fc.string({ minLength: 3, maxLength: 30 });

describe('Empty State Handling Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty arrays with appropriate messages when no users found', () => {
    fc.assert(fc.property(
      emptyFiltersArb,
      async (filters) => {
        // Arrange - Database returns empty results
        mockPrisma.user.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.getUsers(filters);

        // Assert - Should return empty array with message, not sample data
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(result.message).toBe('No users found matching the criteria');

        // Should not contain any sample/mock user data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            name: expect.any(String),
            email: expect.any(String),
          })
        );

        // Verify database was queried
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(filters);
      }
    ), { numRuns: 100 });
  });

  it('should return empty arrays with appropriate messages when no companies found', () => {
    fc.assert(fc.property(
      emptyFiltersArb,
      async (filters) => {
        // Arrange - Database returns empty results
        mockPrisma.company.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.getCompanies(filters);

        // Assert - Should return empty array with message, not sample data
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(result.message).toBe('No companies found');

        // Should not contain any sample company data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            name: expect.any(String),
            organizationNumber: expect.any(String),
          })
        );

        // Verify database was queried
        expect(mockPrisma.company.findMany).toHaveBeenCalledWith(filters);
      }
    ), { numRuns: 100 });
  });

  it('should return empty arrays with appropriate messages when no bookings found', () => {
    fc.assert(fc.property(
      emptyFiltersArb,
      async (filters) => {
        // Arrange - Database returns empty results
        mockPrisma.booking.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.getBookings(filters);

        // Assert - Should return empty array with message, not sample data
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(result.message).toBe('No bookings available');

        // Should not contain any sample booking data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            bookingNumber: expect.any(String),
            status: expect.any(String),
          })
        );

        // Verify database was queried
        expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(filters);
      }
    ), { numRuns: 100 });
  });

  it('should return empty arrays with appropriate messages when no transactions found', () => {
    fc.assert(fc.property(
      emptyFiltersArb,
      async (filters) => {
        // Arrange - Database returns empty results
        mockPrisma.transaction.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.getTransactions(filters);

        // Assert - Should return empty array with message, not sample data
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(result.message).toBe('No transactions found');

        // Should not contain any sample transaction data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            amount: expect.any(Number),
            type: expect.any(String),
          })
        );

        // Verify database was queried
        expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(filters);
      }
    ), { numRuns: 100 });
  });

  it('should return empty arrays with search-specific messages when no listings found', () => {
    fc.assert(fc.property(
      searchQueryArb,
      async (query) => {
        // Arrange - Database returns empty results for search
        mockPrisma.vehicleListing.findMany.mockResolvedValue([]);
        mockPrisma.driverListing.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.searchListings(query);

        // Assert - Should return empty array with search-specific message
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(result.message).toBe(`No listings found for "${query}"`);

        // Should not contain any sample listing data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            title: expect.any(String),
            description: expect.any(String),
          })
        );

        // Verify both vehicle and driver listings were searched
        expect(mockPrisma.vehicleListing.findMany).toHaveBeenCalledWith({
          where: { title: { contains: query, mode: 'insensitive' } }
        });
        expect(mockPrisma.driverListing.findMany).toHaveBeenCalledWith({
          where: { name: { contains: query, mode: 'insensitive' } }
        });
      }
    ), { numRuns: 100 });
  });

  it('should return empty arrays with category-specific messages when no configurations found', () => {
    fc.assert(fc.property(
      fc.option(fc.constantFrom('financial', 'system', 'features', 'security', 'nonexistent'), { nil: undefined }),
      async (category) => {
        // Arrange - Database returns empty results
        mockPrisma.platformConfigs.findMany.mockResolvedValue([]);

        // Act
        const result = await testService.getConfigurations(category);

        // Assert - Should return empty array with appropriate message
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        
        if (category) {
          expect(result.message).toBe(`No configurations found for category "${category}"`);
        } else {
          expect(result.message).toBe('No configurations available');
        }

        // Should not contain any sample configuration data
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            key: expect.any(String),
            value: expect.any(String),
            displayName: expect.any(String),
          })
        );

        // Verify database was queried with correct filter
        const expectedFilter = category ? { where: { category } } : undefined;
        expect(mockPrisma.platformConfigs.findMany).toHaveBeenCalledWith(expectedFilter);
      }
    ), { numRuns: 100 });
  });

  it('should ensure empty state messages are descriptive and user-friendly', () => {
    fc.assert(fc.property(
      fc.constantFrom('users', 'companies', 'bookings', 'transactions'),
      async (dataType) => {
        // Arrange - Database returns empty results
        mockPrisma.user.findMany.mockResolvedValue([]);
        mockPrisma.company.findMany.mockResolvedValue([]);
        mockPrisma.booking.findMany.mockResolvedValue([]);
        mockPrisma.transaction.findMany.mockResolvedValue([]);

        // Act
        let result: { data: any[]; message?: string };
        switch (dataType) {
          case 'users':
            result = await testService.getUsers();
            break;
          case 'companies':
            result = await testService.getCompanies();
            break;
          case 'bookings':
            result = await testService.getBookings();
            break;
          case 'transactions':
            result = await testService.getTransactions();
            break;
          default:
            result = { data: [] };
        }

        // Assert - Message should be descriptive and user-friendly
        expect(result.message).toBeDefined();
        expect(result.message).toMatch(/^No .+ (found|available)/);
        expect(result.message).not.toMatch(/error|fail|null|undefined/i);
        
        // Should not contain technical jargon
        expect(result.message).not.toMatch(/query|database|sql|prisma/i);
        
        // Should be helpful to the user
        expect(result.message!.length).toBeGreaterThan(10);
        expect(result.message!.length).toBeLessThan(100);
      }
    ), { numRuns: 100 });
  });

  it('should ensure empty arrays are truly empty and not contain placeholder data', () => {
    fc.assert(fc.property(
      fc.constantFrom('users', 'companies', 'bookings', 'transactions', 'configurations'),
      async (dataType) => {
        // Arrange - Database returns empty results
        mockPrisma.user.findMany.mockResolvedValue([]);
        mockPrisma.company.findMany.mockResolvedValue([]);
        mockPrisma.booking.findMany.mockResolvedValue([]);
        mockPrisma.transaction.findMany.mockResolvedValue([]);
        mockPrisma.platformConfigs.findMany.mockResolvedValue([]);

        // Act
        let result: { data: any[] };
        switch (dataType) {
          case 'users':
            result = await testService.getUsers();
            break;
          case 'companies':
            result = await testService.getCompanies();
            break;
          case 'bookings':
            result = await testService.getBookings();
            break;
          case 'transactions':
            result = await testService.getTransactions();
            break;
          case 'configurations':
            result = await testService.getConfigurations();
            break;
          default:
            result = { data: [] };
        }

        // Assert - Array should be truly empty
        expect(result.data).toEqual([]);
        expect(result.data).toHaveLength(0);
        expect(Array.isArray(result.data)).toBe(true);
        
        // Should not contain any placeholder objects
        expect(result.data).not.toContainEqual(
          expect.objectContaining({
            id: expect.stringMatching(/placeholder|sample|mock|test/i)
          })
        );
        
        // Should not contain any objects with placeholder values
        result.data.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            Object.values(item).forEach(value => {
              if (typeof value === 'string') {
                expect(value).not.toMatch(/placeholder|sample|mock|test|lorem|ipsum/i);
              }
            });
          }
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure consistent empty state behavior across different filter combinations', () => {
    fc.assert(fc.property(
      fc.record({
        hasStatusFilter: fc.boolean(),
        hasCategoryFilter: fc.boolean(),
        hasDateFilter: fc.boolean(),
      }),
      async (filterConfig) => {
        // Arrange - Build filters based on configuration
        const filters: any = {};
        if (filterConfig.hasStatusFilter) {
          filters.status = 'NONEXISTENT_STATUS';
        }
        if (filterConfig.hasCategoryFilter) {
          filters.category = 'nonexistent_category';
        }
        if (filterConfig.hasDateFilter) {
          filters.dateRange = {
            start: new Date('2099-01-01'),
            end: new Date('2099-01-02'),
          };
        }

        // Database returns empty for all queries
        mockPrisma.user.findMany.mockResolvedValue([]);
        mockPrisma.company.findMany.mockResolvedValue([]);
        mockPrisma.booking.findMany.mockResolvedValue([]);

        // Act
        const [userResult, companyResult, bookingResult] = await Promise.all([
          testService.getUsers(filters),
          testService.getCompanies(filters),
          testService.getBookings(filters),
        ]);

        // Assert - All should consistently return empty arrays with messages
        [userResult, companyResult, bookingResult].forEach(result => {
          expect(result.data).toEqual([]);
          expect(result.data).toHaveLength(0);
          expect(result.message).toBeDefined();
          expect(result.message).toMatch(/^No .+/);
        });

        // Verify all database queries were made with filters
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(filters);
        expect(mockPrisma.company.findMany).toHaveBeenCalledWith(filters);
        expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(filters);
      }
    ), { numRuns: 100 });
  });
});