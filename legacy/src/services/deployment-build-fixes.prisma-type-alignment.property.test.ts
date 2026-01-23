/**
 * Property-based tests for Prisma type alignment
 * 
 * Property 8: Prisma Type Alignment
 * For any database operation, the types used should match the Prisma-generated client types
 * 
 * Validates: Requirements 3.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, AuditLog, User, Company, Booking } from '@prisma/client';
import { auditLogService } from './audit-log.service';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Prisma Type Alignment Properties', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { 
        OR: [
          { adminUserId: { contains: 'test-prisma-alignment' } },
          { entityId: { contains: 'test-prisma-alignment' } }
        ]
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { 
        OR: [
          { adminUserId: { contains: 'test-prisma-alignment' } },
          { entityId: { contains: 'test-prisma-alignment' } }
        ]
      }
    });
  });

  /**
   * Property: Audit log service should use correct Prisma AuditLog model fields
   * For any audit log creation, the fields should match the actual Prisma schema
   */
  it('should create audit logs with correct Prisma schema fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'),
          entityType: fc.constantFrom('USER', 'COMPANY', 'BOOKING', 'LISTING'),
          entityId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          adminUserId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          changes: fc.object(),
          reason: fc.string({ minLength: 1, maxLength: 200 }),
          ipAddress: fc.ipV4()
        }),
        async (auditData) => {
          // Create audit log using service
          const auditLog = await auditLogService.createAuditLog({
            action: auditData.action,
            entityType: auditData.entityType,
            entityId: auditData.entityId,
            adminUserId: auditData.adminUserId,
            changes: auditData.changes,
            reason: auditData.reason,
            ipAddress: auditData.ipAddress
          });

          // Verify the created audit log matches Prisma AuditLog type
          expect(auditLog).toBeDefined();
          expect(auditLog.id).toBeDefined();
          expect(typeof auditLog.id).toBe('string');
          
          // Check all required fields from Prisma schema
          expect(auditLog.action).toBe(auditData.action);
          expect(auditLog.entityType).toBe(auditData.entityType);
          expect(auditLog.entityId).toBe(auditData.entityId);
          expect(auditLog.adminUserId).toBe(auditData.adminUserId);
          expect(auditLog.reason).toBe(auditData.reason);
          expect(auditLog.ipAddress).toBe(auditData.ipAddress);
          
          // Verify timestamp fields
          expect(auditLog.createdAt).toBeInstanceOf(Date);
          
          // Verify changes field (should be JSON)
          expect(auditLog.changes).toBeDefined();
          
          // Fetch from database to verify it was actually created correctly
          const dbAuditLog = await prisma.auditLog.findUnique({
            where: { id: auditLog.id }
          });
          
          expect(dbAuditLog).toBeDefined();
          expect(dbAuditLog!.action).toBe(auditData.action);
          expect(dbAuditLog!.entityType).toBe(auditData.entityType);
          expect(dbAuditLog!.entityId).toBe(auditData.entityId);
          expect(dbAuditLog!.adminUserId).toBe(auditData.adminUserId);
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Database queries should use correct Prisma where clause types
   * For any database query, the where clauses should match Prisma-generated types
   */
  it('should use correct Prisma where clause types in queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          entityType: fc.constantFrom('USER', 'COMPANY', 'BOOKING'),
          adminUserId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
        }),
        async (queryData) => {
          // Ensure endDate is after startDate
          const start = queryData.startDate;
          const end = queryData.endDate > queryData.startDate ? queryData.endDate : new Date(queryData.startDate.getTime() + 86400000);

          // Create a test audit log first
          const testAuditLog = await prisma.auditLog.create({
            data: {
              action: 'CREATE',
              entityType: queryData.entityType,
              entityId: `test-entity-${Date.now()}`,
              adminUserId: queryData.adminUserId,
              changes: { test: 'data' },
              reason: 'Test audit log',
              ipAddress: '127.0.0.1'
            }
          });

          // Test various query patterns that should use correct Prisma types
          const queries = [
            // Query by entity type
            () => auditLogService.getAuditLogs({
              entityType: queryData.entityType,
              page: 1,
              limit: 10
            }),
            
            // Query by admin user
            () => auditLogService.getAuditLogs({
              adminUserId: queryData.adminUserId,
              page: 1,
              limit: 10
            }),
            
            // Query by date range
            () => auditLogService.getAuditLogs({
              startDate: start,
              endDate: end,
              page: 1,
              limit: 10
            })
          ];

          for (const query of queries) {
            const result = await query();
            
            // Should not throw TypeScript compilation errors
            expect(result).toBeDefined();
            expect(Array.isArray(result.auditLogs)).toBe(true);
            expect(typeof result.total).toBe('number');
            expect(typeof result.page).toBe('number');
            expect(typeof result.totalPages).toBe('number');
            
            // Each audit log should match Prisma AuditLog type
            for (const auditLog of result.auditLogs) {
              expect(auditLog).toHaveProperty('id');
              expect(auditLog).toHaveProperty('action');
              expect(auditLog).toHaveProperty('entityType');
              expect(auditLog).toHaveProperty('entityId');
              expect(auditLog).toHaveProperty('adminUserId');
              expect(auditLog).toHaveProperty('changes');
              expect(auditLog).toHaveProperty('reason');
              expect(auditLog).toHaveProperty('ipAddress');
              expect(auditLog).toHaveProperty('createdAt');
              
              // Type checks
              expect(typeof auditLog.id).toBe('string');
              expect(typeof auditLog.action).toBe('string');
              expect(typeof auditLog.entityType).toBe('string');
              expect(typeof auditLog.entityId).toBe('string');
              expect(typeof auditLog.adminUserId).toBe('string');
              expect(typeof auditLog.reason).toBe('string');
              expect(typeof auditLog.ipAddress).toBe('string');
              expect(auditLog.createdAt).toBeInstanceOf(Date);
            }
          }

          // Clean up
          await prisma.auditLog.delete({ where: { id: testAuditLog.id } });
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  /**
   * Property: Service interfaces should match Prisma model types
   * For any service method that returns database models, the return types
   * should be compatible with Prisma-generated types
   */
  it('should return types compatible with Prisma models', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE'),
          entityType: fc.constantFrom('USER', 'COMPANY', 'BOOKING'),
          entityId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          adminUserId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`)
        }),
        async (testData) => {
          // Create audit log
          const auditLog = await auditLogService.createAuditLog({
            action: testData.action,
            entityType: testData.entityType,
            entityId: testData.entityId,
            adminUserId: testData.adminUserId,
            changes: { field: 'value' },
            reason: 'Test reason',
            ipAddress: '127.0.0.1'
          });

          // The returned audit log should be assignable to Prisma AuditLog type
          const prismaAuditLog: AuditLog = auditLog;
          
          // Verify all required Prisma AuditLog fields are present
          expect(prismaAuditLog.id).toBeDefined();
          expect(prismaAuditLog.action).toBeDefined();
          expect(prismaAuditLog.entityType).toBeDefined();
          expect(prismaAuditLog.entityId).toBeDefined();
          expect(prismaAuditLog.adminUserId).toBeDefined();
          expect(prismaAuditLog.changes).toBeDefined();
          expect(prismaAuditLog.reason).toBeDefined();
          expect(prismaAuditLog.ipAddress).toBeDefined();
          expect(prismaAuditLog.createdAt).toBeDefined();

          // Get audit log by ID
          const retrievedAuditLog = await auditLogService.getAuditLogById(auditLog.id);
          expect(retrievedAuditLog).toBeDefined();
          
          if (retrievedAuditLog) {
            // Should also be assignable to Prisma AuditLog type
            const prismaRetrievedLog: AuditLog = retrievedAuditLog;
            expect(prismaRetrievedLog.id).toBe(auditLog.id);
          }
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Prisma client operations should use correct field names
   * For any direct Prisma operation, the field names should match the schema
   */
  it('should use correct Prisma field names in database operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          action: fc.constantFrom('CREATE', 'UPDATE', 'DELETE', 'VIEW'),
          entityType: fc.constantFrom('USER', 'COMPANY', 'BOOKING', 'LISTING'),
          entityId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          adminUserId: fc.string({ minLength: 10, maxLength: 50 }).map(id => `test-prisma-alignment-${id}`),
          reason: fc.string({ minLength: 5, maxLength: 100 }),
          ipAddress: fc.ipV4()
        }),
        async (data) => {
          // Direct Prisma operation - should compile without errors
          const auditLog = await prisma.auditLog.create({
            data: {
              action: data.action,
              entityType: data.entityType,
              entityId: data.entityId,
              adminUserId: data.adminUserId,
              changes: { test: 'value' },
              reason: data.reason,
              ipAddress: data.ipAddress
              // Note: createdAt is auto-generated, should not be specified
            }
          });

          // Verify the created record has all expected fields
          expect(auditLog.id).toBeDefined();
          expect(auditLog.action).toBe(data.action);
          expect(auditLog.entityType).toBe(data.entityType);
          expect(auditLog.entityId).toBe(data.entityId);
          expect(auditLog.adminUserId).toBe(data.adminUserId);
          expect(auditLog.reason).toBe(data.reason);
          expect(auditLog.ipAddress).toBe(data.ipAddress);
          expect(auditLog.createdAt).toBeInstanceOf(Date);
          expect(auditLog.changes).toBeDefined();

          // Query operations should also use correct field names
          const foundAuditLog = await prisma.auditLog.findUnique({
            where: { id: auditLog.id }
          });

          expect(foundAuditLog).toBeDefined();
          expect(foundAuditLog!.id).toBe(auditLog.id);

          // Update operation
          const updatedAuditLog = await prisma.auditLog.update({
            where: { id: auditLog.id },
            data: { reason: `${data.reason} - updated` }
          });

          expect(updatedAuditLog.reason).toBe(`${data.reason} - updated`);

          // Delete operation
          await prisma.auditLog.delete({
            where: { id: auditLog.id }
          });

          // Verify deletion
          const deletedAuditLog = await prisma.auditLog.findUnique({
            where: { id: auditLog.id }
          });

          expect(deletedAuditLog).toBeNull();
        }
      ),
      { numRuns: 8, timeout: 30000 }
    );
  });
});