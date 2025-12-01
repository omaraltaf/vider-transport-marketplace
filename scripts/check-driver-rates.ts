import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicleListing.findMany({
    select: {
      id: true,
      title: true,
      withDriverHourlyRate: true,
      withDriverDailyRate: true,
      withDriver: true,
    },
    take: 5,
  });

  console.log('Vehicle Listings with Driver Rates:');
  console.log(JSON.stringify(vehicles, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
