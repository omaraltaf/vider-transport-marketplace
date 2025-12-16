import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../config/database';

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

describe('Security Workflows Integration Tests', () => {
  let testUserId: string;
  let testCompanyId: string;

  beforeAll(async () => {
    // Clean up any existing test data first
    await cleanupTestData();
    
    // Create test company first
    const testCompany = await prisma.company.create({
      data: {
        name: 'Security Workflows Test Company',
        organizationNumber: '666666666',
        businessAddress: '123 Security Workflows St',
        city: 'Oslo',
        postalCode: '0123',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      },
    });

    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        firstName: 'Test',
        lastName: 'Admin',
        passwordHash: 'hashedpassword',
        role: 'PLATFORM_ADMIN',
        companyId: testCompany.id,
        phone: '+1234567890',
      },
    });

    // Create test regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: 'COMPANY_USER',
        companyId: testCompany.id,
        phone: '+1234567891',
      },
    });

    testUserId = regularUser.id;
    testCompanyId = testCompany.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Security Event and Alert Integration', () => {
    it('should create security events and alerts for suspicious activities', async () => {
      // Create a security event
      const securityEvent = await prisma.securityEvent.create({
        data: {
          eventType: 'FAILED_LOGIN_ATTEMPT',
          threatLevel: 'MEDIUM',
          title: 'Multiple Failed Login Attempts',
          description: 'User exceeded failed login threshold',
          userId: testUserId,
          userEmail: 'user@test.com',
          ipAddress: '192.168.1.200',
          riskScore: 60,
          indicators: ['multiple_failed_attempts', 'threshold_exceeded'],
          affectedResources: ['user_account'],
          mitigationActions: ['temporary_lockout', 'security_alert'],
        },
      });

      // Create corresponding security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'MULTIPLE_FAILED_LOGINS',
          severity: 'MEDIUM',
          userId: testUserId,
          userEmail: 'user@test.com',
          title: 'Account Security Alert',
          description: 'Multiple failed login attempts detected for user account',
          indicators: ['failed_logins', 'brute_force_attempt'],
          affectedResources: ['user_account'],
          mitigationActions: ['account_lockout', 'notify_security_team'],
          metadata: {
            eventId: securityEvent.id,
            attemptCount: 5,
            timeWindow: '5 minutes',
          },
        },
      });

      // Verify both were created successfully
      expect(securityEvent).toBeDefined();
      expect(securityEvent.eventType).toBe('FAILED_LOGIN_ATTEMPT');
      expect(securityEvent.threatLevel).toBe('MEDIUM');
      expect(securityEvent.userId).toBe(testUserId);

      expect(securityAlert).toBeDefined();
      expect(securityAlert.alertType).toBe('MULTIPLE_FAILED_LOGINS');
      expect(securityAlert.severity).toBe('MEDIUM');
      expect(securityAlert.userId).toBe(testUserId);
    });

    it('should create audit logs for security operations', async () => {
      // Create an audit log for security monitoring action
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: testUserId,
          action: 'SECURITY_INCIDENT_INVESTIGATED',
          entityType: 'SecurityAlert',
          entityId: 'test-alert-id',
          changes: {
            status: { from: 'OPEN', to: 'INVESTIGATING' },
            assignedTo: 'security-team',
          },
          reason: 'Security incident requires investigation',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify audit log was created
      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('SECURITY_INCIDENT_INVESTIGATED');
      expect(auditLog.entityType).toBe('SecurityAlert');
      expect(auditLog.adminUserId).toBe(testUserId);
    });

    it('should handle security alert lifecycle', async () => {
      // Create initial alert
      const alert = await prisma.securityAlert.create({
        data: {
          alertType: 'SUSPICIOUS_ACTIVITY',
          severity: 'LOW',
          title: 'Suspicious Activity Detected',
          description: 'Unusual user behavior patterns detected',
          indicators: ['unusual_behavior'],
          affectedResources: ['user_data'],
          mitigationActions: ['monitor_user'],
        },
      });

      // Update to investigating
      const investigatingAlert = await prisma.securityAlert.update({
        where: { id: alert.id },
        data: {
          status: 'INVESTIGATING',
          assignedTo: 'security-team',
          acknowledgedAt: new Date(),
        },
      });

      // Resolve the alert
      const resolvedAlert = await prisma.securityAlert.update({
        where: { id: alert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: 'security-admin',
          resolution: 'False positive - legitimate user activity',
        },
      });

      // Verify lifecycle progression
      expect(alert.status).toBe('OPEN');
      expect(investigatingAlert.status).toBe('INVESTIGATING');
      expect(investigatingAlert.assignedTo).toBe('security-team');
      expect(resolvedAlert.status).toBe('RESOLVED');
      expect(resolvedAlert.resolution).toBe('False positive - legitimate user activity');
    });
  });
});