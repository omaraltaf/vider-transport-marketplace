import { PrismaClient, Rating, BookingStatus } from '@prisma/client';
import { logger } from '../config/logger';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface RatingData {
  companyStars: number; // 1-5
  companyReview?: string;
  driverStars?: number; // 1-5
  driverReview?: string;
}

export interface AggregatedRating {
  averageStars: number;
  totalRatings: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export class RatingService {
  /**
   * Submit a rating for a completed booking
   * Validates rating range (1-5 stars)
   * Updates aggregated ratings for company and driver
   */
  async submitRating(
    bookingId: string,
    renterId: string,
    ratingData: RatingData
  ): Promise<Rating> {
    // Validate rating range for company
    if (ratingData.companyStars < 1 || ratingData.companyStars > 5) {
      throw new Error('INVALID_COMPANY_RATING_RANGE');
    }

    // Validate rating range for driver if provided
    if (ratingData.driverStars !== undefined) {
      if (ratingData.driverStars < 1 || ratingData.driverStars > 5) {
        throw new Error('INVALID_DRIVER_RATING_RANGE');
      }
    }

    // Validate that stars are integers
    if (!Number.isInteger(ratingData.companyStars)) {
      throw new Error('COMPANY_STARS_MUST_BE_INTEGER');
    }

    if (ratingData.driverStars !== undefined && !Number.isInteger(ratingData.driverStars)) {
      throw new Error('DRIVER_STARS_MUST_BE_INTEGER');
    }

    // Get booking with relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        renterCompany: true,
        providerCompany: true,
        driverListing: true,
        rating: true,
      },
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // Verify the renter is authorized to rate this booking
    if (booking.renterCompanyId !== renterId) {
      throw new Error('UNAUTHORIZED');
    }

    // Verify booking is completed
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new Error('BOOKING_NOT_COMPLETED');
    }

    // Check if rating already exists
    if (booking.rating) {
      throw new Error('RATING_ALREADY_EXISTS');
    }

    // If driver stars provided, verify booking has a driver
    if (ratingData.driverStars !== undefined && !booking.driverListingId) {
      throw new Error('BOOKING_HAS_NO_DRIVER');
    }

    // Create rating
    const rating = await prisma.rating.create({
      data: {
        bookingId,
        renterCompanyId: booking.renterCompanyId,
        providerCompanyId: booking.providerCompanyId,
        driverListingId: booking.driverListingId,
        companyStars: ratingData.companyStars,
        companyReview: ratingData.companyReview,
        driverStars: ratingData.driverStars,
        driverReview: ratingData.driverReview,
      },
    });

    // Update aggregated rating for company
    await this.updateAggregatedRating(booking.providerCompanyId, 'company');

    // Update aggregated rating for driver if applicable
    if (booking.driverListingId && ratingData.driverStars !== undefined) {
      await this.updateAggregatedRating(booking.driverListingId, 'driver');
    }

    logger.info('Rating submitted', {
      ratingId: rating.id,
      bookingId,
      companyStars: ratingData.companyStars,
      driverStars: ratingData.driverStars,
    });

