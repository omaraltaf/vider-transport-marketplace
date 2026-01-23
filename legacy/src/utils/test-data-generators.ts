import { PrismaClient, VehicleType, FuelType, ListingStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * Test data generation utilities for creating valid test data
 * that respects all foreign key constraints and business rules
 */

export interface TestCompanyData {
  name: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description?: string;
  verified?: boolean;
  aggregatedRating?: number;
}

export interface TestUserData {
  companyId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  emailVerified?: boolean;
}

export interface TestVehicleListingData {
  companyId: string;
  title: string;
  description: string;
  vehicleType: VehicleType;
  capacity: number;
  fuelType: FuelType;
  city: string;
  fylke: string;
  kommune: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  dailyRate?: number;
  deposit?: number;
  withDriver: boolean;
  withDriverCost?: number;
  withoutDriver: boolean;
  photos?: string[];
  tags?: string[];
  status?: ListingStatus;
}

export interface TestDriverListingData {
  companyId: string;
  name: string;
  licenseClass: string;
  languages: string[];
  backgroundSummary?: string;
  hourlyRate?: number;
  dailyRate?: number;
  verified?: boolean;
  status?: ListingStatus;
}

/**
 * Generate realistic Norwegian company data
 */
export function generateTestCompanyData(overrides: Partial<TestCompanyData> = {}): TestCompanyData {
  const companyNames = [
    'Bergen Transport AS',
    'Oslo Kjøretøy',
    'Trondheim Bilutleie',
    'Stavanger Logistikk AS',
    'Kristiansand Transport',
    'Tromsø Kjøring AS',
  ];

  const fylker = ['Oslo', 'Viken', 'Innlandet', 'Vestfold og Telemark', 'Agder', 'Rogaland', 'Vestland', 'Møre og Romsdal', 'Trøndelag', 'Nordland', 'Troms og Finnmark'];
  const kommuner = ['Bergen', 'Oslo', 'Trondheim', 'Stavanger', 'Kristiansand', 'Fredrikstad', 'Sandnes', 'Tromsø', 'Drammen', 'Asker'];

  const randomName = companyNames[Math.floor(Math.random() * companyNames.length)];
  const randomFylke = fylker[Math.floor(Math.random() * fylker.length)];
  const randomKommune = kommuner[Math.floor(Math.random() * kommuner.length)];

  // Generate Norwegian organization number (9 digits)
  const orgNumber = Math.floor(Math.random() * 900000000) + 100000000;

  return {
    name: randomName,
    organizationNumber: orgNumber.toString(),
    businessAddress: `${randomName.split(' ')[0]}vei ${Math.floor(Math.random() * 100) + 1}`,
    city: randomKommune,
    postalCode: `${Math.floor(Math.random() * 9000) + 1000}`,
    fylke: randomFylke,
    kommune: randomKommune,
    vatRegistered: Math.random() > 0.3, // 70% chance of being VAT registered
    description: `Professional transportation services in ${randomKommune}. Reliable and customer-focused.`,
    verified: Math.random() > 0.3, // 70% chance of being verified
    aggregatedRating: Math.random() > 0.5 ? Math.round((Math.random() * 2 + 3) * 10) / 10 : null, // 50% chance of having rating between 3.0-5.0
    ...overrides,
  };
}

/**
 * Generate realistic Norwegian user data
 */
export function generateTestUserData(companyId: string, overrides: Partial<Omit<TestUserData, 'companyId'>> = {}): TestUserData {
  const firstNames = ['Lars', 'Kari', 'Ole', 'Anne', 'Erik', 'Ingrid', 'Nils', 'Astrid', 'Bjørn', 'Solveig'];
  const lastNames = ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return {
    companyId,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}@example.no`,
    passwordHash: '$2b$10$dummyHashForTestingPurposesOnly', // Dummy hash for testing
    firstName,
    lastName,
    phone: `+47 ${Math.floor(Math.random() * 90000000) + 10000000}`,
    role: Role.COMPANY_ADMIN, // Default to company admin
    emailVerified: Math.random() > 0.2, // 80% chance of being verified
    ...overrides,
  };
}

/**
 * Generate realistic vehicle listing data
 */
export function generateTestVehicleListingData(companyId: string, overrides: Partial<Omit<TestVehicleListingData, 'companyId'>> = {}): TestVehicleListingData {
  const vehicleTypes = Object.values(VehicleType);
  const fuelTypes = Object.values(FuelType);
  const fylker = ['Oslo', 'Viken', 'Vestland', 'Trøndelag', 'Rogaland'];
  const kommuner = ['Bergen', 'Oslo', 'Trondheim', 'Stavanger', 'Kristiansand'];

  const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
  const fuelType = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
  const fylke = fylker[Math.floor(Math.random() * fylker.length)];
  const kommune = kommuner[Math.floor(Math.random() * kommuner.length)];

  // Generate capacity based on vehicle type
  let capacity: number;
  switch (vehicleType) {
    case VehicleType.PALLET_8:
      capacity = 8; // 8 pallets
      break;
    case VehicleType.PALLET_18:
      capacity = 18; // 18 pallets
      break;
    case VehicleType.PALLET_21:
      capacity = 21; // 21 pallets
      break;
    case VehicleType.TRAILER:
      capacity = Math.floor(Math.random() * 15) + 10; // 10-24 pallets
      break;
    case VehicleType.OTHER:
      capacity = Math.floor(Math.random() * 10) + 5; // 5-14 units
      break;
    default:
      capacity = 8;
  }

  // Generate realistic pricing
  const baseHourlyRate = Math.floor(Math.random() * 300) + 100; // 100-400 NOK/hour
  const baseDailyRate = baseHourlyRate * 6; // Roughly 6 hours per day discount

  const withDriver = Math.random() > 0.4; // 60% chance of offering with driver
  const withoutDriver = Math.random() > 0.3; // 70% chance of offering without driver
  const withDriverCost = withDriver ? Math.floor(Math.random() * 200) + 100 : undefined; // 100-300 NOK extra for driver

  // Generate coordinates for Norwegian cities
  const coordinates = generateNorwegianCoordinates(kommune);

  return {
    companyId,
    title: `${vehicleType.replace(/_/g, ' ')} - ${capacity} ${vehicleType === VehicleType.TRAILER ? 'pallets' : 'units'}`,
    description: `Professional ${vehicleType.toLowerCase().replace(/_/g, ' ')} available for rent. Well-maintained and reliable vehicle perfect for your transportation needs.`,
    vehicleType,
    capacity,
    fuelType,
    city: kommune,
    fylke,
    kommune,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    hourlyRate: baseHourlyRate, // Always provide hourly rate
    dailyRate: baseDailyRate, // Always provide daily rate
    deposit: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 NOK deposit
    withDriver,
    withDriverCost,
    withoutDriver,
    photos: [], // Empty for now, can be populated separately
    tags: generateVehicleTags(vehicleType, fuelType),
    status: ListingStatus.ACTIVE,
    ...overrides,
  };
}

/**
 * Generate realistic driver listing data
 */
export function generateTestDriverListingData(companyId: string, overrides: Partial<Omit<TestDriverListingData, 'companyId'>> = {}): TestDriverListingData {
  const firstNames = ['Lars', 'Kari', 'Ole', 'Anne', 'Erik', 'Ingrid', 'Nils', 'Astrid', 'Bjørn', 'Solveig'];
  const lastNames = ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen'];
  const licenseClasses = ['B', 'C', 'C1', 'D', 'D1', 'CE', 'C1E', 'DE', 'D1E'];
  const languages = ['Norwegian', 'English', 'Swedish', 'Danish', 'German', 'Spanish', 'French'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const licenseClass = licenseClasses[Math.floor(Math.random() * licenseClasses.length)];

  // Generate 1-3 languages, always including Norwegian
  const driverLanguages = ['Norwegian'];
  const additionalLanguages = languages.filter(lang => lang !== 'Norwegian');
  const numAdditionalLanguages = Math.floor(Math.random() * 3); // 0-2 additional languages
  
  for (let i = 0; i < numAdditionalLanguages; i++) {
    const randomLang = additionalLanguages[Math.floor(Math.random() * additionalLanguages.length)];
    if (!driverLanguages.includes(randomLang)) {
      driverLanguages.push(randomLang);
    }
  }

  const baseHourlyRate = Math.floor(Math.random() * 200) + 200; // 200-400 NOK/hour
  const baseDailyRate = baseHourlyRate * 7; // Roughly 7 hours per day

  return {
    companyId,
    name: `${firstName} ${lastName}`,
    licenseClass,
    languages: driverLanguages,
    backgroundSummary: `Experienced professional driver with ${Math.floor(Math.random() * 15) + 5} years of experience. Licensed for ${licenseClass} class vehicles. Reliable, punctual, and customer-focused.`,
    hourlyRate: baseHourlyRate, // Always provide hourly rate
    dailyRate: baseDailyRate, // Always provide daily rate
    verified: Math.random() > 0.4, // 60% chance of being verified
    status: ListingStatus.ACTIVE,
    ...overrides,
  };
}

/**
 * Generate Norwegian coordinates for major cities
 */
function generateNorwegianCoordinates(kommune: string): { latitude: number; longitude: number } {
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'Oslo': { lat: 59.9139, lng: 10.7522 },
    'Bergen': { lat: 60.3913, lng: 5.3221 },
    'Trondheim': { lat: 63.4305, lng: 10.3951 },
    'Stavanger': { lat: 58.9700, lng: 5.7331 },
    'Kristiansand': { lat: 58.1467, lng: 7.9956 },
    'Fredrikstad': { lat: 59.2181, lng: 10.9298 },
    'Sandnes': { lat: 58.8516, lng: 5.7372 },
    'Tromsø': { lat: 69.6492, lng: 18.9553 },
    'Drammen': { lat: 59.7439, lng: 10.2045 },
    'Asker': { lat: 59.8333, lng: 10.4333 },
  };

  const baseCoords = cityCoordinates[kommune] || cityCoordinates['Oslo'];
  
  // Add small random variation (within ~5km radius)
  const latVariation = (Math.random() - 0.5) * 0.05; // ~2.5km variation
  const lngVariation = (Math.random() - 0.5) * 0.05; // ~2.5km variation

  return {
    latitude: baseCoords.lat + latVariation,
    longitude: baseCoords.lng + lngVariation,
  };
}

/**
 * Generate relevant tags for vehicle listings
 */
function generateVehicleTags(vehicleType: VehicleType, fuelType: FuelType): string[] {
  const baseTags: string[] = [];

  // Add vehicle type specific tags
  switch (vehicleType) {
    case VehicleType.PALLET_8:
      baseTags.push('small-cargo', 'efficient', 'city-delivery');
      break;
    case VehicleType.PALLET_18:
      baseTags.push('medium-cargo', 'versatile', 'regional-transport');
      break;
    case VehicleType.PALLET_21:
      baseTags.push('large-cargo', 'high-capacity', 'long-distance');
      break;
    case VehicleType.TRAILER:
      baseTags.push('heavy-duty', 'commercial', 'freight');
      break;
    case VehicleType.OTHER:
      baseTags.push('specialized', 'custom', 'flexible');
      break;
  }

  // Add fuel type specific tags
  switch (fuelType) {
    case FuelType.ELECTRIC:
      baseTags.push('eco-friendly', 'zero-emissions', 'quiet');
      break;
    case FuelType.BIOGAS:
      baseTags.push('eco-friendly', 'renewable', 'sustainable');
      break;
    case FuelType.DIESEL:
      baseTags.push('long-range', 'powerful', 'efficient');
      break;
    case FuelType.GAS:
      baseTags.push('clean-burning', 'cost-effective');
      break;
  }

  // Add some random additional tags
  const additionalTags = ['gps', 'bluetooth', 'automatic', 'manual', 'winter-ready', 'loading-ramp'];
  const numAdditionalTags = Math.floor(Math.random() * 3); // 0-2 additional tags
  
  for (let i = 0; i < numAdditionalTags; i++) {
    const randomTag = additionalTags[Math.floor(Math.random() * additionalTags.length)];
    if (!baseTags.includes(randomTag)) {
      baseTags.push(randomTag);
    }
  }

  return baseTags;
}

/**
 * Create a complete test company with users and listings
 */
export async function createTestCompanyWithData(
  companyData?: Partial<TestCompanyData>,
  options: {
    userCount?: number;
    vehicleListingCount?: number;
    driverListingCount?: number;
  } = {}
): Promise<{
  company: any;
  users: any[];
  vehicleListings: any[];
  driverListings: any[];
}> {
  const {
    userCount = 2,
    vehicleListingCount = 3,
    driverListingCount = 2,
  } = options;

  // Create company
  const companyCreateData = generateTestCompanyData(companyData);
  const company = await prisma.company.create({
    data: companyCreateData,
  });

  // Create users
  const users = [];
  for (let i = 0; i < userCount; i++) {
    const userData = generateTestUserData(company.id, {
      role: i === 0 ? Role.COMPANY_ADMIN : Role.COMPANY_USER,
    });
    const user = await prisma.user.create({
      data: userData,
    });
    users.push(user);
  }

  // Create vehicle listings
  const vehicleListings = [];
  for (let i = 0; i < vehicleListingCount; i++) {
    const listingData = generateTestVehicleListingData(company.id);
    const listing = await prisma.vehicleListing.create({
      data: listingData,
    });
    vehicleListings.push(listing);
  }

  // Create driver listings
  const driverListings = [];
  for (let i = 0; i < driverListingCount; i++) {
    const listingData = generateTestDriverListingData(company.id);
    const listing = await prisma.driverListing.create({
      data: listingData,
    });
    driverListings.push(listing);
  }

  return {
    company,
    users,
    vehicleListings,
    driverListings,
  };
}

/**
 * Validate that all foreign key relationships are properly established
 */
export async function validateTestDataIntegrity(): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Check basic counts to ensure data was created
    const companyCount = await prisma.company.count();
    const userCount = await prisma.user.count();
    const vehicleListingCount = await prisma.vehicleListing.count();
    const driverListingCount = await prisma.driverListing.count();

    if (companyCount === 0) {
      errors.push('No companies found in database');
    }

    if (userCount === 0) {
      errors.push('No users found in database');
    }

    if (vehicleListingCount === 0) {
      errors.push('No vehicle listings found in database');
    }

    if (driverListingCount === 0) {
      errors.push('No driver listings found in database');
    }

    // Check that all users have valid company IDs
    const usersWithCompanies = await prisma.user.findMany({
      include: { company: true },
    });

    for (const user of usersWithCompanies) {
      if (!user.company) {
        errors.push(`User ${user.id} has invalid company reference`);
      }
    }

    // Check that all vehicle listings have valid company IDs
    const vehicleListingsWithCompanies = await prisma.vehicleListing.findMany({
      include: { company: true },
    });

    for (const listing of vehicleListingsWithCompanies) {
      if (!listing.company) {
        errors.push(`Vehicle listing ${listing.id} has invalid company reference`);
      }
    }

    // Check that all driver listings have valid company IDs
    const driverListingsWithCompanies = await prisma.driverListing.findMany({
      include: { company: true },
    });

    for (const listing of driverListingsWithCompanies) {
      if (!listing.company) {
        errors.push(`Driver listing ${listing.id} has invalid company reference`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    errors.push(`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors,
    };
  }
}