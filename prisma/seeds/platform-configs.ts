import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPlatformConfigs() {
  console.log('🌱 Seeding platform configurations...');

  const configs = [
    // Financial Configuration
    {
      category: 'financial',
      key: 'commission_rate',
      value: 0.15,
      dataType: 'number',
      displayName: 'Platform Commission Rate',
      description: 'Percentage commission taken from each booking',
      validation: { min: 0, max: 1, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'financial',
      key: 'tax_rate',
      value: 0.25,
      dataType: 'number',
      displayName: 'Tax Rate',
      description: 'VAT/Tax rate applied to transactions',
      validation: { min: 0, max: 1, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'financial',
      key: 'min_booking_amount',
      value: 500,
      dataType: 'number',
      displayName: 'Minimum Booking Amount',
      description: 'Minimum amount for a booking in NOK',
      validation: { min: 0, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'financial',
      key: 'max_booking_amount',
      value: 100000,
      dataType: 'number',
      displayName: 'Maximum Booking Amount',
      description: 'Maximum amount for a booking in NOK',
      validation: { min: 1000, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'financial',
      key: 'default_currency',
      value: 'NOK',
      dataType: 'select',
      displayName: 'Default Currency',
      description: 'Default currency for the platform',
      options: ['NOK', 'EUR', 'USD', 'SEK', 'DKK'],
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },

    // System Configuration
    {
      category: 'system',
      key: 'booking_timeout_hours',
      value: 24,
      dataType: 'number',
      displayName: 'Booking Timeout Hours',
      description: 'Hours before a pending booking expires',
      validation: { min: 1, max: 168, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'system',
      key: 'session_timeout_minutes',
      value: 60,
      dataType: 'number',
      displayName: 'Session Timeout Minutes',
      description: 'Minutes before user session expires',
      validation: { min: 5, max: 480, required: true },
      isEditable: true,
      requiresRestart: true,
    },
    {
      category: 'system',
      key: 'cache_ttl_seconds',
      value: 300,
      dataType: 'number',
      displayName: 'Cache TTL Seconds',
      description: 'Time to live for cached data in seconds',
      validation: { min: 60, max: 3600, required: true },
      isEditable: true,
      requiresRestart: true,
    },
    {
      category: 'system',
      key: 'api_rate_limit_per_minute',
      value: 100,
      dataType: 'number',
      displayName: 'API Rate Limit Per Minute',
      description: 'Maximum API requests per minute per user',
      validation: { min: 10, max: 1000, required: true },
      isEditable: true,
      requiresRestart: true,
    },
    {
      category: 'system',
      key: 'maintenance_mode',
      value: false,
      dataType: 'boolean',
      displayName: 'Maintenance Mode',
      description: 'Enable maintenance mode to restrict access',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },

    // Features Configuration
    {
      category: 'features',
      key: 'hourly_bookings_enabled',
      value: true,
      dataType: 'boolean',
      displayName: 'Hourly Bookings Enabled',
      description: 'Allow hourly booking duration',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'features',
      key: 'instant_booking_enabled',
      value: false,
      dataType: 'boolean',
      displayName: 'Instant Booking Enabled',
      description: 'Allow instant booking without approval',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'features',
      key: 'recurring_bookings_enabled',
      value: true,
      dataType: 'boolean',
      displayName: 'Recurring Bookings Enabled',
      description: 'Allow recurring booking patterns',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'features',
      key: 'driver_ratings_enabled',
      value: true,
      dataType: 'boolean',
      displayName: 'Driver Ratings Enabled',
      description: 'Enable driver rating system',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'features',
      key: 'auto_approval_enabled',
      value: false,
      dataType: 'boolean',
      displayName: 'Auto Approval Enabled',
      description: 'Automatically approve bookings',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },

    // Security Configuration
    {
      category: 'security',
      key: 'max_login_attempts',
      value: 5,
      dataType: 'number',
      displayName: 'Max Login Attempts',
      description: 'Maximum failed login attempts before lockout',
      validation: { min: 3, max: 10, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'security',
      key: 'password_min_length',
      value: 8,
      dataType: 'number',
      displayName: 'Password Minimum Length',
      description: 'Minimum required password length',
      validation: { min: 6, max: 20, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'security',
      key: 'require_email_verification',
      value: true,
      dataType: 'boolean',
      displayName: 'Require Email Verification',
      description: 'Require users to verify email before access',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'security',
      key: 'two_factor_auth_enabled',
      value: false,
      dataType: 'boolean',
      displayName: 'Two Factor Auth Enabled',
      description: 'Enable two-factor authentication',
      validation: { required: true },
      isEditable: true,
      requiresRestart: false,
    },

    // Performance Configuration
    {
      category: 'performance',
      key: 'max_booking_duration_days',
      value: 30,
      dataType: 'number',
      displayName: 'Max Booking Duration Days',
      description: 'Maximum booking duration in days',
      validation: { min: 1, max: 365, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'performance',
      key: 'min_booking_advance_hours',
      value: 2,
      dataType: 'number',
      displayName: 'Min Booking Advance Hours',
      description: 'Minimum hours in advance for booking',
      validation: { min: 0, max: 168, required: true },
      isEditable: true,
      requiresRestart: false,
    },
    {
      category: 'performance',
      key: 'search_results_per_page',
      value: 20,
      dataType: 'number',
      displayName: 'Search Results Per Page',
      description: 'Number of search results per page',
      validation: { min: 5, max: 100, required: true },
      isEditable: true,
      requiresRestart: false,
    },
  ];

  for (const config of configs) {
    await prisma.platformConfigs.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        displayName: config.displayName,
        description: config.description,
        validation: config.validation,
        options: config.options,
        updatedAt: new Date(),
      },
      create: config,
    });
  }

  console.log(`✅ Seeded ${configs.length} platform configurations`);
}

export async function seedAnalyticsSnapshots() {
  console.log('🌱 Seeding analytics snapshots...');

  const today = new Date();
  const snapshots = [];

  // Generate daily snapshots for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Platform overview metrics - using static values instead of random
    snapshots.push({
      snapshotDate: date,
      metricType: 'platform_overview',
      metricData: {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        totalCompanies: 0,
        verifiedCompanies: 0,
        totalBookings: 0,
        completedBookings: 0,
        totalRevenue: 0,
        platformCommission: 0,
      },
    });

    // Booking metrics - using static values instead of random
    snapshots.push({
      snapshotDate: date,
      metricType: 'booking_metrics',
      metricData: {
        pendingBookings: 0,
        acceptedBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        disputedBookings: 0,
        averageBookingValue: 0,
        bookingConversionRate: 0,
      },
    });

    // Financial metrics - using static values instead of random
    snapshots.push({
      snapshotDate: date,
      metricType: 'financial_metrics',
      metricData: {
        dailyRevenue: 0,
        commissionEarned: 0,
        refundsProcessed: 0,
        disputeRefunds: 0,
        averageTransactionValue: 0,
        paymentFailureRate: 0,
      },
    });
  }

  for (const snapshot of snapshots) {
    await prisma.analyticsSnapshots.create({
      data: snapshot,
    });
  }

  console.log(`✅ Seeded ${snapshots.length} analytics snapshots`);
}

export async function seedContentFlags() {
  console.log('🌱 Seeding content flags...');

  // Get some users to use as flaggers and resolvers
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true },
  });

  if (users.length === 0) {
    console.log('⚠️ No users found, skipping content flags seeding');
    return;
  }

  // Get some companies and bookings to flag
  const companies = await prisma.company.findMany({
    take: 3,
    select: { id: true },
  });

  const bookings = await prisma.booking.findMany({
    take: 3,
    select: { id: true },
  });

  const flags = [
    // Company content flags
    ...companies.map((company, index) => ({
      contentId: company.id,
      contentType: 'COMPANY_INFO',
      flagType: index % 2 === 0 ? 'INAPPROPRIATE_CONTENT' : 'SPAM',
      severity: index % 3 === 0 ? 'HIGH' : 'MEDIUM',
      status: index % 2 === 0 ? 'PENDING' : 'RESOLVED',
      flaggedBy: users[index % users.length].id,
      reason: `Flagged company content: ${index % 2 === 0 ? 'Inappropriate business description' : 'Spam in company information'}`,
      evidence: {
        screenshots: [`screenshot_${index + 1}.png`],
        metadata: { flaggedSection: 'description', confidence: 0.8 },
      },
      resolvedBy: index % 2 === 0 ? null : users[(index + 1) % users.length].id,
      resolvedAt: index % 2 === 0 ? null : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    })),

    // Booking content flags
    ...bookings.map((booking, index) => ({
      contentId: booking.id,
      contentType: 'BOOKING_DESCRIPTION',
      flagType: index % 2 === 0 ? 'FRAUD' : 'HARASSMENT',
      severity: index % 2 === 0 ? 'CRITICAL' : 'HIGH',
      status: 'UNDER_REVIEW',
      flaggedBy: users[index % users.length].id,
      reason: `Flagged booking: ${index % 2 === 0 ? 'Suspected fraudulent booking' : 'Harassment in booking communication'}`,
      evidence: {
        metadata: { 
          bookingValue: 1500,
          flaggedMessages: index % 2 === 0 ? [] : ['Inappropriate message content'],
          riskScore: 0.7,
        },
      },
      resolvedBy: null,
      resolvedAt: null,
    })),

    // Additional sample flags
    {
      contentId: users[0].id,
      contentType: 'USER_PROFILE',
      flagType: 'INAPPROPRIATE_CONTENT',
      severity: 'LOW',
      status: 'RESOLVED',
      flaggedBy: users[1].id,
      reason: 'Inappropriate profile picture',
      evidence: {
        screenshots: ['profile_flag.png'],
        metadata: { section: 'profile_picture', automated: false },
      },
      resolvedBy: users[2].id,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const flag of flags) {
    await prisma.contentFlags.create({
      data: flag,
    });
  }

  console.log(`✅ Seeded ${flags.length} content flags`);
}

if (require.main === module) {
  async function main() {
    try {
      await seedPlatformConfigs();
      await seedAnalyticsSnapshots();
      await seedContentFlags();
    } catch (error) {
      console.error('Error seeding data:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  main();
}