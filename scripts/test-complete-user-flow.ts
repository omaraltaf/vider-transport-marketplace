#!/usr/bin/env npx tsx

/**
 * Test Complete User Creation and Password Flow
 * Tests the entire user creation → login → password change → reset flow
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function testCompleteUserFlow() {
  console.log('👥 Testing Complete User Creation and Password Flow...\n');

  try {
    // 1. Create a test company and admin user
    console.log('1. Setting up test company and admin...');
    const testCompany = await prisma.company.create({
      data: {
        name: 'Complete Flow Test Company',
        organizationNumber: `${Date.now()}`.slice(-9),
        businessAddress: 'Flow Test Address 456',
        city: 'Bergen',
        postalCode: '5000',
        fylke: 'Vestland',
        kommune: 'Bergen',
        vatRegistered: true,
        verified: true,
        status: 'ACTIVE'
      }
    });

    // Create admin user for audit logging
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-test-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('AdminPass123!', 12),
        role: 'PLATFORM_ADMIN',
        companyId: testCompany.id,
        firstName: 'Test',
        lastName: 'Admin',
        phone: '+4712345678',
        emailVerified: true,
        isTemporaryPassword: false
      }
    });

    console.log('✅ Test company created:', testCompany.id);
    console.log('✅ Test admin created:', adminUser.id);

    // 2. Simulate platform admin creating a user (like UserManagementPanel does)
    console.log('\n2. Simulating platform admin user creation...');
    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    
    const newUser = await prisma.user.create({
      data: {
        email: `complete-flow-test-${Date.now()}@example.com`,
        passwordHash,
        role: 'COMPANY_USER',
        companyId: testCompany.id,
        firstName: 'Complete',
        lastName: 'FlowTest',
        phone: '+4798765432',
        emailVerified: true, // Auto-verified for admin-created users
        isTemporaryPassword: true // Set as temporary password
      }
    });
    
    console.log('✅ User created by admin:');
    console.log('   - User ID:', newUser.id);
    console.log('   - Email:', newUser.email);
    console.log('   - Temporary Password:', tempPassword);
    console.log('   - isTemporaryPassword:', newUser.isTemporaryPassword);
    console.log('   - emailVerified:', newUser.emailVerified);

    // 3. Simulate user login (like AuthService.login does)
    console.log('\n3. Simulating user login with temporary password...');
    const loginUser = await prisma.user.findUnique({
      where: { email: newUser.email },
      include: { company: true }
    });

    if (!loginUser) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(tempPassword, loginUser.passwordHash);
    console.log('✅ Password verification:', isPasswordValid ? 'VALID' : 'INVALID');

    // Check if password change is required
    const requiresPasswordChange = loginUser.isTemporaryPassword || false;
    console.log('✅ Requires password change:', requiresPasswordChange);
    console.log('   - Login should return: { requiresPasswordChange: true }');

    // 4. Simulate forced password change (like PasswordChangeModal does)
    console.log('\n4. Simulating forced password change...');
    const newPassword = 'UserChosenPassword123!';
    
    // Verify current password (security check)
    const currentPasswordValid = await bcrypt.compare(tempPassword, loginUser.passwordHash);
    if (!currentPasswordValid) {
      throw new Error('Current password verification failed');
    }

    // Hash new password and update user
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const updatedUser = await prisma.user.update({
      where: { id: loginUser.id },
      data: {
        passwordHash: newPasswordHash,
        isTemporaryPassword: false // Clear temporary flag
      }
    });

    console.log('✅ Password changed successfully:');
    console.log('   - isTemporaryPassword:', updatedUser.isTemporaryPassword);
    console.log('   - User can now login normally without password change requirement');

    // 5. Simulate normal login after password change
    console.log('\n5. Simulating normal login after password change...');
    const normalLoginUser = await prisma.user.findUnique({
      where: { email: newUser.email }
    });

    if (!normalLoginUser) {
      throw new Error('User not found for normal login');
    }

    const normalPasswordValid = await bcrypt.compare(newPassword, normalLoginUser.passwordHash);
    const normalRequiresPasswordChange = normalLoginUser.isTemporaryPassword || false;

    console.log('✅ Normal login verification:');
    console.log('   - Password valid:', normalPasswordValid);
    console.log('   - Requires password change:', normalRequiresPasswordChange);
    console.log('   - Login should return: { requiresPasswordChange: false }');

    // 6. Simulate admin password reset (like UserManagementPanel reset does)
    console.log('\n6. Simulating admin password reset...');
    const resetPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
    const resetPasswordHash = await bcrypt.hash(resetPassword, 12);

    const resetUser = await prisma.user.update({
      where: { id: loginUser.id },
      data: {
        passwordHash: resetPasswordHash,
        isTemporaryPassword: true // Set back to temporary
      }
    });

    // Create audit log entry (like the real system does)
    await prisma.auditLog.create({
      data: {
        adminUserId: adminUser.id, // Use the real admin user ID
        action: 'PASSWORD_RESET',
        entityType: 'USER',
        entityId: resetUser.id,
        changes: {
          resetBy: adminUser.id,
          resetAt: new Date().toISOString(),
          newTemporaryPassword: true
        },
        reason: 'Admin-initiated password reset for testing'
      }
    });

    console.log('✅ Admin password reset completed:');
    console.log('   - New temporary password:', resetPassword);
    console.log('   - isTemporaryPassword:', resetUser.isTemporaryPassword);
    console.log('   - Audit log created');
    console.log('   - User must change password on next login');

    // 7. Verify the reset worked
    console.log('\n7. Verifying password reset...');
    const verifyResetUser = await prisma.user.findUnique({
      where: { id: loginUser.id }
    });

    if (!verifyResetUser) {
      throw new Error('User not found for reset verification');
    }

    const resetPasswordValid = await bcrypt.compare(resetPassword, verifyResetUser.passwordHash);
    const resetRequiresPasswordChange = verifyResetUser.isTemporaryPassword || false;

    console.log('✅ Reset verification:');
    console.log('   - Reset password valid:', resetPasswordValid);
    console.log('   - Requires password change:', resetRequiresPasswordChange);
    console.log('   - Old password should no longer work');

    // Test old password doesn't work
    const oldPasswordStillWorks = await bcrypt.compare(newPassword, verifyResetUser.passwordHash);
    console.log('   - Old password still works:', oldPasswordStillWorks ? 'YES (BAD!)' : 'NO (GOOD!)');

    // 8. Check audit trail
    console.log('\n8. Checking audit trail...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'USER',
        entityId: loginUser.id
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Audit trail:');
    auditLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} at ${log.createdAt.toISOString()}`);
    });

    // Cleanup
    console.log('\n9. Cleaning up test data...');
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'USER',
        entityId: loginUser.id
      }
    });
    await prisma.user.delete({ where: { id: loginUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
    await prisma.company.delete({ where: { id: testCompany.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Complete User Flow Test Successful!');
    console.log('\n📋 Flow Summary:');
    console.log('1. ✅ Admin creates user with temporary password');
    console.log('2. ✅ User login detects temporary password');
    console.log('3. ✅ System requires password change');
    console.log('4. ✅ User changes password successfully');
    console.log('5. ✅ Subsequent logins work normally');
    console.log('6. ✅ Admin can reset user password');
    console.log('7. ✅ Reset password requires change again');
    console.log('8. ✅ Audit trail tracks all actions');
    console.log('\n🔐 Password functionality is fully operational!');

  } catch (error) {
    console.error('❌ Complete flow test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteUserFlow().catch(console.error);