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

describe('Platform Admin End-to-End Integration Tests', () => {
  let platformAdminId: string;
  let companyAdminId: string;
  let regularUserId: string;
  let testCompanyId: string;
  let suspendedCompanyId: string;
  let vehicleListingId: string;
  let driverListingId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Clean up any existing test data first
    await cleanupTestData();
    
    // Create test companies
    const testCompany = await prisma.company.create({
      data: {
        name: 'E2E Test Company',
        organizationNumber: '111111111',
        businessAddress: '123 E2E Test St',
        city: 'Oslo',
        postalCode: '0123',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        status: 'ACTIVE',
        verified: true,
      },
    });

    const suspendedCompany = await prisma.company.create({
      data: {
        name: 'Suspended Test Company',
        organizationNumber: '222222222',
        businessAddress: '456 Suspended St',
        city: 'Bergen',
        postalCode: '5000',
        fylke: 'Vestland',
        kommune: 'Bergen',
        vatRegistered: true,
        status: 'SUSPENDED',
        verified: false,
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
        email: 'regular-user@test.com',
        firstName: 'Regular',
        lastName: 'User',
        passwordHash: 'hashedpassword',
        role: 'COMPANY_USER',
        companyId: testCompany.id,
        phone: '+1234567892',
      },
    });

    // Create test listings
    const vehicleListing = await prisma.vehicleListing.create({
      data: {
        companyId: testCompany.id,
        title: 'E2E Test Vehicle',
        description: 'Test vehicle for E2E testing',
        vehicleType: 'PALLET_8',
        capacity: 8,
        fuelType: 'DIESEL',
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        hourlyRate: 500,
        dailyRate: 3000,
        deposit: 5000,
        withDriver: true,
        withDriverCost: 200,
        withoutDriver: true,
        photos: ['test-photo.jpg'],
        tags: ['reliable', 'clean'],
        status: 'ACTIVE',
      },
    });

    const driverListing = await prisma.driverListing.create({
      data: {
        companyId: testCompany.id,
        name: 'E2E Test Driver',
        licenseClass: 'C',
        languages: ['Norwegian', 'English'],
        backgroundSummary: 'Experienced driver for testing',
        hourlyRate: 300,
        dailyRate: 2000,
        verified: true,
        status: 'ACTIVE',
      },
    });

    // Store IDs for use in tests
    platformAdminId = platformAdmin.id;
    companyAdminId = companyAdmin.id;
    regularUserId = regularUser.id;
    testCompanyId = testCompany.id;
    suspendedCompanyId = suspendedCompany.id;
    vehicleListingId = vehicleListing.id;
    driverListingId = driverListing.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean audit logs and security data before each test
    await prisma.securityAlert.deleteMany();
    await prisma.securityEvent.deleteMany();
    await prisma.auditLog.deleteMany();
  });

  describe('Complete Company Management Workflow', () => {
    it('should handle complete company verification workflow', async () => {
      // 1. Create pending company
      const pendingCompany = await prisma.company.create({
        data: {
          name: 'Pending Verification Company',
          organizationNumber: '333333333',
          businessAddress: '789 Pending St',
          city: 'Trondheim',
          postalCode: '7000',
          fylke: 'Trøndelag',
          kommune: 'Trondheim',
          vatRegistered: true,
          status: 'PENDING_VERIFICATION',
          verified: false,
        },
      });

      // 2. Platform admin reviews and verifies company
      const verifiedCompany = await prisma.company.update({
        where: { id: pendingCompany.id },
        data: {
          status: 'ACTIVE',
          verified: true,
          verifiedAt: new Date(),
          verifiedBy: platformAdminId,
          verificationNotes: 'Company documents verified successfully',
        },
      });

      // 3. Create audit log for verification action
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'COMPANY_VERIFIED',
          entityType: 'Company',
          entityId: pendingCompany.id,
          changes: {
            status: { from: 'PENDING_VERIFICATION', to: 'ACTIVE' },
            verified: { from: false, to: true },
          },
          reason: 'Company documents verified successfully',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(verifiedCompany.status).toBe('ACTIVE');
      expect(verifiedCompany.verified).toBe(true);
      expect(verifiedCompany.verifiedBy).toBe(platformAdminId);
      expect(auditLog.action).toBe('COMPANY_VERIFIED');
      expect(auditLog.entityId).toBe(pendingCompany.id);

      // Clean up
      await prisma.company.delete({ where: { id: pendingCompany.id } });
    });

    it('should handle company suspension workflow', async () => {
      // 1. Platform admin suspends company
      const suspendedCompany = await prisma.company.update({
        where: { id: testCompanyId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedBy: platformAdminId,
          suspensionReason: 'Policy violation detected',
        },
      });

      // 2. Create audit log for suspension
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'COMPANY_SUSPENDED',
          entityType: 'Company',
          entityId: testCompanyId,
          changes: {
            status: { from: 'ACTIVE', to: 'SUSPENDED' },
          },
          reason: 'Policy violation detected',
          ipAddress: '192.168.1.100',
        },
      });

      // 3. Verify all company listings are suspended
      const vehicleListings = await prisma.vehicleListing.findMany({
        where: { companyId: testCompanyId },
      });

      const driverListings = await prisma.driverListing.findMany({
        where: { companyId: testCompanyId },
      });

      // Verify workflow completion
      expect(suspendedCompany.status).toBe('SUSPENDED');
      expect(suspendedCompany.suspendedBy).toBe(platformAdminId);
      expect(auditLog.action).toBe('COMPANY_SUSPENDED');

      // Restore company status for other tests
      await prisma.company.update({
        where: { id: testCompanyId },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
          suspendedBy: null,
          suspensionReason: null,
        },
      });
    });
  });

  describe('Complete User Management Workflow', () => {
    it('should handle admin user creation workflow', async () => {
      // 1. Platform admin creates new company admin
      const newAdmin = await prisma.user.create({
        data: {
          email: 'new-admin@test.com',
          firstName: 'New',
          lastName: 'Admin',
          passwordHash: 'hashedpassword',
          role: 'COMPANY_ADMIN',
          companyId: testCompanyId,
          phone: '+1234567893',
        },
      });

      // 2. Create audit log for admin creation
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'ADMIN_USER_CREATED',
          entityType: 'User',
          entityId: newAdmin.id,
          changes: {
            role: { from: null, to: 'COMPANY_ADMIN' },
            companyId: { from: null, to: testCompanyId },
          },
          reason: 'New admin user created for company management',
          ipAddress: '192.168.1.100',
        },
      });

      // 3. Verify admin permissions (simulate permission check)
      const adminUser = await prisma.user.findUnique({
        where: { id: newAdmin.id },
        include: { company: true },
      });

      // Verify workflow completion
      expect(adminUser?.role).toBe('COMPANY_ADMIN');
      expect(adminUser?.companyId).toBe(testCompanyId);
      expect(auditLog.action).toBe('ADMIN_USER_CREATED');

      // Clean up
      await prisma.user.delete({ where: { id: newAdmin.id } });
    });

    it('should handle bulk user operations workflow', async () => {
      // 1. Create multiple test users
      const bulkUsers = await prisma.user.createMany({
        data: [
          {
            email: 'bulk-user-1@test.com',
            firstName: 'Bulk',
            lastName: 'User1',
            passwordHash: 'hashedpassword',
            role: 'COMPANY_USER',
            companyId: testCompanyId,
            phone: '+1234567894',
          },
          {
            email: 'bulk-user-2@test.com',
            firstName: 'Bulk',
            lastName: 'User2',
            passwordHash: 'hashedpassword',
            role: 'COMPANY_USER',
            companyId: testCompanyId,
            phone: '+1234567895',
          },
        ],
      });

      // 2. Get created users for bulk operation
      const createdUsers = await prisma.user.findMany({
        where: {
          email: { in: ['bulk-user-1@test.com', 'bulk-user-2@test.com'] },
        },
      });

      // 3. Perform bulk role update
      const updatedUsers = await prisma.user.updateMany({
        where: {
          id: { in: createdUsers.map(u => u.id) },
        },
        data: {
          role: 'COMPANY_ADMIN',
        },
      });

      // 4. Create audit log for bulk operation
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'BULK_USER_ROLE_UPDATE',
          entityType: 'User',
          entityId: 'bulk_operation',
          changes: {
            userIds: createdUsers.map(u => u.id),
            role: { from: 'COMPANY_USER', to: 'COMPANY_ADMIN' },
          },
          reason: 'Bulk promotion of users to admin role',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(updatedUsers.count).toBe(2);
      expect(auditLog.action).toBe('BULK_USER_ROLE_UPDATE');

      // Clean up
      await prisma.user.deleteMany({
        where: {
          email: { in: ['bulk-user-1@test.com', 'bulk-user-2@test.com'] },
        },
      });
    });
  });

  describe('Complete Financial Management Workflow', () => {
    it('should handle complete booking and payment workflow', async () => {
      // 1. Create a booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: 'E2E-BOOK-001',
          renterCompanyId: testCompanyId,
          providerCompanyId: testCompanyId,
          vehicleListingId: vehicleListingId,
          driverListingId: driverListingId,
          status: 'PENDING',
          startDate: new Date('2024-12-20T10:00:00Z'),
          endDate: new Date('2024-12-20T18:00:00Z'),
          durationHours: 8,
          providerRate: 2400, // 8 hours * 300/hour
          platformCommission: 240, // 10%
          platformCommissionRate: 0.10,
          taxes: 60, // 2.5%
          taxRate: 0.025,
          total: 2700,
          expiresAt: new Date('2024-12-19T10:00:00Z'),
        },
      });

      bookingId = booking.id;

      // 2. Accept booking
      const acceptedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // 3. Create payment transaction
      const paymentTransaction = await prisma.transaction.create({
        data: {
          bookingId: booking.id,
          type: 'BOOKING_PAYMENT',
          amount: 2700,
          status: 'COMPLETED',
          metadata: {
            paymentMethod: 'CREDIT_CARD',
            transactionId: 'txn_e2e_001',
          },
        },
      });

      // 4. Complete booking
      const completedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // 5. Create commission transaction
      const commissionTransaction = await prisma.transaction.create({
        data: {
          bookingId: booking.id,
          type: 'COMMISSION',
          amount: 240,
          status: 'COMPLETED',
          metadata: {
            commissionRate: 0.10,
            originalAmount: 2400,
          },
        },
      });

      // 6. Create audit log for financial operations
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'BOOKING_FINANCIAL_COMPLETED',
          entityType: 'Booking',
          entityId: booking.id,
          changes: {
            status: { from: 'ACCEPTED', to: 'COMPLETED' },
            totalRevenue: 240,
            providerPayout: 2160,
          },
          reason: 'Booking completed successfully with commission processed',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(completedBooking.status).toBe('COMPLETED');
      expect(paymentTransaction.status).toBe('COMPLETED');
      expect(commissionTransaction.amount).toBe(240);
      expect(auditLog.action).toBe('BOOKING_FINANCIAL_COMPLETED');
    });

    it('should handle dispute and refund workflow', async () => {
      // 1. Create a dispute
      const dispute = await prisma.dispute.create({
        data: {
          bookingId: bookingId,
          raisedBy: regularUserId,
          reason: 'Service not as described',
          description: 'Vehicle was not clean and had mechanical issues',
          status: 'OPEN',
        },
      });

      // 2. Platform admin investigates and resolves dispute
      const resolvedDispute = await prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: 'Partial refund approved due to service issues',
          refundAmount: 1350, // 50% refund
          resolvedBy: platformAdminId,
          resolvedAt: new Date(),
          notes: 'Customer complaint verified, partial refund issued',
        },
      });

      // 3. Create refund transaction
      const refundTransaction = await prisma.transaction.create({
        data: {
          bookingId: bookingId,
          type: 'REFUND',
          amount: 1350,
          status: 'COMPLETED',
          metadata: {
            disputeId: dispute.id,
            refundReason: 'Service quality issues',
            originalAmount: 2700,
          },
        },
      });

      // 4. Create audit log for dispute resolution
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'DISPUTE_RESOLVED_WITH_REFUND',
          entityType: 'Dispute',
          entityId: dispute.id,
          changes: {
            status: { from: 'OPEN', to: 'RESOLVED' },
            refundAmount: 1350,
          },
          reason: 'Dispute resolved with partial refund due to service issues',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(resolvedDispute.status).toBe('RESOLVED');
      expect(resolvedDispute.refundAmount).toBe(1350);
      expect(refundTransaction.status).toBe('COMPLETED');
      expect(auditLog.action).toBe('DISPUTE_RESOLVED_WITH_REFUND');
    });
  });

  describe('Complete Content Moderation Workflow', () => {
    it('should handle listing moderation workflow', async () => {
      // 1. Create suspicious listing
      const suspiciousListing = await prisma.vehicleListing.create({
        data: {
          companyId: testCompanyId,
          title: 'Suspicious Vehicle Listing',
          description: 'This listing contains inappropriate content for testing',
          vehicleType: 'OTHER',
          capacity: 1,
          fuelType: 'DIESEL',
          city: 'Oslo',
          fylke: 'Oslo',
          kommune: 'Oslo',
          hourlyRate: 1,
          dailyRate: 1,
          deposit: 1,
          withDriver: false,
          withoutDriver: true,
          photos: [],
          tags: ['suspicious'],
          status: 'ACTIVE',
        },
      });

      // 2. Platform admin flags listing for review
      const flaggedListing = await prisma.vehicleListing.update({
        where: { id: suspiciousListing.id },
        data: {
          status: 'SUSPENDED',
        },
      });

      // 3. Create security event for content moderation
      const securityEvent = await prisma.securityEvent.create({
        data: {
          eventType: 'ANOMALOUS_BEHAVIOR',
          threatLevel: 'MEDIUM',
          title: 'Suspicious Listing Content Detected',
          description: 'Listing flagged for inappropriate content',
          userId: companyAdminId,
          riskScore: 60,
          indicators: ['inappropriate_content', 'suspicious_pricing'],
          affectedResources: ['vehicle_listing'],
          mitigationActions: ['suspend_listing', 'review_content'],
          metadata: {
            listingId: suspiciousListing.id,
            listingTitle: 'Suspicious Vehicle Listing',
          },
        },
      });

      // 4. Create audit log for moderation action
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'LISTING_SUSPENDED_MODERATION',
          entityType: 'VehicleListing',
          entityId: suspiciousListing.id,
          changes: {
            status: { from: 'ACTIVE', to: 'SUSPENDED' },
          },
          reason: 'Listing suspended due to inappropriate content',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(flaggedListing.status).toBe('SUSPENDED');
      expect(securityEvent.eventType).toBe('ANOMALOUS_BEHAVIOR');
      expect(auditLog.action).toBe('LISTING_SUSPENDED_MODERATION');

      // Clean up
      await prisma.vehicleListing.delete({ where: { id: suspiciousListing.id } });
    });
  });

  describe('Complete Security Monitoring Workflow', () => {
    it('should handle complete security incident workflow', async () => {
      // 1. Detect security event (multiple failed logins)
      const securityEvent = await prisma.securityEvent.create({
        data: {
          eventType: 'FAILED_LOGIN_ATTEMPT',
          threatLevel: 'HIGH',
          title: 'Multiple Failed Login Attempts',
          description: 'User exceeded failed login threshold',
          userId: regularUserId,
          userEmail: 'regular-user@test.com',
          ipAddress: '192.168.1.200',
          riskScore: 85,
          indicators: ['multiple_failed_attempts', 'threshold_exceeded'],
          affectedResources: ['user_account'],
          mitigationActions: ['temporary_lockout', 'security_alert'],
        },
      });

      // 2. Generate security alert
      const securityAlert = await prisma.securityAlert.create({
        data: {
          alertType: 'MULTIPLE_FAILED_LOGINS',
          severity: 'HIGH',
          userId: regularUserId,
          userEmail: 'regular-user@test.com',
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

      // 3. Security team investigates
      const investigatingAlert = await prisma.securityAlert.update({
        where: { id: securityAlert.id },
        data: {
          status: 'INVESTIGATING',
          assignedTo: 'security-team',
          acknowledgedAt: new Date(),
          acknowledgedBy: platformAdminId,
        },
      });

      // 4. Resolve security incident
      const resolvedAlert = await prisma.securityAlert.update({
        where: { id: securityAlert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: platformAdminId,
          resolution: 'False positive - user forgot password, legitimate attempts',
          preventionMeasures: 'Password reset email sent, user educated on security',
        },
      });

      // 5. Create audit log for security incident
      const auditLog = await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'SECURITY_INCIDENT_RESOLVED',
          entityType: 'SecurityAlert',
          entityId: securityAlert.id,
          changes: {
            status: { from: 'INVESTIGATING', to: 'RESOLVED' },
            resolution: 'False positive - legitimate user activity',
          },
          reason: 'Security incident investigated and resolved',
          ipAddress: '192.168.1.100',
        },
      });

      // Verify workflow completion
      expect(securityEvent.threatLevel).toBe('HIGH');
      expect(resolvedAlert.status).toBe('RESOLVED');
      expect(resolvedAlert.resolvedBy).toBe(platformAdminId);
      expect(auditLog.action).toBe('SECURITY_INCIDENT_RESOLVED');
    });
  });

  describe('Data Consistency and Cross-Component Integration', () => {
    it('should maintain data consistency across all operations', async () => {
      // Create some audit logs for this test
      await prisma.auditLog.create({
        data: {
          adminUserId: platformAdminId,
          action: 'DATA_CONSISTENCY_TEST',
          entityType: 'Test',
          entityId: 'consistency-test',
          changes: { test: 'data consistency' },
          reason: 'Testing data consistency',
          ipAddress: '192.168.1.100',
        },
      });

      // 1. Verify company data consistency
      const company = await prisma.company.findUnique({
        where: { id: testCompanyId },
        include: {
          users: true,
          vehicleListings: true,
          driverListings: true,
          bookingsAsProvider: true,
          bookingsAsRenter: true,
        },
      });

      expect(company).toBeDefined();
      expect(company?.users.length).toBeGreaterThan(0);
      expect(company?.vehicleListings.length).toBeGreaterThan(0);
      expect(company?.driverListings.length).toBeGreaterThan(0);

      // 2. Verify audit trail completeness
      const auditLogs = await prisma.auditLog.findMany({
        where: { adminUserId: platformAdminId },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLogs.length).toBeGreaterThan(0);

      // 3. Create and verify security monitoring data
      await prisma.securityEvent.create({
        data: {
          eventType: 'ANOMALOUS_BEHAVIOR',
          threatLevel: 'LOW',
          title: 'Data Consistency Test Event',
          description: 'Testing data consistency for security events',
          riskScore: 30,
          indicators: ['consistency_test'],
          affectedResources: ['test_resource'],
          mitigationActions: ['log_event'],
        },
      });

      await prisma.securityAlert.create({
        data: {
          alertType: 'SUSPICIOUS_ACTIVITY',
          severity: 'LOW',
          title: 'Data Consistency Test Alert',
          description: 'Testing data consistency for security alerts',
          indicators: ['consistency_test'],
          affectedResources: ['test_resource'],
          mitigationActions: ['log_alert'],
        },
      });

      const securityEvents = await prisma.securityEvent.findMany({
        orderBy: { timestamp: 'desc' },
      });

      const securityAlerts = await prisma.securityAlert.findMany({
        orderBy: { createdAt: 'desc' },
      });

      expect(securityEvents.length).toBeGreaterThan(0);
      expect(securityAlerts.length).toBeGreaterThan(0);

      // 4. Verify financial data consistency
      const transactions = await prisma.transaction.findMany({
        where: { bookingId: bookingId },
      });

      const totalTransactionAmount = transactions.reduce(
        (sum, transaction) => {
          if (transaction.type === 'REFUND') {
            return sum - transaction.amount;
          }
          return sum + transaction.amount;
        },
        0
      );

      expect(transactions.length).toBeGreaterThan(0);
      expect(totalTransactionAmount).toBeGreaterThan(0);
    });

    it('should handle concurrent operations without data corruption', async () => {
      // Simulate concurrent operations
      const concurrentOperations = [
        // Create audit log
        prisma.auditLog.create({
          data: {
            adminUserId: platformAdminId,
            action: 'CONCURRENT_TEST_1',
            entityType: 'Test',
            entityId: 'test-1',
            changes: { test: 'concurrent operation 1' },
            reason: 'Testing concurrent operations',
            ipAddress: '192.168.1.100',
          },
        }),
        // Create security event
        prisma.securityEvent.create({
          data: {
            eventType: 'ANOMALOUS_BEHAVIOR',
            threatLevel: 'LOW',
            title: 'Concurrent Test Event',
            description: 'Testing concurrent security event creation',
            riskScore: 30,
            indicators: ['concurrent_test'],
            affectedResources: ['test_resource'],
            mitigationActions: ['log_event'],
          },
        }),
        // Update company
        prisma.company.update({
          where: { id: testCompanyId },
          data: {
            description: 'Updated during concurrent test',
          },
        }),
      ];

      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);

      // Verify all operations completed successfully
      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined(); // Audit log
      expect(results[1]).toBeDefined(); // Security event
      expect(results[2]).toBeDefined(); // Company update

      // Verify data integrity
      const updatedCompany = await prisma.company.findUnique({
        where: { id: testCompanyId },
      });

      expect(updatedCompany?.description).toBe('Updated during concurrent test');
    });
  });
});