import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding driver rate columns...');

  try {
    // Add columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VehicleListing" 
      ADD COLUMN IF NOT EXISTS "withDriverHourlyRate" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "withDriverDailyRate" DOUBLE PRECISION;
    `);
    
    console.log('✅ Columns added successfully');

    // Migrate existing data
    await prisma.$executeRawUnsafe(`
      UPDATE "VehicleListing" 
      SET "withDriverDailyRate" = "withDriverCost",
          "withDriverHourlyRate" = "withDriverCost" / 8
      WHERE "withDriverCost" IS NOT NULL 
        AND "withDriverDailyRate" IS NULL;
    `);

    console.log('✅ Existing data migrated');

    // Update seed data
    const updates = [
      { title: 'Mercedes-Benz Actros 18-pallet truck', hourly: 350, daily: 2500 },
      { title: 'Refrigerated 21-pallet truck', hourly: 400, daily: 2800 },
      { title: 'Electric 8-pallet van', hourly: 300, daily: 2200 },
      { title: 'Heavy-duty trailer', hourly: 450, daily: 3200 },
    ];

    for (const update of updates) {
      await prisma.$executeRawUnsafe(`
        UPDATE "VehicleListing" 
        SET "withDriverHourlyRate" = ${update.hourly},
            "withDriverDailyRate" = ${update.daily}
        WHERE "title" = '${update.title}';
      `);
    }

    console.log('✅ Seed data updated');

    // Verify
    const vehicles = await prisma.$queryRawUnsafe(`
      SELECT title, "withDriverHourlyRate", "withDriverDailyRate"
      FROM "VehicleListing"
      WHERE "withDriver" = true
      LIMIT 5;
    `);

    console.log('\n📊 Updated vehicles:');
    console.log(vehicles);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
