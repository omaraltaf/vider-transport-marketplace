import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';
import { generateTestToken } from '../helpers/auth.helper';

// Helper function to clean up test data in correct order
async function cleanupTestData() {
  try {
    // Delete in order to respect foreign key constraints
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
    // Ignore cleanup errors in tests
    console.log('Cleanup error (ignored):', error);
  }
}

describe('Access Control and Permission Enforcement Integration Tests', () => {
  let platformAdminToken: string;
  let companyAdminToken: string;
  let userToken: string;
  let unauthorizedToken: string;
  let testUserId: string;
  let testCompanyId: string;
  let app: any;

  beforeAll(async () => {
    // Create app instance
    app = createApp();
    
    // Clean up any existing test data first
    await cleanupTestData();
    
    // Create test company first
    const testCompany = await prisma.company.create({
      data: {
        name: 'Access Control Test Company',
        organizationNumber: '555555555',
        businessAddress: '123 Access Control St',
        city: 'Oslo',
        postalCode: '0123',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      },
    });

    // Create test users with different roles
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'platform-admin@test.com',
        firstName: 'Platform',
        lastName: 'Admin',
        passwordHash: 'hashedpassword',
        role: 'PLATFORM_ADMIN',
        companyId: testCompany.id,
        phone: '+1234567890',
      },
    });

    const companyAdmin = await prisma.user.create({
      data: {
        email: 'company-admin@test.com',
        firstName: 'Company',
        lastName: 'Admin',
        passwordHash: 'hashedpassword',
        role: 'COMPANY_ADMIN',
        companyId: testCompany.id,
        phone: '+1234567891',
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: 'COMPANY_USER',
        companyId: testCompany.id,
        phone: '+1234567892',
      },
    });

    const inactiveUser = await prisma.user.create({
      data: {
        email: 'inactive@test.com',
        firstName: 'Inactive',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: 'COMPANY_USER',
        companyId: testCompany.id,
        phone: '+1234567893',
      },
    });

    testUserId = regularUser.id;
    testCompanyId = testCompany.id;

    // Generate tokens
    platformAdminToken = generateTestToken(platformAdmin.id, 'PLATFORM_ADMIN');
    companyAdminToken = generateTestToken(companyAdmin.id, 'COMPANY_ADMIN');
    userToken = generateTestToken(regularUser.id, 'COMPANY_USER');
    unauthorizedToken = generateTestToken(inactiveUser.id, 'COMPANY_USER');
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Platform Admin Endpoints Access Control', () => {
    it('should allow platform admin to access all user management endpoints', async () => {
      // Test user listing
      const listResponse = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(listResponse.status).toBe(200);

      // Test user update
      const updateResponse = await request(app)
        .put(`/api/platform-admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Updated Name' });
      expect(updateResponse.status).toBe(200);

      // Test user suspension
      const suspendResponse = await request(app)
        .put(`/api/platform-admin/users/${testUserId}/suspend`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ reason: 'Test suspension' });
      expect(suspendResponse.status).toBe(200);
    });

    it('should allow platform admin to access company management endpoints', async () => {
      // Test company listing
      const listResponse = await request(app)
        .get('/api/platform-admin/companies')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(listResponse.status).toBe(200);

      // Test company update
      const updateResponse = await request(app)
        .put(`/api/platform-admin/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Updated Company Name' });
      expect(updateResponse.status).toBe(200);
    });

    it('should allow platform admin to access financial management endpoints', async () => {
      // Test revenue analytics
      const revenueResponse = await request(app)
        .get('/api/platform-admin/financial/revenue')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(revenueResponse.status).toBe(200);

      // Test commission rates
      const commissionResponse = await request(app)
        .get('/api/platform-admin/financial/commission-rates')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(commissionResponse.status).toBe(200);
    });

    it('should allow platform admin to access analytics endpoints', async () => {
      // Test platform analytics
      const analyticsResponse = await request(app)
        .get('/api/platform-admin/analytics/overview')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(analyticsResponse.status).toBe(200);

      // Test user analytics
      const userAnalyticsResponse = await request(app)
        .get('/api/platform-admin/analytics/users')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(userAnalyticsResponse.status).toBe(200);
    });
  });

  describe('Unauthorized Access Prevention', () => {
    it('should deny company admin access to platform admin endpoints', async () => {
      // Test user management access
      const userResponse = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${companyAdminToken}`);
      expect(userResponse.status).toBe(403);

      // Test financial management access
      const financialResponse = await request(app)
        .get('/api/platform-admin/financial/revenue')
        .set('Authorization', `Bearer ${companyAdminToken}`);
      expect(financialResponse.status).toBe(403);

      // Test analytics access
      const analyticsResponse = await request(app)
        .get('/api/platform-admin/analytics/overview')
        .set('Authorization', `Bearer ${companyAdminToken}`);
      expect(analyticsResponse.status).toBe(403);
    });

    it('should deny regular user access to platform admin endpoints', async () => {
      // Test user management access
      const userResponse = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(userResponse.status).toBe(403);

      // Test company management access
      const companyResponse = await request(app)
        .get('/api/platform-admin/companies')
        .set('Authorization', `Bearer ${userToken}`);
      expect(companyResponse.status).toBe(403);

      // Test system administration access
      const systemResponse = await request(app)
        .get('/api/platform-admin/system/health')
        .set('Authorization', `Bearer ${userToken}`);
      expect(systemResponse.status).toBe(403);
    });

    it('should deny access to inactive users', async () => {
      // Test with inactive user token
      const response = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${unauthorizedToken}`);
      expect(response.status).toBe(401);
    });

    it('should deny access without authentication token', async () => {
      // Test without token
      const response = await request(app)
        .get('/api/platform-admin/users');
      expect(response.status).toBe(401);
    });

    it('should deny access with invalid token', async () => {
      // Test with invalid token
      const response = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });
  });

  describe('Resource-Level Permission Enforcement', () => {
    it('should enforce user-specific permissions for user operations', async () => {
      // Platform admin should be able to update any user
      const adminUpdateResponse = await request(app)
        .put(`/api/platform-admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Admin Updated Name' });
      expect(adminUpdateResponse.status).toBe(200);

      // Regular user should not be able to update other users
      const userUpdateResponse = await request(app)
        .put(`/api/platform-admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Updated Name' });
      expect(userUpdateResponse.status).toBe(403);
    });

    it('should enforce company-specific permissions for company operations', async () => {
      // Platform admin should be able to update any company
      const adminUpdateResponse = await request(app)
        .put(`/api/platform-admin/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ name: 'Admin Updated Company' });
      expect(adminUpdateResponse.status).toBe(200);

      // Company admin should only be able to update their own company
      const companyAdminResponse = await request(app)
        .put(`/api/platform-admin/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .send({ name: 'Company Admin Updated' });
      expect(companyAdminResponse.status).toBe(200);
    });

    it('should log unauthorized access attempts', async () => {
      // Clear existing audit logs
      await prisma.auditLog.deleteMany();

      // Attempt unauthorized access
      await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      // Check if security event was logged
      const securityLogs = await prisma.auditLog.findMany({
        where: {
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        },
      });

      expect(securityLogs.length).toBeGreaterThan(0);
      expect(securityLogs[0]).toMatchObject({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        details: expect.objectContaining({
          endpoint: '/api/platform-admin/users',
          method: 'GET',
          userRole: 'USER',
        }),
      });
    });
  });

  describe('Rate Limiting and Security Boundaries', () => {
    it('should enforce rate limiting on sensitive endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .get('/api/platform-admin/users')
            .set('Authorization', `Bearer ${platformAdminToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Should have some rate limited responses (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate input parameters and prevent injection attacks', async () => {
      // Test SQL injection attempt
      const sqlInjectionResponse = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .query({
          search: "'; DROP TABLE users; --",
        });
      
      expect(sqlInjectionResponse.status).toBe(400);

      // Test XSS attempt
      const xssResponse = await request(app)
        .put(`/api/platform-admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({
          name: '<script>alert("xss")</script>',
        });
      
      expect(xssResponse.status).toBe(400);
    });

    it('should enforce HTTPS and secure headers', async () => {
      const response = await request(app)
        .get('/api/platform-admin/users')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});