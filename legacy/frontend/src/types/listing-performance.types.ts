/**
 * Types for listing performance metrics
 */

export interface ListingPerformanceMetrics {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  utilizationRate: number;
  bookingConversionRate: number;
  averageRating: number | null;
  totalReviews: number;
}