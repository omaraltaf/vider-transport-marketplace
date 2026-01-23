import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../config/database';

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    await prisma.securityAlert.deleteMany();
    await prisma.securityEvent.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.availabilityBlock.deleteMany();
    await prisma.recurringBlock.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  } catch (error) {
    console.log('Cleanup error (ignored):', error);
  }
}

describe('Platform Admin Performance and Load Integration Tests', () => {
  let testCompanyId: string;
  let platformAdminId: string;

  beforeAll(async () => {
    await cleanupTestData();
    
    // Create test company
    const testCompany = await prisma.company.create({
      data: {
        name: 'Performance Test Company',
        organizationNumber: '999999999',
        businessAddress: '123 Performance St',
        city: 'Oslo',
        postalCode: '0123',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        status: 'ACTIVE',
        verified: true,
      },
    });

    // Create platform admin
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'perf-admin@test.com',
        firstName: 'Performance',
        lastName: 'Admin',
        passwordHash: 'hashedpassword',
        role: 'PLATFORM_ADMIN',
        companyId: testCompany.id,
        phone: '+1234567890',
      },
    });

    testCompanyId = testCompany.id;
    platformAdminId = platformAdmin.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Bulk Data Operations Performance', () => {
    it('should handle bulk audit log creation efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 100;

      // Create audit logs in batches for better performance
      const auditLogData = Array.from({ length: batchSize }, (_, index) => ({
        adminUserId: platformAdminId,
        action: `BULK_TEST_ACTION_${index}`,
        entityType: 'TestEntity',
        entityId: `test-entity-${index}`,
        changes: {
          field: `value-${index}`,
          timestamp: new Date().toISOString(),
        },
        reason: `Bulk test operation ${index}`,
        ipAddress: '192.168.1.100',
      }));

      await prisma.auditLog.createMany({
        data: auditLogData,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance (should complete within reasonable time)
      expect(executionTime).toBeLessThan(5000); // 5 seconds max

      // Verify data was created
      const createdLogs = await prisma.auditLog.count({
        where: {
          action: { startsWith: 'BULK_TEST_ACTION_' },
        },
      });

      expect(createdLogs).toBe(batchSize);

      console.log(`Bulk audit log creation: ${batchSize} records in ${executionTime}ms`);
    });

    it('should handle bulk security event processing efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 50;

      // Create security events in batch
      const securityEventData = Array.from({ length: batchSize }, (_, index) => ({
        eventType: 'ANOMALOUS_BEHAVIOR' as const,
        threatLevel: 'MEDIUM' as const,
        title: `Performance Test Event ${index}`,
        description: `Bulk security event for performance testing ${index}`,
        riskScore: 50 + (index % 30), // Vary risk scores
        indicators: [`indicator_${index}`, 'performance_test'],
        affectedResources: [`resource_${index}`],
        mitigationActions: [`action_${index}`],
        metadata: {
          batchIndex: index,
          testType: 'performance',
        },
      }));

      await prisma.securityEvent.createMany({
        data: securityEventData,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance
      expect(executionTime).toBeLessThan(3000); // 3 seconds max

      // Verify data was created
      const createdEvents = await prisma.securityEvent.count({
        where: {
          title: { startsWith: 'Performance Test Event' },
        },
      });

      expect(createdEvents).toBe(batchSize);

      console.log(`Bulk security event creation: ${batchSize} records in ${executionTime}ms`);
    });

    it('should handle complex queries with joins efficiently', async () => {
      // First create some test data
      const users = await prisma.user.createMany({
        data: Array.from({ length: 20 }, (_, index) => ({
          email: `perf-user-${index}@test.com`,
          firstName: `User${index}`,
          lastName: 'Performance',
          passwordHash: 'hashedpassword',
          role: 'COMPANY_USER' as const,
          companyId: testCompanyId,
          phone: `+123456789${index}`,
        })),
      });

      const startTime = Date.now();

      // Complex query with multiple joins and aggregations
      const complexQuery = await prisma.company.findMany({
        where: {
          id: testCompanyId,
        },
        include: {
          users: {
            include: {
              auditLogs: {
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
            },
          },
          vehicleListings: {
            include: {
              bookings: {
                include: {
                  transactions: true,
                  rating: true,
                },
              },
            },
          },
          driverListings: {
            include: {
              bookings: {
                include: {
                  transactions: true,
                },
              },
            },
          },
        },
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance
      expect(executionTime).toBeLessThan(2000); // 2 seconds max
      expect(complexQuery).toHaveLength(1);
      expect(complexQuery[0].users.length).toBeGreaterThan(0);

      console.log(`Complex query with joins: ${executionTime}ms`);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent audit log writes without conflicts', async () => {
      const startTime = Date.now();
      const concurrentOperations = 20;

      // Create concurrent audit log operations
      const operations = Array.from({ length: concurrentOperations }, (_, index) =>
        prisma.auditLog.create({
          data: {
            adminUserId: platformAdminId,
            action: `CONCURRENT_ACTION_${index}`,
            entityType: 'ConcurrentTest',
            entityId: `concurrent-${index}`,
            changes: {
              operation: index,
              timestamp: new Date().toISOString(),
            },
            reason: `Concurrent operation test ${index}`,
            ipAddress: '192.168.1.100',
          },
        })
      );

      // Execute all operations concurrently
      const results = await Promise.all(operations);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations);
      expect(results.every(result => result.id)).toBe(true);

      // Verify performance
      expect(executionTime).toBeLessThan(3000); // 3 seconds max

      console.log(`Concurrent operations: ${concurrentOperations} operations in ${executionTime}ms`);
    });

    it('should handle concurrent security monitoring operations', async () => {
      const startTime = Date.now();
      const concurrentCount = 15;

      // Create concurrent security operations
      const securityOperations = Array.from({ length: concurrentCount }, (_, index) => [
        // Create security event
        prisma.securityEvent.create({
          data: {
            eventType: 'FAILED_LOGIN_ATTEMPT',
            threatLevel: 'LOW',
            title: `Concurrent Security Event ${index}`,
            description: `Concurrent security test ${index}`,
            riskScore: 25 + index,
            indicators: [`concurrent_${index}`],
            affectedResources: [`resource_${index}`],
            mitigationActions: [`log_${index}`],
          },
        }),
        // Create security alert
        prisma.securityAlert.create({
          data: {
            alertType: 'SUSPICIOUS_ACTIVITY',
            severity: 'MEDIUM',
            title: `Concurrent Security Alert ${index}`,
            description: `Concurrent alert test ${index}`,
            indicators: [`alert_${index}`],
            affectedResources: [`alert_resource_${index}`],
            mitigationActions: [`alert_action_${index}`],
          },
        }),
      ]).flat();

      // Execute all operations concurrently
      const results = await Promise.all(securityOperations);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentCount * 2);
      expect(results.every(result => result.id)).toBe(true);

      // Verify performance
      expect(executionTime).toBeLessThan(4000); // 4 seconds max

      console.log(`Concurrent security operations: ${concurrentCount * 2} operations in ${executionTime}ms`);
    });
  });

  describe('Data Aggregation Performance', () => {
    it('should perform audit log aggregations efficiently', async () => {
      const startTime = Date.now();

      // Perform various aggregation queries
      const [
        totalAuditLogs,
        auditLogsByAction,
        auditLogsByEntity,
        recentAuditLogs,
      ] = await Promise.all([
        // Total count
        prisma.auditLog.count(),
        
        // Group by action
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: {
            action: true,
          },
          orderBy: {
            _count: {
              action: 'desc',
            },
          },
          take: 10,
        }),
        
        // Group by entity type
        prisma.auditLog.groupBy({
          by: ['entityType'],
          _count: {
            entityType: true,
          },
        }),
        
        // Recent logs with pagination
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            action: true,
            entityType: true,
            createdAt: true,
          },
        }),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance
      expect(executionTime).toBeLessThan(1500); // 1.5 seconds max
      expect(totalAuditLogs).toBeGreaterThan(0);
      expect(auditLogsByAction.length).toBeGreaterThan(0);
      expect(auditLogsByEntity.length).toBeGreaterThan(0);
      expect(recentAuditLogs.length).toBeGreaterThan(0);

      console.log(`Audit log aggregations: ${executionTime}ms`);
    });

    it('should perform security data aggregations efficiently', async () => {
      const startTime = Date.now();

      // Perform security data aggregations
      const [
        eventsByThreatLevel,
        alertsBySeverity,
        recentHighRiskEvents,
        securityMetrics,
      ] = await Promise.all([
        // Events by threat level
        prisma.securityEvent.groupBy({
          by: ['threatLevel'],
          _count: {
            threatLevel: true,
          },
          _avg: {
            riskScore: true,
          },
        }),
        
        // Alerts by severity
        prisma.securityAlert.groupBy({
          by: ['severity', 'status'],
          _count: {
            severity: true,
          },
        }),
        
        // Recent high-risk events
        prisma.securityEvent.findMany({
          where: {
            riskScore: { gte: 70 },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
          select: {
            id: true,
            eventType: true,
            threatLevel: true,
            riskScore: true,
            timestamp: true,
          },
        }),
        
        // Security metrics calculation
        prisma.securityEvent.aggregate({
          _count: { id: true },
          _avg: { riskScore: true },
          _max: { riskScore: true },
          _min: { riskScore: true },
        }),
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify performance
      expect(executionTime).toBeLessThan(1500); // 1.5 seconds max
      expect(eventsByThreatLevel.length).toBeGreaterThan(0);
      expect(alertsBySeverity.length).toBeGreaterThan(0);
      expect(securityMetrics._count.id).toBeGreaterThan(0);

      console.log(`Security data aggregations: ${executionTime}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      let memoryBefore = process.memoryUsage();

      // Query large dataset with streaming/pagination
      const pageSize = 100;
      let totalProcessed = 0;
      let hasMore = true;
      let lastId = '';

      while (hasMore && totalProcessed < 500) { // Limit to prevent infinite loop
        const batch = await prisma.auditLog.findMany({
          take: pageSize,
          skip: lastId ? 1 : 0,
          cursor: lastId ? { id: lastId } : undefined,
          orderBy: { id: 'asc' },
          select: {
            id: true,
            action: true,
            createdAt: true,
          },
        });

        if (batch.length === 0) {
          hasMore = false;
        } else {
          totalProcessed += batch.length;
          lastId = batch[batch.length - 1].id;
          
          // Process batch (simulate work)
          batch.forEach(log => {
            // Simulate processing
            expect(log.id).toBeDefined();
          });
        }

        if (batch.length < pageSize) {
          hasMore = false;
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      let memoryAfter = process.memoryUsage();

      // Verify performance and memory usage
      expect(executionTime).toBeLessThan(5000); // 5 seconds max
      expect(totalProcessed).toBeGreaterThan(0);
      
      // Memory usage should not increase dramatically
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      console.log(`Large result set processing: ${totalProcessed} records in ${executionTime}ms`);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    it('should handle database connection pooling efficiently', async () => {
      const startTime = Date.now();
      const connectionTests = 30;

      // Create multiple concurrent database operations to test connection pooling
      const operations = Array.from({ length: connectionTests }, (_, index) =>
        prisma.company.findUnique({
          where: { id: testCompanyId },
          select: {
            id: true,
            name: true,
            status: true,
          },
        })
      );

      const results = await Promise.all(operations);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify all operations completed successfully
      expect(results).toHaveLength(connectionTests);
      expect(results.every(result => result?.id === testCompanyId)).toBe(true);

      // Verify performance (connection pooling should make this fast)
      expect(executionTime).toBeLessThan(2000); // 2 seconds max

      console.log(`Connection pooling test: ${connectionTests} operations in ${executionTime}ms`);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle transaction rollbacks efficiently', async () => {
      const startTime = Date.now();

      try {
        await prisma.$transaction(async (tx) => {
          // Create audit log
          await tx.auditLog.create({
            data: {
              adminUserId: platformAdminId,
              action: 'TRANSACTION_TEST',
              entityType: 'Test',
              entityId: 'rollback-test',
              changes: { test: 'rollback' },
              reason: 'Testing transaction rollback',
              ipAddress: '192.168.1.100',
            },
          });

          // Create security event
          await tx.securityEvent.create({
            data: {
              eventType: 'ANOMALOUS_BEHAVIOR',
              threatLevel: 'LOW',
              title: 'Transaction Test Event',
              description: 'Testing transaction rollback',
              riskScore: 30,
              indicators: ['transaction_test'],
              affectedResources: ['test_resource'],
              mitigationActions: ['rollback_test'],
            },
          });

          // Intentionally throw error to trigger rollback
          throw new Error('Intentional rollback test');
        });
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify rollback worked (no data should exist)
      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'TRANSACTION_TEST' },
      });

      const securityEvent = await prisma.securityEvent.findFirst({
        where: { title: 'Transaction Test Event' },
      });

      expect(auditLog).toBeNull();
      expect(securityEvent).toBeNull();
      expect(executionTime).toBeLessThan(1000); // 1 second max

      console.log(`Transaction rollback test: ${executionTime}ms`);
    });
  });
});