    return rating;
  }

  /**
   * Respond to a review (provider only)
   */
  async respondToReview(
    reviewId: string,
    providerId: string,
    response: string
  ): Promise<Rating> {
    // Get rating
    const rating = await prisma.rating.findUnique({
      where: { id: reviewId },
    });

    if (!rating) {
      throw new Error('RATING_NOT_FOUND');
    }

    // Verify provider is authorized
    if (rating.providerCompanyId !== providerId) {
      throw new Error('UNAUTHORIZED');
    }

    // Check if response already exists
    if (rating.providerResponse) {
      throw new Error('RESPONSE_ALREADY_EXISTS');
    }

    // Validate response is not empty
    if (!response || response.trim() === '') {
      throw new Error('RESPONSE_REQUIRED');
    }

    // Update rating with provider response
    const updatedRating = await prisma.rating.update({
      where: { id: reviewId },
      data: {
        providerResponse: response,
        providerRespondedAt: new Date(),
      },
    });

    logger.info('Provider responded to review', { reviewId, providerId });

    return updatedRating;
  }

  /**
   * Get company ratings
   */
  async getCompanyRatings(companyId: string): Promise<AggregatedRating> {
    const ratings = await prisma.rating.findMany({
      where: { providerCompanyId: companyId },
      select: { companyStars: true },
    });

    if (ratings.length === 0) {
      return {
        averageStars: 0,
        totalRatings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + r.companyStars, 0);
    const averageStars = sum / ratings.length;

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      distribution[r.companyStars as 1 | 2 | 3 | 4 | 5]++;
    });

    return {
      averageStars,
      totalRatings: ratings.length,
      distribution,
    };
  }

  /**
   * Get driver ratings
   */
  async getDriverRatings(driverId: string): Promise<AggregatedRating> {
    const ratings = await prisma.rating.findMany({
      where: {
        driverListingId: driverId,
        driverStars: { not: null },
      },
      select: { driverStars: true },
    });

    if (ratings.length === 0) {
      return {
        averageStars: 0,
        totalRatings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + (r.driverStars || 0), 0);
    const averageStars = sum / ratings.length;

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      if (r.driverStars) {
        distribution[r.driverStars as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    return {
      averageStars,
      totalRatings: ratings.length,
      distribution,
    };
  }

  /**
   * Update aggregated rating for a company or driver
   * Calculates the arithmetic mean of all ratings
   */
  async updateAggregatedRating(
    entityId: string,
    entityType: 'company' | 'driver'
  ): Promise<void> {
    if (entityType === 'company') {
      const ratings = await prisma.rating.findMany({
        where: { providerCompanyId: entityId },
        select: { companyStars: true },
      });

      if (ratings.length === 0) {
        await prisma.company.update({
          where: { id: entityId },
          data: {
            aggregatedRating: null,
            totalRatings: 0,
          },
        });
        return;
      }

      const sum = ratings.reduce((acc, r) => acc + r.companyStars, 0);
      const averageStars = sum / ratings.length;

      await prisma.company.update({
        where: { id: entityId },
        data: {
          aggregatedRating: averageStars,
          totalRatings: ratings.length,
        },
      });

      logger.info('Company aggregated rating updated', {
        companyId: entityId,
        averageStars,
        totalRatings: ratings.length,
      });
    } else if (entityType === 'driver') {
      const ratings = await prisma.rating.findMany({
        where: {
          driverListingId: entityId,
          driverStars: { not: null },
        },
        select: { driverStars: true },
      });

      if (ratings.length === 0) {
        await prisma.driverListing.update({
          where: { id: entityId },
          data: {
            aggregatedRating: null,
            totalRatings: 0,
          },
        });
        return;
      }

      const sum = ratings.reduce((acc, r) => acc + (r.driverStars || 0), 0);
      const averageStars = sum / ratings.length;

      await prisma.driverListing.update({
        where: { id: entityId },
        data: {
          aggregatedRating: averageStars,
          totalRatings: ratings.length,
        },
      });

      logger.info('Driver aggregated rating updated', {
        driverId: entityId,
        averageStars,
        totalRatings: ratings.length,
      });
    }
  }

  /**
   * Get ratings for a booking
   */
  async getRatingByBookingId(bookingId: string): Promise<Rating | null> {
    return prisma.rating.findUnique({
      where: { bookingId },
      include: {
        renterCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        providerCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        driverListing: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all ratings for a company (as provider)
   */
  async getCompanyRatingsList(companyId: string): Promise<Rating[]> {
    return prisma.rating.findMany({
      where: { providerCompanyId: companyId },
      include: {
        renterCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all ratings for a driver
   */
  async getDriverRatingsList(driverId: string): Promise<Rating[]> {
    return prisma.rating.findMany({
      where: {
        driverListingId: driverId,
        driverStars: { not: null },
      },
      include: {
        renterCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const ratingService = new RatingService();
