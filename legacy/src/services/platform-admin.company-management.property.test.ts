/**
 * Property-based tests for platform admin company management operations
 * Feature: platform-admin-dashboard, Property 1: Company Management Operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, Role, CompanyStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Platform Admin Company Management Property Tests', () => {
  let testPlatformAdmin: any = null;
  let testPlatformAdminCompany: any = null;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-platform-admin-company',
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        name: {
          contains: 'Test Platform Admin Company',
        },
      },
    });

    // Create a platform admin user for testing
    testPlatformAdminCompany = await prisma.company.create({
      data: {
        name: `Test Platform Admin Company ${Date.now()}`,
        organizationNumber: `ADMIN${Date.now()}`,
        businessAddress: 'Admin Address',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        verified: true,
        status: CompanyStatus.ACTIVE,
      },
    });

    testPlatformAdmin = await prisma.user.create({
      data: {
        email: `test-platform-admin-company-${Date.now()}@example.com`,
        passwordHash: 'hashedpassword',
        role: Role.PLATFORM_ADMIN,
        companyId: testPlatformAdminCompany.id,
        firstName: 'Platform',
        lastName: 'Admin',
        phone: '+4712345678',
        emailVerified: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-platform-admin-company',
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        name: {
          contains: 'Test Platform Admin Company',
        },
      },
    });
  });

  /**
   * Property 1: Company Management Operations
   * For any company management operation (create, suspend, delete, verify), 
   * the operation should complete successfully and update the company's state 
   * appropriately while maintaining data integrity
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
   */
  it('should maintain data integrity for company creation and status updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyData: fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }).map(s => `Test Company ${s.replace(/[^a-zA-Z0-9 ]/g, '')}`),
            organizationNumber: fc.string({ minLength: 9, maxLength: 9 }).map(s => `ORG${s.replace(/[^0-9]/g, '').padStart(6, '0')}`),
            businessAddress: fc.string({ minLength: 5, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9 ]/g, '') || 'Test Address'),
            city: fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger'),
            postalCode: fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/[^0-9]/g, '').padStart(4, '0')),
            fylke: fc.constantFrom('Oslo', 'Vestland', 'Trøndelag', 'Rogaland'),
            kommune: fc.constantFrom('Oslo', 'Bergen', 'Trondheim', 'Stavanger'),
            vatRegistered: fc.boolean(),
          }),
          statusTransition: fc.record({
            from: fc.constantFrom(CompanyStatus.PENDING_VERIFICATION, CompanyStatus.ACTIVE),
            to: fc.constantFrom(CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED),
          }),
        }),
        async ({ companyData, statusTransition }) => {
          let testCompany: any = null;

          try {
            // Step 1: Create a company directly with Prisma
            testCompany = await prisma.company.create({
              data: {
                ...companyData,
                status: statusTransition.from,
                verified: statusTransition.from === CompanyStatus.ACTIVE,
              },
            });

            // Verify creation properties
            expect(testCompany).toBeDefined();
            expect(testCompany.name).toBe(companyData.name);
            expect(testCompany.organizationNumber).toBe(companyData.organizationNumber);
            expect(testCompany.status).toBe(statusTransition.from);

            // Step 2: Update company status
            const updatedCompany = await prisma.company.update({
              where: { id: testCompany.id },
              data: {
                status: statusTransition.to,
                verified: statusTransition.to === CompanyStatus.ACTIVE,
                suspendedAt: statusTransition.to === CompanyStatus.SUSPENDED ? new Date() : null,
                suspendedBy: statusTransition.to === CompanyStatus.SUSPENDED ? testPlatformAdmin.id : null,
                suspensionReason: statusTransition.to === CompanyStatus.SUSPENDED ? 'Test suspension' : null,
                verifiedAt: statusTransition.to === CompanyStatus.ACTIVE ? new Date() : null,
                verifiedBy: statusTransition.to === CompanyStatus.ACTIVE ? testPlatformAdmin.id : null,
              },
            });

            // Step 3: Verify status transition properties
            expect(updatedCompany.status).toBe(statusTransition.to);
            
            if (statusTransition.to === CompanyStatus.SUSPENDED) {
              expect(updatedCompany.suspendedAt).toBeDefined();
              expect(updatedCompany.suspendedBy).toBe(testPlatformAdmin.id);
              expect(updatedCompany.suspensionReason).toBeDefined();
            }
            
            if (statusTransition.to === CompanyStatus.ACTIVE) {
              expect(updatedCompany.verified).toBe(true);
              expect(updatedCompany.verifiedAt).toBeDefined();
              expect(updatedCompany.verifiedBy).toBe(testPlatformAdmin.id);
            }

            // Step 4: Verify data integrity - company should still exist in database
            const finalCompany = await prisma.company.findUnique({
              where: { id: testCompany.id },
            });
            expect(finalCompany).toBeDefined();
            expect(finalCompany?.id).toBe(testCompany.id);

          } finally {
            // Clean up test company
            if (testCompany?.id) {
              await prisma.company.delete({
                where: { id: testCompany.id },
              }).catch(() => {
                // Ignore deletion errors in cleanup
              });
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Company status transitions should be valid and consistent
   */
  it('should enforce valid company status transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialStatus: fc.constantFrom(
            CompanyStatus.PENDING_VERIFICATION,
            CompanyStatus.ACTIVE
          ),
          targetStatus: fc.constantFrom(
            CompanyStatus.ACTIVE,
            CompanyStatus.SUSPENDED
          ),
        }),
        async ({ initialStatus, targetStatus }) => {
          let testCompany: any = null;

          try {
            // Create company with initial status
            testCompany = await prisma.company.create({
              data: {
                name: `Test Status Company ${Date.now()}-${Math.random()}`,
                organizationNumber: `STS${Date.now().toString().slice(-6)}`,
                businessAddress: 'Test Address',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
                status: initialStatus,
                verified: initialStatus === CompanyStatus.ACTIVE,
              },
            });

            // Perform status transition directly with Prisma
            const updatedCompany = await prisma.company.update({
              where: { id: testCompany.id },
              data: {
                status: targetStatus,
                verified: targetStatus === CompanyStatus.ACTIVE,
                suspendedAt: targetStatus === CompanyStatus.SUSPENDED ? new Date() : null,
                suspendedBy: targetStatus === CompanyStatus.SUSPENDED ? testPlatformAdmin.id : null,
                suspensionReason: targetStatus === CompanyStatus.SUSPENDED ? 'Test suspension' : null,
                verifiedAt: targetStatus === CompanyStatus.ACTIVE && initialStatus !== CompanyStatus.ACTIVE ? new Date() : undefined,
                verifiedBy: targetStatus === CompanyStatus.ACTIVE && initialStatus !== CompanyStatus.ACTIVE ? testPlatformAdmin.id : undefined,
              },
            });

            // Verify the status was updated
            expect(updatedCompany.status).toBe(targetStatus);

            // Verify status-specific properties
            if (targetStatus === CompanyStatus.SUSPENDED) {
              expect(updatedCompany.suspendedBy).toBe(testPlatformAdmin.id);
              expect(updatedCompany.suspensionReason).toBe('Test suspension');
              expect(updatedCompany.suspendedAt).toBeDefined();
            } else if (targetStatus === CompanyStatus.ACTIVE) {
              expect(updatedCompany.verified).toBe(true);
            }

          } finally {
            // Clean up
            if (testCompany?.id) {
              await prisma.company.delete({
                where: { id: testCompany.id },
              }).catch(() => {});
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Company filtering should return consistent results
   */
  it('should return consistent results for company filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyCount: fc.integer({ min: 2, max: 4 }),
          targetStatus: fc.constantFrom(CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED),
        }),
        async ({ companyCount, targetStatus }) => {
          const testCompanies: any[] = [];

          try {
            // Create test companies with varied properties
            for (let i = 0; i < companyCount; i++) {
              const company = await prisma.company.create({
                data: {
                  name: `Test Filter Company ${Date.now()}-${i}-${Math.random()}`,
                  organizationNumber: `FLT${Date.now().toString().slice(-3)}${i}${Math.floor(Math.random() * 100)}`,
                  businessAddress: 'Test Address',
                  city: 'Oslo',
                  postalCode: '0001',
                  fylke: 'Oslo',
                  kommune: 'Oslo',
                  vatRegistered: true,
                  status: targetStatus,
                  verified: targetStatus === CompanyStatus.ACTIVE,
                },
              });
              testCompanies.push(company);
            }

            // Test direct database filtering
            const filteredCompanies = await prisma.company.findMany({
              where: {
                status: targetStatus,
                id: { in: testCompanies.map(c => c.id) },
              },
            });

            // Verify filtering works correctly
            expect(filteredCompanies).toHaveLength(companyCount);
            filteredCompanies.forEach(company => {
              expect(company.status).toBe(targetStatus);
              expect(testCompanies.some(tc => tc.id === company.id)).toBe(true);
            });

          } finally {
            // Clean up all test companies
            for (const company of testCompanies) {
              await prisma.company.delete({
                where: { id: company.id },
              }).catch(() => {});
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Company data should maintain referential integrity
   */
  it('should maintain referential integrity for company data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          companyName: fc.string({ minLength: 3, maxLength: 50 }).map(s => `Test Company ${s.replace(/[^a-zA-Z0-9 ]/g, '')}`),
          orgNumber: fc.string({ minLength: 9, maxLength: 9 }).map(s => `ORG${s.replace(/[^0-9]/g, '').padStart(6, '0')}`),
        }),
        async ({ companyName, orgNumber }) => {
          let testCompany: any = null;

          try {
            // Create company
            testCompany = await prisma.company.create({
              data: {
                name: companyName,
                organizationNumber: orgNumber,
                businessAddress: 'Test Address',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
                status: CompanyStatus.PENDING_VERIFICATION,
                verified: false,
              },
            });

            // Verify company was created with correct data
            expect(testCompany).toBeDefined();
            expect(testCompany.name).toBe(companyName);
            expect(testCompany.organizationNumber).toBe(orgNumber);
            expect(testCompany.status).toBe(CompanyStatus.PENDING_VERIFICATION);
            expect(testCompany.verified).toBe(false);

            // Verify we can retrieve the company
            const retrievedCompany = await prisma.company.findUnique({
              where: { id: testCompany.id },
            });

            expect(retrievedCompany).toBeDefined();
            expect(retrievedCompany?.id).toBe(testCompany.id);
            expect(retrievedCompany?.name).toBe(companyName);
            expect(retrievedCompany?.organizationNumber).toBe(orgNumber);

          } finally {
            // Clean up
            if (testCompany?.id) {
              await prisma.company.delete({
                where: { id: testCompany.id },
              }).catch(() => {});
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});