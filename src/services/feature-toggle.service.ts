/**
 * Feature Toggle Service
 * Provides cached feature toggle checking with performance optimization
 */

import { platformConfigService } from './platform-config.service';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';
import { logError } from '../utils/logging.utils';

export interface FeatureState {
  enabled: boolean;
  lastChecked: Date;
  configVersion: number;
}

export interface FeatureToggleCache {
  [key: string]: FeatureState;
}

export class FeatureToggleService {
  private cache: FeatureToggleCache = {};
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds
  private lastConfigVersion: number = 0;

  /**
   * Check if a feature is enabled with caching
   */
  async isFeatureEnabled(feature: FeatureToggle): Promise<boolean> {
    try {
      // Check cache first
      const cachedState = this.cache[feature];
      if (cachedState && this.isCacheValid(cachedState)) {
        return cachedState.enabled;
      }

      // Fetch fresh configuration
      const config = await platformConfigService.getConfiguration();
      if (!config) {
        return false;
      }

      // Update cache
      const enabled = (config as any)[feature] || false;
      this.cache[feature] = {
        enabled,
        lastChecked: new Date(),
        configVersion: config.version,
      };

      this.lastConfigVersion = config.version;
      return enabled;
    } catch (error) {
      console.error(`Error checking feature toggle ${feature}:`, error);
      
      // Return cached value if available, otherwise false
      const cachedState = this.cache[feature];
      return cachedState ? cachedState.enabled : false;
    }
  }

  /**
   * Get all feature states with caching
   */
  async getAllFeatureStates(): Promise<Record<string, boolean>> {
    try {
      const config = await platformConfigService.getConfiguration();
      if (!config) {
        return this.getCachedStates();
      }

      // Check if we need to invalidate cache due to version change
      if (config.version !== this.lastConfigVersion) {
        this.invalidateCache();
        this.lastConfigVersion = config.version;
      }

      const states = {
        [FeatureToggle.WITHOUT_DRIVER_LISTINGS]: config.withoutDriverListings,
        [FeatureToggle.HOURLY_BOOKINGS]: config.hourlyBookings,
        [FeatureToggle.RECURRING_BOOKINGS]: config.recurringBookings,
        [FeatureToggle.INSTANT_BOOKING]: config.instantBooking,
        [FeatureToggle.AUTO_APPROVAL]: config.autoApprovalEnabled,
        [FeatureToggle.MAINTENANCE_MODE]: config.maintenanceMode,
      };

      // Update cache for all features
      Object.entries(states).forEach(([feature, enabled]) => {
        this.cache[feature] = {
          enabled,
          lastChecked: new Date(),
          configVersion: config.version,
        };
      });

      return states;
    } catch (error) {
      console.error('Error getting all feature states:', error);
      return this.getCachedStates();
    }
  }

  /**
   * Check multiple features at once
   */
  async checkFeatures(features: FeatureToggle[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Use Promise.all for parallel checking
    const checks = features.map(async (feature) => {
      const enabled = await this.isFeatureEnabled(feature);
      return { feature, enabled };
    });

    const resolvedChecks = await Promise.all(checks);
    resolvedChecks.forEach(({ feature, enabled }) => {
      results[feature] = enabled;
    });

    return results;
  }

  /**
   * Preload all feature states into cache
   */
  async preloadFeatures(): Promise<void> {
    try {
      await this.getAllFeatureStates();
    } catch (error) {
      console.error('Error preloading features:', error);
    }
  }

  /**
   * Invalidate the entire cache
   */
  invalidateCache(): void {
    this.cache = {};
  }

  /**
   * Invalidate cache for a specific feature
   */
  invalidateFeature(feature: FeatureToggle): void {
    delete this.cache[feature];
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    totalFeatures: number;
    cachedFeatures: number;
    cacheHitRate: number;
    lastConfigVersion: number;
  } {
    const totalFeatures = Object.keys(FeatureToggle).length;
    const cachedFeatures = Object.keys(this.cache).length;
    const cacheHitRate = cachedFeatures > 0 ? cachedFeatures / totalFeatures : 0;

    return {
      totalFeatures,
      cachedFeatures,
      cacheHitRate,
      lastConfigVersion: this.lastConfigVersion,
    };
  }

  /**
   * Check if cached state is still valid
   */
  private isCacheValid(state: FeatureState): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - state.lastChecked.getTime();
    return timeDiff < this.CACHE_TTL;
  }

  /**
   * Get cached states as fallback
   */
  private getCachedStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    Object.entries(this.cache).forEach(([feature, state]) => {
      states[feature] = state.enabled;
    });
    return states;
  }
}

// Create and export service instance
export const featureToggleService = new FeatureToggleService();

// Preload features on startup
featureToggleService.preloadFeatures().catch(error => {
  console.error('Failed to preload features on startup:', error);
});