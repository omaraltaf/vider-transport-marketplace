import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

/**
 * Database Performance Optimizer
 * 
 * Provides performance optimization utilities for database queries
 * including query analysis, indexing recommendations, and performance monitoring.
 */
export class DatabasePerformanceOptimizer {
  private static logger = console;
  private static queryMetrics = new Map<string, {
    count: number;
    totalDuration: number;
    averageDuration: number;
    slowQueries: number;
    lastExecuted: Date;
  }>();

  /**
   * Monitor query performance and log slow queries
   */
  static async monitorQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    slowQueryThreshold: number = 1000 // ms
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await query();
      const duration = Date.now() - startTime;
      
      // Update metrics
      this.updateQueryMetrics(queryName, duration, slowQueryThreshold);
      
      // Log slow queries
      if (duration > slowQueryThreshold) {
        this.logger.warn(`Slow query detected: ${queryName}`, {
          queryName,
          duration,
          threshold: slowQueryThreshold,
          timestamp: new Date().toISOString(),
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(queryName, duration, slowQueryThreshold, true);
      
      this.logger.error(`Query failed: ${queryName}`, {
        queryName,
        duration,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }

  /**
   * Update query performance metrics
   */
  private static updateQueryMetrics(
    queryName: string,
    duration: number,
    threshold: number,
    failed: boolean = false
  ): void {
    const existing = this.queryMetrics.get(queryName) || {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowQueries: 0,
      lastExecuted: new Date(),
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.count;
    existing.lastExecuted = new Date();
    
    if (duration > threshold) {
      existing.slowQueries++;
    }

    this.queryMetrics.set(queryName, existing);
  }

  /**
   * Get performance metrics for all queries
   */
  static getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [queryName, data] of this.queryMetrics.entries()) {
      metrics[queryName] = {
        ...data,
        slowQueryPercentage: (data.slowQueries / data.count) * 100,
      };
    }
    
    return metrics;
  }

  /**
   * Optimized user queries with proper indexing
   */
  static getOptimizedUserQueries(prisma: PrismaClient) {
    return {
      // Optimized user search with compound index on email + emailVerified
      searchUsers: async (filters: {
        email?: string;
        verified?: boolean;
        companyStatus?: string;
        limit?: number;
        offset?: number;
      }) => {
        return this.monitorQuery('searchUsers', async () => {
          const whereClause: any = {};
          
          if (filters.email) {
            whereClause.email = { contains: filters.email, mode: 'insensitive' };
          }
          
          if (filters.verified !== undefined) {
            whereClause.emailVerified = filters.verified;
          }
          
          if (filters.companyStatus) {
            whereClause.company = { status: filters.companyStatus };
          }

          return prisma.user.findMany({
            where: whereClause,
            include: {
              company: {
                select: { id: true, name: true, status: true, fylke: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit || 20,
            skip: filters.offset || 0,
          });
        });
      },

      // Optimized user statistics with aggregation
      getUserStats: async () => {
        return this.monitorQuery('getUserStats', async () => {
          const [totalUsers, verifiedUsers, companyCounts] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { emailVerified: true } }),
            prisma.company.groupBy({
              by: ['status'],
              _count: { id: true },
            }),
          ]);

          return {
            totalUsers,
            verifiedUsers,
            unverifiedUsers: totalUsers - verifiedUsers,
            companyCounts: companyCounts.reduce((acc, item) => {
              acc[item.status] = item._count.id;
              return acc;
            }, {} as Record<string, number>),
          };
        });
      },
    };
  }

  /**
   * Optimized financial queries with proper aggregations
   */
  static getOptimizedFinancialQueries(prisma: PrismaClient) {
    return {
      // Optimized revenue aggregation with date indexing
      getRevenueSummary: async (startDate: Date, endDate: Date) => {
        return this.monitorQuery('getRevenueSummary', async () => {
          const [currentPeriod, previousPeriod] = await Promise.all([
            prisma.transaction.aggregate({
              where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'COMPLETED',
              },
              _sum: { amount: true },
              _count: true,
              _avg: { amount: true },
            }),
            prisma.transaction.aggregate({
              where: {
                createdAt: {
                  gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
                  lt: startDate,
                },
                status: 'COMPLETED',
              },
              _sum: { amount: true },
              _count: true,
            }),
          ]);

          return { currentPeriod, previousPeriod };
        });
      },

      // Optimized revenue trends with time-based grouping
      getRevenueTrends: async (startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'month') => {
        return this.monitorQuery('getRevenueTrends', async () => {
          // Use raw query for efficient time-based grouping
          const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : 
                           groupBy === 'week' ? '%Y-%u' : '%Y-%m';
          
          return prisma.$queryRaw`
            SELECT 
              DATE_FORMAT(createdAt, ${dateFormat}) as period,
              SUM(amount) as revenue,
              COUNT(*) as transaction_count,
              AVG(amount) as avg_transaction_value
            FROM Transaction 
            WHERE createdAt >= ${startDate} 
              AND createdAt <= ${endDate}
              AND status = 'COMPLETED'
            GROUP BY DATE_FORMAT(createdAt, ${dateFormat})
            ORDER BY period ASC
          `;
        });
      },
    };
  }

  /**
   * Optimized analytics queries with efficient aggregations
   */
  static getOptimizedAnalyticsQueries(prisma: PrismaClient) {
    return {
      // Optimized platform KPIs with parallel execution
      getPlatformKPIs: async () => {
        return this.monitorQuery('getPlatformKPIs', async () => {
          const [
            userStats,
            companyStats,
            bookingStats,
            transactionStats,
          ] = await Promise.all([
            prisma.user.aggregate({
              _count: { id: true },
              where: { emailVerified: true },
            }),
            prisma.company.aggregate({
              _count: { id: true },
            }),
            prisma.booking.aggregate({
              _count: { id: true },
              where: { status: { in: ['ACCEPTED', 'COMPLETED'] } },
            }),
            prisma.transaction.aggregate({
              _sum: { amount: true },
              _count: { id: true },
              where: { status: 'COMPLETED' },
            }),
          ]);

          return {
            users: userStats._count.id,
            companies: companyStats._count.id,
            bookings: bookingStats._count.id,
            revenue: transactionStats._sum.amount || 0,
            transactions: transactionStats._count.id,
          };
        });
      },

      // Optimized geographic analytics with spatial indexing
      getGeographicAnalytics: async () => {
        return this.monitorQuery('getGeographicAnalytics', async () => {
          return prisma.$queryRaw`
            SELECT 
              c.fylke as region,
              COUNT(DISTINCT u.id) as user_count,
              COUNT(DISTINCT c.id) as company_count,
              COALESCE(SUM(t.amount), 0) as total_revenue
            FROM Company c
            LEFT JOIN User u ON u.companyId = c.id
            LEFT JOIN Booking b ON b.providerCompanyId = c.id OR b.renterCompanyId = c.id
            LEFT JOIN Transaction t ON t.bookingId = b.id AND t.status = 'COMPLETED'
            WHERE c.fylke IS NOT NULL
            GROUP BY c.fylke
            ORDER BY total_revenue DESC
          `;
        });
      },
    };
  }

  /**
   * Database indexing recommendations
   */
  static getIndexingRecommendations(): string[] {
    return [
      // User table indexes
      'CREATE INDEX IF NOT EXISTS idx_user_email_verified ON User(email, emailVerified);',
      'CREATE INDEX IF NOT EXISTS idx_user_company_id ON User(companyId);',
      'CREATE INDEX IF NOT EXISTS idx_user_created_at ON User(createdAt);',
      
      // Company table indexes
      'CREATE INDEX IF NOT EXISTS idx_company_status ON Company(status);',
      'CREATE INDEX IF NOT EXISTS idx_company_fylke ON Company(fylke);',
      'CREATE INDEX IF NOT EXISTS idx_company_created_at ON Company(createdAt);',
      
      // Transaction table indexes
      'CREATE INDEX IF NOT EXISTS idx_transaction_status_created ON Transaction(status, createdAt);',
      'CREATE INDEX IF NOT EXISTS idx_transaction_booking_id ON Transaction(bookingId);',
      'CREATE INDEX IF NOT EXISTS idx_transaction_amount ON Transaction(amount);',
      
      // Booking table indexes
      'CREATE INDEX IF NOT EXISTS idx_booking_status ON Booking(status);',
      'CREATE INDEX IF NOT EXISTS idx_booking_provider_company ON Booking(providerCompanyId);',
      'CREATE INDEX IF NOT EXISTS idx_booking_renter_company ON Booking(renterCompanyId);',
      'CREATE INDEX IF NOT EXISTS idx_booking_created_at ON Booking(createdAt);',
      
      // Audit log indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON AuditLog(entityType, entityId);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_action ON AuditLog(action);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON AuditLog(createdAt);',
      
      // Security alert indexes
      'CREATE INDEX IF NOT EXISTS idx_security_alert_severity ON SecurityAlert(severity);',
      'CREATE INDEX IF NOT EXISTS idx_security_alert_created_at ON SecurityAlert(createdAt);',
      
      // Composite indexes for common query patterns
      'CREATE INDEX IF NOT EXISTS idx_user_company_status ON User(companyId) WHERE emailVerified = true;',
      'CREATE INDEX IF NOT EXISTS idx_transaction_date_status ON Transaction(createdAt, status) WHERE status = "COMPLETED";',
    ];
  }

  /**
   * Apply database indexes for performance optimization
   */
  static async applyIndexes(prisma: PrismaClient): Promise<void> {
    const recommendations = this.getIndexingRecommendations();
    
    for (const indexQuery of recommendations) {
      try {
        await prisma.$executeRawUnsafe(indexQuery);
        this.logger.info(`Applied index: ${indexQuery}`);
      } catch (error) {
        // Index might already exist, log as warning
        this.logger.warn(`Failed to apply index (might already exist): ${indexQuery}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Analyze query performance and provide recommendations
   */
  static analyzePerformance(): {
    slowQueries: string[];
    recommendations: string[];
    metrics: Record<string, any>;
  } {
    const metrics = this.getPerformanceMetrics();
    const slowQueries: string[] = [];
    const recommendations: string[] = [];

    for (const [queryName, data] of Object.entries(metrics)) {
      if (data.slowQueryPercentage > 10) {
        slowQueries.push(queryName);
        
        if (queryName.includes('search')) {
          recommendations.push(`Consider adding compound indexes for ${queryName} search filters`);
        }
        
        if (queryName.includes('aggregate') || queryName.includes('Stats')) {
          recommendations.push(`Consider caching results for ${queryName} with appropriate TTL`);
        }
        
        if (data.averageDuration > 2000) {
          recommendations.push(`${queryName} is consistently slow (${data.averageDuration}ms avg) - review query structure`);
        }
      }
    }

    return {
      slowQueries,
      recommendations,
      metrics,
    };
  }

  /**
   * Clear performance metrics (useful for testing)
   */
  static clearMetrics(): void {
    this.queryMetrics.clear();
  }
}