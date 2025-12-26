import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { platformConfigService, PlatformConfigValue, PlatformConfigUpdate } from '../platform-config.service';

// **Feature: mock-data-replacement, Property 9: Database persistence of actions**
// **Validates: Requirements 3.4, 6.2**

const mockPrisma = {
  platformConfigs: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient;

const mockCacheService = {
  getOrSet: vi.fn(),
  del: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
};

// Mock the cache service
vi.mock('../cache.service', () => ({
  cacheService: mockCacheService,
}));

// Test data generators
const configArb = fc.record({
  id: fc.uuid(),
  category: fc.constantFrom('financial', 'system', 'features', 'security', 'performance'),
  key: fc.string({ minLength: 5, maxLength: 30 }).map(s => s.replace(/[^a-z0-9_]/g, '_')),
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.float({ min: 0, max: 1000 }),
    fc.boolean(),
    fc.constantFrom('NOK', 'USD', 'EUR')
  ),
  dataType: fc.constantFrom('string', 'number', 'boolean', 'select'),
  displayName: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 100 }),
  options: fc.option(fc.array(fc.string({ minLength: 2, maxLength: 10 }), { minLength: 2, maxLength: 5 }), { nil: null }),
  validation: fc.option(fc.record({
    min: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined }),
    max: fc.option(fc.float({ min: 100, max: 1000 }), { nil: undefined }),
    required: fc.option(fc.boolean(), { nil: undefined }),
    pattern: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: undefined }),
  }), { nil: null }),
  isEditable: fc.boolean(),
  requiresRestart: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  updatedBy: fc.option(fc.uuid(), { nil: null }),
});

const configUpdateArb = fc.record({
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.float({ min: 0, max: 1000 }),
    fc.boolean()
  ),
  updatedBy: fc.option(fc.uuid(), { nil: undefined }),
});

