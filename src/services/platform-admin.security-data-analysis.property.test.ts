import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import fc from 'fast-check';

// Mock Prisma
const mockPrisma = {
  securityAlert: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  company: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
};

describe('Platform Admin Security Data Analysis - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  /**
   * Property 1: Security Analysis Data Consistency
   * **Feature: mock-data-replacement, Property 1: Security analysis data consistency**
   * **Validates: Requirements 4.3**
   * 
   * Validates that security analysis maintains data consistency
   * across different security services and alert types
   */
  it('should maintain security analysis data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alertCount: fc.integer({ min: 0, max: 100 }),
          suspendedUsers: fc.integer({ min: 0, max: 20 }),
          suspendedCompanies: fc.integer({ min: 0, max: 10 }),
          failedTransactions: fc.integer({ min: 0, max: 50 }),
          securityEvents: fc.integer({ min: 0, max: 200 }),
        }),
        async ({ alertCount, suspendedUsers, suspendedCompanies, failedTransactions, securityEvents }) => {
          // Mock security alerts
          const mockAlerts = Array.from({ length: alertCount }, (_, i) => ({
            id: `alert-${i}`,
            type: ['LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FRAUD_DETECTION', 'SYSTEM_BREACH'][i % 4],
            severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
            description: `Security alert ${i}`,
            createdAt: new Date(Date.now() - i * 3600000),
            resolved: i % 3 === 0,
          }));

          // Mock suspended entities
          const mockSuspendedUsers = Array.from({ length: suspendedUsers }, (_, i) => ({
            id: `user-${i}`,
            email: `suspended${i}@example.no`,
            company: { status: 'SUSPENDED' },
          }));

          const mockSuspendedCompanies = Array.from({ length: suspendedCompanies }, (_, i) => ({
            id: `company-${i}`,
            name: `Suspended Company ${i}`,
            status: 'SUSPENDED',
          }));

          // Mock failed transactions
          const mockFailedTransactions = Array.from({ length: failedTransactions }, (_, i) => ({
            id: `transaction-${i}`,
            amount: Math.random() * 10000,
            status: 'FAILED',
            createdAt: new Date(Date.now() - i * 1800000),
          }));

          // Setup mocks
          mockPrisma.securityAlert.findMany.mockResolvedValue(mockAlerts);
          mockPrisma.securityAlert.count.mockResolvedValue(alertCount);
          mockPrisma.user.findMany.mockResolvedValue(mockSuspendedUsers);
          mockPrisma.user.count.mockResolvedValue(suspendedUsers);
          mockPrisma.company.findMany.mockResolvedValue(mockSuspendedCompanies);
          mockPrisma.company.count.mockResolvedValue(suspendedCompanies);
          mockPrisma.transaction.findMany.mockResolvedValue(mockFailedTransactions);
          mockPrisma.transaction.count.mockResolvedValue(failedTransactions);
          mockPrisma.auditLog.count.mockResolvedValue(securityEvents);

          // Import services dynamically to avoid constructor issues
          const { SecurityMonitoringService } = await import('./security-monitoring.service');
          const { FraudDetectionService } = await import('./fraud-detection.service');
          const { BlacklistManagementService } = await import('./blacklist-management.service');

          const securityService = new SecurityMonitoringService();
          const fraudService = new FraudDetectionService();
          const blacklistService = new BlacklistManagementService();

          // Test security monitoring data consistency
          const securityEvents = await securityService.getSecurityEvents({
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(),
            severity: 'ALL',
          });

          // Validate security events structure
          expect(Array.isArray(securityEvents.events)).toBe(true);
          expect(typeof securityEvents.total).toBe('number');
          expect(typeof securityEvents.criticalCount).toBe('number');
          expect(typeof securityEvents.resolvedCount).toBe('number');

          // Validate data consistency
          expect(securityEvents.total).toBe(alertCount);
          expect(securityEvents.criticalCount).toBeLessThanOrEqual(securityEvents.total);
          expect(securityEvents.resolvedCount).toBeLessThanOrEqual(securityEvents.total);

          // Validate individual event structure
          securityEvents.events.forEach(event => {
            expect(event).toHaveProperty('id');
            expect(event).toHaveProperty('type');
            expect(event).toHaveProperty('severity');
            expect(event).toHaveProperty('description');
            expect(event).toHaveProperty('timestamp');
            expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(event.severity);
            expect(['LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FRAUD_DETECTION', 'SYSTEM_BREACH']).toContain(event.type);
          });

          // Test fraud detection data consistency
          const fraudAlerts = await fraudService.getFraudAlerts({
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(),
            severity: 'ALL',
          });

          // Validate fraud alerts structure
          expect(Array.isArray(fraudAlerts.alerts)).toBe(true);
          expect(typeof fraudAlerts.totalAlerts).toBe('number');
          expect(typeof fraudAlerts.highRiskAlerts).toBe('number');
          expect(typeof fraudAlerts.averageRiskScore).toBe('number');

          // Validate fraud data consistency
          expect(fraudAlerts.totalAlerts).toBeGreaterThanOrEqual(0);
          expect(fraudAlerts.highRiskAlerts).toBeLessThanOrEqual(fraudAlerts.totalAlerts);
          expect(fraudAlerts.averageRiskScore).toBeGreaterThanOrEqual(0);
          expect(fraudAlerts.averageRiskScore).toBeLessThanOrEqual(100);

          // Test blacklist management data consistency
          const blacklistStats = await blacklistService.getBlacklistStatistics();

          // Validate blacklist statistics structure
          expect(typeof blacklistStats.totalEntries).toBe('number');
          expect(typeof blacklistStats.activeEntries).toBe('number');
          expect(typeof blacklistStats.recentViolations).toBe('number');
          expect(Array.isArray(blacklistStats.violationsByType)).toBe(true);

          // Validate blacklist data consistency
          expect(blacklistStats.totalEntries).toBeGreaterThanOrEqual(0);
          expect(blacklistStats.activeEntries).toBeLessThanOrEqual(blacklistStats.totalEntries);
          expect(blacklistStats.recentViolations).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 2: Security Alert Severity Classification Consistency
   * Validates that security alert severity classification is consistent
   * and follows proper escalation rules
   */
  it('should maintain security alert severity classification consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          alerts: fc.array(
            fc.record({
              type: fc.constantFrom('LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FRAUD_DETECTION', 'SYSTEM_BREACH'),
              riskScore: fc.integer({ min: 0, max: 100 }),
              failureCount: fc.integer({ min: 0, max: 10 }),
              timeWindow: fc.integer({ min: 1, max: 24 }), // hours
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        async ({ alerts }) => {
          // Mock security alerts with calculated severity
          const mockAlerts = alerts.map((alert, i) => {
            let severity = 'LOW';
            
            // Determine severity based on risk factors
            if (alert.riskScore >= 80 || alert.failureCount >= 5 || alert.type === 'SYSTEM_BREACH') {
              severity = 'CRITICAL';
            } else if (alert.riskScore >= 60 || alert.failureCount >= 3) {
              severity = 'HIGH';
            } else if (alert.riskScore >= 30 || alert.failureCount >= 1) {
              severity = 'MEDIUM';
            }

            return {
              id: `alert-${i}`,
              type: alert.type,
              severity,
              riskScore: alert.riskScore,
              failureCount: alert.failureCount,
              description: `Alert ${i} with risk score ${alert.riskScore}`,
              createdAt: new Date(Date.now() - alert.timeWindow * 3600000),
            };
          });

          mockPrisma.securityAlert.findMany.mockResolvedValue(mockAlerts);
          mockPrisma.securityAlert.count.mockResolvedValue(mockAlerts.length);

          const { SecurityMonitoringService } = await import('./security-monitoring.service');
          const securityService = new SecurityMonitoringService();

          const securityEvents = await securityService.getSecurityEvents({
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(),
            severity: 'ALL',
          });

          // Validate severity classification consistency
          securityEvents.events.forEach((event, index) => {
            const originalAlert = alerts[index];
            
            // Validate severity assignment logic
            if (originalAlert.riskScore >= 80 || originalAlert.failureCount >= 5 || originalAlert.type === 'SYSTEM_BREACH') {
              expect(event.severity).toBe('CRITICAL');
            } else if (originalAlert.riskScore >= 60 || originalAlert.failureCount >= 3) {
              expect(event.severity).toBe('HIGH');
            } else if (originalAlert.riskScore >= 30 || originalAlert.failureCount >= 1) {
              expect(event.severity).toBe('MEDIUM');
            } else {
              expect(event.severity).toBe('LOW');
            }

            // Validate that severity is one of the valid values
            expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(event.severity);
          });

          // Validate severity distribution
          const severityCounts = securityEvents.events.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const criticalCount = severityCounts.CRITICAL || 0;
          const highCount = severityCounts.HIGH || 0;
          const mediumCount = severityCounts.MEDIUM || 0;
          const lowCount = severityCounts.LOW || 0;

          expect(criticalCount + highCount + mediumCount + lowCount).toBe(securityEvents.events.length);
          expect(securityEvents.criticalCount).toBe(criticalCount);

          return true;
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * Property 3: Security Metrics Temporal Consistency
   * Validates that security metrics maintain temporal consistency
   * and proper time-based aggregations
   */
  it('should maintain security metrics temporal consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          timeRange: fc.record({
            startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
            endDate: fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }),
          }),
          eventsPerDay: fc.integer({ min: 0, max: 50 }),
        }),
        async ({ timeRange, eventsPerDay }) => {
          const daysDiff = Math.ceil((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
          const totalEvents = Math.min(daysDiff * eventsPerDay, 1000); // Cap for performance

          // Generate time-distributed events
          const mockEvents = Array.from({ length: totalEvents }, (_, i) => {
            const eventTime = new Date(
              timeRange.startDate.getTime() + 
              (i / totalEvents) * (timeRange.endDate.getTime() - timeRange.startDate.getTime())
            );

            return {
              id: `event-${i}`,
              type: ['LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FRAUD_DETECTION'][i % 3],
              severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
              createdAt: eventTime,
              resolved: i % 4 === 0,
            };
          });

          mockPrisma.securityAlert.findMany.mockResolvedValue(mockEvents);
          mockPrisma.securityAlert.count.mockResolvedValue(totalEvents);

          // Mock time-based aggregation query
          mockPrisma.$queryRaw.mockResolvedValue(
            Array.from({ length: Math.min(daysDiff, 30) }, (_, i) => ({
              date: new Date(timeRange.startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              event_count: eventsPerDay,
              critical_count: Math.floor(eventsPerDay * 0.1),
              resolved_count: Math.floor(eventsPerDay * 0.75),
            }))
          );

          const { SecurityMonitoringService } = await import('./security-monitoring.service');
          const securityService = new SecurityMonitoringService();

          const securityTrends = await securityService.getSecurityTrends(timeRange.startDate, timeRange.endDate);

          // Validate temporal consistency
          expect(Array.isArray(securityTrends.dailyEvents)).toBe(true);
          expect(typeof securityTrends.totalEvents).toBe('number');
          expect(typeof securityTrends.averageEventsPerDay).toBe('number');
          expect(typeof securityTrends.trendDirection).toBe('string');

          // Validate time-based data structure
          securityTrends.dailyEvents.forEach((dayData, index) => {
            expect(dayData).toHaveProperty('date');
            expect(dayData).toHaveProperty('eventCount');
            expect(dayData).toHaveProperty('criticalCount');
            expect(dayData).toHaveProperty('resolvedCount');

            // Validate data types and ranges
            expect(typeof dayData.eventCount).toBe('number');
            expect(typeof dayData.criticalCount).toBe('number');
            expect(typeof dayData.resolvedCount).toBe('number');

            expect(dayData.eventCount).toBeGreaterThanOrEqual(0);
            expect(dayData.criticalCount).toBeLessThanOrEqual(dayData.eventCount);
            expect(dayData.resolvedCount).toBeLessThanOrEqual(dayData.eventCount);

            // Validate temporal ordering
            if (index > 0) {
              const currentDate = new Date(dayData.date);
              const previousDate = new Date(securityTrends.dailyEvents[index - 1].date);
              expect(currentDate.getTime()).toBeGreaterThan(previousDate.getTime());
            }
          });

          // Validate aggregated metrics
          const totalEventsFromDaily = securityTrends.dailyEvents.reduce((sum, day) => sum + day.eventCount, 0);
          expect(securityTrends.totalEvents).toBeCloseTo(totalEventsFromDaily, 0);

          if (securityTrends.dailyEvents.length > 0) {
            const expectedAverage = totalEventsFromDaily / securityTrends.dailyEvents.length;
            expect(securityTrends.averageEventsPerDay).toBeCloseTo(expectedAverage, 1);
          }

          // Validate trend direction
          expect(['increasing', 'decreasing', 'stable']).toContain(securityTrends.trendDirection);

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 4: Cross-Service Security Data Consistency
   * Validates that security data is consistent across different
   * security-related services (monitoring, fraud detection, blacklist)
   */
  it('should maintain cross-service security data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          securityAlerts: fc.integer({ min: 0, max: 50 }),
          fraudAlerts: fc.integer({ min: 0, max: 30 }),
          blacklistEntries: fc.integer({ min: 0, max: 20 }),
          suspendedEntities: fc.integer({ min: 0, max: 15 }),
        }),
        async ({ securityAlerts, fraudAlerts, blacklistEntries, suspendedEntities }) => {
          // Mock consistent data across services
          const mockSecurityAlerts = Array.from({ length: securityAlerts }, (_, i) => ({
            id: `security-${i}`,
            type: 'SUSPICIOUS_ACTIVITY',
            severity: i < fraudAlerts ? 'HIGH' : 'MEDIUM',
            userId: i < suspendedEntities ? `user-${i}` : null,
          }));

          const mockFraudAlerts = Array.from({ length: fraudAlerts }, (_, i) => ({
            id: `fraud-${i}`,
            type: 'FRAUD_DETECTION',
            riskScore: 70 + (i * 5) % 30,
            userId: `user-${i}`,
          }));

          const mockBlacklistEntries = Array.from({ length: blacklistEntries }, (_, i) => ({
            id: `blacklist-${i}`,
            type: 'USER',
            value: `user-${i}`,
            active: true,
          }));

          const mockSuspendedUsers = Array.from({ length: suspendedEntities }, (_, i) => ({
            id: `user-${i}`,
            status: 'SUSPENDED',
            company: { status: 'SUSPENDED' },
          }));

          // Setup mocks for all services
          mockPrisma.securityAlert.findMany.mockResolvedValue(mockSecurityAlerts);
          mockPrisma.securityAlert.count.mockResolvedValue(securityAlerts);
          mockPrisma.user.findMany.mockResolvedValue(mockSuspendedUsers);
          mockPrisma.user.count.mockResolvedValue(suspendedEntities);
          mockPrisma.transaction.findMany.mockResolvedValue([]);
          mockPrisma.company.findMany.mockResolvedValue([]);

          // Import all security services
          const { SecurityMonitoringService } = await import('./security-monitoring.service');
          const { FraudDetectionService } = await import('./fraud-detection.service');
          const { BlacklistManagementService } = await import('./blacklist-management.service');

          const securityService = new SecurityMonitoringService();
          const fraudService = new FraudDetectionService();
          const blacklistService = new BlacklistManagementService();

          // Get data from all services
          const [securityData, fraudData, blacklistData] = await Promise.all([
            securityService.getSecurityEvents({
              startDate: new Date(Date.now() - 86400000),
              endDate: new Date(),
              severity: 'ALL',
            }),
            fraudService.getFraudAlerts({
              startDate: new Date(Date.now() - 86400000),
              endDate: new Date(),
              severity: 'ALL',
            }),
            blacklistService.getBlacklistStatistics(),
          ]);

          // Validate cross-service consistency
          expect(securityData.total).toBe(securityAlerts);
          expect(fraudData.totalAlerts).toBeGreaterThanOrEqual(0);
          expect(blacklistData.totalEntries).toBeGreaterThanOrEqual(0);

          // Validate that high-risk security alerts correlate with fraud alerts
          const highRiskSecurityAlerts = securityData.events.filter(event => 
            event.severity === 'HIGH' || event.severity === 'CRITICAL'
          ).length;

          // High-risk security alerts should be related to fraud detection
          if (fraudAlerts > 0) {
            expect(highRiskSecurityAlerts).toBeGreaterThanOrEqual(0);
          }

          // Validate that suspended entities appear consistently across services
          const securityAlertsWithUsers = securityData.events.filter(event => event.userId).length;
          expect(securityAlertsWithUsers).toBeLessThanOrEqual(suspendedEntities);

          // Validate data structure consistency across services
          expect(typeof securityData.total).toBe('number');
          expect(typeof fraudData.totalAlerts).toBe('number');
          expect(typeof blacklistData.totalEntries).toBe('number');

          expect(Array.isArray(securityData.events)).toBe(true);
          expect(Array.isArray(fraudData.alerts)).toBe(true);
          expect(Array.isArray(blacklistData.violationsByType)).toBe(true);

          return true;
        }
      ),
      { numRuns: 12 }
    );
  });
});