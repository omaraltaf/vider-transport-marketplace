/**
 * Region-Specific Configuration Service
 * Manages feature configurations that vary by geographic region
 */

import { PrismaClient, RegionType } from '@prisma/client';
import { getDatabaseClient } from '../config/database';
import { logError } from '../utils/logging.utils';
import { FeatureToggle } from '../middleware/feature-toggle.middleware';

const prisma = getDatabaseClient();

export interface RegionSpecificFeatureConfig {
  id: string;
  configId: string;
  region: string;
  regionType: RegionType;
  featureOverrides: Record<string, any>;
  priority: number; // Higher priority overrides lower priority
  enabled: boolean;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRegionConfigRequest {
  region: string;
  regionType: RegionType;
  featureOverrides: Record<string, any>;
  priority?: number;
  enabled?: boolean;
  reason?: string;
}

export interface UpdateRegionConfigRequest {
  region?: string;
  regionType?: RegionType;
  featureOverrides?: Record<string, any>;
  priority?: number;
  enabled?: boolean;
  reason?: string;
}

export interface RegionConfigQuery {
  region?: string;
  regionType?: RegionType;
  enabled?: boolean;
}

export interface FeatureAvailabilityResult {
  feature: string;
  available: boolean;
  value: any;
  source: 'global' | 'region';
  region?: string;
  regionType?: RegionType;
  priority?: number;
}

export class RegionSpecificConfigService {
  private configCache: Map<string, RegionSpecificFeatureConfig[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a region-specific configuration
   */
  async createRegionConfig(
    configId: string,
    data: CreateRegionConfigRequest
  ): Promise<RegionSpecificFeatureConfig> {
    try {
      // For now, we'll store this in memory since we don't have a dedicated table
      // In a real implementation, this would be stored in a RegionSpecificConfig table
      const regionConfig: RegionSpecificFeatureConfig = {
        id: this.generateId(),
        configId,
        region: data.region,
        regionType: data.regionType,
        featureOverrides: data.featureOverrides,
        priority: data.priority || 1,
        enabled: data.enabled ?? true,
        reason: data.reason,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in cache
      const cacheKey = `config:${configId}`;
      const existingConfigs = this.configCache.get(cacheKey) || [];
      existingConfigs.push(regionConfig);
      this.configCache.set(cacheKey, existingConfigs);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return regionConfig;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to create region-specific configuration');
    }
  }

  /**
   * Get region-specific configurations
   */
  async getRegionConfigs(
    configId: string,
    query?: RegionConfigQuery
  ): Promise<RegionSpecificFeatureConfig[]> {
    try {
      const cacheKey = `config:${configId}`;
      let configs = this.configCache.get(cacheKey) || [];

      // Apply filters
      if (query?.region) {
        configs = configs.filter(c => 
          c.region.toLowerCase().includes(query.region!.toLowerCase())
        );
      }
      if (query?.regionType) {
        configs = configs.filter(c => c.regionType === query.regionType);
      }
      if (query?.enabled !== undefined) {
        configs = configs.filter(c => c.enabled === query.enabled);
      }

      // Sort by priority (higher first) then by region
      configs.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.region.localeCompare(b.region);
      });

      return configs;
    } catch (error) {
      logError({ error: error as Error });
      return [];
    }
  }

  /**
   * Update a region-specific configuration
   */
  async updateRegionConfig(
    configId: string,
    regionConfigId: string,
    data: UpdateRegionConfigRequest
  ): Promise<RegionSpecificFeatureConfig> {
    try {
      const cacheKey = `config:${configId}`;
      const configs = this.configCache.get(cacheKey) || [];
      const configIndex = configs.findIndex(c => c.id === regionConfigId);

      if (configIndex === -1) {
        throw new Error('Region-specific configuration not found');
      }

      configs[configIndex] = {
        ...configs[configIndex],
        ...data,
        updatedAt: new Date()
      };

      this.configCache.set(cacheKey, configs);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return configs[configIndex];
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to update region-specific configuration');
    }
  }

  /**
   * Delete a region-specific configuration
   */
  async deleteRegionConfig(configId: string, regionConfigId: string): Promise<void> {
    try {
      const cacheKey = `config:${configId}`;
      const configs = this.configCache.get(cacheKey) || [];
      const filteredConfigs = configs.filter(c => c.id !== regionConfigId);

      this.configCache.set(cacheKey, filteredConfigs);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to delete region-specific configuration');
    }
  }

