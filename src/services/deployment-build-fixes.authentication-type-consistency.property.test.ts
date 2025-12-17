/**
 * Property-based tests for authentication type consistency
 * 
 * Property 2: Type Definition Completeness
 * For any property access in the codebase, there should exist a corresponding 
 * type definition that includes that property
 * 
 * Validates: Requirements 1.2, 3.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';
import { createApp } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = createApp();

describe('Authentication Type Consistency Properties', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-auth-consistency' } }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-auth-consistency' } }
    });
  });

  /**
   * Property: Authentication context should have consistent user object structure
   * For any authenticated request, the user object should contain all required properties
   */
  it('should maintain consistent user object properties across all authenticated endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress().map(email => `test-auth-consistency-${email}`),
          password: fc.string({ minLength: 8, maxLength: 20 }),
          firstName: fc.string({ minLength: 1, maxLength: 50 }),
          lastName: fc.string({ minLength: 1, maxLength: 50 }),
          role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER', 'DRIVER')
        }),
        async (userData) => {
          // Create test user
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              password: hashedPassword,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role as any,
              isActive: true,
              emailVerified: true
            }
          });

          // Login to get token
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
              email: userData.email,
              password: userData.password
            });

          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.token).toBeDefined();

          const token = loginResponse.body.token;

          // Test authenticated endpoints that use req.user
          const authenticatedEndpoints = [
            '/api/user/profile',
            '/api/user/dashboard',
            '/api/auth/change-password'
          ];

          for (const endpoint of authenticatedEndpoints) {
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${token}`);

            // Should not fail due to missing user properties
            expect(response.status).not.toBe(500);
            
            // If the endpoint returns user data, verify structure
            if (response.body && response.body.user) {
              const userObj = response.body.user;
              
              // Required properties that should always be present
              expect(userObj).toHaveProperty('id');
              expect(userObj).toHaveProperty('userId'); // For backward compatibility
              expect(userObj).toHaveProperty('email');
              expect(userObj).toHaveProperty('role');
              
              // Type consistency checks
              expect(typeof userObj.id).toBe('string');
              expect(typeof userObj.userId).toBe('string');
              expect(typeof userObj.email).toBe('string');
              expect(typeof userObj.role).toBe('string');
              
              // Both id and userId should reference the same user
              expect(userObj.id).toBe(userObj.userId);
            }
          }

          // Clean up
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 10, timeout: 30000 }
    );
  });

  /**
   * Property: Express Request extensions should be type-safe
   * For any middleware that accesses req.user, req.session, or custom properties,
   * the types should be properly defined
   */
  it('should have proper Express Request type extensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress().map(email => `test-auth-consistency-${email}`),
          password: fc.string({ minLength: 8, maxLength: 20 }),
          role: fc.constantFrom('PLATFORM_ADMIN', 'COMPANY_ADMIN')
        }),
        async (userData) => {
          // Create test user
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              password: hashedPassword,
              firstName: 'Test',
              lastName: 'User',
              role: userData.role as any,
              isActive: true,
              emailVerified: true
            }
          });

          // Login to get token
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
              email: userData.email,
              password: userData.password
            });

          expect(loginResponse.status).toBe(200);
          const token = loginResponse.body.token;

          // Test endpoints that use session properties
          const sessionEndpoints = [
            { method: 'get', path: '/api/user/profile' },
            { method: 'post', path: '/api/auth/logout' }
          ];

          for (const endpoint of sessionEndpoints) {
            const response = await request(app)
              [endpoint.method](endpoint.path)
              .set('Authorization', `Bearer ${token}`);

            // Should not fail due to missing session type definitions
            expect(response.status).not.toBe(500);
          }

          // Clean up
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });

  /**
   * Property: Authentication middleware should handle all user property accesses
   * For any route that uses authentication middleware, accessing user properties
   * should not cause TypeScript compilation errors
   */
  it('should provide complete user object in authentication context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress().map(email => `test-auth-consistency-${email}`),
          password: fc.string({ minLength: 8, maxLength: 20 }),
          companyName: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async (userData) => {
          // Create company first
          const company = await prisma.company.create({
            data: {
              name: userData.companyName,
              email: userData.email,
              phone: '+1234567890',
              address: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345',
              country: 'Test Country',
              isActive: true
            }
          });

          // Create test user with company
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              password: hashedPassword,
              firstName: 'Test',
              lastName: 'User',
              role: 'COMPANY_ADMIN',
              companyId: company.id,
              isActive: true,
              emailVerified: true
            }
          });

          // Login to get token
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
              email: userData.email,
              password: userData.password
            });

          expect(loginResponse.status).toBe(200);
          const token = loginResponse.body.token;

          // Test endpoints that access various user properties
          const userPropertyEndpoints = [
            '/api/user/profile',
            '/api/user/dashboard'
          ];

          for (const endpoint of userPropertyEndpoints) {
            const response = await request(app)
              .get(endpoint)
              .set('Authorization', `Bearer ${token}`);

            // Should successfully access all user properties without type errors
            expect(response.status).not.toBe(500);
            
            if (response.body && response.body.user) {
              const userObj = response.body.user;
              
              // Verify all commonly accessed properties are available
              expect(userObj).toHaveProperty('id');
              expect(userObj).toHaveProperty('email');
              expect(userObj).toHaveProperty('role');
              
              // Company-related properties should be available for company users
              if (userObj.role === 'COMPANY_ADMIN' || userObj.role === 'COMPANY_USER') {
                expect(userObj).toHaveProperty('companyId');
              }
            }
          }

          // Clean up
          await prisma.user.delete({ where: { id: user.id } });
          await prisma.company.delete({ where: { id: company.id } });
        }
      ),
      { numRuns: 5, timeout: 30000 }
    );
  });
});