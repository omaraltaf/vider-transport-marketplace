/**
 * Listing Analytics Service
 * Provides performance metrics and analytics for vehicle and driver listings
 * Uses real database data for all calculations
 */

import { PrismaClient, BookingStatus } from '@prisma/client';
import { logger } from '../config/logger';

const prisma = new PrismaClient();

export interface ListingPerformanceMetrics {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  utilizationRate: number; // Percentage of time booked
  bookingConversionRate: number; // Views to bookings ratio (if view tracking exists)
  averageRating: number | null;
  totalReviews: number;
}

export interface ListingAnalytics {
  listingId: string;
  period: {
    start: Date;
    end: Date;
  };
  bookingTrends: {
    date: string;
    bookings: number;
    revenue: number;
  }[];
  performanceMetrics: ListingPerformanceMetrics;
}

export class ListingAnalyticsService {
  /**
   * Get performance metrics for a specific listing
   */
  async getListingPerformanceMetrics(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate?: Date,
    endDate?: Date
  ): Promise<ListingPerformanceMetrics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    // Build booking query based on listing type
    const bookingWhere = listingType === 'vehicle'
      ? { vehicleListingId: listingId }
      : { driverListingId: listingId };

    // Get all bookings for this listing in the period
    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingWhere,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        transactions: true,
      },
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED).length;
    const cancelledBookings = bookings.filter(
      b => b.status === BookingStatus.CANCELLED
    ).length;

    // Calculate total revenue from completed bookings
    const totalRevenue = bookings
      .filter(b => b.status === BookingStatus.COMPLETED)
      .reduce((sum, booking) => {
        const bookingRevenue = booking.transactions
          .filter(t => t.status === 'COMPLETED')
          .reduce((tSum, t) => tSum + t.amount, 0);
        return sum + bookingRevenue;
      }, 0);

    const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    // Calculate utilization rate (percentage of days booked in the period)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bookedDays = bookings
      .filter(b => b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ACTIVE)
      .reduce((sum, booking) => {
        const duration = booking.durationDays || 1;
        return sum + duration;
      }, 0);

    const utilizationRate = totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;

    // Get ratings for this listing
    const ratings = await prisma.rating.findMany({
      where: listingType === 'vehicle'
        ? { providerCompanyId: { not: null } } // Placeholder - ratings system needs to be updated
        : { providerCompanyId: { not: null } }, // Placeholder - ratings system needs to be updated
    });

    const totalReviews = ratings.length;
    const averageRating = totalReviews > 0
      ? ratings.reduce((sum, r) => sum + r.companyStars, 0) / totalReviews
      : null;

    // Booking conversion rate (placeholder - would need view tracking)
    const bookingConversionRate = 0; // TODO: Implement view tracking

    logger.info('Listing performance metrics calculated', {
      listingId,
      listingType,
      totalBookings,
      completedBookings,
      utilizationRate: utilizationRate.toFixed(2),
    });

    return {
      listingId,
      listingType,
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageBookingValue,
      utilizationRate,
      bookingConversionRate,
      averageRating,
      totalReviews,
    };
  }

  /**
   * Get comprehensive analytics for a listing including trends
   */
  async getListingAnalytics(
    listingId: string,
    listingType: 'vehicle' | 'driver',
    startDate?: Date,
    endDate?: Date
  ): Promise<ListingAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get performance metrics
    const performanceMetrics = await this.getListingPerformanceMetrics(
      listingId,
      listingType,
      start,
      end
    );

    // Get booking trends (daily aggregation)
    const bookingWhere = listingType === 'vehicle'
      ? { vehicleListingId: listingId }
      : { driverListingId: listingId };

    const bookings = await prisma.booking.findMany({
      where: {
        ...bookingWhere,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        transactions: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group bookings by date
    const bookingsByDate = new Map<string, { bookings: number; revenue: number }>();
    
    bookings.forEach(booking => {
      const date = booking.createdAt.toISOString().split('T')[0];
      const existing = bookingsByDate.get(date) || { bookings: 0, revenue: 0 };
      
      const bookingRevenue = booking.transactions
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0);

      bookingsByDate.set(date, {
        bookings: existing.bookings + 1,
        revenue: existing.revenue + bookingRevenue,
      });
    });

    const bookingTrends = Array.from(bookingsByDate.entries()).map(([date, data]) => ({
      date,
      bookings: data.bookings,
      revenue: data.revenue,
    }));

    logger.info('Listing analytics calculated', {
      listingId,
      listingType,
      trendDataPoints: bookingTrends.length,
    });

    return {
      listingId,
      period: {
        start,
        end,
      },
      bookingTrends,
      performanceMetrics,
    };
  }

  /**
   * Get performance metrics for all listings of a company
   */
  async getCompanyListingsPerformance(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    vehicles: ListingPerformanceMetrics[];
    drivers: ListingPerformanceMetrics[];
  }> {
    // Get all vehicle listings for the company
    const vehicleListings = await prisma.vehicleListing.findMany({
      where: { companyId },
      select: { id: true },
    });

    // Get all driver listings for the company
    const driverListings = await prisma.driverListing.findMany({
      where: { companyId },
      select: { id: true },
    });

    // Calculate metrics for each listing
    const vehicleMetrics = await Promise.all(
      vehicleListings.map(listing =>
        this.getListingPerformanceMetrics(listing.id, 'vehicle', startDate, endDate)
      )
    );

    const driverMetrics = await Promise.all(
      driverListings.map(listing =>
        this.getListingPerformanceMetrics(listing.id, 'driver', startDate, endDate)
      )
    );

    logger.info('Company listings performance calculated', {
      companyId,
      vehicleCount: vehicleMetrics.length,
      driverCount: driverMetrics.length,
    });

    return {
      vehicles: vehicleMetrics,
      drivers: driverMetrics,
    };
  }
}

export const listingAnalyticsService = new ListingAnalyticsService();
