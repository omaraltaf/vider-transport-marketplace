import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('📊 Checking database contents...\n');

  const companies = await prisma.company.count();
  const users = await prisma.user.count();
  const vehicles = await prisma.vehicleListing.count();
  const drivers = await prisma.driverListing.count();
  const bookings = await prisma.booking.count();
  const ratings = await prisma.rating.count();
  const messages = await prisma.message.count();

  console.log('Database Statistics:');
  console.log(`  Companies: ${companies}`);
  console.log(`  Users: ${users}`);
  console.log(`  Vehicle Listings: ${vehicles}`);
  console.log(`  Driver Listings: ${drivers}`);
  console.log(`  Bookings: ${bookings}`);
  console.log(`  Ratings: ${ratings}`);
  console.log(`  Messages: ${messages}`);
  console.log('');

  if (companies > 0) {
    console.log('Sample Companies:');
    const sampleCompanies = await prisma.company.findMany({ take: 3 });
    sampleCompanies.forEach(c => {
      console.log(`  - ${c.name} (${c.city}, ${c.fylke})`);
    });
    console.log('');
  }

  if (users > 0) {
    console.log('Sample Users:');
    const sampleUsers = await prisma.user.findMany({ take: 3 });
    sampleUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.role})`);
    });
    console.log('');
  }

  if (vehicles > 0) {
    console.log('Sample Vehicle Listings:');
    const sampleVehicles = await prisma.vehicleListing.findMany({ take: 3 });
    sampleVehicles.forEach(v => {
      console.log(`  - ${v.title} (${v.vehicleType}, ${v.city})`);
    });
    console.log('');
  }

  console.log('✅ Data check complete!');
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
