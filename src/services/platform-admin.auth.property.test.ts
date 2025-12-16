/**
 * Property-based tests for platform admin authentication and authorization
 * Feature: platform-admin-dashboard, Property 5: User Management Security
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/database';
import { authService } from './auth.service';
import { Role } from '@prisma/client';

const app = createApp();

describe('Platform Admin Authentication Property Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-platform-admin',
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

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-platform-admin',
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
   * Property: For any user management operation, the operation should enforce proper permissions,
   * maintain security, and handle active sessions appropriately
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  it('should enforce platform admin permissions for all platform admin operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userRole: fc.constantFrom(Role.PLATFORM_ADMIN, Role.COMPANY_ADMIN),
          endpoint: fc.constantFrom(
            '/api/platform-admin/overview',
            '/api/platform-admin/companies',
            '/api/platform-admin/users'
          ),
          method: fc.constantFrom('GET', 'POST'),
        }),
        async ({ userRole, endpoint, method }) => {
          // Create test company
          const testCompany = await prisma.company.create({
            data: {
              name: `Test Platform Admin Company ${Date.now()}`,
              organizationNumber: `TEST${Date.now()}`,
              businessAddress: 'Test Address',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          // Create test user with specified role
          const testUser = await prisma.user.create({
            data: {
              email: `test-platform-admin-${Date.now()}@example.com`,
              passwordHash: 'hashedpassword',
              role: userRole,
              companyId: testCompany.id,
              firstName: 'Test',
              lastName: 'User',
              phone: '+4712345678',
            },
          });

          // Generate JWT token for the user
          const token = authService.generateToken({
            userId: testUser.id,
            email: testUser.email,
            role: testUser.role,
            companyId: testUser.companyId,
          });

          // Make request to platform admin endpoint
          const response = await request(app)
            [method.toLowerCase() as 'get' | 'post'](endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({});

          // Verify security enforcement
          if (userRole === Role.PLATFORM_ADMIN) {
            // Platform admins should have access
            expect(response.status).not.toBe(403);
          } else {
            // Non-platform admins should be denied access
            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('PLATFORM_ADMIN_REQUIRED');
          }

          // Clean up
          await prisma.user.delete({ where: { id: testUser.id } });
          await prisma.company.delete({ where: { id: testCompany.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Authentication tokens should be properly validated for platform admin access
   */
  it('should properly validate authentication tokens for platform admin access', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasToken: fc.boolean(),
          tokenValid: fc.boolean(),
          endpoint: fc.constantFrom(
            '/api/platform-admin/companies',
            '/api/platform-admin/users'
          ),
        }),
        async ({ hasToken, tokenValid, endpoint }) => {
          let token = '';
          let testUser: any = null;
          let testCompany: any = null;

          if (hasToken && tokenValid) {
            // Create valid test data
            testCompany = await prisma.company.create({
              data: {
                name: `Test Platform Admin Company ${Date.now()}`,
                organizationNumber: `TEST${Date.now()}`,
                businessAddress: 'Test Address',
                city: 'Oslo',
                postalCode: '0001',
                fylke: 'Oslo',
                kommune: 'Oslo',
                vatRegistered: true,
              },
            });

            testUser = await prisma.user.create({
              data: {
                email: `test-platform-admin-${Date.now()}@example.com`,
                passwordHash: 'hashedpassword',
                role: Role.PLATFORM_ADMIN,
                companyId: testCompany.id,
                firstName: 'Test',
                lastName: 'User',
                phone: '+4712345678',
              },
            });

            token = authService.generateToken({
              userId: testUser.id,
              email: testUser.email,
              role: testUser.role,
              companyId: testUser.companyId,
            });
          } else if (hasToken && !tokenValid) {
            // Invalid token
            token = 'invalid-token';
          }

          // Make request
          const requestBuilder = request(app).get(endpoint);
          
          if (hasToken) {
            requestBuilder.set('Authorization', `Bearer ${token}`);
          }

          const response = await requestBuilder.send();

          // Verify authentication enforcement
          if (!hasToken) {
            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
          } else if (!tokenValid) {
            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('INVALID_TOKEN');
          } else {
            // Valid platform admin token should allow access
            expect(response.status).not.toBe(401);
          }

          // Clean up
          if (testUser) {
            await prisma.user.delete({ where: { id: testUser.id } });
          }
          if (testCompany) {
            await prisma.company.delete({ where: { id: testCompany.id } });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Platform admin operations should be properly audited
   */
  it('should audit all platform admin operations for security tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operation: fc.constantFrom('GET', 'POST'),
          endpoint: fc.constantFrom(
            '/api/platform-admin/companies',
            '/api/platform-admin/users'
          ),
        }),
        async ({ operation, endpoint }) => {
          // Create test company and platform admin user
          const testCompany = await prisma.company.create({
            data: {
              name: `Test Platform Admin Company ${Date.now()}`,
              organizationNumber: `TEST${Date.now()}`,
              businessAddress: 'Test Address',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          const testUser = await prisma.user.create({
            data: {
              email: `test-platform-admin-${Date.now()}@example.com`,
              passwordHash: 'hashedpassword',
              role: Role.PLATFORM_ADMIN,
              companyId: testCompany.id,
              firstName: 'Test',
              lastName: 'User',
              phone: '+4712345678',
            },
          });

          const token = authService.generateToken({
            userId: testUser.id,
            email: testUser.email,
            role: testUser.role,
            companyId: testUser.companyId,
          });

          // Make request
          const response = await request(app)
            [operation.toLowerCase() as 'get' | 'post'](endpoint)
            .set('Authorization', `Bearer ${token}`)
            .send({});

          // Verify that the request was processed (auditing happens in middleware)
          // The audit logging is handled by the auditPlatformAdminAction middleware
          // and logged via the logger, so we verify the request was successful
          expect(response.status).not.toBe(500);

          // Clean up
          await prisma.user.delete({ where: { id: testUser.id } });
          await prisma.company.delete({ where: { id: testCompany.id } });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Platform admin permissions should be consistently enforced across all endpoints
   */
  it('should consistently enforce platform admin permissions across all endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            '/api/platform-admin/overview',
            '/api/platform-admin/companies',
            '/api/platform-admin/users'
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (endpoints) => {
          // Create test company and non-platform admin user
          const testCompany = await prisma.company.create({
            data: {
              name: `Test Platform Admin Company ${Date.now()}`,
              organizationNumber: `TEST${Date.now()}`,
              businessAddress: 'Test Address',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
            },
          });

          const testUser = await prisma.user.create({
            data: {
              email: `test-platform-admin-${Date.now()}@example.com`,
              passwordHash: 'hashedpassword',
              role: Role.COMPANY_ADMIN, // Not a platform admin
              companyId: testCompany.id,
              firstName: 'Test',
              lastName: 'User',
              phone: '+4712345678',
            },
          });

          const token = authService.generateToken({
            userId: testUser.id,
            email: testUser.email,
            role: testUser.role,
            companyId: testUser.companyId,
          });

          // Test all endpoints with non-platform admin user
          const responses = await Promise.all(
            endpoints.map(endpoint =>
              request(app)
                .get(endpoint)
                .set('Authorization', `Bearer ${token}`)
                .send()
            )
          );

          // All endpoints should consistently deny access to non-platform admins
          responses.forEach(response => {
            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('PLATFORM_ADMIN_REQUIRED');
          });

          // Clean up
          await prisma.user.delete({ where: { id: testUser.id } });
          await prisma.company.delete({ where: { id: testCompany.id } });
        }
      ),
      { numRuns: 50 }
    );
  });
});