import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Role } from '@prisma/client';
import * as fc from 'fast-check';
import { companyService } from './company.service';
import { authService } from './auth.service';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Check if database is available
let dbAvailable = false;

describe('CompanyService', () => {
  beforeAll(async () => {
    try {
      await prisma.$connect();
      dbAvailable = true;
      console.log('✅ Database connection successful for tests');
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      console.warn('Database not available, skipping database-dependent tests');
      dbAvailable = false;
    }
  });

  // Clean up test data after each test
  afterEach(async () => {
    if (dbAvailable) {
      try {
        await prisma.message.deleteMany({});
        await prisma.messageThread.deleteMany({});
        await prisma.booking.deleteMany({});
        await prisma.driverListing.deleteMany({});
        await prisma.vehicleListing.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.company.deleteMany({});
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  });

  // Disconnect after all tests
  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  describe('Basic functionality', () => {
    it('should update company profile', async () => {
      if (!dbAvailable) {
        console.log('Skipping: database not available');
        return;
      }
      // Create a test company
      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+4712345678',
        companyName: 'Test Company',
        organizationNumber: '123456789',
        businessAddress: '123 Test St',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      };

      const { userId } = await authService.register(registrationData);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const companyId = user!.companyId;

      // Update profile
      const updateData = {
        description: 'A test company description',
        city: 'Bergen',
      };

      const updatedCompany = await companyService.updateProfile(companyId, updateData);

      expect(updatedCompany.description).toBe('A test company description');
      expect(updatedCompany.city).toBe('Bergen');
      expect(updatedCompany.name).toBe('Test Company'); // Unchanged
    });

    it('should get public profile', async () => {
      if (!dbAvailable) {
        console.log('Skipping: database not available');
        return;
      }
      // Create a test company
      const registrationData = {
        email: 'test2@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+4712345678',
        companyName: 'Test Company 2',
        organizationNumber: '987654321',
        businessAddress: '456 Test Ave',
        city: 'Oslo',
        postalCode: '0002',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: false,
      };

      const { userId } = await authService.register(registrationData);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const companyId = user!.companyId;

      const profile = await companyService.getPublicProfile(companyId);

      expect(profile.name).toBe('Test Company 2');
      expect(profile.city).toBe('Oslo');
      expect(profile.verified).toBe(false);
    });

    it('should verify company', async () => {
      if (!dbAvailable) {
        console.log('Skipping: database not available');
        return;
      }
      // Create a test company
      const registrationData = {
        email: 'test3@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+4712345678',
        companyName: 'Test Company 3',
        organizationNumber: '111222333',
        businessAddress: '789 Test Blvd',
        city: 'Oslo',
        postalCode: '0003',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      };

      const { userId } = await authService.register(registrationData);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const companyId = user!.companyId;

      // Create an admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: 'hash',
          role: Role.PLATFORM_ADMIN,
          companyId,
          firstName: 'Admin',
          lastName: 'User',
          phone: '+4712345679',
          emailVerified: true,
        },
      });

      const verifiedCompany = await companyService.verifyCompany(companyId, adminUser.id);

      expect(verifiedCompany.verified).toBe(true);
      expect(verifiedCompany.verifiedAt).toBeTruthy();
      expect(verifiedCompany.verifiedBy).toBe(adminUser.id);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: vider-transport-marketplace, Property 5: Profile update persistence**
     * **Validates: Requirements 2.1**
     * 
     * For any company profile update with valid data, all updated fields must be 
     * saved and retrievable on subsequent profile views.
     */
    it('Property 5: Profile update persistence', { timeout: 30000 }, async () => {
      if (!dbAvailable) {
        console.log('Skipping: database not available');
        return;
      }
      await fc.assert(
        fc.asyncProperty(
          // Generate random company data
          fc.record({
            email: fc.emailAddress(),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            companyName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fylke: fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
            kommune: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
          // Generate random update data
          fc.record({
            description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
            city: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
            fylke: fc.option(fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'), { nil: undefined }),
            kommune: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
            vatRegistered: fc.option(fc.boolean(), { nil: undefined }),
          }).filter(update => Object.keys(update).some(key => update[key as keyof typeof update] !== undefined)),
          async (companyData, updateData) => {
            // Create a company with unique email and org number
            const uniqueOrgNumber = `${Math.floor(100000000 + Math.random() * 899999999)}`;
            const registrationData = {
              email: `${randomUUID()}@${companyData.email.split('@')[1] || 'test.com'}`,
              password: 'TestPassword123!',
              firstName: 'Test',
              lastName: 'User',
              phone: '+4712345678',
              companyName: companyData.companyName,
              organizationNumber: uniqueOrgNumber,
              businessAddress: '123 Test Street',
              city: companyData.city,
              postalCode: '0001',
              fylke: companyData.fylke,
              kommune: companyData.kommune,
              vatRegistered: true,
            };

            const { userId } = await authService.register(registrationData);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const companyId = user!.companyId;

            // Update the profile
            const updatedCompany = await companyService.updateProfile(companyId, updateData);

            // Retrieve the profile
            const retrievedProfile = await companyService.getPublicProfile(companyId);

            // Verify all updated fields are persisted
            if (updateData.description !== undefined) {
              expect(retrievedProfile.description).toBe(updateData.description);
              expect(updatedCompany.description).toBe(updateData.description);
            }
            if (updateData.city !== undefined) {
              expect(retrievedProfile.city).toBe(updateData.city);
              expect(updatedCompany.city).toBe(updateData.city);
            }
            if (updateData.fylke !== undefined) {
              expect(retrievedProfile.fylke).toBe(updateData.fylke);
              expect(updatedCompany.fylke).toBe(updateData.fylke);
            }
            if (updateData.kommune !== undefined) {
              expect(retrievedProfile.kommune).toBe(updateData.kommune);
              expect(updatedCompany.kommune).toBe(updateData.kommune);
            }
            if (updateData.vatRegistered !== undefined) {
              expect(retrievedProfile.vatRegistered).toBe(updateData.vatRegistered);
              expect(updatedCompany.vatRegistered).toBe(updateData.vatRegistered);
            }

            // Clean up
            await prisma.user.deleteMany({ where: { companyId } });
            await prisma.company.delete({ where: { id: companyId } });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: vider-transport-marketplace, Property 6: Verification badge display**
     * **Validates: Requirements 2.2**
     * 
     * For any company that has been manually verified by a Platform Admin, 
     * the company's public profile must display a Verification Badge.
     */
    it('Property 6: Verification badge display', { timeout: 30000 }, async () => {
      if (!dbAvailable) {
        console.log('Skipping: database not available');
        return;
      }
      await fc.assert(
        fc.asyncProperty(
          // Generate random company data
          fc.record({
            email: fc.emailAddress(),
            organizationNumber: fc.integer({ min: 100000000, max: 999999999 }).map(n => n.toString()),
            companyName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            city: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fylke: fc.constantFrom('Oslo', 'Rogaland', 'Vestland', 'Trøndelag', 'Nordland'),
            kommune: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          }),
          async (companyData) => {
            // Create a company with unique email and org number
            const uniqueOrgNumber = `${Math.floor(100000000 + Math.random() * 899999999)}`;
            const registrationData = {
              email: `${randomUUID()}@${companyData.email.split('@')[1] || 'test.com'}`,
              password: 'TestPassword123!',
              firstName: 'Test',
              lastName: 'User',
              phone: '+4712345678',
              companyName: companyData.companyName,
              organizationNumber: uniqueOrgNumber,
              businessAddress: '123 Test Street',
              city: companyData.city,
              postalCode: '0001',
              fylke: companyData.fylke,
              kommune: companyData.kommune,
              vatRegistered: true,
            };

            const { userId } = await authService.register(registrationData);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const companyId = user!.companyId;

            // Before verification, verified should be false
            const profileBeforeVerification = await companyService.getPublicProfile(companyId);
            expect(profileBeforeVerification.verified).toBe(false);
            expect(profileBeforeVerification.verifiedAt).toBeNull();

            // Create an admin user with unique email
            const adminUser = await prisma.user.create({
              data: {
                email: `admin-${randomUUID()}@test.com`,
                passwordHash: 'hash',
                role: Role.PLATFORM_ADMIN,
                companyId,
                firstName: 'Admin',
                lastName: 'User',
                phone: '+4712345679',
                emailVerified: true,
              },
            });

            // Verify the company
            await companyService.verifyCompany(companyId, adminUser.id);

            // After verification, verified should be true and badge should be displayed
            const profileAfterVerification = await companyService.getPublicProfile(companyId);
            expect(profileAfterVerification.verified).toBe(true);
            expect(profileAfterVerification.verifiedAt).toBeTruthy();
            // Note: verifiedBy is not exposed in public profile for privacy

            // Clean up
            await prisma.user.deleteMany({ where: { companyId } });
            await prisma.company.delete({ where: { id: companyId } });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
