/**
 * Property-Based Test: Relationship Integrity After Seeding
 * **Feature: listing-search-fix, Property 5: Relationship integrity after seeding**
 * **Validates: Requirements 2.4**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Property 5: Relationship integrity after seeding', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * For any seeded database, all foreign key relationships should be valid
   * and referential integrity should be maintained
   */
  it('should maintain referential integrity for all seeded relationships', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'user_company_integrity',
          'listing_company_integrity',
          'booking_relationship_integrity',
          'rating_booking_integrity',
          'message_thread_integrity'
        ),
        async (integrityType: string) => {
          try {
            switch (integrityType) {
              case 'user_company_integrity':
                // Every user should reference a valid company
                const users = await prisma.user.findMany({
                  include: { company: true }
                });
                
                for (const user of users) {
                  // User must have a company ID
                  if (!user.companyId) {
                    return false;
                  }
                  
                  // Company must exist
                  if (!user.company) {
                    return false;
                  }
                  
                  // Company ID should match
                  if (user.companyId !== user.company.id) {
                    return false;
                  }
                }
                break;

              case 'listing_company_integrity':
                // Every listing should reference a valid company
                const vehicleListings = await prisma.vehicleListing.findMany({
                  include: { company: true }
                });
                
                const driverListings = await prisma.driverListing.findMany({
                  include: { company: true }
                });
                
                // Check vehicle listings
                for (const listing of vehicleListings) {
                  if (!listing.companyId || !listing.company) {
                    return false;
                  }
                  
                  if (listing.companyId !== listing.company.id) {
                    return false;
                  }
                }
                
                // Check driver listings
                for (const listing of driverListings) {
                  if (!listing.companyId || !listing.company) {
                    return false;
                  }
                  
                  if (listing.companyId !== listing.company.id) {
                    return false;
                  }
                }
                break;

              case 'booking_relationship_integrity':
                // Every booking should have valid relationships
                const bookings = await prisma.booking.findMany({
                  include: {
                    renterCompany: true,
                    providerCompany: true,
                    vehicleListing: true,
                    driverListing: true
                  }
                });
                
                for (const booking of bookings) {
                  // Must have valid renter and provider companies
                  if (!booking.renterCompanyId || !booking.providerCompanyId) {
                    return false;
                  }
                  
                  if (!booking.renterCompany || !booking.providerCompany) {
                    return false;
                  }
                  
                  // Company IDs should match
                  if (booking.renterCompanyId !== booking.renterCompany.id ||
                      booking.providerCompanyId !== booking.providerCompany.id) {
                    return false;
                  }
                  
                  // If vehicle listing is specified, it should exist and match
                  if (booking.vehicleListingId) {
                    if (!booking.vehicleListing) {
                      return false;
                    }
                    
                    if (booking.vehicleListingId !== booking.vehicleListing.id) {
                      return false;
                    }
                    
                    // Vehicle listing should belong to provider company
                    if (booking.vehicleListing.companyId !== booking.providerCompanyId) {
                      return false;
                    }
                  }
                  
                  // If driver listing is specified, it should exist and match
                  if (booking.driverListingId) {
                    if (!booking.driverListing) {
                      return false;
                    }
                    
                    if (booking.driverListingId !== booking.driverListing.id) {
                      return false;
                    }
                    
                    // Driver listing should belong to provider company
                    if (booking.driverListing.companyId !== booking.providerCompanyId) {
                      return false;
                    }
                  }
                }
                break;

              case 'rating_booking_integrity':
                // Every rating should reference a valid booking
                const ratings = await prisma.rating.findMany({
                  include: {
                    booking: {
                      include: {
                        renterCompany: true,
                        providerCompany: true,
                        driverListing: true
                      }
                    }
                  }
                });
                
                for (const rating of ratings) {
                  // Must have a valid booking
                  if (!rating.bookingId || !rating.booking) {
                    return false;
                  }
                  
                  // Booking ID should match
                  if (rating.bookingId !== rating.booking.id) {
                    return false;
                  }
                  
                  // Company relationships should be consistent
                  if (rating.renterCompanyId !== rating.booking.renterCompanyId ||
                      rating.providerCompanyId !== rating.booking.providerCompanyId) {
                    return false;
                  }
                  
                  // If driver listing is rated, it should match booking
                  if (rating.driverListingId) {
                    if (rating.driverListingId !== rating.booking.driverListingId) {
                      return false;
                    }
                  }
                }
                break;

              case 'message_thread_integrity':
                // Every message should reference a valid thread
                const messages = await prisma.message.findMany({
                  include: {
                    thread: {
                      include: {
                        booking: true
                      }
                    },
                    sender: true
                  }
                });
                
                for (const message of messages) {
                  // Must have a valid thread
                  if (!message.threadId || !message.thread) {
                    return false;
                  }
                  
                  // Thread ID should match
                  if (message.threadId !== message.thread.id) {
                    return false;
                  }
                  
                  // Must have a valid sender
                  if (!message.senderId || !message.sender) {
                    return false;
                  }
                  
                  // Sender ID should match
                  if (message.senderId !== message.sender.id) {
                    return false;
                  }
                  
                  // If thread has a booking, it should be valid
                  if (message.thread.bookingId && !message.thread.booking) {
                    return false;
                  }
                }
                break;
            }
            
            return true;
          } catch (error) {
            // Any database error indicates integrity problems
            console.error(`Relationship integrity error for ${integrityType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * For any seeded data, all required fields should be populated
   * and meet business logic constraints
   */
  it('should ensure all seeded records have valid required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'company_required_fields',
          'user_required_fields',
          'listing_required_fields',
          'booking_required_fields'
        ),
        async (entityType: string) => {
          try {
            switch (entityType) {
              case 'company_required_fields':
                const companies = await prisma.company.findMany();
                
                for (const company of companies) {
                  // Required string fields
                  if (!company.name || !company.organizationNumber || 
                      !company.businessAddress || !company.city || 
                      !company.postalCode || !company.fylke || !company.kommune) {
                    return false;
                  }
                  
                  // Organization number should be valid format (9 digits)
                  if (!/^\d{9}$/.test(company.organizationNumber)) {
                    return false;
                  }
                  
                  // Postal code should be valid format (4 digits)
                  if (!/^\d{4}$/.test(company.postalCode)) {
                    return false;
                  }
                  
                  // VAT registration should be boolean
                  if (typeof company.vatRegistered !== 'boolean') {
                    return false;
                  }
                }
                break;

              case 'user_required_fields':
                const users = await prisma.user.findMany();
                
                for (const user of users) {
                  // Required string fields
                  if (!user.email || !user.passwordHash || !user.role ||
                      !user.firstName || !user.lastName || !user.phone) {
                    return false;
                  }
                  
                  // Email should be valid format
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
                    return false;
                  }
                  
                  // Phone should be valid format (Norwegian)
                  if (!/^\+47\d{8}$/.test(user.phone)) {
                    return false;
                  }
                  
                  // Role should be valid enum value
                  if (!['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'].includes(user.role)) {
                    return false;
                  }
                  
                  // Must have company ID
                  if (!user.companyId) {
                    return false;
                  }
                }
                break;

              case 'listing_required_fields':
                const vehicleListings = await prisma.vehicleListing.findMany();
                const driverListings = await prisma.driverListing.findMany();
                
                // Check vehicle listings
                for (const listing of vehicleListings) {
                  // Required fields
                  if (!listing.title || !listing.description || !listing.vehicleType ||
                      !listing.city || !listing.fylke || !listing.kommune) {
                    return false;
                  }
                  
                  // Numeric fields should be positive
                  if (listing.capacity <= 0 || listing.dailyRate <= 0) {
                    return false;
                  }
                  
                  // Coordinates should be valid for Norway
                  if (listing.latitude < 58 || listing.latitude > 72 ||
                      listing.longitude < 4 || listing.longitude > 32) {
                    return false;
                  }
                  
                  // Must have company ID
                  if (!listing.companyId) {
                    return false;
                  }
                }
                
                // Check driver listings
                for (const listing of driverListings) {
                  // Required fields
                  if (!listing.name || !listing.licenseClass || 
                      !listing.backgroundSummary || !Array.isArray(listing.languages)) {
                    return false;
                  }
                  
                  // Rates should be positive
                  if (listing.hourlyRate <= 0 || listing.dailyRate <= 0) {
                    return false;
                  }
                  
                  // Should have at least one language
                  if (listing.languages.length === 0) {
                    return false;
                  }
                  
                  // Must have company ID
                  if (!listing.companyId) {
                    return false;
                  }
                }
                break;

              case 'booking_required_fields':
                const bookings = await prisma.booking.findMany();
                
                for (const booking of bookings) {
                  // Required fields
                  if (!booking.bookingNumber || !booking.status ||
                      !booking.startDate || !booking.endDate) {
                    return false;
                  }
                  
                  // Booking number should follow format
                  if (!/^VDR-\d{4}-\d{3}$/.test(booking.bookingNumber)) {
                    return false;
                  }
                  
                  // Dates should be valid
                  if (booking.startDate >= booking.endDate) {
                    return false;
                  }
                  
                  // Financial fields should be positive
                  if (booking.providerRate <= 0 || booking.total <= 0) {
                    return false;
                  }
                  
                  // Commission should be reasonable percentage
                  if (booking.platformCommissionRate < 0 || booking.platformCommissionRate > 50) {
                    return false;
                  }
                  
                  // Tax rate should be reasonable
                  if (booking.taxRate < 0 || booking.taxRate > 50) {
                    return false;
                  }
                  
                  // Must have company IDs
                  if (!booking.renterCompanyId || !booking.providerCompanyId) {
                    return false;
                  }
                }
                break;
            }
            
            return true;
          } catch (error) {
            console.error(`Required fields validation error for ${entityType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  /**
   * For any seeded database, business logic constraints should be enforced
   */
  it('should enforce business logic constraints in seeded data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'rating_constraints',
          'booking_status_constraints',
          'listing_status_constraints',
          'financial_constraints'
        ),
        async (constraintType: string) => {
          try {
            switch (constraintType) {
              case 'rating_constraints':
                const ratings = await prisma.rating.findMany();
                
                for (const rating of ratings) {
                  // Star ratings should be between 1 and 5
                  if (rating.companyStars && (rating.companyStars < 1 || rating.companyStars > 5)) {
                    return false;
                  }
                  
                  if (rating.driverStars && (rating.driverStars < 1 || rating.driverStars > 5)) {
                    return false;
                  }
                  
                  // If there are stars, there should be a review
                  if (rating.companyStars && !rating.companyReview) {
                    return false;
                  }
                  
                  if (rating.driverStars && !rating.driverReview) {
                    return false;
                  }
                }
                break;

              case 'booking_status_constraints':
                const bookings = await prisma.booking.findMany();
                
                for (const booking of bookings) {
                  // Status should be valid enum
                  if (!['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
                    return false;
                  }
                  
                  // Completed bookings should have completion date
                  if (booking.status === 'COMPLETED' && !booking.completedAt) {
                    return false;
                  }
                  
                  // Active bookings should have response date
                  if (booking.status === 'ACTIVE' && !booking.respondedAt) {
                    return false;
                  }
                  
                  // All bookings should have expiration date
                  if (!booking.expiresAt) {
                    return false;
                  }
                }
                break;

              case 'listing_status_constraints':
                const vehicleListings = await prisma.vehicleListing.findMany();
                const driverListings = await prisma.driverListing.findMany();
                
                // Check vehicle listing constraints
                for (const listing of vehicleListings) {
                  // Status should be valid
                  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(listing.status)) {
                    return false;
                  }
                  
                  // Should have at least one pricing option
                  if (!listing.hourlyRate && !listing.dailyRate) {
                    return false;
                  }
                  
                  // Should have at least one availability option
                  if (!listing.withDriver && !listing.withoutDriver) {
                    return false;
                  }
                }
                
                // Check driver listing constraints
                for (const listing of driverListings) {
                  // Status should be valid
                  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(listing.status)) {
                    return false;
                  }
                  
                  // License class should be valid
                  if (!['B', 'C', 'CE', 'D'].includes(listing.licenseClass)) {
                    return false;
                  }
                }
                break;

              case 'financial_constraints':
                const allBookings = await prisma.booking.findMany();
                
                for (const booking of allBookings) {
                  // Commission calculation should be correct
                  const expectedCommission = (booking.providerRate * booking.platformCommissionRate) / 100;
                  if (Math.abs(booking.platformCommission - expectedCommission) > 0.01) {
                    return false;
                  }
                  
                  // Tax calculation should be correct
                  const expectedTax = ((booking.providerRate + booking.platformCommission) * booking.taxRate) / 100;
                  if (Math.abs(booking.taxes - expectedTax) > 0.01) {
                    return false;
                  }
                  
                  // Total should be correct
                  const expectedTotal = booking.providerRate + booking.platformCommission + booking.taxes;
                  if (Math.abs(booking.total - expectedTotal) > 0.01) {
                    return false;
                  }
                }
                break;
            }
            
            return true;
          } catch (error) {
            console.error(`Business logic constraint error for ${constraintType}:`, error);
            return false;
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});