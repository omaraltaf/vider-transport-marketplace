#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserCountFix() {
  try {
    console.log('🔍 Testing User Count Fix...\n');

    // Get actual user counts from database
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { emailVerified: true } });
    const unverifiedUsers = await prisma.user.count({ where: { emailVerified: false } });
    
    // Get role distribution
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    console.log('📊 ACTUAL DATABASE COUNTS:');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Verified Users: ${verifiedUsers}`);
    console.log(`Unverified Users: ${unverifiedUsers}`);
    
    console.log('\n👥 USERS BY ROLE:');
    roleStats.forEach((stat: any) => {
      console.log(`${stat.role}: ${stat._count.role}`);
    });

    // Test the platform admin user service
    console.log('\n🧪 TESTING PLATFORM ADMIN USER SERVICE:');
    
    // Import the service
    const { platformAdminUserService } = await import('../src/services/platform-admin-user.service');
    
    const userStats = await platformAdminUserService.getUserStatistics();
    
    console.log('📈 SERVICE RESPONSE:');
    console.log(`Total Users: ${userStats.totalUsers}`);
    console.log(`Active Users: ${userStats.activeUsers}`);
    console.log(`Verified Users: ${userStats.verifiedUsers}`);
    console.log(`Pending Verification: ${userStats.pendingVerification}`);
    
    console.log('\n🎯 VERIFICATION:');
    if (userStats.totalUsers === totalUsers) {
      console.log('✅ Total users count matches database!');
    } else {
      console.log(`❌ Total users mismatch: Service=${userStats.totalUsers}, DB=${totalUsers}`);
    }
    
    if (userStats.verifiedUsers === verifiedUsers) {
      console.log('✅ Verified users count matches database!');
    } else {
      console.log(`❌ Verified users mismatch: Service=${userStats.verifiedUsers}, DB=${verifiedUsers}`);
    }

    console.log('\n🎉 EXPECTED RESULT:');
    console.log(`Platform Overview should now show "${totalUsers}" total users instead of "15.4K"`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error testing user count fix:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testUserCountFix();