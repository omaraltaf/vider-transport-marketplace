/**
 * Client-side Feature Flags Utility
 * Provides feature flag checking and caching for the frontend
 */

export interface FeatureFlags {
  withoutDriverListings: boolean;
  hourlyBookings: boolean;
  recurringBookings: boolean;
  instantBooking: boolean;
  autoApprovalEnabled: boolean;
  maintenanceMode: boolean;
}

export interface FeatureFlagCache {
  flags: FeatureFlags;
  lastFetched: Date;
  configVersion: number;
}

class FeatureFlagService {
  private cache: FeatureFlagCache | null = null;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute
  private readonly API_BASE = '/api/platform-admin/config/features';

  /**
   * Get all feature flags with caching
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    try {
      // Check cache first
      if (this.cache && this.isCacheValid()) {
        return this.cache.flags;
      }

      // Fetch from API
      const response = await fetch(this.API_BASE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API response to feature flags format
      const flags: FeatureFlags = {
        withoutDriverListings: this.findFeatureState(data.features, 'without-driver-listings'),
        hourlyBookings: this.findFeatureState(data.features, 'hourly-bookings'),
        recurringBookings: this.findFeatureState(data.features, 'recurring-bookings'),
        instantBooking: this.findFeatureState(data.features, 'instant-booking'),
        autoApprovalEnabled: this.findFeatureState(data.features, 'auto-approval'),
        maintenanceMode: this.findFeatureState(data.features, 'maintenance-mode'),
      };

      // Update cache
      this.cache = {
        flags,
        lastFetched: new Date(),
        configVersion: data.configVersion || 1,
      };

      return flags;
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      
      // Return cached flags if available, otherwise default to false
      if (this.cache) {
        return this.cache.flags;
      }

      return this.getDefaultFlags();
    }
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(feature: keyof FeatureFlags): Promise<boolean> {
    try {
      const flags = await this.getFeatureFlags();
      return flags[feature] || false;
    } catch (error) {
      console.error(`Error checking feature ${feature}:`, error);
      return false;
    }
  }

  /**
   * Check multiple features at once
   */
  async checkFeatures(features: (keyof FeatureFlags)[]): Promise<Record<string, boolean>> {
    try {
      const flags = await this.getFeatureFlags();
      const results: Record<string, boolean> = {};
      
      features.forEach(feature => {
        results[feature] = flags[feature] || false;
      });

      return results;
    } catch (error) {
      console.error('Error checking multiple features:', error);
      const results: Record<string, boolean> = {};
      features.forEach(feature => {
        results[feature] = false;
      });
      return results;
    }
  }

  /**
   * Invalidate the cache to force fresh fetch
   */
  invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  getCacheInfo(): { cached: boolean; lastFetched?: Date; configVersion?: number } {
    if (!this.cache) {
      return { cached: false };
    }

    return {
      cached: true,
      lastFetched: this.cache.lastFetched,
      configVersion: this.cache.configVersion,
    };
  }

  /**
   * Subscribe to feature flag changes (polling-based)
   */
  subscribeToChanges(callback: (flags: FeatureFlags) => void, interval: number = 30000): () => void {
    let currentVersion = this.cache?.configVersion || 0;
    
    const checkForChanges = async () => {
      try {
        const flags = await this.getFeatureFlags();
        const newVersion = this.cache?.configVersion || 0;
        
        if (newVersion !== currentVersion) {
          currentVersion = newVersion;
          callback(flags);
        }
      } catch (error) {
        console.error('Error checking for feature flag changes:', error);
      }
    };

    const intervalId = setInterval(checkForChanges, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = new Date();
    const timeDiff = now.getTime() - this.cache.lastFetched.getTime();
    return timeDiff < this.CACHE_TTL;
  }

  /**
   * Find feature state from API response
   */
  private findFeatureState(features: any[], featureId: string): boolean {
    const feature = features.find(f => f.id === featureId);
    return feature ? feature.enabled : false;
  }

  /**
   * Get default feature flags (all disabled)
   */
  private getDefaultFlags(): FeatureFlags {
    return {
      withoutDriverListings: false,
      hourlyBookings: false,
      recurringBookings: false,
      instantBooking: false,
      autoApprovalEnabled: false,
      maintenanceMode: false,
    };
  }
}

// Create and export service instance
export const featureFlagService = new FeatureFlagService();

/**
 * React hook for using feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = React.useState<FeatureFlags | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadFlags = async () => {
      try {
        setLoading(true);
        setError(null);
        const featureFlags = await featureFlagService.getFeatureFlags();
        
        if (mounted) {
          setFlags(featureFlags);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load feature flags');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadFlags();

    // Subscribe to changes
    const unsubscribe = featureFlagService.subscribeToChanges((newFlags) => {
      if (mounted) {
        setFlags(newFlags);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { flags, loading, error, refetch: () => featureFlagService.invalidateCache() };
}

/**
 * React hook for checking a specific feature
 */
export function useFeature(feature: keyof FeatureFlags) {
  const { flags, loading, error } = useFeatureFlags();
  
  return {
    enabled: flags ? flags[feature] : false,
    loading,
    error,
  };
}

// Import React for hooks (this will be available in the frontend environment)
declare const React: any;