  /**
   * Get effective feature configuration for a specific region
   */
  async getEffectiveFeatureConfig(
    configId: string,
    region: string,
    regionType: RegionType,
    globalConfig: Record<string, any>
  ): Promise<Record<string, FeatureAvailabilityResult>> {
    try {
      const regionConfigs = await this.getRegionConfigs(configId, { enabled: true });

      // Find applicable region configs (exact match and parent regions)
      const applicableConfigs = regionConfigs.filter(config => {
        // Exact match
        if (config.region.toLowerCase() === region.toLowerCase() && config.regionType === regionType) {
          return true;
        }

        // Parent region match (e.g., country config applies to fylke/kommune in that country)
        if (regionType === RegionType.KOMMUNE || regionType === RegionType.FYLKE) {
          if (config.regionType === RegionType.COUNTRY) {
            // This is a simplified check - in reality, you'd need a proper region hierarchy
            return true;
          }
        }
        if (regionType === RegionType.KOMMUNE && config.regionType === RegionType.FYLKE) {
          // Check if kommune is in the fylke
          return true;
        }

        return false;
      });

      // Sort by priority and specificity (more specific regions override less specific)
      applicableConfigs.sort((a, b) => {
        // First by priority
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        
        // Then by specificity (kommune > fylke > country)
        const specificityOrder = { [RegionType.KOMMUNE]: 3, [RegionType.FYLKE]: 2, [RegionType.COUNTRY]: 1 };
        return specificityOrder[b.regionType] - specificityOrder[a.regionType];
      });

      // Build effective configuration
      const effectiveConfig: Record<string, FeatureAvailabilityResult> = {};

      // Start with global configuration
      Object.keys(globalConfig).forEach(feature => {
        effectiveConfig[feature] = {
          feature,
          available: globalConfig[feature],
          value: globalConfig[feature],
          source: 'global'
        };
      });

      // Apply region-specific overrides
      applicableConfigs.forEach(config => {
        Object.keys(config.featureOverrides).forEach(feature => {
          effectiveConfig[feature] = {
            feature,
            available: config.featureOverrides[feature],
            value: config.featureOverrides[feature],
            source: 'region',
            region: config.region,
            regionType: config.regionType,
            priority: config.priority
          };
        });
      });

      return effectiveConfig;
    } catch (error) {
      logError({ error: error as Error });
      return {};
    }
  }

  /**
   * Check if a specific feature is available in a region
   */
  async isFeatureAvailableInRegion(
    configId: string,
    feature: string,
    region: string,
    regionType: RegionType,
    globalValue: any
  ): Promise<FeatureAvailabilityResult> {
    try {
      const globalConfig = { [feature]: globalValue };
      const effectiveConfig = await this.getEffectiveFeatureConfig(
        configId,
        region,
        regionType,
        globalConfig
      );

      return effectiveConfig[feature] || {
        feature,
        available: globalValue,
        value: globalValue,
        source: 'global'
      };
    } catch (error) {
      logError({ error: error as Error });
      return {
        feature,
        available: globalValue,
        value: globalValue,
        source: 'global'
      };
    }
  }

  /**
   * Bulk create region configurations
   */
  async bulkCreateRegionConfigs(
    configId: string,
    configs: CreateRegionConfigRequest[]
  ): Promise<RegionSpecificFeatureConfig[]> {
    try {
      const createdConfigs: RegionSpecificFeatureConfig[] = [];

      for (const configData of configs) {
        const regionConfig = await this.createRegionConfig(configId, configData);
        createdConfigs.push(regionConfig);
      }

      return createdConfigs;
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to bulk create region configurations');
    }
  }

  /**
   * Get region configuration statistics
   */
  async getRegionConfigStats(configId: string): Promise<{
    totalConfigs: number;
    enabledConfigs: number;
    configsByRegionType: Record<RegionType, number>;
    configsByPriority: Record<number, number>;
    mostOverriddenFeatures: Array<{ feature: string; count: number }>;
  }> {
    try {
      const configs = await this.getRegionConfigs(configId);

      const totalConfigs = configs.length;
      const enabledConfigs = configs.filter(c => c.enabled).length;

      // Configs by region type
      const configsByRegionType: Record<RegionType, number> = {
        [RegionType.COUNTRY]: 0,
        [RegionType.FYLKE]: 0,
        [RegionType.KOMMUNE]: 0
      };
      configs.forEach(config => {
        configsByRegionType[config.regionType]++;
      });

      // Configs by priority
      const configsByPriority: Record<number, number> = {};
      configs.forEach(config => {
        configsByPriority[config.priority] = (configsByPriority[config.priority] || 0) + 1;
      });

      // Most overridden features
      const featureCounts: Record<string, number> = {};
      configs.forEach(config => {
        Object.keys(config.featureOverrides).forEach(feature => {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        });
      });

      const mostOverriddenFeatures = Object.entries(featureCounts)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalConfigs,
        enabledConfigs,
        configsByRegionType,
        configsByPriority,
        mostOverriddenFeatures
      };
    } catch (error) {
      logError({ error: error as Error });
      throw new Error('Failed to get region configuration statistics');
    }
  }

  /**
   * Validate region configuration
   */
  validateRegionConfig(data: CreateRegionConfigRequest): string[] {
    const errors: string[] = [];

    if (!data.region || data.region.trim().length === 0) {
      errors.push('Region is required');
    }

    if (!data.regionType) {
      errors.push('Region type is required');
    }

    if (!data.featureOverrides || Object.keys(data.featureOverrides).length === 0) {
      errors.push('At least one feature override must be specified');
    }

    if (data.priority !== undefined && (data.priority < 1 || data.priority > 100)) {
      errors.push('Priority must be between 1 and 100');
    }

    return errors;
  }

  /**
   * Clear cache for a configuration
   */
  clearCache(configId: string): void {
    const cacheKey = `config:${configId}`;
    this.configCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.configCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `region-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export service instance
export const regionSpecificConfigService = new RegionSpecificConfigService();