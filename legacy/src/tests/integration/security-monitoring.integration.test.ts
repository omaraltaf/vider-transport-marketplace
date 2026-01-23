import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('Security Monitoring and Alert Functionality Integration Tests', () => {
  let testUserId: string;
  let testCompanyId: string;

  beforeAll(async () => {
    // Clean up any existing test data first
    await cleanupTestData();
    
    // Create test company first
    const testCompany = await prisma.company.create({
      data: {
        name: 'Security Test Company',
        organizationNumber: '987654321', // Use different org number
        businessAddress: '123 Security Test St',
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

  beforeEach(async () => {
    // Clean security data before each test
    await prisma.securityAlert.deleteMany();
    await prisma.securityEvent.deleteMany();
  });

  describe('Security Models Database Operations', () => {
    it('should create and retrieve security events', async () => {
      // Create a security event
      const securityEvent = await prisma.securityEvent.create({
        data: {
          eventType: 'FAILED_LOGIN_ATTEMPT',
          threatLevel: 'MEDIUM',
          title: 'Failed Login Attempt',
          description: 'Multiple failed login attempts detected',
          userId: testUserId,
          userEmail: 'user@test.com',
          ipAddress: '192.168.1.1',
          riskScore: 50,
          indicators: ['multiple_attempts', 'same_ip'],
          affectedResources: ['user_account'],
          mitigationActions: ['block_ip', 'notify_admin'],
        },
      });

      expect(securityEvent).toBeDefined();
      expect(securityEvent.eventType).toBe('FAILED_LOGIN_ATTEMPT');
      expect(securityEvent.threatLevel).toBe('MEDIUM');
      expect(securityEvent.userId).toBe(testUserId);

      // Retrieve the security event
      const retrievedEvent = await prisma.securityEvent.findUnique({
        where: { id: securityEvent.id },
      });

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.eventType).toBe('FAILED_LOGIN_ATTEMPT');
    });

    it('should create and retrieve security alerts', async () => {
      // Create a security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'MULTIPLE_FAILED_LOGINS',
          severity: 'HIGH',
          title: 'Multiple Failed Login Attempts',
          description: 'User has exceeded failed login threshold',
          userId: testUserId,
          userEmail: 'user@test.com',
          indicators: ['failed_logins', 'threshold_exceeded'],
          affectedResources: ['user_account'],
          mitigationActions: ['temporary_lockout', 'notify_security'],
        },
      });

      expect(securityAlert).toBeDefined();
      expect(securityAlert.alertType).toBe('MULTIPLE_FAILED_LOGINS');
      expect(securityAlert.severity).toBe('HIGH');
      expect(securityAlert.userId).toBe(testUserId);

      // Retrieve the security alert
      const retrievedAlert = await prisma.securityAlert.findUnique({
        where: { id: securityAlert.id },
      });

      expect(retrievedAlert).toBeDefined();
      expect(retrievedAlert?.alertType).toBe('MULTIPLE_FAILED_LOGINS');
    });

    it('should filter security events by type and threat level', async () => {
      // Create multiple security events
      await prisma.securityEvent.createMany({
        data: [
          {
            eventType: 'FAILED_LOGIN_ATTEMPT',
            threatLevel: 'LOW',
            title: 'Failed Login',
            description: 'Single failed login',
            riskScore: 25,
            indicators: ['failed_login'],
            affectedResources: ['user_account'],
            mitigationActions: ['log_event'],
          },
          {
            eventType: 'PRIVILEGE_ESCALATION_ATTEMPT',
            threatLevel: 'HIGH',
            title: 'Privilege Escalation',
            description: 'Unauthorized access attempt',
            riskScore: 85,
            indicators: ['unauthorized_access'],
            affectedResources: ['admin_panel'],
            mitigationActions: ['block_user', 'alert_admin'],
          },
          {
            eventType: 'SUSPICIOUS_LOGIN',
            threatLevel: 'MEDIUM',
            title: 'Suspicious Login',
            description: 'Login from unusual location',
            riskScore: 60,
            indicators: ['unusual_location'],
            affectedResources: ['user_account'],
            mitigationActions: ['verify_user'],
          },
        ],
      });

      // Filter by event type
      const failedLoginEvents = await prisma.securityEvent.findMany({
        where: { eventType: 'FAILED_LOGIN_ATTEMPT' },
      });
      expect(failedLoginEvents.length).toBe(1);

      // Filter by threat level
      const highThreatEvents = await prisma.securityEvent.findMany({
        where: { threatLevel: 'HIGH' },
      });
      expect(highThreatEvents.length).toBe(1);
      expect(highThreatEvents[0].eventType).toBe('PRIVILEGE_ESCALATION_ATTEMPT');
    });

    it('should update security alert status', async () => {
      // Create a security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          title: 'Suspicious Activity Detected',
          description: 'Unusual user behavior patterns',
          indicators: ['unusual_behavior'],
          affectedResources: ['user_data'],
          mitigationActions: ['monitor_user'],
        },
      });

      expect(securityAlert.status).toBe('OPEN');

      // Update alert status
      const updatedAlert = await prisma.securityAlert.update({
        where: { id: securityAlert.id },
        data: {
          status: 'INVESTIGATING',
          assignedTo: 'security-team',
          acknowledgedAt: new Date(),
        },
      });

      expect(updatedAlert.status).toBe('INVESTIGATING');
      expect(updatedAlert.assignedTo).toBe('security-team');
      expect(updatedAlert.acknowledgedAt).toBeDefined();
    });
  });

  describe('Security Alert Management', () => {
    it('should resolve security alerts', async () => {
      // Create a security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'ACCOUNT_TAKEOVER',
          severity: 'HIGH',
          title: 'Account Takeover Attempt',
          description: 'Suspicious account activity detected',
          userId: testUserId,
          indicators: ['password_change', 'new_device'],
          affectedResources: ['user_account'],
          mitigationActions: ['verify_identity', 'temporary_lockout'],
        },
      });

      expect(securityAlert.status).toBe('OPEN');

      // Resolve the alert
      const resolvedAlert = await prisma.securityAlert.update({
        where: { id: securityAlert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: 'security-admin',
          resolution: 'False positive - legitimate user activity',
        },
      });

      expect(resolvedAlert.status).toBe('RESOLVED');
      expect(resolvedAlert.resolvedAt).toBeDefined();
      expect(resolvedAlert.resolvedBy).toBe('security-admin');
    });

    it('should escalate alerts', async () => {
      // Create a security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          title: 'Suspicious Activity',
          description: 'Unusual user behavior detected',
          indicators: ['unusual_behavior'],
          affectedResources: ['user_data'],
          mitigationActions: ['monitor_user'],
        },
      });

      expect(securityAlert.escalated).toBe(false);

      // Escalate the alert
      const escalatedAlert = await prisma.securityAlert.update({
        where: { id: securityAlert.id },
        data: {
          escalated: true,
          severity: 'HIGH',
          assignedTo: 'senior-security-team',
        },
      });

      expect(escalatedAlert.escalated).toBe(true);
      expect(escalatedAlert.severity).toBe('HIGH');
      expect(escalatedAlert.assignedTo).toBe('senior-security-team');
    });
  });

  describe('Security Data Queries', () => {
    beforeEach(async () => {
      // Create test security data
      await prisma.securityEvent.createMany({
        data: [
          {
            eventType: 'FAILED_LOGIN_ATTEMPT',
            threatLevel: 'LOW',
            title: 'Failed Login',
            description: 'Failed login attempt',
            userId: testUserId,
            riskScore: 25,
            indicators: ['failed_login'],
            affectedResources: ['user_account'],
            mitigationActions: ['log_event'],
          },
          {
            eventType: 'SUSPICIOUS_IP_ACTIVITY',
            threatLevel: 'MEDIUM',
            title: 'Suspicious IP',
            description: 'Activity from suspicious IP',
            riskScore: 60,
            indicators: ['suspicious_ip'],
            affectedResources: ['network'],
            mitigationActions: ['monitor_ip'],
          },
          {
            eventType: 'PRIVILEGE_ESCALATION_ATTEMPT',
            threatLevel: 'HIGH',
            title: 'Privilege Escalation',
            description: 'Unauthorized privilege escalation attempt',
            userId: testUserId,
            riskScore: 85,
            indicators: ['privilege_escalation'],
            affectedResources: ['admin_panel'],
            mitigationActions: ['block_user'],
          },
        ],
      });

      await prisma.securityAlert.createMany({
        data: [
          {
            alertType: 'MULTIPLE_FAILED_LOGINS',
            severity: 'MEDIUM',
            status: 'OPEN',
            userId: testUserId,
            title: 'Multiple Failed Logins',
            description: 'Multiple failed login attempts detected',
            indicators: ['failed_logins'],
            affectedResources: ['user_account'],
            mitigationActions: ['lockout_user'],
          },
          {
            alertType: 'PRIVILEGE_ESCALATION',
            severity: 'HIGH',
            status: 'INVESTIGATING',
            userId: testUserId,
            title: 'Privilege Escalation Alert',
            description: 'Privilege escalation attempt detected',
            indicators: ['privilege_escalation'],
            affectedResources: ['admin_panel'],
            mitigationActions: ['investigate_user'],
          },
        ],
      });
    });

    it('should count security events by threat level', async () => {
      const lowThreatEvents = await prisma.securityEvent.count({
        where: { threatLevel: 'LOW' },
      });
      const mediumThreatEvents = await prisma.securityEvent.count({
        where: { threatLevel: 'MEDIUM' },
      });
      const highThreatEvents = await prisma.securityEvent.count({
        where: { threatLevel: 'HIGH' },
      });

      expect(lowThreatEvents).toBe(1);
      expect(mediumThreatEvents).toBe(1);
      expect(highThreatEvents).toBe(1);
    });

    it('should count security alerts by status', async () => {
      const openAlerts = await prisma.securityAlert.count({
        where: { status: 'OPEN' },
      });
      const investigatingAlerts = await prisma.securityAlert.count({
        where: { status: 'INVESTIGATING' },
      });

      expect(openAlerts).toBe(1);
      expect(investigatingAlerts).toBe(1);
    });

    it('should find events by user', async () => {
      const userEvents = await prisma.securityEvent.findMany({
        where: { userId: testUserId },
      });

      expect(userEvents.length).toBe(2); // FAILED_LOGIN_ATTEMPT and PRIVILEGE_ESCALATION_ATTEMPT
    });

    it('should find high-severity alerts', async () => {
      const highSeverityAlerts = await prisma.securityAlert.findMany({
        where: { severity: 'HIGH' },
      });

      expect(highSeverityAlerts.length).toBe(1);
      expect(highSeverityAlerts[0].alertType).toBe('PRIVILEGE_ESCALATION');
    });
  });

  describe('Security Data Aggregation', () => {
    it('should aggregate security events by type', async () => {
      // Create multiple events of different types
      await prisma.securityEvent.createMany({
        data: [
          {
            eventType: 'FAILED_LOGIN_ATTEMPT',
            threatLevel: 'LOW',
            title: 'Failed Login 1',
            description: 'First failed login',
            riskScore: 25,
            indicators: ['failed_login'],
            affectedResources: ['user_account'],
            mitigationActions: ['log_event'],
          },
          {
            eventType: 'FAILED_LOGIN_ATTEMPT',
            threatLevel: 'LOW',
            title: 'Failed Login 2',
            description: 'Second failed login',
            riskScore: 25,
            indicators: ['failed_login'],
            affectedResources: ['user_account'],
            mitigationActions: ['log_event'],
          },
          {
            eventType: 'SUSPICIOUS_LOGIN',
            threatLevel: 'MEDIUM',
            title: 'Suspicious Login',
            description: 'Login from unusual location',
            riskScore: 60,
            indicators: ['unusual_location'],
            affectedResources: ['user_account'],
            mitigationActions: ['verify_user'],
          },
        ],
      });

      // Count events by type
      const failedLoginCount = await prisma.securityEvent.count({
        where: { eventType: 'FAILED_LOGIN_ATTEMPT' },
      });
      const suspiciousLoginCount = await prisma.securityEvent.count({
        where: { eventType: 'SUSPICIOUS_LOGIN' },
      });

      expect(failedLoginCount).toBe(2);
      expect(suspiciousLoginCount).toBe(1);
    });

    it('should find recent security events', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Create events with specific timestamps
      await prisma.securityEvent.create({
        data: {
          eventType: 'SUSPICIOUS_LOGIN',
          threatLevel: 'MEDIUM',
          title: 'Recent Suspicious Login',
          description: 'Recent suspicious activity',
          timestamp: now,
          riskScore: 60,
          indicators: ['suspicious_activity'],
          affectedResources: ['user_account'],
          mitigationActions: ['monitor_user'],
        },
      });

      // Find recent events (within last hour)
      const recentEvents = await prisma.securityEvent.findMany({
        where: {
          timestamp: {
            gte: oneHourAgo,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      expect(recentEvents.length).toBeGreaterThan(0);
      expect(recentEvents[0].title).toBe('Recent Suspicious Login');
    });
  });
});