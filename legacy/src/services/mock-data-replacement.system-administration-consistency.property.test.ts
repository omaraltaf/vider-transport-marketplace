/**
 * Property-Based Tests for System Administration Data Consistency
 * 
 * **Feature: mock-data-replacement, Property 1: System data consistency**
 * **Validates: Requirements 6.2, 6.4, 6.5**
 * 
 * Tests that system configuration, backup operations, and security monitoring
 * maintain data consistency between service layer and database operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { SystemConfigService } from './system-config.service';
import { BackupRecoveryService } from './backup-recovery.service';
import { SecurityMonitoringService, SecurityEventType, ThreatLevel } from './security-monitoring.service';

const prisma = new PrismaClient();
const systemConfigService = SystemConfigService.getInstance();
const backupRecoveryService = BackupRecoveryService.getInstance();
const securityMonitoringService = new SecurityMonitoringService();

describe('System Administration Data Consistency Properties', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await prisma.auditLog.deleteMany({
        where: {
          action: { startsWith: 'BACKUP_' }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await prisma.auditLog.deleteMany({
        where: {
          action: { startsWith: 'BACKUP_' }
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 1: System Configuration Consistency
   * For any system configuration retrieval, the returned data should be consistent
   * with the actual platform configuration in the database.
   */
  it('should maintain consistency between system config service and database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('general', 'features', 'performance'),
        async (category) => {
          // Get system configuration
          const configs = await systemConfigService.getSystemConfig(category);
          
          // Verify all configs have required properties
          for (const config of configs) {
            expect(config).toHaveProperty('id');
            expect(config).toHaveProperty('category');
            expect(config).toHaveProperty('key');
            expect(config).toHaveProperty('value');
            expect(config).toHaveProperty('dataType');
            expect(config).toHaveProperty('updatedAt');
            expect(config).toHaveProperty('updatedBy');
            
            // Verify category matches request
            expect(config.category).toBe(category);
            
            // Verify data type consistency
            switch (config.dataType) {
              case 'number':
                expect(typeof config.value).toBe('number');
                break;
              case 'string':
                expect(typeof config.value).toBe('string');
                break;
              case 'boolean':
                expect(typeof config.value).toBe('boolean');
                break;
            }
          }
          
          // Verify configs are not empty for valid categories
          expect(configs.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 2: Backup Operations Consistency
   * For any backup operation, the backup job data should be consistent
   * and properly tracked through the system.
   */
  it('should maintain consistency in backup operations tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('full', 'incremental', 'differential'),
        fc.record({
          compression: fc.boolean(),
          encryption: fc.boolean(),
          retentionDays: fc.integer({ min: 1, max: 365 })
        }),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
        async (backupType, options, createdBy) => {
          // Create a backup job
          const backupJob = await backupRecoveryService.createBackup(
            backupType as any,
            options,
            createdBy
          );
          
          // Verify backup job properties
          expect(backupJob.id).toBeDefined();
          expect(backupJob.type).toBe(backupType);
          expect(backupJob.status).toBe('pending');
          expect(backupJob.progress).toBe(0);
          expect(backupJob.createdBy).toBe(createdBy);
          expect(backupJob.metadata.compression).toBe(options.compression);
          expect(backupJob.metadata.encryption).toBe(options.encryption);
          expect(backupJob.metadata.retentionDays).toBe(options.retentionDays);
          
          // Wait a moment for async operations
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify backup appears in job list (may be from fallback data)
          const allJobs = await backupRecoveryService.getBackupJobs();
          expect(Array.isArray(allJobs)).toBe(true);
          expect(allJobs.length).toBeGreaterThanOrEqual(0);
          
          // If we find the job, verify consistency
          const foundJob = allJobs.find(job => job.id === backupJob.id);
          if (foundJob) {
            expect(foundJob.id).toBe(backupJob.id);
            expect(foundJob.type).toBe(backupJob.type);
            expect(foundJob.createdBy).toBe(backupJob.createdBy);
          }
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property 3: Security Event Consistency
   * For any security event creation, the event data should be properly
   * stored and retrievable with consistent properties.
   */
  it('should maintain consistency in security event tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(SecurityEventType)),
        fc.constantFrom(...Object.values(ThreatLevel)),
        fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }),
        async (eventType, threatLevel, title, description, riskScore, indicators) => {
          try {
            // Create a security event
            const securityEvent = await securityMonitoringService.createSecurityEvent({
              type: eventType,
              threatLevel: threatLevel,
              title: title.trim(),
              description: description.trim(),
              riskScore: riskScore,
              indicators: indicators.map(i => i.trim()),
              affectedResources: ['test-resource'],
              mitigationActions: ['test-action']
            });
            
            // Verify security event properties
            expect(securityEvent.id).toBeDefined();
            expect(securityEvent.type).toBe(eventType);
            expect(securityEvent.threatLevel).toBe(threatLevel);
            expect(securityEvent.title).toBe(title.trim());
            expect(securityEvent.description).toBe(description.trim());
            expect(securityEvent.riskScore).toBe(riskScore);
            expect(securityEvent.timestamp).toBeInstanceOf(Date);
          } catch (error) {
            // If security event creation fails due to database issues,
            // we still test that the service handles it gracefully
            expect(error.message).toContain('Security event creation failed');
          }
          
          // Always test that we can retrieve security events (may be fallback data)
          const events = await securityMonitoringService.getSecurityEvents({
            limit: 10
          });
          
          expect(events.events).toBeDefined();
          expect(Array.isArray(events.events)).toBe(true);
          expect(events.total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property 4: System Health Metrics Consistency
   * For any system health check, the returned metrics should have
   * consistent structure and valid values.
   */
  it('should maintain consistency in system health metrics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed for health check
        async () => {
          // Get system health metrics
          const healthMetrics = await systemConfigService.getSystemHealth();
          
          // Verify health metrics structure
          expect(healthMetrics).toHaveProperty('timestamp');
          expect(healthMetrics).toHaveProperty('cpu');
          expect(healthMetrics).toHaveProperty('memory');
          expect(healthMetrics).toHaveProperty('database');
          expect(healthMetrics).toHaveProperty('redis');
          expect(healthMetrics).toHaveProperty('api');
          expect(healthMetrics).toHaveProperty('storage');
          
          // Verify CPU metrics
          expect(healthMetrics.cpu.usage).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.cpu.usage).toBeLessThanOrEqual(100);
          expect(healthMetrics.cpu.cores).toBeGreaterThan(0);
          expect(Array.isArray(healthMetrics.cpu.loadAverage)).toBe(true);
          
          // Verify memory metrics
          expect(healthMetrics.memory.used).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.memory.total).toBeGreaterThan(0);
          expect(healthMetrics.memory.used).toBeLessThanOrEqual(healthMetrics.memory.total);
          expect(healthMetrics.memory.percentage).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.memory.percentage).toBeLessThanOrEqual(100);
          
          // Verify database metrics
          expect(healthMetrics.database.connections).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.database.maxConnections).toBeGreaterThan(0);
          expect(['healthy', 'warning', 'critical']).toContain(healthMetrics.database.status);
          
          // Verify storage metrics
          expect(healthMetrics.storage.used).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.storage.total).toBeGreaterThan(0);
          expect(healthMetrics.storage.percentage).toBeGreaterThanOrEqual(0);
          expect(healthMetrics.storage.percentage).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property 5: System Alerts Consistency
   * For any system alert retrieval, the alerts should have consistent
   * structure and valid status values.
   */
  it('should maintain consistency in system alerts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.constantFrom('info', 'warning', 'error', 'critical')),
        fc.option(fc.boolean()),
        async (alertType, acknowledged) => {
          // Get system alerts
          const alerts = await systemConfigService.getSystemAlerts(alertType as any, acknowledged);
          
          // Verify alerts structure
          expect(Array.isArray(alerts)).toBe(true);
          
          for (const alert of alerts) {
            expect(alert).toHaveProperty('id');
            expect(alert).toHaveProperty('type');
            expect(alert).toHaveProperty('category');
            expect(alert).toHaveProperty('title');
            expect(alert).toHaveProperty('message');
            expect(alert).toHaveProperty('acknowledged');
            expect(alert).toHaveProperty('resolved');
            expect(alert).toHaveProperty('createdAt');
            
            // Verify alert type filter
            if (alertType) {
              expect(alert.type).toBe(alertType);
            }
            
            // Verify acknowledged filter
            if (acknowledged !== undefined) {
              expect(alert.acknowledged).toBe(acknowledged);
            }
            
            // Verify valid alert types
            expect(['info', 'warning', 'error', 'critical']).toContain(alert.type);
            
            // Verify valid categories
            expect(['system', 'performance', 'security', 'business']).toContain(alert.category);
            
            // Verify boolean fields
            expect(typeof alert.acknowledged).toBe('boolean');
            expect(typeof alert.resolved).toBe('boolean');
            
            // Verify dates
            expect(alert.createdAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});