#!/usr/bin/env tsx

/**
 * Comprehensive Data Seeding Script for Vider Platform
 * 
 * This script creates realistic, interconnected test data for the entire platform
 * with proper Norwegian market data and NOK currency consistency.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Norwegian market data
const NORWEGIAN_COMPANIES = [
  {
    name: 'Oslo Transport AS',
    city: 'Oslo',
    fylke: 'Oslo',
    kommune: 'Oslo',
    postalCode: '0150'
  },
  {
    name: 'Bergen Logistics AS',
    city: 'Bergen',
    fylke: 'Vestland',
    kommune: 'Bergen',
    postalCode: '5003'
  },
  {
    name: 'Trondheim Fleet AS',
    city: 'Trondheim',
    fylke: 'Trøndelag',
    kommune: 'Trondheim',
    postalCode: '7030'
  },
  {
    name: 'Stavanger Mobility AS',
    city: 'Stavanger',
    fylke: 'Rogaland',
    kommune: 'Stavanger',
    postalCode: '4001'
  },
  {
    name: 'Tromsø Arctic Transport AS',
    city: 'Tromsø',
    fylke: 'Troms og Finnmark',
    kommune: 'Tromsø',
    postalCode: '9008'
  }
];

// Generate unique Norwegian organization numbers
function generateOrgNumber(): string {
  // Norwegian organization numbers are 9 digits
  // First digit is usually 8 or 9 for companies
  const firstDigit = Math.random() > 0.5 ? '8' : '9';
  const remainingDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return firstDigit + remainingDigits;
}

// Generate unique booking numbers
function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `VID-${year}-${randomNum}`;
}

const NORWEGIAN_FIRST_NAMES = [
  'Lars', 'Erik', 'Per', 'Ole', 'Jan', 'Bjørn', 'Kari', 'Anne', 'Inger', 'Liv',
  'Nina', 'Eva', 'Berit', 'Astrid', 'Randi', 'Magnus', 'Andreas', 'Kristian',
  'Thomas', 'Henrik', 'Emma', 'Nora', 'Sara', 'Thea', 'Ingrid'
];

const NORWEGIAN_LAST_NAMES = [
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen',
  'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen',
  'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Dahl'
];

const VEHICLE_TYPES = [
  { 
    type: 'PALLET_8', 
    hourlyRate: 450, 
    dailyRate: 2800, 
    description: '8-pallet lastebil for transport',
    capacity: 8,
    fuelType: 'DIESEL'
  },
  { 
    type: 'PALLET_18', 
    hourlyRate: 650, 
    dailyRate: 4200, 
    description: '18-pallet lastebil for store leveranser',
    capacity: 18,
    fuelType: 'DIESEL'
  },
  { 
    type: 'PALLET_21', 
    hourlyRate: 750, 
    dailyRate: 4800, 
    description: '21-pallet lastebil for maksimal kapasitet',
    capacity: 21,
    fuelType: 'DIESEL'
  },
  { 
    type: 'TRAILER', 
    hourlyRate: 580, 
    dailyRate: 3600, 
    description: 'Tilhenger for fleksibel transport',
    capacity: 12,
    fuelType: 'DIESEL'
  },
  { 
    type: 'OTHER', 
    hourlyRate: 320, 
    dailyRate: 2000, 
    description: 'Spesialkjøretøy for særskilte behov',
    capacity: 5,
    fuelType: 'ELECTRIC'
  }
];

const DRIVER_LICENSES = [
  { class: 'B', hourlyRate: 320, description: 'Personbil og lett lastebil' },
  { class: 'C', hourlyRate: 480, description: 'Tung lastebil' },
  { class: 'C1', hourlyRate: 420, description: 'Mellomtung lastebil' },
  { class: 'D', hourlyRate: 520, description: 'Buss' },
  { class: 'BE', hourlyRate: 380, description: 'Personbil med tilhenger' }
];

interface SeedingStats {
  companies: number;
  users: number;
  vehicles: number;
  drivers: number;
  bookings: number;
  transactions: number;
}

async function clearExistingData() {
  console.log('🧹 Clearing existing test data...');
  
  // Get platform admin to preserve their company
  const platformAdmin = await prisma.user.findUnique({
    where: { email: 'admin@vider.no' }
  });
  
  // Delete in correct order to respect foreign key constraints
  await prisma.transaction.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.recurringBlock.deleteMany();
  await prisma.driverListing.deleteMany();
  await prisma.vehicleListing.deleteMany();
  
  // Delete all users except platform admin
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@vider.no'
      }
    }
  });
  
  // Delete all companies except platform admin's company (if it exists)
  if (platformAdmin?.companyId) {
    await prisma.company.deleteMany({
      where: {
        id: {
          not: platformAdmin.companyId
        }
      }
    });
  } else {
    await prisma.company.deleteMany();
  }
  
  console.log('✅ Existing test data cleared');
}

async function seedCompanies(): Promise<any[]> {
  console.log('🏢 Seeding companies...');
  
  const companies = [];
  
  for (const companyData of NORWEGIAN_COMPANIES) {
    const company = await prisma.company.create({
      data: {
        name: companyData.name,
        organizationNumber: generateOrgNumber(),
        businessAddress: `Storgata ${Math.floor(Math.random() * 100) + 1}`,
        city: companyData.city,
        postalCode: companyData.postalCode,
        fylke: companyData.fylke,
        kommune: companyData.kommune,
        vatRegistered: true,
        description: `Professional transport services in ${companyData.city}`,
        verified: Math.random() > 0.3, // 70% verified
        status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING_VERIFICATION', // 90% active
        totalRevenue: Math.floor(Math.random() * 2000000) + 500000, // 500K - 2.5M NOK
        aggregatedRating: Math.random() * 1.5 + 3.5, // 3.5 - 5.0 rating
        totalRatings: Math.floor(Math.random() * 200) + 50,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        updatedAt: new Date()
      }
    });
    
    companies.push(company);
  }
  
  console.log(`✅ Created ${companies.length} companies`);
  return companies;
}

async function seedUsers(companies: any[]): Promise<any[]> {
  console.log('👥 Seeding users...');
  
  const users = [];
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (const company of companies) {
    // Create company admin
    const adminEmail = `admin@${company.name.toLowerCase().replace(/\s+/g, '').replace('as', '')}.no`;
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: NORWEGIAN_FIRST_NAMES[Math.floor(Math.random() * NORWEGIAN_FIRST_NAMES.length)],
        lastName: NORWEGIAN_LAST_NAMES[Math.floor(Math.random() * NORWEGIAN_LAST_NAMES.length)],
        phone: `+47 ${Math.floor(Math.random() * 90000000) + 10000000}`,
        role: 'COMPANY_ADMIN',
        companyId: company.id,
        emailVerified: true,
        createdAt: new Date(company.createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    });
    users.push(admin);
    
    // Create 2-4 regular users per company
    const userCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < userCount; i++) {
      const userEmail = `user${i + 1}@${company.name.toLowerCase().replace(/\s+/g, '').replace('as', '')}.no`;
      const user = await prisma.user.create({
        data: {
          email: userEmail,
          passwordHash: hashedPassword,
          firstName: NORWEGIAN_FIRST_NAMES[Math.floor(Math.random() * NORWEGIAN_FIRST_NAMES.length)],
          lastName: NORWEGIAN_LAST_NAMES[Math.floor(Math.random() * NORWEGIAN_LAST_NAMES.length)],
          phone: `+47 ${Math.floor(Math.random() * 90000000) + 10000000}`,
          role: 'COMPANY_USER',
          companyId: company.id,
          emailVerified: Math.random() > 0.2, // 80% verified
          createdAt: new Date(admin.createdAt.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000)
        }
      });
      users.push(user);
    }
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedVehicles(companies: any[]): Promise<any[]> {
  console.log('🚐 Seeding vehicles...');
  
  const vehicles = [];
  
  for (const company of companies) {
    // Create 2-5 vehicles per company
    const vehicleCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < vehicleCount; i++) {
      const vehicleType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
      const variation = 0.8 + Math.random() * 0.4; // ±20% price variation
      
      const vehicle = await prisma.vehicleListing.create({
        data: {
          title: `${vehicleType.description} - ${company.city}`,
          description: `Profesjonell ${vehicleType.description.toLowerCase()} tilgjengelig for utleie i ${company.city} området.`,
          vehicleType: vehicleType.type as any,
          capacity: vehicleType.capacity,
          fuelType: vehicleType.fuelType as any,
          city: company.city,
          fylke: company.fylke,
          kommune: company.kommune,
          hourlyRate: Math.round(vehicleType.hourlyRate * variation),
          dailyRate: Math.round(vehicleType.dailyRate * variation),
          deposit: Math.round(vehicleType.dailyRate * variation * 0.5), // 50% of daily rate as deposit
          currency: 'NOK',
          withDriver: Math.random() > 0.5, // 50% with driver option
          withDriverCost: Math.random() > 0.5 ? Math.round(200 * variation) : null,
          withoutDriver: true, // Always available without driver
          photos: [],
          tags: ['transport', 'utleie', company.city.toLowerCase()],
          companyId: company.id,
          status: Math.random() > 0.1 ? 'ACTIVE' : 'SUSPENDED', // 90% active
          createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random date within last 6 months
          updatedAt: new Date()
        }
      });
      
      vehicles.push(vehicle);
    }
  }
  
  console.log(`✅ Created ${vehicles.length} vehicles`);
  return vehicles;
}

async function seedDrivers(companies: any[]): Promise<any[]> {
  console.log('🚗 Seeding drivers...');
  
  const drivers = [];
  
  for (const company of companies) {
    // Create 1-3 drivers per company
    const driverCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < driverCount; i++) {
      const license = DRIVER_LICENSES[Math.floor(Math.random() * DRIVER_LICENSES.length)];
      const firstName = NORWEGIAN_FIRST_NAMES[Math.floor(Math.random() * NORWEGIAN_FIRST_NAMES.length)];
      const lastName = NORWEGIAN_LAST_NAMES[Math.floor(Math.random() * NORWEGIAN_LAST_NAMES.length)];
      const variation = 0.8 + Math.random() * 0.4; // ±20% price variation
      
      const driver = await prisma.driverListing.create({
        data: {
          name: `${firstName} ${lastName}`,
          licenseClass: license.class,
          languages: ['Norsk', 'Engelsk'],
          backgroundSummary: `Erfaren sjåfør med ${license.class} sertifikat. ${license.description}. ${Math.floor(Math.random() * 15) + 2} års erfaring.`,
          hourlyRate: Math.round(license.hourlyRate * variation),
          dailyRate: Math.round(license.hourlyRate * variation * 6.5), // ~6.5 hours per day
          currency: 'NOK',
          companyId: company.id,
          status: Math.random() > 0.1 ? 'ACTIVE' : 'SUSPENDED', // 90% active
          verified: Math.random() > 0.3, // 70% verified
          aggregatedRating: Math.random() > 0.5 ? Math.random() * 1.5 + 3.5 : null, // 3.5-5.0 rating or null
          totalRatings: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 5 : 0,
          createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      });
      
      drivers.push(driver);
    }
  }
  
  console.log(`✅ Created ${drivers.length} drivers`);
  return drivers;
}

async function seedBookings(vehicles: any[], drivers: any[], companies: any[]): Promise<any[]> {
  console.log('📅 Seeding bookings...');
  
  const bookings = [];
  const allAssets = [...vehicles, ...drivers];
  
  // Create 20-30 bookings
  const bookingCount = Math.floor(Math.random() * 11) + 20;
  
  for (let i = 0; i < bookingCount; i++) {
    const asset = allAssets[Math.floor(Math.random() * allAssets.length)];
    const isVehicle = 'vehicleType' in asset;
    
    // Random renter company (different from provider)
    const providerCompany = companies.find(c => c.id === asset.companyId);
    const renterCompany = companies.filter(c => c.id !== asset.companyId)[Math.floor(Math.random() * (companies.length - 1))];
    
    const startDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 3 months
    const duration = Math.floor(Math.random() * 48) + 4; // 4-52 hours
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    
    const hourlyRate = asset.hourlyRate || 300; // Default rate if not set
    const providerRate = hourlyRate * duration;
    const platformCommissionRate = 5; // 5% platform commission
    const platformCommission = providerRate * (platformCommissionRate / 100);
    const taxRate = 25; // 25% Norwegian VAT
    const taxes = (providerRate + platformCommission) * (taxRate / 100);
    const total = providerRate + platformCommission + taxes;
    
    const statuses = ['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const expiresAt = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // Expires 24h before start
    
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        renterCompanyId: renterCompany.id,
        providerCompanyId: providerCompany.id,
        ...(isVehicle ? { vehicleListingId: asset.id } : { driverListingId: asset.id }),
        status: status as any,
        startDate,
        endDate,
        durationHours: duration,
        durationDays: Math.ceil(duration / 24),
        providerRate,
        platformCommission,
        platformCommissionRate,
        taxes,
        taxRate,
        total,
        currency: 'NOK',
        expiresAt,
        createdAt: new Date(startDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Booked up to 1 week before
        updatedAt: new Date()
      }
    });
    
    bookings.push(booking);
  }
  
  console.log(`✅ Created ${bookings.length} bookings`);
  return bookings;
}

async function seedTransactions(bookings: any[]): Promise<any[]> {
  console.log('💳 Seeding transactions...');
  
  const transactions = [];
  
  for (const booking of bookings) {
    if (booking.status === 'COMPLETED' || booking.status === 'ACTIVE') {
      const transaction = await prisma.transaction.create({
        data: {
          bookingId: booking.id,
          type: 'BOOKING_PAYMENT',
          amount: booking.total,
          currency: 'NOK',
          status: 'COMPLETED',
          metadata: {
            description: `Payment for booking ${booking.bookingNumber}`,
            paymentMethod: 'card',
            processingFee: booking.total * 0.02
          },
          createdAt: new Date(booking.startDate.getTime() + Math.random() * 24 * 60 * 60 * 1000), // Within 24h of booking start
          updatedAt: new Date()
        }
      });
      
      transactions.push(transaction);
    }
  }
  
  console.log(`✅ Created ${transactions.length} transactions`);
  return transactions;
}

async function updateCompanyStats(companies: any[]) {
  console.log('📊 Updating company statistics...');
  
  for (const company of companies) {
    // Calculate actual stats from seeded data
    const bookings = await prisma.booking.findMany({
      where: { providerCompanyId: company.id }
    });
    
    const transactions = await prisma.transaction.findMany({
      where: {
        booking: { providerCompanyId: company.id }
      }
    });
    
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalBookings = bookings.length;
    
    await prisma.company.update({
      where: { id: company.id },
      data: {
        totalRevenue,
        totalBookings
      }
    });
  }
  
  console.log('✅ Company statistics updated');
}

async function verifyDataIntegrity(): Promise<boolean> {
  console.log('🔍 Verifying data integrity...');
  
  try {
    // Check currency consistency
    const nonNOKVehicles = await prisma.vehicleListing.count({
      where: { currency: { not: 'NOK' } }
    });
    
    const nonNOKDrivers = await prisma.driverListing.count({
      where: { currency: { not: 'NOK' } }
    });
    
    const nonNOKBookings = await prisma.booking.count({
      where: { currency: { not: 'NOK' } }
    });
    
    const nonNOKTransactions = await prisma.transaction.count({
      where: { currency: { not: 'NOK' } }
    });
    
    if (nonNOKVehicles > 0 || nonNOKDrivers > 0 || nonNOKBookings > 0 || nonNOKTransactions > 0) {
      console.error('❌ Currency consistency check failed');
      console.error(`Non-NOK records found: Vehicles: ${nonNOKVehicles}, Drivers: ${nonNOKDrivers}, Bookings: ${nonNOKBookings}, Transactions: ${nonNOKTransactions}`);
      return false;
    }
    
    // Basic data count verification
    const companyCount = await prisma.company.count();
    const userCount = await prisma.user.count();
    const vehicleCount = await prisma.vehicleListing.count();
    const driverCount = await prisma.driverListing.count();
    const bookingCount = await prisma.booking.count();
    const transactionCount = await prisma.transaction.count();
    
    if (companyCount === 0 || userCount === 0) {
      console.error('❌ Basic data verification failed - missing essential data');
      return false;
    }
    
    console.log('✅ Data integrity verification passed');
    console.log(`📊 Data counts: Companies: ${companyCount}, Users: ${userCount}, Vehicles: ${vehicleCount}, Drivers: ${driverCount}, Bookings: ${bookingCount}, Transactions: ${transactionCount}`);
    return true;
  } catch (error) {
    console.error('❌ Data integrity verification failed:', error);
    return false;
  }
}

async function generateReport(): Promise<SeedingStats> {
  console.log('📋 Generating seeding report...');
  
  const stats: SeedingStats = {
    companies: await prisma.company.count(),
    users: await prisma.user.count(),
    vehicles: await prisma.vehicleListing.count(),
    drivers: await prisma.driverListing.count(),
    bookings: await prisma.booking.count(),
    transactions: await prisma.transaction.count()
  };
  
  console.log('\n📊 Seeding Complete - Final Statistics:');
  console.log('=====================================');
  console.log(`🏢 Companies: ${stats.companies}`);
  console.log(`👥 Users: ${stats.users}`);
  console.log(`🚐 Vehicles: ${stats.vehicles}`);
  console.log(`🚗 Drivers: ${stats.drivers}`);
  console.log(`📅 Bookings: ${stats.bookings}`);
  console.log(`💳 Transactions: ${stats.transactions}`);
  console.log('=====================================');
  
  return stats;
}

async function main() {
  try {
    console.log('🌱 Starting Comprehensive Data Seeding...\n');
    
    // Clear existing data
    await clearExistingData();
    
    // Seed data in proper order
    const companies = await seedCompanies();
    const users = await seedUsers(companies);
    const vehicles = await seedVehicles(companies);
    const drivers = await seedDrivers(companies);
    const bookings = await seedBookings(vehicles, drivers, companies);
    const transactions = await seedTransactions(bookings);
    
    // Update company statistics
    await updateCompanyStats(companies);
    
    // Verify data integrity
    const integrityCheck = await verifyDataIntegrity();
    
    if (!integrityCheck) {
      throw new Error('Data integrity verification failed');
    }
    
    // Generate final report
    const stats = await generateReport();
    
    console.log('\n🎉 Comprehensive seeding completed successfully!');
    console.log('✅ All data uses NOK currency');
    console.log('✅ All relationships are properly established');
    console.log('✅ Norwegian market data is realistic and accurate');
    console.log('\n🚀 Platform is ready for comprehensive testing!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding script
if (require.main === module) {
  main();
}

export { main as comprehensiveSeed };