/**
 * Shared TypeScript Types
 * Common types used across the application
 */

export interface User {
  id: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER';
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  organizationNumber: string;
  businessAddress: string;
  city: string;
  postalCode: string;
  fylke: string;
  kommune: string;
  vatRegistered: boolean;
  description?: string;
  verified: boolean;
  verifiedAt?: string;
  aggregatedRating?: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleListing {
  id: string;
  companyId: string;
  title: string;
  description: string;
  vehicleType: string;
  capacity: number;
  fuelType: string;
  location: {
    city: string;
    fylke: string;
    kommune: string;
    coordinates?: [number, number];
  };
  pricing: {
    hourlyRate?: number;
    dailyRate?: number;
    deposit?: number;
    currency: string;
  };
  serviceOfferings: {
    withDriver: boolean;
    withDriverCost?: number;
    withDriverHourlyRate?: number;
    withDriverDailyRate?: number;
    withoutDriver: boolean;
  };
  photos: string[];
  tags: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  createdAt: string;
  updatedAt: string;
}

export interface DriverListing {
  id: string;
  companyId: string;
  name: string;
  licenseClass: string;
  languages: string[];
  backgroundSummary?: string;
  pricing: {
    hourlyRate?: number;
    dailyRate?: number;
    currency: string;
  };
  verified: boolean;
  verifiedAt?: string;
  aggregatedRating?: number;
  totalRatings: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  renterCompanyId: string;
  providerCompanyId: string;
  vehicleListingId?: string;
  driverListingId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'CLOSED';
  startDate: string;
  endDate: string;
  duration: {
    hours?: number;
    days?: number;
  };
  costs: {
    providerRate: number;
    platformCommission: number;
    platformCommissionRate: number;
    taxes: number;
    taxRate: number;
    total: number;
    currency: string;
  };
  contractPdfPath?: string;
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  type: 'BOOKING_PAYMENT' | 'REFUND' | 'COMMISSION';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
}

export interface BillingDocument {
  bookingId: string;
  bookingNumber: string;
  documentType: 'invoice' | 'receipt';
  documentNumber: string;
  issueDate: string;
  amount: number;
  currency: string;
  status: string;
  path: string;
}

export interface Rating {
  id: string;
  bookingId: string;
  renterCompanyId: string;
  providerCompanyId: string;
  driverListingId?: string;
  companyStars: number;
  companyReview?: string;
  driverStars?: number;
  driverReview?: string;
  providerResponse?: string;
  providerRespondedAt?: string;
  createdAt: string;
  updatedAt: string;
  renterCompany?: {
    id: string;
    name: string;
  };
  providerCompany?: {
    id: string;
    name: string;
  };
  driverListing?: {
    id: string;
    name: string;
  };
  booking?: {
    id: string;
    bookingNumber: string;
    startDate: string;
    endDate: string;
  };
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  readBy: string[];
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface MessageThread {
  id: string;
  bookingId: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    bookingNumber: string;
    status: string;
    renterCompany: {
      id: string;
      name: string;
    };
    providerCompany: {
      id: string;
      name: string;
    };
  };
  messages?: Message[];
}

export interface NotificationPreferences {
  id?: string;
  userId?: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  bookingUpdates: boolean;
  messages: boolean;
  ratings: boolean;
  marketing: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type NotificationType =
  | 'BOOKING_REQUEST'
  | 'BOOKING_ACCEPTED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_COMPLETED'
  | 'MESSAGE_RECEIVED'
  | 'RATING_RECEIVED'
  | 'COMPANY_VERIFIED'
  | 'DRIVER_VERIFIED'
  | 'LISTING_SUSPENDED'
  | 'DISPUTE_RAISED'
  | 'DISPUTE_RESOLVED'
  | 'AVAILABILITY_CONFLICT'
  | 'BOOKING_REJECTED_BLOCKED_DATES';

export type NotificationChannel = 'EMAIL' | 'IN_APP';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: string;
  reason: string;
  description?: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolution?: string;
  refundAmount?: number;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}
