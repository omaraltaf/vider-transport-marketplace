#!/usr/bin/env ts-node

/**
 * Currency Fix and Re-seed Script
 * Fixes all currency inconsistencies and re-seeds the database with aligned data
 */

import { PrismaClient } from '@prisma/client';
import { PLATFORM_CURRENCY } from '../src/utils/currency';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting currency fix and re-seed process...');
  console.log(`📊 Target currency: ${PLATFORM_CURRENCY}`);

  try {
    // Step 1: Update all existing records to use consistent currency
    console.log('\n1️⃣ Updating existing currency fields...');
    
    // Update vehicle listings
    const vehicleUpdate = await prisma.vehicleListing.updateMany({
      where: {
        currency: {
          not: PLATFORM_CURRENCY
        }
      },
      data: {
        currency: PLATFORM_CURRENCY
      }
    });
    console.log(`   ✓ Updated ${vehicleUpdate.count} vehicle listings to ${PLATFORM_CURRENCY}`);

    // Update driver listings
    const driverUpdate = await prisma.driverListing.updateMany({
      where: {
        currency: {
          not: PLATFORM_CURRENCY
        }
      },
      data: {
        currency: PLATFORM_CURRENCY
      }
    });
    console.log(`   ✓ Updated ${driverUpdate.count} driver listings to ${PLATFORM_CURRENCY}`);

    // Update bookings
    const bookingUpdate = await prisma.booking.updateMany({
      where: {
        currency: {
          not: PLATFORM_CURRENCY
        }
      },
      data: {
        currency: PLATFORM_CURRENCY
      }
    });
    console.log(`   ✓ Updated ${bookingUpdate.count} bookings to ${PLATFORM_CURRENCY}`);

    // Update transactions
    const transactionUpdate = await prisma.transaction.updateMany({
      where: {
        currency: {
          not: PLATFORM_CURRENCY
        }
      },
      data: {
        currency: PLATFORM_CURRENCY
      }
    });
    console.log(`   ✓ Updated ${transactionUpdate.count} transactions to ${PLATFORM_CURRENCY}`);

    // Update platform config
    const configUpdate = await prisma.platformConfig.updateMany({
      where: {
        defaultCurrency: {
          not: PLATFORM_CURRENCY
        }
      },
      data: {
        defaultCurrency: PLATFORM_CURRENCY
      }
    });
    console.log(`   ✓ Updated ${configUpdate.count} platform configs to ${PLATFORM_CURRENCY}`);

    // Step 2: Verify currency consistency
    console.log('\n2️⃣ Verifying currency consistency...');
    
    const vehicleCurrencies = await prisma.vehicleListing.groupBy({
      by: ['currency'],
      _count: true
    });
    
    const driverCurrencies = await prisma.driverListing.groupBy({
      by: ['currency'],
      _count: true
    });
    
    const bookingCurrencies = await prisma.booking.groupBy({
      by: ['currency'],
      _count: true
    });
    
    const transactionCurrencies = await prisma.transaction.groupBy({
      by: ['currency'],
      _count: true
    });

    console.log('   📊 Currency distribution:');
    console.log(`   Vehicle listings: ${JSON.stringify(vehicleCurrencies)}`);
    console.log(`   Driver listings: ${JSON.stringify(driverCurrencies)}`);
    console.log(`   Bookings: ${JSON.stringify(bookingCurrencies)}`);
    console.log(`   Transactions: ${JSON.stringify(transactionCurrencies)}`);

    // Step 3: Update rates to realistic Norwegian values
    console.log('\n3️⃣ Updating rates to realistic Norwegian values...');
    
    // Update vehicle rates (Norwegian market rates)
    await prisma.vehicleListing.updateMany({
      where: { vehicleType: 'PALLET_8' },
      data: {
        hourlyRate: 650,
        dailyRate: 4200,
        withDriverHourlyRate: 350,
        withDriverDailyRate: 2400
      }
    });

    await prisma.vehicleListing.updateMany({
      where: { vehicleType: 'PALLET_18' },
      data: {
        hourlyRate: 850,
        dailyRate: 5800,
        withDriverHourlyRate: 400,
        withDriverDailyRate: 2800
      }
    });

    await prisma.vehicleListing.updateMany({
      where: { vehicleType: 'PALLET_21' },
      data: {
        hourlyRate: 950,
        dailyRate: 6800,
        withDriverHourlyRate: 450,
        withDriverDailyRate: 3200
      }
    });

    await prisma.vehicleListing.updateMany({
      where: { vehicleType: 'TRAILER' },
      data: {
        hourlyRate: 1200,
        dailyRate: 8500,
        withDriverHourlyRate: 500,
        withDriverDailyRate: 3600
      }
    });

    // Update driver rates
    await prisma.driverListing.updateMany({
      where: { licenseClass: 'C' },
      data: {
        hourlyRate: 380,
        dailyRate: 2800
      }
    });

    await prisma.driverListing.updateMany({
      where: { licenseClass: 'CE' },
      data: {
        hourlyRate: 420,
        dailyRate: 3200
      }
    });

    console.log('   ✓ Updated vehicle and driver rates to Norwegian market standards');

    // Step 4: Recalculate booking totals with correct currency
    console.log('\n4️⃣ Recalculating booking totals...');
    
    const bookings = await prisma.booking.findMany({
      include: {
        vehicleListing: true,
        driverListing: true
      }
    });

    for (const booking of bookings) {
      let newProviderRate = booking.providerRate;
      
      // Recalculate based on duration and current rates
      if (booking.vehicleListing) {
        if (booking.durationHours && booking.vehicleListing.hourlyRate) {
          newProviderRate = booking.durationHours * booking.vehicleListing.hourlyRate;
        } else if (booking.durationDays && booking.vehicleListing.dailyRate) {
          newProviderRate = booking.durationDays * booking.vehicleListing.dailyRate;
        }
        
        // Add driver cost if applicable
        if (booking.driverListing) {
          if (booking.durationHours && booking.vehicleListing.withDriverHourlyRate) {
            newProviderRate += booking.durationHours * booking.vehicleListing.withDriverHourlyRate;
          } else if (booking.durationDays && booking.vehicleListing.withDriverDailyRate) {
            newProviderRate += booking.durationDays * booking.vehicleListing.withDriverDailyRate;
          }
        }
      }

      const platformCommission = newProviderRate * (booking.platformCommissionRate / 100);
      const subtotal = newProviderRate + platformCommission;
      const taxes = subtotal * (booking.taxRate / 100);
      const total = subtotal + taxes;

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          providerRate: Math.round(newProviderRate * 100) / 100,
          platformCommission: Math.round(platformCommission * 100) / 100,
          taxes: Math.round(taxes * 100) / 100,
          total: Math.round(total * 100) / 100,
          currency: PLATFORM_CURRENCY
        }
      });
    }

    console.log(`   ✓ Recalculated ${bookings.length} booking totals`);

    // Step 5: Update transaction amounts to match bookings
    console.log('\n5️⃣ Updating transaction amounts...');
    
    const transactions = await prisma.transaction.findMany({
      include: { booking: true }
    });

    for (const transaction of transactions) {
      let newAmount = transaction.amount;
      
      if (transaction.type === 'BOOKING_PAYMENT') {
        newAmount = transaction.booking.total;
      } else if (transaction.type === 'COMMISSION') {
        newAmount = transaction.booking.platformCommission;
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          amount: Math.round(newAmount * 100) / 100,
          currency: PLATFORM_CURRENCY
        }
      });
    }

    console.log(`   ✓ Updated ${transactions.length} transaction amounts`);

    // Step 6: Final verification
    console.log('\n6️⃣ Final verification...');
    
    const stats = {
      vehicles: await prisma.vehicleListing.count(),
      drivers: await prisma.driverListing.count(),
      bookings: await prisma.booking.count(),
      transactions: await prisma.transaction.count(),
      companies: await prisma.company.count(),
      users: await prisma.user.count()
    };

    console.log('   📊 Database statistics:');
    console.log(`   Companies: ${stats.companies}`);
    console.log(`   Users: ${stats.users}`);
    console.log(`   Vehicle listings: ${stats.vehicles}`);
    console.log(`   Driver listings: ${stats.drivers}`);
    console.log(`   Bookings: ${stats.bookings}`);
    console.log(`   Transactions: ${stats.transactions}`);

    // Check for any remaining non-NOK currencies
    const remainingNonNOK = await prisma.$queryRaw`
      SELECT 'vehicles' as table_name, COUNT(*) as count FROM "VehicleListing" WHERE currency != 'NOK'
      UNION ALL
      SELECT 'drivers' as table_name, COUNT(*) as count FROM "DriverListing" WHERE currency != 'NOK'
      UNION ALL
      SELECT 'bookings' as table_name, COUNT(*) as count FROM "Booking" WHERE currency != 'NOK'
      UNION ALL
      SELECT 'transactions' as table_name, COUNT(*) as count FROM "Transaction" WHERE currency != 'NOK'
    `;

    console.log('   🔍 Non-NOK currency check:', remainingNonNOK);

    console.log('\n✅ Currency fix and re-seed completed successfully!');
    console.log(`💰 All monetary values are now in ${PLATFORM_CURRENCY}`);
    console.log('🎯 Database is ready for comprehensive testing');

  } catch (error) {
    console.error('❌ Error during currency fix and re-seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });