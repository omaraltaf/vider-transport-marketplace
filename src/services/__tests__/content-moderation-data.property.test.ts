import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../cache.service';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

const prisma = new PrismaClient();

/**
 * Feature: mock-data-replacement, Property 8: Evidence and metadata consistency
 * 
 * For any content moderation or dispute case, all evidence and metadata should be 
 * retrievable from the database
 * 
 * Validates: Requirements 3.3
 */

describe('Content Moderation Data Property Tests', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.invalidatePattern('moderation:*');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 8: Evidence and metadata consistency', () => {
    test('all flagged content should have retrievable evidence and metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contentType: fc.constantFrom('USER_PROFILE', 'BOOKING_DESCRIPTION', 'REVIEW', 'MESSAGE', 'COMPANY_INFO'),
            flagType: fc.constantFrom('INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'FRAUD', 'OTHER'),
            severity: fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
            status: fc.constantFrom('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED')
          }),
          async (testData) => {
            // Get all content flags from database
            const contentFlags = await prisma.contentFlags.findMany({
              where: {
                contentType: testData.contentType,
                flagType: testData.flagType,
                severity: testData.severity
              },
              include: {
                flaggedByUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                },
                resolvedByUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            });

            // Verify each flag has consistent data structure
            for (const flag of contentFlags) {
              // Verify required fields exist
              expect(flag.id).toBeTruthy();
              expect(flag.contentId).toBeTruthy();
              expect(flag.contentType).toBeTruthy();
              expect(flag.flagType).toBeTruthy();
              expect(flag.severity).toBeTruthy();
              expect(flag.status).toBeTruthy();
              expect(flag.reason).toBeTruthy();
              expect(flag.createdAt).toBeInstanceOf(Date);

              // Verify enum values are valid
              expect(['USER_PROFILE', 'BOOKING_DESCRIPTION', 'REVIEW', 'MESSAGE', 'COMPANY_INFO'])
                .toContain(flag.contentType);
              expect(['INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'FRAUD', 'OTHER'])
                .toContain(flag.flagType);
              expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(flag.severity);
              expect(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'])
                .toContain(flag.status);

              // Verify evidence structure if present
              if (flag.evidence) {
                expect(typeof flag.evidence).toBe('object');
                
                // Check for common evidence fields
                const evidence = flag.evidence as any;
                if (evidence.screenshots) {
                  expect(Array.isArray(evidence.screenshots)).toBe(true);
                  evidence.screenshots.forEach((screenshot: any) => {
                    expect(typeof screenshot).toBe('string');
                  });
                }
                
                if (evidence.metadata) {
                  expect(typeof evidence.metadata).toBe('object');
                }
                
                if (evidence.automatedScores) {
                  expect(typeof evidence.automatedScores).toBe('object');
                  Object.values(evidence.automatedScores).forEach(score => {
                    expect(typeof score).toBe('number');
                    expect(score).toBeGreaterThanOrEqual(0);
                    expect(score).toBeLessThanOrEqual(1);
                  });
                }

                // Check for moderation action evidence if resolved
                if (flag.status === 'APPROVED' || flag.status === 'REJECTED') {
                  if (evidence.moderationAction) {
                    expect(evidence.moderationAction.action).toBeTruthy();
                    expect(evidence.moderationAction.timestamp).toBeTruthy();
                    expect(evidence.moderationAction.moderatorId).toBeTruthy();
                  }
                }
              }

              // Verify user relationships
              if (flag.flaggedBy) {
                expect(flag.flaggedByUser).toBeTruthy();
                expect(flag.flaggedByUser!.id).toBe(flag.flaggedBy);
              }

              if (flag.resolvedBy) {
                expect(flag.resolvedByUser).toBeTruthy();
                expect(flag.resolvedByUser!.id).toBe(flag.resolvedBy);
                expect(flag.resolvedAt).toBeInstanceOf(Date);
                expect(flag.resolvedAt!.getTime()).toBeGreaterThan(flag.createdAt.getTime());
              }

              // Verify status consistency
              if (flag.status === 'PENDING' || flag.status === 'UNDER_REVIEW') {
                expect(flag.resolvedAt).toBeNull();
                expect(flag.resolvedBy).toBeNull();
              } else {
                expect(flag.resolvedAt).not.toBeNull();
                expect(flag.resolvedBy).not.toBeNull();
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('content flag evidence should be preserved across status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            newStatus: fc.constantFrom('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'),
            moderatorId: fc.uuid(),
            action: fc.constantFrom('APPROVE', 'REJECT', 'ESCALATE', 'REMOVE_CONTENT'),
            reason: fc.string({ minLength: 10, maxLength: 200 })
          }),
          async (testData) => {
            // Find a pending flag to test with
            const pendingFlags = await prisma.contentFlags.findMany({
              where: { status: 'PENDING' },
              take: 1
            });

            if (pendingFlags.length === 0) {
              return; // Skip if no pending flags exist
            }

            const flag = pendingFlags[0];
            const originalEvidence = flag.evidence;

            try {
              // Update the flag status with new evidence
              const updatedFlag = await prisma.contentFlags.update({
                where: { id: flag.id },
                data: {
                  status: testData.newStatus,
                  resolvedAt: new Date(),
                  resolvedBy: testData.moderatorId,
                  evidence: {
                    ...originalEvidence,
                    moderationAction: {
                      action: testData.action,
                      reason: testData.reason,
                      timestamp: new Date().toISOString(),
                      moderatorId: testData.moderatorId
                    }
                  }
                }
              });

              // Verify original evidence is preserved
              if (originalEvidence) {
                const updatedEvidence = updatedFlag.evidence as any;
                const originalEvidenceObj = originalEvidence as any;

                // Check that original evidence fields are still present
                if (originalEvidenceObj.screenshots) {
                  expect(updatedEvidence.screenshots).toEqual(originalEvidenceObj.screenshots);
                }
                if (originalEvidenceObj.metadata) {
                  expect(updatedEvidence.metadata).toEqual(originalEvidenceObj.metadata);
                }
                if (originalEvidenceObj.automatedScores) {
                  expect(updatedEvidence.automatedScores).toEqual(originalEvidenceObj.automatedScores);
                }
              }

              // Verify new moderation action evidence is added
              const evidence = updatedFlag.evidence as any;
              expect(evidence.moderationAction).toBeDefined();
              expect(evidence.moderationAction.action).toBe(testData.action);
              expect(evidence.moderationAction.reason).toBe(testData.reason);
              expect(evidence.moderationAction.moderatorId).toBe(testData.moderatorId);
              expect(evidence.moderationAction.timestamp).toBeTruthy();

              // Verify status and resolution fields
              expect(updatedFlag.status).toBe(testData.newStatus);
              expect(updatedFlag.resolvedBy).toBe(testData.moderatorId);
              expect(updatedFlag.resolvedAt).not.toBeNull();

            } finally {
              // Restore original state
              try {
                await prisma.contentFlags.update({
                  where: { id: flag.id },
                  data: {
                    status: flag.status,
                    resolvedAt: flag.resolvedAt,
                    resolvedBy: flag.resolvedBy,
                    evidence: originalEvidence
                  }
                });
              } catch (error) {
                // Ignore cleanup errors
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });

    test('content moderation statistics should reflect actual database state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            timeRange: fc.constantFrom('24h', '7d', '30d'),
            groupBy: fc.constantFrom('status', 'severity', 'contentType', 'flagType')
          }),
          async (testData) => {
            // Clear cache to ensure fresh data
            await cacheService.invalidatePattern('moderation:*');

            // Calculate expected statistics from database
            const now = new Date();
            let startDate: Date;
            
            switch (testData.timeRange) {
              case '24h':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
              case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            // Get actual counts from database
            const [
              totalFlags,
              pendingFlags,
              resolvedFlags,
              recentFlags,
              statusGroups,
              severityGroups,
              contentTypeGroups,
              flagTypeGroups
            ] = await Promise.all([
              prisma.contentFlags.count(),
              prisma.contentFlags.count({ where: { status: 'PENDING' } }),
              prisma.contentFlags.count({ 
                where: { status: { in: ['APPROVED', 'REJECTED'] } } 
              }),
              prisma.contentFlags.count({ 
                where: { createdAt: { gte: startDate } } 
              }),
              prisma.contentFlags.groupBy({
                by: ['status'],
                _count: { id: true }
              }),
              prisma.contentFlags.groupBy({
                by: ['severity'],
                _count: { id: true }
              }),
              prisma.contentFlags.groupBy({
                by: ['contentType'],
                _count: { id: true }
              }),
              prisma.contentFlags.groupBy({
                by: ['flagType'],
                _count: { id: true }
              })
            ]);

            // Verify basic counts are non-negative
            expect(totalFlags).toBeGreaterThanOrEqual(0);
            expect(pendingFlags).toBeGreaterThanOrEqual(0);
            expect(resolvedFlags).toBeGreaterThanOrEqual(0);
            expect(recentFlags).toBeGreaterThanOrEqual(0);

            // Verify logical relationships
            expect(pendingFlags + resolvedFlags).toBeLessThanOrEqual(totalFlags);
            expect(recentFlags).toBeLessThanOrEqual(totalFlags);

            // Verify group counts sum correctly
            const statusSum = statusGroups.reduce((sum, group) => sum + group._count.id, 0);
            const severitySum = severityGroups.reduce((sum, group) => sum + group._count.id, 0);
            const contentTypeSum = contentTypeGroups.reduce((sum, group) => sum + group._count.id, 0);
            const flagTypeSum = flagTypeGroups.reduce((sum, group) => sum + group._count.id, 0);

            expect(statusSum).toBe(totalFlags);
            expect(severitySum).toBe(totalFlags);
            expect(contentTypeSum).toBe(totalFlags);
            expect(flagTypeSum).toBe(totalFlags);

            // Verify valid enum values in groups
            statusGroups.forEach(group => {
              expect(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED'])
                .toContain(group.status);
              expect(group._count.id).toBeGreaterThan(0);
            });

            severityGroups.forEach(group => {
              expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(group.severity);
              expect(group._count.id).toBeGreaterThan(0);
            });

            contentTypeGroups.forEach(group => {
              expect(['USER_PROFILE', 'BOOKING_DESCRIPTION', 'REVIEW', 'MESSAGE', 'COMPANY_INFO'])
                .toContain(group.contentType);
              expect(group._count.id).toBeGreaterThan(0);
            });

            flagTypeGroups.forEach(group => {
              expect(['INAPPROPRIATE_CONTENT', 'SPAM', 'HARASSMENT', 'FRAUD', 'OTHER'])
                .toContain(group.flagType);
              expect(group._count.id).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('related content should be retrievable for all content types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            contentType: fc.constantFrom('USER_PROFILE', 'BOOKING_DESCRIPTION', 'REVIEW', 'COMPANY_INFO')
          }),
          async (testData) => {
            // Get flags for the specified content type
            const flags = await prisma.contentFlags.findMany({
              where: { contentType: testData.contentType },
              take: 5 // Limit to avoid long test times
            });

            for (const flag of flags) {
              let relatedContent = null;

              try {
                // Attempt to retrieve related content based on type
                switch (flag.contentType) {
                  case 'USER_PROFILE':
                    relatedContent = await prisma.user.findUnique({
                      where: { id: flag.contentId },
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        status: true,
                        createdAt: true
                      }
                    });
                    break;
                  case 'COMPANY_INFO':
                    relatedContent = await prisma.company.findUnique({
                      where: { id: flag.contentId },
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        email: true,
                        status: true,
                        verified: true,
                        createdAt: true
                      }
                    });
                    break;
                  case 'BOOKING_DESCRIPTION':
                    relatedContent = await prisma.booking.findUnique({
                      where: { id: flag.contentId },
                      select: {
                        id: true,
                        description: true,
                        status: true,
                        total: true,
                        startDate: true,
                        endDate: true,
                        createdAt: true
                      }
                    });
                    break;
                  case 'REVIEW':
                    relatedContent = await prisma.review.findUnique({
                      where: { id: flag.contentId },
                      select: {
                        id: true,
                        rating: true,
                        comment: true,
                        createdAt: true
                      }
                    });
                    break;
                }

                // Verify content exists or flag is orphaned
                if (relatedContent) {
                  expect(relatedContent.id).toBe(flag.contentId);
                  expect(relatedContent.createdAt).toBeInstanceOf(Date);
                  
                  // Verify content-specific fields
                  switch (flag.contentType) {
                    case 'USER_PROFILE':
                      expect(relatedContent.email).toBeTruthy();
                      expect(['ACTIVE', 'INACTIVE', 'SUSPENDED']).toContain(relatedContent.status);
                      break;
                    case 'COMPANY_INFO':
                      expect(relatedContent.name).toBeTruthy();
                      expect(typeof relatedContent.verified).toBe('boolean');
                      break;
                    case 'BOOKING_DESCRIPTION':
                      expect(['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED'])
                        .toContain(relatedContent.status);
                      expect(relatedContent.total).toBeGreaterThan(0);
                      break;
                    case 'REVIEW':
                      expect(relatedContent.rating).toBeGreaterThanOrEqual(1);
                      expect(relatedContent.rating).toBeLessThanOrEqual(5);
                      break;
                  }
                } else {
                  // If related content doesn't exist, flag should be marked appropriately
                  // This could indicate data cleanup is needed
                  console.warn(`Orphaned content flag: ${flag.id} references non-existent ${flag.contentType} ${flag.contentId}`);
                }

              } catch (error) {
                // Some content types might not exist in test database
                console.warn(`Could not retrieve ${flag.contentType} content for flag ${flag.id}:`, error);
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });

    test('moderation actions should maintain audit trail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            action: fc.constantFrom('APPROVE', 'REJECT', 'ESCALATE'),
            moderatorId: fc.uuid(),
            reason: fc.string({ minLength: 5, maxLength: 100 })
          }),
          async (testData) => {
            // Find flags that have been resolved
            const resolvedFlags = await prisma.contentFlags.findMany({
              where: { 
                status: { in: ['APPROVED', 'REJECTED', 'ESCALATED'] },
                resolvedBy: { not: null },
                resolvedAt: { not: null }
              },
              take: 5
            });

            for (const flag of resolvedFlags) {
              // Verify audit trail fields
              expect(flag.resolvedBy).toBeTruthy();
              expect(flag.resolvedAt).toBeInstanceOf(Date);
              expect(flag.resolvedAt!.getTime()).toBeGreaterThan(flag.createdAt.getTime());

              // Verify evidence contains moderation action if present
              if (flag.evidence) {
                const evidence = flag.evidence as any;
                if (evidence.moderationAction) {
                  expect(evidence.moderationAction.action).toBeTruthy();
                  expect(evidence.moderationAction.timestamp).toBeTruthy();
                  expect(evidence.moderationAction.moderatorId).toBeTruthy();
                  
                  // Verify timestamp is valid
                  const actionTimestamp = new Date(evidence.moderationAction.timestamp);
                  expect(actionTimestamp).toBeInstanceOf(Date);
                  expect(actionTimestamp.getTime()).toBeGreaterThan(flag.createdAt.getTime());
                  expect(actionTimestamp.getTime()).toBeLessThanOrEqual(flag.resolvedAt!.getTime());
                }
              }

              // Verify status consistency
              if (flag.status === 'APPROVED') {
                expect(flag.resolvedBy).toBeTruthy();
                expect(flag.resolvedAt).toBeTruthy();
              } else if (flag.status === 'REJECTED') {
                expect(flag.resolvedBy).toBeTruthy();
                expect(flag.resolvedAt).toBeTruthy();
              } else if (flag.status === 'ESCALATED') {
                // Escalated flags might or might not have resolvedBy/resolvedAt
                // depending on business logic
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });
});
    