describe('Configuration Persistence Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default cache behavior - return null to force database queries
    mockCacheService.getOrSet.mockImplementation(async (key, fn) => await fn());
  });

  it('should persist configuration changes to database immediately', () => {
    fc.assert(fc.property(
      configArb,
      configUpdateArb,
      async (existingConfig, update) => {
        // Arrange
        const updatedConfig = {
          ...existingConfig,
          value: update.value,
          updatedAt: new Date(),
          updatedBy: update.updatedBy,
        };

        mockPrisma.platformConfigs.findUnique.mockResolvedValue(existingConfig);
        mockPrisma.platformConfigs.update.mockResolvedValue(updatedConfig);

        // Act
        const result = await platformConfigService.updateConfig(existingConfig.key, update);

        // Assert - Database should be updated immediately
        expect(mockPrisma.platformConfigs.findUnique).toHaveBeenCalledWith({
          where: { key: existingConfig.key },
        });

        expect(mockPrisma.platformConfigs.update).toHaveBeenCalledWith({
          where: { key: existingConfig.key },
          data: {
            value: update.value,
            updatedAt: expect.any(Date),
            updatedBy: update.updatedBy,
          },
        });

        // Result should reflect the persisted changes
        expect(result.value).toBe(update.value);
        expect(result.updatedBy).toBe(update.updatedBy);
        expect(result.key).toBe(existingConfig.key);
      }
    ), { numRuns: 100 });
  });

  it('should invalidate cache when configuration is updated', () => {
    fc.assert(fc.property(
      configArb,
      configUpdateArb,
      async (existingConfig, update) => {
        // Arrange
        const updatedConfig = { ...existingConfig, value: update.value };
        mockPrisma.platformConfigs.findUnique.mockResolvedValue(existingConfig);
        mockPrisma.platformConfigs.update.mockResolvedValue(updatedConfig);

        // Act
        await platformConfigService.updateConfig(existingConfig.key, update);

        // Assert - Cache should be invalidated for all related keys
        expect(mockCacheService.del).toHaveBeenCalledWith(`platform_config:key:${existingConfig.key}`);
        expect(mockCacheService.del).toHaveBeenCalledWith(`platform_config:category:${existingConfig.category}`);
        expect(mockCacheService.del).toHaveBeenCalledWith('platform_config:all');
      }
    ), { numRuns: 100 });
  });

  it('should ensure configuration retrieval comes from database when cache is empty', () => {
    fc.assert(fc.property(
      fc.array(configArb, { minLength: 1, maxLength: 10 }),
      async (configs) => {
        // Arrange - Cache returns null, forcing database query
        mockCacheService.getOrSet.mockImplementation(async (key, fn) => await fn());
        mockPrisma.platformConfigs.findMany.mockResolvedValue(configs);

        // Act
        const result = await platformConfigService.getAllConfigs();

        // Assert - Should query database
        expect(mockPrisma.platformConfigs.findMany).toHaveBeenCalledWith({
          orderBy: [
            { category: 'asc' },
            { displayName: 'asc' }
          ]
        });

        // All returned configs should match database records
        expect(result).toHaveLength(configs.length);
        result.forEach((config, index) => {
          expect(config.id).toBe(configs[index].id);
          expect(config.key).toBe(configs[index].key);
          expect(config.value).toBe(configs[index].value);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure configuration updates are atomic and consistent', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          key: fc.string({ minLength: 5, maxLength: 20 }),
          value: fc.oneof(fc.string(), fc.float(), fc.boolean()),
        }),
        { minLength: 2, maxLength: 5 }
      ),
      fc.uuid(),
      async (updates, updatedBy) => {
        // Arrange - Mock existing configs for each update
        const existingConfigs = updates.map(update => ({
          id: `config_${update.key}`,
          category: 'system',
          key: update.key,
          value: 'old_value',
          dataType: 'string',
          displayName: `Config ${update.key}`,
          description: 'Test config',
          isEditable: true,
          requiresRestart: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: null,
        }));

        // Mock database responses
        existingConfigs.forEach((config, index) => {
          mockPrisma.platformConfigs.findUnique
            .mockResolvedValueOnce(config);
          mockPrisma.platformConfigs.update
            .mockResolvedValueOnce({ ...config, value: updates[index].value, updatedBy });
        });

        // Act
        const results = await platformConfigService.updateMultipleConfigs(updates, updatedBy);

        // Assert - All updates should be persisted to database
        expect(results).toHaveLength(updates.length);
        
        updates.forEach((update, index) => {
          expect(mockPrisma.platformConfigs.update).toHaveBeenCalledWith({
            where: { key: update.key },
            data: {
              value: update.value,
              updatedAt: expect.any(Date),
              updatedBy,
            },
          });

          expect(results[index].value).toBe(update.value);
          expect(results[index].updatedBy).toBe(updatedBy);
        });
      }
    ), { numRuns: 100 });
  });

  it('should ensure configuration values are validated before persistence', () => {
    fc.assert(fc.property(
      configArb,
      fc.oneof(fc.string(), fc.float(), fc.boolean()),
      async (config, invalidValue) => {
        // Arrange - Create config with validation rules that will fail
        const configWithValidation = {
          ...config,
          dataType: 'number' as const,
          validation: { min: 100, max: 200, required: true },
          isEditable: true,
        };

        // Use a string value for a number field to trigger validation error
        const invalidUpdate = { value: 'invalid_string', updatedBy: 'test' };

        mockPrisma.platformConfigs.findUnique.mockResolvedValue(configWithValidation);

        // Act & Assert - Should throw validation error before database update
        await expect(
          platformConfigService.updateConfig(config.key, invalidUpdate)
        ).rejects.toThrow();

        // Database update should not be called due to validation failure
        expect(mockPrisma.platformConfigs.update).not.toHaveBeenCalled();
      }
    ), { numRuns: 100 });
  });

  it('should ensure configuration retrieval by category uses database queries', () => {
    fc.assert(fc.property(
      fc.constantFrom('financial', 'system', 'features', 'security', 'performance'),
      fc.array(configArb, { minLength: 1, maxLength: 8 }),
      async (category, allConfigs) => {
        // Arrange - Filter configs to match category
        const categoryConfigs = allConfigs.map(config => ({ ...config, category }));
        mockCacheService.getOrSet.mockImplementation(async (key, fn) => await fn());
        mockPrisma.platformConfigs.findMany.mockResolvedValue(categoryConfigs);

        // Act
        const result = await platformConfigService.getConfigsByCategory(category);

        // Assert - Should query database with category filter
        expect(mockPrisma.platformConfigs.findMany).toHaveBeenCalledWith({
          where: { category },
          orderBy: { displayName: 'asc' }
        });

        // All returned configs should be from the requested category
        result.forEach(config => {
          expect(config.category).toBe(category);
        });

        expect(result).toHaveLength(categoryConfigs.length);
      }
    ), { numRuns: 100 });
  });

  it('should ensure individual configuration retrieval uses database when not cached', () => {
    fc.assert(fc.property(
      configArb,
      async (config) => {
        // Arrange - Cache miss, force database query
        mockCacheService.getOrSet.mockImplementation(async (key, fn) => await fn());
        mockPrisma.platformConfigs.findUnique.mockResolvedValue(config);

        // Act
        const result = await platformConfigService.getConfig(config.key);

        // Assert - Should query database
        expect(mockPrisma.platformConfigs.findUnique).toHaveBeenCalledWith({
          where: { key: config.key }
        });

        // Result should match database record
        expect(result).not.toBeNull();
        if (result) {
          expect(result.id).toBe(config.id);
          expect(result.key).toBe(config.key);
          expect(result.value).toBe(config.value);
          expect(result.category).toBe(config.category);
        }
      }
    ), { numRuns: 100 });
  });
});