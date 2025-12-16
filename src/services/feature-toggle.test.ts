/**
 * Feature Toggle Service Tests
 * Tests for feature toggle enforcement and caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { featureToggleService } from './feature-toggle.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';
import { platformConfigService } from './platform-config.service';

// Mock the platform config service
vi.mock('./platform-config.service', () => ({
  platformConfigService: {
    getConfiguration: vi.fn(),
  },
}));

describe('FeatureToggleService', () => {
  beforeEach(() => {
    // Clear cache before each test
    featureToggleService.invalidateCache();
    vi.clearAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', async () => {
      // Mock configuration with feature enabled
      const mockConfig = {
        id: 'test-config',
        version: 1,
        withoutDriverListings: true,
        hourlyBookings: true,
        recurringBookings: false,
        instantBooking: false,
        autoApprovalEnabled: false,
        maintenanceMode: false,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      const result = await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      expect(result).toBe(true);
    });

    it('should return false when feature is disabled', async () => {
      const mockConfig = {
        id: 'test-config',
        version: 1,
        withoutDriverListings: true,
        hourlyBookings: false,
        recurringBookings: false,
        instantBooking: false,
        autoApprovalEnabled: false,
        maintenanceMode: false,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      const result = await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      expect(result).toBe(false);
    });

    it('should return false when configuration is not available', async () => {
      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(null);

      const result = await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      expect(result).toBe(false);
    });

    it('should use cached value on subsequent calls', async () => {
      const mockConfig = {
        id: 'test-config',
        version: 1,
        withoutDriverListings: true,
        hourlyBookings: true,
        recurringBookings: false,
        instantBooking: false,
        autoApprovalEnabled: false,
        maintenanceMode: false,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      // First call
      await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      
      // Second call should use cache
      const result = await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      
      expect(result).toBe(true);
      expect(platformConfigService.getConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllFeatureStates', () => {
    it('should return all feature states', async () => {
      const mockConfig = {
        id: 'test-config',
        version: 1,
        withoutDriverListings: true,
        hourlyBookings: true,
        recurringBookings: false,
        instantBooking: false,
        autoApprovalEnabled: true,
        maintenanceMode: false,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      const result = await featureToggleService.getAllFeatureStates();
      
      expect(result).toEqual({
        [FeatureToggle.WITHOUT_DRIVER_LISTINGS]: true,
        [FeatureToggle.HOURLY_BOOKINGS]: true,
        [FeatureToggle.RECURRING_BOOKINGS]: false,
        [FeatureToggle.INSTANT_BOOKING]: false,
        [FeatureToggle.AUTO_APPROVAL]: true,
        [FeatureToggle.MAINTENANCE_MODE]: false,
      });
    });
  });

  describe('checkFeatures', () => {
    it('should check multiple features at once', async () => {
      const mockConfig = {
        id: 'test-config',
        version: 1,
        withoutDriverListings: true,
        hourlyBookings: true,
        recurringBookings: false,
        instantBooking: false,
        autoApprovalEnabled: false,
        maintenanceMode: false,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      const result = await featureToggleService.checkFeatures([
        FeatureToggle.HOURLY_BOOKINGS,
        FeatureToggle.RECURRING_BOOKINGS,
        FeatureToggle.WITHOUT_DRIVER_LISTINGS,
      ]);

      expect(result).toEqual({
        [FeatureToggle.HOURLY_BOOKINGS]: true,
        [FeatureToggle.RECURRING_BOOKINGS]: false,
        [FeatureToggle.WITHOUT_DRIVER_LISTINGS]: true,
      });
    });
  });

  describe('cache management', () => {
    it('should invalidate cache when version changes', async () => {
      const mockConfig1 = {
        id: 'test-config',
        version: 1,
        hourlyBookings: true,
      };

      const mockConfig2 = {
        id: 'test-config',
        version: 2,
        hourlyBookings: false,
      };

      vi.mocked(platformConfigService.getConfiguration)
        .mockResolvedValueOnce(mockConfig1 as any)
        .mockResolvedValueOnce(mockConfig2 as any);

      // First call with version 1
      await featureToggleService.getAllFeatureStates();
      
      // Second call with version 2 should invalidate cache
      const result = await featureToggleService.getAllFeatureStates();
      
      expect(result[FeatureToggle.HOURLY_BOOKINGS]).toBe(false);
      expect(platformConfigService.getConfiguration).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', async () => {
      const mockConfig = {
        id: 'test-config',
        version: 1,
        hourlyBookings: true,
      };

      vi.mocked(platformConfigService.getConfiguration).mockResolvedValue(mockConfig as any);

      await featureToggleService.isFeatureEnabled(FeatureToggle.HOURLY_BOOKINGS);
      
      const stats = featureToggleService.getCacheStats();
      
      expect(stats.cachedFeatures).toBeGreaterThan(0);
      expect(stats.lastConfigVersion).toBe(1);
    });
  });
});