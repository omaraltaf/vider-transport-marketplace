import { logger } from '../config/logger';

/**
 * Platform Admin Fallback Service
 * 
 * Provides consistent fallback mechanisms for all platform admin services
 * when database queries fail or return insufficient data.
 * 
 * Features:
 * - Realistic Norwegian market data
 * - Consistent error logging
 * - Fallback indicators for UI
 * - Cache-friendly data structures
 */
export class PlatformAdminFallbackService {
  private static instance: PlatformAdminFallbackService;
  private logger = console;

  public static getInstance(): PlatformAdminFallbackService {
    if (!PlatformAdminFallbackService.instance) {
      PlatformAdminFallbackService.instance = new PlatformAdminFallbackService();
    }
    return PlatformAdminFallbackService.instance;
  }

  /**
   * Log fallback usage for monitoring and debugging
   */
  private logFallback(service: string, method: string, error?: Error): void {
    this.logger.warn(`Fallback activated for ${service}.${method}`, {
      service,
      method,
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * User Management Fallbacks
   */
  public getUserManagementFallback(method: string, error?: Error) {
    this.logFallback('UserManagement', method, error);

    return {
      // Basic user statistics
      getUserStats: () => ({
        totalUsers: 22,
        activeUsers: 18,
        verifiedUsers: 15,
        suspendedUsers: 1,
        newUsersThisMonth: 3,
        userGrowthRate: 2.5,
        isFallback: true,
      }),

      // User search results
      searchUsers: () => ({
        users: [
          {
            id: 'fallback-user-1',
            email: 'ola.nordmann@example.no',
            firstName: 'Ola',
            lastName: 'Nordmann',
            emailVerified: true,
            createdAt: new Date('2024-01-15'),
            company: {
              id: 'fallback-company-1',
              name: 'Oslo Transport AS',
              status: 'VERIFIED',
            },
          },
          {
            id: 'fallback-user-2',
            email: 'kari.hansen@example.no',
            firstName: 'Kari',
            lastName: 'Hansen',
            emailVerified: true,
            createdAt: new Date('2024-02-01'),
            company: {
              id: 'fallback-company-2',
              name: 'Bergen Logistics',
              status: 'PENDING',
            },
          },
        ],
        total: 22,
        page: 1,
        limit: 10,
        isFallback: true,
      }),

      // User activity data
      getUserActivity: () => ({
        recentActivity: [
          {
            id: 'activity-1',
            userId: 'fallback-user-1',
            action: 'LOGIN',
            timestamp: new Date(),
            details: 'Bruker logget inn fra Oslo',
          },
          {
            id: 'activity-2',
            userId: 'fallback-user-2',
            action: 'PROFILE_UPDATE',
            timestamp: new Date(Date.now() - 3600000),
            details: 'Oppdaterte firmainformasjon',
          },
        ],
        isFallback: true,
      }),

      // Suspicious activity detection
      getSuspiciousActivity: () => ({
        alerts: [
          {
            id: 'alert-1',
            userId: 'fallback-user-3',
            type: 'MULTIPLE_LOGIN_ATTEMPTS',
            severity: 'MEDIUM',
            description: 'Flere påloggingsforsøk fra forskjellige IP-adresser',
            timestamp: new Date(Date.now() - 7200000),
          },
        ],
        totalAlerts: 1,
        isFallback: true,
      }),
    };
  }

  /**
   * Financial Analytics Fallbacks
   */
  public getFinancialFallback(method: string, error?: Error) {
    this.logFallback('Financial', method, error);

    return {
      // Revenue analytics
      getRevenueSummary: () => ({
        totalRevenue: 125000,
        monthlyRevenue: 15000,
        revenueGrowth: 8.5,
        averageTransactionValue: 850,
        totalTransactions: 147,
        commission: 6250, // 5% commission rate
        isFallback: true,
      }),

      // Revenue trends
      getRevenueTrends: () => ({
        trends: [
          { period: '2024-01', revenue: 12000, transactions: 14 },
          { period: '2024-02', revenue: 13500, transactions: 16 },
          { period: '2024-03', revenue: 15000, transactions: 18 },
        ],
        growthRate: 12.5,
        isFallback: true,
      }),

      // Commission data
      getCommissionData: () => ({
        totalCommission: 6250,
        commissionRate: 5.0,
        monthlyCommission: 750,
        topEarningCompanies: [
          { companyId: 'fallback-company-1', commission: 2500, name: 'Oslo Transport AS' },
          { companyId: 'fallback-company-2', commission: 1800, name: 'Bergen Logistics' },
        ],
        isFallback: true,
      }),

      // Dispute data
      getDisputeData: () => ({
        totalDisputes: 3,
        resolvedDisputes: 2,
        pendingDisputes: 1,
        averageResolutionTime: 2.5, // days
        disputeTypes: [
          { type: 'PAYMENT_ISSUE', count: 2 },
          { type: 'SERVICE_QUALITY', count: 1 },
        ],
        isFallback: true,
      }),
    };
  }

  /**
   * Analytics Fallbacks
   */
  public getAnalyticsFallback(method: string, error?: Error) {
    this.logFallback('Analytics', method, error);

    return {
      // Platform KPIs
      getPlatformKPIs: () => ({
        totalUsers: 22,
        activeUsers: 18,
        totalCompanies: 8,
        verifiedCompanies: 6,
        totalBookings: 45,
        completedBookings: 42,
        totalRevenue: 125000,
        monthlyActiveUsers: 15,
        averageBookingValue: 2976,
        platformGrowthRate: 8.5,
        isFallback: true,
      }),

      // Time series data
      getTimeSeriesData: () => ({
        userGrowth: [
          { date: '2024-01-01', value: 15 },
          { date: '2024-02-01', value: 18 },
          { date: '2024-03-01', value: 22 },
        ],
        bookingGrowth: [
          { date: '2024-01-01', value: 25 },
          { date: '2024-02-01', value: 35 },
          { date: '2024-03-01', value: 45 },
        ],
        revenueGrowth: [
          { date: '2024-01-01', value: 85000 },
          { date: '2024-02-01', value: 105000 },
          { date: '2024-03-01', value: 125000 },
        ],
        isFallback: true,
      }),

      // Geographic analytics
      getGeographicData: () => ({
        regionalData: [
          { region: 'Oslo', userCount: 8, companyCount: 3, revenue: 65000 },
          { region: 'Bergen', userCount: 6, companyCount: 2, revenue: 35000 },
          { region: 'Trondheim', userCount: 4, companyCount: 2, revenue: 18000 },
          { region: 'Stavanger', userCount: 4, companyCount: 1, revenue: 7000 },
        ],
        totalRegions: 4,
        isFallback: true,
      }),

      // Growth analytics
      getGrowthMetrics: () => ({
        userGrowth: {
          currentPeriod: 22,
          previousPeriod: 18,
          growthRate: 22.2,
          growthDirection: 'up' as const,
          periodOverPeriodChange: 4,
          compoundGrowthRate: 18.5,
          timeSeries: [
            { period: '2024-01', value: 15, growthRate: 0 },
            { period: '2024-02', value: 18, growthRate: 20 },
            { period: '2024-03', value: 22, growthRate: 22.2 },
          ],
        },
        bookingGrowth: {
          currentPeriod: 45,
          previousPeriod: 35,
          growthRate: 28.6,
          growthDirection: 'up' as const,
          periodOverPeriodChange: 10,
          compoundGrowthRate: 35.2,
          timeSeries: [
            { period: '2024-01', value: 25, growthRate: 0 },
            { period: '2024-02', value: 35, growthRate: 40 },
            { period: '2024-03', value: 45, growthRate: 28.6 },
          ],
        },
        revenueGrowth: {
          currentPeriod: 125000,
          previousPeriod: 105000,
          growthRate: 19.0,
          growthDirection: 'up' as const,
          periodOverPeriodChange: 20000,
          compoundGrowthRate: 22.1,
          timeSeries: [
            { period: '2024-01', value: 85000, growthRate: 0 },
            { period: '2024-02', value: 105000, growthRate: 23.5 },
            { period: '2024-03', value: 125000, growthRate: 19.0 },
          ],
        },
        cohortAnalysis: [
          {
            cohortMonth: '2024-01',
            cohortSize: 15,
            retentionRates: [
              { month: 0, retainedUsers: 15, retentionRate: 100 },
              { month: 1, retainedUsers: 13, retentionRate: 86.7 },
              { month: 2, retainedUsers: 12, retentionRate: 80 },
            ],
            lifetimeValue: 5500,
            averageLifespan: 8.5,
          },
        ],
        trendAnalysis: {
          userTrend: { slope: 3.5, correlation: 0.95, trend: 'increasing' },
          revenueTrend: { slope: 20000, correlation: 0.88, trend: 'increasing' },
        },
        forecasting: {
          userGrowthForecast: [
            {
              period: '2024-04',
              predicted: 26,
              confidenceInterval: { lower: 24, upper: 28 },
            },
            {
              period: '2024-05',
              predicted: 30,
              confidenceInterval: { lower: 27, upper: 33 },
            },
          ],
          revenueForecast: [
            {
              period: '2024-04',
              predicted: 145000,
              confidenceInterval: { lower: 135000, upper: 155000 },
            },
            {
              period: '2024-05',
              predicted: 165000,
              confidenceInterval: { lower: 150000, upper: 180000 },
            },
          ],
          forecastAccuracy: { mape: 8.5, rmse: 2.1 },
        },
        isFallback: true,
      }),
    };
  }

  /**
   * Content & Security Fallbacks
   */
  public getContentSecurityFallback(method: string, error?: Error) {
    this.logFallback('ContentSecurity', method, error);

    return {
      // Content moderation
      getContentFlags: () => ({
        flags: [
          {
            id: 'flag-1',
            type: 'LOW_RATING',
            entityType: 'REVIEW',
            entityId: 'review-1',
            reason: 'Lav vurdering (2 stjerner) krever gjennomgang',
            severity: 'MEDIUM',
            status: 'PENDING',
            createdAt: new Date(),
          },
        ],
        totalFlags: 1,
        pendingReview: 1,
        isFallback: true,
      }),

      // Blacklist management
      getBlacklistData: () => ({
        blacklistedUsers: 1,
        blacklistedCompanies: 0,
        recentViolations: [
          {
            id: 'violation-1',
            entityType: 'USER',
            entityId: 'user-suspended-1',
            reason: 'Gjentatte brudd på tjenestevilkår',
            timestamp: new Date(Date.now() - 86400000),
          },
        ],
        isFallback: true,
      }),

      // Fraud detection
      getFraudAlerts: () => ({
        alerts: [
          {
            id: 'fraud-1',
            type: 'SUSPICIOUS_TRANSACTION',
            severity: 'MEDIUM',
            description: 'Uvanlig transaksjonsmønster oppdaget',
            entityId: 'transaction-1',
            riskScore: 65,
            timestamp: new Date(Date.now() - 3600000),
          },
        ],
        totalAlerts: 1,
        highRiskAlerts: 0,
        isFallback: true,
      }),
    };
  }

  /**
   * Communication & Support Fallbacks
   */
  public getCommunicationFallback(method: string, error?: Error) {
    this.logFallback('Communication', method, error);

    return {
      // Announcements
      getAnnouncements: () => ({
        announcements: [
          {
            id: 'announcement-1',
            title: 'Systemvedlikehold planlagt',
            content: 'Vi vil utføre planlagt vedlikehold søndag 15. desember kl. 02:00-04:00.',
            type: 'MAINTENANCE',
            priority: 'MEDIUM',
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 86400000),
            scheduledFor: new Date(Date.now() + 172800000),
          },
        ],
        total: 1,
        active: 1,
        isFallback: true,
      }),

      // Support tickets
      getSupportTickets: () => ({
        tickets: [
          {
            id: 'ticket-1',
            subject: 'Problem med betaling',
            description: 'Kan ikke fullføre betaling for booking',
            status: 'OPEN',
            priority: 'HIGH',
            category: 'PAYMENT',
            createdAt: new Date(Date.now() - 7200000),
            userId: 'user-1',
          },
        ],
        total: 1,
        open: 1,
        averageResponseTime: 2.5, // hours
        isFallback: true,
      }),

      // Help center
      getHelpArticles: () => ({
        articles: [
          {
            id: 'article-1',
            title: 'Hvordan bestille transport',
            content: 'Steg-for-steg guide til å bestille transport...',
            category: 'BOOKING',
            views: 125,
            helpful: 18,
            lastUpdated: new Date(Date.now() - 604800000),
          },
        ],
        total: 1,
        categories: ['BOOKING', 'PAYMENT', 'ACCOUNT'],
        isFallback: true,
      }),
    };
  }

  /**
   * System Administration Fallbacks
   */
  public getSystemAdminFallback(method: string, error?: Error) {
    this.logFallback('SystemAdmin', method, error);

    return {
      // System configuration
      getSystemConfig: () => ({
        commissionRate: 5.0,
        maxBookingDuration: 24, // hours
        supportedRegions: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'],
        maintenanceMode: false,
        apiRateLimit: 1000, // requests per hour
        lastUpdated: new Date(Date.now() - 86400000),
        isFallback: true,
      }),

      // System health
      getSystemHealth: () => ({
        status: 'HEALTHY',
        uptime: 99.8,
        responseTime: 145, // ms
        activeConnections: 23,
        memoryUsage: 68.5, // percentage
        cpuUsage: 42.1, // percentage
        diskUsage: 35.2, // percentage
        lastCheck: new Date(),
        isFallback: true,
      }),

      // Backup status
      getBackupStatus: () => ({
        lastBackup: new Date(Date.now() - 86400000),
        backupSize: '2.3 GB',
        status: 'SUCCESS',
        nextScheduled: new Date(Date.now() + 86400000),
        retentionDays: 30,
        isFallback: true,
      }),

      // Security monitoring
      getSecurityEvents: () => ({
        events: [
          {
            id: 'security-1',
            type: 'LOGIN_ATTEMPT',
            severity: 'LOW',
            description: 'Vellykket pålogging fra ny IP-adresse',
            timestamp: new Date(Date.now() - 1800000),
            userId: 'user-1',
          },
        ],
        total: 1,
        criticalEvents: 0,
        isFallback: true,
      }),
    };
  }

  /**
   * Generic error handler for consistent error responses
   */
  public handleServiceError(service: string, method: string, error: Error) {
    this.logFallback(service, method, error);

    return {
      success: false,
      error: 'Tjenesten er midlertidig utilgjengelig. Prøv igjen senere.',
      fallbackData: null,
      isFallback: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if data is from fallback (has isFallback flag)
   */
  public static isFallbackData(data: any): boolean {
    return data && typeof data === 'object' && data.isFallback === true;
  }

  /**
   * Add fallback indicator to any data object
   */
  public static markAsFallback<T extends object>(data: T): T & { isFallback: true } {
    return { ...data, isFallback: true };
  }
}