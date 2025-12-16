/**
 * Platform Configuration Types
 * Defines interfaces for platform-wide configuration management
 */

export interface PlatformConfigData {
  id: string;
  // Financial settings
  commissionRate: number;
  taxRate: number;
  bookingTimeoutHours: number;
  defaultCurrency: string;
  // Feature toggles
  withoutDriverListings: boolean;
  hourlyBookings: boolean;
  recurringBookings: boolean;
  instantBooking: boolean;
  // System settings
  maxBookingDuration: number;
  minBookingAdvance: number;
  autoApprovalEnabled: boolean;
  maintenanceMode: boolean;
  // Metadata
  version: number;
  isActive: boolean;
  activatedAt?: Date;
  activatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  geographicRestrictions: GeographicRestrictionData[];
  paymentMethodConfigs: PaymentMethodConfigData[];
  configurationHistory: ConfigurationHistoryData[];
}

export interface GeographicRestrictionData {
  id: string;
  configId: string;
  restrictionType: RestrictionType;
  region: string;
  regionType: RegionType;
  isBlocked: boolean;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethodConfigData {
  id: string;
  configId: string;
  paymentMethod: PaymentMethod;
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType: FeeType;
  supportedRegions: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationHistoryData {
  id: string;
  configId: string;
  version: number;
  changes: Record<string, any>;
  changeType: ChangeType;
  reason?: string;
  changedBy: string;
  rollbackTo?: string;
  createdAt: Date;
}

// Enums
export enum RestrictionType {
  BOOKING_BLOCKED = 'BOOKING_BLOCKED',
  LISTING_BLOCKED = 'LISTING_BLOCKED',
  PAYMENT_BLOCKED = 'PAYMENT_BLOCKED',
  FEATURE_DISABLED = 'FEATURE_DISABLED'
}

export enum RegionType {
  COUNTRY = 'COUNTRY',
  FYLKE = 'FYLKE',
  KOMMUNE = 'KOMMUNE'
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VIPPS = 'VIPPS',
  KLARNA = 'KLARNA',
  PAYPAL = 'PAYPAL',
  INVOICE = 'INVOICE'
}

export enum FeeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE'
}

export enum ChangeType {
  FEATURE_TOGGLE = 'FEATURE_TOGGLE',
  FINANCIAL_UPDATE = 'FINANCIAL_UPDATE',
  GEOGRAPHIC_RESTRICTION = 'GEOGRAPHIC_RESTRICTION',
  PAYMENT_CONFIG = 'PAYMENT_CONFIG',
  SYSTEM_SETTING = 'SYSTEM_SETTING',
  ROLLBACK = 'ROLLBACK'
}

// Configuration categories for grouping
export interface ConfigurationCategory {
  id: string;
  name: string;
  description: string;
  settings: ConfigurationSetting[];
}

export interface ConfigurationSetting {
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'number' | 'string' | 'array' | 'object';
  value: any;
  defaultValue: any;
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
  };
  category: string;
  sensitive?: boolean;
  requiresRestart?: boolean;
}

// Request/Response types for API
export interface CreatePlatformConfigRequest {
  commissionRate: number;
  taxRate: number;
  bookingTimeoutHours: number;
  defaultCurrency: string;
  withoutDriverListings: boolean;
  hourlyBookings: boolean;
  recurringBookings: boolean;
  instantBooking: boolean;
  maxBookingDuration: number;
  minBookingAdvance: number;
  autoApprovalEnabled: boolean;
  maintenanceMode: boolean;
  geographicRestrictions: CreateGeographicRestrictionRequest[];
  paymentMethodConfigs: CreatePaymentMethodConfigRequest[];
}

export interface CreateGeographicRestrictionRequest {
  restrictionType: RestrictionType;
  region: string;
  regionType: RegionType;
  isBlocked: boolean;
  reason?: string;
}

export interface CreatePaymentMethodConfigRequest {
  paymentMethod: PaymentMethod;
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  processingFee?: number;
  processingFeeType: FeeType;
  supportedRegions: string[];
  metadata?: Record<string, any>;
}

export interface UpdatePlatformConfigRequest {
  commissionRate?: number;
  taxRate?: number;
  bookingTimeoutHours?: number;
  defaultCurrency?: string;
  withoutDriverListings?: boolean;
  hourlyBookings?: boolean;
  recurringBookings?: boolean;
  instantBooking?: boolean;
  maxBookingDuration?: number;
  minBookingAdvance?: number;
  autoApprovalEnabled?: boolean;
  maintenanceMode?: boolean;
  reason?: string;
}

export interface ConfigurationDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
}

export interface RollbackConfigRequest {
  targetVersion: number;
  reason: string;
}