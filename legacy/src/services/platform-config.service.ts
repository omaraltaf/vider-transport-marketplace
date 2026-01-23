import { PrismaClient } from '@prisma/client';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';
import { getDatabaseClient } from '../config/database';

const prisma = getDatabaseClient();

export interface PlatformConfigValue {
  id: string;
  category: string;
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'select' | 'json';
  displayName: string;
  description?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
  };
  isEditable: boolean;
  requiresRestart: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface PlatformConfigUpdate {
  value: any;
  updatedBy?: string;
}

class PlatformConfigService {
  private readonly CACHE_PREFIX = 'platform_config:';
  private readonly CACHE_TTL = 3600; // 1 hour

  async getConfiguration(): Promise<any> {
    const configs = await this.getAllConfigs();
    
    // Convert array of configs to a single object with properties
    const configObject: any = {};
    
    configs.forEach(config => {
      // Convert key to camelCase property name
      const propertyName = this.keyToCamelCase(config.key);
      configObject[propertyName] = config.value;
      
      // Also add metadata
      configObject.id = config.id;
      configObject.version = 1; // Default version
      configObject.updatedAt = config.updatedAt;
      configObject.activatedBy = config.updatedBy;
    });

    // Set default values for expected properties
    configObject.withoutDriverListings = configObject.withoutDriverListings ?? true;
    configObject.hourlyBookings = configObject.hourlyBookings ?? true;
    configObject.recurringBookings = configObject.recurringBookings ?? true;
    configObject.instantBooking = configObject.instantBooking ?? false;
    configObject.autoApprovalEnabled = configObject.autoApprovalEnabled ?? false;
    configObject.maintenanceMode = configObject.maintenanceMode ?? false;

    return configObject;
  }

  private keyToCamelCase(key: string): string {
    return key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  async getConfigurationById(id: string): Promise<PlatformConfigValue | null> {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const config = await prisma.platformConfigs.findUnique({
          where: { id }
        });

        return config ? this.transformConfig(config) : null;
      },
      this.CACHE_TTL
    );
  }

  async updateConfiguration(
    updates: Array<{ key: string; value: any }> | { [key: string]: any },
    updatedBy?: string
  ): Promise<any> {
    // Handle both array and object formats
    let updateArray: Array<{ key: string; value: any }>;
    
    if (Array.isArray(updates)) {
      updateArray = updates;
    } else {
      updateArray = Object.entries(updates).map(([key, value]) => ({ key, value }));
    }

    await this.updateMultipleConfigs(updateArray, updatedBy);
    
    // Return the updated configuration object
    return this.getConfiguration();
  }

  async getAllConfigs(): Promise<PlatformConfigValue[]> {
    const cacheKey = `${this.CACHE_PREFIX}all`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const configs = await prisma.platformConfigs.findMany({
          orderBy: [
            { category: 'asc' },
            { displayName: 'asc' }
          ]
        });

        return configs.map(this.transformConfig);
      },
      this.CACHE_TTL
    );
  }

  async getConfigsByCategory(category: string): Promise<PlatformConfigValue[]> {
    const cacheKey = `${this.CACHE_PREFIX}category:${category}`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const configs = await prisma.platformConfigs.findMany({
          where: { category },
          orderBy: { displayName: 'asc' }
        });

        return configs.map(this.transformConfig);
      },
      this.CACHE_TTL
    );
  }

  async getConfig(key: string): Promise<PlatformConfigValue | null> {
    const cacheKey = `${this.CACHE_PREFIX}key:${key}`;
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const config = await prisma.platformConfigs.findUnique({
          where: { key }
        });

        return config ? this.transformConfig(config) : null;
      },
      this.CACHE_TTL
    );
  }

  async getConfigValue<T = any>(key: string): Promise<T | null> {
    const config = await this.getConfig(key);
    return config ? config.value : null;
  }

  async updateConfig(key: string, update: PlatformConfigUpdate): Promise<PlatformConfigValue> {
    try {
      // Validate the update
      const existingConfig = await prisma.platformConfigs.findUnique({
        where: { key }
      });

      if (!existingConfig) {
        throw new Error(`Configuration key '${key}' not found`);
      }

      if (!existingConfig.isEditable) {
        throw new Error(`Configuration key '${key}' is not editable`);
      }

      // Validate the value based on the config's validation rules
      this.validateConfigValue(existingConfig, update.value);

      // Update the configuration
      const updatedConfig = await prisma.platformConfigs.update({
        where: { key },
        data: {
          value: update.value,
          updatedAt: new Date(),
          updatedBy: update.updatedBy,
        }
      });

      // Invalidate cache
      await this.invalidateConfigCache(key, existingConfig.category);

      logger.info(`Platform configuration updated: ${key}`, {
        key,
        oldValue: existingConfig.value,
        newValue: update.value,
        updatedBy: update.updatedBy,
      });

      return this.transformConfig(updatedConfig);
    } catch (error) {
      logger.error(`Failed to update platform configuration: ${key}`, error);
      throw error;
    }
  }

  async updateMultipleConfigs(
    updates: Array<{ key: string; value: any }>,
    updatedBy?: string
  ): Promise<PlatformConfigValue[]> {
    const results: PlatformConfigValue[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateConfig(update.key, {
          value: update.value,
          updatedBy,
        });
        results.push(result);
      } catch (error) {
        logger.error(`Failed to update config ${update.key}:`, error);
        throw error;
      }
    }

    return results;
  }

  async getConfigHistory(key: string, limit = 10): Promise<any[]> {
    // This would require a separate configuration history table
    // For now, return empty array
    return [];
  }

  async resetConfigToDefault(key: string, updatedBy?: string): Promise<PlatformConfigValue> {
    // This would require storing default values
    // For now, throw an error
    throw new Error('Reset to default not implemented yet');
  }

  private transformConfig(config: any): PlatformConfigValue {
    return {
      id: config.id,
      category: config.category,
      key: config.key,
      value: config.value,
      dataType: config.dataType,
      displayName: config.displayName,
      description: config.description,
      options: config.options,
      validation: config.validation,
      isEditable: config.isEditable,
      requiresRestart: config.requiresRestart,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  }

  private validateConfigValue(config: any, value: any): void {
    const validation = config.validation;
    if (!validation) return;

    if (validation.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Configuration '${config.key}' is required`);
    }

    switch (config.dataType) {
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Configuration '${config.key}' must be a number`);
        }
        if (validation.min !== undefined && value < validation.min) {
          throw new Error(`Configuration '${config.key}' must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && value > validation.max) {
          throw new Error(`Configuration '${config.key}' must be at most ${validation.max}`);
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Configuration '${config.key}' must be a string`);
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            throw new Error(`Configuration '${config.key}' does not match required pattern`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Configuration '${config.key}' must be a boolean`);
        }
        break;

      case 'select':
        if (config.options && !config.options.includes(value)) {
          throw new Error(`Configuration '${config.key}' must be one of: ${config.options.join(', ')}`);
        }
        break;
    }
  }

  private async invalidateConfigCache(key: string, category: string): Promise<void> {
    await Promise.all([
      cacheService.del(`${this.CACHE_PREFIX}key:${key}`),
      cacheService.del(`${this.CACHE_PREFIX}category:${category}`),
      cacheService.del(`${this.CACHE_PREFIX}all`),
    ]);
  }
}

export const platformConfigService = new PlatformConfigService();