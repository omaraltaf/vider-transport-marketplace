#!/usr/bin/env tsx

/**
 * Quick verification script to check current platform data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPlatformData() {
  try {
    console.log('🔍 Verifying current platform data...\n');

    // Get company statistics
    const [
      totalCompanies,
      activeCompanies,
      pendingVerification,
      suspendedCompanies,
      verifiedCompanies,
      totalRevenueData
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.company.count({ where: { status: 'SUSPENDED' } }),
      prisma.company.count({ where: { verified: true } }),
      prisma.company.aggregate({
        _sum: { totalRevenue: true }
      })
    ]);

    // Get user statistics
    const [
      totalUsers,
      platformAdmins,
      companyAdmins,
      companyUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'PLATFORM_ADMIN' } }),
      prisma.user.count({ where: { role: 'COMPANY_ADMIN' } }),
      prisma.user.count({ where: { role: 'COMPANY_USER' } })
    ]);

    // Get transaction statistics
    const [
      totalTransactions,
      completedTransactions,
      totalTransactionRevenue,
      monthlyTransactions,
      monthlyRevenue
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      }),
      prisma.transaction.count({ 
        where: { 
          status: 'COMPLETED',
          createdAt: { 
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          }
        } 
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { 
          status: 'COMPLETED',
          createdAt: { 
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          }
        }
      })
    ]);

    // Get booking statistics
    const [
      totalBookings,
      activeBookings,
      completedBookings,
      vehicleListings,
      driverListings
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'ACTIVE' } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.vehicleListing.count(),
      prisma.driverListing.count()
    ]);

    console.log('📊 PLATFORM DATA SUMMARY');
    console.log('========================');
    console.log(`🏢 Companies: ${totalCompanies} total`);
    console.log(`   - Active: ${activeCompanies}`);
    console.log(`   - Pending Verification: ${pendingVerification}`);
    console.log(`   - Suspended: ${suspendedCompanies}`);
    console.log(`   - Verified: ${verifiedCompanies}`);
    console.log(`   - Total Revenue: ${(totalRevenueData._sum.totalRevenue || 0).toLocaleString('no-NO')} kr`);
    
    console.log(`\n👥 Users: ${totalUsers} total`);
    console.log(`   - Platform Admins: ${platformAdmins}`);
    console.log(`   - Company Admins: ${companyAdmins}`);
    console.log(`   - Company Users: ${companyUsers}`);
    
    console.log(`\n💳 Transactions: ${totalTransactions} total`);
    console.log(`   - Completed: ${completedTransactions}`);
    console.log(`   - Total Revenue: ${(totalTransactionRevenue._sum.amount || 0).toLocaleString('no-NO')} kr`);
    console.log(`   - Monthly Transactions: ${monthlyTransactions}`);
    console.log(`   - Monthly Revenue: ${(monthlyRevenue._sum.amount || 0).toLocaleString('no-NO')} kr`);
    console.log(`   - Platform Commission (5%): ${((totalTransactionRevenue._sum.amount || 0) * 0.05).toLocaleString('no-NO')} kr`);
    
    console.log(`\n📅 Bookings: ${totalBookings} total`);
    console.log(`   - Active: ${activeBookings}`);
    console.log(`   - Completed: ${completedBookings}`);
    
    console.log(`\n🚐 Listings: ${vehicleListings + driverListings} total`);
    console.log(`   - Vehicles: ${vehicleListings}`);
    console.log(`   - Drivers: ${driverListings}`);
    
    console.log('\n✅ Platform data verification complete!');
    
  } catch (error) {
    console.error('❌ Error verifying platform data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  verifyPlatformData();
}

export { verifyPlatformData };