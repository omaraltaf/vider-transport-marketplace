/**
 * Platform Configuration Service
 * Manages platform-wide configuration settings with validation, caching, and versioning
 */

import { PrismaClient, PlatformConfig } from '@prisma/client';
import { 
  UpdatePlatformConfigRequest,
  ChangeType
} from '../types/platform-config.types.js';
import { prisma } from '../config/database';

export class PlatformConfigService {
  private configCache: PlatformConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // No need for prisma parameter since we import it directly
  }

  /**
   * Get the current active platform configuration
   */
  async getConfiguration(): Promise<PlatformConfig | null> {
    // Check cache first
    if (this.isConfigCached()) {
      return this.configCache;
    }

    const config = await prisma.platformConfig.findFirst({
      where: { isActive: true }
    });

    if (config) {
      this.cacheConfig(config);
    }

    return config;
  }

  /**
   * Get configuration by ID
   */
  async getConfigurationById(id: string): Promise<PlatformConfig | null> {
    const config = await prisma.platformConfig.findUnique({
      where: { id }
    });

    return config;
  }

  /**
   * Create or get default platform configuration
   */
  async getOrCreateDefaultConfiguration(): Promise<PlatformConfig> {
    let config = await this.getConfiguration();
    
    if (!config) {
      // Create default configuration
      config = await prisma.platformConfig.create({
        data: {
          commissionRate: 0.15,
          taxRate: 0.25,
          bookingTimeoutHours: 24,
          defaultCurrency: 'NOK',
          withoutDriverListings: true,
          hourlyBookings: true,
          recurringBookings: true,
          instantBooking: false,
          maxBookingDuration: 30,
          minBookingAdvance: 2,
          autoApprovalEnabled: false,
          maintenanceMode: false,
          version: 1,
          isActive: true,
          activatedAt: new Date()
        }
      });
      
      this.cacheConfig(config);
    }
    
    return config;
  }

  /**
   * Update platform configuration
   */
  async updateConfiguration(
    updates: UpdatePlatformConfigRequest, 
    adminUserId: string
  ): Promise<PlatformConfig> {
    const currentConfig = await this.getOrCreateDefaultConfiguration();

    // Validate updates
    this.validateConfigurationUpdates(updates);

    // Prepare update data (exclude reason from database update)
    const { reason, ...updateData } = updates;

    // Update configuration
    const updatedConfig = await prisma.platformConfig.update({
      where: { id: currentConfig.id },
      data: {
        ...updateData,
        version: currentConfig.version + 1,
        updatedAt: new Date()
      }
    });

    // Clear cache
    this.clearCache();

    return updatedConfig;
  }





  /**
   * Validate configuration updates
   */
  private validateConfigurationUpdates(updates: UpdatePlatformConfigRequest): void {
    if (updates.commissionRate !== undefined && (updates.commissionRate < 0 || updates.commissionRate > 1)) {
      throw new Error('Commission rate must be between 0 and 1');
    }
    
    if (updates.taxRate !== undefined && (updates.taxRate < 0 || updates.taxRate > 1)) {
      throw new Error('Tax rate must be between 0 and 1');
    }
    
    if (updates.bookingTimeoutHours !== undefined && (updates.bookingTimeoutHours < 1 || updates.bookingTimeoutHours > 168)) {
      throw new Error('Booking timeout must be between 1 and 168 hours');
    }
  }

  /**
   * Cache management methods
   */
  private isConfigCached(): boolean {
    return this.configCache !== null && Date.now() < this.cacheExpiry;
  }

  private cacheConfig(config: PlatformConfig): void {
    this.configCache = config;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }

  private clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = 0;
  }
}

// Create and export service instance
export const platformConfigService = new PlatformConfigService();